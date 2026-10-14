-- Etapa C2a (revisión): checks de servicios y de la galería, defensa en profundidad de lo
-- que ya valida el panel (src/lib/panel/limites.ts y src/lib/panel/formularios.ts).
--
-- Servicios: precio >= 0, duración entre 5 y 600 minutos (duracionMin/duracionMax) y
-- nombre de 1 a 80 caracteres (nombre). Verificado con un SELECT en una transacción de solo
-- lectura antes de escribir esto: 9 filas, precios de 4000 a 12000, duraciones de 40 a 90
-- minutos y nombres de 7 a 34 caracteres; ninguna fuera de rango. Se agregan "not valid" y
-- se validan aparte, como en la 0019 y la 0020.
alter table public.servicios
  add constraint servicios_precio_no_negativo check (precio >= 0) not valid;
alter table public.servicios validate constraint servicios_precio_no_negativo;

alter table public.servicios
  add constraint servicios_duracion_rango check (duracion_minutos between 5 and 600) not valid;
alter table public.servicios validate constraint servicios_duracion_rango;

alter table public.servicios
  add constraint servicios_nombre_largo check (char_length(nombre) between 1 and 80) not valid;
alter table public.servicios validate constraint servicios_nombre_largo;

-- Galería: imagen_url es la URL pública que arma la app con pathImagenGaleria
-- (src/lib/storage/imagenes.ts): <supabase>/storage/v1/object/public/sitios/{tenant_id}/
-- galeria-{ms}-{8 hex}.{png|jpg|webp}, y la carpeta es la del propio tenant. La tabla está
-- vacía (verificado con el mismo SELECT).
-- El tope de 30 imágenes por galería queda en la app (galeria_llena, LIMITES_PANEL): dos
-- subidas simultáneas del mismo cliente pueden pasar las dos el conteo y dejar 31. Se acepta:
-- solo el cliente logueado sube, el exceso es de una o dos imágenes de 2 MB y no rompe nada.
alter table public.galeria
  add constraint galeria_imagen_url_formato check (
    imagen_url ~ '/storage/v1/object/public/sitios/[0-9a-f-]{36}/galeria-[0-9]+-[0-9a-f]{8}\.(png|jpg|webp)$'
    and position('/storage/v1/object/public/sitios/' || tenant_id::text || '/' in imagen_url) > 0
  ) not valid;
alter table public.galeria validate constraint galeria_imagen_url_formato;
