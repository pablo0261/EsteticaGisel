// Prueba de punta a punta del panel master (etapa C1) contra el servidor de desarrollo
// (puerto 3000), como un navegador sin JavaScript (ver e2e-login.mjs): GET de la página,
// campo oculto $ACTION_ID_… y POST multipart; Next responde 303 con Location.
// Crea un master temporal, da de alta el cliente "c1-test-<sufijo>", edita sus datos, su
// marca (paleta válida e inválidas), sube imágenes (y rechaza un SVG y un archivo grande),
// carga textos, módulos y credenciales, crea el usuario del cliente, define su contraseña
// con el link del log, entra a su /admin, suspende y reactiva el cliente, y al final borra
// todo (también las imágenes del bucket).
// El servidor tiene que haber arrancado con CREDENCIALES_KEY en el .env.local y sin la
// cuenta de Gmail de la plataforma (los códigos y links salen en el log, "[MFA dev]").
// La prueba de Gmail se conecta de verdad a smtp.gmail.com con datos falsos (falla siempre).
// Uso: node --env-file=.env.local scripts/e2e-master.mjs <log>
import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { request } from "node:http";

const [rutaLog] = process.argv.slice(2);
if (!rutaLog) {
  console.error("Uso: node --env-file=.env.local scripts/e2e-master.mjs <log>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const secretoMfa = process.env.MFA_SECRET;
const claveCredenciales = Buffer.from(process.env.CREDENCIALES_KEY ?? "", "base64url");
if (!url || !secret || !secretoMfa || claveCredenciales.length !== 32) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, MFA_SECRET o CREDENCIALES_KEY (32 bytes).");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const HOST_MASTER = "app.localhost:3000";
const sufijo = Date.now().toString(36);
const slug = `c1-test-${sufijo}`;
const HOST_CLIENTE = `${slug}.localhost:3000`;
const emailMaster = `e2e-c1-master-${sufijo}@example.com`;
const emailCliente = `e2e-c1-cliente-${sufijo}@example.com`;
const emailOtro = `e2e-c1-otro-${sufijo}@example.com`;
const claveMaster = randomBytes(18).toString("base64url");
const claveCliente = randomBytes(18).toString("base64url");
const PREFIJO_PUBLICO = `${url.replace(/\/+$/, "")}/storage/v1/object/public/sitios/`;
/** PNG de 1×1. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

let fallas = 0;
function verificar(ok, descripcion, detalle) {
  console.log(`${ok ? "✓" : "✗"} ${descripcion}`);
  if (!ok) {
    fallas++;
    if (detalle) console.log(`    (${detalle})`);
  }
}

function destino(r) {
  if (!r.location) return "";
  const u = new URL(r.location, "http://base");
  return `${u.pathname}${u.search}`;
}
const resumen = (r) => `${r.status} ${r.location}`;
const parametro = (r, nombre) => new URL(r.location || "/", "http://base").searchParams.get(nombre);

function idDeAccion(html, formId) {
  const inicio = html.indexOf(`id="${formId}"`);
  if (inicio < 0) throw new Error(`la página no tiene el formulario #${formId}`);
  const m = html.slice(inicio, html.indexOf("</form>", inicio)).match(/name="(\$ACTION_ID_[0-9a-zA-Z]+)"/);
  if (!m) throw new Error(`#${formId} no tiene el campo $ACTION_ID_`);
  return m[1];
}

let siguienteIp = 50;
const ipsUsadas = [];
function ipFalsa() {
  const ip = `203.0.113.${siguienteIp++}`;
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

  pedir(metodo, ruta, cuerpo) {
    return new Promise((resolve, reject) => {
      const headers = { host: this.host, "x-real-ip": this.ip };
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
}

async function ingresar(nav, base, emailUsuario, clave) {
  const pagina = await nav.get(`${base}/login`);
  return nav.enviar(`${base}/login`, pagina.html, "form-login", { email: emailUsuario, password: clave });
}

const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const reCodigo = (de) => new RegExp(`\\[MFA dev\\] c.digo para ${escaparRegex(de)}: (\\d{6})`, "g");
const reInvitacion = (de) => new RegExp(`\\[MFA dev\\] link de invitaci.n para ${escaparRegex(de)}: (\\S+)`, "g");
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

// ---------- Cifrado con el mismo formato que src/lib/cripto/credenciales.ts ----------
const aad = (tenantId, columna) => Buffer.from(`v1|${tenantId}|${columna}`, "utf8");

function cifrarComoLaApp(texto, tenantId, columna) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", claveCredenciales, iv);
  c.setAAD(aad(tenantId, columna));
  const cifrado = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), cifrado.toString("base64url")].join(".");
}

function descifrarComoLaApp(valor, tenantId, columna) {
  const [, iv, tag, cifrado] = valor.split(".");
  const d = createDecipheriv("aes-256-gcm", claveCredenciales, Buffer.from(iv, "base64url"));
  d.setAAD(aad(tenantId, columna));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(cifrado, "base64url")), d.final()]).toString("utf8");
}

// ---------- Datos ----------
let tenantId = null;
let masterUserId = null;
const usuariosCreados = [];

const leerTenant = async () => (await admin.from("tenants").select("*").eq("slug", slug).maybeSingle()).data;
const fila = async (tabla) => (await admin.from(tabla).select("*").eq("tenant_id", tenantId).maybeSingle()).data;

async function listarObjetos(id = tenantId) {
  if (!id) return [];
  const { data, error } = await admin.storage.from("sitios").list(id, { limit: 100 });
  if (error) throw new Error(`listar imágenes: ${error.message}`);
  return data.map((o) => o.name);
}

async function crearUsuario(emailUsuario, clave, perfil) {
  const { data, error } = await admin.auth.admin.createUser({ email: emailUsuario, password: clave, email_confirm: true });
  if (error) throw new Error(`usuario de prueba: ${error.message}`);
  usuariosCreados.push(data.user.id);
  const { error: errorPerfil } = await admin.from("perfiles").insert({ user_id: data.user.id, ...perfil });
  if (errorPerfil) throw new Error(`perfil de prueba: ${errorPerfil.message}`);
  return data.user.id;
}

async function prueba() {
  console.log("\nIngreso del master:");
  const M = new Navegador(HOST_MASTER);
  const codigosAntes = ocurrencias(reCodigo(emailMaster)).length;
  let r = await ingresar(M, "", emailMaster, claveMaster);
  verificar(destino(r) === "/verificar?info=codigo_enviado", "master: pide el código", resumen(r));
  const codigo = await esperarNueva(reCodigo(emailMaster), codigosAntes);
  let pagina = await M.get("/verificar");
  r = await M.enviar("/verificar", pagina.html, "form-verificar", { codigo });
  verificar(destino(r) === "/", "master: entra con el código", resumen(r));

  console.log("\nAlta del cliente:");
  pagina = await M.get("/nuevo");
  verificar(pagina.status === 200 && pagina.html.includes('id="form-alta-cliente"'), "la pantalla de alta responde", String(pagina.status));
  const alta = {
    nombre: "Cliente C1 Alta", slug, pais: "BR", idioma: "pt", zona_horaria: "America/Manaus", moneda: "BRL",
    modulo_turnos: "on", modulo_faq: "on",
  };
  const altaCon = (cambios) => M.enviar("/nuevo", pagina.html, "form-alta-cliente", { ...alta, ...cambios });
  r = await altaCon({ slug: "admin" });
  verificar(destino(r) === "/nuevo?error=slug_invalido", "subdominio reservado: rechazado", resumen(r));
  r = await altaCon({ zona_horaria: "America/Argentina/Buenos_Aires" });
  verificar(destino(r) === "/nuevo?error=zona", "zona horaria de otro país: rechazada", resumen(r));
  r = await altaCon({});
  verificar(destino(r) === `/clientes/${slug}?ok=creado`, "alta: crea el cliente", resumen(r));
  const tenant = await leerTenant();
  tenantId = tenant?.id ?? null;
  if (!tenantId) throw new Error("el alta no creó el cliente");
  verificar(
    tenant.pais === "BR" && tenant.zona_horaria === "America/Manaus" && tenant.modulo_faq && !tenant.modulo_cursos && tenant.estado === "activo",
    "alta: país, zona, módulos y estado",
    JSON.stringify(tenant),
  );
  const [marca, config, cred] = await Promise.all([fila("tenant_marca"), fila("configuracion_negocio"), fila("tenant_credenciales")]);
  verificar(marca?.color_primario === "#3d5a80" && marca.inicio_titulo === "Cliente C1 Alta", "alta: marca con la paleta de la plataforma");
  verificar(!!config && Object.keys(config.horario_atencion).length === 0, "alta: configuración con horario vacío");
  verificar(cred?.smtp_estado === "sin_configurar", "alta: fila de credenciales");
  r = await altaCon({});
  verificar(destino(r) === "/nuevo?error=slug_en_uso", "subdominio repetido: rechazado", resumen(r));

  console.log("\nDatos:");
  const base = `/clientes/${slug}`;
  pagina = await M.get(base);
  verificar(pagina.status === 200 && pagina.html.includes('id="form-datos"'), "la pestaña Datos responde", String(pagina.status));
  const datos = { slug, nombre: "Cliente C1", pais: "BR", idioma: "pt", zona_horaria: "America/Sao_Paulo", moneda: "BRL" };
  r = await M.enviar(base, pagina.html, "form-datos", { ...datos, moneda: "USD" });
  verificar(destino(r) === `${base}?error=moneda`, "moneda inválida: rechazada", resumen(r));
  r = await M.enviar(base, pagina.html, "form-datos", datos);
  verificar(destino(r) === `${base}?ok=guardado`, "datos guardados", resumen(r));
  const editado = await leerTenant();
  verificar(editado?.nombre === "Cliente C1" && editado.zona_horaria === "America/Sao_Paulo", "nombre y zona actualizados");

  console.log("\nMarca: colores:");
  const rutaMarca = `${base}/marca`;
  pagina = await M.get(rutaMarca);
  verificar(pagina.status === 200 && pagina.html.includes('id="form-colores"'), "la pestaña Marca responde", String(pagina.status));
  const paleta = { slug, color_primario: "#1f6f8b", color_secundario: "#2d4a53", color_fondo: "#F2F7F9", color_texto: "#102027" };
  const colores = (cambios) => M.enviar(rutaMarca, pagina.html, "form-colores", { ...paleta, ...cambios });
  r = await colores({});
  verificar(destino(r) === `${rutaMarca}?ok=guardado`, "paleta válida: se guarda", resumen(r));
  verificar((await fila("tenant_marca"))?.color_fondo === "#f2f7f9", "los colores se guardan normalizados");
  r = await colores({ color_texto: "#f2f7f9" });
  verificar(destino(r) === `${rutaMarca}?error=contraste_texto`, "texto igual al fondo: rechazado", resumen(r));
  r = await colores({ color_primario: "#c0899a", color_secundario: "#4e5340", color_fondo: "#f6f1ea", color_texto: "#1a1a1a" });
  verificar(destino(r) === `${rutaMarca}?error=contraste_boton`, "paleta con botones ilegibles (la de Gisel): rechazada", resumen(r));
  r = await colores({ color_primario: "#1f6f8b80" });
  verificar(destino(r) === `${rutaMarca}?error=color_invalido`, "color con transparencia: rechazado", resumen(r));
  verificar((await fila("tenant_marca"))?.color_texto === "#102027", "las paletas rechazadas no cambian nada");
  r = await colores({ color_secundario: "#e6eef1" });
  verificar(parametro(r, "ok") === "guardado" && parametro(r, "aviso") === "contraste_secundario", "secundario con poco contraste: se guarda con aviso", resumen(r));
  // El editor se renderiza en el servidor con su estado inicial: el aviso en vivo y el de después de guardar no se repiten.
  const AVISO_GUARDADO = "Se guardó, pero el color secundario";
  const AVISO_EN_VIVO =
    "El color secundario tiene poco contraste con el fondo: el mínimo recomendado es 3:1 (se puede guardar igual).";
  const conAviso = (await M.get(destino(r))).html;
  const sinAviso = (await M.get(rutaMarca)).html;
  verificar(
    conAviso.includes(AVISO_GUARDADO) && !conAviso.includes(AVISO_EN_VIVO) && sinAviso.includes(AVISO_EN_VIVO) && !sinAviso.includes(AVISO_GUARDADO),
    "el aviso del secundario sale una sola vez (después de guardar o en vivo)",
  );
  verificar(
    sinAviso.includes("contraste actual") && sinAviso.includes("el mínimo recomendado es 3:1"),
    "el aviso en vivo muestra el contraste actual y el mínimo de 3:1",
  );
  verificar(/aria-label="Secundario \(detalles\) \(hex\)"/.test(sinAviso), "el campo hex tiene nombre accesible");
  r = await colores({});
  verificar(destino(r) === `${rutaMarca}?ok=guardado`, "la paleta válida se vuelve a guardar", resumen(r));

  console.log("\nMarca: imágenes:");
  const subir = (archivo, tipo = "logo") => M.enviar(rutaMarca, pagina.html, `form-imagen-${tipo}`, { slug, tipo, archivo });
  r = await subir(new File([PNG], "logo.png", { type: "image/png" }));
  verificar(destino(r) === `${rutaMarca}?ok=imagen_guardada`, "logo PNG: se sube", resumen(r));
  const logo1 = (await fila("tenant_marca"))?.logo_url ?? "";
  verificar(logo1.startsWith(`${PREFIJO_PUBLICO}${tenantId}/logo-`) && logo1.endsWith(".png"), "logo_url apunta al bucket sitios, carpeta del cliente", logo1);
  const publica = await fetch(logo1);
  verificar(publica.status === 200 && publica.headers.get("content-type") === "image/png", "la URL pública se lee sin sesión", `${publica.status} ${publica.headers.get("content-type")}`);
  r = await M.get(`/_next/image?url=${encodeURIComponent(logo1)}&w=640&q=75`);
  verificar(r.status === 200, "next/image acepta el host de Supabase (remotePatterns)", String(r.status));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>';
  r = await subir(new File([svg], "logo.svg", { type: "image/svg+xml" }));
  verificar(destino(r) === `${rutaMarca}?error=imagen_tipo`, "SVG: rechazado", resumen(r));
  r = await subir(new File([svg], "logo.png", { type: "image/png" }));
  verificar(destino(r) === `${rutaMarca}?error=imagen_tipo`, "SVG disfrazado de PNG: rechazado (se mira el contenido)", resumen(r));
  r = await subir(new File([Buffer.concat([PNG, Buffer.alloc(2.5 * 1024 * 1024)])], "grande.png", { type: "image/png" }));
  verificar(destino(r) === `${rutaMarca}?error=imagen_grande`, "más de 2 MB: rechazado", resumen(r));
  r = await subir(new File([PNG], "logo2.png", { type: "image/png" }));
  const logo2 = (await fila("tenant_marca"))?.logo_url ?? "";
  verificar(destino(r) === `${rutaMarca}?ok=imagen_guardada` && logo2 !== logo1, "reemplazar el logo", resumen(r));
  const objetos = await listarObjetos();
  verificar(objetos.length === 1 && logo2.endsWith(`/${objetos[0]}`), "la imagen anterior se borró del bucket", objetos.join(", "));
  r = await subir(new File([PNG], "foto.png", { type: "image/png" }), "foto_perfil");
  const foto = (await fila("tenant_marca"))?.foto_perfil_url ?? "";
  verificar(destino(r) === `${rutaMarca}?ok=imagen_guardada` && foto.startsWith(`${PREFIJO_PUBLICO}${tenantId}/foto_perfil-`), "foto de perfil: se sube", resumen(r));

  console.log("\nTextos y contacto:");
  const rutaTextos = `${base}/textos`;
  pagina = await M.get(rutaTextos);
  const textos = {
    slug, rubro: "Estética", tagline: "Cuidado com carinho", inicio_titulo: "Bem-vinda ao", inicio_destacado: "Cliente C1",
    inicio_texto: "Agende online.", sobre_mi_titulo: "", sobre_mi_texto: "", nota_reservas: "",
    whatsapp: "(11) 91234-5678", instagram: "https://instagram.com/cliente.c1/", email_contacto: "contato@example.com",
    direccion: "São Paulo",
  };
  r = await M.enviar(rutaTextos, pagina.html, "form-textos", { ...textos, whatsapp: "123" });
  verificar(destino(r) === `${rutaTextos}?error=whatsapp`, "WhatsApp inválido: rechazado", resumen(r));
  r = await M.enviar(rutaTextos, pagina.html, "form-textos", { ...textos, inicio_titulo: "" });
  verificar(destino(r) === `${rutaTextos}?error=inicio_titulo`, "título de inicio vacío: rechazado", resumen(r));
  r = await M.enviar(rutaTextos, pagina.html, "form-textos", textos);
  verificar(destino(r) === `${rutaTextos}?ok=guardado`, "textos guardados", resumen(r));
  const marcaTextos = await fila("tenant_marca");
  verificar(
    marcaTextos?.whatsapp === "+5511912345678" && marcaTextos.instagram === "cliente.c1" && marcaTextos.sobre_mi_titulo === null,
    "WhatsApp en E.164, Instagram sin URL y vacíos en null",
    JSON.stringify({ whatsapp: marcaTextos?.whatsapp, instagram: marcaTextos?.instagram }),
  );
  const S = new Navegador(HOST_CLIENTE);
  r = await S.get("/");
  verificar(r.status === 200 && r.html.includes("Bem-vinda ao"), "el sitio público muestra los textos nuevos", String(r.status));

  console.log("\nMódulos:");
  const rutaModulos = `${base}/modulos`;
  pagina = await M.get(rutaModulos);
  r = await M.enviar(rutaModulos, pagina.html, "form-modulos", { slug, modulo_turnos: "on", modulo_cursos: "on" });
  verificar(destino(r) === `${rutaModulos}?ok=guardado`, "módulos guardados", resumen(r));
  const conModulos = await leerTenant();
  verificar(conModulos?.modulo_turnos && conModulos.modulo_cursos && !conModulos.modulo_faq, "las casillas sin tildar se apagan");

  console.log("\nUsuario del cliente:");
  const rutaUsuario = `${base}/usuario`;
  pagina = await M.get(rutaUsuario);
  verificar(pagina.html.includes('id="form-usuario-cliente"'), "sin usuario, se ofrece crearlo");
  const invitar = (email) => M.enviar(rutaUsuario, pagina.html, "form-usuario-cliente", { slug, email });
  r = await invitar("no-es-un-email");
  verificar(destino(r) === `${rutaUsuario}?error=email`, "email inválido: rechazado", resumen(r));
  r = await invitar(emailMaster);
  verificar(destino(r) === `${rutaUsuario}?error=usuario_master`, "el email del master: rechazado", resumen(r));
  r = await invitar(emailOtro);
  verificar(destino(r) === `${rutaUsuario}?error=usuario_de_otro`, "un email de otro cliente: rechazado", resumen(r));
  const linksAntes = ocurrencias(reInvitacion(emailCliente)).length;
  r = await invitar(emailCliente);
  verificar(destino(r) === `${rutaUsuario}?ok=usuario_creado`, "crea el usuario del cliente", resumen(r));
  const { data: perfil } = await admin.from("perfiles").select("user_id, rol").eq("tenant_id", tenantId).maybeSingle();
  if (!perfil) throw new Error("no se creó el perfil del cliente");
  const clienteUserId = perfil.user_id;
  usuariosCreados.push(clienteUserId);
  verificar(perfil.rol === "cliente", "perfil cliente del tenant");
  const link = new URL(await esperarNueva(reInvitacion(emailCliente), linksAntes));
  verificar(
    link.host === HOST_CLIENTE && link.pathname === "/admin/restablecer",
    "el link de invitación lleva al panel del cliente",
    `${link.host}${link.pathname}`,
  );
  pagina = await M.get(rutaUsuario);
  verificar(
    !pagina.html.includes('id="form-usuario-cliente"') && pagina.html.includes(emailCliente),
    "con un usuario, el alta desaparece y el usuario aparece en la lista",
  );

  console.log("\nEl cliente define su contraseña y entra:");
  const C = new Navegador(HOST_CLIENTE);
  const rutaLink = `${link.pathname}${link.search}`;
  pagina = await C.get(rutaLink);
  r = await C.enviar(rutaLink, pagina.html, "form-restablecer", {
    token_hash: link.searchParams.get("token_hash"),
    password: claveCliente,
    confirmacion: claveCliente,
  });
  verificar(destino(r) === "/admin/login?info=contrasena_cambiada", "define su contraseña con el link", resumen(r));
  const codigosCliente = ocurrencias(reCodigo(emailCliente)).length;
  r = await ingresar(C, "/admin", emailCliente, claveCliente);
  verificar(destino(r) === "/admin/verificar?info=codigo_enviado", "ingresa: pide el código", resumen(r));
  const codigoCliente = await esperarNueva(reCodigo(emailCliente), codigosCliente);
  pagina = await C.get("/admin/verificar");
  r = await C.enviar("/admin/verificar", pagina.html, "form-verificar", { codigo: codigoCliente, recordar: "on" });
  verificar(destino(r) === "/admin", "código correcto: entra a su panel", resumen(r));
  r = await C.get("/admin");
  verificar(r.status === 200 && r.html.includes("Olá, Cliente C1"), "su panel responde con su nombre, en portugués", String(r.status));

  console.log("\nUna action del master desde la sesión del cliente:");
  const htmlDatos = (await M.get(base)).html;
  r = await C.enviar("/admin", htmlDatos, "form-estado", { slug, estado: "suspendido" });
  verificar(r.status >= 400 && (await leerTenant())?.estado === "activo", "el cliente no puede usar actions del master", resumen(r));

  console.log("\nAcciones sobre el usuario:");
  const contarDispositivos = async () =>
    (await admin.from("dispositivos_confiables").select("id", { count: "exact", head: true }).eq("user_id", clienteUserId)).count;
  verificar((await contarDispositivos()) === 1, "el cliente tiene un dispositivo recordado");
  pagina = await M.get(rutaUsuario);
  r = await M.enviar(rutaUsuario, pagina.html, `form-revocar-${clienteUserId}`, { slug, user_id: masterUserId });
  verificar(destino(r) === `${rutaUsuario}?error=usuario_no_encontrado`, "revocar a un usuario de otro: rechazado", resumen(r));
  r = await M.enviar(rutaUsuario, pagina.html, `form-revocar-${clienteUserId}`, { slug, user_id: clienteUserId });
  verificar(destino(r) === `${rutaUsuario}?ok=dispositivos_revocados` && (await contarDispositivos()) === 0, "revocar dispositivos recordados", resumen(r));
  const linksAntesReenvio = ocurrencias(reInvitacion(emailCliente)).length;
  r = await M.enviar(rutaUsuario, pagina.html, `form-reenviar-link-${clienteUserId}`, { slug, user_id: clienteUserId });
  verificar(destino(r) === `${rutaUsuario}?ok=link_reenviado`, "reenviar el link de contraseña", resumen(r));
  await esperarNueva(reInvitacion(emailCliente), linksAntesReenvio);
  verificar(true, "el link nuevo salió en el log");

  console.log("\nCredenciales:");
  const rutaCred = `${base}/credenciales`;
  pagina = await M.get(rutaCred);
  const tokenMp = `TEST-${randomBytes(12).toString("hex")}-e2e`;
  r = await M.enviar(rutaCred, pagina.html, "form-mp", { slug, mp_access_token: "hola", mp_public_key: "", mp_webhook_secret: "" });
  verificar(destino(r) === `${rutaCred}?error=mp_access_token`, "access token con formato inválido: rechazado", resumen(r));
  r = await M.enviar(rutaCred, pagina.html, "form-mp", { slug, mp_access_token: "", mp_public_key: "TEST-public-key-e2e", mp_webhook_secret: "" });
  verificar(destino(r) === `${rutaCred}?error=mp_sin_access_token`, "sin access token guardado ni nuevo: rechazado", resumen(r));
  verificar((await fila("tenant_credenciales"))?.mp_origen === null, "el rechazo no fija el origen");
  r = await M.enviar(rutaCred, pagina.html, "form-mp", { slug, mp_access_token: tokenMp, mp_public_key: "TEST-public-key-e2e", mp_webhook_secret: "" });
  verificar(destino(r) === `${rutaCred}?ok=mp_guardado`, "Mercado Pago manual guardado", resumen(r));
  const credMp = await fila("tenant_credenciales");
  verificar(/^v1\./.test(credMp?.mp_access_token ?? "") && !credMp.mp_access_token.includes(tokenMp), "el access token se guarda cifrado");
  let descifrado = null;
  try {
    descifrado = descifrarComoLaApp(credMp.mp_access_token, tenantId, "mp_access_token");
  } catch {
    // queda null
  }
  verificar(descifrado === tokenMp, "se descifra con CREDENCIALES_KEY y el AAD del tenant y la columna");
  verificar(
    credMp.mp_origen === "manual" && credMp.mp_public_key === "TEST-public-key-e2e" && credMp.mp_webhook_secret === null,
    "origen manual, public key en claro y secreto del webhook sin cargar",
  );
  const secretoWebhook = randomBytes(16).toString("hex");
  r = await M.enviar(rutaCred, pagina.html, "form-mp", { slug, mp_access_token: "", mp_public_key: "", mp_webhook_secret: secretoWebhook });
  const credMp2 = await fila("tenant_credenciales");
  verificar(
    destino(r) === `${rutaCred}?ok=mp_guardado` &&
      credMp2?.mp_access_token === credMp.mp_access_token &&
      credMp2.mp_public_key === "TEST-public-key-e2e" &&
      credMp2.mp_origen === "manual" &&
      /^v1\./.test(credMp2.mp_webhook_secret ?? ""),
    "solo el secreto del webhook: se cifra y lo demás se mantiene",
    resumen(r),
  );
  pagina = await M.get(rutaCred);
  verificar(
    !pagina.html.includes(tokenMp) && !pagina.html.includes(secretoWebhook) && pagina.html.includes("configurado ✓"),
    "el panel no muestra el token ni el secreto (solo configurado ✓)",
  );

  const usuarioGmail = `e2e-c1-${sufijo}@gmail.com`;
  const otraCuentaGmail = `e2e-c1-otra-${sufijo}@gmail.com`;
  const claveGmailFalsa = "abcdabcdabcdabcd";
  const remitente = "Remitente E2E";
  r = await M.enviar(rutaCred, pagina.html, "form-gmail", { slug, smtp_usuario: "no-es-email", smtp_password: "", smtp_nombre_remitente: "" });
  verificar(destino(r) === `${rutaCred}?error=gmail_usuario`, "cuenta de Gmail inválida: rechazada", resumen(r));
  const FALLOS = ["gmail_autenticacion", "gmail_conexion", "gmail_otro"];
  r = await M.enviar(rutaCred, pagina.html, "form-gmail", {
    slug, smtp_usuario: usuarioGmail, smtp_password: "abcd abcd abcd abcd", smtp_nombre_remitente: "Cliente C1",
  });
  verificar(FALLOS.includes(parametro(r, "error")), "Gmail con datos falsos: la prueba falla", resumen(r));
  verificar((await fila("tenant_credenciales"))?.smtp_usuario === null, "datos que no pasan la prueba: no se guardan");
  r = await M.enviar(rutaCred, pagina.html, "form-gmail", { slug, smtp_usuario: usuarioGmail, smtp_password: "", smtp_nombre_remitente: "" });
  verificar(destino(r) === `${rutaCred}?error=gmail_sin_contrasena`, "sin contraseña guardada ni nueva: rechazado", resumen(r));
  // Una configuración guardada (como la guardaría la app) que deja de funcionar.
  const sembrarGmail = async (smtpPassword) => {
    const { error } = await admin
      .from("tenant_credenciales")
      .update({ smtp_usuario: usuarioGmail, smtp_password: smtpPassword, smtp_nombre_remitente: remitente, smtp_estado: "ok", smtp_ultimo_error: null })
      .eq("tenant_id", tenantId);
    if (error) throw new Error(`sembrar Gmail: ${error.message}`);
  };
  await sembrarGmail(cifrarComoLaApp(claveGmailFalsa, tenantId, "smtp_password"));
  pagina = await M.get(rutaCred);
  verificar(
    pagina.html.includes(`value="${remitente}"`) && pagina.html.includes(`value="${usuarioGmail}"`) && !pagina.html.includes(claveGmailFalsa),
    "el panel muestra la cuenta y el remitente guardados, no la contraseña",
  );
  r = await M.enviar(rutaCred, pagina.html, "form-gmail", { slug, smtp_usuario: otraCuentaGmail, smtp_password: "", smtp_nombre_remitente: remitente });
  const credOtra = await fila("tenant_credenciales");
  verificar(
    destino(r) === `${rutaCred}?error=gmail_contrasena_cuenta_nueva` && credOtra?.smtp_usuario === usuarioGmail && credOtra.smtp_estado === "ok",
    "otra cuenta sin contraseña: no se usa la guardada ni se cambia nada",
    resumen(r),
  );
  // Contraseña cifrada con el AAD de otra columna: la app no la puede descifrar.
  await sembrarGmail(cifrarComoLaApp(claveGmailFalsa, tenantId, "mp_access_token"));
  r = await M.enviar(rutaCred, pagina.html, "form-gmail", { slug, smtp_usuario: usuarioGmail, smtp_password: "", smtp_nombre_remitente: remitente });
  verificar(destino(r) === `${rutaCred}?error=credencial_ilegible`, "contraseña guardada ilegible (AAD de otra columna): pide recargarla", resumen(r));
  await sembrarGmail(cifrarComoLaApp(claveGmailFalsa, tenantId, "smtp_password"));
  r = await M.enviar(rutaCred, pagina.html, "form-gmail", { slug, smtp_usuario: usuarioGmail, smtp_password: "", smtp_nombre_remitente: remitente });
  verificar(FALLOS.includes(parametro(r, "error")), "probar la configuración guardada: falla", resumen(r));
  const credGmail = await fila("tenant_credenciales");
  verificar(
    credGmail?.smtp_estado === "error" &&
      !!credGmail.smtp_ultimo_error &&
      !credGmail.smtp_ultimo_error.includes(claveGmailFalsa) &&
      !credGmail.smtp_ultimo_error.includes(usuarioGmail),
    "se registra el error, sin datos sensibles",
    `estado ${credGmail?.smtp_estado ?? "sin fila"}`,
  );
  pagina = await M.get("/");
  const inicioFila = pagina.html.indexOf(`>${slug}<`);
  const filaLista = inicioFila < 0 ? "" : pagina.html.slice(inicioFila, pagina.html.indexOf("</tr>", inicioFila));
  verificar(filaLista.includes("Email con error"), "la lista de clientes muestra la alerta de email en su fila");

  console.log("\nSuspender y reactivar:");
  pagina = await M.get(base);
  r = await M.enviar(base, pagina.html, "form-estado", { slug, estado: "suspendido" });
  verificar(destino(r) === `${base}?ok=suspendido` && (await leerTenant())?.estado === "suspendido", "suspender", resumen(r));
  r = await S.get("/");
  verificar(r.status === 200 && r.html.includes("indisponível"), "el sitio público muestra que no está disponible", String(r.status));
  r = await C.get("/admin");
  verificar(
    r.html.includes("suspenso") && !r.html.includes("Olá,"),
    "con el cliente suspendido su panel muestra el aviso y no deja entrar",
    resumen(r),
  );
  pagina = await M.get(rutaUsuario);
  r = await M.enviar(rutaUsuario, pagina.html, `form-reenviar-link-${clienteUserId}`, { slug, user_id: clienteUserId });
  verificar(destino(r) === `${rutaUsuario}?error=cliente_suspendido`, "con el cliente suspendido no se envían links", resumen(r));
  pagina = await M.get(base);
  r = await M.enviar(base, pagina.html, "form-estado", { slug, estado: "activo" });
  verificar(destino(r) === `${base}?ok=reactivado` && (await leerTenant())?.estado === "activo", "reactivar", resumen(r));
  r = await S.get("/");
  verificar(r.status === 200 && r.html.includes("Bem-vinda ao"), "el sitio vuelve a estar en línea", String(r.status));
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

const hmacEmail = (dominio, e) => createHmac("sha256", secretoMfa).update(`${dominio}|${e}`).digest("hex");

try {
  const { data: gisel, error: errorGisel } = await admin.from("tenants").select("id").eq("slug", "gisel").single();
  if (errorGisel) throw new Error(`tenant gisel: ${errorGisel.message}`);
  masterUserId = await crearUsuario(emailMaster, claveMaster, { rol: "master", tenant_id: null });
  await crearUsuario(emailOtro, randomBytes(18).toString("base64url"), { rol: "cliente", tenant_id: gisel.id });
  await prueba();
} catch (e) {
  console.error(`\nError en la prueba: ${e.message}`);
  fallas++;
} finally {
  console.log("\nLimpieza:");
  const id = tenantId ?? (await leerTenant())?.id ?? null;
  if (id) {
    const objetos = await listarObjetos(id).catch(() => []);
    if (objetos.length) {
      const { error } = await admin.storage.from("sitios").remove(objetos.map((o) => `${id}/${o}`));
      if (error) {
        console.error(`✗ limpieza: imágenes: ${error.message}`);
        fallas++;
      }
    }
    const { data: perfiles, error: errorPerfiles } = await admin.from("perfiles").select("user_id").eq("tenant_id", id);
    if (errorPerfiles) {
      console.error(`✗ limpieza: perfiles: ${errorPerfiles.message}`);
      fallas++;
    }
    for (const p of perfiles ?? []) if (!usuariosCreados.includes(p.user_id)) usuariosCreados.push(p.user_id);
  }
  // Si la prueba se cortó entre crear el usuario del cliente y su perfil, el usuario no aparece
  // por el perfil: se lo busca por su email (único de esta corrida).
  try {
    const idPorEmail = await idDeUsuarioPorEmail(emailCliente);
    if (idPorEmail && !usuariosCreados.includes(idPorEmail)) usuariosCreados.push(idPorEmail);
  } catch (e) {
    console.error(`✗ limpieza: buscar el usuario del cliente: ${e.message}`);
    fallas++;
  }
  for (const uid of usuariosCreados) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) {
      console.error(`✗ limpieza: usuario ${uid}: ${error.message}`);
      fallas++;
    }
  }
  if (id) {
    // marca, configuración y credenciales se borran en cascada.
    const { error } = await admin.from("tenants").delete().eq("id", id);
    if (error) {
      console.error(`✗ limpieza: tenant: ${error.message}`);
      fallas++;
    }
  }
  const emails = [emailMaster, emailCliente, emailOtro];
  const borrados = await Promise.all([
    admin.from("intentos_login").delete().in("email_hash", emails.map((e) => hmacEmail("login", e))),
    admin.from("pedidos_recuperacion").delete().in("email_hash", emails.map((e) => hmacEmail("recuperacion", e))),
    admin.from("intentos_login").delete().in("ip", ipsUsadas),
    admin.from("pedidos_recuperacion").delete().in("ip", ipsUsadas),
  ]);
  for (const { error } of borrados) {
    if (error) {
      console.error(`✗ limpieza: ${error.message}`);
      fallas++;
    }
  }
  const quedan = await Promise.all([
    leerTenant().then((t) => (t ? 1 : 0)),
    listarObjetos(id).then((o) => o.length).catch(() => 1),
    ...usuariosCreados.map((uid) => admin.auth.admin.getUserById(uid).then((r) => (r.data?.user ? 1 : 0))),
    // Códigos, dispositivos y perfiles se borran en cascada con el usuario.
    ...["perfiles", "codigos_login", "dispositivos_confiables"].map((t) =>
      admin.from(t).select("user_id", { count: "exact", head: true }).in("user_id", usuariosCreados).then((r) => r.count ?? 1),
    ),
    // Marca, configuración y credenciales se borran en cascada con el tenant.
    ...(id
      ? ["perfiles", "tenant_marca", "configuracion_negocio", "tenant_credenciales"].map((t) =>
          admin.from(t).select("tenant_id", { count: "exact", head: true }).eq("tenant_id", id).then((r) => r.count ?? 1),
        )
      : []),
    ...["intentos_login", "pedidos_recuperacion"].map((t) =>
      admin.from(t).select("id", { count: "exact", head: true }).in("ip", ipsUsadas).then((r) => r.count ?? 1),
    ),
  ]);
  verificar(
    quedan.every((n) => n === 0),
    "no quedan el cliente, sus filas, sus imágenes, los usuarios de prueba, sus perfiles, códigos, dispositivos ni intentos",
    quedan.join(","),
  );
}

console.log(fallas === 0 ? "\nE2E OK" : `\n${fallas} verificación(es) fallaron`);
process.exit(fallas === 0 ? 0 : 1);
