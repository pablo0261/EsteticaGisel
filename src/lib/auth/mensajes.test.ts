import { describe, it, expect } from "vitest";
import { mensajeError, mensajeInfo } from "./mensajes";

describe("mensajes de las pantallas de ingreso", () => {
  it("traduce las claves conocidas", () => {
    expect(mensajeError("credenciales")).toBe("Email o contraseña incorrectos.");
    expect(mensajeError("envio_no_configurado")).toBe("El envío de códigos no está configurado.");
    expect(mensajeInfo("codigo_enviado")).toContain("código");
  });

  it("no muestra textos arbitrarios de la URL", () => {
    expect(mensajeError(undefined)).toBeNull();
    expect(mensajeError("<script>alert(1)</script>")).toBeNull();
    expect(mensajeError("toString")).toBeNull();
    expect(mensajeInfo("constructor")).toBeNull();
  });

  it("cada error de código y de envío tiene su mensaje", () => {
    const claves = [
      "incorrecto", "reintentar", "sin_codigo", "vencido", "agotado", "usado", "formato",
      "espera", "limite", "envio_fallo", "envio_no_configurado", "envio_emails_no_configurado",
      "sitio", "email", "link", "demasiados_intentos", "contrasena_corta", "contrasena_distinta", "contrasena_rechazada",
    ];
    for (const clave of claves) expect(mensajeError(clave), clave).toBeTruthy();
    for (const clave of ["codigo_enviado", "reenviado", "recuperacion_enviada", "contrasena_cambiada"]) {
      expect(mensajeInfo(clave), clave).toBeTruthy();
    }
  });
});
