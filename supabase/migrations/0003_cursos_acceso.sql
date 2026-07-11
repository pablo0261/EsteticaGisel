-- Token para el link de acceso privado a un curso comprado (enviado por email).
alter table accesos_curso
  add column token_acceso uuid not null default gen_random_uuid();

create unique index idx_accesos_curso_token on accesos_curso (token_acceso);
