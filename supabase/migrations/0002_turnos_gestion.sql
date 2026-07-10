-- Turnos: token para links de autogestión (cancelar/reprogramar) y flag de recordatorio.
alter table turnos
  add column token_gestion uuid not null default gen_random_uuid(),
  add column recordatorio_enviado boolean not null default false;

create unique index idx_turnos_token_gestion on turnos (token_gestion);
