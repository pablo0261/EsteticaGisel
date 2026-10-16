-- Reserva atómica de turnos (revisión de seguridad).
-- La reserva verificaba la disponibilidad y después insertaba: dos reservas simultáneas del
-- mismo horario podían pasar las dos. reservar_turnos hace el chequeo y la inserción en una
-- sola transacción, bajo un lock de transacción por tenant (pg_advisory_xact_lock): las
-- reservas, reprogramaciones y confirmaciones de pagos de un mismo tenant se serializan.
-- También cuenta, bajo el mismo lock, los turnos futuros activos del email y del WhatsApp
-- del cliente (límite por cliente: una reserva sin pago anticipado confirma al instante).
-- reprogramar_turno hace lo mismo para mover un turno confirmado.
-- Solo las ejecuta el servidor con la service role (security invoker). La 0017 cerró los
-- privilegios por defecto; se repite acá para que quede explícito.
-- Códigos de error propios: TU001 = el horario ya no está disponible; TU002 = el cliente
-- alcanzó el máximo de turnos futuros.

-- ¿Choca [p_inicio, p_fin) con un turno activo del tenant (confirmado, o pendiente de pago
-- con el bloqueo vigente), dejando p_margen minutos de preparación entre turnos? Es la
-- misma regla que calcularSlots (src/lib/turnos/disponibilidad.ts). p_excluir: turnos que
-- no cuentan (el que se reprograma, los de la reserva que se confirma).
create function public.turno_choca(
  p_tenant uuid,
  p_inicio timestamptz,
  p_fin timestamptz,
  p_margen int,
  p_excluir uuid[]
) returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
      from public.turnos t
     where t.tenant_id = p_tenant
       and not (t.id = any (coalesce(p_excluir, '{}'::uuid[])))
       and (t.estado = 'confirmado' or (t.estado = 'pendiente_pago' and t.bloqueado_hasta > now()))
       and p_fin + make_interval(mins => p_margen) > t.fecha_hora
       and t.fecha_hora + make_interval(mins => t.duracion_minutos + p_margen) > p_inicio
  );
$$;

-- Crea los turnos de una reserva (uno por servicio, consecutivos). p_turnos es un arreglo de
-- {servicio_id, fecha_hora, duracion_minutos, monto_sena}. Devuelve el id y el token de
-- gestión de cada turno, en el orden recibido.
create function public.reservar_turnos(
  p_tenant uuid,
  p_turnos jsonb,
  p_cliente_nombre text,
  p_cliente_email text,
  p_cliente_telefono text,
  p_estado text,
  p_bloqueado_hasta timestamptz,
  p_maximo_por_cliente int
) returns table (turno_id uuid, token uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_margen int;
  v_item jsonb;
  v_inicio timestamptz;
begin
  if p_estado is null or p_estado not in ('pendiente_pago', 'confirmado') then
    raise exception 'estado inválido' using errcode = '22023';
  end if;
  if jsonb_typeof(p_turnos) is distinct from 'array' or jsonb_array_length(p_turnos) = 0 then
    raise exception 'la reserva no tiene turnos' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_tenant::text));

  select c.minutos_preparacion_entre_turnos into v_margen
    from public.configuracion_negocio c
   where c.tenant_id = p_tenant;
  if not found then
    raise exception 'el tenant no tiene configuración' using errcode = 'P0002';
  end if;

  -- Turnos futuros activos del mismo email o del mismo WhatsApp, por separado.
  if (select count(*) from public.turnos t
       where t.tenant_id = p_tenant
         and lower(t.cliente_email) = lower(p_cliente_email)
         and t.fecha_hora > now()
         and (t.estado = 'confirmado' or (t.estado = 'pendiente_pago' and t.bloqueado_hasta > now()))
     ) >= p_maximo_por_cliente
     or (select count(*) from public.turnos t
       where t.tenant_id = p_tenant
         and t.cliente_telefono = p_cliente_telefono
         and t.fecha_hora > now()
         and (t.estado = 'confirmado' or (t.estado = 'pendiente_pago' and t.bloqueado_hasta > now()))
     ) >= p_maximo_por_cliente
  then
    raise exception 'el cliente alcanzó el máximo de turnos' using errcode = 'TU002';
  end if;

  -- Primero se chequean todos (los de la misma reserva son consecutivos, sin margen entre
  -- ellos), después se insertan.
  for v_item in select e.value from jsonb_array_elements(p_turnos) with ordinality as e(value, n) order by e.n loop
    v_inicio := (v_item ->> 'fecha_hora')::timestamptz;
    if v_inicio <= now() or public.turno_choca(
      p_tenant,
      v_inicio,
      v_inicio + make_interval(mins => (v_item ->> 'duracion_minutos')::int),
      v_margen,
      null
    ) then
      raise exception 'horario ocupado' using errcode = 'TU001';
    end if;
  end loop;

  for v_item in select e.value from jsonb_array_elements(p_turnos) with ordinality as e(value, n) order by e.n loop
    insert into public.turnos (
      tenant_id, servicio_id, cliente_nombre, cliente_email, cliente_telefono,
      fecha_hora, duracion_minutos, estado, monto_sena, bloqueado_hasta
    ) values (
      p_tenant,
      (v_item ->> 'servicio_id')::uuid,
      p_cliente_nombre,
      p_cliente_email,
      p_cliente_telefono,
      (v_item ->> 'fecha_hora')::timestamptz,
      (v_item ->> 'duracion_minutos')::int,
      p_estado,
      (v_item ->> 'monto_sena')::numeric,
      case when p_estado = 'pendiente_pago' then p_bloqueado_hasta end
    )
    returning id, token_gestion into turno_id, token;
    return next;
  end loop;
end;
$$;

-- Mueve un turno confirmado a otro horario si está libre. false si el turno no está
-- confirmado, si el horario ya pasó o si choca con otro turno activo.
create function public.reprogramar_turno(
  p_tenant uuid,
  p_turno uuid,
  p_fecha_hora timestamptz
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_margen int;
  v_duracion int;
begin
  perform pg_advisory_xact_lock(hashtext(p_tenant::text));

  select c.minutos_preparacion_entre_turnos into v_margen
    from public.configuracion_negocio c
   where c.tenant_id = p_tenant;
  if not found then
    return false;
  end if;

  select t.duracion_minutos into v_duracion
    from public.turnos t
   where t.tenant_id = p_tenant and t.id = p_turno and t.estado = 'confirmado'
     for update;
  if not found then
    return false;
  end if;

  if p_fecha_hora <= now() or public.turno_choca(
    p_tenant, p_fecha_hora, p_fecha_hora + make_interval(mins => v_duracion), v_margen, array[p_turno]
  ) then
    return false;
  end if;

  update public.turnos set fecha_hora = p_fecha_hora where tenant_id = p_tenant and id = p_turno;
  return true;
end;
$$;

revoke execute on function public.turno_choca(uuid, timestamptz, timestamptz, int, uuid[]) from public, anon, authenticated;
grant execute on function public.turno_choca(uuid, timestamptz, timestamptz, int, uuid[]) to service_role;
revoke execute on function public.reservar_turnos(uuid, jsonb, text, text, text, text, timestamptz, int) from public, anon, authenticated;
grant execute on function public.reservar_turnos(uuid, jsonb, text, text, text, text, timestamptz, int) to service_role;
revoke execute on function public.reprogramar_turno(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.reprogramar_turno(uuid, uuid, timestamptz) to service_role;

-- PostgREST expone las funciones nuevas sin esperar a que recargue solo su caché.
notify pgrst, 'reload schema';
