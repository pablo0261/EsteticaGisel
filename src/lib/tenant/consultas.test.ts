import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consultasDelTenant } from "./consultas";

/** Cliente falso que registra cada llamada del query builder. */
function clienteFalso() {
  const llamadas: unknown[][] = [];
  const builder: Record<string, (...args: unknown[]) => unknown> = {};
  for (const metodo of ["select", "insert", "update", "delete", "eq"]) {
    builder[metodo] = (...args) => {
      llamadas.push([metodo, ...args]);
      return builder;
    };
  }
  const db = {
    from: (tabla: string) => {
      llamadas.push(["from", tabla]);
      return builder;
    },
  };
  return { db: db as unknown as SupabaseClient, llamadas };
}

describe("consultasDelTenant", () => {
  it("select filtra por tenant", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").select("servicios", "id, nombre");
    expect(llamadas).toEqual([
      ["from", "servicios"],
      ["select", "id, nombre"],
      ["eq", "tenant_id", "T1"],
    ]);
  });

  it("select sin columnas pide todas", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").select("cursos");
    expect(llamadas[1]).toEqual(["select", "*"]);
  });

  it("insert fija el tenant aunque la fila traiga otro", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").insert("servicios", { nombre: "x", tenant_id: "OTRO" });
    expect(llamadas).toEqual([
      ["from", "servicios"],
      ["insert", { nombre: "x", tenant_id: "T1" }],
    ]);
  });

  it("insert de varias filas fija el tenant en todas", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").insert("testimonios", [{ nombre: "a" }, { nombre: "b" }]);
    expect(llamadas[1]).toEqual([
      "insert",
      [
        { nombre: "a", tenant_id: "T1" },
        { nombre: "b", tenant_id: "T1" },
      ],
    ]);
  });

  it("update filtra por tenant y no permite mover la fila a otro", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").update("turnos", { estado: "cancelado", tenant_id: "OTRO" });
    expect(llamadas).toEqual([
      ["from", "turnos"],
      ["update", { estado: "cancelado" }],
      ["eq", "tenant_id", "T1"],
    ]);
  });

  it("delete filtra por tenant", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").delete("servicios");
    expect(llamadas).toEqual([
      ["from", "servicios"],
      ["delete"],
      ["eq", "tenant_id", "T1"],
    ]);
  });
});
