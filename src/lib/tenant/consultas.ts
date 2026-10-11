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

export type ConsultasDelTenant = ReturnType<typeof consultasDelTenant>;
