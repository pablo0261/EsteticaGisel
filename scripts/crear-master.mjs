// Crea (o confirma) el usuario master de la plataforma.
// Lee MASTER_EMAIL y MASTER_PASSWORD del .env.local: la contraseña nunca va en
// argumentos, código, migraciones ni repositorio.
// Idempotente: si el usuario ya existe, no toca su contraseña y se asegura de que su
// perfil sea master. Si ya tiene otro perfil (cliente), falla: no lo promueve.
// Uso: node --env-file=.env.local scripts/crear-master.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.MASTER_EMAIL?.trim().toLowerCase();
const password = process.env.MASTER_PASSWORD;

if (!url || !secret) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  process.exit(1);
}
if (!email || !password) {
  console.error(
    "Faltan MASTER_EMAIL o MASTER_PASSWORD en .env.local. Agregá las dos líneas\n" +
      "  MASTER_EMAIL=<tu email>\n" +
      "  MASTER_PASSWORD=<una contraseña de 12 caracteres o más>\n" +
      "y volvé a correr: node --env-file=.env.local scripts/crear-master.mjs",
  );
  process.exit(1);
}
if (password.length < 12) {
  console.error("MASTER_PASSWORD tiene que tener al menos 12 caracteres.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function buscarUsuario() {
  const porPagina = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: porPagina });
    if (error) throw new Error(`listar usuarios: ${error.message}`);
    const usuario = data.users.find((u) => u.email?.toLowerCase() === email);
    if (usuario) return usuario;
    if (data.users.length < porPagina) return null;
  }
}

try {
  let usuario = await buscarUsuario();
  if (usuario) {
    console.log(`= El usuario ${email} ya existía (no se cambia su contraseña).`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`crear usuario: ${error.message}`);
    usuario = data.user;
    console.log(`✓ Usuario ${email} creado.`);
  }

  const { data: previo, error: errorPerfil } = await admin
    .from("perfiles")
    .select("rol, tenant_id")
    .eq("user_id", usuario.id)
    .maybeSingle();
  if (errorPerfil) throw new Error(`leer perfil: ${errorPerfil.message}`);
  if (previo?.rol === "master") {
    console.log("= Su perfil ya era master.");
  } else if (previo) {
    // No se promueve una cuenta existente: un MASTER_EMAIL equivocado no puede convertir
    // en master la cuenta de un cliente.
    throw new Error(
      `${email} ya tiene perfil "${previo.rol}": no se convierte en master. Usá otro MASTER_EMAIL ` +
        "o cambiá el perfil a mano si de verdad corresponde.",
    );
  } else {
    const { error } = await admin
      .from("perfiles")
      .upsert({ user_id: usuario.id, rol: "master", tenant_id: null }, { onConflict: "user_id" });
    if (error) throw new Error(`asignar perfil: ${error.message}`);
    console.log("✓ Perfil master asignado.");
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
