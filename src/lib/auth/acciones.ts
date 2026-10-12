"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { entregarEmailAuth, modoEnvioActual } from "@/lib/email/plataforma";
import { plantillaCodigoLogin, plantillaRecuperacion } from "@/lib/email/plantillas-auth";
import { getClientIp } from "@/lib/turnos/ip";
import {
  areaDelRequest,
  marcaEmailDelArea,
  perfilPermitido,
  remitenteDelArea,
  rutaEn,
  urlDelArea,
  type Area,
} from "./area";
import { normalizarCodigo } from "./codigos";
import { COOKIE_MFA, firmarMfa } from "./cookie-mfa";
import { DURACION_COOKIE_S, opcionesCookieAuth, protocoloPlataforma } from "./cookies";
import { COOKIE_DISPOSITIVO } from "./dispositivo";
import { normalizarEmail, validarNuevaContrasena } from "./recuperacion";
import { RUTAS_AUTH } from "./rutas";
import { secretoMfa } from "./secreto";
import {
  comprobarCodigo,
  crearCodigo,
  dispositivoValido,
  loginBloqueado,
  perfilDe,
  recordarDispositivo,
  registrarIntentoLogin,
  registrarPedidoRecuperacion,
  revocarDispositivos,
} from "./servicio";
import { sesionActual } from "./sesion";

/*
 * Server actions del login, compartidas por el panel del cliente (<slug>.<dominio>/admin)
 * y el master (app.<dominio>). Cada una deduce el área del host. Los mensajes viajan como
 * claves (?error=credenciales) que traduce mensajes.ts.
 */

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>;
type AlmacenCookies = Awaited<ReturnType<typeof cookies>>;
type ResultadoEnvio = "ok" | "no_configurado" | "espera" | "limite" | "envio_fallo";

/** Redirige a una pantalla del área. Sin área conocida, a la del panel del cliente. */
function ir(area: Area | null, ruta: string, params?: Record<string, string>): never {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  redirect(`${rutaEn(area, ruta)}${query}`);
}

/** session_id del access token recién emitido (las cookies nuevas no se leen en este request). */
async function sessionIdDelToken(supabase: ClienteSupabase, accessToken: string): Promise<string> {
  const { data, error } = await supabase.auth.getClaims(accessToken);
  if (error || !data) throw new Error("No se pudo leer la sesión recién creada");
  return data.claims.session_id;
}

/** Segundo factor cumplido: cookie mfa firmada sobre el usuario y el session_id. */
function marcarVerificada(almacen: AlmacenCookies, userId: string, sessionId: string): void {
  almacen.set(
    COOKIE_MFA,
    firmarMfa(secretoMfa(), userId, sessionId),
    opcionesCookieAuth(protocoloPlataforma(), DURACION_COOKIE_S),
  );
}

async function enviarCodigo(area: Area, userId: string, email: string): Promise<ResultadoEnvio> {
  if (modoEnvioActual() === "bloqueado") return "no_configurado";
  const nuevo = await crearCodigo(userId);
  if (!nuevo.ok) return nuevo.motivo;
  try {
    await entregarEmailAuth({
      para: email,
      email: plantillaCodigoLogin(marcaEmailDelArea(area), nuevo.codigo),
      remitente: remitenteDelArea(area),
      avisoConsola: `[MFA dev] código para ${email}: ${nuevo.codigo}`,
    });
    return "ok";
  } catch (e) {
    console.error("No se pudo enviar el código de login:", e);
    return "envio_fallo";
  }
}

/** Paso 1: email y contraseña. Después, dispositivo recordado o código por email. */
export async function iniciarSesion(formData: FormData) {
  const area = await areaDelRequest();
  if (!area) ir(null, RUTAS_AUTH.login, { error: "sitio" });

  const email = String(formData.get("email") ?? "").trim();
  // Límite propio antes de llamar a Supabase: el mismo mensaje exista o no la cuenta.
  const ip = await getClientIp();
  if (await loginBloqueado(email, ip)) ir(area, RUTAS_AUTH.login, { error: "demasiados_intentos" });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: String(formData.get("password") ?? ""),
  });
  const { user, session } = data;
  if (error || !user || !session) {
    await registrarIntentoLogin(email, ip, false);
    ir(area, RUTAS_AUTH.login, { error: "credenciales" });
  }

  // La cuenta tiene que ser de este sitio (o del master): si no, el mismo error que una contraseña mala.
  if (!perfilPermitido(await perfilDe(user.id), area)) {
    await registrarIntentoLogin(email, ip, false);
    await supabase.auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.login, { error: "credenciales" });
  }
  await registrarIntentoLogin(email, ip, true);

  const almacen = await cookies();
  const sessionId = await sessionIdDelToken(supabase, session.access_token);

  // Dispositivo recordado vigente: ya es el segundo factor.
  const token = almacen.get(COOKIE_DISPOSITIVO)?.value;
  if (token && (await dispositivoValido(user.id, token))) {
    marcarVerificada(almacen, user.id, sessionId);
    ir(area, "/");
  }

  const envio = await enviarCodigo(area, user.id, user.email ?? email);
  if (envio === "no_configurado") {
    // Sin forma de mandar el código no se entra: nunca se saltea el segundo factor.
    await supabase.auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.login, { error: "envio_no_configurado" });
  }
  ir(area, RUTAS_AUTH.verificar, envio === "ok" ? { info: "codigo_enviado" } : { error: envio });
}

/** Paso 2: el código. Opcionalmente, recordar el dispositivo por 30 días. */
export async function verificarCodigo(formData: FormData) {
  const area = await areaDelRequest();
  if (!area) ir(null, RUTAS_AUTH.login, { error: "sitio" });
  const sesion = await sesionActual();
  if (!sesion) ir(area, RUTAS_AUTH.login);
  if (!perfilPermitido(await perfilDe(sesion.userId), area)) {
    await (await createClient()).auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.login, { error: "credenciales" });
  }

  const codigo = normalizarCodigo(String(formData.get("codigo") ?? ""));
  if (!codigo) ir(area, RUTAS_AUTH.verificar, { error: "formato" });
  const resultado = await comprobarCodigo(sesion.userId, codigo);
  if (resultado !== "ok") ir(area, RUTAS_AUTH.verificar, { error: resultado });

  const almacen = await cookies();
  marcarVerificada(almacen, sesion.userId, sesion.sessionId);
  if (formData.get("recordar") === "on") {
    const token = await recordarDispositivo(sesion.userId, (await headers()).get("user-agent"));
    almacen.set(COOKIE_DISPOSITIVO, token, opcionesCookieAuth(protocoloPlataforma(), DURACION_COOKIE_S));
  }
  ir(area, "/");
}

export async function reenviarCodigo() {
  const area = await areaDelRequest();
  if (!area) ir(null, RUTAS_AUTH.login, { error: "sitio" });
  const sesion = await sesionActual();
  if (!sesion?.email) ir(area, RUTAS_AUTH.login);
  if (!perfilPermitido(await perfilDe(sesion.userId), area)) {
    await (await createClient()).auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.login, { error: "credenciales" });
  }

  const envio = await enviarCodigo(area, sesion.userId, sesion.email);
  if (envio === "no_configurado") {
    await (await createClient()).auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.login, { error: "envio_no_configurado" });
  }
  ir(area, RUTAS_AUTH.verificar, envio === "ok" ? { info: "reenviado" } : { error: envio });
}

/** Cierra la sesión de este navegador. Borra mfa y conserva la cookie del dispositivo recordado. */
export async function cerrarSesion() {
  const area = await areaDelRequest();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(COOKIE_MFA);
  ir(area, RUTAS_AUTH.login);
}

/** Envía el link de recuperación. Responde lo mismo exista o no la cuenta. */
export async function pedirRecuperacion(formData: FormData) {
  const area = await areaDelRequest();
  if (!area) ir(null, RUTAS_AUTH.recuperar, { error: "sitio" });
  const email = normalizarEmail(String(formData.get("email") ?? ""));
  if (!email) ir(area, RUTAS_AUTH.recuperar, { error: "email" });
  if (modoEnvioActual() === "bloqueado") ir(area, RUTAS_AUTH.recuperar, { error: "envio_emails_no_configurado" });

  if (await registrarPedidoRecuperacion(email, await getClientIp())) {
    // Después de responder: la respuesta tarda lo mismo exista o no la cuenta.
    after(() => enviarRecuperacion(area, email));
  }
  ir(area, RUTAS_AUTH.recuperar, { info: "recuperacion_enviada" });
}

async function enviarRecuperacion(area: Area, email: string): Promise<void> {
  try {
    const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email });
    if (error || !data.user) return; // la cuenta no existe: no se avisa
    if (!perfilPermitido(await perfilDe(data.user.id), area)) return; // no es de este sitio
    const query = new URLSearchParams({ token_hash: data.properties.hashed_token });
    const link = `${urlDelArea(area)}${rutaEn(area, RUTAS_AUTH.restablecer)}?${query}`;
    await entregarEmailAuth({
      para: email,
      email: plantillaRecuperacion(marcaEmailDelArea(area), link),
      remitente: remitenteDelArea(area),
      avisoConsola: `[MFA dev] link de recuperación para ${email}: ${link}`,
    });
  } catch (e) {
    console.error("No se pudo enviar la recuperación de contraseña:", e);
  }
}

/**
 * Contraseña nueva desde el link. El token se consume recién acá (no al abrir el link).
 * Después se cierran todas las sesiones y se olvidan los dispositivos recordados.
 */
export async function restablecerContrasena(formData: FormData) {
  const area = await areaDelRequest();
  if (!area) ir(null, RUTAS_AUTH.recuperar, { error: "sitio" });
  const tokenHash = String(formData.get("token_hash") ?? "");
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(tokenHash)) ir(area, RUTAS_AUTH.recuperar, { error: "link" });
  const clave = String(formData.get("password") ?? "");
  const problema = validarNuevaContrasena(clave, String(formData.get("confirmacion") ?? ""));
  if (problema) ir(area, RUTAS_AUTH.restablecer, { token_hash: tokenHash, error: problema });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  const usuario = data.user;
  if (error || !usuario) ir(area, RUTAS_AUTH.recuperar, { error: "link" });
  if (!perfilPermitido(await perfilDe(usuario.id), area)) {
    await supabase.auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.recuperar, { error: "link" });
  }

  const { error: errorClave } = await supabase.auth.updateUser({ password: clave });
  if (errorClave) {
    await supabase.auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.recuperar, { error: "contrasena_rechazada" });
  }

  // Primero se cierran todas las sesiones; los dispositivos se olvidan aunque eso falle.
  const { error: errorSalida } = await supabase.auth.signOut({ scope: "global" });
  await revocarDispositivos(usuario.id);
  (await cookies()).delete(COOKIE_MFA);
  if (errorSalida) {
    console.error("Contraseña cambiada, pero no se pudieron cerrar las sesiones:", errorSalida.message);
    ir(area, RUTAS_AUTH.login, { error: "sesiones_no_cerradas" });
  }
  ir(area, RUTAS_AUTH.login, { info: "contrasena_cambiada" });
}
