import "server-only";
import { masterVerificado } from "@/lib/auth/master";
import { COLORES_PLATAFORMA } from "@/lib/plataforma";
import { CAMPO_MARCA_IMAGEN, COLUMNA_IMAGEN, pathDeUrlPublica, type FormatoImagen, type TipoImagen } from "@/lib/storage/imagenes";
import { borrarImagenSitio, subirImagenSitio, urlSupabase } from "@/lib/storage/sitios";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { datosDelTenant } from "@/lib/tenant/datos";
import type { ColoresMarca } from "@/lib/tenant/estilo";
import { esSlugValido } from "@/lib/tenant/host";
import type { Modulos, Tenant } from "@/lib/tenant/tipos";
import { alertasDelCliente, type Alerta } from "./alertas";
import {
  columnasColores,
  columnasDatos,
  columnasTextos,
  type AltaCliente,
  type DatosCliente,
  type TextosMarca,
} from "./formularios";
import { columnasModulos, MODULOS, modulosDeFila, type ColumnaModulo } from "./modulos";

/**
 * Datos del panel master con la service role. Cada función exportada verifica al master
 * (además de las actions y las páginas): defensa en profundidad, y masterVerificado está
 * cacheado por request.
 */
function fallar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`);
}

export type ClienteListado = {
  id: string;
  nombre: string;
  slug: string;
  estado: Tenant["estado"];
  modulos: Modulos;
  alertas: Alerta[];
};

type FilaAlertas = { smtp_estado: string; mp_token_vence_en: string | null };
type FilaListado = Record<ColumnaModulo, boolean> & {
  id: string;
  nombre: string;
  slug: string;
  estado: Tenant["estado"];
  tenant_credenciales: FilaAlertas | FilaAlertas[] | null;
};

export async function listarClientes(): Promise<ClienteListado[]> {
  await masterVerificado();
  const columnas = [
    "id, nombre, slug, estado",
    ...MODULOS.map((m) => m.columna),
    "tenant_credenciales(smtp_estado, mp_token_vence_en)",
  ].join(", ");
  const { data, error } = await createAdminClient().from("tenants").select(columnas).order("nombre");
  fallar("clientes", error);
  const ahora = new Date();
  return ((data ?? []) as unknown as FilaListado[]).map((f) => {
    const cred = Array.isArray(f.tenant_credenciales) ? f.tenant_credenciales[0] : f.tenant_credenciales;
    return {
      id: f.id,
      nombre: f.nombre,
      slug: f.slug,
      estado: f.estado,
      modulos: modulosDeFila(f),
      alertas: alertasDelCliente(cred ? { smtpEstado: cred.smtp_estado, mpTokenVenceEn: cred.mp_token_vence_en } : null, ahora),
    };
  });
}

/** Cliente para editar (activo o suspendido). null si el slug no es válido o no existe. */
export async function clientePorSlug(slug: string): Promise<Tenant | null> {
  await masterVerificado();
  if (!esSlugValido(slug)) return null;
  return getTenantPorSlug(slug);
}

/**
 * Las siete claves de módulos, siempre explícitas: crear_tenant toma una clave ausente
 * como false, mientras que los defaults de la tabla son otros.
 */
function modulosParaRpc(modulos: Modulos): Record<keyof Modulos, boolean> {
  return Object.fromEntries(MODULOS.map((m) => [m.clave, modulos[m.clave] === true])) as Record<keyof Modulos, boolean>;
}

/** Alta en una transacción (función SQL crear_tenant, migración 0018), con la paleta de la plataforma. */
export async function crearCliente(alta: AltaCliente): Promise<{ ok: true } | { ok: false; error: "slug_en_uso" }> {
  await masterVerificado();
  const { error } = await createAdminClient().rpc("crear_tenant", {
    p_slug: alta.slug,
    p_nombre: alta.nombre,
    p_pais: alta.pais,
    p_idioma: alta.idioma,
    p_zona_horaria: alta.zonaHoraria,
    p_moneda: alta.moneda,
    p_modulos: modulosParaRpc(alta.modulos),
    p_colores: {
      primario: COLORES_PLATAFORMA.colorPrimario,
      secundario: COLORES_PLATAFORMA.colorSecundario,
      fondo: COLORES_PLATAFORMA.colorFondo,
      texto: COLORES_PLATAFORMA.colorTexto,
    },
  });
  if (error?.code === "23505") return { ok: false, error: "slug_en_uso" };
  fallar("alta del cliente", error);
  return { ok: true };
}

async function actualizarTenant(tenantId: string, cambios: Record<string, unknown>): Promise<void> {
  const { error } = await createAdminClient().from("tenants").update(cambios).eq("id", tenantId);
  fallar("actualizar cliente", error);
}

async function actualizarMarca(tenantId: string, cambios: Record<string, unknown>): Promise<void> {
  const { error } = await datosDelTenant(tenantId).update("tenant_marca", cambios);
  fallar("actualizar marca", error);
}

export async function actualizarDatos(tenantId: string, datos: DatosCliente): Promise<void> {
  await masterVerificado();
  await actualizarTenant(tenantId, columnasDatos(datos));
}

export async function actualizarEstado(tenantId: string, estado: Tenant["estado"]): Promise<void> {
  await masterVerificado();
  await actualizarTenant(tenantId, { estado });
}

export async function actualizarModulos(tenantId: string, modulos: Modulos): Promise<void> {
  await masterVerificado();
  await actualizarTenant(tenantId, columnasModulos(modulos));
}

export async function actualizarColores(tenantId: string, colores: ColoresMarca): Promise<void> {
  await masterVerificado();
  await actualizarMarca(tenantId, columnasColores(colores));
}

export async function actualizarTextos(tenantId: string, textos: TextosMarca): Promise<void> {
  await masterVerificado();
  await actualizarMarca(tenantId, columnasTextos(textos));
}

/**
 * Sube la imagen nueva, la guarda en tenant_marca y recién entonces borra la anterior (si
 * era una subida por el panel a la carpeta del tenant). Si falla el guardado, se borra la nueva.
 */
export async function guardarImagen(tenant: Tenant, tipo: TipoImagen, bytes: Buffer, formato: FormatoImagen): Promise<void> {
  await masterVerificado();
  const anterior = tenant.marca[CAMPO_MARCA_IMAGEN[tipo]];
  const nueva = await subirImagenSitio(tenant.id, tipo, bytes, formato);
  try {
    await actualizarMarca(tenant.id, { [COLUMNA_IMAGEN[tipo]]: nueva.url });
  } catch (e) {
    await borrarImagenSitio(nueva.path).catch(() => {});
    throw e;
  }
  const pathAnterior = pathDeUrlPublica(anterior, urlSupabase(), tenant.id);
  if (pathAnterior) {
    // Si falla, queda un objeto huérfano en la carpeta del tenant: no rompe nada.
    await borrarImagenSitio(pathAnterior).catch((e) => console.error("No se pudo borrar la imagen anterior:", e));
  }
}
