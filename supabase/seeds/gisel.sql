-- Seed del salón de Gisel Bigurrarena. No forma parte del esquema del producto.
-- Correrlo DESPUÉS de todas las migraciones, y solo en la base de ese salón:
--   npm run migrar -- supabase/seeds/gisel.sql
-- Es idempotente: si el tenant ya existe, no pisa marca, servicios, horarios ni
-- testimonios (en producción esos datos pueden haber cambiado desde el panel).
-- Las fotos viven en public/tenants/gisel/ y no son el default de otros clientes.

insert into public.tenants (
  slug, nombre, modulo_turnos, modulo_cursos, modulo_sobre_mi, modulo_testimonios
) values (
  'gisel', 'Gisel Bigurrarena', true, true, true, true
)
on conflict (slug) do nothing;

insert into public.tenant_marca (
  tenant_id, color_primario, color_secundario, color_fondo, color_texto,
  logo_url, logo_claro_url, foto_perfil_url, rubro, tagline,
  inicio_titulo, inicio_destacado, inicio_texto, sobre_mi_titulo, sobre_mi_texto,
  nota_reservas, whatsapp, instagram, email_contacto, direccion
)
select
  id,
  '#c0899a', '#4e5340', '#f6f1ea', '#1a1a1a',
  '/tenants/gisel/brand/horizontal-negro.png',
  '/tenants/gisel/brand/horizontal-blanco.png',
  '/tenants/gisel/retrato.jpg',
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
from public.tenants
where slug = 'gisel'
  and not exists (
    select 1 from public.tenant_marca m
    join public.tenants t on t.id = m.tenant_id
    where t.slug = 'gisel'
  );

insert into public.tenant_credenciales (tenant_id)
select t.id from public.tenants t
where t.slug = 'gisel'
  and not exists (select 1 from public.tenant_credenciales c where c.tenant_id = t.id);

insert into public.configuracion_negocio (
  tenant_id, horario_atencion, modo_pago, sena_porcentaje, mostrar_credito
)
select
  t.id,
  '{"lun":["14:00","19:00"],"mar":["14:00","19:00"],"mie":["14:00","19:00"],"jue":["14:00","19:00"],"vie":["14:00","19:00"],"sab":["09:00","14:00"]}'::jsonb,
  'sena',
  50,
  false
from public.tenants t
where t.slug = 'gisel'
  and not exists (select 1 from public.configuracion_negocio c where c.tenant_id = t.id);

insert into public.servicios (tenant_id, nombre, duracion_minutos, orden)
select t.id, v.nombre, v.duracion, v.orden
from public.tenants t
cross join (values
  ('Tratamientos faciales', 90, 1),
  ('Manicuría', 90, 2),
  ('Pedicuría', 60, 3),
  ('Pedicuría + belleza de pies', 90, 4),
  ('Masajes', 60, 5),
  ('Tratamientos capilares', 40, 6),
  ('Laminado de cejas', 60, 7),
  ('Laminado + lifting de pestañas', 90, 8),
  ('Tratamientos corporales (por zona)', 60, 9)
) as v(nombre, duracion, orden)
where t.slug = 'gisel'
  and not exists (select 1 from public.servicios s where s.tenant_id = t.id);

insert into public.testimonios (tenant_id, nombre, texto, orden)
select t.id, v.nombre, v.texto, v.orden
from public.tenants t
cross join (values
  ('Carla M.', 'Salí renovada. Gisel es súper profesional y el trato es hermoso. Ya reservé mi próximo turno.', 1),
  ('Sofía R.', 'El laminado de cejas me encantó, quedó natural y prolijo. Recomendadísima.', 2),
  ('Daniela P.', 'Hice uno de sus cursos y aprendí un montón. Explica clarísimo y con mucha dedicación.', 3)
) as v(nombre, texto, orden)
where t.slug = 'gisel'
  and not exists (select 1 from public.testimonios x where x.tenant_id = t.id);

-- Usuarios de Auth sin perfil: en la base original eran el admin de este salón.
-- No pisa un perfil ya asignado. No correrlo en una base con usuarios de otros salones.
insert into public.perfiles (user_id, rol, tenant_id)
select u.id, 'cliente', t.id
from auth.users u
cross join public.tenants t
where t.slug = 'gisel'
  and not exists (select 1 from public.perfiles p where p.user_id = u.id);
