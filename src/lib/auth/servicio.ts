import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Perfil } from "@/lib/tenant/permisos";
import {
  estadoCodigo,
  generarCodigo,
  hashCodigo,
  mismoHash,
  permisoEnvio,
  vencimientoCodigo,
  type PermisoEnvio,
  type ResultadoCodigo,
} from "./codigos";
import {
  dispositivoVigente,
  generarTokenDispositivo,
  hashToken,
  tokenConFormato,
  vencimientoDispositivo,
} from "./dispositivo";
import { hashEmail, recuperacionPermitida } from "./recuperacion";
import { secretoMfa } from "./secreto";

/**
 * Datos del login con la service role. Las tablas no tienen policies (migración 0011):
 * este módulo es el único que las toca.
 */
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

function fallar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`);
}

export async function perfilDe(userId: string): Promise<Perfil | null> {
  const { data, error } = await createAdminClient()
    .from("perfiles")
    .select("rol, tenant_id")
    .eq("user_id", userId)
    .maybeSingle();
  fallar("perfil", error);
  return (data as Perfil | null) ?? null;
}

export type CodigoNuevo = { ok: true; codigo: string } | Exclude<PermisoEnvio, { ok: true }>;

/** Genera un código nuevo (si lo permiten la espera y el límite por hora) y guarda su HMAC. */
export async function crearCodigo(userId: string): Promise<CodigoNuevo> {
  const db = createAdminClient();
  const ahora = new Date();
  const { data: recientes, error } = await db
    .from("codigos_login")
    .select("creado_en")
    .eq("user_id", userId)
    .gte("creado_en", new Date(ahora.getTime() - HORA_MS).toISOString())
    .order("creado_en", { ascending: false });
  fallar("códigos recientes", error);
  const filas = recientes ?? [];
  const permiso = permisoEnvio(filas[0] ? new Date(filas[0].creado_en) : null, filas.length, ahora);
  if (!permiso.ok) return permiso;

  // Un solo código vigente: los anteriores vencen ya (siguen contando para el límite por hora).
  const { error: errorVencer } = await db
    .from("codigos_login")
    .update({ expira_en: ahora.toISOString() })
    .eq("user_id", userId)
    .is("usado_en", null)
    .gt("expira_en", ahora.toISOString());
  fallar("vencer códigos anteriores", errorVencer);
  const { error: errorLimpieza } = await db
    .from("codigos_login")
    .delete()
    .eq("user_id", userId)
    .lt("creado_en", new Date(ahora.getTime() - DIA_MS).toISOString());
  fallar("limpiar códigos viejos", errorLimpieza);

  const codigo = generarCodigo();
  const { error: errorAlta } = await db.from("codigos_login").insert({
    user_id: userId,
    codigo_hash: hashCodigo(secretoMfa(), userId, codigo),
    // creado_en con el mismo reloj que expira_en y que las comparaciones (no el now() de la base).
    creado_en: ahora.toISOString(),
    expira_en: vencimientoCodigo(ahora).toISOString(),
  });
  fallar("guardar código", errorAlta);
  return { ok: true, codigo };
}

/** Compara el código ingresado con el último del usuario. Cada intento cuenta, acierte o no. */
export async function comprobarCodigo(userId: string, codigo: string): Promise<ResultadoCodigo> {
  const db = createAdminClient();
  const { data: fila, error } = await db
    .from("codigos_login")
    .select("id, codigo_hash, expira_en, intentos, usado_en")
    .eq("user_id", userId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  fallar("código", error);
  if (!fila) return "sin_codigo";
  const estado = estadoCodigo(fila, new Date());
  if (estado !== "vigente") return estado;

  // El intento se cuenta antes de comparar, con compare-and-set sobre "intentos": dos
  // intentos en paralelo no pueden usar el mismo número.
  const { data: contado, error: errorIntento } = await db
    .from("codigos_login")
    .update({ intentos: fila.intentos + 1 })
    .eq("id", fila.id)
    .eq("intentos", fila.intentos)
    .select("id");
  fallar("contar intento", errorIntento);
  if (!contado?.length) return "reintentar";

  if (!mismoHash(fila.codigo_hash, hashCodigo(secretoMfa(), userId, codigo))) return "incorrecto";

  const { data: usado, error: errorUso } = await db
    .from("codigos_login")
    .update({ usado_en: new Date().toISOString() })
    .eq("id", fila.id)
    .is("usado_en", null)
    .select("id");
  fallar("marcar código usado", errorUso);
  return usado?.length ? "ok" : "usado";
}

/** ¿El token de la cookie corresponde a un dispositivo recordado vigente de este usuario? */
export async function dispositivoValido(userId: string, token: string): Promise<boolean> {
  if (!tokenConFormato(token)) return false;
  const db = createAdminClient();
  const { data, error } = await db
    .from("dispositivos_confiables")
    .select("id, expira_en")
    .eq("user_id", userId)
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  fallar("dispositivo", error);
  if (!data || !dispositivoVigente(data, new Date())) return false;
  const { error: errorUso } = await db
    .from("dispositivos_confiables")
    .update({ ultimo_uso_en: new Date().toISOString() })
    .eq("id", data.id);
  fallar("uso del dispositivo", errorUso);
  return true;
}

/** Registra el dispositivo y devuelve el token para la cookie (en la base queda su hash). */
export async function recordarDispositivo(userId: string, userAgent: string | null): Promise<string> {
  const db = createAdminClient();
  const ahora = new Date();
  const { error: errorLimpieza } = await db
    .from("dispositivos_confiables")
    .delete()
    .eq("user_id", userId)
    .lt("expira_en", ahora.toISOString());
  fallar("limpiar dispositivos vencidos", errorLimpieza);
  const token = generarTokenDispositivo();
  const { error } = await db.from("dispositivos_confiables").insert({
    user_id: userId,
    token_hash: hashToken(token),
    expira_en: vencimientoDispositivo(ahora).toISOString(),
    user_agent: userAgent?.slice(0, 300) ?? null,
  });
  fallar("guardar dispositivo", error);
  return token;
}

/** Olvida todos los dispositivos recordados del usuario (cambio de contraseña; panel master en la etapa C). */
export async function revocarDispositivos(userId: string): Promise<void> {
  const { error } = await createAdminClient().from("dispositivos_confiables").delete().eq("user_id", userId);
  fallar("revocar dispositivos", error);
}

/** Registra un pedido de recuperación si no supera los límites por hora. false = no enviar. */
export async function registrarPedidoRecuperacion(email: string, ip: string): Promise<boolean> {
  const db = createAdminClient();
  const ahora = Date.now();
  const desde = new Date(ahora - HORA_MS).toISOString();
  const emailHash = hashEmail(secretoMfa(), email);
  const [porEmail, porIp] = await Promise.all([
    db.from("pedidos_recuperacion").select("id", { count: "exact", head: true }).eq("email_hash", emailHash).gte("creado_en", desde),
    db.from("pedidos_recuperacion").select("id", { count: "exact", head: true }).eq("ip", ip).gte("creado_en", desde),
  ]);
  fallar("pedidos por email", porEmail.error);
  fallar("pedidos por IP", porIp.error);
  if (!recuperacionPermitida(porEmail.count ?? 0, porIp.count ?? 0)) return false;

  const { error } = await db
    .from("pedidos_recuperacion")
    .insert({ email_hash: emailHash, ip, creado_en: new Date(ahora).toISOString() });
  fallar("registrar pedido", error);
  const { error: errorLimpieza } = await db
    .from("pedidos_recuperacion")
    .delete()
    .lt("creado_en", new Date(ahora - DIA_MS).toISOString());
  fallar("limpiar pedidos viejos", errorLimpieza);
  return true;
}
