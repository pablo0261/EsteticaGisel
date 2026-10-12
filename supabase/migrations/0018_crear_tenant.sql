-- Etapa C1: alta de un cliente desde el panel master en una sola transacción.
-- Crea el tenant y sus filas de marca, configuración y credenciales. Una llamada por RPC
-- es una sola transacción: si una fila falla, no queda nada a medias.
-- Solo la ejecuta el servidor con la service role (security invoker: corre con sus
-- privilegios, que se saltean RLS). anon y authenticated no la ejecutan: la 0017 cerró
-- los privilegios por defecto, y se repite acá para que quede explícito.

create function public.crear_tenant(
  p_slug text,
  p_nombre text,
  p_pais text,
  p_idioma text,
  p_zona_horaria text,
  p_moneda text,
  p_modulos jsonb,
  p_colores jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  nuevo uuid;
begin
  insert into public.tenants (
    slug, nombre, pais, idioma, zona_horaria, moneda,
    modulo_turnos, modulo_cursos, modulo_sobre_mi, modulo_testimonios,
    modulo_galeria, modulo_faq, modulo_whatsapp
  ) values (
    p_slug, p_nombre, p_pais, p_idioma, p_zona_horaria, p_moneda,
    coalesce((p_modulos ->> 'turnos')::boolean, false),
    coalesce((p_modulos ->> 'cursos')::boolean, false),
    coalesce((p_modulos ->> 'sobreMi')::boolean, false),
    coalesce((p_modulos ->> 'testimonios')::boolean, false),
    coalesce((p_modulos ->> 'galeria')::boolean, false),
    coalesce((p_modulos ->> 'faq')::boolean, false),
    coalesce((p_modulos ->> 'whatsapp')::boolean, false)
  )
  returning id into nuevo;

  -- Los colores son obligatorios (un null explícito no toma el default de la tabla): la
  -- app manda la paleta de la plataforma. El título de inicio arranca con el nombre.
  insert into public.tenant_marca (
    tenant_id, color_primario, color_secundario, color_fondo, color_texto, inicio_titulo
  ) values (
    nuevo, p_colores ->> 'primario', p_colores ->> 'secundario', p_colores ->> 'fondo',
    p_colores ->> 'texto', p_nombre
  );

  -- Horario vacío: cerrado todos los días hasta que el cliente cargue el suyo.
  insert into public.configuracion_negocio (tenant_id, horario_atencion) values (nuevo, '{}'::jsonb);

  insert into public.tenant_credenciales (tenant_id) values (nuevo);

  return nuevo;
end;
$$;

revoke execute on function public.crear_tenant(text, text, text, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.crear_tenant(text, text, text, text, text, text, jsonb, jsonb)
  to service_role;

-- PostgREST expone la función nueva sin esperar a que recargue solo su caché.
notify pgrst, 'reload schema';
