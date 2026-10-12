import type { SupabaseClient } from "@supabase/supabase-js";

/** Tablas de negocio: todas tienen tenant_id. */
export type TablaTenant =
  | "servicios"
  | "configuracion_negocio"
  | "turnos"
  | "cursos"
  | "archivos_curso"
  | "accesos_curso"
  | "pagos"
  | "intentos_reserva"
  | "recordatorios_enviados"
  | "testimonios"
  | "tenant_marca";

type Fila = Record<string, unknown>;

/**
 * Acceso a datos acotado a un tenant: cada lectura, modificación y borrado lleva el
 * filtro tenant_id, y cada insert lo fija. El servidor usa la service role (se saltea
 * RLS), así que todo acceso a tablas de negocio tiene que pasar por acá.
 *
 * Reglas:
 * - Los embeds (ej. "*, servicios(nombre)") no se filtran por tenant: la base lo garantiza
 *   con FK compuestas (tenant_id, id), así que no hay que escribir FKs de otro tenant.
 * - update/delete sin otro filtro afectan todas las filas del tenant: siempre encadenar
 *   .eq("id", ...).
 */
export function consultasDelTenant(db: SupabaseClient, tenantId: string) {
  return {
    tenantId,
    select(tabla: TablaTenant, columnas = "*") {
      return db.from(tabla).select(columnas).eq("tenant_id", tenantId);
    },
    insert(tabla: TablaTenant, filas: Fila | Fila[]) {
      const conTenant = (f: Fila) => ({ ...f, tenant_id: tenantId });
      return db.from(tabla).insert(Array.isArray(filas) ? filas.map(conTenant) : conTenant(filas));
    },
    update(tabla: TablaTenant, valores: Fila) {
      const sinTenant = { ...valores };
      delete sinTenant.tenant_id;
      return db.from(tabla).update(sinTenant).eq("tenant_id", tenantId);
    },
    delete(tabla: TablaTenant) {
      return db.from(tabla).delete().eq("tenant_id", tenantId);
    },
  };
}
