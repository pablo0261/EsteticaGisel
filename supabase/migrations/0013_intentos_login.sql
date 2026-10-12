-- Intentos de login (email y contraseña), para limitarlos por email y por IP antes de
-- llamar a Supabase Auth: así un atacante no agota el límite por IP de Supabase (que ve
-- una sola IP, la del servidor) ni prueba contraseñas sin freno.
-- Sin user_id ni FK: se cuentan también los intentos con emails que no existen. El email
-- se guarda como HMAC (email_hash), nunca en claro.
-- Solo la usa el servidor con la service role: RLS activo, ninguna policy y sin
-- privilegios para anon ni authenticated.

create table intentos_login (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  ip text,
  exito boolean not null default false,
  creado_en timestamptz not null
);
create index idx_intentos_login_email on intentos_login (email_hash, creado_en);
create index idx_intentos_login_ip on intentos_login (ip, creado_en);
create index idx_intentos_login_creado on intentos_login (creado_en);

alter table intentos_login enable row level security;

revoke all on intentos_login from anon, authenticated;
