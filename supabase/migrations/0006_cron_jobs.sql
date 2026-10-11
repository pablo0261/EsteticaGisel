-- Crons con Supabase (pg_cron + pg_net): la base llama a los endpoints /api/cron/* del sitio.
-- Reemplaza a Vercel Cron (que en el plan gratuito solo corre una vez por día).
--
-- ANTES de correr esta migración, crear los dos secretos en Vault (SQL Editor),
-- con los valores reales (no se commitean):
--   select vault.create_secret('https://<dominio-publico>', 'site_url');
--   select vault.create_secret('<mismo valor que CRON_SECRET del .env>', 'cron_secret');
-- Para cambiarlos después: select vault.update_secret(id, '<nuevo valor>') con el id de vault.secrets.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.llamar_cron(ruta text)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'site_url') || ruta,
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 60000
  );
$$;

-- Solo la usa pg_cron (corre como postgres); no se expone vía API.
revoke execute on function public.llamar_cron(text) from public, anon, authenticated;

-- cron.schedule con un nombre existente actualiza el job (re-ejecutable).
select cron.schedule('liberar-turnos', '*/5 * * * *', $$ select public.llamar_cron('/api/cron/liberar-turnos') $$);
select cron.schedule('recordatorios', '*/10 * * * *', $$ select public.llamar_cron('/api/cron/recordatorios') $$);
