import "server-only";
import { randomBytes } from "node:crypto";
import { masterVerificado } from "@/lib/auth/master";
import { RUTAS_AUTH, rutaDelArea } from "@/lib/auth/rutas";
import { perfilDe, revocarDispositivos } from "@/lib/auth/servicio";
import { marcaEmailDeTenant } from "@/lib/email/layout-marca";
import { entregarEmailAuth, modoEnvioActual } from "@/lib/email/plataforma";
import { plantillaInvitacion } from "@/lib/email/plantillas-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tenant } from "@/lib/tenant/tipos";
import { urlDelTenant } from "@/lib/tenant/urls";

/**
 * Usuario del panel de un cliente (spec 6.6). El master carga el email; el usuario define
 * su contraseña con un link (generateLink tipo recovery, el mismo flujo de
 * /admin/restablecer). El master nunca conoce ni define contraseñas de clientes.
 * Hoy es un usuario por cliente; la lista y las acciones ya trabajan con varios.
 */
export const MAX_USUARIOS_POR_CLIENTE = 1;
const POR_PAGINA = 200;

export type UsuarioCliente = { userId: string; email: string | null; ultimoIngreso: string | null };

export type ResultadoInvitacion =
  | "ok"
  | "ya_es_usuario"
  | "limite_usuarios"
  | "usuario_de_otro"
  | "usuario_master"
  | "usuario_sin_cliente"
  | "usuario_sin_email"
  | "cliente_suspendido"
  | "envio_emails_no_configurado";

export type ResultadoReenvio =
  | "ok"
  | "usuario_no_encontrado"
  | "envio_fallo"
  | "cliente_suspendido"
  | "envio_emails_no_configurado";

function fallar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`);
}

export async function usuariosDelCliente(tenantId: string): Promise<UsuarioCliente[]> {
  await masterVerificado();
  const db = createAdminClient();
  const { data, error } = await db.from("perfiles").select("user_id").eq("rol", "cliente").eq("tenant_id", tenantId);
  fallar("usuarios del cliente", error);
  return Promise.all(
    (data ?? []).map(async ({ user_id }: { user_id: string }) => {
      const { data: datos, error: errorUsuario } = await db.auth.admin.getUserById(user_id);
      fallar("usuario", errorUsuario);
      return { userId: user_id, email: datos.user?.email ?? null, ultimoIngreso: datos.user?.last_sign_in_at ?? null };
    }),
  );
}

/** El link lleva al panel del cliente: con el cliente suspendido no sirve; sin envío posible, tampoco. */
function bloqueoDeEnvio(tenant: Tenant): "cliente_suspendido" | "envio_emails_no_configurado" | null {
  if (tenant.estado !== "activo") return "cliente_suspendido";
  if (modoEnvioActual() === "bloqueado") return "envio_emails_no_configurado";
  return null;
}

/** Genera el link de contraseña y lo envía con la marca del cliente. false si no se pudo. */
async function enviarLinkContrasena(tenant: Tenant, email: string): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email });
    if (error) throw new Error(error.message);
    const base = urlDelTenant(tenant.slug);
    const query = new URLSearchParams({ token_hash: data.properties.hashed_token });
    const link = `${base}${rutaDelArea("tenant", RUTAS_AUTH.restablecer)}?${query}`;
    await entregarEmailAuth({
      para: email,
      email: plantillaInvitacion(marcaEmailDeTenant(tenant, base), link),
      remitente: tenant.nombre,
      avisoConsola: `[MFA dev] link de invitación para ${email}: ${link}`,
    });
    return true;
  } catch (e) {
    console.error("No se pudo enviar el link de contraseña:", e);
    return false;
  }
}

/** Id del usuario de Auth con ese email (paginando: la API admin no filtra por email). */
async function buscarUsuarioPorEmail(email: string): Promise<string | null> {
  const db = createAdminClient();
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: POR_PAGINA });
    fallar("buscar usuario", error);
    const usuario = data.users.find((u) => u.email?.toLowerCase() === email);
    if (usuario) return usuario.id;
    if (data.users.length < POR_PAGINA) return null;
  }
}

/** El email ya tiene cuenta: de quién es. Una cuenta sin perfil se rechaza (alguien puede conocer su contraseña). */
async function motivoEmailOcupado(
  tenantId: string,
  email: string,
): Promise<"ya_es_usuario" | "usuario_de_otro" | "usuario_master" | "usuario_sin_cliente"> {
  const userId = await buscarUsuarioPorEmail(email);
  if (!userId) throw new Error("Supabase dice que el email existe, pero no se encontró el usuario");
  const perfil = await perfilDe(userId);
  if (!perfil) return "usuario_sin_cliente";
  if (perfil.rol === "master") return "usuario_master";
  return perfil.tenant_id === tenantId ? "ya_es_usuario" : "usuario_de_otro";
}

/** email ya normalizado (normalizarEmail). */
export async function invitarUsuarioCliente(tenant: Tenant, email: string): Promise<ResultadoInvitacion> {
  await masterVerificado();
  const bloqueo = bloqueoDeEnvio(tenant);
  if (bloqueo) return bloqueo;

  const actuales = await usuariosDelCliente(tenant.id);
  if (actuales.some((u) => u.email?.toLowerCase() === email)) return "ya_es_usuario";
  if (actuales.length >= MAX_USUARIOS_POR_CLIENTE) return "limite_usuarios";

  const db = createAdminClient();
  // Contraseña aleatoria que nadie conoce: el usuario define la suya con el link.
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    password: randomBytes(32).toString("base64url"),
  });
  if (error) {
    if (error.code === "email_exists") return motivoEmailOcupado(tenant.id, email);
    throw new Error(`crear usuario: ${error.message}`);
  }
  const userId = data.user.id;
  const { error: errorPerfil } = await db.from("perfiles").insert({ user_id: userId, rol: "cliente", tenant_id: tenant.id });
  if (errorPerfil) {
    // Compensación: un usuario sin perfil no sirve y bloquearía ese email.
    const { error: errorBorrado } = await db.auth.admin.deleteUser(userId);
    if (errorBorrado) console.error(`No se pudo borrar el usuario ${userId} sin perfil:`, errorBorrado.message);
    throw new Error(`perfil del usuario: ${errorPerfil.message}`);
  }
  return (await enviarLinkContrasena(tenant, email)) ? "ok" : "usuario_sin_email";
}

export async function reenviarLinkContrasena(tenant: Tenant, userId: string): Promise<ResultadoReenvio> {
  await masterVerificado();
  const bloqueo = bloqueoDeEnvio(tenant);
  if (bloqueo) return bloqueo;
  const usuario = (await usuariosDelCliente(tenant.id)).find((u) => u.userId === userId);
  if (!usuario?.email) return "usuario_no_encontrado";
  return (await enviarLinkContrasena(tenant, usuario.email)) ? "ok" : "envio_fallo";
}

/** Olvida los dispositivos recordados del usuario: su próximo ingreso pide el código. */
export async function revocarDispositivosDeUsuario(
  tenantId: string,
  userId: string,
): Promise<"ok" | "usuario_no_encontrado"> {
  await masterVerificado();
  const { data, error } = await createAdminClient()
    .from("perfiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  fallar("perfil", error);
  if (!data) return "usuario_no_encontrado";
  await revocarDispositivos(userId);
  return "ok";
}
