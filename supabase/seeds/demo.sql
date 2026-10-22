-- Tenant de demostración con datos ficticios. No usa la marca, las fotos ni los
-- textos de ningún cliente real. El crédito del pie queda apagado.
-- Correrlo después de las migraciones:
--   npm run migrar -- supabase/seeds/demo.sql
-- Si el slug ya existe, no se toca.

insert into public.tenants (
  slug, nombre, idioma, pais, zona_horaria, moneda,
  modulo_turnos, modulo_cursos, modulo_sobre_mi, modulo_testimonios,
  modulo_galeria, modulo_faq, modulo_whatsapp
) values (
  'demo', 'Estudio Alma', 'es', 'AR', 'America/Argentina/Buenos_Aires', 'ARS',
  true, false, true, true, false, true, true
)
on conflict (slug) do nothing;

insert into public.tenant_marca (
  tenant_id, color_primario, color_secundario, color_fondo, color_texto,
  rubro, tagline, inicio_titulo, inicio_destacado, inicio_texto,
  sobre_mi_titulo, sobre_mi_texto, nota_reservas, whatsapp, instagram, email_contacto, direccion
)
select
  id,
  '#3d5a80', '#5c677d', '#f4f5f7', '#1f2933',
  'Estética',
  'Cuidado de la piel, con tiempo para vos',
  'Tu momento de',
  'cuidado',
  'Faciales, manos y pies en un estudio chico de Buenos Aires. Reservá online. Los datos de esta página son de ejemplo.',
  'Hola, soy Ana',
  E'Ana López es un personaje ficticio. Este sitio muestra cómo se ve un salón en la plataforma: textos, servicios y horarios de mentira, sin fotos de clientas reales.\n\nEl estudio atiende con turno previo.',
  'Si llegás tarde, el turno usa solo el tiempo que queda.',
  '+5491100000000',
  'estudio.alma.demo',
  'hola@estudio-alma.example',
  'Calle Falsa 123, Buenos Aires'
from public.tenants
where slug = 'demo'
  and not exists (
    select 1 from public.tenant_marca m
    join public.tenants t on t.id = m.tenant_id
    where t.slug = 'demo'
  );

insert into public.tenant_credenciales (tenant_id)
select t.id from public.tenants t
where t.slug = 'demo'
  and not exists (select 1 from public.tenant_credenciales c where c.tenant_id = t.id);

insert into public.configuracion_negocio (
  tenant_id, horario_atencion, modo_pago, sena_porcentaje, mostrar_credito
)
select
  t.id,
  '{"lun":["10:00","18:00"],"mar":["10:00","18:00"],"mie":["10:00","18:00"],"jue":["10:00","18:00"],"vie":["10:00","18:00"]}'::jsonb,
  'ninguno',
  50,
  false
from public.tenants t
where t.slug = 'demo'
  and not exists (select 1 from public.configuracion_negocio c where c.tenant_id = t.id);

insert into public.servicios (tenant_id, nombre, duracion_minutos, precio, orden)
select t.id, v.nombre, v.duracion, v.precio, v.orden
from public.tenants t
cross join (values
  ('Limpieza facial', 60, 28000, 1),
  ('Masaje de espalda', 45, 22000, 2),
  ('Manicuría', 50, 15000, 3),
  ('Perfilado de cejas', 30, 9000, 4)
) as v(nombre, duracion, precio, orden)
where t.slug = 'demo'
  and not exists (select 1 from public.servicios s where s.tenant_id = t.id);

insert into public.testimonios (tenant_id, nombre, texto, orden)
select t.id, v.nombre, v.texto, v.orden
from public.tenants t
cross join (values
  ('Lucía P.', 'Reservé online un martes y el turno quedó confirmado al toque. El lugar es tranquilo.', 1),
  ('Martín G.', 'Fui por el masaje de espalda. Puntual y sin apuros.', 2),
  ('Rosa V.', 'La limpieza facial me dejó la piel cómoda. Ya saqué el próximo turno.', 3)
) as v(nombre, texto, orden)
where t.slug = 'demo'
  and not exists (select 1 from public.testimonios x where x.tenant_id = t.id);

insert into public.preguntas_frecuentes (tenant_id, pregunta, respuesta, orden)
select t.id, v.pregunta, v.respuesta, v.orden
from public.tenants t
cross join (values
  ('¿Cómo reservo?', 'Elegí el servicio, el día y el horario. Con “sin pago anticipado” el turno queda confirmado en el momento.', 1),
  ('¿Puedo cancelar?', 'Sí, desde el enlace del turno, con la anticipación que figura en el sitio.', 2)
) as v(pregunta, respuesta, orden)
where t.slug = 'demo'
  and not exists (select 1 from public.preguntas_frecuentes p where p.tenant_id = t.id);
