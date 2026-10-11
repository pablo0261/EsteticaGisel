-- RLS multi-tenant. El servidor usa la service role (se saltea RLS) y accede vía
-- datosDelTenant(); estas policies son la defensa para usuarios autenticados y anónimos.

create or replace function public.tenant_actual() returns uuid
language sql stable security definer set search_path = '' as $$
  select tenant_id from public.perfiles where user_id = auth.uid()
$$;

create or replace function public.es_master() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where user_id = auth.uid() and rol = 'master')
$$;

create or replace function public.tenant_activo(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tenants where id = t and estado = 'activo')
$$;

alter table tenants enable row level security;
alter table tenant_marca enable row level security;
alter table tenant_credenciales enable row level security; -- sin policies: nadie la lee por API
alter table perfiles enable row level security;
alter table testimonios enable row level security;

-- Tablas de negocio: el cliente ve y escribe solo su tenant; el master, todo.
do $$
declare t text;
begin
  foreach t in array array[
    'servicios', 'configuracion_negocio', 'turnos', 'cursos', 'archivos_curso',
    'accesos_curso', 'pagos', 'intentos_reserva', 'recordatorios_enviados', 'testimonios'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (tenant_id = public.tenant_actual() or public.es_master())
         with check (tenant_id = public.tenant_actual() or public.es_master())',
      t || ': su tenant', t);
  end loop;
end $$;

-- Lecturas públicas (anónimos): solo contenido publicado de tenants activos.
drop policy "servicios activos son públicos" on servicios;
create policy "servicios: públicos activos" on servicios
  for select to anon using (activo and public.tenant_activo(tenant_id));

drop policy "cursos publicados son públicos" on cursos;
create policy "cursos: públicos publicados" on cursos
  for select to anon using (estado = 'publicado' and public.tenant_activo(tenant_id));

create policy "testimonios: públicos activos" on testimonios
  for select to anon using (activo and public.tenant_activo(tenant_id));

-- tenants: datos no sensibles; módulos y estado solo los cambia el master.
create policy "tenants: públicos activos" on tenants
  for select to anon using (estado = 'activo');
create policy "tenants: lectura propia" on tenants
  for select to authenticated using (id = public.tenant_actual() or public.es_master());
create policy "tenants: solo master escribe" on tenants
  for all to authenticated using (public.es_master()) with check (public.es_master());

-- tenant_marca: pública; la escribe el master (los textos del cliente pasan por
-- server actions con lista blanca de campos, etapa C).
create policy "marca: pública de tenants activos" on tenant_marca
  for select to anon using (public.tenant_activo(tenant_id));
create policy "marca: lectura propia" on tenant_marca
  for select to authenticated using (tenant_id = public.tenant_actual() or public.es_master());
create policy "marca: solo master escribe" on tenant_marca
  for all to authenticated using (public.es_master()) with check (public.es_master());

-- perfiles: cada uno ve el suyo; solo el master asigna roles.
create policy "perfiles: el propio" on perfiles
  for select to authenticated using (user_id = auth.uid() or public.es_master());
create policy "perfiles: solo master escribe" on perfiles
  for all to authenticated using (public.es_master()) with check (public.es_master());
