-- Vista previa pública del curso: link a un video de YouTube (demo de 30 s en la ficha
-- y miniatura en el catálogo). El contenido pago sigue en Storage privado.
alter table cursos add column preview_youtube_url text;
