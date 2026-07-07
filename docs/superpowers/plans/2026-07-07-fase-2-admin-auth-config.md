# Fase 2 — Admin + Auth + Config — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para implementar tarea por tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** Panel de admin protegido con login de Gisel (Supabase Auth), CRUD de servicios y edición de la configuración de negocio; y que la landing lea los servicios reales desde Supabase.

**Architecture:** Auth con Supabase (email/password), sesión vía cookies con middleware que refresca y protege `/admin/*`. Las escrituras se hacen en **Server Actions** que verifican sesión y usan el cliente **service-role** (RLS queda cerrada para escritura pública). Lecturas públicas (landing) con cliente anónimo (RLS: solo `activo=true`). Lecturas de admin con service-role (ve todo).

**Tech Stack:** Next.js 16 App Router (server actions, middleware), @supabase/ssr, Supabase Auth.

---

## File Structure

```
src/
  middleware.ts                      → protege /admin, refresca sesión
  lib/
    supabase/
      middleware.ts                  → updateSession (helper SSR)
      public.ts                      → cliente anónimo para lecturas públicas server-side
    data/
      types.ts                       → Servicio, ConfiguracionNegocio
      servicios.ts                   → getServiciosPublicos / getServiciosAdmin
      configuracion.ts               → getConfiguracion
    format.ts                        → + formatDuracion (TDD)
  app/
    admin/
      login/page.tsx                 → formulario de login
      layout.tsx                     → guard de sesión + shell (nav admin + logout)
      page.tsx                       → dashboard
      actions.ts                     → login / logout
      servicios/
        page.tsx                     → listado + alta + edición
        actions.ts                   → create/update/toggle/delete servicio
      configuracion/
        page.tsx                     → formulario de configuración
        actions.ts                   → updateConfiguracion
  components/
    landing/Servicios.tsx            → (modificar) lee de DB con fallback al seed
scripts/
  seed-admin.mjs                     → crea el usuario admin (lo corre Pablo)
```

---

### Task 1: Auth infra — helper SSR + middleware

**Files:**
- Create: `src/lib/supabase/middleware.ts`, `src/middleware.ts`

- [ ] **Step 1: Helper `updateSession`** — `src/lib/supabase/middleware.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdmin = path.startsWith("/admin");
  const isLogin = path === "/admin/login";

  if (isAdmin && !isLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}
```

- [ ] **Step 2: Middleware** — `src/middleware.ts`

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(admin): middleware de sesión + protección de /admin"
```

---

### Task 2: Login + logout

**Files:**
- Create: `src/app/admin/actions.ts`, `src/app/admin/login/page.tsx`

- [ ] **Step 1: Acciones** — `src/app/admin/actions.ts`

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent("Email o contraseña incorrectos")}`);
  }
  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
```

- [ ] **Step 2: Página de login** — `src/app/admin/login/page.tsx`

Formulario centrado, marca discreta, campos email/password, botón "Ingresar", muestra `searchParams.error` si viene. Usa `action={login}`.

```tsx
import { login } from "../actions";
import { Button } from "@/components/ui/Button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm rounded-2xl border border-mauve/15 bg-white/70 p-8">
        <h1 className="font-serif text-3xl text-ink">Panel de gestión</h1>
        <p className="mt-1 font-sans text-sm text-ink-soft">Ingresá para administrar tu sitio.</p>
        {error && (
          <p className="mt-4 rounded-lg bg-mauve/10 px-3 py-2 font-sans text-sm text-mauve-dark">
            {error}
          </p>
        )}
        <form action={login} className="mt-6 flex flex-col gap-4">
          <label className="font-sans text-sm text-ink-soft">
            Email
            <input name="email" type="email" required autoComplete="email"
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink outline-none focus:border-mauve" />
          </label>
          <label className="font-sans text-sm text-ink-soft">
            Contraseña
            <input name="password" type="password" required autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink outline-none focus:border-mauve" />
          </label>
          <button type="submit"
            className="mt-2 rounded-full bg-mauve px-7 py-3 font-sans text-sm font-medium text-cream transition hover:bg-mauve-dark">
            Ingresar
          </button>
        </form>
      </div>
    </main>
  );
}
```
(Se importa `Button` solo si se usa; si no, quitar el import.)

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(admin): login/logout con Supabase Auth"
```

---

### Task 3: Admin layout (guard) + dashboard

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`

- [ ] **Step 1: Layout con guard + shell** — `src/app/admin/layout.tsx`

Verifica `getUser()`; si no hay user y no es la ruta login, redirige. Renderiza header con links (Dashboard, Servicios, Configuración, Ver sitio) y botón logout (form con `action={logout}`). El login se renderiza sin shell (detectar y devolver `children` directo, o usar route group). Solución simple: el layout siempre renderiza shell salvo que no haya user (en cuyo caso el middleware ya redirigió a /admin/login, que tiene su propio `<main>`). Para evitar shell en la página de login, chequear el pathname no es trivial en layout server; en su lugar el login usa su propio full-screen y el layout solo agrega el header cuando hay user:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { Container } from "@/components/ui/Container";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Sin sesión: no envolvemos con shell (la /admin/login se muestra sola).
  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-mauve/15 bg-white/70">
        <Container className="flex h-16 items-center justify-between">
          <nav className="flex items-center gap-6 font-sans text-sm">
            <Link href="/admin" className="font-medium text-ink hover:text-mauve">Panel</Link>
            <Link href="/admin/servicios" className="text-ink-soft hover:text-mauve">Servicios</Link>
            <Link href="/admin/configuracion" className="text-ink-soft hover:text-mauve">Configuración</Link>
            <Link href="/" className="text-ink-soft hover:text-mauve">Ver sitio</Link>
          </nav>
          <form action={logout}>
            <button className="font-sans text-sm text-mauve hover:text-mauve-dark">Salir</button>
          </form>
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>
  );
}
```

- [ ] **Step 2: Dashboard** — `src/app/admin/page.tsx`

```tsx
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Hola, Gisel</h1>
      <p className="mt-2 font-sans text-ink-soft">Gestioná tu sitio desde acá.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/servicios" className="rounded-2xl border border-mauve/15 bg-white/60 p-6 transition hover:border-mauve/40">
          <h2 className="font-serif text-2xl text-ink">Servicios</h2>
          <p className="mt-1 font-sans text-sm text-ink-soft">Precios, duración y disponibilidad.</p>
        </Link>
        <Link href="/admin/configuracion" className="rounded-2xl border border-mauve/15 bg-white/60 p-6 transition hover:border-mauve/40">
          <h2 className="font-serif text-2xl text-ink">Configuración</h2>
          <p className="mt-1 font-sans text-sm text-ink-soft">Cancelación, recordatorios y horarios.</p>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build** → PASS.
- [ ] **Step 4: Commit** → `feat(admin): layout con guard + dashboard`

---

### Task 4: formatDuracion (TDD) + capa de datos

**Files:**
- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`
- Create: `src/lib/data/types.ts`, `src/lib/supabase/public.ts`, `src/lib/data/servicios.ts`, `src/lib/data/configuracion.ts`

- [ ] **Step 1: Test de formatDuracion** — agregar a `src/lib/format.test.ts`

```ts
import { formatDuracion } from "./format";

describe("formatDuracion", () => {
  it("horas y minutos", () => { expect(formatDuracion(90)).toBe("1h 30min"); });
  it("solo horas", () => { expect(formatDuracion(60)).toBe("1h"); });
  it("solo minutos", () => { expect(formatDuracion(40)).toBe("40min"); });
  it("dos horas", () => { expect(formatDuracion(120)).toBe("2h"); });
});
```

- [ ] **Step 2: Correr → FAIL** (`formatDuracion is not a function`). Run: `npm test`.

- [ ] **Step 3: Implementar** — agregar a `src/lib/format.ts`

```ts
export function formatDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
```

- [ ] **Step 4: Correr → PASS.** Run: `npm test`.

- [ ] **Step 5: Tipos** — `src/lib/data/types.ts`

```ts
export type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_minutos: number;
  precio: number;
  activo: boolean;
  orden: number;
};

export type ConfiguracionNegocio = {
  id: number;
  horas_minimas_cancelacion: number;
  horas_anticipacion_recordatorio: number;
  minutos_preparacion_entre_turnos: number;
  sena_porcentaje: number;
  horario_atencion: Record<string, [string, string]>;
};
```

- [ ] **Step 6: Cliente público** — `src/lib/supabase/public.ts`

```ts
import { createClient } from "@supabase/supabase-js";

export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
}
```

- [ ] **Step 7: Datos de servicios** — `src/lib/data/servicios.ts`

```ts
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Servicio } from "./types";

/** Públicos: solo activos (respeta RLS). Devuelve [] si la DB no está lista. */
export async function getServiciosPublicos(): Promise<Servicio[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .eq("activo", true)
      .order("orden");
    if (error) return [];
    return (data as Servicio[]) ?? [];
  } catch {
    return [];
  }
}

/** Admin: todos (service-role). */
export async function getServiciosAdmin(): Promise<Servicio[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("servicios").select("*").order("orden");
  if (error) throw new Error(error.message);
  return (data as Servicio[]) ?? [];
}
```

- [ ] **Step 8: Datos de configuración** — `src/lib/data/configuracion.ts`

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfiguracionNegocio } from "./types";

export async function getConfiguracion(): Promise<ConfiguracionNegocio | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("configuracion_negocio")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) return null;
  return data as ConfiguracionNegocio;
}
```

- [ ] **Step 9: Verificar build + tests** → PASS.
- [ ] **Step 10: Commit** → `feat: capa de datos (servicios, config) + formatDuracion`

---

### Task 5: CRUD de servicios

**Files:**
- Create: `src/app/admin/servicios/actions.ts`, `src/app/admin/servicios/page.tsx`

- [ ] **Step 1: Acciones** — `src/app/admin/servicios/actions.ts`

Cada acción: (1) verifica sesión con el server client (`getUser()`, si no hay → throw/redirect), (2) escribe con el admin client, (3) `revalidatePath`.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
}

function revalidar() {
  revalidatePath("/admin/servicios");
  revalidatePath("/");
}

export async function createServicio(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("servicios").insert({
    nombre: String(formData.get("nombre")),
    duracion_minutos: Number(formData.get("duracion_minutos")),
    precio: Number(formData.get("precio")),
    orden: Number(formData.get("orden") || 0),
  });
  revalidar();
}

export async function updateServicio(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = String(formData.get("id"));
  await db.from("servicios").update({
    nombre: String(formData.get("nombre")),
    duracion_minutos: Number(formData.get("duracion_minutos")),
    precio: Number(formData.get("precio")),
    orden: Number(formData.get("orden")),
    activo: formData.get("activo") === "on",
  }).eq("id", id);
  revalidar();
}

export async function deleteServicio(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("servicios").delete().eq("id", String(formData.get("id")));
  revalidar();
}
```

- [ ] **Step 2: Página** — `src/app/admin/servicios/page.tsx`

Server component: `getServiciosAdmin()`. Renderiza (1) formulario de alta, (2) una fila-formulario por servicio con inputs (nombre, duración, precio, orden, checkbox activo) + botón Guardar (`action={updateServicio}`) + botón Eliminar (`action={deleteServicio}`). Precio y duración numéricos. Mostrar `formatDuracion`/`formatPrecioARS` como ayuda visual.

```tsx
import { getServiciosAdmin } from "@/lib/data/servicios";
import { createServicio, updateServicio, deleteServicio } from "./actions";
import { formatPrecioARS, formatDuracion } from "@/lib/format";

export default async function ServiciosAdmin() {
  const servicios = await getServiciosAdmin();
  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Servicios</h1>

      <form action={createServicio} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-mauve/15 bg-white/60 p-4">
        <input name="nombre" placeholder="Nombre" required className="rounded-lg border border-mauve/20 px-3 py-2" />
        <input name="duracion_minutos" type="number" placeholder="Min" required className="w-24 rounded-lg border border-mauve/20 px-3 py-2" />
        <input name="precio" type="number" placeholder="Precio" className="w-32 rounded-lg border border-mauve/20 px-3 py-2" />
        <input name="orden" type="number" placeholder="Orden" className="w-24 rounded-lg border border-mauve/20 px-3 py-2" />
        <button className="rounded-full bg-mauve px-6 py-2 text-sm font-medium text-cream hover:bg-mauve-dark">Agregar</button>
      </form>

      <div className="mt-6 space-y-3">
        {servicios.map((s) => (
          <form key={s.id} action={updateServicio} className="flex flex-wrap items-center gap-3 rounded-xl border border-mauve/15 bg-white/60 p-3">
            <input type="hidden" name="id" value={s.id} />
            <input name="nombre" defaultValue={s.nombre} className="min-w-48 flex-1 rounded-lg border border-mauve/20 px-3 py-2" />
            <input name="duracion_minutos" type="number" defaultValue={s.duracion_minutos} className="w-20 rounded-lg border border-mauve/20 px-3 py-2" title={formatDuracion(s.duracion_minutos)} />
            <input name="precio" type="number" defaultValue={s.precio} className="w-28 rounded-lg border border-mauve/20 px-3 py-2" title={formatPrecioARS(s.precio)} />
            <input name="orden" type="number" defaultValue={s.orden} className="w-20 rounded-lg border border-mauve/20 px-3 py-2" />
            <label className="flex items-center gap-1 text-sm text-ink-soft">
              <input name="activo" type="checkbox" defaultChecked={s.activo} /> activo
            </label>
            <button className="rounded-full bg-sage px-4 py-2 text-sm text-cream hover:bg-sage-dark">Guardar</button>
            <button formAction={deleteServicio} className="text-sm text-mauve hover:text-mauve-dark">Eliminar</button>
          </form>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build** → PASS.
- [ ] **Step 4: Commit** → `feat(admin): CRUD de servicios`

---

### Task 6: Configuración de negocio

**Files:**
- Create: `src/app/admin/configuracion/actions.ts`, `src/app/admin/configuracion/page.tsx`

- [ ] **Step 1: Acción** — `src/app/admin/configuracion/actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateConfiguracion(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const db = createAdminClient();
  await db.from("configuracion_negocio").update({
    horas_minimas_cancelacion: Number(formData.get("horas_minimas_cancelacion")),
    horas_anticipacion_recordatorio: Number(formData.get("horas_anticipacion_recordatorio")),
    minutos_preparacion_entre_turnos: Number(formData.get("minutos_preparacion_entre_turnos")),
    sena_porcentaje: Number(formData.get("sena_porcentaje")),
  }).eq("id", 1);
  revalidatePath("/admin/configuracion");
}
```

- [ ] **Step 2: Página** — `src/app/admin/configuracion/page.tsx`

Server component: `getConfiguracion()`. Form con 4 campos numéricos (cancelación, recordatorio, preparación, seña %). Si `getConfiguracion()` devuelve null (migración no aplicada), mostrar aviso "Aplicá la migración de la base primero". (El horario_atencion se edita en una fase posterior; por ahora solo mostrar los 4 numéricos.)

```tsx
import { getConfiguracion } from "@/lib/data/configuracion";
import { updateConfiguracion } from "./actions";

export default async function ConfiguracionAdmin() {
  const config = await getConfiguracion();
  if (!config) {
    return <p className="font-sans text-ink-soft">No se pudo leer la configuración. Aplicá la migración de la base (<code>supabase db push</code>) y recargá.</p>;
  }
  const field = (name: string, label: string, value: number) => (
    <label className="font-sans text-sm text-ink-soft">
      {label}
      <input name={name} type="number" defaultValue={value}
        className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink" />
    </label>
  );
  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-4xl text-ink">Configuración</h1>
      <form action={updateConfiguracion} className="mt-6 flex flex-col gap-4">
        {field("horas_minimas_cancelacion", "Horas mínimas para cancelar/reprogramar", config.horas_minimas_cancelacion)}
        {field("horas_anticipacion_recordatorio", "Horas de anticipación del recordatorio", config.horas_anticipacion_recordatorio)}
        {field("minutos_preparacion_entre_turnos", "Minutos de preparación entre turnos", config.minutos_preparacion_entre_turnos)}
        {field("sena_porcentaje", "Porcentaje de seña (%)", config.sena_porcentaje)}
        <button className="mt-2 self-start rounded-full bg-mauve px-7 py-3 text-sm font-medium text-cream hover:bg-mauve-dark">Guardar</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build** → PASS.
- [ ] **Step 4: Commit** → `feat(admin): configuración de negocio`

---

### Task 7: Landing lee servicios desde Supabase (con fallback)

**Files:**
- Modify: `src/components/landing/Servicios.tsx`

- [ ] **Step 1: Leer de DB con fallback** — hacer `Servicios` async, usar `getServiciosPublicos()`; si viene vacío, usar `SERVICIOS_UI` (seed). Mapear `duracion_minutos` con `formatDuracion`.

```tsx
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SERVICIOS_UI } from "@/lib/site";
import { formatPrecioARS, formatDuracion } from "@/lib/format";
import { getServiciosPublicos } from "@/lib/data/servicios";

export async function Servicios() {
  const db = await getServiciosPublicos();
  const items = db.length
    ? db.map((s) => ({ nombre: s.nombre, duracion: formatDuracion(s.duracion_minutos), precio: s.precio }))
    : SERVICIOS_UI;
  // ...resto del markup igual, iterando `items`
}
```
(El resto del JSX del componente no cambia; solo la fuente de `items`.)

- [ ] **Step 2: Verificar build** → PASS. Sin DB, la landing sigue mostrando el seed (fallback).
- [ ] **Step 3: Commit** → `feat(landing): servicios desde Supabase con fallback al seed`

---

### Task 8: Verificación + script seed admin + cierre

**Files:**
- Create: `scripts/seed-admin.mjs`

- [ ] **Step 1: Script para crear el usuario admin** — `scripts/seed-admin.mjs` (lo corre Pablo con Node, tomando credenciales de env/args)

```js
// Uso: node scripts/seed-admin.mjs <email> <password>
// Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY en el entorno (o .env.local ya cargado).
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) { console.error("Uso: node scripts/seed-admin.mjs <email> <password>"); process.exit(1); }

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (error) { console.error("Error:", error.message); process.exit(1); }
console.log("Usuario admin creado:", data.user.email);
```

- [ ] **Step 2: Verificación completa**

Run: `npm test` (formatPrecioARS + formatDuracion) → PASS.
Run: `npm run build` → PASS.
Run: `npm run lint` → sin errores.
Levantar server, matar procesos viejos en :3000 primero, y confirmar: `/` (200, landing con logos), `/admin` redirige a `/admin/login` (302/200 con formulario). Documentar los pasos que quedan para Pablo (aplicar migración, crear admin, probar login/CRUD en vivo).

- [ ] **Step 3: Commit** → `chore(admin): script seed-admin + verificación fase 2`

- [ ] **Step 4: Cierre** — usar finishing-a-development-branch (merge a main local).

---

## Self-Review

**Spec coverage (Fase 2):** login Supabase Auth ✓ (T2), protección /admin ✓ (T1), CRUD servicios ✓ (T5), configuración de negocio (cancelación/recordatorio/preparación/seña) ✓ (T6), landing con precios reales ✓ (T7). El editor del `horario_atencion` (JSON) se pospone: los 4 numéricos cubren lo pedido para el MVP; el horario ya tiene seed correcto.

**Placeholders:** ninguno de lógica. UI de admin es funcional/mínima a propósito (no decorativa).

**Type consistency:** `Servicio`/`ConfiguracionNegocio` (T4) usados en data layer (T4), admin (T5, T6) y landing (T7). `getServiciosPublicos`/`getServiciosAdmin`/`getConfiguracion` definidos en T4. `login`/`logout` en T2 usados en T2/T3. `requireAdmin` local a servicios/actions; la de configuración replica el chequeo inline (aceptable, archivos distintos).

**Notas de ejecución:**
- Verificación E2E de login/CRUD requiere: migración aplicada (`supabase db push`) + usuario admin creado (`scripts/seed-admin.mjs`). Ambos los corre Pablo. El build/lint/tests y el redirect de /admin sí se verifican acá.
- RLS: escritura solo por service-role desde server actions con sesión válida; lectura pública sigue limitada a `activo=true`.
