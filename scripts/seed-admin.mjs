// Crea el usuario admin (Gisel) en Supabase Auth.
// Uso:  node scripts/seed-admin.mjs <email> <password>
// Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY en el entorno.
// En Windows PowerShell, cargá el .env.local antes o pasá las variables inline.
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Uso: node scripts/seed-admin.mjs <email> <password>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en el entorno.",
  );
  process.exit(1);
}

const supabase = createClient(url, key);
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
console.log("✓ Usuario admin creado:", data.user.email);
