"use server";

import { parsearDescripcionImagen, parsearId, parsearImagenGaleria } from "@/lib/panel/formularios";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { pathDeImagenGaleria, validarImagen, validarTamano } from "@/lib/storage/imagenes";
import { borrarImagenSitio, subirImagenGaleria, urlSupabase } from "@/lib/storage/sitios";
import { datosDelTenant } from "@/lib/tenant/datos";

const RUTA = "/admin/galeria";

/** Una imagen por envío (hasta 2 MB; bodySizeLimit de 3 MB). PNG, JPG o WebP según sus bytes. */
export async function subirImagen(formData: FormData) {
  const tenant = await tenantDeAccion("galeria");
  const descripcion = parsearDescripcionImagen(formData);
  if (!descripcion.ok) ir(RUTA, { error: descripcion.error });
  const archivo = formData.get("archivo");
  if (!(archivo instanceof Blob)) ir(RUTA, { error: "imagen_vacia" });
  // El tamaño se mira antes de leer el contenido.
  const problemaTamano = validarTamano(archivo.size);
  if (problemaTamano) ir(RUTA, { error: problemaTamano });

  const db = datosDelTenant(tenant.id);
  const { data: filas, error: errorConteo } = await db.select("galeria", "id");
  if (errorConteo) ir(RUTA, { error: "error" });
  const cantidad = filas?.length ?? 0;
  if (cantidad >= L.imagenesGaleria) ir(RUTA, { error: "galeria_llena" });

  const bytes = Buffer.from(await archivo.arrayBuffer());
  // El formato (y con él el Content-Type y la extensión) sale de los bytes, nunca de archivo.type.
  const imagen = validarImagen(bytes);
  if (!imagen.ok) ir(RUTA, { error: imagen.error });
  // Un fallo de Storage vuelve al panel con el aviso traducido (no a la pantalla de error).
  // ir() queda fuera del try: su redirect es una excepción que el catch no debe tragar.
  let url: string | null = null;
  try {
    url = await subirImagenGaleria(tenant.id, bytes, imagen.formato);
  } catch (e) {
    console.error("No se pudo subir la imagen de la galería:", e);
  }
  if (!url) ir(RUTA, { error: "error" });
  const { error } = await db.insert("galeria", {
    imagen_url: url,
    descripcion: descripcion.valor,
    orden: Math.min(cantidad, L.ordenMax),
  });
  if (error) {
    // Sin la fila, el objeto quedaría huérfano en el bucket.
    const path = pathDeImagenGaleria(url, urlSupabase(), tenant.id);
    if (path) await borrarImagenSitio(path).catch(() => undefined);
    ir(RUTA, { error: "error" });
  }
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "imagen_subida" });
}

export async function editarImagen(formData: FormData) {
  const tenant = await tenantDeAccion("galeria");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const imagen = parsearImagenGaleria(formData);
  if (!imagen.ok) ir(RUTA, { error: imagen.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("galeria", { descripcion: imagen.valor.descripcion, orden: imagen.valor.orden, activo: imagen.valor.activo })
    .eq("id", id)
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}

export async function eliminarImagen(formData: FormData) {
  const tenant = await tenantDeAccion("galeria");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const { data, error } = await datosDelTenant(tenant.id).delete("galeria").eq("id", id).select("imagen_url");
  if (error) ir(RUTA, { error: "error" });
  const fila = (data as unknown as { imagen_url: string }[] | null)?.[0];
  if (!fila) ir(RUTA, { error: "id" });
  // La URL sale de la fila del tenant (no del formulario) y solo se borra si es de su galería.
  const path = pathDeImagenGaleria(fila.imagen_url, urlSupabase(), tenant.id);
  if (path) {
    try {
      await borrarImagenSitio(path);
    } catch (e) {
      console.error("No se pudo borrar la imagen de la galería del bucket:", e);
    }
  }
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "eliminado" });
}
