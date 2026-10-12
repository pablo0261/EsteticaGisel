// Crea o borra el tenant de prueba "demo-br" (portugués, Brasil, BRL, São Paulo) para
// verificar la presentación por tenant: idioma, colores, moneda y horarios.
// Uso: node --env-file=.env.local scripts/tenant-demo-br.mjs crear|borrar
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const SLUG = "demo-br";
const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ok(promesa, que) {
  const { data, error } = await promesa;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
}

async function borrar() {
  // tenant_marca, configuracion_negocio y servicios se borran en cascada.
  await ok(admin.from("tenants").delete().eq("slug", SLUG), "borrar tenant");
  console.log(`Tenant ${SLUG} borrado.`);
}

async function crear() {
  await borrar(); // por si quedó de una corrida anterior
  const { id } = await ok(
    admin
      .from("tenants")
      .insert({
        slug: SLUG,
        nombre: "Studio Demo",
        idioma: "pt",
        pais: "BR",
        zona_horaria: "America/Sao_Paulo",
        moneda: "BRL",
        modulo_turnos: true,
        modulo_cursos: false,
        modulo_sobre_mi: false,
        modulo_testimonios: false,
      })
      .select("id")
      .single(),
    "tenant",
  );
  await ok(
    admin.from("tenant_marca").insert({
      tenant_id: id,
      color_primario: "#1f6f8b",
      color_secundario: "#2d4a53",
      color_fondo: "#f2f7f9",
      color_texto: "#102027",
      rubro: "Estética",
      tagline: "Cuidado com carinho",
      inicio_titulo: "Seu momento de",
      inicio_destacado: "cuidado",
      inicio_texto: "Agende online em poucos passos.",
      whatsapp: "+5511912345678",
    }),
    "marca",
  );
  const semana = ["lun", "mar", "mie", "jue", "vie"];
  await ok(
    admin.from("configuracion_negocio").insert({
      tenant_id: id,
      horario_atencion: Object.fromEntries(semana.map((d) => [d, ["09:00", "18:00"]])),
    }),
    "configuración",
  );
  await ok(
    admin
      .from("servicios")
      .insert({ tenant_id: id, nombre: "Limpeza de pele", duracion_minutos: 60, precio: 350 }),
    "servicio",
  );
  console.log(`Tenant ${SLUG} creado: http://${SLUG}.localhost:3000`);
}

const accion = process.argv[2];
if (accion === "crear") await crear();
else if (accion === "borrar") await borrar();
else {
  console.error("Uso: node --env-file=.env.local scripts/tenant-demo-br.mjs crear|borrar");
  process.exit(1);
}
