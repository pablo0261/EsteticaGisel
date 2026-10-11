// Verifica el aislamiento entre tenants contra la base real (RLS).
// Crea dos tenants de prueba con una fila en cada tabla y un usuario cliente por
// tenant; comprueba que el usuario de A no lee, inserta ni modifica nada de B, que no
// puede tocar su propia marca/módulos/rol ni los registros del sistema, y qué ven un
// usuario sin perfil, un master y un anónimo. Al final borra todo.
// Uso: npm run test:aislamiento
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !secret || !publishable) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const opciones = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, opciones);
const sufijo = Date.now().toString(36);

const TABLAS_TENANT = [
  "servicios", "configuracion_negocio", "turnos", "cursos", "archivos_curso",
  "accesos_curso", "pagos", "intentos_reserva", "recordatorios_enviados",
  "testimonios", "tenant_marca",
];
/** Columnas que genera la base: se quitan al copiar una fila para insertarla en otro tenant. */
const COLUMNAS_GENERADAS = ["id", "token_gestion", "token_acceso", "creado_en", "enviado_en", "comprado_en"];

let fallas = 0;
function verificar(ok, descripcion) {
  console.log(`${ok ? "✓" : "✗"} ${descripcion}`);
  if (!ok) fallas++;
}
function mostrarError(r) {
  if (r.error) console.log(`    (error ${r.error.code}: ${r.error.message})`);
}
/** Escritura bloqueada por RLS: error 42501 o 0 filas afectadas. Cualquier otro error es falla. */
function bloqueado(r) {
  if (r.error && r.error.code === "42501") return true;
  if (!r.error && r.data.length === 0) return true;
  if (r.error) mostrarError(r);
  else console.log(`    (afectó ${r.data.length} fila(s))`);
  return false;
}
/** La operación debe fallar con ese código de error exacto. */
function esperaError(r, codigo) {
  if (r.error && r.error.code === codigo) return true;
  if (r.error) mostrarError(r);
  else console.log("    (no dio error)");
  return false;
}
/** Lectura que debe devolver 0 filas (RLS filtra, no da error). */
function vacio(r) {
  if (!r.error && r.data.length === 0) return true;
  if (r.error) mostrarError(r);
  else console.log(`    (devolvió ${r.data.length} fila(s))`);
  return false;
}

async function ok(promesa, que) {
  const { data, error } = await promesa;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
}

const tenantsCreados = [];
const usuariosCreados = [];

async function crearUsuario(etiqueta) {
  const email = `aislamiento-${etiqueta}-${sufijo}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data: creado, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`usuario ${etiqueta}: ${error.message}`);
  usuariosCreados.push(creado.user.id);
  return { userId: creado.user.id, email, password };
}

async function crearTenant(letra) {
  const { id: t } = await ok(
    admin.from("tenants").insert({ slug: `test-${letra}-${sufijo}`, nombre: `Test ${letra}` }).select("id").single(),
    "tenant",
  );
  tenantsCreados.push(t);
  await ok(admin.from("tenant_marca").insert({ tenant_id: t, inicio_titulo: "Test" }), "marca");
  await ok(admin.from("tenant_credenciales").insert({ tenant_id: t, mp_public_key: "secreto-de-prueba" }), "credenciales");
  await ok(admin.from("configuracion_negocio").insert({ tenant_id: t, horario_atencion: {} }), "configuración");
  const servicio = await ok(
    admin.from("servicios").insert({ tenant_id: t, nombre: "Servicio", duracion_minutos: 30 }).select("id").single(),
    "servicio",
  );
  await ok(
    admin.from("servicios").insert({ tenant_id: t, nombre: "Inactivo", duracion_minutos: 30, activo: false }),
    "servicio inactivo",
  );
  const turno = await ok(
    admin.from("turnos").insert({
      tenant_id: t, servicio_id: servicio.id, cliente_nombre: "C", cliente_email: "c@example.com",
      fecha_hora: new Date().toISOString(), duracion_minutos: 30,
    }).select("id").single(),
    "turno",
  );
  await ok(admin.from("recordatorios_enviados").insert({ tenant_id: t, turno_id: turno.id, tipo: "24h", canal: "email" }), "recordatorio");
  const curso = await ok(
    admin.from("cursos").insert({ tenant_id: t, titulo: "Curso", categoria: "profesional", estado: "publicado" }).select("id").single(),
    "curso",
  );
  await ok(
    admin.from("cursos").insert({ tenant_id: t, titulo: "Borrador", categoria: "profesional", estado: "borrador" }),
    "curso borrador",
  );
  await ok(admin.from("archivos_curso").insert({ tenant_id: t, curso_id: curso.id, nombre_archivo: "a.pdf", storage_path: "x", tipo: "pdf" }), "archivo");
  await ok(admin.from("accesos_curso").insert({ tenant_id: t, curso_id: curso.id, cliente_email: "c@example.com", expira_en: new Date().toISOString() }), "acceso");
  await ok(admin.from("pagos").insert({ tenant_id: t, tipo: "turno", referencia_id: turno.id, estado: "approved", monto: 1 }), "pago");
  await ok(admin.from("intentos_reserva").insert({ tenant_id: t, ip: "127.0.0.1" }), "intento");
  await ok(admin.from("testimonios").insert({ tenant_id: t, nombre: "N", texto: "T" }), "testimonio");

  const usuario = await crearUsuario(letra);
  await ok(admin.from("perfiles").insert({ user_id: usuario.userId, rol: "cliente", tenant_id: t }), "perfil");
  return { id: t, ...usuario, servicioId: servicio.id, cursoId: curso.id, turnoId: turno.id };
}

async function clienteLogueado(email, password) {
  const c = createClient(url, publishable, opciones);
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login: ${error.message}`);
  return c;
}

async function contar(tabla, tenantId) {
  const r = await admin.from(tabla).select("tenant_id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  if (r.error) throw new Error(`contar ${tabla}: ${r.error.message}`);
  return r.count ?? 0;
}

try {
  const a = await crearTenant("a");
  const b = await crearTenant("b");
  const usuarioA = await clienteLogueado(a.email, a.password);
  const anon = createClient(url, publishable, opciones);

  console.log("\nUsuario cliente del tenant A, sobre datos de B:");
  for (const tabla of TABLAS_TENANT) {
    const propios = await usuarioA.from(tabla).select("tenant_id").eq("tenant_id", a.id);
    verificar(!propios.error && propios.data.length > 0, `${tabla}: ve sus propias filas (control)`);
    verificar(vacio(await usuarioA.from(tabla).select("tenant_id").eq("tenant_id", b.id)), `${tabla}: no ve filas de B`);
    verificar(
      bloqueado(await usuarioA.from(tabla).update({ tenant_id: a.id }).eq("tenant_id", b.id).select("tenant_id")),
      `${tabla}: no modifica filas de B`,
    );
    verificar(
      bloqueado(await usuarioA.from(tabla).delete().eq("tenant_id", b.id).select("tenant_id")),
      `${tabla}: no borra filas de B`,
    );
    verificar((await contar(tabla, b.id)) > 0, `${tabla}: las filas de B siguen intactas`);

    const antesA = await contar(tabla, a.id);
    verificar(
      bloqueado(await usuarioA.from(tabla).update({ tenant_id: b.id }).eq("tenant_id", a.id).select("tenant_id")),
      `${tabla}: no mueve sus filas a B (WITH CHECK)`,
    );
    verificar((await contar(tabla, a.id)) === antesA, `${tabla}: las filas de A siguen en A`);

    const [fila] = await ok(admin.from(tabla).select("*").eq("tenant_id", a.id).limit(1), `leer ${tabla}`);
    const copia = { ...fila, tenant_id: b.id };
    for (const c of COLUMNAS_GENERADAS) delete copia[c];
    // En pagos el trigger (BEFORE, corre antes que el WITH CHECK) frena primero: el
    // cliente no ve turnos de B. El 42501 de pagos se prueba en "registros del sistema".
    const codigo = tabla === "pagos" ? "P0001" : "42501";
    verificar(esperaError(await usuarioA.from(tabla).insert(copia), codigo), `${tabla}: no puede insertar en B`);
  }
  verificar(
    esperaError(await usuarioA.from("tenants").insert({ slug: `test-x-${sufijo}`, nombre: "Intruso" }), "42501"),
    "tenants: no puede crear tenants",
  );
  verificar(
    esperaError(await usuarioA.from("perfiles").insert({ user_id: randomUUID(), rol: "master", tenant_id: null }), "42501"),
    "perfiles: no puede crear perfiles",
  );

  console.log("\nRegistros del sistema (solo lectura para el cliente):");
  verificar(
    esperaError(
      await usuarioA.from("pagos").insert({ tenant_id: a.id, tipo: "turno", referencia_id: a.turnoId, estado: "approved", monto: 1 }),
      "42501",
    ),
    "pagos: el cliente no inserta ni en su propio tenant",
  );

  console.log("\nIntegridad en la base (aun con service role):");
  const turnoCruzado = await admin.from("turnos").insert({
    tenant_id: a.id, servicio_id: b.servicioId, cliente_nombre: "X", cliente_email: "x@example.com",
    fecha_hora: new Date().toISOString(), duracion_minutos: 30,
  });
  verificar(esperaError(turnoCruzado, "23503"), "turnos: no puede apuntar a un servicio de otro tenant");
  const accesoCruzado = await admin.from("accesos_curso").insert({
    tenant_id: a.id, curso_id: b.cursoId, cliente_email: "x@example.com", expira_en: new Date().toISOString(),
  });
  verificar(esperaError(accesoCruzado, "23503"), "accesos_curso: no puede apuntar a un curso de otro tenant");
  const pagoCruzado = await admin.from("pagos").insert({
    tenant_id: a.id, tipo: "turno", referencia_id: b.turnoId, estado: "approved", monto: 1,
  });
  verificar(esperaError(pagoCruzado, "P0001"), "pagos: no puede apuntar a un turno de otro tenant");
  const pagoPropio = await admin.from("pagos").insert({
    tenant_id: a.id, tipo: "turno", referencia_id: a.turnoId, estado: "approved", monto: 1,
  });
  mostrarError(pagoPropio);
  verificar(!pagoPropio.error, "pagos: sí puede apuntar a un turno propio (control)");

  console.log("\nUsuario cliente del tenant A, sobre lo propio que no debe tocar:");
  verificar(vacio(await usuarioA.from("tenant_credenciales").select("tenant_id")), "tenant_credenciales: no lee ni las propias");
  const tenantsVisibles = await usuarioA.from("tenants").select("id");
  verificar(
    !tenantsVisibles.error && tenantsVisibles.data.length === 1 && tenantsVisibles.data[0].id === a.id,
    "tenants: solo ve el suyo",
  );
  verificar(
    bloqueado(await usuarioA.from("tenants").update({ modulo_galeria: true }).eq("id", a.id).select("id")),
    "tenants: no cambia sus propios módulos",
  );
  verificar(
    bloqueado(await usuarioA.from("tenant_marca").update({ color_primario: "#000000" }).eq("tenant_id", a.id).select("tenant_id")),
    "tenant_marca: no cambia su propia marca",
  );
  const perfilesVisibles = await usuarioA.from("perfiles").select("user_id");
  verificar(
    !perfilesVisibles.error && perfilesVisibles.data.length === 1 && perfilesVisibles.data[0].user_id === a.userId,
    "perfiles: solo ve el propio",
  );
  verificar(
    bloqueado(await usuarioA.from("perfiles").update({ rol: "master", tenant_id: null }).eq("user_id", a.userId).select("user_id")),
    "perfiles: no puede volverse master",
  );

  console.log("\nUsuario logueado sin perfil:");
  const sinPerfil = await crearUsuario("sin-perfil");
  const usuarioSinPerfil = await clienteLogueado(sinPerfil.email, sinPerfil.password);
  for (const tabla of [...TABLAS_TENANT, "tenants", "perfiles"]) {
    verificar(vacio(await usuarioSinPerfil.from(tabla).select("*")), `${tabla}: no ve nada`);
  }

  console.log("\nUsuario master:");
  const master = await crearUsuario("master");
  await ok(admin.from("perfiles").insert({ user_id: master.userId, rol: "master", tenant_id: null }), "perfil master");
  const usuarioMaster = await clienteLogueado(master.email, master.password);
  const serviciosMaster = await usuarioMaster.from("servicios").select("tenant_id").in("tenant_id", [a.id, b.id]);
  mostrarError(serviciosMaster);
  verificar(
    !serviciosMaster.error && serviciosMaster.data.length >= 4 &&
      serviciosMaster.data.some((s) => s.tenant_id === a.id) && serviciosMaster.data.some((s) => s.tenant_id === b.id),
    "servicios: ve los de A y B (incluidos inactivos)",
  );
  const tenantsMaster = await usuarioMaster.from("tenants").select("id").in("id", [a.id, b.id]);
  mostrarError(tenantsMaster);
  verificar(!tenantsMaster.error && tenantsMaster.data.length === 2, "tenants: ve A y B");

  console.log("\nVisitante anónimo:");
  for (const tabla of [
    "tenant_credenciales", "turnos", "pagos", "accesos_curso", "perfiles",
    "configuracion_negocio", "intentos_reserva", "recordatorios_enviados", "archivos_curso",
  ]) {
    verificar(vacio(await anon.from(tabla).select("*").limit(1)), `${tabla}: no es legible`);
  }
  const serviciosAnon = await anon.from("servicios").select("nombre").in("tenant_id", [a.id, b.id]);
  verificar(
    !serviciosAnon.error && serviciosAnon.data.length === 2 && serviciosAnon.data.every((s) => s.nombre === "Servicio"),
    "servicios: ve solo los activos",
  );
  const cursosAnon = await anon.from("cursos").select("estado").in("tenant_id", [a.id, b.id]);
  verificar(
    !cursosAnon.error && cursosAnon.data.length === 2 && cursosAnon.data.every((c) => c.estado === "publicado"),
    "cursos: ve solo los publicados",
  );
  const testimoniosAnon = await anon.from("testimonios").select("tenant_id").in("tenant_id", [a.id, b.id]);
  verificar(!testimoniosAnon.error && testimoniosAnon.data.length === 2, "testimonios: ve los activos");
  const tenantsAnon = await anon.from("tenants").select("id").in("id", [a.id, b.id]);
  verificar(!tenantsAnon.error && tenantsAnon.data.length === 2, "tenants: ve los activos");
  const marcaAnon = await anon.from("tenant_marca").select("tenant_id").in("tenant_id", [a.id, b.id]);
  verificar(!marcaAnon.error && marcaAnon.data.length === 2, "tenant_marca: ve la de tenants activos");

  await ok(admin.from("tenants").update({ estado: "suspendido" }).eq("id", b.id), "suspender B");
  verificar(vacio(await anon.from("servicios").select("nombre").eq("tenant_id", b.id)), "servicios: no ve los de un tenant suspendido");
  verificar(vacio(await anon.from("cursos").select("id").eq("tenant_id", b.id)), "cursos: no ve los de un tenant suspendido");
  verificar(vacio(await anon.from("testimonios").select("id").eq("tenant_id", b.id)), "testimonios: no ve los de un tenant suspendido");
  verificar(vacio(await anon.from("tenants").select("id").eq("id", b.id)), "tenants: no ve un tenant suspendido");
  verificar(vacio(await anon.from("tenant_marca").select("tenant_id").eq("tenant_id", b.id)), "tenant_marca: no ve la de un tenant suspendido");
} catch (e) {
  console.error(`\nError preparando la prueba: ${e.message}`);
  fallas++;
} finally {
  for (const id of usuariosCreados) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      console.error(`✗ limpieza: no se pudo borrar el usuario ${id}: ${error.message}`);
      fallas++;
    }
  }
  for (const id of tenantsCreados) {
    const { error } = await admin.from("tenants").delete().eq("id", id);
    if (error) {
      console.error(`✗ limpieza: no se pudo borrar el tenant ${id}: ${error.message}`);
      fallas++;
    }
  }
}

console.log(fallas === 0 ? "\nAislamiento OK" : `\n${fallas} verificación(es) fallaron`);
process.exit(fallas === 0 ? 0 : 1);
