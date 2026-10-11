// Verifica el aislamiento entre tenants contra la base real (RLS).
// Crea dos tenants de prueba con una fila en cada tabla y un usuario cliente por
// tenant; comprueba que el usuario de A no lee ni modifica nada de B, que no puede
// tocar su propia marca/módulos/rol, y qué ve un anónimo. Al final borra todo.
// Uso: npm run test:aislamiento
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

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

let fallas = 0;
function verificar(ok, descripcion) {
  console.log(`${ok ? "✓" : "✗"} ${descripcion}`);
  if (!ok) fallas++;
}
/** Una escritura bloqueada por RLS devuelve 0 filas o un error: ambos son "no pudo". */
function noAfecto(r) {
  return r.error ? true : r.data.length === 0;
}

async function ok(promesa, que) {
  const { data, error } = await promesa;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
}

const tenantsCreados = [];
const usuariosCreados = [];

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
  await ok(admin.from("archivos_curso").insert({ tenant_id: t, curso_id: curso.id, nombre_archivo: "a.pdf", storage_path: "x", tipo: "pdf" }), "archivo");
  await ok(admin.from("accesos_curso").insert({ tenant_id: t, curso_id: curso.id, cliente_email: "c@example.com", expira_en: new Date().toISOString() }), "acceso");
  await ok(admin.from("pagos").insert({ tenant_id: t, tipo: "turno", referencia_id: turno.id, estado: "approved", monto: 1 }), "pago");
  await ok(admin.from("intentos_reserva").insert({ tenant_id: t, ip: "127.0.0.1" }), "intento");
  await ok(admin.from("testimonios").insert({ tenant_id: t, nombre: "N", texto: "T" }), "testimonio");

  const email = `aislamiento-${letra}-${sufijo}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data: creado, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`usuario: ${error.message}`);
  usuariosCreados.push(creado.user.id);
  await ok(admin.from("perfiles").insert({ user_id: creado.user.id, rol: "cliente", tenant_id: t }), "perfil");
  return { id: t, userId: creado.user.id, email, password, servicioId: servicio.id, cursoId: curso.id };
}

async function clienteLogueado(email, password) {
  const c = createClient(url, publishable, opciones);
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login: ${error.message}`);
  return c;
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
    const ajenos = await usuarioA.from(tabla).select("tenant_id").eq("tenant_id", b.id);
    verificar(!ajenos.error && ajenos.data.length === 0, `${tabla}: no ve filas de B`);
    verificar(
      noAfecto(await usuarioA.from(tabla).update({ tenant_id: a.id }).eq("tenant_id", b.id).select("tenant_id")),
      `${tabla}: no modifica filas de B`,
    );
    verificar(
      noAfecto(await usuarioA.from(tabla).delete().eq("tenant_id", b.id).select("tenant_id")),
      `${tabla}: no borra filas de B`,
    );
    const siguen = await admin.from(tabla).select("tenant_id", { count: "exact", head: true }).eq("tenant_id", b.id);
    verificar((siguen.count ?? 0) > 0, `${tabla}: las filas de B siguen intactas`);
  }

  const intruso = await usuarioA.from("servicios").insert({ tenant_id: b.id, nombre: "Intruso", duracion_minutos: 30 });
  verificar(!!intruso.error, "servicios: no puede insertar en B");

  console.log("\nIntegridad en la base (aun con service role):");
  const turnoCruzado = await admin.from("turnos").insert({
    tenant_id: a.id, servicio_id: b.servicioId, cliente_nombre: "X", cliente_email: "x@example.com",
    fecha_hora: new Date().toISOString(), duracion_minutos: 30,
  });
  verificar(!!turnoCruzado.error, "turnos: no puede apuntar a un servicio de otro tenant");
  const accesoCruzado = await admin.from("accesos_curso").insert({
    tenant_id: a.id, curso_id: b.cursoId, cliente_email: "x@example.com", expira_en: new Date().toISOString(),
  });
  verificar(!!accesoCruzado.error, "accesos_curso: no puede apuntar a un curso de otro tenant");

  console.log("\nUsuario cliente del tenant A, sobre lo propio que no debe tocar:");
  const credenciales = await usuarioA.from("tenant_credenciales").select("tenant_id");
  verificar(!credenciales.error && credenciales.data.length === 0, "tenant_credenciales: no lee ni las propias");
  const tenantsVisibles = await usuarioA.from("tenants").select("id");
  verificar(
    !tenantsVisibles.error && tenantsVisibles.data.length === 1 && tenantsVisibles.data[0].id === a.id,
    "tenants: solo ve el suyo",
  );
  verificar(
    noAfecto(await usuarioA.from("tenants").update({ modulo_galeria: true }).eq("id", a.id).select("id")),
    "tenants: no cambia sus propios módulos",
  );
  verificar(
    noAfecto(await usuarioA.from("tenant_marca").update({ color_primario: "#000000" }).eq("tenant_id", a.id).select("tenant_id")),
    "tenant_marca: no cambia su propia marca",
  );
  const perfilesVisibles = await usuarioA.from("perfiles").select("user_id");
  verificar(
    !perfilesVisibles.error && perfilesVisibles.data.every((p) => p.user_id === a.userId),
    "perfiles: solo ve el propio",
  );
  verificar(
    noAfecto(await usuarioA.from("perfiles").update({ rol: "master", tenant_id: null }).eq("user_id", a.userId).select("user_id")),
    "perfiles: no puede volverse master",
  );

  console.log("\nVisitante anónimo:");
  for (const tabla of [
    "tenant_credenciales", "turnos", "pagos", "accesos_curso", "perfiles",
    "configuracion_negocio", "intentos_reserva", "recordatorios_enviados", "archivos_curso",
  ]) {
    const r = await anon.from(tabla).select("*").limit(1);
    verificar(!r.error ? r.data.length === 0 : true, `${tabla}: no es legible`);
  }
  const serviciosAnon = await anon.from("servicios").select("nombre").in("tenant_id", [a.id, b.id]);
  verificar(
    !serviciosAnon.error && serviciosAnon.data.length === 2 && serviciosAnon.data.every((s) => s.nombre === "Servicio"),
    "servicios: ve solo los activos",
  );
  await ok(admin.from("tenants").update({ estado: "suspendido" }).eq("id", b.id), "suspender B");
  const deSuspendido = await anon.from("servicios").select("nombre").eq("tenant_id", b.id);
  verificar(!deSuspendido.error && deSuspendido.data.length === 0, "servicios: no ve los de un tenant suspendido");
} catch (e) {
  console.error(`\nError preparando la prueba: ${e.message}`);
  fallas++;
} finally {
  for (const id of usuariosCreados) await admin.auth.admin.deleteUser(id);
  for (const id of tenantsCreados) await admin.from("tenants").delete().eq("id", id);
}

console.log(fallas === 0 ? "\nAislamiento OK" : `\n${fallas} verificación(es) fallaron`);
process.exit(fallas === 0 ? 0 : 1);
