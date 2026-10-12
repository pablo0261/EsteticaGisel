"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { masterVerificado } from "@/lib/auth/master";
import { normalizarEmail } from "@/lib/auth/recuperacion";
import { claveCredencialesConfigurada } from "@/lib/cripto/clave";
import { esTipoImagen, validarImagen, validarTamano } from "@/lib/storage/imagenes";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { esSlugValido } from "@/lib/tenant/host";
import type { Tenant } from "@/lib/tenant/tipos";
import { guardarMercadoPago, probarYGuardarGmail } from "./credenciales";
import { parsearAlta, parsearColores, parsearDatos, parsearGmail, parsearMp, parsearTextos } from "./formularios";
import type { ClaveAviso, ClaveError, ClaveInfo } from "./mensajes";
import { parsearModulos } from "./modulos";
import {
  actualizarColores,
  actualizarDatos,
  actualizarEstado,
  actualizarModulos,
  actualizarTextos,
  crearCliente,
  guardarImagen,
} from "./servicio";
import { invitarUsuarioCliente, reenviarLinkContrasena, revocarDispositivosDeUsuario } from "./usuarios";

/*
 * Server actions del panel master (app.<dominio>). Cada una verifica al master antes de
 * leer el formulario, valida todo en el servidor y redirige con una clave de mensajes.ts.
 * El cliente a editar sale del campo oculto "slug" (cualquier estado: el master edita
 * también los suspendidos).
 */

type Mensaje = { error: ClaveError } | { ok: ClaveInfo; aviso?: ClaveAviso };

function ir(ruta: string, mensaje?: Mensaje): never {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(mensaje ?? {})) if (valor) params.set(clave, valor);
  const query = params.toString();
  redirect(query ? `${ruta}?${query}` : ruta);
}

function rutaCliente(slug: string, pestana?: string): string {
  return `/clientes/${slug}${pestana ? `/${pestana}` : ""}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function clienteDelFormulario(formData: FormData): Promise<Tenant> {
  await masterVerificado();
  const slug = String(formData.get("slug") ?? "");
  const tenant = esSlugValido(slug) ? await getTenantPorSlug(slug) : null;
  if (!tenant) ir("/", { error: "cliente" });
  return tenant;
}

/** Los cambios de datos, estado, módulos y marca se ven en el sitio público. */
function sitioCambio(): void {
  revalidatePath("/sitio/[tenant]", "layout");
}

export async function altaCliente(formData: FormData) {
  await masterVerificado();
  const alta = parsearAlta(formData);
  if (!alta.ok) ir("/nuevo", { error: alta.error });
  const creado = await crearCliente(alta.valor);
  if (!creado.ok) ir("/nuevo", { error: creado.error });
  ir(rutaCliente(alta.valor.slug), { ok: "creado" });
}

export async function editarDatos(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug);
  const datos = parsearDatos(formData);
  if (!datos.ok) ir(volver, { error: datos.error });
  await actualizarDatos(tenant.id, datos.valor);
  sitioCambio();
  ir(volver, { ok: "guardado" });
}

export async function cambiarEstado(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug);
  const estado = formData.get("estado");
  if (estado !== "activo" && estado !== "suspendido") ir(volver, { error: "error" });
  await actualizarEstado(tenant.id, estado);
  sitioCambio();
  ir(volver, { ok: estado === "activo" ? "reactivado" : "suspendido" });
}

export async function editarModulos(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  await actualizarModulos(tenant.id, parsearModulos(formData));
  sitioCambio();
  ir(rutaCliente(tenant.slug, "modulos"), { ok: "guardado" });
}

export async function editarColores(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "marca");
  const colores = parsearColores(formData);
  if (!colores.ok) ir(volver, { error: colores.error });
  await actualizarColores(tenant.id, colores.valor.colores);
  sitioCambio();
  ir(volver, { ok: "guardado", aviso: colores.valor.avisos[0] });
}

export async function subirImagenMarca(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "marca");
  const tipo = String(formData.get("tipo") ?? "");
  if (!esTipoImagen(tipo)) ir(volver, { error: "imagen_destino" });
  const archivo = formData.get("archivo");
  if (!(archivo instanceof Blob)) ir(volver, { error: "imagen_vacia" });
  // El tamaño se mira antes de leer el contenido.
  const problemaTamano = validarTamano(archivo.size);
  if (problemaTamano) ir(volver, { error: problemaTamano });
  const bytes = Buffer.from(await archivo.arrayBuffer());
  // El formato (y con él el Content-Type y la extensión) sale de los bytes, nunca de archivo.type.
  const imagen = validarImagen(bytes);
  if (!imagen.ok) ir(volver, { error: imagen.error });
  await guardarImagen(tenant, tipo, bytes, imagen.formato);
  sitioCambio();
  ir(volver, { ok: "imagen_guardada" });
}

export async function editarTextos(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "textos");
  const textos = parsearTextos(formData, tenant.pais);
  if (!textos.ok) ir(volver, { error: textos.error });
  await actualizarTextos(tenant.id, textos.valor);
  sitioCambio();
  ir(volver, { ok: "guardado" });
}

export async function invitarUsuario(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "usuario");
  const email = normalizarEmail(String(formData.get("email") ?? ""));
  if (!email) ir(volver, { error: "email" });
  const resultado = await invitarUsuarioCliente(tenant, email);
  ir(volver, resultado === "ok" ? { ok: "usuario_creado" } : { error: resultado });
}

function userIdDelFormulario(formData: FormData): string | null {
  const userId = String(formData.get("user_id") ?? "");
  return UUID.test(userId) ? userId : null;
}

export async function reenviarLinkUsuario(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "usuario");
  const userId = userIdDelFormulario(formData);
  if (!userId) ir(volver, { error: "usuario_no_encontrado" });
  const resultado = await reenviarLinkContrasena(tenant, userId);
  ir(volver, resultado === "ok" ? { ok: "link_reenviado" } : { error: resultado });
}

export async function revocarDispositivosUsuario(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "usuario");
  const userId = userIdDelFormulario(formData);
  if (!userId) ir(volver, { error: "usuario_no_encontrado" });
  const resultado = await revocarDispositivosDeUsuario(tenant.id, userId);
  ir(volver, resultado === "ok" ? { ok: "dispositivos_revocados" } : { error: resultado });
}

export async function configurarGmail(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "credenciales");
  if (!claveCredencialesConfigurada()) ir(volver, { error: "clave_credenciales" });
  const form = parsearGmail(formData);
  if (!form.ok) ir(volver, { error: form.error });
  const resultado = await probarYGuardarGmail(tenant.id, form.valor);
  ir(volver, resultado.ok ? { ok: "gmail_ok" } : { error: resultado.error });
}

export async function configurarMercadoPago(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "credenciales");
  if (!claveCredencialesConfigurada()) ir(volver, { error: "clave_credenciales" });
  const form = parsearMp(formData);
  if (!form.ok) ir(volver, { error: form.error });
  const resultado = await guardarMercadoPago(tenant.id, form.valor);
  ir(volver, resultado === "ok" ? { ok: "mp_guardado" } : { error: resultado });
}
