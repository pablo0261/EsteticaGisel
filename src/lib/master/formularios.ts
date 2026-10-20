import { normalizarEmail } from "@/lib/auth/recuperacion";
import type { Idioma } from "@/lib/i18n/textos";
import { evaluarPaleta, normalizarHex } from "@/lib/tenant/contraste";
import type { ColoresMarca } from "@/lib/tenant/estilo";
import { esSlugValido } from "@/lib/tenant/host";
import type { Moneda, Modulos, Pais } from "@/lib/tenant/tipos";
import { normalizarWhatsApp } from "@/lib/turnos/whatsapp";
import { LIMITES } from "./limites";
import type { ClaveAviso, ClaveError } from "./mensajes";
import { parsearModulos } from "./modulos";
import { esIdioma, esMoneda, esPais, zonaPermitida } from "./pais";

/**
 * Validación de los formularios del panel master. Corre en el servidor: lo que llega en
 * un FormData es texto no confiable (la vista previa del navegador es solo una ayuda).
 */
export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: ClaveError };

/**
 * Caracteres de control: en un texto de una línea no se permiten. Lo usa también el panel
 * del cliente. Incluye C0, DEL, C1 (U+0080–U+009F), los overrides y aislamientos de bidi
 * (U+202A–U+202E, U+2066–U+2069: pueden dar vuelta lo que se ve) y los separadores de
 * línea y de párrafo de Unicode (U+2028, U+2029).
 */
export const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;
/** En un texto de varias líneas se permiten los saltos de línea (LF y CR) y nada más. */
export const CONTROL_MULTILINEA =
  /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;

function texto(fd: FormData, nombre: string): string {
  const v = fd.get(nombre);
  return typeof v === "string" ? v.trim() : "";
}

// ---------- Datos del cliente y alta ----------

export type DatosCliente = { nombre: string; pais: Pais; idioma: Idioma; zonaHoraria: string; moneda: Moneda };
export type AltaCliente = DatosCliente & { slug: string; modulos: Modulos };

export function parsearDatos(fd: FormData): Resultado<DatosCliente> {
  const nombre = texto(fd, "nombre");
  if (nombre.length < 2 || nombre.length > LIMITES.nombre) return { ok: false, error: "nombre" };
  if (CONTROL.test(nombre)) return { ok: false, error: "texto_invalido" };
  const pais = texto(fd, "pais");
  if (!esPais(pais)) return { ok: false, error: "pais" };
  const idioma = texto(fd, "idioma");
  if (!esIdioma(idioma)) return { ok: false, error: "idioma" };
  const zonaHoraria = texto(fd, "zona_horaria");
  if (!zonaPermitida(pais, zonaHoraria)) return { ok: false, error: "zona" };
  const moneda = texto(fd, "moneda");
  if (!esMoneda(moneda)) return { ok: false, error: "moneda" };
  return { ok: true, valor: { nombre, pais, idioma, zonaHoraria, moneda } };
}

export function parsearAlta(fd: FormData): Resultado<AltaCliente> {
  const slug = texto(fd, "slug").toLowerCase();
  if (!esSlugValido(slug)) return { ok: false, error: "slug_invalido" };
  const datos = parsearDatos(fd);
  if (!datos.ok) return datos;
  return { ok: true, valor: { ...datos.valor, slug, modulos: parsearModulos(fd) } };
}

export function columnasDatos(d: DatosCliente) {
  return { nombre: d.nombre, pais: d.pais, idioma: d.idioma, zona_horaria: d.zonaHoraria, moneda: d.moneda };
}

// ---------- Colores ----------

export type ColoresValidados = { colores: ColoresMarca; avisos: ClaveAviso[] };

export function parsearColores(fd: FormData): Resultado<ColoresValidados> {
  const leer = (campo: string) => normalizarHex(texto(fd, campo));
  const primario = leer("color_primario");
  const secundario = leer("color_secundario");
  const fondo = leer("color_fondo");
  const textoColor = leer("color_texto");
  if (!primario || !secundario || !fondo || !textoColor) return { ok: false, error: "color_invalido" };
  const colores: ColoresMarca = {
    colorPrimario: primario,
    colorSecundario: secundario,
    colorFondo: fondo,
    colorTexto: textoColor,
  };
  const problemas = evaluarPaleta(colores);
  const bloqueo = problemas.find((p) => p.bloquea);
  if (bloqueo) return { ok: false, error: bloqueo.clave === "contraste_texto" ? "contraste_texto" : "contraste_boton" };
  const avisos: ClaveAviso[] = problemas.some((p) => p.clave === "contraste_secundario") ? ["contraste_secundario"] : [];
  return { ok: true, valor: { colores, avisos } };
}

export function columnasColores(c: ColoresMarca) {
  return {
    color_primario: c.colorPrimario,
    color_secundario: c.colorSecundario,
    color_fondo: c.colorFondo,
    color_texto: c.colorTexto,
  };
}

// ---------- Textos y contacto ----------

export type TextosMarca = {
  rubro: string | null;
  tagline: string | null;
  inicioTitulo: string;
  inicioDestacado: string | null;
  inicioTexto: string | null;
  sobreMiTitulo: string | null;
  sobreMiTexto: string | null;
  notaReservas: string | null;
  /** E.164 */
  whatsapp: string | null;
  /** Usuario sin "@" */
  instagram: string | null;
  emailContacto: string | null;
  direccion: string | null;
};

/** "@ana.spa" o "https://instagram.com/ana.spa/" → "ana.spa". null si no es un usuario válido. */
export function normalizarInstagram(entrada: string): string | null {
  const usuario = entrada
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/^@/, "");
  return /^(?!.*\.\.)(?!\.)[A-Za-z0-9._]{1,30}(?<!\.)$/.test(usuario) ? usuario : null;
}

export function parsearTextos(fd: FormData, pais: Pais): Resultado<TextosMarca> {
  const inicioTitulo = texto(fd, "inicio_titulo");
  if (!inicioTitulo || inicioTitulo.length > LIMITES.titulo) return { ok: false, error: "inicio_titulo" };

  if (CONTROL.test(inicioTitulo)) return { ok: false, error: "texto_invalido" };

  let largo = false;
  let control = false;
  const opcional = (nombre: string, maximo: number, multilinea = false): string | null => {
    const v = texto(fd, nombre);
    if (v.length > maximo) largo = true;
    if ((multilinea ? CONTROL_MULTILINEA : CONTROL).test(v)) control = true;
    return v || null;
  };
  const rubro = opcional("rubro", LIMITES.rubro);
  const tagline = opcional("tagline", LIMITES.tagline);
  const inicioDestacado = opcional("inicio_destacado", LIMITES.titulo);
  const inicioTexto = opcional("inicio_texto", LIMITES.texto, true);
  const sobreMiTitulo = opcional("sobre_mi_titulo", LIMITES.titulo);
  const sobreMiTexto = opcional("sobre_mi_texto", LIMITES.texto, true);
  const notaReservas = opcional("nota_reservas", LIMITES.nota, true);
  const direccion = opcional("direccion", LIMITES.direccion);
  if (control) return { ok: false, error: "texto_invalido" };
  if (largo) return { ok: false, error: "texto_largo" };

  const whatsappCrudo = texto(fd, "whatsapp");
  const whatsapp = whatsappCrudo ? normalizarWhatsApp(whatsappCrudo, pais) : null;
  const prefijo = pais === "AR" ? "+54" : "+55";
  if (whatsappCrudo && (!whatsapp || !whatsapp.startsWith(prefijo))) return { ok: false, error: "whatsapp" };

  const instagramCrudo = texto(fd, "instagram");
  const instagram = instagramCrudo ? normalizarInstagram(instagramCrudo) : null;
  if (instagramCrudo && !instagram) return { ok: false, error: "instagram" };

  const emailCrudo = texto(fd, "email_contacto");
  const emailContacto = emailCrudo ? normalizarEmail(emailCrudo) : null;
  if (emailCrudo && !emailContacto) return { ok: false, error: "email_contacto" };

  return {
    ok: true,
    valor: {
      rubro,
      tagline,
      inicioTitulo,
      inicioDestacado,
      inicioTexto,
      sobreMiTitulo,
      sobreMiTexto,
      notaReservas,
      whatsapp,
      instagram,
      emailContacto,
      direccion,
    },
  };
}

export function columnasTextos(t: TextosMarca) {
  return {
    rubro: t.rubro,
    tagline: t.tagline,
    inicio_titulo: t.inicioTitulo,
    inicio_destacado: t.inicioDestacado,
    inicio_texto: t.inicioTexto,
    sobre_mi_titulo: t.sobreMiTitulo,
    sobre_mi_texto: t.sobreMiTexto,
    nota_reservas: t.notaReservas,
    whatsapp: t.whatsapp,
    instagram: t.instagram,
    email_contacto: t.emailContacto,
    direccion: t.direccion,
  };
}

// ---------- Credenciales ----------

/** contrasena null = mantener la guardada. */
export type FormGmail = { usuario: string; contrasena: string | null; remitente: string | null };

export function parsearGmail(fd: FormData): Resultado<FormGmail> {
  const usuario = normalizarEmail(texto(fd, "smtp_usuario"));
  if (!usuario) return { ok: false, error: "gmail_usuario" };
  // Google muestra la contraseña de aplicación en 4 grupos de 4 letras.
  const contrasena = texto(fd, "smtp_password").replace(/\s+/g, "");
  if (contrasena && !/^[a-z]{16}$/i.test(contrasena)) return { ok: false, error: "gmail_contrasena" };
  const remitente = texto(fd, "smtp_nombre_remitente");
  if (remitente.length > LIMITES.remitente || CONTROL.test(remitente)) return { ok: false, error: "gmail_remitente" };
  return { ok: true, valor: { usuario, contrasena: contrasena || null, remitente: remitente || null } };
}

const CLAVE_MP = /^(APP_USR|TEST)-[A-Za-z0-9_-]{8,300}$/;
const SECRETO_WEBHOOK = /^[A-Za-z0-9]{16,128}$/;

/** null = mantener lo guardado. */
export type FormMp = { accessToken: string | null; publicKey: string | null; webhookSecret: string | null };

export type ErrorMp = "mp_access_token" | "mp_public_key" | "mp_webhook_secret";

export function parsearMp(fd: FormData): { ok: true; valor: FormMp } | { ok: false; error: ErrorMp } {
  const accessToken = texto(fd, "mp_access_token");
  if (accessToken && !CLAVE_MP.test(accessToken)) return { ok: false, error: "mp_access_token" };
  const publicKey = texto(fd, "mp_public_key");
  if (publicKey && !CLAVE_MP.test(publicKey)) return { ok: false, error: "mp_public_key" };
  const webhookSecret = texto(fd, "mp_webhook_secret");
  if (webhookSecret && !SECRETO_WEBHOOK.test(webhookSecret)) return { ok: false, error: "mp_webhook_secret" };
  return {
    ok: true,
    valor: { accessToken: accessToken || null, publicKey: publicKey || null, webhookSecret: webhookSecret || null },
  };
}
