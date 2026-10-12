// Prueba de punta a punta del login en dos pasos contra el servidor en marcha (puerto 3000).
// Se comporta como un navegador sin JavaScript: los formularios con server actions llevan
// un campo oculto $ACTION_ID_…, y Next ejecuta la action y responde 303 con Location.
// Crea usuarios temporales (dos clientes de "gisel" y un master) y los borra al terminar,
// junto con sus filas de intentos de login y pedidos de recuperación.
//   dev <log>  servidor de desarrollo. <log> es el archivo con su salida, de donde se leen
//              los códigos y los links que imprime "[MFA dev]". El servidor tiene que
//              correr con CABECERA_IP_CONFIABLE=x-real-ip (solo en su entorno, no en el
//              .env.local): cada "navegador" manda su propia IP falsa en X-Real-IP, y así se
//              prueba el límite de login por email e IP.
//   docker     contenedor de producción sin email de plataforma: el login tiene que fallar cerrado.
// Uso: node --env-file=.env.local scripts/e2e-login.mjs dev <log> | docker
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { request } from "node:http";

const [modo, rutaLog] = process.argv.slice(2);
if (!(modo === "dev" && rutaLog) && modo !== "docker") {
  console.error("Uso: node --env-file=.env.local scripts/e2e-login.mjs dev <log> | docker");
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
const HOST_TENANT = "gisel.localhost:3000";
const HOST_MASTER = "app.localhost:3000";
const sufijo = Date.now().toString(36);
const email = `e2e-login-${sufijo}@example.com`;
const emailMaster = `e2e-master-${sufijo}@example.com`;
const emailInexistente = `e2e-nadie-${sufijo}@example.com`;
const emailOtp = `e2e-otp-${sufijo}@example.com`;
const claveInicial = randomBytes(18).toString("base64url");
const claveNueva = randomBytes(18).toString("base64url");
const claveMaster = randomBytes(18).toString("base64url");

let fallas = 0;
function verificar(ok, descripcion, detalle) {
  console.log(`${ok ? "✓" : "✗"} ${descripcion}`);
  if (!ok) {
    fallas++;
    if (detalle) console.log(`    (${detalle})`);
  }
}

/** Ruta y query de la redirección (Location puede venir absoluta o relativa). */
function destino(r) {
  if (!r.location) return "";
  const u = new URL(r.location, "http://base");
  return `${u.pathname}${u.search}`;
}
const resumen = (r) => `${r.status} ${r.location}`;
/** Set-Cookie sin el valor (solo nombre y atributos), para mostrarlo si falla una verificación. */
const atributosCookie = (linea) => linea.replace(/^([^=;]*)=[^;]*/, "$1=…");

function idDeAccion(html, formId) {
  const inicio = html.indexOf(`id="${formId}"`);
  if (inicio < 0) throw new Error(`la página no tiene el formulario #${formId}`);
  const m = html.slice(inicio, html.indexOf("</form>", inicio)).match(/name="(\$ACTION_ID_[0-9a-zA-Z]+)"/);
  if (!m) throw new Error(`#${formId} no tiene el campo $ACTION_ID_`);
  return m[1];
}

/** IP falsa de documentación (TEST-NET-3) para cada navegador. */
let siguienteIp = 1;
const ipsUsadas = [];
function ipFalsa() {
  const ip = `203.0.113.${siguienteIp++}`;
  ipsUsadas.push(ip);
  return ip;
}

class Navegador {
  constructor(host, ip = ipFalsa()) {
    this.host = host;
    this.ip = ip;
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

  tieneSesion() {
    return [...this.cookies.keys()].some((k) => k.startsWith("sb-"));
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
          const setCookie = res.headers["set-cookie"] ?? [];
          this.guardar(setCookie);
          resolve({
            status: res.statusCode,
            location: res.headers.location ?? "",
            setCookie,
            html: Buffer.concat(partes).toString("utf8"),
          });
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

  /** Envía el formulario con ese id como un navegador sin JavaScript (multipart). */
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
const reLink = (de) => new RegExp(`\\[MFA dev\\] link de recuperaci.n para ${escaparRegex(de)}: (\\S+)`, "g");
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

async function pruebaDev() {
  console.log("\nPanel del cliente (gisel):");
  const T = new Navegador(HOST_TENANT);
  let r = await T.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/login", "sin sesión, /admin redirige al login", resumen(r));

  r = await ingresar(T, "/admin", email, `${claveInicial}-mal`);
  verificar(r.status === 303 && destino(r) === "/admin/login?error=credenciales", "contraseña mala: error genérico", resumen(r));

  const codigosAntes = ocurrencias(reCodigo(email)).length;
  r = await ingresar(T, "/admin", email, claveInicial);
  verificar(destino(r) === "/admin/verificar?info=codigo_enviado", "contraseña buena: pide el código", resumen(r));
  verificar(T.tieneSesion(), "quedó la sesión de Supabase");

  r = await T.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/verificar", "con sesión y sin código, /admin redirige a verificar", resumen(r));
  r = await T.get("/admin/servicios");
  verificar(r.status === 307 && destino(r) === "/admin/verificar", "con sesión y sin código, /admin/servicios redirige a verificar", resumen(r));

  const codigo = await esperarNueva(reCodigo(email), codigosAntes);
  verificar(/^\d{6}$/.test(codigo), "el código se imprimió en la consola del servidor ([MFA dev])");

  let pagina = await T.get("/admin/verificar");
  verificar(pagina.status === 200, "la pantalla de verificación responde");
  const htmlVerificar = pagina.html;
  r = await T.enviar("/admin/verificar", pagina.html, "form-reenviar", {});
  verificar(destino(r) === "/admin/verificar?error=espera", "no se puede reenviar antes de 60 s", resumen(r));
  const momentoCodigo = Date.now();

  // 5 intentos como máximo por código: después ni el correcto sirve.
  const incorrecto = codigo === "000000" ? "111111" : "000000";
  for (let i = 1; i <= 5; i++) {
    r = await T.enviar("/admin/verificar", pagina.html, "form-verificar", { codigo: incorrecto });
    verificar(destino(r) === "/admin/verificar?error=incorrecto", `código incorrecto (intento ${i}): error`, resumen(r));
  }
  r = await T.enviar("/admin/verificar", pagina.html, "form-verificar", { codigo });
  verificar(destino(r) === "/admin/verificar?error=agotado", "después de 5 intentos, ni el código correcto sirve", resumen(r));

  // Reenvío después de la espera de 60 s: código nuevo.
  const espera = 61_000 - (Date.now() - momentoCodigo);
  if (espera > 0) {
    console.log(`  (esperando ${Math.ceil(espera / 1000)} s para poder reenviar el código)`);
    await dormir(espera);
  }
  const codigosAntesReenvio = ocurrencias(reCodigo(email)).length;
  pagina = await T.get("/admin/verificar");
  r = await T.enviar("/admin/verificar", pagina.html, "form-reenviar", {});
  verificar(destino(r) === "/admin/verificar?info=reenviado", "pasados 60 s, el reenvío funciona", resumen(r));
  const codigoNuevo = await esperarNueva(reCodigo(email), codigosAntesReenvio);
  verificar(codigoNuevo !== undefined, "el código reenviado se imprimió en la consola");

  r = await T.enviar("/admin/verificar", pagina.html, "form-verificar", { codigo: codigoNuevo, recordar: "on" });
  verificar(r.status === 303 && destino(r) === "/admin", "código correcto: entra al panel", resumen(r));
  const mfa = r.setCookie.find((c) => c.startsWith("mfa=")) ?? "";
  verificar(/HttpOnly/i.test(mfa) && /SameSite=lax/i.test(mfa) && !/;\s*Secure/i.test(mfa), "cookie mfa httpOnly, SameSite=Lax y sin Secure en http", atributosCookie(mfa));
  const dispositivo = r.setCookie.find((c) => c.startsWith("dispositivo=")) ?? "";
  verificar(/HttpOnly/i.test(dispositivo) && /Max-Age=2592000/i.test(dispositivo), "cookie dispositivo httpOnly por 30 días", atributosCookie(dispositivo));

  r = await T.get("/admin");
  verificar(r.status === 200 && r.html.includes("Hola,"), "con sesión y código, el panel responde", String(r.status));
  for (const ruta of ["/admin/servicios", "/admin/configuracion"]) {
    r = await T.get(ruta);
    verificar(r.status === 200, `${ruta} responde`, String(r.status));
  }

  const mfaOriginal = T.cookies.get("mfa");
  T.cookies.set("mfa", `${mfaOriginal.slice(0, -2)}xx`);
  r = await T.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/verificar", "cookie mfa alterada: vuelve a verificar", resumen(r));
  T.cookies.set("mfa", mfaOriginal);

  pagina = await T.get("/admin");
  r = await T.enviar("/admin", pagina.html, "form-salir", {});
  verificar(r.status === 303 && destino(r) === "/admin/login", "salir lleva al login", resumen(r));
  verificar(!T.cookies.has("mfa") && T.cookies.has("dispositivo"), "salir borra mfa y conserva el dispositivo");
  verificar(!T.tieneSesion(), "salir cierra la sesión de Supabase");
  r = await T.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/login", "después de salir, /admin redirige al login", resumen(r));

  const codigosAlSalir = ocurrencias(reCodigo(email)).length;
  r = await ingresar(T, "/admin", email, claveInicial);
  verificar(destino(r) === "/admin", "dispositivo recordado: entra sin código", resumen(r));
  verificar(ocurrencias(reCodigo(email)).length === codigosAlSalir, "no se generó un código nuevo");
  r = await T.get("/admin");
  verificar(r.status === 200, "el panel responde con el dispositivo recordado");

  console.log("\nÁrea master y rutas internas:");
  const M = new Navegador(HOST_MASTER);
  r = await M.get("/");
  verificar(r.status === 307 && destino(r) === "/login", "app.: sin sesión, redirige a /login", resumen(r));
  r = await ingresar(M, "", email, claveInicial);
  verificar(destino(r) === "/login?error=credenciales", "un usuario cliente no entra al panel master", resumen(r));
  verificar(!M.tieneSesion(), "y no le queda sesión en app.");
  verificar((await M.get("/master")).status === 404, "app.: /master directo da 404");
  verificar((await T.get("/master/login")).status === 404, "gisel: /master da 404");

  console.log("\nRecuperación de contraseña:");
  const R = new Navegador(HOST_TENANT);
  const linksAntes = ocurrencias(reLink(email)).length;
  pagina = await R.get("/admin/recuperar");
  r = await R.enviar("/admin/recuperar", pagina.html, "form-recuperar", { email });
  const respuestaExistente = destino(r);
  r = await R.enviar("/admin/recuperar", pagina.html, "form-recuperar", { email: emailInexistente });
  verificar(
    respuestaExistente === "/admin/recuperar?info=recuperacion_enviada" && destino(r) === respuestaExistente,
    "misma respuesta exista o no la cuenta",
    `${respuestaExistente} / ${destino(r)}`,
  );
  const link = new URL(await esperarNueva(reLink(email), linksAntes));
  verificar(link.host === HOST_TENANT && link.pathname === "/admin/restablecer", "el link apunta al sitio del tenant", link.href);
  await dormir(1000);
  verificar(ocurrencias(reLink(emailInexistente)).length === 0, "para un email inexistente no se genera link");

  const rutaLink = `${link.pathname}${link.search}`;
  pagina = await R.get(rutaLink);
  verificar(pagina.status === 200 && pagina.html.includes('id="form-restablecer"'), "el link abre el formulario (sin consumir el token)");
  r = await R.enviar(rutaLink, pagina.html, "form-restablecer", {
    token_hash: link.searchParams.get("token_hash"),
    password: "corta",
    confirmacion: "corta",
  });
  verificar(destino(r).startsWith("/admin/restablecer?") && destino(r).includes("error=contrasena_corta"), "contraseña corta: error sin gastar el link", resumen(r));
  r = await R.enviar(rutaLink, pagina.html, "form-restablecer", {
    token_hash: link.searchParams.get("token_hash"),
    password: claveNueva,
    confirmacion: claveNueva,
  });
  verificar(destino(r) === "/admin/login?info=contrasena_cambiada", "la contraseña nueva se guarda", resumen(r));
  r = await R.enviar(rutaLink, pagina.html, "form-restablecer", {
    token_hash: link.searchParams.get("token_hash"),
    password: claveNueva,
    confirmacion: claveNueva,
  });
  verificar(destino(r) === "/admin/recuperar?error=link", "el link no se puede usar dos veces", resumen(r));

  // T tenía una sesión abierta (entró con el dispositivo recordado): el cambio la cierra.
  r = await T.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/login", "la sesión abierta antes del cambio quedó cerrada", resumen(r));

  r = await ingresar(new Navegador(HOST_TENANT), "/admin", email, claveInicial);
  verificar(destino(r) === "/admin/login?error=credenciales", "la contraseña vieja ya no sirve", resumen(r));
  const conDispositivo = new Navegador(HOST_TENANT);
  conDispositivo.cookies.set("dispositivo", T.cookies.get("dispositivo"));
  r = await ingresar(conDispositivo, "/admin", email, claveNueva);
  verificar(destino(r).startsWith("/admin/verificar?"), "después del cambio, el dispositivo recordado ya no saltea el código", resumen(r));

  console.log("\nLímite de intentos de login (por email e IP):");
  const atacante = new Navegador(HOST_TENANT);
  for (let i = 1; i <= 5; i++) {
    r = await ingresar(atacante, "/admin", email, `mala-${i}`);
    verificar(destino(r) === "/admin/login?error=credenciales", `contraseña mala desde la IP ${atacante.ip} (${i})`, resumen(r));
  }
  r = await ingresar(atacante, "/admin", email, claveNueva);
  verificar(destino(r) === "/admin/login?error=demasiados_intentos", "6.º intento desde esa IP: bloqueado (aun con la contraseña buena)", resumen(r));
  verificar(!atacante.tieneSesion(), "y no se le abre sesión");
  const duenio = new Navegador(HOST_TENANT);
  r = await ingresar(duenio, "/admin", email, claveNueva);
  verificar(
    destino(r).startsWith("/admin/verificar?") && !destino(r).includes("demasiados_intentos"),
    `desde otra IP (${duenio.ip}) la misma cuenta NO queda bloqueada`,
    resumen(r),
  );

  console.log("\nLogin del master (usuario master temporal):");
  const MM = new Navegador(HOST_MASTER);
  const codigosMaster = ocurrencias(reCodigo(emailMaster)).length;
  r = await ingresar(MM, "", emailMaster, claveMaster);
  verificar(destino(r) === "/verificar?info=codigo_enviado", "master: pide el código", resumen(r));
  r = await MM.get("/");
  verificar(r.status === 307 && destino(r) === "/verificar", "master: sin código, la home redirige a verificar", resumen(r));
  const codigoMaster = await esperarNueva(reCodigo(emailMaster), codigosMaster);
  pagina = await MM.get("/verificar");
  r = await MM.enviar("/verificar", pagina.html, "form-verificar", { codigo: codigoMaster });
  verificar(destino(r) === "/", "master: entra con el código", resumen(r));
  pagina = await MM.get("/");
  verificar(
    pagina.status === 200 && pagina.html.includes("Panel master") && pagina.html.includes(">gisel<"),
    "master: ve la lista de clientes (con gisel)",
    String(pagina.status),
  );
  r = await MM.enviar("/", pagina.html, "form-salir", {});
  verificar(destino(r) === "/login" && !MM.cookies.has("mfa") && !MM.tieneSesion(), "master: salir", resumen(r));
  r = await MM.get("/");
  verificar(r.status === 307 && destino(r) === "/login", "master: después de salir, la home redirige al login", resumen(r));

  const MT = new Navegador(HOST_TENANT);
  r = await ingresar(MT, "/admin", emailMaster, claveMaster);
  verificar(destino(r).startsWith("/admin/verificar?"), "master en gisel /admin: también pide el código", resumen(r));

  await pruebaSesionSinContrasena(htmlVerificar);
}

/**
 * Cookies de una sesión de Supabase obtenida con magic link (sin contraseña), con la clave
 * publicable, como lo haría cualquiera con signInWithOtp. Las escribe @supabase/ssr, con el
 * mismo formato que las de la app. Devuelve también el cliente, para comprobar que la sesión es válida.
 */
async function sesionPorMagicLink(emailUsuario) {
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: emailUsuario });
  if (error) throw new Error(`magic link: ${error.message}`);
  const cookies = new Map();
  const cliente = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (lista) => lista.forEach(({ name, value }) => (value ? cookies.set(name, value) : cookies.delete(name))),
    },
  });
  const { error: errorOtp } = await cliente.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (errorOtp) throw new Error(`verificar magic link: ${errorOtp.message}`);
  for (let i = 0; i < 20 && cookies.size === 0; i++) await dormir(50);
  if (cookies.size === 0) throw new Error("la sesión del magic link no escribió cookies");
  return { cookies, cliente };
}

async function pruebaSesionSinContrasena(htmlVerificar) {
  console.log("\nSesión sin contraseña (magic link con la clave publicable):");
  const { cookies, cliente } = await sesionPorMagicLink(emailOtp);
  const { data: datosUsuario } = await cliente.auth.getUser();
  verificar(datosUsuario.user?.email === emailOtp, "control: la sesión del magic link es válida para Supabase");

  const O = new Navegador(HOST_TENANT);
  for (const [k, v] of cookies) O.cookies.set(k, v);
  let r = await O.get("/admin/verificar");
  verificar(r.status === 307 && destino(r) === "/admin/login", "/admin/verificar redirige al login (no cuenta como primer factor)", resumen(r));
  r = await O.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/login", "/admin redirige al login", resumen(r));
  const codigosAntes = ocurrencias(reCodigo(emailOtp)).length;
  r = await O.enviar("/admin/verificar", htmlVerificar, "form-reenviar", {});
  verificar(destino(r) === "/admin/login", "pedir el código lleva al login", resumen(r));
  await dormir(1500);
  verificar(ocurrencias(reCodigo(emailOtp)).length === codigosAntes, "no se envía un código");

  const OM = new Navegador(HOST_MASTER);
  for (const [k, v] of cookies) OM.cookies.set(k, v);
  r = await OM.get("/");
  verificar(r.status === 307 && destino(r) === "/login", "app.: la home redirige al login", resumen(r));
}

async function pruebaDocker() {
  console.log("\nContenedor (producción):");
  const T = new Navegador(HOST_TENANT);
  let r = await T.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/login", "sin sesión, /admin redirige al login", resumen(r));
  verificar((await new Navegador(HOST_MASTER).get("/login")).status === 200, "app.: /login responde");
  if (process.env.PLATFORM_GMAIL_USER && process.env.PLATFORM_GMAIL_APP_PASSWORD) {
    console.log("- La cuenta de la plataforma está configurada: no se prueba la falla cerrada (mandaría un email real).");
    return;
  }
  r = await ingresar(T, "/admin", email, claveInicial);
  verificar(destino(r) === "/admin/login?error=envio_no_configurado", "sin email de plataforma, el login falla cerrado", resumen(r));
  verificar(!T.tieneSesion(), "y no queda sesión");
}

const hmacEmail = (dominio, e) => createHmac("sha256", secretoMfa).update(`${dominio}|${e}`).digest("hex");
const usuariosCreados = [];

async function crearUsuario(emailUsuario, clave, perfil) {
  const { data: creado, error } = await admin.auth.admin.createUser({ email: emailUsuario, password: clave, email_confirm: true });
  if (error) throw new Error(`usuario de prueba: ${error.message}`);
  usuariosCreados.push(creado.user.id);
  const { error: errorPerfil } = await admin.from("perfiles").insert({ user_id: creado.user.id, ...perfil });
  if (errorPerfil) throw new Error(`perfil de prueba: ${errorPerfil.message}`);
}

try {
  const { data: gisel, error: errorTenant } = await admin.from("tenants").select("id").eq("slug", "gisel").single();
  if (errorTenant) throw new Error(`tenant gisel: ${errorTenant.message}`);
  await crearUsuario(email, claveInicial, { rol: "cliente", tenant_id: gisel.id });
  if (modo === "dev") {
    await crearUsuario(emailMaster, claveMaster, { rol: "master", tenant_id: null });
    await crearUsuario(emailOtp, randomBytes(18).toString("base64url"), { rol: "cliente", tenant_id: gisel.id });
    await pruebaDev();
  } else {
    await pruebaDocker();
  }
} catch (e) {
  console.error(`\nError en la prueba: ${e.message}`);
  fallas++;
} finally {
  console.log("\nLimpieza:");
  // Códigos, dispositivos y perfiles se borran en cascada con el usuario.
  for (const id of usuariosCreados) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      console.error(`✗ limpieza: no se pudo borrar el usuario ${id}: ${error.message}`);
      fallas++;
    }
  }
  const emails = [email, emailMaster, emailInexistente, emailOtp];
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
    ...usuariosCreados.map((id) => admin.auth.admin.getUserById(id).then((r) => (r.data?.user ? 1 : 0))),
    ...["perfiles", "codigos_login", "dispositivos_confiables"].map((t) =>
      admin.from(t).select("user_id", { count: "exact", head: true }).in("user_id", usuariosCreados).then((r) => r.count ?? 1),
    ),
    admin.from("intentos_login").select("id", { count: "exact", head: true }).in("ip", ipsUsadas).then((r) => r.count ?? 1),
    admin.from("pedidos_recuperacion").select("id", { count: "exact", head: true }).in("ip", ipsUsadas).then((r) => r.count ?? 1),
  ]);
  verificar(quedan.every((n) => n === 0), "no quedan usuarios, perfiles, códigos, dispositivos ni intentos de prueba", quedan.join(","));
}

console.log(fallas === 0 ? "\nE2E OK" : `\n${fallas} verificación(es) fallaron`);
process.exit(fallas === 0 ? 0 : 1);
