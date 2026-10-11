// Aplica migraciones SQL a la base de Supabase, cada una en una transacción, y las
// registra en public.migraciones_aplicadas (saltea las ya registradas).
// Uso:     node --env-file=.env.local scripts/migrar.mjs supabase/migrations/0008_multitenant.sql [...]
// Marcar como aplicadas sin ejecutar (las que se corrieron a mano en el SQL Editor):
//          node --env-file=.env.local scripts/migrar.mjs --solo-registrar supabase/migrations/0001_init.sql [...]
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import pg from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Falta SUPABASE_DB_URL en .env.local (Supabase → Connect → Session pooler).");
  process.exit(1);
}

const args = process.argv.slice(2);
const soloRegistrar = args.includes("--solo-registrar");
const archivos = args.filter((a) => a !== "--solo-registrar");
if (archivos.length === 0) {
  console.error("Uso: node --env-file=.env.local scripts/migrar.mjs [--solo-registrar] <archivo.sql>...");
  process.exit(1);
}

const db = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  await db.query(`
    create table if not exists public.migraciones_aplicadas (
      nombre text primary key,
      aplicada_en timestamptz not null default now()
    );
    alter table public.migraciones_aplicadas enable row level security;
  `);

  for (const archivo of archivos) {
    const nombre = basename(archivo);
    const { rowCount } = await db.query(
      "select 1 from public.migraciones_aplicadas where nombre = $1",
      [nombre],
    );
    if (rowCount) {
      console.log(`= ${nombre} ya estaba aplicada`);
      continue;
    }
    try {
      await db.query("begin");
      if (!soloRegistrar) await db.query(readFileSync(archivo, "utf8"));
      await db.query("insert into public.migraciones_aplicadas (nombre) values ($1)", [nombre]);
      await db.query("commit");
      console.log(`${soloRegistrar ? "✓ registrada" : "✓ aplicada"} ${nombre}`);
    } catch (e) {
      await db.query("rollback");
      console.error(`✗ ${nombre}: ${e.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await db.end();
}
