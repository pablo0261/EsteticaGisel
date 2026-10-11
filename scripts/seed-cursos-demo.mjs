// Carga 3 cursos de demostración (publicados, con vista previa de YouTube de 30 s).
// Requiere la migración 0007 (columna preview_youtube_url).
// Uso:   node --env-file=.env.local scripts/seed-cursos-demo.mjs
// Borrar: node --env-file=.env.local scripts/seed-cursos-demo.mjs --borrar
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key);

const CURSOS_DEMO = [
  {
    titulo: "Skincare en casa: tu rutina paso a paso",
    descripcion:
      "Aprendé a armar una rutina de cuidado facial según tu tipo de piel: limpieza, tónicos, sérums, hidratación y protección solar, en el orden correcto. (Curso de demostración)",
    categoria: "publico_general",
    precio: 35000,
    precio_oferta: 28000,
    oferta_activa: true,
    dias_acceso: 30,
    orden: 1,
    preview_youtube_url: "https://www.youtube.com/watch?v=Fl82HXLb5_E",
  },
  {
    titulo: "Manicura semipermanente profesional",
    descripcion:
      "Preparación de la uña, aplicación de base, color y top, curado y retirado sin dañar la uña natural. Pensado para quienes trabajan o quieren trabajar en el rubro. (Curso de demostración)",
    categoria: "profesional",
    precio: 60000,
    dias_acceso: 60,
    orden: 2,
    preview_youtube_url: "https://www.youtube.com/watch?v=Ku5kU3eJ2Ik",
  },
  {
    titulo: "Masaje relajante de espalda para cosmetólogas",
    descripcion:
      "Maniobras de effleurage, fricción y amasamiento para un masaje descontracturante y relajante de espalda, con postura y ergonomía de la profesional. (Curso de demostración)",
    categoria: "profesional",
    precio: 55000,
    dias_acceso: 60,
    orden: 3,
    preview_youtube_url: "https://www.youtube.com/watch?v=Fq26to3KgXw",
  },
];

const titulos = CURSOS_DEMO.map((c) => c.titulo);

if (process.argv.includes("--borrar")) {
  const { data, error } = await supabase.from("cursos").delete().in("titulo", titulos).select("id");
  if (error) {
    console.error("❌", error.message);
    process.exit(1);
  }
  console.log(`✓ ${data.length} cursos demo borrados`);
  process.exit(0);
}

const { data: existentes, error: errorLectura } = await supabase
  .from("cursos")
  .select("titulo")
  .in("titulo", titulos);
if (errorLectura) {
  console.error("❌", errorLectura.message);
  process.exit(1);
}

for (const curso of CURSOS_DEMO) {
  if (existentes.some((e) => e.titulo === curso.titulo)) {
    console.log(`✓ "${curso.titulo}" ya existía`);
    continue;
  }
  const { error } = await supabase.from("cursos").insert({ ...curso, estado: "publicado" });
  if (error) {
    console.error(`❌ "${curso.titulo}":`, error.message);
    process.exit(1);
  }
  console.log(`✓ "${curso.titulo}" creado`);
}
