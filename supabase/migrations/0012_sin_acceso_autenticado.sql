-- Sin acceso del rol authenticated a las tablas por la API pública (PostgREST).
--
-- Por qué: el login exige un segundo factor (código por email), pero Supabase Auth emite
-- el access token apenas la contraseña es correcta. Con la publishable key, quien tenga
-- la contraseña de un cliente (o del master) puede pedir ese token directo a Supabase,
-- sin el código, y usarlo contra PostgREST. Las policies "to authenticated" de la 0009/0010
-- le daban entonces acceso a los datos de su tenant (o a todo, si es el master) sin pasar
-- por la verificación en dos pasos.
--
-- La app no usa esas policies: todos los datos se leen y escriben en el servidor con la
-- service role (datosDelTenant / createAdminClient), después de comprobar la sesión
-- verificada. El cliente Supabase con la sesión del usuario solo se usa para Auth.
-- Por eso se borran todas las policies de authenticated y se le quitan los privilegios:
-- un token de usuario no ve ni escribe nada en public.
--
-- anon conserva sus policies de lectura pública (servicios, cursos, testimonios, tenants,
-- tenant_marca de tenants activos) y el SELECT; insert/update/delete no los necesita
-- (RLS ya los bloqueaba, pero mejor sin el privilegio).
--
-- Las funciones tenant_actual() y es_master() quedan sin uso (solo las usaban estas
-- policies); se conservan por si se vuelve a dar acceso por la API. tenant_activo() la
-- siguen usando las policies anónimas.

-- ---------- Policies de authenticated (0009/0010) ----------
drop policy if exists "servicios: su tenant" on public.servicios;
drop policy if exists "configuracion_negocio: su tenant" on public.configuracion_negocio;
drop policy if exists "turnos: su tenant" on public.turnos;
drop policy if exists "cursos: su tenant" on public.cursos;
drop policy if exists "archivos_curso: su tenant" on public.archivos_curso;
drop policy if exists "accesos_curso: su tenant" on public.accesos_curso;
drop policy if exists "testimonios: su tenant" on public.testimonios;
drop policy if exists "pagos: lectura del tenant" on public.pagos;
drop policy if exists "pagos: solo master escribe" on public.pagos;
drop policy if exists "intentos_reserva: lectura del tenant" on public.intentos_reserva;
drop policy if exists "intentos_reserva: solo master escribe" on public.intentos_reserva;
drop policy if exists "recordatorios_enviados: lectura del tenant" on public.recordatorios_enviados;
drop policy if exists "recordatorios_enviados: solo master escribe" on public.recordatorios_enviados;
drop policy if exists "tenants: lectura propia" on public.tenants;
drop policy if exists "tenants: solo master escribe" on public.tenants;
drop policy if exists "marca: lectura propia" on public.tenant_marca;
drop policy if exists "marca: solo master escribe" on public.tenant_marca;
drop policy if exists "perfiles: el propio" on public.perfiles;
drop policy if exists "perfiles: solo master escribe" on public.perfiles;

-- Red de seguridad: si quedó alguna otra policy para authenticated, falla la migración.
do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and 'authenticated' = any (roles)
  ) then
    raise exception 'Quedan policies para authenticated en public';
  end if;
end $$;

-- ---------- Privilegios ----------
revoke all on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from authenticated;

revoke insert, update, delete on all tables in schema public from anon;
alter default privileges in schema public revoke insert, update, delete on tables from anon;
