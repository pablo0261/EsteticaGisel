import { describe, it, expect } from "vitest";
import { mensajeError, mensajeInfo } from "./mensajes";

describe("mensajes de las pantallas de ingreso", () => {
  it("traduce las claves conocidas (español por defecto: el panel master)", () => {
    expect(mensajeError("credenciales")).toBe("Email o contraseña incorrectos.");
    expect(mensajeError("envio_no_configurado")).toBe("El envío de códigos no está configurado.");
    expect(mensajeInfo("codigo_enviado")).toContain("código");
    expect(mensajeError("servicio_ocupado")).toBe("El servicio está ocupado. Probá de nuevo en unos minutos.");
  });

  it("en portugués para un cliente de Brasil", () => {
    expect(mensajeError("credenciales", "pt")).toBe("E-mail ou senha incorretos.");
    expect(mensajeInfo("contrasena_cambiada", "pt")).toBe("Pronto, sua senha foi alterada. Você já pode entrar.");
    expect(mensajeError("contrasena_corta", "pt")).toContain("8");
  });

  it("no muestra textos arbitrarios de la URL", () => {
    expect(mensajeError(undefined)).toBeNull();
    expect(mensajeError("<script>alert(1)</script>")).toBeNull();
    expect(mensajeError("toString", "pt")).toBeNull();
    expect(mensajeInfo("constructor")).toBeNull();
  });

  it("cada error de código y de envío tiene su mensaje en los dos idiomas", () => {
    const claves = [
      "incorrecto", "reintentar", "sin_codigo", "vencido", "agotado", "usado", "formato",
      "espera", "limite", "envio_fallo", "envio_no_configurado", "envio_emails_no_configurado",
      "sitio", "email", "link", "contrasena_corta", "contrasena_distinta", "contrasena_rechazada",
      "sesiones_no_cerradas", "demasiados_intentos", "servicio_ocupado", "credenciales",
    ];
    for (const clave of claves) {
      expect(mensajeError(clave), clave).toBeTruthy();
      expect(mensajeError(clave, "pt"), clave).toBeTruthy();
      expect(mensajeError(clave, "pt"), clave).not.toBe(mensajeError(clave));
    }
    for (const clave of ["codigo_enviado", "reenviado", "recuperacion_enviada", "contrasena_cambiada"]) {
      expect(mensajeInfo(clave), clave).toBeTruthy();
      expect(mensajeInfo(clave, "pt"), clave).not.toBe(mensajeInfo(clave));
    }
  });
});
