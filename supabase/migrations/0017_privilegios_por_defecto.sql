-- Privilegios por defecto cerrados: lo que se cree de acá en adelante en public no queda
-- abierto a anon ni a authenticated.
--
-- Hasta acá, cada tabla, función o secuencia nueva creada por postgres en public nacía con
-- privilegios para la API (por los default privileges de Supabase): anon con SELECT y
-- MAINTAIN en las tablas, anon y authenticated con EXECUTE en las funciones (y PUBLIC con
-- EXECUTE, el default de Postgres) y con USAGE, SELECT y UPDATE en las secuencias. La 0016
-- cerró las tablas existentes; esto cierra las futuras. Una tabla nueva con lectura pública
-- tiene que hacer su propio GRANT SELECT ... TO anon.
-- Postgres 17 (consultado con SELECT version()): MAINTAIN existe.

alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema public revoke select, maintain on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

-- Las tablas públicas conservan solo el SELECT (MAINTAIN deja correr VACUUM, ANALYZE,
-- REINDEX, etc., que la API no necesita).
revoke maintain on public.servicios, public.cursos, public.testimonios, public.tenants, public.tenant_marca from anon;

-- Las funciones de trigger y de cron no son RPC. Un trigger se dispara sin que se chequee
-- EXECUTE (solo se chequea al crearlo).
revoke execute on function public.pagos_mismo_tenant() from public, anon, authenticated;
do $$
begin
  -- llamar_cron (0006) solo existe donde se aplicó esa migración.
  if to_regprocedure('public.llamar_cron(text)') is not null then
    revoke execute on function public.llamar_cron(text) from public, anon, authenticated;
  end if;
end $$;
