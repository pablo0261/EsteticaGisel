// Prueba de punta a punta del panel del cliente (etapa C2) contra el servidor de desarrollo
// (puerto 3000). Los formularios del panel se envían como un navegador sin JavaScript (ver
// e2e-login.mjs): GET de la página, campo oculto $ACTION_ID_… y POST multipart; Next responde
// 303 con Location. La disponibilidad y la reserva del sitio son server actions que llama un
// componente de cliente: se invocan como lo hace React en el navegador (cabecera Next-Action
// con el id que Next anota en .next/dev/server/app/<ruta>/page/server-reference-manifest.json).
// Crea dos clientes temporales con crear_tenant y un usuario para cada uno:
// - Brasil (portugués, BRL, todos los módulos menos cursos): entra a su panel con el código del
//   log, edita servicios (precio con centavos), horarios y reglas, textos, testimonios,
//   preguntas y la galería, reserva en el sitio sin pago anticipado (y los frenos al abuso: un
//   solo email, el límite de 3 turnos futuros por email y dos reservas simultáneas del mismo
//   horario), apaga módulos y lo suspende.
// - Argentina (español, ARS, solo turnos): precios en pesos enteros, modo de pago con seña y
//   pago total (sin Mercado Pago conectado la reserva se rechaza sin crear turnos) y las
//   secciones de módulos apagados.
// Al final borra todo (también las imágenes del bucket) y comprueba que no quede nada.
// No imprime códigos, links ni tokens (solo host y path).
// El servidor tiene que correr con CABECERA_IP_CONFIABLE=x-real-ip y sin la cuenta de Gmail de
// la plataforma (los códigos salen en el log, "[MFA dev]"). Correrla desde la raíz del repo.
// Uso: node --env-file=.env.local scripts/e2e-cliente.mjs <log>
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";

const [rutaLog] = process.argv.slice(2);
if (!rutaLog) {
  console.error("Uso: node --env-file=.env.local scripts/e2e-cliente.mjs <log>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const secretoMfa = process.env.MFA_SECRET;
if (!url || !secret || !secretoMfa) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY o MFA_SECRET.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const sufijo = Date.now().toString(36);
const COLORES = { primario: "#3d5a80", secundario: "#5c677d", fondo: "#f4f5f7", texto: "#1f2933" };
const PREFIJO_PUBLICO = `${url.replace(/\/+$/, "")}/storage/v1/object/public/sitios/`;
/** PNG de 1×1. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/** Clientes de prueba. id y userId se completan al crearlos. */
const BR = {
  slug: `c2-test-${sufijo}`,
  nombre: "Cliente C2",
  pais: "BR",
  idioma: "pt",
  zona: "America/Sao_Paulo",
  moneda: "BRL",
  modulos: { turnos: true, sobreMi: true, testimonios: true, galeria: true, faq: true, whatsapp: true },
  whatsapp: "+5511912345678",
  email: `e2e-c2-cliente-${sufijo}@example.com`,
  clave: randomBytes(18).toString("base64url"),
  id: null,
  userId: null,
};
const AR = {
  slug: `c2-test-ar-${sufijo}`,
  nombre: "Cliente AR",
  pais: "AR",
  idioma: "es",
  zona: "America/Argentina/Buenos_Aires",
  moneda: "ARS",
  modulos: { turnos: true },
  whatsapp: null,
  email: `e2e-c2-ar-${sufijo}@example.com`,
  clave: randomBytes(18).toString("base64url"),
  id: null,
  userId: null,
};
const CLIENTES = [BR, AR];
const host = (c) => `${c.slug}.localhost:3000`;
const emailReserva = `e2e-c2-reserva-${sufijo}@example.com`;

let fallas = 0;
function verificar(ok, descripcion, detalle) {
  console.log(`${ok ? "✓" : "✗"} ${descripcion}`);
  if (!ok) {
    fallas++;
    if (detalle) console.log(`    (${detalle})`);
  }
}

async function ok(promesa, que) {
  const { data, error } = await promesa;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
}

function destino(r) {
  if (!r.location) return "";
  const u = new URL(r.location, "http://base");
  return `${u.pathname}${u.search}`;
}
const resumen = (r) => `${r.status} ${destino(r)}`;

function idDeAccion(html, formId) {
  const inicio = html.indexOf(`id="${formId}"`);
  if (inicio < 0) throw new Error(`la página no tiene el formulario #${formId}`);
  const m = html.slice(inicio, html.indexOf("</form>", inicio)).match(/name="(\$ACTION_ID_[0-9a-zA-Z]+)"/);
  if (!m) throw new Error(`#${formId} no tiene el campo $ACTION_ID_`);
  return m[1];
}

/** Id de una server action en el manifiesto que escribe el servidor de desarrollo al compilar la página. */
function idDeAccionCompilada(rutaApp, nombre) {
  const archivo = join(".next", "dev", "server", "app", ...rutaApp.split("/"), "page", "server-reference-manifest.json");
  const manifiesto = JSON.parse(readFileSync(archivo, "utf8"));
  const id = Object.keys(manifiesto.node ?? {}).find((k) => manifiesto.node[k].exportedName === nombre);
  if (!id) throw new Error(`no encontré la action ${nombre} en ${archivo}`);
  return id;
}

/**
 * Valor que devolvió una server action, del payload de React: la fila 0 trae "a", que es el
 * valor o una referencia "$@<fila>" a la fila donde está.
 */
function valorDeAccion(texto) {
  const filas = new Map();
  for (const linea of texto.split("\n")) {
    const m = linea.match(/^([0-9a-f]+):(.*)$/);
    if (!m) continue;
    try {
      filas.set(m[1], JSON.parse(m[2]));
    } catch {
      // filas que no son JSON (textos, referencias a módulos)
    }
  }
  const raiz = filas.get("0");
  if (!raiz || typeof raiz !== "object" || !("a" in raiz)) return undefined;
  return typeof raiz.a === "string" && raiz.a.startsWith("$@") ? filas.get(raiz.a.slice(2)) : raiz.a;
}

let siguienteIp = 20;
const ipsUsadas = [];
function ipFalsa() {
  const ip = `198.51.100.${siguienteIp++}`;
  ipsUsadas.push(ip);
  return ip;
}

class Navegador {
  constructor(host) {
    this.host = host;
    this.ip = ipFalsa();
    this.cookies = new Map();
  }

  guardar(setCookie) {
    for (const linea of setCookie) {
      const [par, ...atributos] = linea.split(";");
      const i = par.indexOf("=");
      const nombre = par.slice(0, i).trim();
      const valor = par.slice(i + 1).trim();
      const vencida = atributos.some((a) => {
        const [k, v] = a.trim().split("=");
        if (/^max-age$/i.test(k)) return Number(v) <= 0;
        if (/^expires$/i.test(k)) return new Date(v).getTime() <= Date.now();
        return false;
      });
      if (!valor || vencida) this.cookies.delete(nombre);
      else this.cookies.set(nombre, valor);
    }
  }

  pedir(metodo, ruta, cuerpo, extra = {}) {
    return new Promise((resolve, reject) => {
      const headers = { host: this.host, "x-real-ip": this.ip, ...extra };
      const cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookie) headers.cookie = cookie;
      if (cuerpo) {
        headers["content-type"] = cuerpo.tipo;
        headers["content-length"] = cuerpo.datos.length;
        headers.origin = `http://${this.host}`;
      }
      const req = request({ hostname: "127.0.0.1", port: 3000, method: metodo, path: ruta, headers }, (res) => {
        const partes = [];
        res.on("data", (c) => partes.push(c));
        res.on("end", () => {
          this.guardar(res.headers["set-cookie"] ?? []);
          resolve({ status: res.statusCode, location: res.headers.location ?? "", html: Buffer.concat(partes).toString("utf8") });
        });
      });
      req.on("error", reject);
      if (cuerpo) req.write(cuerpo.datos);
      req.end();
    });
  }

  get(ruta) {
    return this.pedir("GET", ruta);
  }

  /** Envía el formulario con ese id como un navegador sin JavaScript. Los valores pueden ser File. */
  async enviar(ruta, html, formId, campos) {
    const fd = new FormData();
    fd.append(idDeAccion(html, formId), "");
    for (const [k, v] of Object.entries(campos)) fd.append(k, v);
    const req = new Request("http://localhost/", { method: "POST", body: fd });
    const datos = Buffer.from(await req.arrayBuffer());
    return this.pedir("POST", ruta, { tipo: req.headers.get("content-type"), datos });
  }

  /**
   * Llama a una server action como el cliente de React (encodeReply): argumentos JSON en un
   * cuerpo text/plain; un FormData, en multipart con sus campos con el prefijo "_1_" y, al
   * final, la raíz ["$K1"] en el campo "0".
   */
  async accion(ruta, idAccion, args) {
    let cuerpo;
    if (args instanceof FormData) {
      // La raíz va al final, como en React: el servidor (busboy) la resuelve al recibirla, y
      // para entonces los campos del FormData tienen que haber llegado.
      const fd = new FormData();
      for (const [k, v] of args) fd.append(`_1_${k}`, v);
      fd.append("0", JSON.stringify(["$K1"]));
      const req = new Request("http://localhost/", { method: "POST", body: fd });
      cuerpo = { tipo: req.headers.get("content-type"), datos: Buffer.from(await req.arrayBuffer()) };
    } else {
      cuerpo = { tipo: "text/plain;charset=UTF-8", datos: Buffer.from(JSON.stringify(args), "utf8") };
    }
    const r = await this.pedir("POST", ruta, cuerpo, { "next-action": idAccion, accept: "text/x-component" });
    return { ...r, valor: valorDeAccion(r.html) };
  }
}

const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const reCodigo = (de) => new RegExp(`\\[MFA dev\\] c.digo para ${escaparRegex(de)}: (\\d{6})`, "g");
const reRecuperacion = (de) => new RegExp(`\\[MFA dev\\] link de recuperaci.n para ${escaparRegex(de)}: (\\S+)`, "g");
const ocurrencias = (re) => [...readFileSync(rutaLog, "utf8").matchAll(re)].map((m) => m[1]);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarNueva(re, previas) {
  for (let i = 0; i < 40; i++) {
    const todas = ocurrencias(re);
    if (todas.length > previas) return todas[todas.length - 1];
    await dormir(500);
  }
  throw new Error(`no apareció en el log: ${re}`);
}

/** "YYYY-MM-DD" en la zona horaria del cliente. */
const fechaEn = (zona, ms) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);

// ---------- Datos ----------
const leerTenant = async (c) => (await admin.from("tenants").select("*").eq("slug", c.slug).maybeSingle()).data;
const filas = async (c, tabla) => (await admin.from(tabla).select("*").eq("tenant_id", c.id)).data ?? [];
const una = async (c, tabla) => (await admin.from(tabla).select("*").eq("tenant_id", c.id).maybeSingle()).data;

async function listarObjetos(id) {
  if (!id) return [];
  const { data, error } = await admin.storage.from("sitios").list(id, { limit: 100 });
  if (error) throw new Error(`listar imágenes: ${error.message}`);
  return data.map((o) => o.name);
}

/** Id del usuario de Auth con ese email (listUsers paginado), o null. */
async function idDeUsuarioPorEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const usuario = data.users.find((u) => u.email === email);
    if (usuario) return usuario.id;
    if (data.users.length < 200) return null;
  }
}

async function preparar(c) {
  c.id = await ok(
    admin.rpc("crear_tenant", {
      p_slug: c.slug,
      p_nombre: c.nombre,
      p_pais: c.pais,
      p_idioma: c.idioma,
      p_zona_horaria: c.zona,
      p_moneda: c.moneda,
      p_modulos: c.modulos,
      p_colores: COLORES,
    }),
    `crear_tenant ${c.pais}`,
  );
  if (c.whatsapp) await ok(admin.from("tenant_marca").update({ whatsapp: c.whatsapp }).eq("tenant_id", c.id), "whatsapp");
  const creado = await ok(
    admin.auth.admin.createUser({ email: c.email, password: c.clave, email_confirm: true }),
    `usuario del cliente ${c.pais}`,
  );
  c.userId = creado.user.id;
  await ok(admin.from("perfiles").insert({ user_id: c.userId, rol: "cliente", tenant_id: c.id }), `perfil del cliente ${c.pais}`);
}

/** Entra al panel del cliente con su contraseña y el código del log. Devuelve el navegador con sesión. */
async function ingresar(c, textos) {
  const N = new Navegador(host(c));
  let pagina = await N.get("/admin/login");
  verificar(
    pagina.status === 200 && pagina.html.includes(`lang="${textos.lang}"`) && pagina.html.includes(textos.olvido),
    `la pantalla de ingreso está en ${textos.idioma}`,
    String(pagina.status),
  );
  const codigosAntes = ocurrencias(reCodigo(c.email)).length;
  let r = await N.enviar("/admin/login", pagina.html, "form-login", { email: c.email, password: c.clave });
  verificar(destino(r) === "/admin/verificar?info=codigo_enviado", "pide el código", resumen(r));
  const codigo = await esperarNueva(reCodigo(c.email), codigosAntes);
  pagina = await N.get("/admin/verificar?info=codigo_enviado");
  verificar(pagina.html.includes(textos.codigoEnviado), `el aviso del código está en ${textos.idioma}`);
  r = await N.enviar("/admin/verificar", pagina.html, "form-verificar", { codigo });
  verificar(destino(r) === "/admin", "entra con el código", resumen(r));
  return N;
}

const SEMANA = {};
for (const d of ["lun", "mar", "mie", "jue", "vie", "sab", "dom"]) {
  SEMANA[`desde_${d}`] = "08:00";
  SEMANA[`hasta_${d}`] = "20:00";
}

/** Primer día con horarios libres a partir de mañana (hasta 7 días). */
async function horariosLibres(S, c, idDisponibilidad, servicioId) {
  for (let d = 1; d <= 7; d++) {
    const fecha = fechaEn(c.zona, Date.now() + d * 24 * 3600 * 1000);
    const r = await S.accion("/turnos", idDisponibilidad, [[servicioId], fecha]);
    const slots = Array.isArray(r.valor) ? r.valor : [];
    if (slots.length > 0) return { fecha, slots, status: r.status };
  }
  return { fecha: "", slots: [], status: 0 };
}

async function pruebaBrasil(galeriaHtml) {
  const c = BR;
  console.log("\n===== Cliente de Brasil (pt, BRL) =====");
  const config0 = await una(c, "configuracion_negocio");
  verificar(config0?.modo_pago === "ninguno", "un cliente nuevo arranca sin pago anticipado");

  console.log("\nIngreso al panel, en portugués:");
  const C = await ingresar(c, {
    idioma: "portugués",
    lang: "pt-BR",
    olvido: "Esqueceu sua senha?",
    codigoEnviado: "Enviamos um código de 6 números",
  });
  let pagina = await C.get("/admin");
  verificar(
    pagina.status === 200 && pagina.html.includes("Olá, Cliente C2") && pagina.html.includes('lang="pt-BR"'),
    "el panel saluda en portugués",
    String(pagina.status),
  );
  const seccionesActivas = ["servicios", "configuracion", "textos", "turnos", "testimonios", "galeria", "preguntas"];
  verificar(
    seccionesActivas.every((s) => pagina.html.includes(`href="/admin/${s}"`)) && !pagina.html.includes('href="/admin/cursos"'),
    "el menú muestra solo las secciones de los módulos activos",
  );
  let r = await C.get("/admin/cursos");
  verificar(r.status === 404 && r.html.includes("Página não encontrada"), "la sección de un módulo apagado da 404", String(r.status));

  console.log("\nRecuperación de contraseña, en portugués:");
  const R = new Navegador(host(c));
  pagina = await R.get("/admin/recuperar");
  const linksAntes = ocurrencias(reRecuperacion(c.email)).length;
  r = await R.enviar("/admin/recuperar", pagina.html, "form-recuperar", { email: c.email });
  verificar(destino(r) === "/admin/recuperar?info=recuperacion_enviada", "pide el link", resumen(r));
  verificar(
    (await R.get(destino(r))).html.includes("Se o e-mail corresponder a uma conta"),
    "el aviso del link está en portugués",
  );
  const link = new URL(await esperarNueva(reRecuperacion(c.email), linksAntes));
  verificar(
    link.host === host(c) && link.pathname === "/admin/restablecer",
    "el link de recuperación lleva al panel del cliente",
    `${link.host}${link.pathname}`,
  );

  console.log("\nServicios (BRL, con centavos):");
  const rutaServicios = "/admin/servicios";
  pagina = await C.get(rutaServicios);
  const servicio = { nombre: "Corte E2E", duracion_minutos: "60", precio: "120,50", orden: "1", activo: "on" };
  r = await C.enviar(rutaServicios, pagina.html, "form-nuevo-servicio", { ...servicio, duracion_minutos: "2" });
  verificar(destino(r) === `${rutaServicios}?error=duracion`, "duración inválida: rechazada", resumen(r));
  verificar((await C.get(destino(r))).html.includes("A duração precisa ser um número inteiro"), "el error se muestra en portugués");
  r = await C.enviar(rutaServicios, pagina.html, "form-nuevo-servicio", { ...servicio, precio: "1,234" });
  verificar(destino(r) === `${rutaServicios}?error=precio`, "precio con 3 decimales: rechazado", resumen(r));
  r = await C.enviar(rutaServicios, pagina.html, "form-nuevo-servicio", {
    ...servicio,
    tenant_id: "00000000-0000-4000-8000-000000000000",
  });
  verificar(destino(r) === `${rutaServicios}?ok=creado`, "crea el servicio", resumen(r));
  const [creado] = await filas(c, "servicios");
  verificar(
    creado?.nombre === "Corte E2E" && Number(creado.precio) === 120.5 && creado.duracion_minutos === 60 && creado.activo,
    "precio con centavos, en su tenant (el tenant_id del formulario se ignora)",
  );
  if (!creado) throw new Error("no se creó el servicio");
  pagina = await C.get(rutaServicios);
  r = await C.enviar(rutaServicios, pagina.html, `form-servicio-${creado.id}`, { id: creado.id, ...servicio, precio: "abc" });
  verificar(destino(r) === `${rutaServicios}?error=precio`, "precio inválido: rechazado", resumen(r));
  r = await C.enviar(rutaServicios, pagina.html, `form-servicio-${creado.id}`, { id: creado.id, ...servicio, nombre: "Corte E2E editado" });
  verificar(
    destino(r) === `${rutaServicios}?ok=guardado` && (await filas(c, "servicios"))[0]?.nombre === "Corte E2E editado",
    "edita el servicio",
    resumen(r),
  );

  console.log("\nHorarios y reglas:");
  const rutaConfig = "/admin/configuracion";
  pagina = await C.get(rutaConfig);
  verificar(
    pagina.html.includes("Sem pagamento antecipado") && pagina.html.includes("ainda não tem o Mercado Pago conectado"),
    "muestra los modos de pago y avisa que no hay Mercado Pago",
  );
  const reglas = { horas_minimas_cancelacion: "24", minutos_preparacion_entre_turnos: "0", modo_pago: "ninguno", sena_porcentaje: "50" };
  r = await C.enviar(rutaConfig, pagina.html, "form-configuracion", { ...SEMANA, ...reglas, modo_pago: "sena", sena_porcentaje: "0" });
  verificar(destino(r) === `${rutaConfig}?error=sena_porcentaje`, "seña de 0%: rechazada", resumen(r));
  r = await C.enviar(rutaConfig, pagina.html, "form-configuracion", { ...SEMANA, ...reglas, modo_pago: "gratis" });
  verificar(destino(r).startsWith(`${rutaConfig}?error=`) && (await una(c, "configuracion_negocio"))?.modo_pago === "ninguno", "modo de pago desconocido: rechazado", resumen(r));
  r = await C.enviar(rutaConfig, pagina.html, "form-configuracion", { ...SEMANA, ...reglas, desde_lun: "20:00", hasta_lun: "08:00" });
  verificar(destino(r) === `${rutaConfig}?error=horario`, "horario al revés: rechazado", resumen(r));
  r = await C.enviar(rutaConfig, pagina.html, "form-configuracion", { ...SEMANA, ...reglas });
  const config = await una(c, "configuracion_negocio");
  verificar(
    destino(r) === `${rutaConfig}?ok=guardado` &&
      config?.modo_pago === "ninguno" &&
      Object.keys(config.horario_atencion).length === 7 &&
      config.minutos_preparacion_entre_turnos === 0,
    "guarda el horario, las reglas y el modo de pago",
    resumen(r),
  );

  console.log("\nTextos (lista blanca):");
  const rutaTextos = "/admin/textos";
  pagina = await C.get(rutaTextos);
  const textos = {
    inicio_titulo: "Bem-vinda ao",
    inicio_destacado: "Cliente C2",
    inicio_texto: "Agende online.",
    sobre_mi_titulo: "Sobre a C2",
    sobre_mi_texto: "Parágrafo um.\n\nParágrafo dois.",
  };
  r = await C.enviar(rutaTextos, pagina.html, "form-textos-sitio", { ...textos, inicio_titulo: "" });
  verificar(destino(r) === `${rutaTextos}?error=inicio_titulo`, "título vacío: rechazado", resumen(r));
  r = await C.enviar(rutaTextos, pagina.html, "form-textos-sitio", {
    ...textos,
    color_primario: "#000000",
    whatsapp: "+5511000000000",
    logo_url: "https://example.com/x.png",
    modulo_cursos: "on",
  });
  const marca = await una(c, "tenant_marca");
  verificar(
    destino(r) === `${rutaTextos}?ok=guardado` && marca?.inicio_titulo === "Bem-vinda ao" && marca.sobre_mi_titulo === "Sobre a C2",
    "guarda los textos de inicio y sobre mí",
    resumen(r),
  );
  verificar(
    marca?.color_primario === COLORES.primario && marca.whatsapp === c.whatsapp && marca.logo_url === null && !(await leerTenant(c))?.modulo_cursos,
    "colores, contacto, logo y módulos no cambian aunque vengan en el formulario",
  );

  console.log("\nSitio público sin contenido en los módulos:");
  const S = new Navegador(host(c));
  r = await S.get("/");
  verificar(
    r.status === 200 && r.html.includes('lang="pt-BR"') && r.html.includes("Bem-vinda ao") && r.html.includes("Serviços"),
    "el sitio está en portugués y muestra los textos nuevos",
    String(r.status),
  );
  verificar(r.html.includes("R$ 120,50"), "el precio se muestra en reales con centavos");
  verificar(
    r.html.includes('href="/#servicios"') &&
      r.html.includes('href="/#sobre-mi"') &&
      !r.html.includes('href="/#testimonios"') &&
      !r.html.includes('href="/#galeria"') &&
      !r.html.includes('href="/#preguntas-frecuentes"'),
    "el menú no enlaza secciones vacías",
  );
  verificar(
    r.html.includes('aria-label="Fale com a gente no WhatsApp"') && r.html.includes(`https://wa.me/${c.whatsapp.slice(1)}`),
    "botón flotante de WhatsApp con el número del cliente",
  );

  console.log("\nTestimonios:");
  const rutaTestimonios = "/admin/testimonios";
  pagina = await C.get(rutaTestimonios);
  const testimonio = { nombre: "Ana E2E", texto: "Atendimento excelente E2E.", orden: "0", activo: "on" };
  r = await C.enviar(rutaTestimonios, pagina.html, "form-nuevo-testimonio", { ...testimonio, texto: "" });
  verificar(destino(r) === `${rutaTestimonios}?error=testimonio_texto`, "testimonio vacío: rechazado", resumen(r));
  r = await C.enviar(rutaTestimonios, pagina.html, "form-nuevo-testimonio", testimonio);
  verificar(destino(r) === `${rutaTestimonios}?ok=creado`, "crea el testimonio", resumen(r));
  const [propio] = await filas(c, "testimonios");
  const ajeno = await ok(
    admin.from("testimonios").select("id, texto").not("tenant_id", "in", `(${BR.id},${AR.id})`).limit(1).maybeSingle(),
    "testimonio ajeno",
  );
  verificar(!!ajeno, "hay un testimonio de otro cliente (Gisel) para la prueba cruzada");
  if (ajeno && propio) {
    pagina = await C.get(rutaTestimonios);
    r = await C.enviar(rutaTestimonios, pagina.html, `form-testimonio-${propio.id}`, { ...testimonio, id: ajeno.id, texto: "Texto intruso" });
    const ajenoDespues = await ok(admin.from("testimonios").select("texto").eq("id", ajeno.id).maybeSingle(), "testimonio ajeno");
    verificar(
      destino(r) === `${rutaTestimonios}?error=id` && ajenoDespues?.texto === ajeno.texto,
      "un testimonio de otro cliente no se puede editar",
      resumen(r),
    );
  }
  r = await S.get("/");
  verificar(r.html.includes("Atendimento excelente E2E.") && r.html.includes('href="/#testimonios"'), "el sitio muestra el testimonio y lo enlaza");

  console.log("\nPreguntas frecuentes:");
  const rutaPreguntas = "/admin/preguntas";
  const htmlPreguntas = (await C.get(rutaPreguntas)).html;
  r = await C.enviar(rutaPreguntas, htmlPreguntas, "form-nueva-pregunta", { pregunta: "Uma\nlinha?", respuesta: "R", orden: "0", activo: "on" });
  verificar(destino(r) === `${rutaPreguntas}?error=texto_invalido`, "pregunta con salto de línea: rechazada", resumen(r));
  r = await C.enviar(rutaPreguntas, htmlPreguntas, "form-nueva-pregunta", {
    pregunta: "Quanto dura a sessão E2E?",
    respuesta: "Uma hora.\n\nChegue 10 minutos antes.",
    orden: "0",
    activo: "on",
  });
  verificar(destino(r) === `${rutaPreguntas}?ok=creado`, "crea la pregunta", resumen(r));
  r = await S.get("/");
  verificar(
    r.html.includes('id="preguntas-frecuentes"') && r.html.includes("Quanto dura a sessão E2E?") && r.html.includes('href="/#preguntas-frecuentes"'),
    "el sitio muestra la pregunta y la enlaza",
  );

  console.log("\nGalería:");
  const rutaGaleria = "/admin/galeria";
  pagina = await C.get(rutaGaleria);
  galeriaHtml.valor = pagina.html;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>';
  r = await C.enviar(rutaGaleria, pagina.html, "form-subir-imagen", { descripcion: "", archivo: new File([svg], "foto.png", { type: "image/png" }) });
  verificar(destino(r) === `${rutaGaleria}?error=imagen_tipo`, "SVG disfrazado de PNG: rechazado", resumen(r));
  r = await C.enviar(rutaGaleria, pagina.html, "form-subir-imagen", {
    descripcion: "Unhas E2E",
    archivo: new File([PNG], "foto.png", { type: "image/png" }),
  });
  verificar(destino(r) === `${rutaGaleria}?ok=imagen_subida`, "sube una imagen", resumen(r));
  const [imagen] = await filas(c, "galeria");
  verificar(
    !!imagen &&
      new RegExp(`^${escaparRegex(PREFIJO_PUBLICO)}${c.id}/galeria-\\d+-[0-9a-f]{8}\\.png$`).test(imagen.imagen_url) &&
      imagen.descripcion === "Unhas E2E",
    "la imagen queda en la carpeta del cliente, con su descripción",
  );
  if (!imagen) throw new Error("no se creó la imagen de la galería");
  const publica = await fetch(imagen.imagen_url);
  verificar(publica.status === 200 && publica.headers.get("content-type") === "image/png", "la URL pública se lee, con el Content-Type del formato real");
  r = await S.get("/");
  verificar(
    r.html.includes('id="galeria"') && r.html.includes(encodeURIComponent(imagen.imagen_url)) && r.html.includes('href="/#galeria"'),
    "el sitio muestra la galería y la enlaza",
  );
  pagina = await C.get(rutaGaleria);
  r = await C.enviar(rutaGaleria, pagina.html, `form-imagen-${imagen.id}`, { id: imagen.id, descripcion: "Unhas E2E editada", orden: "2", activo: "on" });
  const editada = (await filas(c, "galeria"))[0];
  verificar(destino(r) === `${rutaGaleria}?ok=guardado` && editada?.descripcion === "Unhas E2E editada" && editada.orden === 2, "edita la imagen", resumen(r));
  r = await C.enviar(rutaGaleria, pagina.html, `form-eliminar-imagen-${imagen.id}`, { id: imagen.id });
  const quedanImagenes = (await listarObjetos(c.id)).filter((o) => o.startsWith("galeria-"));
  verificar(
    destino(r) === `${rutaGaleria}?ok=eliminado` && (await filas(c, "galeria")).length === 0 && quedanImagenes.length === 0,
    "borrar la imagen borra la fila y el objeto del bucket",
    resumen(r),
  );

  console.log("\nReserva en el sitio, sin pago anticipado:");
  r = await S.get("/turnos");
  verificar(r.status === 200 && r.html.includes("Sem pagamento antecipado"), "la página de turnos dice que no hay pago anticipado", String(r.status));
  const rutaApp = "sitio/[tenant]/turnos";
  const idDisponibilidad = idDeAccionCompilada(rutaApp, "consultarDisponibilidad");
  const idReserva = idDeAccionCompilada(rutaApp, "reservarTurno");
  const servicioId = creado.id;
  const { fecha, slots, status } = await horariosLibres(S, c, idDisponibilidad, servicioId);
  verificar(slots.length > 0, "hay horarios disponibles en los próximos días", `${status}, ${slots.length} horarios`);
  const reserva = new FormData();
  reserva.append("servicioIds", servicioId);
  reserva.append("fecha", fecha);
  reserva.append("iso", slots[0]?.iso ?? "");
  reserva.append("clienteNombre", "Cliente Reserva E2E");
  reserva.append("clienteEmail", emailReserva);
  reserva.append("clienteTelefono", "(11) 91234-5678");
  r = await S.accion("/turnos", idReserva, reserva);
  const urlGracias = r.valor?.ok ? r.valor.url : "";
  verificar(
    /^\/turnos\/gracias\?turno=[0-9a-f-]{36}$/.test(urlGracias),
    "la reserva vuelve a la página de gracias, sin Mercado Pago",
    r.valor?.ok === false ? r.valor.error : String(r.status),
  );
  const [turno] = await filas(c, "turnos");
  verificar(
    turno?.estado === "confirmado" && turno.monto_sena === null && turno.bloqueado_hasta === null && turno.cliente_telefono === c.whatsapp,
    "el turno queda confirmado, sin monto ni bloqueo",
    turno ? `estado ${turno.estado}` : "sin turno",
  );
  verificar((await filas(c, "pagos")).length === 0, "no se registra ningún pago");
  if (!turno) throw new Error("la reserva no creó el turno");
  r = await S.get(urlGracias || "/turnos/gracias");
  verificar(
    r.status === 200 && r.html.includes("Seu horário está confirmado!") && r.html.includes(`/turnos/gestion/${turno.token_gestion}`),
    "la página de gracias muestra el turno confirmado y el link para gestionarlo",
    String(r.status),
  );

  console.log("\nUn servicio con turnos no se borra:");
  pagina = await C.get(rutaServicios);
  r = await C.enviar(rutaServicios, pagina.html, `form-eliminar-servicio-${servicioId}`, { id: servicioId });
  verificar(
    destino(r) === `${rutaServicios}?error=servicio_con_turnos` && (await filas(c, "servicios")).length === 1,
    "error claro y el servicio sigue",
    resumen(r),
  );
  verificar((await C.get(destino(r))).html.includes("Este serviço tem agendamentos registrados"), "el mensaje está en portugués");

  console.log("\nTurnos del panel:");
  pagina = await C.get("/admin/turnos");
  verificar(pagina.html.includes("Cliente Reserva E2E") && pagina.html.includes("Confirmado"), "el turno aparece confirmado en el panel");
  r = await C.enviar("/admin/turnos", pagina.html, `form-completar-${turno.id}`, { id: turno.id });
  verificar(
    destino(r) === "/admin/turnos?ok=turno_completado" && (await filas(c, "turnos"))[0]?.estado === "completado",
    "marca el turno como completado",
    resumen(r),
  );

  console.log("\nAbuso de la reserva sin pago anticipado:");
  const { fecha: fechaAbuso, slots: slotsAbuso } = await horariosLibres(S, c, idDisponibilidad, servicioId);
  verificar(slotsAbuso.length >= 11, "hay horarios para las pruebas de abuso", `${slotsAbuso.length} horarios`);
  // Cada reserva desde otro navegador (otra IP): el límite que se prueba es el del email.
  const reservar = (iso, email, telefono) => {
    const fd = new FormData();
    fd.append("servicioIds", servicioId);
    fd.append("fecha", fechaAbuso);
    fd.append("iso", iso ?? "");
    fd.append("clienteNombre", "Cliente Abuso E2E");
    fd.append("clienteEmail", email);
    fd.append("clienteTelefono", telefono);
    return new Navegador(host(c)).accion("/turnos", idReserva, fd);
  };
  const turnosAntes = (await filas(c, "turnos")).length;
  r = await reservar(slotsAbuso[2]?.iso, "uno@example.com,otro@example.com", "(11) 91234-5601");
  verificar(
    r.valor?.ok === false && String(r.valor.error).includes("um único e-mail válido") && (await filas(c, "turnos")).length === turnosAntes,
    "un email con dos direcciones separadas por coma se rechaza y no crea turnos",
    r.valor?.ok ? "ok" : String(r.valor?.error ?? r.status),
  );
  const emailLimite = `e2e-c2-limite-${sufijo}@example.com`;
  const aceptadas = [];
  for (const [i, n] of [2, 4, 6].entries()) {
    r = await reservar(slotsAbuso[n]?.iso, emailLimite, `(11) 91234-560${i + 2}`);
    aceptadas.push(r.valor?.ok === true);
  }
  verificar(aceptadas.every(Boolean), "tres reservas futuras con el mismo email se aceptan", aceptadas.join(","));
  r = await reservar(slotsAbuso[8]?.iso, emailLimite.toUpperCase(), "(11) 91234-5609");
  verificar(
    r.valor?.ok === false && String(r.valor.error).includes("agendamentos com este e-mail ou este WhatsApp"),
    "la cuarta reserva futura con el mismo email se rechaza con un mensaje claro",
    r.valor?.ok ? "ok" : String(r.valor?.error ?? r.status),
  );
  verificar((await filas(c, "turnos")).filter((t) => t.cliente_email === emailLimite).length === 3, "quedan tres turnos para ese email");
  const simultaneas = await Promise.all([
    reservar(slotsAbuso[10]?.iso, `e2e-c2-par-a-${sufijo}@example.com`, "(11) 91234-5611"),
    reservar(slotsAbuso[10]?.iso, `e2e-c2-par-b-${sufijo}@example.com`, "(11) 91234-5612"),
  ]);
  const ganaron = simultaneas.filter((x) => x.valor?.ok === true).length;
  const perdieron = simultaneas.filter((x) => x.valor?.ok === false && String(x.valor.error).includes("Esse horário não está mais disponível")).length;
  verificar(
    ganaron === 1 && perdieron === 1,
    "dos reservas simultáneas del mismo horario: una se acepta y la otra dice que ya no está disponible",
    simultaneas.map((x) => (x.valor?.ok ? "ok" : String(x.valor?.error ?? x.status))).join(" | "),
  );
  const enEseHorario = (await filas(c, "turnos")).filter(
    (t) => slotsAbuso[10] && new Date(t.fecha_hora).getTime() === new Date(slotsAbuso[10].iso).getTime(),
  );
  verificar(enEseHorario.length === 1, "queda un solo turno en ese horario", String(enEseHorario.length));

  console.log("\nMódulos apagados:");
  await ok(admin.from("tenants").update({ modulo_faq: false, modulo_whatsapp: false }).eq("id", c.id), "apagar módulos");
  pagina = await C.get("/admin");
  verificar(!pagina.html.includes('href="/admin/preguntas"'), "el menú ya no muestra preguntas frecuentes");
  r = await C.get(rutaPreguntas);
  verificar(r.status === 404, "la página de la sección da 404", String(r.status));
  const preguntasAntes = (await filas(c, "preguntas_frecuentes")).length;
  r = await C.enviar(rutaPreguntas, htmlPreguntas, "form-nueva-pregunta", { pregunta: "Não deveria entrar?", respuesta: "R", orden: "0", activo: "on" });
  verificar(
    destino(r) === "/admin?error=modulo_inactivo" && (await filas(c, "preguntas_frecuentes")).length === preguntasAntes,
    "su action vuelve al panel con el aviso y no guarda nada",
    resumen(r),
  );
  verificar((await C.get(destino(r))).html.includes("Essa seção não está habilitada"), "el aviso se muestra en portugués");
  r = await S.get("/");
  verificar(
    !r.html.includes('id="preguntas-frecuentes"') &&
      !r.html.includes('href="/#preguntas-frecuentes"') &&
      !r.html.includes('aria-label="Fale com a gente no WhatsApp"'),
    "el sitio ya no muestra la sección ni el botón de WhatsApp",
  );

  console.log("\nCliente suspendido:");
  await ok(admin.from("tenants").update({ estado: "suspendido" }).eq("id", c.id), "suspender");
  r = await C.get("/admin");
  verificar(r.status === 200 && r.html.includes("suspenso") && !r.html.includes("Olá,"), "el panel muestra el aviso de suspendido", String(r.status));
  r = await new Navegador(host(c)).get("/admin/login");
  verificar(r.html.includes("suspenso") && !r.html.includes('id="form-login"'), "el ingreso también muestra el aviso");
}

async function pruebaArgentina(galeriaHtml) {
  const c = AR;
  console.log("\n===== Cliente de Argentina (es, ARS, solo turnos) =====");
  console.log("\nIngreso al panel, en español:");
  const C = await ingresar(c, {
    idioma: "español",
    lang: "es-AR",
    olvido: "¿Olvidaste tu contraseña?",
    codigoEnviado: "Te enviamos un código de 6 números",
  });
  let pagina = await C.get("/admin");
  verificar(pagina.status === 200 && pagina.html.includes("Hola, Cliente AR"), "el panel saluda en español", String(pagina.status));
  verificar(
    ["servicios", "configuracion", "textos", "turnos"].every((s) => pagina.html.includes(`href="/admin/${s}"`)) &&
      ["galeria", "testimonios", "preguntas", "cursos"].every((s) => !pagina.html.includes(`href="/admin/${s}"`)),
    "el menú muestra solo turnos, servicios, horarios y textos",
  );
  let r = await C.get("/admin/galeria");
  verificar(r.status === 404 && r.html.includes("Página no encontrada"), "la galería (módulo apagado) da 404", String(r.status));
  r = await C.enviar("/admin/galeria", galeriaHtml.valor, "form-subir-imagen", {
    descripcion: "No debería subir",
    archivo: new File([PNG], "foto.png", { type: "image/png" }),
  });
  verificar(
    destino(r) === "/admin?error=modulo_inactivo" && (await filas(c, "galeria")).length === 0 && (await listarObjetos(c.id)).length === 0,
    "subir a la galería con el módulo apagado vuelve al panel con el aviso y no sube nada",
    resumen(r),
  );
  verificar((await C.get(destino(r))).html.includes("Esa sección no está habilitada"), "el aviso se muestra en español");

  console.log("\nServicios (ARS, pesos enteros):");
  const rutaServicios = "/admin/servicios";
  pagina = await C.get(rutaServicios);
  const servicio = { nombre: "Manicura E2E", duracion_minutos: "45", precio: "1500,50", orden: "0", activo: "on" };
  r = await C.enviar(rutaServicios, pagina.html, "form-nuevo-servicio", servicio);
  verificar(destino(r) === `${rutaServicios}?error=precio`, "precio con centavos en pesos: rechazado", resumen(r));
  verificar((await C.get(destino(r))).html.includes("en pesos, sin decimales"), "el error se muestra en español");
  r = await C.enviar(rutaServicios, pagina.html, "form-nuevo-servicio", { ...servicio, precio: "1500" });
  verificar(destino(r) === `${rutaServicios}?ok=creado`, "crea el servicio", resumen(r));
  const [creado] = await filas(c, "servicios");
  verificar(Number(creado?.precio) === 1500, "precio en pesos enteros", String(creado?.precio));
  if (!creado) throw new Error("no se creó el servicio");

  console.log("\nHorarios y reglas, con seña y pago total:");
  const rutaConfig = "/admin/configuracion";
  pagina = await C.get(rutaConfig);
  verificar(
    pagina.html.includes("Sin pago anticipado") && pagina.html.includes("todavía no tiene Mercado Pago conectado"),
    "muestra los modos de pago en español y avisa que no hay Mercado Pago",
  );
  const reglas = { horas_minimas_cancelacion: "12", minutos_preparacion_entre_turnos: "15", modo_pago: "sena", sena_porcentaje: "30" };
  r = await C.enviar(rutaConfig, pagina.html, "form-configuracion", { ...SEMANA, ...reglas });
  let config = await una(c, "configuracion_negocio");
  verificar(
    destino(r) === `${rutaConfig}?ok=guardado` && config?.modo_pago === "sena" && config.sena_porcentaje === 30 && config.minutos_preparacion_entre_turnos === 15,
    "guarda la seña del 30%",
    resumen(r),
  );
  r = await C.enviar(rutaConfig, pagina.html, "form-configuracion", { ...SEMANA, ...reglas, modo_pago: "total" });
  config = await una(c, "configuracion_negocio");
  verificar(destino(r) === `${rutaConfig}?ok=guardado` && config?.modo_pago === "total", "guarda el pago total", resumen(r));

  console.log("\nSitio público en español:");
  const S = new Navegador(host(c));
  r = await S.get("/");
  verificar(r.status === 200 && r.html.includes('lang="es-AR"') && r.html.includes("Servicios"), "el sitio está en español", String(r.status));
  verificar(r.html.includes("$ 1.500"), "el precio se muestra en pesos, sin decimales");
  verificar(
    !r.html.includes('href="/#galeria"') &&
      !r.html.includes('href="/#testimonios"') &&
      !r.html.includes('href="/#preguntas-frecuentes"') &&
      !r.html.includes('href="/#sobre-mi"') &&
      !r.html.includes("Escribinos por WhatsApp"),
    "sin módulos de contenido ni WhatsApp: el menú no los enlaza y no hay botón flotante",
  );

  console.log("\nReserva con pago total, sin Mercado Pago conectado:");
  r = await S.get("/turnos");
  verificar(r.status === 200, "la página de turnos responde", String(r.status));
  const rutaApp = "sitio/[tenant]/turnos";
  const idDisponibilidad = idDeAccionCompilada(rutaApp, "consultarDisponibilidad");
  const idReserva = idDeAccionCompilada(rutaApp, "reservarTurno");
  const { fecha, slots, status } = await horariosLibres(S, c, idDisponibilidad, creado.id);
  verificar(slots.length > 0, "hay horarios disponibles en los próximos días", `${status}, ${slots.length} horarios`);
  const reserva = new FormData();
  reserva.append("servicioIds", creado.id);
  reserva.append("fecha", fecha);
  reserva.append("iso", slots[0]?.iso ?? "");
  reserva.append("clienteNombre", "Cliente Reserva AR E2E");
  reserva.append("clienteEmail", emailReserva);
  reserva.append("clienteTelefono", "11 2345-6789");
  r = await S.accion("/turnos", idReserva, reserva);
  verificar(
    r.valor?.ok === false && String(r.valor.error).includes("todavía no está habilitada") && (await filas(c, "turnos")).length === 0,
    "la reserva se rechaza con un mensaje claro y no crea turnos",
    r.valor?.ok ? "ok" : String(r.status),
  );
}

const hmacEmail = (dominio, e) => createHmac("sha256", secretoMfa).update(`${dominio}|${e}`).digest("hex");

try {
  for (const c of CLIENTES) await preparar(c);
  const galeriaHtml = { valor: "" };
  await pruebaBrasil(galeriaHtml);
  await pruebaArgentina(galeriaHtml);
} catch (e) {
  console.error(`\nError en la prueba: ${e.message}`);
  fallas++;
} finally {
  console.log("\nLimpieza:");
  const fallo = (que, e) => {
    console.error(`✗ limpieza: ${que}: ${e}`);
    fallas++;
  };
  for (const c of CLIENTES) {
    c.id = c.id ?? (await leerTenant(c))?.id ?? null;
    if (c.id) {
      const objetos = await listarObjetos(c.id).catch(() => []);
      if (objetos.length) {
        const { error } = await admin.storage.from("sitios").remove(objetos.map((o) => `${c.id}/${o}`));
        if (error) fallo("imágenes", error.message);
      }
    }
    if (!c.userId) {
      try {
        c.userId = await idDeUsuarioPorEmail(c.email);
      } catch (e) {
        fallo("buscar el usuario del cliente", e.message);
      }
    }
    if (c.userId) {
      // Perfil, códigos y dispositivos se borran en cascada.
      const { error } = await admin.auth.admin.deleteUser(c.userId);
      if (error) fallo("usuario", error.message);
    }
    if (c.id) {
      // Marca, configuración, credenciales, servicios, turnos, testimonios, galería, preguntas e
      // intentos de reserva se borran en cascada.
      const { error } = await admin.from("tenants").delete().eq("id", c.id);
      if (error) fallo("tenant", error.message);
    }
  }
  const emails = CLIENTES.map((c) => c.email);
  const borrados = await Promise.all([
    admin.from("intentos_login").delete().in("email_hash", emails.map((e) => hmacEmail("login", e))),
    admin.from("pedidos_recuperacion").delete().in("email_hash", emails.map((e) => hmacEmail("recuperacion", e))),
    admin.from("intentos_login").delete().in("ip", ipsUsadas),
    admin.from("pedidos_recuperacion").delete().in("ip", ipsUsadas),
  ]);
  for (const { error } of borrados) if (error) fallo("filas de ingreso", error.message);

  const contar = (tabla, columna, valor) =>
    admin.from(tabla).select(columna, { count: "exact", head: true }).eq(columna, valor).then((r) => r.count ?? 1);
  const quedan = [];
  for (const c of CLIENTES) {
    quedan.push(
      ...(await Promise.all([
        leerTenant(c).then((t) => (t ? 1 : 0)),
        listarObjetos(c.id).then((o) => o.length).catch(() => 1),
        idDeUsuarioPorEmail(c.email).then((u) => (u ? 1 : 0)).catch(() => 1),
        ...(c.userId ? ["perfiles", "codigos_login", "dispositivos_confiables"].map((t) => contar(t, "user_id", c.userId)) : []),
        ...(c.id
          ? ["servicios", "turnos", "testimonios", "galeria", "preguntas_frecuentes", "intentos_reserva", "tenant_marca", "configuracion_negocio"].map(
              (t) => contar(t, "tenant_id", c.id),
            )
          : []),
      ])),
    );
  }
  quedan.push(
    ...(await Promise.all([
      admin.from("intentos_login").select("id", { count: "exact", head: true }).in("ip", ipsUsadas).then((r) => r.count ?? 1),
      admin.from("pedidos_recuperacion").select("id", { count: "exact", head: true }).in("ip", ipsUsadas).then((r) => r.count ?? 1),
      admin
        .from("intentos_login")
        .select("id", { count: "exact", head: true })
        .in("email_hash", emails.map((e) => hmacEmail("login", e)))
        .then((r) => r.count ?? 1),
      admin
        .from("pedidos_recuperacion")
        .select("id", { count: "exact", head: true })
        .in("email_hash", emails.map((e) => hmacEmail("recuperacion", e)))
        .then((r) => r.count ?? 1),
    ])),
  );
  verificar(
    quedan.every((n) => n === 0),
    "no quedan los clientes, sus filas, sus imágenes, los usuarios ni las filas de ingreso",
    quedan.join(","),
  );
}

console.log(fallas === 0 ? "\nE2E OK" : `\n${fallas} verificación(es) fallaron`);
process.exit(fallas === 0 ? 0 : 1);
