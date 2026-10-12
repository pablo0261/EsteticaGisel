// Verifica el aislamiento contra la base real (RLS y privilegios).
// Crea dos tenants de prueba con una fila en cada tabla y un usuario cliente por
// tenant; comprueba que ningún usuario autenticado (cliente, sin perfil ni master) lee
// ni escribe nada por la API pública, ni lo de su propio tenant (su token se obtiene sin
// el segundo factor: todo pasa por el servidor con la service role), la integridad
// entre tenants en la base, qué ve un anónimo (solo las tablas públicas; ni las funciones
// auxiliares por RPC), y que las tablas del login (códigos,
// dispositivos, pedidos de recuperación e intentos de login) son solo del servidor. Por
// último revisa en el catálogo de Postgres (con SUPABASE_DB_URL) los privilegios de anon y
// authenticated, RLS en todas las tablas y los privilegios por defecto. Al final borra todo.
// Uso: npm run test:aislamiento
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

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

/** Tabla sin acceso para la API: permiso denegado (42501) o ninguna fila visible. */
function sinAcceso(r) {
  if (r.error && r.error.code === "42501") return true;
  return vacio(r);
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

/**
 * Un usuario autenticado (con o sin perfil, cliente o master) no tiene acceso a ninguna
 * tabla por la API: su token se obtiene solo con la contraseña, sin el segundo factor
 * (migración 0012). No lee, inserta, modifica ni borra nada, ni lo de su propio tenant.
 */
async function sinAccesoAutenticado(cliente, quien, a, b, filasParaInsertar) {
  for (const tabla of [...TABLAS_TENANT, "tenant_credenciales"]) {
    const ids = [a.id, b.id];
    verificar(sinAcceso(await cliente.from(tabla).select("tenant_id").eq("tenant_id", a.id)), `${tabla}: ${quien} no lee (ni las de A)`);
    verificar(sinAcceso(await cliente.from(tabla).select("tenant_id").eq("tenant_id", b.id)), `${tabla}: ${quien} no lee las de B`);
    verificar(esperaError(await cliente.from(tabla).insert(filasParaInsertar[tabla]), "42501"), `${tabla}: ${quien} no inserta (ni en A)`);
    verificar(
      bloqueado(await cliente.from(tabla).update({ tenant_id: b.id }).eq("tenant_id", a.id).select("tenant_id")),
      `${tabla}: ${quien} no modifica (ni las de A)`,
    );
    verificar(bloqueado(await cliente.from(tabla).delete().in("tenant_id", ids).select("tenant_id")), `${tabla}: ${quien} no borra`);
    verificar((await contar(tabla, a.id)) > 0 && (await contar(tabla, b.id)) > 0, `${tabla}: las filas de A y B siguen intactas`);
  }

  verificar(sinAcceso(await cliente.from("tenants").select("id")), `tenants: ${quien} no lee (ni el suyo)`);
  verificar(esperaError(await cliente.from("tenants").insert({ slug: `test-x-${sufijo}`, nombre: "Intruso" }), "42501"), `tenants: ${quien} no crea tenants`);
  verificar(
    bloqueado(await cliente.from("tenants").update({ modulo_galeria: true }).in("id", [a.id, b.id]).select("id")),
    `tenants: ${quien} no cambia módulos`,
  );
  verificar(bloqueado(await cliente.from("tenants").delete().in("id", [a.id, b.id]).select("id")), `tenants: ${quien} no borra tenants`);

  verificar(sinAcceso(await cliente.from("perfiles").select("user_id")), `perfiles: ${quien} no lee (ni el propio)`);
  verificar(
    esperaError(await cliente.from("perfiles").insert({ user_id: randomUUID(), rol: "master", tenant_id: null }), "42501"),
    `perfiles: ${quien} no crea perfiles`,
  );
  verificar(
    bloqueado(await cliente.from("perfiles").update({ rol: "master", tenant_id: null }).in("user_id", [a.userId, b.userId]).select("user_id")),
    `perfiles: ${quien} no cambia roles`,
  );
  verificar(
    bloqueado(await cliente.from("perfiles").delete().in("user_id", [a.userId, b.userId]).select("user_id")),
    `perfiles: ${quien} no borra perfiles`,
  );

  verificar(sinAcceso(await cliente.from("migraciones_aplicadas").select("nombre").limit(1)), `migraciones_aplicadas: ${quien} no lee`);
  verificar(
    esperaError(await cliente.from("migraciones_aplicadas").insert({ nombre: `aislamiento-${sufijo}` }), "42501"),
    `migraciones_aplicadas: ${quien} no inserta`,
  );
}

/** Tablas con lectura pública: anon solo puede tener SELECT en estas (migraciones 0016 y 0017). */
const TABLAS_PUBLICAS = ["servicios", "cursos", "testimonios", "tenants", "tenant_marca"];
/** Única función que anon y authenticated pueden ejecutar: la usan las policies de lectura anónima. */
const FUNCIONES_API = ["tenant_activo"];

/**
 * Privilegios en el catálogo de Postgres, no por la API: cubre también lo que la API no
 * prueba (TRUNCATE, MAINTAIN, funciones nuevas) y lo que se cree después (privilegios por defecto).
 */
async function permisosDeLaBase() {
  console.log("\nPermisos de la base (catálogo de Postgres):");
  if (!process.env.SUPABASE_DB_URL) {
    verificar(false, "falta SUPABASE_DB_URL para revisar el catálogo");
    return;
  }
  const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    const listar = (filas) => filas.map((f) => Object.values(f).join(" ")).join("; ");
    const privilegiosDeTablas = (rol) =>
      db.query(
        `select c.relname as tabla, p.privilegio
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) as p(privilegio)
          where n.nspname = 'public' and c.relkind in ('r','p','v','m','f')
            and has_table_privilege($1, c.oid, p.privilegio)
          order by 1, 2`,
        [rol],
      );

    const anon = (await privilegiosDeTablas("anon")).rows;
    const anonDeMas = anon.filter((f) => !(f.privilegio === "SELECT" && TABLAS_PUBLICAS.includes(f.tabla)));
    verificar(anonDeMas.length === 0, "anon: solo SELECT en las tablas públicas");
    if (anonDeMas.length) console.log(`    (${listar(anonDeMas)})`);

    const autenticado = (await privilegiosDeTablas("authenticated")).rows;
    verificar(autenticado.length === 0, "authenticated: ningún privilegio sobre las tablas de public");
    if (autenticado.length) console.log(`    (${listar(autenticado)})`);

    const sinRls = (
      await db.query(
        `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity order by 1`,
      )
    ).rows;
    verificar(sinRls.length === 0, "todas las tablas de public tienen RLS activado");
    if (sinRls.length) console.log(`    (${listar(sinRls)})`);

    const funciones = (
      await db.query(
        `select p.oid::regprocedure::text as funcion, p.proname as nombre
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
          order by 1`,
      )
    ).rows;
    const funcionesDeMas = funciones.filter((f) => !FUNCIONES_API.includes(f.nombre));
    verificar(funcionesDeMas.length === 0, `anon y authenticated solo ejecutan ${FUNCIONES_API.join(", ")} en public`);
    if (funcionesDeMas.length) console.log(`    (${funcionesDeMas.map((f) => f.funcion).join(", ")})`);

    // Lo que postgres cree en public: ni anon, ni authenticated, ni PUBLIC (grantee 0)
    // reciben nada por defecto. Las entradas globales (sin esquema) también cuentan.
    const porDefecto = (
      await db.query(
        `select coalesce(n.nspname, '(global)') as esquema, d.defaclobjtype as tipo,
                case a.grantee when 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as rol, a.privilege_type as privilegio
           from pg_default_acl d
           left join pg_namespace n on n.oid = d.defaclnamespace
           cross join aclexplode(d.defaclacl) a
          where d.defaclrole = 'postgres'::regrole
            and (n.nspname = 'public' or d.defaclnamespace = 0)
            and (a.grantee = 0 or a.grantee in ('anon'::regrole, 'authenticated'::regrole))
          order by 1, 2, 3`,
      )
    ).rows;
    verificar(porDefecto.length === 0, "privilegios por defecto de postgres en public: nada para anon, authenticated ni PUBLIC");
    if (porDefecto.length) console.log(`    (${listar(porDefecto)})`);
    // Sin una entrada global para funciones rige el default de Postgres: EXECUTE para PUBLIC.
    const globalFunciones = await db.query(
      `select 1 from pg_default_acl where defaclrole = 'postgres'::regrole and defaclnamespace = 0 and defaclobjtype = 'f'`,
    );
    verificar(globalFunciones.rowCount === 1, "las funciones nuevas de postgres no nacen ejecutables por PUBLIC");
  } finally {
    await db.end();
  }
}

try {
  const a = await crearTenant("a");
  const b = await crearTenant("b");
  const usuarioA = await clienteLogueado(a.email, a.password);
  const anon = createClient(url, publishable, opciones);

  // Filas válidas (copias de las de A) para intentar insertarlas por la API.
  const filasParaInsertar = {};
  for (const tabla of [...TABLAS_TENANT, "tenant_credenciales"]) {
    const [fila] = await ok(admin.from(tabla).select("*").eq("tenant_id", a.id).limit(1), `leer ${tabla}`);
    const copia = { ...fila };
    for (const c of COLUMNAS_GENERADAS) delete copia[c];
    filasParaInsertar[tabla] = copia;
  }

  console.log("\nUsuario cliente del tenant A (sin acceso por la API, ni a lo propio):");
  await sinAccesoAutenticado(usuarioA, "cliente A", a, b, filasParaInsertar);
  const perfilA = await ok(admin.from("perfiles").select("rol, tenant_id").eq("user_id", a.userId).single(), "perfil A");
  verificar(perfilA.rol === "cliente" && perfilA.tenant_id === a.id, "perfiles: el de A sigue siendo cliente de A");

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

  console.log("\nUsuario logueado sin perfil (sin acceso por la API):");
  const sinPerfil = await crearUsuario("sin-perfil");
  const usuarioSinPerfil = await clienteLogueado(sinPerfil.email, sinPerfil.password);
  await sinAccesoAutenticado(usuarioSinPerfil, "sin perfil", a, b, filasParaInsertar);

  console.log("\nUsuario master (sin acceso por la API: todo pasa por el servidor):");
  const master = await crearUsuario("master");
  await ok(admin.from("perfiles").insert({ user_id: master.userId, rol: "master", tenant_id: null }), "perfil master");
  const usuarioMaster = await clienteLogueado(master.email, master.password);
  await sinAccesoAutenticado(usuarioMaster, "master", a, b, filasParaInsertar);

  console.log("\nTablas del login (solo el servidor, con la service role):");
  const enDiezMinutos = () => new Date(Date.now() + 600_000).toISOString();
  await ok(admin.from("codigos_login").insert({ user_id: a.userId, codigo_hash: "hash-de-prueba", expira_en: enDiezMinutos() }), "código de login");
  await ok(admin.from("dispositivos_confiables").insert({ user_id: a.userId, token_hash: `hash-de-prueba-${sufijo}`, expira_en: enDiezMinutos() }), "dispositivo");
  await ok(admin.from("pedidos_recuperacion").insert({ email_hash: `hash-de-prueba-${sufijo}`, ip: "127.0.0.1" }), "pedido de recuperación");
  await ok(
    admin.from("intentos_login").insert({ email_hash: `hash-de-prueba-${sufijo}`, ip: "127.0.0.1", creado_en: new Date().toISOString() }),
    "intento de login",
  );
  const filasNuevas = {
    codigos_login: { user_id: a.userId, codigo_hash: "intruso", expira_en: enDiezMinutos() },
    dispositivos_confiables: { user_id: a.userId, token_hash: `intruso-${sufijo}`, expira_en: enDiezMinutos() },
    pedidos_recuperacion: { email_hash: `intruso-${sufijo}`, ip: "127.0.0.1" },
    intentos_login: { email_hash: `intruso-${sufijo}`, ip: "127.0.0.1", creado_en: new Date().toISOString() },
  };
  for (const [tabla, fila] of Object.entries(filasNuevas)) {
    for (const [quien, cliente] of [["cliente A", usuarioA], ["master", usuarioMaster], ["anónimo", anon]]) {
      verificar(sinAcceso(await cliente.from(tabla).select("*").limit(1)), `${tabla}: ${quien} no lee (ni las propias)`);
      verificar(esperaError(await cliente.from(tabla).insert(fila), "42501"), `${tabla}: ${quien} no inserta`);
      verificar(
        bloqueado(await cliente.from(tabla).update({ creado_en: new Date().toISOString() }).not("id", "is", null).select("id")),
        `${tabla}: ${quien} no modifica`,
      );
      verificar(bloqueado(await cliente.from(tabla).delete().not("id", "is", null).select("id")), `${tabla}: ${quien} no borra`);
    }
  }
  const intactas = await Promise.all([
    admin.from("codigos_login").select("id", { count: "exact", head: true }).eq("user_id", a.userId),
    admin.from("dispositivos_confiables").select("id", { count: "exact", head: true }).eq("user_id", a.userId),
    admin.from("pedidos_recuperacion").select("id", { count: "exact", head: true }).like("email_hash", `%-${sufijo}`),
    admin.from("intentos_login").select("id", { count: "exact", head: true }).like("email_hash", `%-${sufijo}`),
  ]);
  verificar(intactas.every((r) => !r.error && r.count === 1), "tablas del login: las filas de prueba siguen intactas");

  console.log("\nVisitante anónimo:");
  // Sin privilegio sobre las tablas privadas (migración 0016): permiso denegado, no 0 filas.
  for (const tabla of [
    "tenant_credenciales", "turnos", "pagos", "accesos_curso", "perfiles",
    "configuracion_negocio", "intentos_reserva", "recordatorios_enviados", "archivos_curso",
    "migraciones_aplicadas",
  ]) {
    verificar(esperaError(await anon.from(tabla).select("*").limit(1), "42501"), `${tabla}: no es legible (sin privilegio)`);
  }
  // Las funciones auxiliares sin uso no se pueden invocar por RPC (migración 0016).
  for (const [quien, cliente] of [["anónimo", anon], ["cliente A", usuarioA], ["master", usuarioMaster]]) {
    for (const fn of ["tenant_actual", "es_master"]) {
      verificar(esperaError(await cliente.rpc(fn), "42501"), `rpc ${fn}: ${quien} no la invoca`);
    }
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

  await permisosDeLaBase();
} catch (e) {
  console.error(`\nError preparando la prueba: ${e.message}`);
  fallas++;
} finally {
  // Por si alguna inserción indebida hubiera pasado.
  await admin.from("migraciones_aplicadas").delete().like("nombre", `aislamiento-%`);
  const { error: errorPedidos } = await admin.from("pedidos_recuperacion").delete().like("email_hash", `%-${sufijo}`);
  if (errorPedidos) {
    console.error(`✗ limpieza: pedidos_recuperacion: ${errorPedidos.message}`);
    fallas++;
  }
  const { error: errorIntentos } = await admin.from("intentos_login").delete().like("email_hash", `%-${sufijo}`);
  if (errorIntentos) {
    console.error(`✗ limpieza: intentos_login: ${errorIntentos.message}`);
    fallas++;
  }
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
