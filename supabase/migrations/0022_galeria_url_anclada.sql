-- Etapa C2a (revisión): el check de galeria.imagen_url de la 0021 aceptaba cualquier cosa
-- antes de "/storage/v1/object/public/sitios/" y buscaba la carpeta del tenant con position(),
-- en cualquier lugar de la URL. Ahora el patrón es uno solo, anclado de punta a punta y armado
-- por fila con el tenant_id: https://<host>/storage/v1/object/public/sitios/{tenant_id}/
-- galeria-{ms}-{8 hex}.{png|jpg|webp}, que es lo que arma pathImagenGaleria + urlPublica
-- (src/lib/storage/imagenes.ts). NEXT_PUBLIC_SUPABASE_URL es https (verificado), y el test de
-- aislamiento inserta una URL https://example.supabase.co/... con ese formato.
alter table public.galeria drop constraint galeria_imagen_url_formato;

alter table public.galeria
  add constraint galeria_imagen_url_formato check (
    imagen_url ~ (
      '^https://[^/?#]+/storage/v1/object/public/sitios/' || tenant_id::text
      || '/galeria-[0-9]+-[0-9a-f]{8}\.(png|jpg|webp)$'
    )
  ) not valid;
alter table public.galeria validate constraint galeria_imagen_url_formato;
