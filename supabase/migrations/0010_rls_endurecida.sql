-- Endurece el RLS de la 0009 tras la revisión de código:
--  a) Las policies de usuarios autenticados envuelven los helpers en (select ...), así
--     Postgres los evalúa una vez por consulta y no una vez por fila.
--     pagos, intentos_reserva y recordatorios_enviados son registros del sistema (los
--     escribe solo el servidor con la service role): el cliente los lee, no los escribe.
--  b) pagos.referencia_id es polimórfico (turno o curso) y no admite FK: un trigger
--     garantiza que apunte a un turno/curso del mismo tenant.
--  c) anon y authenticated no necesitan truncate, trigger ni references.
-- Las policies anónimas de la 0009 quedan como están.

-- ---------- a) Policies de usuarios autenticados ----------
do $$
declare t text;
begin
  foreach t in array array[
    'servicios', 'configuracion_negocio', 'turnos', 'cursos', 'archivos_curso',
    'accesos_curso', 'testimonios'
  ] loop
    execute format('drop policy %I on public.%I', t || ': su tenant', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (tenant_id = (select public.tenant_actual()) or (select public.es_master()))
         with check (tenant_id = (select public.tenant_actual()) or (select public.es_master()))',
      t || ': su tenant', t);
  end loop;

  foreach t in array array['pagos', 'intentos_reserva', 'recordatorios_enviados'] loop
    execute format('drop policy %I on public.%I', t || ': su tenant', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (tenant_id = (select public.tenant_actual()) or (select public.es_master()))',
      t || ': lectura del tenant', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select public.es_master())) with check ((select public.es_master()))',
      t || ': solo master escribe', t);
  end loop;
end $$;

drop policy "tenants: lectura propia" on tenants;
create policy "tenants: lectura propia" on tenants
  for select to authenticated
  using (id = (select public.tenant_actual()) or (select public.es_master()));
drop policy "tenants: solo master escribe" on tenants;
create policy "tenants: solo master escribe" on tenants
  for all to authenticated
  using ((select public.es_master())) with check ((select public.es_master()));

drop policy "marca: lectura propia" on tenant_marca;
create policy "marca: lectura propia" on tenant_marca
  for select to authenticated
  using (tenant_id = (select public.tenant_actual()) or (select public.es_master()));
drop policy "marca: solo master escribe" on tenant_marca;
create policy "marca: solo master escribe" on tenant_marca
  for all to authenticated
  using ((select public.es_master())) with check ((select public.es_master()));

drop policy "perfiles: el propio" on perfiles;
create policy "perfiles: el propio" on perfiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_master()));
drop policy "perfiles: solo master escribe" on perfiles;
create policy "perfiles: solo master escribe" on perfiles
  for all to authenticated
  using ((select public.es_master())) with check ((select public.es_master()));

-- ---------- b) pagos: la referencia es del mismo tenant ----------
create function public.pagos_mismo_tenant() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.tipo = 'turno' and not exists (
    select 1 from public.turnos where id = new.referencia_id and tenant_id = new.tenant_id
  ) then
    raise exception 'pagos: el turno % no existe en el tenant %', new.referencia_id, new.tenant_id;
  end if;
  if new.tipo = 'curso' and not exists (
    select 1 from public.cursos where id = new.referencia_id and tenant_id = new.tenant_id
  ) then
    raise exception 'pagos: el curso % no existe en el tenant %', new.referencia_id, new.tenant_id;
  end if;
  return new;
end;
$$;

create trigger pagos_mismo_tenant
  before insert or update of referencia_id, tenant_id, tipo on public.pagos
  for each row execute function public.pagos_mismo_tenant();

-- ---------- c) Privilegios que la API no necesita ----------
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
