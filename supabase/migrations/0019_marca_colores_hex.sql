-- Etapa C1: los colores de la marca son #rgb o #rrggbb (sin alfa), como valida la app
-- (esColorHex). La base lo exige también: un color inválido no llega al CSS del sitio
-- por ningún camino. Se agrega "not valid" y se valida aparte (verificado antes con un
-- SELECT: las filas existentes cumplen).

alter table public.tenant_marca
  add constraint tenant_marca_colores_hex check (
    color_primario ~* '^#([0-9a-f]{3}|[0-9a-f]{6})$'
    and color_secundario ~* '^#([0-9a-f]{3}|[0-9a-f]{6})$'
    and color_fondo ~* '^#([0-9a-f]{3}|[0-9a-f]{6})$'
    and color_texto ~* '^#([0-9a-f]{3}|[0-9a-f]{6})$'
  ) not valid;

alter table public.tenant_marca validate constraint tenant_marca_colores_hex;
