// Crea o actualiza el bucket público "sitios": logo, logo claro y foto de perfil de cada
// cliente ({tenant_id}/{tipo}-{timestamp}.{ext}). Lectura pública por URL; escritura solo
// con la service role (no hay policies en storage.objects para anon ni authenticated).
// Idempotente: correrlo de nuevo vuelve a fijar las opciones. Correrlo también en producción.
// Uso: node --env-file=.env.local scripts/setup-storage-sitios.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const ID = "sitios";
// El mismo límite y los mismos formatos que valida la app (src/lib/storage/imagenes.ts).
// Nunca SVG: puede llevar scripts.
const OPCIONES = {
  public: true,
  fileSizeLimit: 2 * 1024 * 1024,
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
};

const { data: existente } = await supabase.storage.getBucket(ID);
const { error } = existente
  ? await supabase.storage.updateBucket(ID, OPCIONES)
  : await supabase.storage.createBucket(ID, OPCIONES);
if (error) {
  console.error(`❌ ${ID}: ${error.message}`);
  process.exit(1);
}
console.log(existente ? `✓ ${ID} actualizado` : `✓ ${ID} creado`);
