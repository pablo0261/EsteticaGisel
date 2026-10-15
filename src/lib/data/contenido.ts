import { datosDelTenant } from "@/lib/tenant/datos";
import type { ContenidoSitio } from "@/lib/sitio/enlaces";
import type { Tenant } from "@/lib/tenant/tipos";

type Consulta = PromiseLike<{ data: unknown; error: unknown }>;

/** ¿Devuelve al menos una fila? Ante un error de la base, false: la sección no se enlaza. */
async function hay(consulta: Consulta): Promise<boolean> {
  try {
    const { data, error } = await consulta;
    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Qué secciones del sitio tienen algo visible, para el menú (enlacesDelSitio). Solo se
 * consulta lo de los módulos activos, y cada consulta trae a lo sumo una fila.
 */
export async function contenidoDelSitio(tenant: Tenant): Promise<ContenidoSitio> {
  const db = datosDelTenant(tenant.id);
  const { modulos } = tenant;
  const [servicios, testimonios, galeria, preguntas, cursos] = await Promise.all([
    hay(db.select("servicios", "id").eq("activo", true).limit(1)),
    modulos.testimonios ? hay(db.select("testimonios", "id").eq("activo", true).limit(1)) : false,
    modulos.galeria ? hay(db.select("galeria", "id").eq("activo", true).limit(1)) : false,
    modulos.faq ? hay(db.select("preguntas_frecuentes", "id").eq("activo", true).limit(1)) : false,
    modulos.cursos ? hay(db.select("cursos", "id").eq("estado", "publicado").limit(1)) : false,
  ]);
  return { servicios, testimonios, galeria, preguntas, cursos };
}
