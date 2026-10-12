import "server-only";
import { masterVerificado } from "@/lib/auth/master";
import { claveCredenciales } from "@/lib/cripto/clave";
import { cifrar, descifrar } from "@/lib/cripto/credenciales";
import { datosDelTenant } from "@/lib/tenant/datos";
import type { FormGmail, FormMp } from "./formularios";
import { verificarGmail } from "./gmail";
import { textoErrorSmtp, type FalloSmtp } from "./smtp";

/**
 * Credenciales de un cliente (spec 4.3 y 9). Los secretos se guardan cifrados y nunca
 * salen de este módulo: el panel recibe solo si están configurados.
 */
type FilaCredenciales = {
  mp_access_token: string | null;
  mp_public_key: string | null;
  mp_webhook_secret: string | null;
  mp_origen: "oauth" | "manual" | null;
  mp_token_vence_en: string | null;
  smtp_usuario: string | null;
  smtp_password: string | null;
  smtp_nombre_remitente: string | null;
  smtp_estado: "ok" | "error" | "sin_configurar";
  smtp_ultimo_error: string | null;
};

const COLUMNAS =
  "mp_access_token, mp_public_key, mp_webhook_secret, mp_origen, mp_token_vence_en, smtp_usuario, smtp_password, smtp_nombre_remitente, smtp_estado, smtp_ultimo_error";

async function leerFila(tenantId: string): Promise<FilaCredenciales> {
  const { data, error } = await datosDelTenant(tenantId).select("tenant_credenciales", COLUMNAS).maybeSingle();
  if (error) throw new Error(`credenciales: ${error.message}`);
  if (!data) throw new Error("El cliente no tiene fila de credenciales");
  return data as unknown as FilaCredenciales;
}

async function actualizar(tenantId: string, cambios: Record<string, unknown>): Promise<void> {
  const { error } = await datosDelTenant(tenantId).update("tenant_credenciales", cambios);
  if (error) throw new Error(`guardar credenciales: ${error.message}`);
}

export type EstadoCredenciales = {
  gmail: {
    usuario: string | null;
    remitente: string | null;
    contrasenaConfigurada: boolean;
    estado: FilaCredenciales["smtp_estado"];
    ultimoError: string | null;
  };
  mp: {
    origen: FilaCredenciales["mp_origen"];
    publicKey: string | null;
    accessTokenConfigurado: boolean;
    webhookSecretConfigurado: boolean;
    venceEn: string | null;
  };
};

/** Lo que muestra el panel: nunca un valor secreto. */
export async function estadoCredenciales(tenantId: string): Promise<EstadoCredenciales> {
  await masterVerificado();
  const f = await leerFila(tenantId);
  return {
    gmail: {
      usuario: f.smtp_usuario,
      remitente: f.smtp_nombre_remitente,
      contrasenaConfigurada: !!f.smtp_password,
      estado: f.smtp_estado,
      ultimoError: f.smtp_ultimo_error,
    },
    mp: {
      origen: f.mp_origen,
      publicKey: f.mp_public_key,
      accessTokenConfigurado: !!f.mp_access_token,
      webhookSecretConfigurado: !!f.mp_webhook_secret,
      venceEn: f.mp_token_vence_en,
    },
  };
}

/**
 * "Probar conexión y guardar". Prueba con los datos efectivos (la contraseña nueva o la
 * guardada). Si pasa, guarda y marca ok. Si falla, no guarda nada nuevo; si los datos
 * eran los guardados (misma cuenta, sin contraseña nueva), registra el error (alerta en la
 * lista). Lanza si falta CREDENCIALES_KEY (la action lo chequea antes).
 */
export async function probarYGuardarGmail(
  tenantId: string,
  form: FormGmail,
): Promise<{ ok: true } | { ok: false; error: FalloSmtp | "gmail_sin_contrasena" }> {
  await masterVerificado();
  const clave = claveCredenciales();
  const fila = await leerFila(tenantId);
  const contexto = { tenantId, columna: "smtp_password" } as const;

  let contrasena = form.contrasena;
  if (!contrasena) {
    if (!fila.smtp_password) return { ok: false, error: "gmail_sin_contrasena" };
    contrasena = descifrar(clave, fila.smtp_password, contexto);
  }

  const prueba = await verificarGmail(form.usuario, contrasena);
  if (!prueba.ok) {
    const esLaGuardada = !form.contrasena && form.usuario === fila.smtp_usuario;
    if (esLaGuardada) {
      await actualizar(tenantId, { smtp_estado: "error", smtp_ultimo_error: textoErrorSmtp(prueba.fallo) });
    }
    return { ok: false, error: prueba.fallo.clave };
  }

  await actualizar(tenantId, {
    smtp_usuario: form.usuario,
    smtp_nombre_remitente: form.remitente,
    ...(form.contrasena ? { smtp_password: cifrar(clave, form.contrasena, contexto) } : {}),
    smtp_estado: "ok",
    smtp_ultimo_error: null,
  });
  return { ok: true };
}

/**
 * Mercado Pago manual (spec 9). Un access token nuevo fija mp_origen = 'manual' y limpia
 * los datos del OAuth. Los campos vacíos mantienen lo guardado.
 */
export async function guardarMercadoPago(tenantId: string, form: FormMp): Promise<"ok" | "mp_sin_access_token"> {
  await masterVerificado();
  const clave = claveCredenciales();
  const fila = await leerFila(tenantId);
  if (!form.accessToken && !fila.mp_access_token) return "mp_sin_access_token";

  const cambios: Record<string, unknown> = { mp_origen: "manual" };
  if (form.accessToken) {
    cambios.mp_access_token = cifrar(clave, form.accessToken, { tenantId, columna: "mp_access_token" });
    cambios.mp_refresh_token = null;
    cambios.mp_token_vence_en = null;
    cambios.mp_user_id = null;
  }
  if (form.webhookSecret) {
    cambios.mp_webhook_secret = cifrar(clave, form.webhookSecret, { tenantId, columna: "mp_webhook_secret" });
  }
  if (form.publicKey) cambios.mp_public_key = form.publicKey;
  await actualizar(tenantId, cambios);
  return "ok";
}
