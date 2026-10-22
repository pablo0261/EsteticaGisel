import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { plantillaConfirmacionTurno } from "@/lib/email/plantillas";
import type { MarcaEmail } from "@/lib/email/layout-marca";
import { creditoVisible } from "@/lib/sitio/credito";
import { consultasDelTenant } from "./consultas";

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

const ALMA: MarcaEmail = {
  nombre: "Estudio Alma",
  idioma: "es",
  colores: { colorPrimario: "#3d5a80", colorSecundario: "#5c677d", colorFondo: "#f4f5f7", colorTexto: "#1f2933" },
  logoUrl: null,
};

const NORTE: MarcaEmail = {
  nombre: "Salón Norte",
  idioma: "pt",
  colores: { colorPrimario: "#0b6e4f", colorSecundario: "#1b4332", colorFondo: "#f3f7f4", colorTexto: "#122117" },
  logoUrl: null,
};

describe("aislamiento entre tenants", () => {
  it("un insert y un update quedan atados a su tenant y no al otro", () => {
    const a = clienteFalso();
    const b = clienteFalso();
    consultasDelTenant(a.db, "tenant-alma").insert("servicios", { nombre: "Limpieza", tenant_id: "tenant-norte" });
    consultasDelTenant(b.db, "tenant-norte").update("turnos", { estado: "cancelado", tenant_id: "tenant-alma" });

    expect(a.llamadas).toContainEqual(["insert", { nombre: "Limpieza", tenant_id: "tenant-alma" }]);
    expect(a.llamadas.flat()).not.toContain("tenant-norte");
    expect(b.llamadas).toContainEqual(["update", { estado: "cancelado" }]);
    expect(b.llamadas).toContainEqual(["eq", "tenant_id", "tenant-norte"]);
    expect(b.llamadas.flat()).not.toContain("tenant-alma");
  });

  it("el email y el crédito de un tenant no arrastran la marca del otro", () => {
    const emailAlma = plantillaConfirmacionTurno({
      marca: ALMA,
      servicio: "Limpieza facial",
      fechaHoraTexto: "lunes 10:00",
      linkGestion: "https://alma.example/turnos/gestion/1",
    });
    const emailNorte = plantillaConfirmacionTurno({
      marca: NORTE,
      servicio: "Limpeza de pele",
      fechaHoraTexto: "segunda 10:00",
      linkGestion: "https://norte.example/turnos/gestion/1",
    });

    expect(emailAlma.html).toContain("Estudio Alma");
    expect(emailAlma.html).toContain("#3d5a80");
    expect(emailAlma.html).not.toContain("Salón Norte");
    expect(emailAlma.html).not.toContain("#0b6e4f");
    expect(emailAlma.subject).toContain("Turno confirmado");

    expect(emailNorte.html).toContain("Salón Norte");
    expect(emailNorte.html).toContain("#0b6e4f");
    expect(emailNorte.html).not.toContain("Estudio Alma");
    expect(emailNorte.html).not.toContain("#3d5a80");
    expect(emailNorte.subject).toContain("Horário confirmado");

    expect(creditoVisible(false, "es")).toBeNull();
    expect(creditoVisible(true, "pt")?.texto).toBe("Site criado por Certea");
    expect(emailAlma.html).not.toContain("Certea");
    expect(emailNorte.html).not.toContain("Certea");
  });
});
