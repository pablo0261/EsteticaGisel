-- Núcleo multi-tenant. No crea clientes ni carga textos, fotos ni testimonios:
-- cada salón se da de alta desde el panel master o con supabase/seeds/.
-- Requiere la 0005 (recordatorios_enviados).
-- Si esta base ya aplicó una versión anterior de este archivo, no hay que volver a
-- correrlo: el registro de migraciones lo saltea. Los datos de un salón existente
-- siguen en la base.

-- ---------- tenants ----------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (
      slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
      and slug not in ('www', 'app', 'admin', 'master', 'api')
    ),
  nombre text not null,
  estado text not null default 'activo' check (estado in ('activo', 'suspendido')),
  idioma text not null default 'es' check (idioma in ('es', 'pt')),
  pais text not null default 'AR' check (pais in ('AR', 'BR')),
  zona_horaria text not null default 'America/Argentina/Buenos_Aires',
  moneda text not null default 'ARS' check (moneda in ('ARS', 'BRL')),
  modulo_turnos boolean not null default true,
  modulo_cursos boolean not null default false,
  modulo_sobre_mi boolean not null default true,
  modulo_testimonios boolean not null default false,
  modulo_galeria boolean not null default false,
  modulo_faq boolean not null default false,
  modulo_whatsapp boolean not null default false,
  creado_en timestamptz not null default now()
);

-- ---------- tenant_marca: lo que hace única la página ----------
create table tenant_marca (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  color_primario text not null default '#3d5a80',
  color_secundario text not null default '#5c677d',
  color_fondo text not null default '#f4f5f7',
  color_texto text not null default '#1f2933',
  logo_url text,
  logo_claro_url text,
  foto_perfil_url text,
  rubro text,
  tagline text,
  inicio_titulo text not null,
  inicio_destacado text,
  inicio_texto text,
  sobre_mi_titulo text,
  sobre_mi_texto text,
  nota_reservas text,
  whatsapp text,
  instagram text,
  email_contacto text,
  direccion text
);

-- ---------- tenant_credenciales: valores sensibles cifrados (etapa D) ----------
create table tenant_credenciales (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  mp_access_token text,
  mp_refresh_token text,
  mp_token_vence_en timestamptz,
  mp_public_key text,
  mp_user_id text,
  mp_origen text check (mp_origen in ('oauth', 'manual')),
  mp_webhook_secret text,
  smtp_usuario text,
  smtp_password text,
  smtp_nombre_remitente text,
  smtp_estado text not null default 'sin_configurar'
    check (smtp_estado in ('ok', 'error', 'sin_configurar')),
  smtp_ultimo_error text,
  google_refresh_token text,
  google_calendar_id text
);

-- ---------- perfiles: rol de cada usuario ----------
create table perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rol text not null check (rol in ('master', 'cliente')),
  tenant_id uuid references tenants (id) on delete cascade,
  constraint perfil_coherente check (
    (rol = 'master' and tenant_id is null) or (rol = 'cliente' and tenant_id is not null)
  )
);

-- ---------- testimonios (antes fijos en el código) ----------
create table testimonios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nombre text not null,
  texto text not null,
  orden int not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index idx_testimonios_tenant on testimonios (tenant_id);

-- ---------- tenant_id en las tablas existentes ----------
-- Una instalación nueva llega vacía. Si hubiera filas de un esquema de un solo
-- negocio, se asignan al único tenant que ya exista; si no hay tenant, se corta
-- para no inventar un cliente dentro de la migración.
do $$
declare
  t text;
  destino uuid := (select id from public.tenants order by creado_en limit 1);
  hay bigint;
begin
  foreach t in array array[
    'servicios', 'turnos', 'cursos', 'archivos_curso', 'accesos_curso',
    'pagos', 'intentos_reserva', 'recordatorios_enviados'
  ] loop
    execute format(
      'alter table public.%I add column tenant_id uuid references public.tenants (id) on delete cascade', t);
    execute format('select count(*) from public.%I', t) into hay;
    if hay > 0 then
      if destino is null then
        raise exception 'La tabla % tiene filas y no hay un tenant para asignarlas. Esta migración no crea clientes.', t;
      end if;
      execute format('update public.%I set tenant_id = %L where tenant_id is null', t, destino);
    end if;
    execute format('alter table public.%I alter column tenant_id set not null', t);
    execute format('create index %I on public.%I (tenant_id)', 'idx_' || t || '_tenant', t);
  end loop;
end $$;

-- ---------- Un hijo solo puede apuntar a un padre del mismo tenant ----------
-- Los embeds de PostgREST (ej. turnos → servicios(nombre)) no filtran por tenant:
-- las FK compuestas garantizan en la base que nunca se cruzan tenants.
alter table servicios add constraint servicios_tenant_id_id_key unique (tenant_id, id);
alter table turnos add constraint turnos_tenant_id_id_key unique (tenant_id, id);
alter table cursos add constraint cursos_tenant_id_id_key unique (tenant_id, id);

alter table turnos drop constraint if exists turnos_servicio_id_fkey;
alter table turnos add constraint turnos_servicio_mismo_tenant
  foreign key (tenant_id, servicio_id) references servicios (tenant_id, id);

alter table archivos_curso drop constraint if exists archivos_curso_curso_id_fkey;
alter table archivos_curso add constraint archivos_curso_mismo_tenant
  foreign key (tenant_id, curso_id) references cursos (tenant_id, id) on delete cascade;

alter table accesos_curso drop constraint if exists accesos_curso_curso_id_fkey;
alter table accesos_curso add constraint accesos_curso_mismo_tenant
  foreign key (tenant_id, curso_id) references cursos (tenant_id, id);

alter table recordatorios_enviados drop constraint if exists recordatorios_enviados_turno_id_fkey;
alter table recordatorios_enviados add constraint recordatorios_mismo_tenant
  foreign key (tenant_id, turno_id) references turnos (tenant_id, id) on delete cascade;

-- ---------- configuracion_negocio: de "una sola fila" a una fila por tenant ----------
alter table configuracion_negocio
  add column tenant_id uuid references tenants (id) on delete cascade;
do $$
declare
  destino uuid := (select id from public.tenants order by creado_en limit 1);
  hay bigint;
begin
  select count(*) into hay from public.configuracion_negocio;
  if hay > 0 then
    if destino is null then
      raise exception 'configuracion_negocio tiene filas y no hay un tenant para asignarlas.';
    end if;
    update public.configuracion_negocio set tenant_id = destino where tenant_id is null;
  end if;
end $$;
alter table configuracion_negocio drop constraint solo_una_fila;
alter table configuracion_negocio drop constraint configuracion_negocio_pkey;
alter table configuracion_negocio drop column id;
alter table configuracion_negocio alter column tenant_id set not null;
alter table configuracion_negocio add primary key (tenant_id);
