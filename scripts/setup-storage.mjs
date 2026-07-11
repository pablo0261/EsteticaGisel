// Crea los buckets de Storage para cursos (privados, sin acceso público directo).
// Uso: node --env-file=.env.local scripts/setup-storage.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key);
const buckets = ["cursos-videos", "cursos-archivos"];

for (const id of buckets) {
  const { error } = await supabase.storage.createBucket(id, { public: false });
  if (error && !error.message.includes("already exists")) {
    console.error(`❌ ${id}:`, error.message);
    process.exit(1);
  }
  console.log(error ? `✓ ${id} ya existía` : `✓ ${id} creado`);
}
