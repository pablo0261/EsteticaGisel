-- Crédito del pie (apagado por defecto), paleta neutra para clientes nuevos,
-- fotos de marca que ya no viven en la raíz de public/, y revisión de RLS.
--
-- Revisión (no se reescribe el historial de policies):
-- * anon solo conserva SELECT del catálogo público: servicios activos, cursos
--   publicados, testimonios activos, tenants activos y su marca. configuracion,
--   turnos, pagos, credenciales, accesos y login no tienen privilegios para anon.
-- * authenticated no tiene privilegios: un access token de Supabase Auth no lee
--   datos. El segundo factor y el panel pasan por el servidor con la service role.
-- * tenant_activo() estaba en public y PostgREST la exponía como RPC. Pasa al
--   esquema interno, que la API no publica. Las policies anónimas la siguen usando.
-- * anon sigue sin poder leer cursos.video_storage_path (0026).

alter table public.configuracion_negocio
  add column if not exists mostrar_credito boolean not null default false;

alter table public.tenant_marca
  alter column color_primario set default '#3d5a80',
  alter column color_secundario set default '#5c677d',
  alter column color_fondo set default '#f4f5f7',
  alter column color_texto set default '#1f2933';

-- Los archivos de public/brand y public/gisel/retrato.jpg pasaron a
-- public/tenants/gisel/. Solo se reescriben esas rutas viejas.
update public.tenant_marca
set
  logo_url = case
    when logo_url like '/brand/%' then '/tenants/gisel' || logo_url
    else logo_url
  end,
  logo_claro_url = case
    when logo_claro_url like '/brand/%' then '/tenants/gisel' || logo_claro_url
    else logo_claro_url
  end,
  foto_perfil_url = case
    when foto_perfil_url = '/gisel/retrato.jpg' then '/tenants/gisel/retrato.jpg'
    else foto_perfil_url
  end
where logo_url like '/brand/%'
   or logo_claro_url like '/brand/%'
   or foto_perfil_url = '/gisel/retrato.jpg';

create schema if not exists interno;
revoke all on schema interno from public;
grant usage on schema interno to anon, authenticated, service_role;

drop policy if exists "servicios: públicos activos" on public.servicios;
drop policy if exists "cursos: públicos publicados" on public.cursos;
drop policy if exists "testimonios: públicos activos" on public.testimonios;
drop policy if exists "marca: pública de tenants activos" on public.tenant_marca;

alter function public.tenant_activo(uuid) set schema interno;

revoke all on function interno.tenant_activo(uuid) from public;
grant execute on function interno.tenant_activo(uuid) to anon, authenticated, service_role;

create policy "servicios: públicos activos" on public.servicios
  for select to anon using (activo and interno.tenant_activo(tenant_id));

create policy "cursos: públicos publicados" on public.cursos
  for select to anon using (estado = 'publicado' and interno.tenant_activo(tenant_id));

create policy "testimonios: públicos activos" on public.testimonios
  for select to anon using (activo and interno.tenant_activo(tenant_id));

create policy "marca: pública de tenants activos" on public.tenant_marca
  for select to anon using (interno.tenant_activo(tenant_id));

revoke select (video_storage_path) on public.cursos from anon;

do $$
begin
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
      and table_name not in ('servicios', 'cursos', 'testimonios', 'tenants', 'tenant_marca')
  ) then
    raise exception 'anon tiene privilegios sobre una tabla privada de public';
  end if;
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated'
  ) then
    raise exception 'authenticated tiene privilegios sobre una tabla de public';
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'tenant_activo'
  ) then
    raise exception 'tenant_activo sigue expuesta en public';
  end if;
end $$;

notify pgrst, 'reload schema';
