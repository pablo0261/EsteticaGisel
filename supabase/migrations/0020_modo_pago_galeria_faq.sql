-- Etapa C2: modo de pago de las reservas y contenido de los módulos galería y preguntas
-- frecuentes.
--
-- modo_pago: 'ninguno' (el turno se confirma al reservar), 'sena' (un porcentaje: el
-- comportamiento original) o 'total'. Las filas existentes quedan en 'sena', como hasta
-- ahora. Los clientes nuevos arrancan en 'ninguno': no tienen Mercado Pago propio hasta la
-- etapa D, y con 'sena' ninguna reserva suya se podría completar. crear_tenant (0018) no
-- inserta modo_pago: toma el default.
alter table public.configuracion_negocio add column modo_pago text not null default 'sena';
alter table public.configuracion_negocio alter column modo_pago set default 'ninguno';
alter table public.configuracion_negocio
  add constraint configuracion_negocio_modo_pago_check check (modo_pago in ('ninguno', 'sena', 'total'));

-- El panel valida de 1 a 100. Verificado con un SELECT antes de escribir esto: la única fila
-- tiene 50. Se agrega "not valid" y se valida aparte, como en la 0019.
alter table public.configuracion_negocio
  add constraint configuracion_negocio_sena_porcentaje_check check (sena_porcentaje between 1 and 100) not valid;
alter table public.configuracion_negocio validate constraint configuracion_negocio_sena_porcentaje_check;

-- Galería: imágenes del bucket público "sitios" ({tenant_id}/galeria-*.ext). imagen_url es la
-- URL pública que arma la app, como tenant_marca.logo_url. Los largos repiten los del panel
-- (src/lib/panel/limites.ts): defensa en profundidad.
create table public.galeria (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  imagen_url text not null,
  descripcion text,
  orden integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  constraint galeria_descripcion_largo check (descripcion is null or char_length(descripcion) <= 200),
  constraint galeria_orden_rango check (orden between 0 and 999)
);
create index idx_galeria_tenant on public.galeria (tenant_id, orden);

create table public.preguntas_frecuentes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pregunta text not null,
  respuesta text not null,
  orden integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  constraint preguntas_frecuentes_pregunta_largo check (char_length(pregunta) between 1 and 300),
  constraint preguntas_frecuentes_respuesta_largo check (char_length(respuesta) between 1 and 2000),
  constraint preguntas_frecuentes_orden_rango check (orden between 0 and 999)
);
create index idx_preguntas_frecuentes_tenant on public.preguntas_frecuentes (tenant_id, orden);

-- Solo el servidor (service role) las lee y escribe, también para el sitio público: RLS
-- activado sin policies y sin privilegios para la API. Los privilegios por defecto (0017) ya
-- no le dan nada a anon ni a authenticated; se repite para que quede explícito.
alter table public.galeria enable row level security;
alter table public.preguntas_frecuentes enable row level security;
revoke all on public.galeria, public.preguntas_frecuentes from anon, authenticated;

-- Red de seguridad (como la de la 0016): anon solo tiene privilegios sobre las tablas
-- públicas de siempre, y authenticated sobre ninguna.
do $$
begin
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
      and table_name not in ('servicios', 'cursos', 'testimonios', 'tenants', 'tenant_marca')
  ) then
    raise exception 'anon tiene privilegios sobre una tabla privada de public';
  end if;
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated'
  ) then
    raise exception 'authenticated tiene privilegios sobre una tabla de public';
  end if;
end $$;

notify pgrst, 'reload schema';
