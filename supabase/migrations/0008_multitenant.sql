-- Etapa A1: núcleo multi-tenant. Gisel pasa a ser el primer tenant.
-- Requiere la 0005 (recordatorios_enviados).

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
  color_primario text not null default '#c0899a',
  color_secundario text not null default '#4e5340',
  color_fondo text not null default '#f6f1ea',
  color_texto text not null default '#1a1a1a',
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

-- ---------- Gisel ----------
insert into tenants (slug, nombre, modulo_turnos, modulo_cursos, modulo_sobre_mi, modulo_testimonios)
values ('gisel', 'Gisel Bigurrarena', true, true, true, true);

-- ---------- tenant_id en las tablas existentes ----------
do $$
declare
  t text;
  gisel uuid := (select id from public.tenants where slug = 'gisel');
begin
  foreach t in array array[
    'servicios', 'turnos', 'cursos', 'archivos_curso', 'accesos_curso',
    'pagos', 'intentos_reserva', 'recordatorios_enviados'
  ] loop
    execute format(
      'alter table public.%I add column tenant_id uuid references public.tenants (id) on delete cascade', t);
    execute format('update public.%I set tenant_id = %L', t, gisel);
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
update configuracion_negocio set tenant_id = (select id from tenants where slug = 'gisel');
alter table configuracion_negocio drop constraint solo_una_fila;
alter table configuracion_negocio drop constraint configuracion_negocio_pkey;
alter table configuracion_negocio drop column id;
alter table configuracion_negocio alter column tenant_id set not null;
alter table configuracion_negocio add primary key (tenant_id);

-- ---------- Contenido de Gisel (antes fijo en el código) ----------
insert into tenant_marca (
  tenant_id, logo_url, logo_claro_url, foto_perfil_url, rubro, tagline,
  inicio_titulo, inicio_destacado, inicio_texto, sobre_mi_titulo, sobre_mi_texto,
  nota_reservas, whatsapp, instagram, email_contacto, direccion
)
select
  id,
  '/brand/horizontal-negro.png',
  '/brand/horizontal-blanco.png',
  '/gisel/retrato.jpg',
  'Estética y Salud',
  'Belleza y bienestar con mirada profesional',
  'Tu momento de',
  'belleza y bienestar',
  'Tratamientos faciales, corporales, manos y pies con mirada profesional. Reservá tu turno online y sumate a mis cursos de estética.',
  'Hola, soy Gisel',
  E'Soy esteticista y me dedico a cuidar la piel y el bienestar de cada persona que pasa por mi espacio. Trabajo de forma personalizada, con productos de calidad y mucha dedicación.\n\nAdemás de atender en el consultorio, comparto mi experiencia a través de cursos de estética, tanto para profesionales del rubro como para quienes quieren aprender a cuidarse en casa.\n\n(Texto de ejemplo — se reemplaza por la presentación real de Gisel.)',
  'Llegadas tarde: el turno se realiza únicamente dentro del tiempo restante disponible, sin extender el horario.',
  '+5490000000000',
  'esteticaysaludgisel',
  'hola@esteticagisel.com.ar',
  'Argentina'
from tenants where slug = 'gisel';

insert into tenant_credenciales (tenant_id) select id from tenants where slug = 'gisel';

insert into testimonios (tenant_id, nombre, texto, orden)
select t.id, v.nombre, v.texto, v.orden
from tenants t,
  (values
    ('Carla M.', 'Salí renovada. Gisel es súper profesional y el trato es hermoso. Ya reservé mi próximo turno.', 1),
    ('Sofía R.', 'El laminado de cejas me encantó, quedó natural y prolijo. Recomendadísima.', 2),
    ('Daniela P.', 'Hice uno de sus cursos y aprendí un montón. Explica clarísimo y con mucha dedicación.', 3)
  ) as v (nombre, texto, orden)
where t.slug = 'gisel';

-- Los usuarios que existen hoy son el admin de Gisel.
insert into perfiles (user_id, rol, tenant_id)
select u.id, 'cliente', t.id from auth.users u, tenants t where t.slug = 'gisel'
on conflict (user_id) do nothing;
