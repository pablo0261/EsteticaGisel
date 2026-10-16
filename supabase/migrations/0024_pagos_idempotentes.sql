-- Webhook de Mercado Pago idempotente (revisión de seguridad).
-- Mercado Pago reintenta las notificaciones y puede mandar dos a la vez: el webhook leía el
-- estado y después confirmaba, así que dos notificaciones simultáneas podían confirmar,
-- registrar el pago, crear el evento y mandar el email dos veces.
--
-- Índices únicos: un pago de MP se registra una sola vez por turno o curso, y da un solo
-- acceso a un curso (se revisó antes que no hubiera duplicados). El webhook toma la
-- violación (23505) como "ya procesado".
--
-- confirmar_turnos_pagados confirma los turnos de una reserva pagada con un update
-- condicional (solo los pendiente_pago) y registra el pago en la misma transacción, bajo el
-- mismo lock por tenant que reservar_turnos (0023). Si el pago llega con el bloqueo de 15
-- minutos vencido, el horario pudo haberlo tomado otra reserva: chequea el choque y, si lo
-- hay, no confirma. Devuelve:
--   'confirmado'    los confirmó ahora (el webhook sigue con Calendar y el email);
--   'ya_procesado'  ya estaban confirmados por este mismo pago (reintento): no hace nada;
--   'ocupado'       pago tardío y el horario ya está tomado: no confirma (devolver el pago);
--   'inconsistente' falta algún turno o no están todos pendientes: no confirma (revisar).
-- Solo la ejecuta service_role (security invoker).

create unique index pagos_tipo_referencia_mp_payment_key
  on public.pagos (tipo, referencia_id, mp_payment_id);

create unique index accesos_curso_mp_payment_key
  on public.accesos_curso (mp_payment_id)
  where mp_payment_id is not null;

create function public.confirmar_turnos_pagados(
  p_tenant uuid,
  p_turnos uuid[],
  p_mp_payment_id text
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_margen int;
  v_pedidos int;
  v_total int;
  v_pendientes int;
  v_turno record;
  v_actualizados int;
begin
  perform pg_advisory_xact_lock(hashtext(p_tenant::text));

  select count(distinct x) into v_pedidos from unnest(p_turnos) as x;
  if v_pedidos = 0 or p_mp_payment_id is null then
    return 'inconsistente';
  end if;

  -- Bloquea las filas: un cambio del panel (cancelar, completar) espera a esta transacción.
  select count(*), count(*) filter (where t.estado = 'pendiente_pago')
    into v_total, v_pendientes
    from (
      select t.estado from public.turnos t
       where t.tenant_id = p_tenant and t.id = any (p_turnos)
         for update
    ) t;

  if v_total = v_pedidos and v_pendientes = 0 and (
    select count(*) from public.pagos p
     where p.tenant_id = p_tenant and p.tipo = 'turno'
       and p.mp_payment_id = p_mp_payment_id and p.referencia_id = any (p_turnos)
  ) = v_pedidos then
    return 'ya_procesado';
  end if;
  if v_total <> v_pedidos or v_pendientes <> v_pedidos then
    return 'inconsistente';
  end if;

  select c.minutos_preparacion_entre_turnos into v_margen
    from public.configuracion_negocio c
   where c.tenant_id = p_tenant;
  if not found then
    return 'inconsistente';
  end if;

  -- Pago tardío: el bloqueo venció y otra reserva pudo tomar el horario.
  for v_turno in
    select t.fecha_hora, t.duracion_minutos
      from public.turnos t
     where t.tenant_id = p_tenant and t.id = any (p_turnos)
       and (t.bloqueado_hasta is null or t.bloqueado_hasta <= now())
  loop
    if public.turno_choca(
      p_tenant, v_turno.fecha_hora,
      v_turno.fecha_hora + make_interval(mins => v_turno.duracion_minutos),
      v_margen, p_turnos
    ) then
      return 'ocupado';
    end if;
  end loop;

  update public.turnos t set estado = 'confirmado'
   where t.tenant_id = p_tenant and t.id = any (p_turnos) and t.estado = 'pendiente_pago';
  get diagnostics v_actualizados = row_count;
  if v_actualizados <> v_pedidos then
    raise exception 'confirmar_turnos_pagados: se esperaban % turnos y se confirmaron %', v_pedidos, v_actualizados;
  end if;

  insert into public.pagos (tenant_id, tipo, referencia_id, mp_payment_id, estado, monto)
  select p_tenant, 'turno', t.id, p_mp_payment_id, 'approved', coalesce(t.monto_sena, 0)
    from public.turnos t
   where t.tenant_id = p_tenant and t.id = any (p_turnos);

  return 'confirmado';
end;
$$;

revoke execute on function public.confirmar_turnos_pagados(uuid, uuid[], text) from public, anon, authenticated;
grant execute on function public.confirmar_turnos_pagados(uuid, uuid[], text) to service_role;

-- PostgREST expone la función nueva sin esperar a que recargue solo su caché.
notify pgrst, 'reload schema';
