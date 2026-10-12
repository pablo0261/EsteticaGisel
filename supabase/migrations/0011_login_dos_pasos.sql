-- Verificación en dos pasos (etapa B): códigos de login, dispositivos recordados y
-- pedidos de recuperación de contraseña (para limitarlos).
-- Solo los usa el servidor con la service role: RLS activo, ninguna policy y sin
-- privilegios para anon ni authenticated (ni el master las lee por la API).

create table codigos_login (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  codigo_hash text not null,
  expira_en timestamptz not null,
  intentos int not null default 0 check (intentos >= 0),
  -- Un código usado no se borra: sigue contando para el límite de códigos por hora.
  usado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index idx_codigos_login_usuario on codigos_login (user_id, creado_en desc);

create table dispositivos_confiables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  expira_en timestamptz not null,
  user_agent text,
  creado_en timestamptz not null default now(),
  ultimo_uso_en timestamptz
);
create index idx_dispositivos_confiables_usuario on dispositivos_confiables (user_id);

-- Sin user_id: se cuenta también lo que se pide para emails que no existen.
create table pedidos_recuperacion (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  ip text not null,
  creado_en timestamptz not null default now()
);
create index idx_pedidos_recuperacion_email on pedidos_recuperacion (email_hash, creado_en);
create index idx_pedidos_recuperacion_ip on pedidos_recuperacion (ip, creado_en);

alter table codigos_login enable row level security;
alter table dispositivos_confiables enable row level security;
alter table pedidos_recuperacion enable row level security;

revoke all on codigos_login, dispositivos_confiables, pedidos_recuperacion from anon, authenticated;
