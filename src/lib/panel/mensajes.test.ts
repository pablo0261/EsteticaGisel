import { describe, it, expect } from "vitest";
import type { ProblemaImagen } from "@/lib/storage/imagenes";
import { mensajeError, mensajeInfo, type ClaveError, type ClaveInfo } from "./mensajes";

describe("mensajes del panel", () => {
  it("traduce cada clave al idioma del cliente", () => {
    expect(mensajeError("es", "modulo_inactivo")).toBe("Esa sección no está habilitada para tu sitio.");
    expect(mensajeError("pt", "modulo_inactivo")).toBe("Essa seção não está habilitada para o seu site.");
    expect(mensajeInfo("es", "guardado")).toBe("Cambios guardados.");
    expect(mensajeInfo("pt", "guardado")).toBe("Alterações salvas.");
  });

  it("no muestra textos arbitrarios de la URL", () => {
    expect(mensajeError("es", undefined)).toBeNull();
    expect(mensajeError("pt", "<script>alert(1)</script>")).toBeNull();
    expect(mensajeError("es", "toString")).toBeNull();
    expect(mensajeInfo("pt", "constructor")).toBeNull();
  });

  it("los problemas de imagen y cada error de las actions tienen texto propio en los dos idiomas", () => {
    // Si ProblemaImagen tuviera una clave que no está en ERRORES, esto no compilaría.
    const imagen: ProblemaImagen[] = ["imagen_vacia", "imagen_grande", "imagen_tipo"];
    const errores: ClaveError[] = [
      ...imagen,
      "error",
      "modulo_inactivo",
      "id",
      "nombre",
      "duracion",
      "precio",
      "orden",
      "texto_invalido",
      "texto_largo",
      "inicio_titulo",
      "horario",
      "horas_cancelacion",
      "minutos_entre_turnos",
      "modo_pago",
      "sena_porcentaje",
      "servicio_con_turnos",
      "testimonio_nombre",
      "testimonio_texto",
      "pregunta",
      "respuesta",
      "descripcion",
      "galeria_llena",
    ];
    for (const clave of errores) {
      const es = mensajeError("es", clave);
      const pt = mensajeError("pt", clave);
      expect(es, clave).toBeTruthy();
      expect(pt, clave).toBeTruthy();
      expect(pt, clave).not.toBe(es);
    }
    const infos: ClaveInfo[] = ["guardado", "creado", "eliminado", "imagen_subida", "turno_completado", "turno_cancelado"];
    for (const clave of infos) {
      expect(mensajeInfo("es", clave), clave).toBeTruthy();
      expect(mensajeInfo("pt", clave), clave).not.toBe(mensajeInfo("es", clave));
    }
  });
});
