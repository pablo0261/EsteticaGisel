import { describe, it, expect } from "vitest";
import { mensajeAviso, mensajeError, mensajeInfo, type ClaveError, type ClaveInfo } from "./mensajes";

describe("mensajes del panel master", () => {
  it("cada clave tiene su texto", () => {
    const errores: ClaveError[] = [
      "cliente", "error", "nombre", "slug_invalido", "slug_en_uso", "pais", "idioma", "zona", "moneda",
      "color_invalido", "contraste_texto", "contraste_boton", "imagen_destino", "imagen_vacia", "imagen_grande",
      "imagen_tipo", "inicio_titulo", "texto_largo", "whatsapp", "instagram", "email_contacto", "email",
      "ya_es_usuario", "limite_usuarios", "usuario_de_otro", "usuario_master", "usuario_sin_cliente",
      "usuario_no_encontrado", "usuario_sin_email", "envio_fallo", "envio_emails_no_configurado",
      "cliente_suspendido", "clave_credenciales", "gmail_usuario", "gmail_contrasena", "gmail_sin_contrasena",
      "gmail_contrasena_cuenta_nueva", "credencial_ilegible", "gmail_remitente", "gmail_autenticacion", "gmail_conexion", "gmail_otro", "mp_access_token",
      "mp_public_key", "mp_webhook_secret", "mp_sin_access_token",
    ];
    for (const c of errores) expect(mensajeError(c), c).toBeTruthy();
    const infos: ClaveInfo[] = [
      "creado", "guardado", "imagen_guardada", "usuario_creado", "link_reenviado", "dispositivos_revocados",
      "suspendido", "reactivado", "gmail_ok", "mp_guardado",
    ];
    for (const c of infos) expect(mensajeInfo(c), c).toBeTruthy();
    expect(mensajeAviso("contraste_secundario")).toBeTruthy();
  });

  it("no muestra textos arbitrarios de la URL", () => {
    expect(mensajeError(undefined)).toBeNull();
    expect(mensajeError("<script>alert(1)</script>")).toBeNull();
    expect(mensajeError("toString")).toBeNull();
    expect(mensajeInfo("constructor")).toBeNull();
    expect(mensajeAviso("__proto__")).toBeNull();
  });
});
