-- Límite por cliente de reservar_turnos (revisión de C2a): cuenta también los turnos que se
-- piden. Antes se rechazaba solo si el cliente YA tenía el máximo, así que una reserva
-- combinada de varios servicios podía dejarlo por encima (2 existentes + 2 pedidos = 4).
-- Ahora: turnos futuros activos del email (o, por separado, del WhatsApp) + turnos pedidos
-- > p_maximo_por_cliente → TU002. El resto es igual a la 0023 (misma firma, security
-- invoker, search_path vacío, solo service_role).

create or replace function public.reservar_turnos(
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
  v_pedidos int;
begin
  if p_estado is null or p_estado not in ('pendiente_pago', 'confirmado') then
    raise exception 'estado inválido' using errcode = '22023';
  end if;
  if jsonb_typeof(p_turnos) is distinct from 'array' or jsonb_array_length(p_turnos) = 0 then
    raise exception 'la reserva no tiene turnos' using errcode = '22023';
  end if;
  v_pedidos := jsonb_array_length(p_turnos);

  perform pg_advisory_xact_lock(hashtext(p_tenant::text));

  select c.minutos_preparacion_entre_turnos into v_margen
    from public.configuracion_negocio c
   where c.tenant_id = p_tenant;
  if not found then
    raise exception 'el tenant no tiene configuración' using errcode = 'P0002';
  end if;

  -- Turnos futuros activos del mismo email o del mismo WhatsApp (por separado), más los
  -- que se piden ahora.
  if (select count(*) from public.turnos t
       where t.tenant_id = p_tenant
         and lower(t.cliente_email) = lower(p_cliente_email)
         and t.fecha_hora > now()
         and (t.estado = 'confirmado' or (t.estado = 'pendiente_pago' and t.bloqueado_hasta > now()))
     ) + v_pedidos > p_maximo_por_cliente
     or (select count(*) from public.turnos t
       where t.tenant_id = p_tenant
         and t.cliente_telefono = p_cliente_telefono
         and t.fecha_hora > now()
         and (t.estado = 'confirmado' or (t.estado = 'pendiente_pago' and t.bloqueado_hasta > now()))
     ) + v_pedidos > p_maximo_por_cliente
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

revoke execute on function public.reservar_turnos(uuid, jsonb, text, text, text, text, timestamptz, int) from public, anon, authenticated;
grant execute on function public.reservar_turnos(uuid, jsonb, text, text, text, text, timestamptz, int) to service_role;

-- PostgREST recarga la definición sin esperar a su caché.
notify pgrst, 'reload schema';
