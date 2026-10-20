-- Columnas de la app de Google Cloud de cada cliente (el refresh token ya existía).
-- El client secret se guarda cifrado, igual que el access token de Mercado Pago.
alter table public.tenant_credenciales
  add column if not exists google_client_id text,
  add column if not exists google_client_secret text;

-- anon puede leer cursos publicados, pero no la ruta del video pago.
-- Pedir esa columna (o select=*) responde permission denied. El servidor la lee
-- con la service role, que no pasa por este revoke.
revoke select (video_storage_path) on public.cursos from anon;
