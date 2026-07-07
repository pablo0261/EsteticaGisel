# Fase 0 + Fase 1 — Fundaciones + Landing pública — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el repo Next.js corriendo en localhost con el sistema de diseño de la marca y una landing pública completa y demoable, sin depender de credenciales externas.

**Architecture:** App Next.js (App Router, TS, `src/`) con Tailwind para el design system derivado del logo. Clientes Supabase aislados en `src/lib/supabase/` (browser / server / admin) leyendo `.env.local`. Lógica pura (formateo ARS) testeada con Vitest. Migración inicial versionada en `supabase/migrations/` (se aplica con `supabase db push`). Landing compuesta por secciones desacopladas en `src/components/landing/`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, `@supabase/ssr` + `@supabase/supabase-js`, next/font (Cormorant Garamond + Jost), Vitest.

---

## File Structure

```
src/
  app/
    layout.tsx            → fuentes, metadata, <html lang="es-AR">
    page.tsx              → landing (compone las secciones)
    globals.css           → tokens de marca (@theme) + base
  components/
    ui/                   → primitivos (Button, Container, Section)
    landing/              → Hero, SobreMi, Servicios, Testimonios, Redes, CtaWhatsapp, Footer, Nav
  lib/
    supabase/
      client.ts           → cliente browser (publishable key)
      server.ts           → cliente server (cookies)
      admin.ts            → cliente service-role (solo server)
    format.ts             → formatPrecioARS + helpers puros
    format.test.ts        → tests de format
    site.ts               → datos del negocio (contacto, redes, servicios seed para UI)
supabase/
  migrations/
    0001_init.sql         → tablas + RLS + seed
public/
  brand/                  → logos (los copia Pablo)
.env.example              → variables documentadas
vitest.config.ts
```

---

## FASE 0 — Fundaciones

### Task 1: Scaffold Next.js sin pisar el repo existente

**Files:**
- Create: toda la estructura base de Next.js
- Preserve: `.git/`, `docs/`, `.gitignore` (el mío), `README.md` (el mío)

- [ ] **Step 1: Respaldar los archivos que create-next-app podría pisar**

```bash
cd "c:/Users/pablo.besler/source/repos/EsteticaGisel"
mv .gitignore .gitignore.mine
mv README.md README.mine
```
(`docs/` y `.git/` están en la lista de archivos permitidos de create-next-app; no hace falta moverlos.)

- [ ] **Step 2: Scaffold**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```
Expected: crea `src/app`, `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `src/app/globals.css`, y su propio `.gitignore`.

- [ ] **Step 3: Reconciliar .gitignore y README**

Fusionar las reglas propias (bloque `.env`, `/supabase/.temp`, `.vercel`) dentro del `.gitignore` generado, y restaurar el README propio:
```bash
cat .gitignore.mine >> .gitignore     # luego deduplicar a mano
rm .gitignore.mine
mv -f README.mine README.md
```
Verificar que `.gitignore` contiene `.env` y `!.env.example`.

- [ ] **Step 4: Verificar arranque**

Run: `npm run dev` (abrir http://localhost:3000), luego `Ctrl+C`.
Expected: página default de Next.js carga sin errores.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js (App Router, TS, Tailwind)"
```

---

### Task 2: Tokens de marca + fuentes

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Definir tokens de marca en globals.css**

En `src/app/globals.css`, dentro del bloque `@theme` de Tailwind v4 (o agregándolo), definir:

```css
@import "tailwindcss";

@theme {
  --color-mauve: #c0899a;
  --color-mauve-dark: #a66f82;
  --color-sage: #4e5340;
  --color-sage-dark: #3b3f31;
  --color-cream: #f6f1ea;
  --color-cream-dark: #ece3d8;
  --color-ink: #1a1a1a;
  --font-serif: var(--font-cormorant), Georgia, serif;
  --font-sans: var(--font-jost), system-ui, sans-serif;
}

:root { color-scheme: light; }

body {
  background-color: var(--color-cream);
  color: var(--color-ink);
  font-family: var(--font-sans);
}
```

- [ ] **Step 2: Cargar fuentes en layout.tsx**

```tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cormorant",
});
const jost = Jost({ subsets: ["latin"], variable: "--font-jost" });

export const metadata: Metadata = {
  title: "Gisel Bigurrarena · Estética y Salud",
  description: "Centro de estética en Argentina. Tratamientos faciales, corporales, manos y pies. Turnos online y cursos de estética.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${cormorant.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verificar tokens**

Reemplazar temporalmente `src/app/page.tsx` con un `<h1 className="font-serif text-mauve text-6xl">GB</h1>` y confirmar en el navegador que se ve la serif en color mauve sobre fondo crema.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: sistema de diseño (tokens de marca + fuentes)"
```

---

### Task 3: Utilidad de formato ARS (TDD)

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`
- Modify: `package.json` (script test), `vitest.config.ts`

- [ ] **Step 1: Instalar Vitest**

```bash
npm i -D vitest
```
Agregar a `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Crear `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

- [ ] **Step 2: Escribir el test que falla**

`src/lib/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatPrecioARS } from "./format";

describe("formatPrecioARS", () => {
  it("formatea enteros con separador de miles y símbolo $", () => {
    expect(formatPrecioARS(15000)).toBe("$ 15.000");
  });
  it("no muestra decimales para montos redondos", () => {
    expect(formatPrecioARS(1500)).toBe("$ 1.500");
  });
  it("maneja cero", () => {
    expect(formatPrecioARS(0)).toBe("$ 0");
  });
});
```

- [ ] **Step 3: Correr el test y ver que falla**

Run: `npm test`
Expected: FAIL — `formatPrecioARS is not a function`.

- [ ] **Step 4: Implementar el mínimo**

`src/lib/format.ts`:
```ts
export function formatPrecioARS(monto: number): string {
  const n = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(monto);
  return `$ ${n}`;
}
```

- [ ] **Step 5: Correr el test y ver que pasa**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: formatPrecioARS con tests"
```

---

### Task 4: Clientes Supabase + .env.example

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`
- Create: `.env.example`

- [ ] **Step 1: Instalar dependencias**

```bash
npm i @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: `.env.example`**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ywlelorrodpbxclnzsiu.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx            # SOLO server, nunca al cliente

# Mercado Pago (TEST por ahora)
MP_ACCESS_TOKEN=TEST-xxx
MP_PUBLIC_KEY=TEST-xxx
MP_WEBHOOK_SECRET=xxx

# Google Calendar
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary

# Resend
RESEND_API_KEY=re_xxx
EMAIL_FROM=onboarding@resend.dev

# Cron
CRON_SECRET=cambiar-por-uno-largo-aleatorio

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 3: Cliente browser** — `src/lib/supabase/client.ts`

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

- [ ] **Step 4: Cliente server** — `src/lib/supabase/server.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Component: ignorar, lo maneja el middleware */ }
        },
      },
    }
  );
}
```

- [ ] **Step 5: Cliente admin (service-role)** — `src/lib/supabase/admin.ts`

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}
```

- [ ] **Step 6: Instalar server-only y verificar build**

```bash
npm i server-only
npm run build
```
Expected: build pasa sin errores de tipos.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: clientes Supabase (browser/server/admin) + .env.example"
```

---

### Task 5: Migración inicial + seed

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Escribir la migración**

`supabase/migrations/0001_init.sql` — tablas del modelo de datos (sección 6 del spec), con `enum`s como CHECK, timestamps, y RLS. Seed de `servicios` (los 9 del prompt, con `duracion_minutos`; `precio` en 0 hasta que Gisel los cargue) y una fila de `configuracion_negocio` con defaults (cancelación 24h, recordatorio 24h, preparación 15min, seña 50%, horario L-V 14-19 / Sáb 9-14).

```sql
-- servicios
create table servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  duracion_minutos int not null,
  precio numeric(12,2) not null default 0,
  activo boolean not null default true,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

-- configuracion_negocio (fila única)
create table configuracion_negocio (
  id int primary key default 1,
  horas_minimas_cancelacion int not null default 24,
  horas_anticipacion_recordatorio int not null default 24,
  minutos_preparacion_entre_turnos int not null default 15,
  sena_porcentaje int not null default 50,
  horario_atencion jsonb not null,
  constraint solo_una_fila check (id = 1)
);

-- turnos
create table turnos (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references servicios(id),
  cliente_nombre text not null,
  cliente_email text not null,
  cliente_telefono text,
  fecha_hora timestamptz not null,
  duracion_minutos int not null,
  estado text not null default 'pendiente_pago'
    check (estado in ('pendiente_pago','confirmado','cancelado','completado')),
  monto_sena numeric(12,2),
  google_calendar_event_id text,
  bloqueado_hasta timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- cursos
create table cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  categoria text not null check (categoria in ('profesional','publico_general')),
  video_storage_path text,
  permitir_descarga boolean not null default false,
  dias_acceso int not null default 7,
  precio numeric(12,2) not null default 0,
  precio_oferta numeric(12,2),
  oferta_activa boolean not null default false,
  oferta_desde timestamptz,
  oferta_hasta timestamptz,
  estado text not null default 'borrador' check (estado in ('borrador','publicado')),
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

-- archivos_curso
create table archivos_curso (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  nombre_archivo text not null,
  storage_path text not null,
  tipo text not null check (tipo in ('pdf','pptx','otro')),
  creado_en timestamptz not null default now()
);

-- accesos_curso
create table accesos_curso (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id),
  cliente_email text not null,
  comprado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  mp_payment_id text,
  creado_en timestamptz not null default now()
);

-- pagos (con campos de facturación futura, nullable)
create table pagos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('turno','curso')),
  referencia_id uuid not null,
  mp_preference_id text,
  mp_payment_id text,
  estado text not null,
  monto numeric(12,2) not null,
  factura_tipo text,
  factura_numero text,
  factura_cae text,
  facturado_en timestamptz,
  creado_en timestamptz not null default now()
);

-- RLS
alter table servicios enable row level security;
alter table cursos enable row level security;
alter table configuracion_negocio enable row level security;
alter table turnos enable row level security;
alter table archivos_curso enable row level security;
alter table accesos_curso enable row level security;
alter table pagos enable row level security;

-- Lectura pública solo de lo público
create policy "servicios activos son públicos" on servicios
  for select using (activo = true);
create policy "cursos publicados son públicos" on cursos
  for select using (estado = 'publicado');
-- turnos, accesos, pagos, config, archivos: sin policy pública →
-- solo accesibles vía service-role (backend) o admin autenticado (policies en Fase 2).

-- Seed servicios
insert into servicios (nombre, duracion_minutos, orden) values
  ('Tratamientos faciales', 90, 1),
  ('Manicuría', 90, 2),
  ('Pedicuría', 60, 3),
  ('Pedicuría + belleza de pies', 90, 4),
  ('Masajes', 60, 5),
  ('Tratamientos capilares', 40, 6),
  ('Laminado de cejas', 60, 7),
  ('Laminado + lifting de pestañas', 90, 8),
  ('Tratamientos corporales (por zona)', 60, 9);

-- Seed configuración
insert into configuracion_negocio (id, horario_atencion) values
  (1, '{"lun":["14:00","19:00"],"mar":["14:00","19:00"],"mie":["14:00","19:00"],"jue":["14:00","19:00"],"vie":["14:00","19:00"],"sab":["09:00","14:00"]}');
```

- [ ] **Step 2: Verificar sintaxis (aplicación la hace Pablo)**

No se corre acá. Pablo aplica con `npx supabase link --project-ref ywlelorrodpbxclnzsiu` + `npx supabase db push`. Verificar solo que el SQL no tenga typos evidentes.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: migración inicial + seed (servicios, config)"
```

---

### Task 6: Datos del sitio + primitivos UI

**Files:**
- Create: `src/lib/site.ts`
- Create: `src/components/ui/Container.tsx`, `Section.tsx`, `Button.tsx`

- [ ] **Step 1: `src/lib/site.ts`** — fuente única de datos de contacto/servicios para la UI (placeholders hasta contenido real)

```ts
export const SITE = {
  nombre: "Gisel Bigurrarena",
  rubro: "Estética y Salud",
  instagram: "https://instagram.com/esteticaysaludgisel",
  instagramHandle: "@esteticaysaludgisel",
  whatsapp: "5490000000000", // reemplazar por el real
  email: "hola@esteticagisel.com.ar",
  zona: "Argentina",
  horarios: [
    { dias: "Lunes a viernes", horas: "14:00 a 19:00" },
    { dias: "Sábados", horas: "09:00 a 14:00" },
  ],
} as const;

export const SERVICIOS_UI = [
  { nombre: "Tratamientos faciales", duracion: "1h 30min", precio: 0 },
  { nombre: "Manicuría", duracion: "1h 30min", precio: 0 },
  { nombre: "Pedicuría", duracion: "1h", precio: 0 },
  { nombre: "Pedicuría + belleza de pies", duracion: "1h 30min", precio: 0 },
  { nombre: "Masajes", duracion: "1h", precio: 0 },
  { nombre: "Tratamientos capilares", duracion: "40min", precio: 0 },
  { nombre: "Laminado de cejas", duracion: "1h", precio: 0 },
  { nombre: "Laminado + lifting de pestañas", duracion: "1h 30min", precio: 0 },
  { nombre: "Tratamientos corporales (por zona)", duracion: "1h", precio: 0 },
] as const;
```

- [ ] **Step 2: Primitivos** — `Container` (max-width + padding), `Section` (spacing vertical + id para anclas), `Button` (variantes mauve/outline, tamaños; soporta `as="a"`).

```tsx
// src/components/ui/Container.tsx
export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}
```
```tsx
// src/components/ui/Section.tsx
export function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return <section id={id} className={`py-16 sm:py-24 ${className}`}>{children}</section>;
}
```
```tsx
// src/components/ui/Button.tsx
import Link from "next/link";
type Props = { href: string; children: React.ReactNode; variant?: "solid" | "outline"; className?: string };
export function Button({ href, children, variant = "solid", className = "" }: Props) {
  const base = "inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-medium tracking-wide transition";
  const styles = variant === "solid"
    ? "bg-mauve text-cream hover:bg-mauve-dark"
    : "border border-mauve text-mauve hover:bg-mauve hover:text-cream";
  const external = href.startsWith("http");
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${styles} ${className}`}>{children}</a>
    : <Link href={href} className={`${base} ${styles} ${className}`}>{children}</Link>;
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: datos del sitio + primitivos UI"
```

**FIN FASE 0.** Checkpoint: repo corre, tiene design system, clientes Supabase, migración lista y primitivos.

---

## FASE 1 — Landing pública

Cada sección es un componente en `src/components/landing/`, compuesto en `src/app/page.tsx`. Mobile-first. Contenido con placeholders desde `src/lib/site.ts`. Logo: usar `public/brand/` (Pablo copia los archivos; hasta entonces, fallback tipográfico "GB").

### Task 7: Nav + Hero

**Files:**
- Create: `src/components/landing/Nav.tsx`, `src/components/landing/Hero.tsx`

- [ ] **Step 1: Nav** — barra superior transparente que se vuelve sólida al scrollear (client component con listener), logo a la izquierda, links ancla (Servicios, Sobre mí, Cursos, Contacto), y botón "Reservar turno" (mauve). Colapsa a menú hamburguesa en mobile.

- [ ] **Step 2: Hero** — pantalla completa: imagen de fondo (placeholder `public/brand/` o gradiente crema→mauve tenue), título serif grande ("Estética y Salud"), subtítulo, dos CTAs ("Reservar turno" solid, "Ver cursos" outline). Overlay para legibilidad.

- [ ] **Step 3: Verificar en mobile y desktop**

Run: `npm run dev`, revisar en viewport 375px y 1280px.
Expected: hero legible, nav funcional, sin overflow horizontal.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(landing): nav + hero"
```

### Task 8: Servicios + Sobre mí

**Files:**
- Create: `src/components/landing/Servicios.tsx`, `src/components/landing/SobreMi.tsx`

- [ ] **Step 1: Servicios** — grilla de tarjetas desde `SERVICIOS_UI`: nombre (serif), duración, y precio con `formatPrecioARS` (si `precio === 0`, mostrar "Consultar"). CTA "Reservar" por tarjeta que apunta a `/turnos?servicio=...`. Responsive 1→2→3 columnas.

- [ ] **Step 2: Sobre mí** — sección a dos columnas (foto + texto). Texto placeholder profesional. En mobile apila foto arriba.

- [ ] **Step 3: Verificar** — precios muestran "Consultar" con seed en 0; grilla responsive OK.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(landing): servicios + sobre mí"
```

### Task 9: Testimonios + Redes + CTA WhatsApp + Footer

**Files:**
- Create: `src/components/landing/Testimonios.tsx`, `Redes.tsx`, `CtaWhatsapp.tsx`, `Footer.tsx`

- [ ] **Step 1: Testimonios** — carrusel/grilla simple de 3 citas placeholder con nombre.

- [ ] **Step 2: Redes** — bloque con link a Instagram (`SITE.instagram`), handle, e invitación a seguir.

- [ ] **Step 3: CtaWhatsapp** — banda mauve con CTA a `https://wa.me/${SITE.whatsapp}` con mensaje pre-armado (`?text=`).

- [ ] **Step 4: Footer** — logo, horarios (`SITE.horarios`), contacto, redes, nota de llegadas tarde ("el turno se realiza dentro del tiempo restante"), copyright.

- [ ] **Step 5: Verificar** — links externos abren en pestaña nueva; WhatsApp arma el chat.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(landing): testimonios, redes, CTA whatsapp, footer"
```

### Task 10: Composición de la landing + pulido responsive

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Componer** `page.tsx` con todas las secciones en orden: Nav, Hero, Servicios, SobreMi, Testimonios, Redes, CtaWhatsapp, Footer. Anclas (`#servicios`, `#sobre-mi`, `#contacto`) coherentes con el Nav.

- [ ] **Step 2: Pulido** — scroll-smooth, focos accesibles, `alt` en imágenes, contraste AA, sin overflow horizontal en 320–1440px.

- [ ] **Step 3: Verificación end-to-end**

Run: `npm run build && npm run dev`
Expected: build limpio; landing completa navegable en mobile y desktop; todos los CTAs enrutan (aunque `/turnos` y `/cursos` sean placeholders por ahora).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(landing): composición completa + pulido responsive"
```

**FIN FASE 1.** Checkpoint: landing pública demoable. Siguiente: Fase 2 (Admin + Auth + Config).

---

## Self-Review (checklist del autor)

**Spec coverage (Fase 0+1):** scaffold ✓ (T1), design system/tokens/fuentes ✓ (T2), clientes Supabase ✓ (T4), modelo de datos + seed ✓ (T5), landing con hero/servicios+precios/sobre mí/testimonios/redes/CTA/footer ✓ (T7–T10), mobile-first ✓, español AR ✓. Fuera de Fase 0+1 (turnos, cursos, admin, deploy): cubiertos por el roadmap del spec, planes propios por fase.

**Placeholders:** el contenido de marca (textos, fotos, precios, WhatsApp real) es placeholder **intencional** hasta recibir material de Gisel — está señalado en `site.ts` y en las tareas. No hay placeholders de lógica.

**Type consistency:** `formatPrecioARS(monto: number)` usado igual en Servicios (T8). `SITE`/`SERVICIOS_UI` definidos en T6 y consumidos en T7–T9. Clientes Supabase (`createClient`, `createAdminClient`) definidos en T4.

**Notas de ejecución:**
- create-next-app@latest usa Tailwind v4 (config por `@theme` en `globals.css`). Si scaffoldea otra versión, adaptar el Task 2 al mecanismo de config correspondiente.
- El logo real va en `public/brand/`; hasta entonces, fallback tipográfico.
