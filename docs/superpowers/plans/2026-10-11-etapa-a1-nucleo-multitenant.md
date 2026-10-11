# Etapa A1 — Núcleo multi-tenant: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que el sitio deje de ser de un solo negocio. Cada cliente (tenant) se identifica por subdominio, sus datos quedan aislados en la base y Gisel pasa a ser el primer tenant sin perder nada.

**Arquitectura:**
- El `proxy` lee el host y reescribe `gisel.<PLATFORM_DOMAIN>/…` a `/sitio/gisel/…`.
- Todas las tablas de negocio llevan `tenant_id`, con RLS para usuarios autenticados y anónimos.
- El servidor, que usa la service role y por eso se saltea RLS, accede a esas tablas solo a través de `datosDelTenant(tenantId)`, que agrega el filtro y fija `tenant_id` en cada operación.
- El contenido del sitio (textos, contacto, logo, foto, testimonios, módulos) sale de la base en lugar de estar fijo en el código.

**Stack:** Next.js 16 (App Router, `proxy.ts`), Supabase (Postgres, RLS, Auth), `@supabase/supabase-js`, `pg` (solo para el script de migraciones), Vitest.

**Spec:** [docs/superpowers/specs/2026-10-11-plataforma-multitenant-design.md](../specs/2026-10-11-plataforma-multitenant-design.md).

---

## Alcance de A1 y diferencias con el spec

La etapa A del spec se divide en dos planes:

- **A1 (este plan):** tablas, RLS, migración de Gisel, `datosDelTenant`, `proxy` con subdominios, páginas bajo `/sitio/[tenant]`, contenido del sitio desde la base, permisos del admin por tenant y tests de aislamiento.
- **A2 (plan siguiente):** colores neutros con la paleta de cada tenant, `<T>` con traducción al portugués, zona horaria, moneda y teléfono por país, y el `lang` del HTML por tenant.

Decisiones tomadas al planificar A1:

1. **Imágenes como URL.** `tenant_marca` guarda `logo_url`, `logo_claro_url` y `foto_perfil_url` en lugar de `*_path`. En A1 son rutas de `public/` (por ejemplo `/gisel/retrato.jpg`). En la etapa C, la subida de archivos al bucket `sitios` guarda la URL pública en esos mismos campos.
2. **Campos de marca que agrega este plan.** `logo_claro_url` (el footer es oscuro y usa la versión clara del logo), `rubro`, `tagline`, `inicio_destacado` (la parte resaltada del título de inicio) y `nota_reservas` (el texto de "llegadas tarde" del footer). Todos salen de textos que hoy están fijos en el código.
3. **El panel del cliente sigue en `/admin`** (en `src/app/admin`, sin moverse a `/sitio`). El `proxy` lo deja pasar en el subdominio del tenant y el código lo resuelve desde el host.
4. **Se adelanta de la etapa B el cierre del agujero de permisos.** El admin ya verifica `perfiles`: el rol, y que el tenant del perfil sea el del host. La verificación por email sigue en B.
5. **Un solo layout raíz.** Varios layouts raíz exigen la opción experimental `globalNotFound` de Next 16. El `lang` por tenant se resuelve en A2.
6. **`TENANT_POR_DEFECTO`.** Es el tenant que se muestra cuando el host no es un subdominio de la plataforma, por ejemplo el túnel de Cloudflare o una IP. Sirve para las demos hasta tener dominio.
7. **Fuera de A1:** `LoadingOverlay` (monograma de Gisel), el logo de los emails y los colores siguen con la marca de Gisel. Se resuelven en A2 (colores y overlay) y en D (emails).

## Requisito previo (lo hace Pablo, no Claude)

`SUPABASE_DB_URL` en `.env.local`. Es la conexión directa a Postgres que usan el script de migraciones (DDL) y la verificación del estado de la base. Para obtenerla:

1. En Supabase, abrir el proyecto, hacer clic en **Connect** y copiar la URI de **Session pooler**.
2. Reemplazar `[YOUR-PASSWORD]` por la contraseña de la base. Si no se conoce, se resetea en **Project Settings → Database**.
3. Agregar la línea `SUPABASE_DB_URL=postgresql://…` al `.env.local`. Nunca pegarla en el chat ni commitearla.

Sin esto, la alternativa es pegar cada migración en el SQL Editor de Supabase. Los tests de aislamiento (Task 4) solo necesitan las claves que ya están en `.env.local`.

## Estructura de archivos

**Nuevos**

| Archivo | Responsabilidad |
|---|---|
| `scripts/migrar.mjs` | Aplica migraciones SQL con `pg`, cada una en una transacción, y las registra |
| `scripts/test-aislamiento.mjs` | Verifica contra la base real que un tenant no lee ni modifica datos de otro |
| `supabase/migrations/0008_multitenant.sql` | Tablas nuevas, `tenant_id` en las existentes, Gisel como primer tenant |
| `supabase/migrations/0009_rls_multitenant.sql` | Funciones `tenant_actual()`, `es_master()`, `tenant_activo()` y policies |
| `src/lib/tenant/host.ts` (+test) | Resolver host → tenant, master, raíz o desconocido; validar slug |
| `src/lib/tenant/consultas.ts` (+test) | `consultasDelTenant(db, tenantId)`: filtro y `tenant_id` en cada operación (puro, testeable) |
| `src/lib/tenant/datos.ts` | `datosDelTenant(tenantId)`: `consultasDelTenant` con el cliente service role |
| `src/lib/tenant/tipos.ts` | Tipos `Tenant`, `Marca`, `Modulos` |
| `src/lib/tenant/mapear.ts` (+test) | Fila de la base → `Tenant` |
| `src/lib/tenant/urls.ts` (+test) | `urlDelTenant(slug)`, `whatsappLink(numero, mensaje)` |
| `src/lib/tenant/permisos.ts` (+test) | `perfilAutorizado(perfil, tenantId)` |
| `src/lib/tenant/actual.ts` | `getTenantPorSlug` (cacheado por request), `tenantDeLaPagina`, `tenantDelRequest` |
| `src/lib/tenant/admin.ts` | `tenantDelAdmin()`: sesión, perfil y tenant del host |
| `src/lib/data/testimonios.ts` | `getTestimonios(tenantId)` |
| `src/app/sitio/[tenant]/layout.tsx` | Carga el tenant (404 o suspendido), metadata, `Nav` y `Footer` |
| `src/app/sitio/[tenant]/not-found.tsx` | 404 del sitio |
| `src/components/landing/SitioSuspendido.tsx` | Página "sitio no disponible" |

**Movidos:** `src/app/page.tsx`, `src/app/turnos/**` y `src/app/cursos/**` pasan a `src/app/sitio/[tenant]/…`.

**Modificados**

- `src/proxy.ts`
- `src/lib/data/{servicios,configuracion,cursos,turnos,types}.ts`
- Componentes de `src/components/landing/*`, `Logo` y los imports de `src/components/turnos/*` y `src/components/cursos/CompraForm.tsx`
- `src/app/admin/**`
- `src/app/api/webhooks/mercadopago/route.ts` y `src/app/api/cron/recordatorios/route.ts`
- `src/lib/mercadopago/client.ts`, `src/lib/video/*` y `src/lib/storage/archivos.ts`
- `src/lib/turnos/horario.ts` (+test)
- `next.config.ts`, `.env.example`, `README.md` y `package.json`

**Borrados:** `src/lib/site.ts` y `src/lib/supabase/public.ts`, que quedan sin uso.

**Commits:** las Tasks 1 a 9 compilan por separado y se commitean una por una. Las Tasks 10 a 16 cambian firmas que usan muchos archivos: se commitean juntas al final de la Task 16, cuando `tsc`, lint, tests y build pasan.

---

### Task 1: Script de migraciones y estado de la base

**Files:**
- Create: `scripts/migrar.mjs`
- Modify: `package.json`

- [ ] **Step 1: Instalar `pg`**

Run: `npm install -D pg`
Expected: `pg` en `devDependencies`.

- [ ] **Step 2: Crear `scripts/migrar.mjs`**

```js
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
```

- [ ] **Step 3: Agregar los scripts npm**

En `package.json`, dentro de `"scripts"`, después de `"test:watch": "vitest"`:

```json
    "test:watch": "vitest",
    "migrar": "node --env-file=.env.local scripts/migrar.mjs",
    "test:aislamiento": "node --env-file=.env.local scripts/test-aislamiento.mjs"
```

- [ ] **Step 4: Verificar qué migraciones existen en la base**

Run:

```bash
node --env-file=.env.local -e '
const pg=require("pg");const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});
c.connect().then(async()=>{for(const t of ["turnos.token_gestion","intentos_reserva","recordatorios_enviados","cursos.preview_youtube_url"]){const [tabla,col]=t.split(".");const q=col?`select 1 from information_schema.columns where table_schema=\x27public\x27 and table_name=$1 and column_name=$2`:`select 1 from information_schema.tables where table_schema=\x27public\x27 and table_name=$1`;const r=await c.query(q,col?[tabla,col]:[tabla]);console.log(t, r.rowCount? "existe":"FALTA")}await c.end()})'
```

Expected: las cuatro dicen `existe`, salvo posiblemente `recordatorios_enviados` (la 0005 no se confirmó como aplicada).

- [ ] **Step 5: Registrar las ya aplicadas y aplicar la 0005 si falta**

```bash
npm run migrar -- --solo-registrar supabase/migrations/0001_init.sql supabase/migrations/0002_turnos_gestion.sql supabase/migrations/0003_cursos_acceso.sql supabase/migrations/0004_rate_limit_reservas.sql supabase/migrations/0007_cursos_preview_youtube.sql
```

- Si `recordatorios_enviados` dijo `FALTA`, correr `npm run migrar -- supabase/migrations/0005_recordatorios.sql`.
- Si dijo `existe`, correr `npm run migrar -- --solo-registrar supabase/migrations/0005_recordatorios.sql`.
- **No** aplicar ni registrar la `0006_cron_jobs.sql`: requiere secretos en Vault y una URL pública, y queda para la etapa E.

Expected: `✓ registrada` o `✓ aplicada` por archivo.

- [ ] **Step 6: Commit**

```bash
git add scripts/migrar.mjs package.json package-lock.json
git commit -m "chore(db): script de migraciones con registro de aplicadas"
```

---

### Task 2: Migración 0008, esquema multi-tenant y Gisel como primer tenant

**Files:**
- Create: `supabase/migrations/0008_multitenant.sql`

- [ ] **Step 1: Crear la migración**

```sql
-- Etapa A1: núcleo multi-tenant. Gisel pasa a ser el primer tenant.
-- Requiere la 0005 (recordatorios_enviados).

-- ---------- tenants ----------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (
      slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
      and slug not in ('www', 'app', 'admin', 'master', 'api')
    ),
  nombre text not null,
  estado text not null default 'activo' check (estado in ('activo', 'suspendido')),
  idioma text not null default 'es' check (idioma in ('es', 'pt')),
  pais text not null default 'AR' check (pais in ('AR', 'BR')),
  zona_horaria text not null default 'America/Argentina/Buenos_Aires',
  moneda text not null default 'ARS' check (moneda in ('ARS', 'BRL')),
  modulo_turnos boolean not null default true,
  modulo_cursos boolean not null default false,
  modulo_sobre_mi boolean not null default true,
  modulo_testimonios boolean not null default false,
  modulo_galeria boolean not null default false,
  modulo_faq boolean not null default false,
  modulo_whatsapp boolean not null default false,
  creado_en timestamptz not null default now()
);

-- ---------- tenant_marca: lo que hace única la página ----------
create table tenant_marca (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  color_primario text not null default '#c0899a',
  color_secundario text not null default '#4e5340',
  color_fondo text not null default '#f6f1ea',
  color_texto text not null default '#1a1a1a',
  logo_url text,
  logo_claro_url text,
  foto_perfil_url text,
  rubro text,
  tagline text,
  inicio_titulo text not null,
  inicio_destacado text,
  inicio_texto text,
  sobre_mi_titulo text,
  sobre_mi_texto text,
  nota_reservas text,
  whatsapp text,
  instagram text,
  email_contacto text,
  direccion text
);

-- ---------- tenant_credenciales: valores sensibles cifrados (etapa D) ----------
create table tenant_credenciales (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  mp_access_token text,
  mp_refresh_token text,
  mp_token_vence_en timestamptz,
  mp_public_key text,
  mp_user_id text,
  mp_origen text check (mp_origen in ('oauth', 'manual')),
  mp_webhook_secret text,
  smtp_usuario text,
  smtp_password text,
  smtp_nombre_remitente text,
  smtp_estado text not null default 'sin_configurar'
    check (smtp_estado in ('ok', 'error', 'sin_configurar')),
  smtp_ultimo_error text,
  google_refresh_token text,
  google_calendar_id text
);

-- ---------- perfiles: rol de cada usuario ----------
create table perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rol text not null check (rol in ('master', 'cliente')),
  tenant_id uuid references tenants (id) on delete cascade,
  constraint perfil_coherente check (
    (rol = 'master' and tenant_id is null) or (rol = 'cliente' and tenant_id is not null)
  )
);

-- ---------- testimonios (antes fijos en el código) ----------
create table testimonios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nombre text not null,
  texto text not null,
  orden int not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index idx_testimonios_tenant on testimonios (tenant_id);

-- ---------- Gisel ----------
insert into tenants (slug, nombre, modulo_turnos, modulo_cursos, modulo_sobre_mi, modulo_testimonios)
values ('gisel', 'Gisel Bigurrarena', true, true, true, true);

-- ---------- tenant_id en las tablas existentes ----------
do $$
declare
  t text;
  gisel uuid := (select id from public.tenants where slug = 'gisel');
begin
  foreach t in array array[
    'servicios', 'turnos', 'cursos', 'archivos_curso', 'accesos_curso',
    'pagos', 'intentos_reserva', 'recordatorios_enviados'
  ] loop
    execute format(
      'alter table public.%I add column tenant_id uuid references public.tenants (id) on delete cascade', t);
    execute format('update public.%I set tenant_id = %L', t, gisel);
    execute format('alter table public.%I alter column tenant_id set not null', t);
    execute format('create index %I on public.%I (tenant_id)', 'idx_' || t || '_tenant', t);
  end loop;
end $$;

-- ---------- configuracion_negocio: de "una sola fila" a una fila por tenant ----------
alter table configuracion_negocio
  add column tenant_id uuid references tenants (id) on delete cascade;
update configuracion_negocio set tenant_id = (select id from tenants where slug = 'gisel');
alter table configuracion_negocio drop constraint solo_una_fila;
alter table configuracion_negocio drop constraint configuracion_negocio_pkey;
alter table configuracion_negocio drop column id;
alter table configuracion_negocio alter column tenant_id set not null;
alter table configuracion_negocio add primary key (tenant_id);

-- ---------- Contenido de Gisel (antes fijo en el código) ----------
insert into tenant_marca (
  tenant_id, logo_url, logo_claro_url, foto_perfil_url, rubro, tagline,
  inicio_titulo, inicio_destacado, inicio_texto, sobre_mi_titulo, sobre_mi_texto,
  nota_reservas, whatsapp, instagram, email_contacto, direccion
)
select
  id,
  '/brand/horizontal-negro.png',
  '/brand/horizontal-blanco.png',
  '/gisel/retrato.jpg',
  'Estética y Salud',
  'Belleza y bienestar con mirada profesional',
  'Tu momento de',
  'belleza y bienestar',
  'Tratamientos faciales, corporales, manos y pies con mirada profesional. Reservá tu turno online y sumate a mis cursos de estética.',
  'Hola, soy Gisel',
  E'Soy esteticista y me dedico a cuidar la piel y el bienestar de cada persona que pasa por mi espacio. Trabajo de forma personalizada, con productos de calidad y mucha dedicación.\n\nAdemás de atender en el consultorio, comparto mi experiencia a través de cursos de estética, tanto para profesionales del rubro como para quienes quieren aprender a cuidarse en casa.\n\n(Texto de ejemplo — se reemplaza por la presentación real de Gisel.)',
  'Llegadas tarde: el turno se realiza únicamente dentro del tiempo restante disponible, sin extender el horario.',
  '+5490000000000',
  'esteticaysaludgisel',
  'hola@esteticagisel.com.ar',
  'Argentina'
from tenants where slug = 'gisel';

insert into tenant_credenciales (tenant_id) select id from tenants where slug = 'gisel';

insert into testimonios (tenant_id, nombre, texto, orden)
select t.id, v.nombre, v.texto, v.orden
from tenants t,
  (values
    ('Carla M.', 'Salí renovada. Gisel es súper profesional y el trato es hermoso. Ya reservé mi próximo turno.', 1),
    ('Sofía R.', 'El laminado de cejas me encantó, quedó natural y prolijo. Recomendadísima.', 2),
    ('Daniela P.', 'Hice uno de sus cursos y aprendí un montón. Explica clarísimo y con mucha dedicación.', 3)
  ) as v (nombre, texto, orden)
where t.slug = 'gisel';

-- Los usuarios que existen hoy son el admin de Gisel.
insert into perfiles (user_id, rol, tenant_id)
select u.id, 'cliente', t.id from auth.users u, tenants t where t.slug = 'gisel'
on conflict (user_id) do nothing;
```

- [ ] **Step 2: Aplicar**

Run: `npm run migrar -- supabase/migrations/0008_multitenant.sql`
Expected: `✓ aplicada 0008_multitenant.sql`. Si falla, la transacción se revierte y la base queda como estaba. Corregir el SQL y volver a correr.

- [ ] **Step 3: Verificar el backfill**

```bash
node --env-file=.env.local -e '
const pg=require("pg");const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});
c.connect().then(async()=>{for(const t of ["servicios","turnos","cursos","configuracion_negocio","testimonios","perfiles"]){const r=await c.query(`select count(*) total, count(tenant_id) con_tenant from public.${t}`);console.log(t,r.rows[0])}await c.end()})'
```

Expected: en cada tabla, `total` igual a `con_tenant`. `servicios` tiene 9, `cursos` 3, `configuracion_negocio` 1 y `testimonios` 3.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0008_multitenant.sql
git commit -m "feat(db): esquema multi-tenant y Gisel como primer tenant"
```

---

### Task 3: Migración 0009, RLS por tenant

**Files:**
- Create: `supabase/migrations/0009_rls_multitenant.sql`

- [ ] **Step 1: Crear la migración**

```sql
-- RLS multi-tenant. El servidor usa la service role (se saltea RLS) y accede vía
-- datosDelTenant(); estas policies son la defensa para usuarios autenticados y anónimos.

create or replace function public.tenant_actual() returns uuid
language sql stable security definer set search_path = '' as $$
  select tenant_id from public.perfiles where user_id = auth.uid()
$$;

create or replace function public.es_master() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where user_id = auth.uid() and rol = 'master')
$$;

create or replace function public.tenant_activo(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tenants where id = t and estado = 'activo')
$$;

alter table tenants enable row level security;
alter table tenant_marca enable row level security;
alter table tenant_credenciales enable row level security; -- sin policies: nadie la lee por API
alter table perfiles enable row level security;
alter table testimonios enable row level security;

-- Tablas de negocio: el cliente ve y escribe solo su tenant; el master, todo.
do $$
declare t text;
begin
  foreach t in array array[
    'servicios', 'configuracion_negocio', 'turnos', 'cursos', 'archivos_curso',
    'accesos_curso', 'pagos', 'intentos_reserva', 'recordatorios_enviados', 'testimonios'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (tenant_id = public.tenant_actual() or public.es_master())
         with check (tenant_id = public.tenant_actual() or public.es_master())',
      t || ': su tenant', t);
  end loop;
end $$;

-- Lecturas públicas (anónimos): solo contenido publicado de tenants activos.
drop policy "servicios activos son públicos" on servicios;
create policy "servicios: públicos activos" on servicios
  for select to anon using (activo and public.tenant_activo(tenant_id));

drop policy "cursos publicados son públicos" on cursos;
create policy "cursos: públicos publicados" on cursos
  for select to anon using (estado = 'publicado' and public.tenant_activo(tenant_id));

create policy "testimonios: públicos activos" on testimonios
  for select to anon using (activo and public.tenant_activo(tenant_id));

-- tenants: datos no sensibles; módulos y estado solo los cambia el master.
create policy "tenants: públicos activos" on tenants
  for select to anon using (estado = 'activo');
create policy "tenants: lectura propia" on tenants
  for select to authenticated using (id = public.tenant_actual() or public.es_master());
create policy "tenants: solo master escribe" on tenants
  for all to authenticated using (public.es_master()) with check (public.es_master());

-- tenant_marca: pública; la escribe el master (los textos del cliente pasan por
-- server actions con lista blanca de campos, etapa C).
create policy "marca: pública de tenants activos" on tenant_marca
  for select to anon using (public.tenant_activo(tenant_id));
create policy "marca: lectura propia" on tenant_marca
  for select to authenticated using (tenant_id = public.tenant_actual() or public.es_master());
create policy "marca: solo master escribe" on tenant_marca
  for all to authenticated using (public.es_master()) with check (public.es_master());

-- perfiles: cada uno ve el suyo; solo el master asigna roles.
create policy "perfiles: el propio" on perfiles
  for select to authenticated using (user_id = auth.uid() or public.es_master());
create policy "perfiles: solo master escribe" on perfiles
  for all to authenticated using (public.es_master()) with check (public.es_master());
```

- [ ] **Step 2: Aplicar**

Run: `npm run migrar -- supabase/migrations/0009_rls_multitenant.sql`
Expected: `✓ aplicada 0009_rls_multitenant.sql`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0009_rls_multitenant.sql
git commit -m "feat(db): RLS por tenant"
```

---

### Task 4: Tests de aislamiento contra la base real

**Files:**
- Create: `scripts/test-aislamiento.mjs`

- [ ] **Step 1: Crear el script**

```js
// Verifica el aislamiento entre tenants contra la base real (RLS).
// Crea dos tenants de prueba con una fila en cada tabla y un usuario cliente por
// tenant; comprueba que el usuario de A no lee ni modifica nada de B, que no puede
// tocar su propia marca/módulos/rol, y qué ve un anónimo. Al final borra todo.
// Uso: npm run test:aislamiento
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

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

let fallas = 0;
function verificar(ok, descripcion) {
  console.log(`${ok ? "✓" : "✗"} ${descripcion}`);
  if (!ok) fallas++;
}
/** Una escritura bloqueada por RLS devuelve 0 filas o un error: ambos son "no pudo". */
function noAfecto(r) {
  return r.error ? true : r.data.length === 0;
}

async function ok(promesa, que) {
  const { data, error } = await promesa;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
}

const tenantsCreados = [];
const usuariosCreados = [];

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
  await ok(admin.from("archivos_curso").insert({ tenant_id: t, curso_id: curso.id, nombre_archivo: "a.pdf", storage_path: "x", tipo: "pdf" }), "archivo");
  await ok(admin.from("accesos_curso").insert({ tenant_id: t, curso_id: curso.id, cliente_email: "c@example.com", expira_en: new Date().toISOString() }), "acceso");
  await ok(admin.from("pagos").insert({ tenant_id: t, tipo: "turno", referencia_id: turno.id, estado: "approved", monto: 1 }), "pago");
  await ok(admin.from("intentos_reserva").insert({ tenant_id: t, ip: "127.0.0.1" }), "intento");
  await ok(admin.from("testimonios").insert({ tenant_id: t, nombre: "N", texto: "T" }), "testimonio");

  const email = `aislamiento-${letra}-${sufijo}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data: creado, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`usuario: ${error.message}`);
  usuariosCreados.push(creado.user.id);
  await ok(admin.from("perfiles").insert({ user_id: creado.user.id, rol: "cliente", tenant_id: t }), "perfil");
  return { id: t, userId: creado.user.id, email, password };
}

async function clienteLogueado(email, password) {
  const c = createClient(url, publishable, opciones);
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login: ${error.message}`);
  return c;
}

try {
  const a = await crearTenant("a");
  const b = await crearTenant("b");
  const usuarioA = await clienteLogueado(a.email, a.password);
  const anon = createClient(url, publishable, opciones);

  console.log("\nUsuario cliente del tenant A, sobre datos de B:");
  for (const tabla of TABLAS_TENANT) {
    const propios = await usuarioA.from(tabla).select("tenant_id").eq("tenant_id", a.id);
    verificar(!propios.error && propios.data.length > 0, `${tabla}: ve sus propias filas (control)`);
    const ajenos = await usuarioA.from(tabla).select("tenant_id").eq("tenant_id", b.id);
    verificar(!ajenos.error && ajenos.data.length === 0, `${tabla}: no ve filas de B`);
    verificar(
      noAfecto(await usuarioA.from(tabla).update({ tenant_id: a.id }).eq("tenant_id", b.id).select("tenant_id")),
      `${tabla}: no modifica filas de B`,
    );
    verificar(
      noAfecto(await usuarioA.from(tabla).delete().eq("tenant_id", b.id).select("tenant_id")),
      `${tabla}: no borra filas de B`,
    );
    const siguen = await admin.from(tabla).select("tenant_id", { count: "exact", head: true }).eq("tenant_id", b.id);
    verificar((siguen.count ?? 0) > 0, `${tabla}: las filas de B siguen intactas`);
  }

  const intruso = await usuarioA.from("servicios").insert({ tenant_id: b.id, nombre: "Intruso", duracion_minutos: 30 });
  verificar(!!intruso.error, "servicios: no puede insertar en B");

  console.log("\nUsuario cliente del tenant A, sobre lo propio que no debe tocar:");
  const credenciales = await usuarioA.from("tenant_credenciales").select("tenant_id");
  verificar(!credenciales.error && credenciales.data.length === 0, "tenant_credenciales: no lee ni las propias");
  const tenantsVisibles = await usuarioA.from("tenants").select("id");
  verificar(
    !tenantsVisibles.error && tenantsVisibles.data.length === 1 && tenantsVisibles.data[0].id === a.id,
    "tenants: solo ve el suyo",
  );
  verificar(
    noAfecto(await usuarioA.from("tenants").update({ modulo_galeria: true }).eq("id", a.id).select("id")),
    "tenants: no cambia sus propios módulos",
  );
  verificar(
    noAfecto(await usuarioA.from("tenant_marca").update({ color_primario: "#000000" }).eq("tenant_id", a.id).select("tenant_id")),
    "tenant_marca: no cambia su propia marca",
  );
  const perfilesVisibles = await usuarioA.from("perfiles").select("user_id");
  verificar(
    !perfilesVisibles.error && perfilesVisibles.data.every((p) => p.user_id === a.userId),
    "perfiles: solo ve el propio",
  );
  verificar(
    noAfecto(await usuarioA.from("perfiles").update({ rol: "master", tenant_id: null }).eq("user_id", a.userId).select("user_id")),
    "perfiles: no puede volverse master",
  );

  console.log("\nVisitante anónimo:");
  for (const tabla of [
    "tenant_credenciales", "turnos", "pagos", "accesos_curso", "perfiles",
    "configuracion_negocio", "intentos_reserva", "recordatorios_enviados", "archivos_curso",
  ]) {
    const r = await anon.from(tabla).select("*").limit(1);
    verificar(!r.error ? r.data.length === 0 : true, `${tabla}: no es legible`);
  }
  const serviciosAnon = await anon.from("servicios").select("nombre").in("tenant_id", [a.id, b.id]);
  verificar(
    !serviciosAnon.error && serviciosAnon.data.length === 2 && serviciosAnon.data.every((s) => s.nombre === "Servicio"),
    "servicios: ve solo los activos",
  );
  await ok(admin.from("tenants").update({ estado: "suspendido" }).eq("id", b.id), "suspender B");
  const deSuspendido = await anon.from("servicios").select("nombre").eq("tenant_id", b.id);
  verificar(!deSuspendido.error && deSuspendido.data.length === 0, "servicios: no ve los de un tenant suspendido");
} catch (e) {
  console.error(`\nError preparando la prueba: ${e.message}`);
  fallas++;
} finally {
  for (const id of usuariosCreados) await admin.auth.admin.deleteUser(id);
  for (const id of tenantsCreados) await admin.from("tenants").delete().eq("id", id);
}

console.log(fallas === 0 ? "\nAislamiento OK" : `\n${fallas} verificación(es) fallaron`);
process.exit(fallas === 0 ? 0 : 1);
```

- [ ] **Step 2: Correr**

Run: `npm run test:aislamiento`
Expected: todas las líneas con `✓` y `Aislamiento OK`, con código de salida 0. Si alguna falla, la corrección va en una migración nueva (`0010_…`), nunca editando la 0009 ya aplicada. Se aplica con `npm run migrar` y se vuelve a correr.

- [ ] **Step 3: Verificar que no quedaron datos de prueba**

```bash
node --env-file=.env.local -e '
const {createClient}=require("@supabase/supabase-js");const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY);
a.from("tenants").select("slug").then(r=>console.log(r.data))'
```

Expected: `[ { slug: 'gisel' } ]`.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-aislamiento.mjs
git commit -m "test(db): aislamiento entre tenants contra la base real"
```

---

### Task 5: Resolver host → tenant

**Files:**
- Create: `src/lib/tenant/host.ts`
- Test: `src/lib/tenant/host.test.ts`

- [ ] **Step 1: Escribir el test**

```ts
import { describe, it, expect } from "vitest";
import { resolverHost, esSlugValido } from "./host";

const cfg = { dominio: "tuproducto.com" };

describe("esSlugValido", () => {
  it("acepta minúsculas, números y guiones internos, de 3 a 40 caracteres", () => {
    expect(esSlugValido("gisel")).toBe(true);
    expect(esSlugValido("estetica-ana-2")).toBe(true);
  });

  it("rechaza mayúsculas, puntos, guiones en los bordes, longitudes inválidas y reservados", () => {
    expect(esSlugValido("Gisel")).toBe(false);
    expect(esSlugValido("a.b")).toBe(false);
    expect(esSlugValido("-gisel")).toBe(false);
    expect(esSlugValido("gisel-")).toBe(false);
    expect(esSlugValido("ab")).toBe(false);
    expect(esSlugValido("a".repeat(41))).toBe(false);
    expect(esSlugValido("app")).toBe(false);
    expect(esSlugValido("www")).toBe(false);
  });
});

describe("resolverHost", () => {
  it("un subdominio válido es un tenant", () => {
    expect(resolverHost("gisel.tuproducto.com", cfg)).toEqual({ tipo: "tenant", slug: "gisel" });
  });

  it("ignora mayúsculas del host", () => {
    expect(resolverHost("Gisel.TuProducto.com", cfg)).toEqual({ tipo: "tenant", slug: "gisel" });
  });

  it("app. es el panel master", () => {
    expect(resolverHost("app.tuproducto.com", cfg)).toEqual({ tipo: "master" });
  });

  it("el dominio pelado y www son la raíz", () => {
    expect(resolverHost("tuproducto.com", cfg)).toEqual({ tipo: "raiz" });
    expect(resolverHost("www.tuproducto.com", cfg)).toEqual({ tipo: "raiz" });
  });

  it("funciona con puerto en desarrollo", () => {
    const dev = { dominio: "localhost:3000" };
    expect(resolverHost("gisel.localhost:3000", dev)).toEqual({ tipo: "tenant", slug: "gisel" });
    expect(resolverHost("localhost:3000", dev)).toEqual({ tipo: "raiz" });
  });

  it("subdominios anidados, reservados o inválidos son desconocidos", () => {
    expect(resolverHost("a.gisel.tuproducto.com", cfg)).toEqual({ tipo: "desconocido" });
    expect(resolverHost("api.tuproducto.com", cfg)).toEqual({ tipo: "desconocido" });
    expect(resolverHost("x.tuproducto.com", cfg)).toEqual({ tipo: "desconocido" });
  });

  it("un host ajeno usa el tenant por defecto si está configurado", () => {
    expect(resolverHost("abc.trycloudflare.com", cfg)).toEqual({ tipo: "desconocido" });
    expect(resolverHost("abc.trycloudflare.com", { ...cfg, tenantPorDefecto: "gisel" })).toEqual({
      tipo: "tenant",
      slug: "gisel",
    });
  });

  it("no confunde un dominio que solo termina igual", () => {
    expect(resolverHost("gisel.otrotuproducto.com", cfg)).toEqual({ tipo: "desconocido" });
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run src/lib/tenant/host.test.ts`
Expected: FAIL, porque no existe `./host`.

- [ ] **Step 3: Implementar**

```ts
/** Subdominios que nunca pueden ser un tenant. */
export const SUBDOMINIOS_RESERVADOS = ["www", "app", "admin", "master", "api"] as const;

const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function esSlugValido(slug: string): boolean {
  return SLUG.test(slug) && !(SUBDOMINIOS_RESERVADOS as readonly string[]).includes(slug);
}

export type Destino =
  | { tipo: "tenant"; slug: string }
  | { tipo: "master" }
  | { tipo: "raiz" }
  | { tipo: "desconocido" };

export type ConfigHost = {
  /** Dominio de la plataforma, con puerto en desarrollo (ej. "localhost:3000"). */
  dominio: string;
  /** Tenant para hosts que no son de la plataforma (túneles, IP). */
  tenantPorDefecto?: string;
};

export function configHost(): ConfigHost {
  return {
    dominio: process.env.PLATFORM_DOMAIN || "localhost:3000",
    tenantPorDefecto: process.env.TENANT_POR_DEFECTO || undefined,
  };
}

/** A qué parte de la plataforma corresponde un host. */
export function resolverHost(host: string, cfg: ConfigHost): Destino {
  const h = host.trim().toLowerCase();
  const dominio = cfg.dominio.toLowerCase();

  if (h === dominio || h === `www.${dominio}`) return { tipo: "raiz" };

  if (h.endsWith(`.${dominio}`)) {
    const sub = h.slice(0, -(dominio.length + 1));
    if (sub === "app") return { tipo: "master" };
    return esSlugValido(sub) ? { tipo: "tenant", slug: sub } : { tipo: "desconocido" };
  }

  if (cfg.tenantPorDefecto && esSlugValido(cfg.tenantPorDefecto)) {
    return { tipo: "tenant", slug: cfg.tenantPorDefecto };
  }
  return { tipo: "desconocido" };
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx vitest run src/lib/tenant/host.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant/host.ts src/lib/tenant/host.test.ts
git commit -m "feat(tenant): resolver host a tenant, master o raíz"
```

---

### Task 6: `datosDelTenant`, la única puerta del servidor a los datos

**Files:**
- Create: `src/lib/tenant/consultas.ts`, `src/lib/tenant/datos.ts`
- Test: `src/lib/tenant/consultas.test.ts`

`consultas.ts` es puro: recibe el cliente, así el test no importa `server-only`. `datos.ts` le pasa el cliente service role.

- [ ] **Step 1: Escribir el test**

```ts
import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consultasDelTenant } from "./consultas";

/** Cliente falso que registra cada llamada del query builder. */
function clienteFalso() {
  const llamadas: unknown[][] = [];
  const builder: Record<string, (...args: unknown[]) => unknown> = {};
  for (const metodo of ["select", "insert", "update", "delete", "eq"]) {
    builder[metodo] = (...args) => {
      llamadas.push([metodo, ...args]);
      return builder;
    };
  }
  const db = {
    from: (tabla: string) => {
      llamadas.push(["from", tabla]);
      return builder;
    },
  };
  return { db: db as unknown as SupabaseClient, llamadas };
}

describe("consultasDelTenant", () => {
  it("select filtra por tenant", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").select("servicios", "id, nombre");
    expect(llamadas).toEqual([
      ["from", "servicios"],
      ["select", "id, nombre"],
      ["eq", "tenant_id", "T1"],
    ]);
  });

  it("select sin columnas pide todas", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").select("cursos");
    expect(llamadas[1]).toEqual(["select", "*"]);
  });

  it("insert fija el tenant aunque la fila traiga otro", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").insert("servicios", { nombre: "x", tenant_id: "OTRO" });
    expect(llamadas).toEqual([
      ["from", "servicios"],
      ["insert", { nombre: "x", tenant_id: "T1" }],
    ]);
  });

  it("insert de varias filas fija el tenant en todas", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").insert("testimonios", [{ nombre: "a" }, { nombre: "b" }]);
    expect(llamadas[1]).toEqual([
      "insert",
      [
        { nombre: "a", tenant_id: "T1" },
        { nombre: "b", tenant_id: "T1" },
      ],
    ]);
  });

  it("update filtra por tenant y no permite mover la fila a otro", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").update("turnos", { estado: "cancelado", tenant_id: "OTRO" });
    expect(llamadas).toEqual([
      ["from", "turnos"],
      ["update", { estado: "cancelado" }],
      ["eq", "tenant_id", "T1"],
    ]);
  });

  it("delete filtra por tenant", () => {
    const { db, llamadas } = clienteFalso();
    consultasDelTenant(db, "T1").delete("servicios");
    expect(llamadas).toEqual([
      ["from", "servicios"],
      ["delete"],
      ["eq", "tenant_id", "T1"],
    ]);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run src/lib/tenant/consultas.test.ts`
Expected: FAIL, porque no existe `./consultas`.

- [ ] **Step 3: Implementar `consultas.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

/** Tablas de negocio: todas tienen tenant_id. */
export type TablaTenant =
  | "servicios"
  | "configuracion_negocio"
  | "turnos"
  | "cursos"
  | "archivos_curso"
  | "accesos_curso"
  | "pagos"
  | "intentos_reserva"
  | "recordatorios_enviados"
  | "testimonios"
  | "tenant_marca";

type Fila = Record<string, unknown>;

/**
 * Acceso a datos acotado a un tenant: cada lectura, modificación y borrado lleva el
 * filtro tenant_id, y cada insert lo fija. El servidor usa la service role (se saltea
 * RLS), así que todo acceso a tablas de negocio tiene que pasar por acá.
 */
export function consultasDelTenant(db: SupabaseClient, tenantId: string) {
  return {
    tenantId,
    select<C extends string = "*">(tabla: TablaTenant, columnas: C = "*" as C) {
      return db.from(tabla).select(columnas).eq("tenant_id", tenantId);
    },
    insert(tabla: TablaTenant, filas: Fila | Fila[]) {
      const conTenant = (f: Fila) => ({ ...f, tenant_id: tenantId });
      return db.from(tabla).insert(Array.isArray(filas) ? filas.map(conTenant) : conTenant(filas));
    },
    update(tabla: TablaTenant, valores: Fila) {
      const sinTenant = { ...valores };
      delete sinTenant.tenant_id;
      return db.from(tabla).update(sinTenant).eq("tenant_id", tenantId);
    },
    delete(tabla: TablaTenant) {
      return db.from(tabla).delete().eq("tenant_id", tenantId);
    },
  };
}

export type ConsultasDelTenant = ReturnType<typeof consultasDelTenant>;
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx vitest run src/lib/tenant/consultas.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Crear `datos.ts`**

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { consultasDelTenant } from "./consultas";

/** Acceso del servidor a las tablas de negocio de un tenant (ver consultasDelTenant). */
export function datosDelTenant(tenantId: string) {
  return consultasDelTenant(createAdminClient(), tenantId);
}
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/tenant/consultas.ts src/lib/tenant/consultas.test.ts src/lib/tenant/datos.ts
git commit -m "feat(tenant): datosDelTenant filtra y fija tenant_id en cada consulta"
```

---

### Task 7: Tipos del tenant, mapeo, URLs y permisos

**Files:**
- Create: `src/lib/tenant/tipos.ts`, `src/lib/tenant/mapear.ts`, `src/lib/tenant/urls.ts`, `src/lib/tenant/permisos.ts`
- Test: `src/lib/tenant/mapear.test.ts`, `src/lib/tenant/urls.test.ts`, `src/lib/tenant/permisos.test.ts`

- [ ] **Step 1: Crear `tipos.ts`**

```ts
export type Idioma = "es" | "pt";
export type Pais = "AR" | "BR";
export type Moneda = "ARS" | "BRL";

export type Modulos = {
  turnos: boolean;
  cursos: boolean;
  sobreMi: boolean;
  testimonios: boolean;
  galeria: boolean;
  faq: boolean;
  whatsapp: boolean;
};

export type Marca = {
  colorPrimario: string;
  colorSecundario: string;
  colorFondo: string;
  colorTexto: string;
  logoUrl: string | null;
  logoClaroUrl: string | null;
  fotoPerfilUrl: string | null;
  rubro: string | null;
  tagline: string | null;
  inicioTitulo: string;
  inicioDestacado: string | null;
  inicioTexto: string | null;
  sobreMiTitulo: string | null;
  sobreMiTexto: string | null;
  notaReservas: string | null;
  /** E.164, ej. "+5491123456789". */
  whatsapp: string | null;
  /** Usuario sin "@". */
  instagram: string | null;
  emailContacto: string | null;
  direccion: string | null;
};

export type Tenant = {
  id: string;
  slug: string;
  nombre: string;
  estado: "activo" | "suspendido";
  idioma: Idioma;
  pais: Pais;
  zonaHoraria: string;
  moneda: Moneda;
  modulos: Modulos;
  marca: Marca;
};
```

- [ ] **Step 2: Escribir el test de `mapear`**

```ts
import { describe, it, expect } from "vitest";
import { mapearTenant, type FilaTenant } from "./mapear";

const marca = {
  color_primario: "#c0899a",
  color_secundario: "#4e5340",
  color_fondo: "#f6f1ea",
  color_texto: "#1a1a1a",
  logo_url: "/brand/horizontal-negro.png",
  logo_claro_url: null,
  foto_perfil_url: "/gisel/retrato.jpg",
  rubro: "Estética y Salud",
  tagline: null,
  inicio_titulo: "Tu momento de",
  inicio_destacado: "belleza",
  inicio_texto: null,
  sobre_mi_titulo: "Hola",
  sobre_mi_texto: null,
  nota_reservas: null,
  whatsapp: "+5491123456789",
  instagram: "gisel",
  email_contacto: null,
  direccion: null,
};

const fila: FilaTenant = {
  id: "T1",
  slug: "gisel",
  nombre: "Gisel",
  estado: "activo",
  idioma: "es",
  pais: "AR",
  zona_horaria: "America/Argentina/Buenos_Aires",
  moneda: "ARS",
  modulo_turnos: true,
  modulo_cursos: false,
  modulo_sobre_mi: true,
  modulo_testimonios: true,
  modulo_galeria: false,
  modulo_faq: false,
  modulo_whatsapp: false,
  tenant_marca: marca,
};

describe("mapearTenant", () => {
  it("convierte la fila de la base al tipo Tenant", () => {
    const t = mapearTenant(fila);
    expect(t.slug).toBe("gisel");
    expect(t.zonaHoraria).toBe("America/Argentina/Buenos_Aires");
    expect(t.modulos).toEqual({
      turnos: true,
      cursos: false,
      sobreMi: true,
      testimonios: true,
      galeria: false,
      faq: false,
      whatsapp: false,
    });
    expect(t.marca.inicioDestacado).toBe("belleza");
    expect(t.marca.logoClaroUrl).toBeNull();
  });

  it("acepta la marca embebida como arreglo", () => {
    expect(mapearTenant({ ...fila, tenant_marca: [marca] }).marca.rubro).toBe("Estética y Salud");
  });

  it("falla si el tenant no tiene marca", () => {
    expect(() => mapearTenant({ ...fila, tenant_marca: null })).toThrow("gisel");
  });
});
```

- [ ] **Step 3: Correr y ver que falla**

Run: `npx vitest run src/lib/tenant/mapear.test.ts`
Expected: FAIL, porque no existe `./mapear`.

- [ ] **Step 4: Implementar `mapear.ts`**

```ts
import type { Idioma, Marca, Moneda, Pais, Tenant } from "./tipos";

export type FilaMarca = {
  color_primario: string;
  color_secundario: string;
  color_fondo: string;
  color_texto: string;
  logo_url: string | null;
  logo_claro_url: string | null;
  foto_perfil_url: string | null;
  rubro: string | null;
  tagline: string | null;
  inicio_titulo: string;
  inicio_destacado: string | null;
  inicio_texto: string | null;
  sobre_mi_titulo: string | null;
  sobre_mi_texto: string | null;
  nota_reservas: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email_contacto: string | null;
  direccion: string | null;
};

export type FilaTenant = {
  id: string;
  slug: string;
  nombre: string;
  estado: "activo" | "suspendido";
  idioma: Idioma;
  pais: Pais;
  zona_horaria: string;
  moneda: Moneda;
  modulo_turnos: boolean;
  modulo_cursos: boolean;
  modulo_sobre_mi: boolean;
  modulo_testimonios: boolean;
  modulo_galeria: boolean;
  modulo_faq: boolean;
  modulo_whatsapp: boolean;
  /** PostgREST lo devuelve como objeto (relación 1 a 1), o como arreglo según el embed. */
  tenant_marca: FilaMarca | FilaMarca[] | null;
};

function mapearMarca(m: FilaMarca): Marca {
  return {
    colorPrimario: m.color_primario,
    colorSecundario: m.color_secundario,
    colorFondo: m.color_fondo,
    colorTexto: m.color_texto,
    logoUrl: m.logo_url,
    logoClaroUrl: m.logo_claro_url,
    fotoPerfilUrl: m.foto_perfil_url,
    rubro: m.rubro,
    tagline: m.tagline,
    inicioTitulo: m.inicio_titulo,
    inicioDestacado: m.inicio_destacado,
    inicioTexto: m.inicio_texto,
    sobreMiTitulo: m.sobre_mi_titulo,
    sobreMiTexto: m.sobre_mi_texto,
    notaReservas: m.nota_reservas,
    whatsapp: m.whatsapp,
    instagram: m.instagram,
    emailContacto: m.email_contacto,
    direccion: m.direccion,
  };
}

/** Fila de `tenants` con su `tenant_marca` embebida → Tenant. */
export function mapearTenant(fila: FilaTenant): Tenant {
  const marca = Array.isArray(fila.tenant_marca) ? fila.tenant_marca[0] : fila.tenant_marca;
  if (!marca) throw new Error(`El tenant ${fila.slug} no tiene marca cargada`);
  return {
    id: fila.id,
    slug: fila.slug,
    nombre: fila.nombre,
    estado: fila.estado,
    idioma: fila.idioma,
    pais: fila.pais,
    zonaHoraria: fila.zona_horaria,
    moneda: fila.moneda,
    modulos: {
      turnos: fila.modulo_turnos,
      cursos: fila.modulo_cursos,
      sobreMi: fila.modulo_sobre_mi,
      testimonios: fila.modulo_testimonios,
      galeria: fila.modulo_galeria,
      faq: fila.modulo_faq,
      whatsapp: fila.modulo_whatsapp,
    },
    marca: mapearMarca(marca),
  };
}
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `npx vitest run src/lib/tenant/mapear.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Escribir el test de `urls`**

```ts
import { describe, it, expect } from "vitest";
import { urlDelTenant, whatsappLink } from "./urls";

describe("urlDelTenant", () => {
  it("arma la URL del subdominio del tenant", () => {
    expect(urlDelTenant("gisel", { dominio: "tuproducto.com", protocolo: "https" })).toBe(
      "https://gisel.tuproducto.com",
    );
    expect(urlDelTenant("gisel", { dominio: "localhost:3000", protocolo: "http" })).toBe(
      "http://gisel.localhost:3000",
    );
  });
});

describe("whatsappLink", () => {
  it("arma el link de wa.me con el número sin + ni espacios y el mensaje codificado", () => {
    expect(whatsappLink("+54 9 11 2345-6789", "¡Hola!")).toBe(
      "https://wa.me/5491123456789?text=%C2%A1Hola!",
    );
  });

  it("usa un mensaje por defecto", () => {
    expect(whatsappLink("+5491123456789")).toContain("https://wa.me/5491123456789?text=");
  });

  it("devuelve null si no hay número", () => {
    expect(whatsappLink(null)).toBeNull();
    expect(whatsappLink("")).toBeNull();
  });
});
```

- [ ] **Step 7: Correr y ver que falla**

Run: `npx vitest run src/lib/tenant/urls.test.ts`
Expected: FAIL, porque no existe `./urls`.

- [ ] **Step 8: Implementar `urls.ts`**

```ts
type ConfigUrl = { dominio: string; protocolo: string };

function configUrl(): ConfigUrl {
  return {
    dominio: process.env.PLATFORM_DOMAIN || "localhost:3000",
    protocolo: process.env.PLATFORM_PROTOCOLO || "https",
  };
}

/** URL pública del sitio de un tenant (links de emails, retorno de Mercado Pago). */
export function urlDelTenant(slug: string, cfg: ConfigUrl = configUrl()): string {
  return `${cfg.protocolo}://${slug}.${cfg.dominio}`;
}

/** Link de WhatsApp con mensaje precargado, o null si el tenant no tiene número. */
export function whatsappLink(
  numero: string | null,
  mensaje = "¡Hola! Quería hacer una consulta.",
): string | null {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (!digitos) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}
```

- [ ] **Step 9: Correr y ver que pasa**

Run: `npx vitest run src/lib/tenant/urls.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 10: Escribir el test de `permisos`**

```ts
import { describe, it, expect } from "vitest";
import { perfilAutorizado } from "./permisos";

describe("perfilAutorizado", () => {
  it("el cliente entra solo a su tenant", () => {
    expect(perfilAutorizado({ rol: "cliente", tenant_id: "T1" }, "T1")).toBe(true);
    expect(perfilAutorizado({ rol: "cliente", tenant_id: "T1" }, "T2")).toBe(false);
  });

  it("el master entra a cualquier tenant", () => {
    expect(perfilAutorizado({ rol: "master", tenant_id: null }, "T2")).toBe(true);
  });

  it("sin perfil no entra", () => {
    expect(perfilAutorizado(null, "T1")).toBe(false);
  });
});
```

- [ ] **Step 11: Correr y ver que falla**

Run: `npx vitest run src/lib/tenant/permisos.test.ts`
Expected: FAIL, porque no existe `./permisos`.

- [ ] **Step 12: Implementar `permisos.ts`**

```ts
export type Perfil = { rol: "master" | "cliente"; tenant_id: string | null };

/** ¿Este perfil puede administrar este tenant? */
export function perfilAutorizado(perfil: Perfil | null, tenantId: string): boolean {
  if (!perfil) return false;
  return perfil.rol === "master" || perfil.tenant_id === tenantId;
}
```

- [ ] **Step 13: Correr todos los tests del tenant**

Run: `npx vitest run src/lib/tenant`
Expected: PASS.

- [ ] **Step 14: Commit**

```bash
git add src/lib/tenant/tipos.ts src/lib/tenant/mapear.ts src/lib/tenant/mapear.test.ts src/lib/tenant/urls.ts src/lib/tenant/urls.test.ts src/lib/tenant/permisos.ts src/lib/tenant/permisos.test.ts
git commit -m "feat(tenant): tipos, mapeo desde la base, URLs y permisos"
```

---

### Task 8: Resumir el horario de atención para el footer

Hoy el footer muestra horarios escritos en `site.ts`. Pasan a salir de `configuracion_negocio.horario_atencion` de cada tenant.

**Files:**
- Modify: `src/lib/turnos/horario.ts`
- Test: `src/lib/turnos/horario.test.ts`

- [ ] **Step 1: Agregar el test al final de `horario.test.ts`**

Agregar `resumirHorario` al import existente de `./horario`, y al final del archivo:

```ts
describe("resumirHorario", () => {
  it("agrupa días consecutivos con el mismo horario", () => {
    expect(
      resumirHorario({
        lun: ["14:00", "19:00"],
        mar: ["14:00", "19:00"],
        mie: ["14:00", "19:00"],
        jue: ["14:00", "19:00"],
        vie: ["14:00", "19:00"],
        sab: ["09:00", "14:00"],
      }),
    ).toEqual([
      { dias: "Lunes a viernes", horas: "14:00 a 19:00 hs" },
      { dias: "Sábados", horas: "09:00 a 14:00 hs" },
    ]);
  });

  it("une dos días con 'y' y no agrupa días salteados", () => {
    expect(
      resumirHorario({
        lun: ["09:00", "13:00"],
        mar: ["09:00", "13:00"],
        jue: ["09:00", "13:00"],
      }),
    ).toEqual([
      { dias: "Lunes y martes", horas: "09:00 a 13:00 hs" },
      { dias: "Jueves", horas: "09:00 a 13:00 hs" },
    ]);
  });

  it("sin días abiertos devuelve una lista vacía", () => {
    expect(resumirHorario({})).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run src/lib/turnos/horario.test.ts`
Expected: FAIL, porque `resumirHorario` no está exportado.

- [ ] **Step 3: Implementar al final de `horario.ts`**

```ts
const PLURAL: Record<string, string> = {
  lun: "Lunes",
  mar: "Martes",
  mie: "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  sab: "Sábados",
  dom: "Domingos",
};

/** Agrupa los días consecutivos con el mismo horario: "Lunes a viernes · 14:00 a 19:00 hs". */
export function resumirHorario(
  horario: Record<string, [string, string]>,
): { dias: string; horas: string }[] {
  const grupos: { keys: string[]; rango: [string, string] }[] = [];
  let anteriorAbierto = false;

  for (const { key } of DIAS_SEMANA) {
    const rango = horario[key];
    if (!rango) {
      anteriorAbierto = false;
      continue;
    }
    const ultimo = grupos[grupos.length - 1];
    if (anteriorAbierto && ultimo && ultimo.rango[0] === rango[0] && ultimo.rango[1] === rango[1]) {
      ultimo.keys.push(key);
    } else {
      grupos.push({ keys: [key], rango });
    }
    anteriorAbierto = true;
  }

  const label = (key: string) => DIAS_SEMANA.find((d) => d.key === key)!.label;
  return grupos.map(({ keys, rango }) => {
    const primero = keys[0];
    const ultimo = keys[keys.length - 1];
    const dias =
      keys.length === 1
        ? PLURAL[primero]
        : `${label(primero)} ${keys.length === 2 ? "y" : "a"} ${label(ultimo).toLowerCase()}`;
    return { dias, horas: `${rango[0]} a ${rango[1]} hs` };
  });
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx vitest run src/lib/turnos/horario.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/turnos/horario.ts src/lib/turnos/horario.test.ts
git commit -m "feat(turnos): resumir el horario de atención para mostrarlo en el sitio"
```

---

### Task 9: Tenant actual en el servidor y permisos del admin

**Files:**
- Create: `src/lib/tenant/actual.ts`, `src/lib/tenant/admin.ts`

- [ ] **Step 1: Crear `actual.ts`**

```ts
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolverHost, configHost } from "./host";
import { mapearTenant, type FilaTenant } from "./mapear";
import type { Tenant } from "./tipos";

/** Tenant por slug (activo o suspendido), cacheado por request. null si no existe. */
export const getTenantPorSlug = cache(async (slug: string): Promise<Tenant | null> => {
  const { data, error } = await createAdminClient()
    .from("tenants")
    .select("*, tenant_marca(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return mapearTenant(data as FilaTenant);
});

/** Para páginas bajo /sitio/[tenant]: el layout ya resolvió 404 y suspendido. */
export async function tenantDeLaPagina(params: Promise<{ tenant: string }>): Promise<Tenant> {
  const { tenant: slug } = await params;
  const tenant = await getTenantPorSlug(slug);
  if (!tenant) notFound();
  return tenant;
}

/** Tenant activo según el host del request (server actions y route handlers). */
export async function tenantDelRequest(): Promise<Tenant | null> {
  const h = await headers();
  const destino = resolverHost(h.get("host") ?? "", configHost());
  if (destino.tipo !== "tenant") return null;
  const tenant = await getTenantPorSlug(destino.slug);
  return tenant?.estado === "activo" ? tenant : null;
}
```

- [ ] **Step 2: Crear `admin.ts`**

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantDelRequest } from "./actual";
import { perfilAutorizado, type Perfil } from "./permisos";
import type { Tenant } from "./tipos";

/**
 * Tenant del panel: exige sesión y un perfil autorizado para el tenant del host
 * (el cliente solo administra el suyo; el master, cualquiera). Lanza si no.
 */
export async function tenantDelAdmin(): Promise<Tenant> {
  const tenant = await tenantDelRequest();
  if (!tenant) throw new Error("No autorizado");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: perfil } = await createAdminClient()
    .from("perfiles")
    .select("rol, tenant_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!perfilAutorizado(perfil as Perfil | null, tenant.id)) throw new Error("No autorizado");

  return tenant;
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tenant/actual.ts src/lib/tenant/admin.ts
git commit -m "feat(tenant): tenant del request y del panel, con verificación de perfil"
```

---

> **Desde acá hasta la Task 16 se cambian firmas que usan muchos archivos.** `tsc` va a fallar entre tasks; el commit es al final de la Task 16.

### Task 10: Capa de datos por tenant

**Files:**
- Modify: `src/lib/data/types.ts`, `src/lib/data/servicios.ts`, `src/lib/data/configuracion.ts`, `src/lib/data/cursos.ts`, `src/lib/data/turnos.ts`
- Create: `src/lib/data/testimonios.ts`
- Delete: `src/lib/supabase/public.ts`

- [ ] **Step 1: `types.ts`**

En `ConfiguracionNegocio`, reemplazar `id: number;` por `tenant_id: string;`. Al final del archivo, agregar:

```ts
export type Testimonio = {
  id: string;
  nombre: string;
  texto: string;
};
```

- [ ] **Step 2: Reemplazar `servicios.ts`**

```ts
import { datosDelTenant } from "@/lib/tenant/datos";
import type { Servicio } from "./types";

/** Servicios activos del tenant para el sitio. Devuelve [] si la DB no responde. */
export async function getServiciosPublicos(tenantId: string): Promise<Servicio[]> {
  try {
    const { data, error } = await datosDelTenant(tenantId)
      .select("servicios")
      .eq("activo", true)
      .order("orden");
    if (error) return [];
    return (data as Servicio[]) ?? [];
  } catch {
    return [];
  }
}

/** Todos los servicios del tenant, incluidos los inactivos (panel). */
export async function getServiciosAdmin(tenantId: string): Promise<Servicio[]> {
  const { data, error } = await datosDelTenant(tenantId).select("servicios").order("orden");
  if (error) throw new Error(error.message);
  return (data as Servicio[]) ?? [];
}
```

- [ ] **Step 3: Reemplazar `configuracion.ts`**

```ts
import { datosDelTenant } from "@/lib/tenant/datos";
import type { ConfiguracionNegocio } from "./types";

export async function getConfiguracion(tenantId: string): Promise<ConfiguracionNegocio | null> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("configuracion_negocio")
    .maybeSingle();
  if (error || !data) return null;
  return data as ConfiguracionNegocio;
}
```

- [ ] **Step 4: Crear `testimonios.ts`**

```ts
import { datosDelTenant } from "@/lib/tenant/datos";
import type { Testimonio } from "./types";

/** Testimonios activos del tenant, en orden. Devuelve [] si la DB no responde. */
export async function getTestimonios(tenantId: string): Promise<Testimonio[]> {
  try {
    const { data, error } = await datosDelTenant(tenantId)
      .select("testimonios", "id, nombre, texto")
      .eq("activo", true)
      .order("orden");
    if (error) return [];
    return (data as Testimonio[]) ?? [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 5: Reemplazar `cursos.ts`**

```ts
import { datosDelTenant } from "@/lib/tenant/datos";
import type { AccesoCurso, ArchivoCurso, Curso } from "./types";

export async function getCursosPublicos(tenantId: string): Promise<Curso[]> {
  try {
    const { data, error } = await datosDelTenant(tenantId)
      .select("cursos")
      .eq("estado", "publicado")
      .order("orden");
    if (error) return [];
    return (data as Curso[]) ?? [];
  } catch {
    return [];
  }
}

export async function getCursoPublico(tenantId: string, id: string): Promise<Curso | null> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("cursos")
    .eq("id", id)
    .eq("estado", "publicado")
    .maybeSingle();
  if (error || !data) return null;
  return data as Curso;
}

export async function getCursosAdmin(tenantId: string): Promise<Curso[]> {
  const { data, error } = await datosDelTenant(tenantId).select("cursos").order("orden");
  if (error) throw new Error(error.message);
  return (data as Curso[]) ?? [];
}

export async function getCursoAdmin(tenantId: string, id: string): Promise<Curso | null> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("cursos")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Curso;
}

export async function getAccesosDeCurso(tenantId: string, cursoId: string): Promise<AccesoCurso[]> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("accesos_curso")
    .eq("curso_id", cursoId)
    .order("comprado_en", { ascending: false });
  if (error) return [];
  return (data as AccesoCurso[]) ?? [];
}

export async function getArchivosCurso(tenantId: string, cursoId: string): Promise<ArchivoCurso[]> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("archivos_curso")
    .eq("curso_id", cursoId)
    .order("creado_en");
  if (error) return [];
  return (data as ArchivoCurso[]) ?? [];
}

export type AccesoConCurso = AccesoCurso & { cursos: Curso };

export async function getAccesoPorToken(
  tenantId: string,
  token: string,
): Promise<AccesoConCurso | null> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("accesos_curso", "*, cursos(*)")
    .eq("token_acceso", token)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as AccesoConCurso;
}
```

- [ ] **Step 6: `turnos.ts`, cambios exactos**

1. Reemplazar `import { createAdminClient } from "@/lib/supabase/admin";` por `import { datosDelTenant } from "@/lib/tenant/datos";`.
2. Cambiar la firma de `getDisponibilidad` y las tres consultas:

```ts
export async function getDisponibilidad(
  tenantId: string,
  servicioIds: string[],
  fecha: string,
): Promise<SlotDisponible[]> {
  if (servicioIds.length === 0) return [];
  const db = datosDelTenant(tenantId);

  const { data: servicios } = await db
    .select("servicios", "duracion_minutos, activo")
    .in("id", servicioIds);
```

```ts
  const { data: config } = await db
    .select("configuracion_negocio", "horario_atencion, minutos_preparacion_entre_turnos")
    .single();
```

```ts
  const { data: turnos } = await db
    .select("turnos", "fecha_hora, duracion_minutos, estado, bloqueado_hasta")
    .gte("fecha_hora", isoFechaHoraAR(fecha, 0))
    .lt("fecha_hora", isoFechaHoraAR(sumarDias(fecha, 1), 0));
```

3. Reemplazar `getTurnoPorToken` y `getTurnosAdmin` (los tipos `TurnoConServicio` y `TurnoAdmin` no cambian):

```ts
export async function getTurnoPorToken(
  tenantId: string,
  token: string,
): Promise<TurnoConServicio | null> {
  const { data } = await datosDelTenant(tenantId)
    .select(
      "turnos",
      "id, servicio_id, cliente_nombre, fecha_hora, duracion_minutos, estado, token_gestion, servicios(nombre)",
    )
    .eq("token_gestion", token)
    .maybeSingle();
  return (data as unknown as TurnoConServicio) ?? null;
}
```

```ts
/** Turnos del tenant, más recientes primero, para el panel. */
export async function getTurnosAdmin(tenantId: string): Promise<TurnoAdmin[]> {
  const { data, error } = await datosDelTenant(tenantId)
    .select(
      "turnos",
      "id, cliente_nombre, cliente_email, cliente_telefono, fecha_hora, duracion_minutos, estado, monto_sena, google_calendar_event_id, servicios(nombre)",
    )
    .order("fecha_hora", { ascending: false });
  if (error) return [];
  return (data as unknown as TurnoAdmin[]) ?? [];
}
```

- [ ] **Step 7: Borrar el cliente público sin uso**

Run: `git rm src/lib/supabase/public.ts`

---

### Task 11: Proxy por subdominio

**Files:**
- Modify: `src/proxy.ts`, `next.config.ts`

- [ ] **Step 1: Reemplazar `src/proxy.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolverHost, configHost } from "@/lib/tenant/host";

/**
 * Enruta por subdominio: <slug>.<dominio>/… se reescribe a /sitio/<slug>/…
 * /admin queda en su ruta (resuelve el tenant por host) y /api atiende cualquier host.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Las rutas internas por tenant solo se alcanzan por reescritura.
  if (path === "/sitio" || path.startsWith("/sitio/")) {
    return new NextResponse(null, { status: 404 });
  }
  if (path.startsWith("/api/")) return NextResponse.next();

  const destino = resolverHost(request.headers.get("host") ?? "", configHost());
  if (destino.tipo !== "tenant") {
    // El panel master (app.) y la página del producto llegan en la etapa C.
    return new NextResponse("No encontrado", { status: 404 });
  }

  if (path === "/admin" || path.startsWith("/admin/")) return updateSession(request);

  const url = request.nextUrl.clone();
  url.pathname = `/sitio/${destino.slug}${path === "/" ? "" : path}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Todo menos estáticos de Next y archivos con extensión (imágenes de public/).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
```

- [ ] **Step 2: `next.config.ts`, permitir los subdominios en desarrollo**

Agregar debajo de `output: "standalone",`:

```ts
  // En desarrollo cada tenant es <slug>.localhost:3000 (otro origen para el dev server).
  allowedDevOrigins: ["*.localhost"],
```

---

### Task 12: Páginas públicas bajo `/sitio/[tenant]`

**Files:**
- Move: `src/app/page.tsx`, `src/app/turnos/**` y `src/app/cursos/**` a `src/app/sitio/[tenant]/…`
- Create: `src/app/sitio/[tenant]/layout.tsx`, `src/app/sitio/[tenant]/not-found.tsx`, `src/components/landing/SitioSuspendido.tsx`
- Modify: imports de actions en `src/components/turnos/{ReservaForm,SlotPicker,GestionPanel}.tsx` y `src/components/cursos/CompraForm.tsx`

- [ ] **Step 1: Mover con git**

```bash
mkdir -p "src/app/sitio/[tenant]"
git mv src/app/page.tsx "src/app/sitio/[tenant]/page.tsx"
git mv src/app/turnos "src/app/sitio/[tenant]/turnos"
git mv src/app/cursos "src/app/sitio/[tenant]/cursos"
```

- [ ] **Step 2: Corregir los imports de actions en los componentes**

- `src/components/turnos/ReservaForm.tsx`: `@/app/turnos/actions` → `@/app/sitio/[tenant]/turnos/actions`
- `src/components/turnos/SlotPicker.tsx`: `@/app/turnos/disponibilidad-action` → `@/app/sitio/[tenant]/turnos/disponibilidad-action`
- `src/components/turnos/GestionPanel.tsx`: `@/app/turnos/gestion/[token]/actions` → `@/app/sitio/[tenant]/turnos/gestion/[token]/actions`
- `src/components/cursos/CompraForm.tsx`: `@/app/cursos/[id]/actions` → `@/app/sitio/[tenant]/cursos/[id]/actions`

- [ ] **Step 3: Crear `SitioSuspendido.tsx`**

```tsx
import { Container } from "@/components/ui/Container";

export function SitioSuspendido({ nombre }: { nombre: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-center">
      <Container className="max-w-md">
        <h1 className="font-serif text-4xl text-ink">{nombre}</h1>
        <p className="mt-4 font-sans text-ink-soft">
          Este sitio no está disponible temporalmente. Volvé a intentar más tarde.
        </p>
      </Container>
    </main>
  );
}
```

- [ ] **Step 4: Crear `src/app/sitio/[tenant]/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { SitioSuspendido } from "@/components/landing/SitioSuspendido";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { whatsappLink } from "@/lib/tenant/urls";

type Props = { children: React.ReactNode; params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = await getTenantPorSlug((await params).tenant);
  if (!tenant) return {};
  const titulo = tenant.marca.rubro ? `${tenant.nombre} · ${tenant.marca.rubro}` : tenant.nombre;
  return {
    title: { default: titulo, template: `%s · ${tenant.nombre}` },
    description: tenant.marca.tagline ?? undefined,
  };
}

export default async function SitioLayout({ children, params }: Props) {
  const tenant = await getTenantPorSlug((await params).tenant);
  if (!tenant) notFound();
  if (tenant.estado === "suspendido") return <SitioSuspendido nombre={tenant.nombre} />;

  return (
    <>
      <Nav
        nombre={tenant.nombre}
        logoUrl={tenant.marca.logoUrl}
        modulos={tenant.modulos}
        whatsappUrl={whatsappLink(tenant.marca.whatsapp)}
      />
      {children}
      <Footer tenant={tenant} />
    </>
  );
}
```

- [ ] **Step 5: Crear `src/app/sitio/[tenant]/not-found.tsx`**

```tsx
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 pt-24 text-center">
      <Container className="max-w-md">
        <h1 className="font-serif text-4xl text-ink">Página no encontrada</h1>
        <p className="mt-4 font-sans text-ink-soft">La dirección no existe o ya no está disponible.</p>
        <Button href="/" className="mt-8">
          Volver al inicio
        </Button>
      </Container>
    </main>
  );
}
```

- [ ] **Step 6: Reemplazar `src/app/sitio/[tenant]/page.tsx` (inicio)**

```tsx
import { Hero } from "@/components/landing/Hero";
import { Servicios } from "@/components/landing/Servicios";
import { SobreMi } from "@/components/landing/SobreMi";
import { Testimonios } from "@/components/landing/Testimonios";
import { Redes } from "@/components/landing/Redes";
import { CtaWhatsapp } from "@/components/landing/CtaWhatsapp";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { getTestimonios } from "@/lib/data/testimonios";

export default async function Inicio({ params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await tenantDeLaPagina(params);
  const { modulos, marca } = tenant;
  const testimonios = modulos.testimonios ? await getTestimonios(tenant.id) : [];

  return (
    <main>
      <Hero tenant={tenant} />
      <Servicios tenant={tenant} />
      {modulos.sobreMi && <SobreMi nombre={tenant.nombre} marca={marca} />}
      {testimonios.length > 0 && <Testimonios testimonios={testimonios} />}
      {marca.instagram && <Redes instagram={marca.instagram} />}
      <CtaWhatsapp tenant={tenant} />
    </main>
  );
}
```

- [ ] **Step 7: Reemplazar `turnos/page.tsx`**

```tsx
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getServiciosPublicos } from "@/lib/data/servicios";
import { getConfiguracion } from "@/lib/data/configuracion";
import { ReservaForm } from "@/components/turnos/ReservaForm";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { whatsappLink } from "@/lib/tenant/urls";

export const metadata = { title: "Reservar turno" };

export default async function TurnosPage({ params }: { params: Promise<{ tenant: string }> }) {
  // Servicios y disponibilidad cambian: se renderiza en cada request, no en el build.
  await connection();
  const tenant = await tenantDeLaPagina(params);
  if (!tenant.modulos.turnos) notFound();

  const servicios = await getServiciosPublicos(tenant.id);
  const config = await getConfiguracion(tenant.id);
  const senaPorcentaje = config?.sena_porcentaje ?? 50;
  const whatsapp = whatsappLink(tenant.marca.whatsapp, "¡Hola! Quería consultar por un turno.");

  return (
    <main className="min-h-screen bg-cream pt-24 pb-20">
      <Container className="max-w-2xl">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">Turnos</p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Reservá tu turno</h1>

        {servicios.length === 0 ? (
          <p className="mt-6 font-sans text-ink-soft">
            Todavía no hay servicios cargados para reservar online.
            {whatsapp && (
              <>
                {" "}Escribinos por{" "}
                <a href={whatsapp} className="text-mauve underline" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>{" "}
                para coordinar tu turno.
              </>
            )}
          </p>
        ) : (
          <div className="mt-8">
            <ReservaForm servicios={servicios} senaPorcentaje={senaPorcentaje} />
          </div>
        )}
      </Container>
    </main>
  );
}
```

- [ ] **Step 8: Reemplazar `turnos/gracias/page.tsx`**

```tsx
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Gracias" };

export default function GraciasPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 pt-24 pb-16 text-center">
      <Container className="flex flex-col items-center gap-4">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">¡Listo!</p>
        <h1 className="font-serif text-4xl text-ink sm:text-5xl">Estamos procesando tu pago</h1>
        <p className="max-w-md font-sans text-ink-soft">
          En cuanto se confirme te va a llegar un email con los datos de tu turno. Si no llega en
          unos minutos, escribinos por WhatsApp.
        </p>
        <Button href="/">Volver al inicio</Button>
      </Container>
    </main>
  );
}
```

- [ ] **Step 9: Reemplazar `cursos/gracias/page.tsx`**

```tsx
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Gracias" };

export default function GraciasCursoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 pt-24 pb-16 text-center">
      <Container className="flex flex-col items-center gap-4">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">¡Listo!</p>
        <h1 className="font-serif text-4xl text-ink sm:text-5xl">Estamos procesando tu pago</h1>
        <p className="max-w-md font-sans text-ink-soft">
          En cuanto se confirme te va a llegar un email con el link de acceso al curso.
        </p>
        <Button href="/cursos">Ver más cursos</Button>
      </Container>
    </main>
  );
}
```

- [ ] **Step 10: `turnos/gestion/[token]/page.tsx`, cambios exactos**

1. Borrar los imports de `Nav` y `Footer`. Agregar `import { tenantDeLaPagina } from "@/lib/tenant/actual";`.
2. `export const metadata = { title: "Gestionar turno" };`
3. Reemplazar el componente de página y la firma de `TurnoDetalle`:

```tsx
export default async function GestionTurnoPage({
  params,
}: {
  params: Promise<{ tenant: string; token: string }>;
}) {
  const tenant = await tenantDeLaPagina(params);
  const { token } = await params;
  const turno = await getTurnoPorToken(tenant.id, token);

  return (
    <main className="min-h-screen bg-cream px-6 pt-24 pb-20">
      <Container className="max-w-lg">
        {!turno ? (
          <p className="font-sans text-ink-soft">No encontramos ese turno.</p>
        ) : turno.estado === "cancelado" ? (
          <p className="font-sans text-ink-soft">Este turno ya fue cancelado.</p>
        ) : turno.estado !== "confirmado" ? (
          <p className="font-sans text-ink-soft">
            Este turno todavía no está confirmado. Si ya pagaste la seña, esperá la confirmación por
            email.
          </p>
        ) : (
          <TurnoDetalle tenantId={tenant.id} turno={turno} />
        )}
        <Button href="/" className="mt-8">
          Volver al inicio
        </Button>
      </Container>
    </main>
  );
}

async function TurnoDetalle({
  tenantId,
  turno,
}: {
  tenantId: string;
  turno: NonNullable<Awaited<ReturnType<typeof getTurnoPorToken>>>;
}) {
  const config = await getConfiguracion(tenantId);
```

El resto de `TurnoDetalle` queda igual.

- [ ] **Step 11: `cursos/page.tsx`, cambios exactos**

1. Borrar los imports de `Nav` y `Footer`. Agregar `import { notFound } from "next/navigation";` e `import { tenantDeLaPagina } from "@/lib/tenant/actual";`.
2. `export const metadata = { title: "Cursos" };`
3. Firma y comienzo:

```tsx
export default async function CursosPage({ params }: { params: Promise<{ tenant: string }> }) {
  // El catálogo cambia desde el admin: se renderiza en cada request, no en el build.
  await connection();
  const tenant = await tenantDeLaPagina(params);
  if (!tenant.modulos.cursos) notFound();
  const cursos = await getCursosPublicos(tenant.id);
  const ahora = new Date().toISOString();
```

4. En el `return`, sacar el fragmento `<>…</>`, `<Nav />` y `<Footer />`, y dejar `<main …>` como raíz.

- [ ] **Step 12: `cursos/[id]/page.tsx`, cambios exactos**

1. Borrar los imports de `Nav` y `Footer`. Agregar `import { tenantDeLaPagina } from "@/lib/tenant/actual";`.
2. Firma y carga:

```tsx
export default async function CursoDetallePage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const tenant = await tenantDeLaPagina(params);
  if (!tenant.modulos.cursos) notFound();
  const { id } = await params;
  const curso = await getCursoPublico(tenant.id, id);
  if (!curso) notFound();
```

3. En el `return`, sacar el fragmento, `<Nav />` y `<Footer />`, y dejar `<main …>` como raíz.

- [ ] **Step 13: `cursos/acceso/[token]/page.tsx`, cambios exactos**

1. Borrar los imports de `Nav` y `Footer`. Agregar `import { tenantDeLaPagina } from "@/lib/tenant/actual";`.
2. `export const metadata = { title: "Mi curso" };`
3. Firma y carga:

```tsx
export default async function AccesoCursoPage({
  params,
}: {
  params: Promise<{ tenant: string; token: string }>;
}) {
  const tenant = await tenantDeLaPagina(params);
  const { token } = await params;
  const acceso = await getAccesoPorToken(tenant.id, token);
```

4. En el `return`, sacar el fragmento, `<Nav />` y `<Footer />`, y dejar `<main …>` como raíz.
5. Pasar el tenant a `AccesoVigenteContenido`. En el JSX: `<AccesoVigenteContenido tenantId={tenant.id} acceso={acceso} />`. En su firma y su primera consulta:

```tsx
async function AccesoVigenteContenido({
  tenantId,
  acceso,
}: {
  tenantId: string;
  acceso: AccesoConCurso;
}) {
  const curso = acceso.cursos;
  const archivos = await getArchivosCurso(tenantId, curso.id);
```

---

### Task 13: Contenido del sitio desde la marca del tenant

**Files:**
- Modify: `src/components/ui/Logo.tsx` y `src/components/landing/{Nav,Hero,Servicios,SobreMi,Testimonios,Redes,CtaWhatsapp,Footer}.tsx`
- Delete: `src/lib/site.ts`

- [ ] **Step 1: Reemplazar `Logo.tsx`**

```tsx
import Image from "next/image";

/** Logo del tenant; si no tiene, muestra el nombre. */
export function Logo({
  src,
  alt,
  className = "h-11 w-auto sm:h-14",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) return <span className="font-serif text-2xl">{alt}</span>;
  return <Image src={src} alt={alt} width={1080} height={489} priority className={className} />;
}
```

- [ ] **Step 2: `Nav.tsx`, cambios exactos**

1. Agregar `import type { Modulos } from "@/lib/tenant/tipos";` y borrar la constante `LINKS`.
2. Firma y armado de links al comienzo del componente:

```tsx
export function Nav({
  nombre,
  logoUrl,
  modulos,
  whatsappUrl,
}: {
  nombre: string;
  logoUrl: string | null;
  modulos: Modulos;
  whatsappUrl: string | null;
}) {
  const links = [
    { href: "/#servicios", label: "Servicios" },
    ...(modulos.sobreMi ? [{ href: "/#sobre-mi", label: "Sobre mí" }] : []),
    ...(modulos.testimonios ? [{ href: "/#testimonios", label: "Testimonios" }] : []),
    ...(modulos.cursos ? [{ href: "/cursos", label: "Cursos" }] : []),
    { href: "/#contacto", label: "Contacto" },
  ];
  const reservarHref = modulos.turnos ? "/turnos" : whatsappUrl;
  const [scrolled, setScrolled] = useState(false);
```

3. Reemplazar `{LINKS.map(` por `{links.map(` (aparece dos veces) y `<Logo />` por `<Logo src={logoUrl} alt={nombre} />`.
4. Reemplazar los dos botones de reserva, el de escritorio y el móvil:

```tsx
          {reservarHref && <Button href={reservarHref}>Reservar turno</Button>}
```

```tsx
            {reservarHref && (
              <Button href={reservarHref} className="mt-2 w-full">
                Reservar turno
              </Button>
            )}
```

- [ ] **Step 3: Reemplazar `Hero.tsx`**

```tsx
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { whatsappLink } from "@/lib/tenant/urls";
import type { Tenant } from "@/lib/tenant/tipos";

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function Hero({ tenant }: { tenant: Tenant }) {
  const { marca, modulos } = tenant;
  const whatsapp = whatsappLink(marca.whatsapp);

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-b from-cream via-cream to-cream-dark">
      {/* Watermark del monograma */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 select-none font-serif text-[22rem] leading-none text-mauve/10 sm:text-[30rem]"
      >
        {iniciales(tenant.nombre)}
      </span>

      <Container className="relative z-10 py-28">
        <div className="max-w-2xl">
          {marca.rubro && (
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">{marca.rubro}</p>
          )}
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-ink sm:text-7xl">
            {marca.inicioTitulo}
            {marca.inicioDestacado && (
              <>
                {" "}
                <span className="text-mauve">{marca.inicioDestacado}</span>
              </>
            )}
          </h1>
          {marca.inicioTexto && (
            <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed text-ink-soft">
              {marca.inicioTexto}
            </p>
          )}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {modulos.turnos ? (
              <Button href="/turnos">Reservar turno</Button>
            ) : (
              whatsapp && <Button href={whatsapp}>Escribir por WhatsApp</Button>
            )}
            {modulos.cursos && (
              <Button href="/cursos" variant="outline">
                Ver cursos
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: Reemplazar `Servicios.tsx`**

```tsx
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { formatPrecioARS, formatDuracion } from "@/lib/format";
import { getServiciosPublicos } from "@/lib/data/servicios";
import type { Tenant } from "@/lib/tenant/tipos";

export async function Servicios({ tenant }: { tenant: Tenant }) {
  const servicios = await getServiciosPublicos(tenant.id);
  if (servicios.length === 0) return null;
  const reservaOnline = tenant.modulos.turnos;

  return (
    <Section id="servicios" className="bg-cream">
      <Container>
        <div className="max-w-2xl">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">Tratamientos</p>
          <h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Servicios</h2>
          <p className="mt-4 font-sans text-ink-soft">
            Cada servicio tiene su duración y precio.
            {reservaOnline && " Reservá online y asegurá tu turno."}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => (
            <article
              key={s.id}
              className="flex flex-col rounded-2xl border border-mauve/15 bg-white/60 p-6 transition hover:border-mauve/40 hover:shadow-sm"
            >
              <h3 className="font-serif text-2xl text-ink">{s.nombre}</h3>
              <p className="mt-1 font-sans text-sm uppercase tracking-wider text-sage">
                {formatDuracion(s.duracion_minutos)}
              </p>
              <p className="mt-4 font-sans text-lg text-mauve-dark">
                {s.precio > 0 ? formatPrecioARS(s.precio) : "Consultar"}
              </p>
              {reservaOnline && (
                <Link
                  href={`/turnos?servicio=${encodeURIComponent(s.nombre)}`}
                  className="mt-6 inline-flex font-sans text-sm font-medium text-mauve transition hover:text-mauve-dark"
                >
                  Reservar turno →
                </Link>
              )}
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 5: Reemplazar `SobreMi.tsx`**

```tsx
import Image from "next/image";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import type { Marca } from "@/lib/tenant/tipos";

export function SobreMi({ nombre, marca }: { nombre: string; marca: Marca }) {
  const parrafos = (marca.sobreMiTexto ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Section id="sobre-mi" className="bg-cream-dark">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-mauve-soft to-sage/30">
            {marca.fotoPerfilUrl && (
              <Image
                src={marca.fotoPerfilUrl}
                alt={nombre}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            )}
          </div>

          <div>
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">Sobre mí</p>
            <h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
              {marca.sobreMiTitulo ?? nombre}
            </h2>
            <div className="mt-6 space-y-4 font-sans text-ink-soft">
              {parrafos.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 6: Reemplazar `Testimonios.tsx`**

```tsx
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import type { Testimonio } from "@/lib/data/types";

export function Testimonios({ testimonios }: { testimonios: Testimonio[] }) {
  return (
    <Section id="testimonios" className="bg-cream">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">Testimonios</p>
          <h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Lo que dicen mis clientas</h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonios.map((t) => (
            <figure
              key={t.id}
              className="flex flex-col rounded-2xl border border-mauve/15 bg-white/60 p-7"
            >
              <span aria-hidden className="font-serif text-5xl leading-none text-mauve/40">
                &ldquo;
              </span>
              <blockquote className="mt-2 font-sans text-ink-soft">{t.texto}</blockquote>
              <figcaption className="mt-5 font-sans text-sm font-medium text-sage">{t.nombre}</figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 7: Reemplazar `Redes.tsx`**

```tsx
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export function Redes({ instagram }: { instagram: string }) {
  return (
    <Section className="bg-cream-dark">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">Seguime</p>
          <h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">En Instagram</h2>
          <p className="mt-4 font-sans text-ink-soft">
            Mirá mis trabajos, tips de cuidado y novedades en @{instagram}.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href={`https://instagram.com/${instagram}`}>Ir a Instagram</Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 8: Reemplazar `CtaWhatsapp.tsx`**

```tsx
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { whatsappLink } from "@/lib/tenant/urls";
import type { Tenant } from "@/lib/tenant/tipos";

export function CtaWhatsapp({ tenant }: { tenant: Tenant }) {
  const whatsapp = whatsappLink(tenant.marca.whatsapp, "¡Hola! Quería consultar por un turno.");
  const reservaOnline = tenant.modulos.turnos;
  if (!whatsapp && !reservaOnline) return null;

  return (
    <section className="bg-mauve">
      <Container className="flex flex-col items-center gap-6 py-16 text-center sm:py-20">
        <h2 className="max-w-2xl font-serif text-4xl text-cream sm:text-5xl">
          ¿Lista para tu próximo turno?
        </h2>
        <p className="max-w-xl font-sans text-cream/90">
          {whatsapp && reservaOnline
            ? "Escribime por WhatsApp para cualquier consulta, o reservá directamente online."
            : whatsapp
              ? "Escribime por WhatsApp y coordinamos tu turno."
              : "Reservá tu turno online en pocos pasos."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {whatsapp && (
            <Button href={whatsapp} variant="onDark">
              Escribir por WhatsApp
            </Button>
          )}
          {reservaOnline && (
            <Button
              href="/turnos"
              variant="outline"
              className="border-cream text-cream hover:bg-cream hover:text-mauve"
            >
              Reservar online
            </Button>
          )}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 9: Reemplazar `Footer.tsx`**

```tsx
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { getConfiguracion } from "@/lib/data/configuracion";
import { resumirHorario } from "@/lib/turnos/horario";
import { whatsappLink } from "@/lib/tenant/urls";
import type { Tenant } from "@/lib/tenant/tipos";

export async function Footer({ tenant }: { tenant: Tenant }) {
  const { marca } = tenant;
  const config = await getConfiguracion(tenant.id);
  const horarios = config ? resumirHorario(config.horario_atencion) : [];
  const whatsapp = whatsappLink(marca.whatsapp);

  return (
    <footer id="contacto" className="bg-sage-dark text-cream">
      <Container className="py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo src={marca.logoClaroUrl ?? marca.logoUrl} alt={tenant.nombre} />
            {marca.tagline && (
              <p className="mt-4 max-w-xs font-sans text-sm text-cream/70">{marca.tagline}.</p>
            )}
          </div>

          {horarios.length > 0 && (
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-cream/90">
                Horarios
              </h3>
              <ul className="mt-4 space-y-2 font-sans text-sm text-cream/70">
                {horarios.map((h) => (
                  <li key={h.dias}>
                    <span className="block text-cream/90">{h.dias}</span>
                    {h.horas}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-cream/90">
              Contacto
            </h3>
            <ul className="mt-4 space-y-2 font-sans text-sm text-cream/70">
              {whatsapp && (
                <li>
                  <a href={whatsapp} className="transition hover:text-cream" target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </li>
              )}
              {marca.emailContacto && (
                <li>
                  <a href={`mailto:${marca.emailContacto}`} className="transition hover:text-cream">
                    {marca.emailContacto}
                  </a>
                </li>
              )}
              {marca.instagram && (
                <li>
                  <a
                    href={`https://instagram.com/${marca.instagram}`}
                    className="transition hover:text-cream"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @{marca.instagram}
                  </a>
                </li>
              )}
              {marca.direccion && <li>{marca.direccion}</li>}
            </ul>
          </div>

          {tenant.modulos.turnos && (
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-cream/90">
                Reservas
              </h3>
              {marca.notaReservas && (
                <p className="mt-4 font-sans text-sm text-cream/70">{marca.notaReservas}</p>
              )}
              <Link
                href="/turnos"
                className="mt-4 inline-flex font-sans text-sm font-medium text-cream underline-offset-4 hover:underline"
              >
                Reservar turno →
              </Link>
            </div>
          )}
        </div>

        <div className="mt-12 border-t border-cream/15 pt-6 font-sans text-xs text-cream/50">
          © {tenant.nombre}
          {marca.rubro && ` · ${marca.rubro}`}. Todos los derechos reservados.
        </div>
      </Container>
    </footer>
  );
}
```

- [ ] **Step 10: Borrar `site.ts` y verificar que no quedan usos**

```bash
git rm src/lib/site.ts
grep -rn "@/lib/site\"" src
```

Expected: el `grep` no devuelve nada.

---

### Task 14: Actions públicas por tenant (reservar, disponibilidad, gestión, compra)

**Files:**
- Modify: `src/app/sitio/[tenant]/turnos/actions.ts`, `…/turnos/disponibilidad-action.ts`, `…/turnos/gestion/[token]/actions.ts`, `…/cursos/[id]/actions.ts`
- Modify: `src/lib/mercadopago/client.ts`

- [ ] **Step 1: `crearPreferencia` recibe la URL base del tenant**

En `src/lib/mercadopago/client.ts`:

1. En `CrearPreferenciaOpts`, agregar `baseUrl: string;` con el comentario `/** URL del sitio del tenant: retorno de Mercado Pago y webhook. */`.
2. Borrar `const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;` y reemplazar los cuatro usos de `${siteUrl}` por `${opts.baseUrl}`.

- [ ] **Step 2: Reemplazar `disponibilidad-action.ts`**

```ts
"use server";

import { getDisponibilidad, type SlotDisponible } from "@/lib/data/turnos";
import { tenantDelRequest } from "@/lib/tenant/actual";

export async function consultarDisponibilidad(
  servicioIds: string[],
  fecha: string,
): Promise<SlotDisponible[]> {
  if (servicioIds.length === 0 || !fecha) return [];
  const tenant = await tenantDelRequest();
  if (!tenant?.modulos.turnos) return [];
  return getDisponibilidad(tenant.id, servicioIds, fecha);
}
```

- [ ] **Step 3: Reemplazar `turnos/actions.ts`**

```ts
"use server";

import { getDisponibilidad } from "@/lib/data/turnos";
import { calcularMontoSena, puedeReservar } from "@/lib/turnos/reglas";
import { getClientIp } from "@/lib/turnos/ip";
import { normalizarWhatsApp } from "@/lib/turnos/whatsapp";
import { isMpConfigurado, crearPreferencia } from "@/lib/mercadopago/client";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { datosDelTenant } from "@/lib/tenant/datos";
import { urlDelTenant } from "@/lib/tenant/urls";

export type ReservarTurnoResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

const MAXIMO_RESERVAS_POR_HORA = 2;

export async function reservarTurno(formData: FormData): Promise<ReservarTurnoResult> {
  const tenant = await tenantDelRequest();
  if (!tenant?.modulos.turnos) {
    return { ok: false, error: "La reserva online no está disponible." };
  }

  const servicioIds = formData.getAll("servicioIds").map(String);
  const fecha = String(formData.get("fecha"));
  const iso = String(formData.get("iso"));
  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  const clienteEmail = String(formData.get("clienteEmail") || "").trim();
  const clienteTelefono = String(formData.get("clienteTelefono") || "").trim();

  if (servicioIds.length === 0 || !iso || !clienteNombre || !clienteEmail || !clienteTelefono) {
    return { ok: false, error: "Completá todos los campos obligatorios." };
  }

  const clienteWhatsApp = normalizarWhatsApp(clienteTelefono);
  if (!clienteWhatsApp) {
    return {
      ok: false,
      error: "El número de WhatsApp no es válido. Ingresalo con código de área, ej: 11 2345 6789.",
    };
  }

  if (!isMpConfigurado()) {
    return {
      ok: false,
      error:
        "La reserva online con seña todavía no está habilitada. Escribinos por WhatsApp para coordinar tu turno.",
    };
  }

  const db = datosDelTenant(tenant.id);
  const ip = await getClientIp();
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: intentos } = await db
    .select("intentos_reserva", "id")
    .eq("ip", ip)
    .gte("creado_en", haceUnaHora);

  if (!puedeReservar(intentos?.length ?? 0, MAXIMO_RESERVAS_POR_HORA)) {
    return {
      ok: false,
      error:
        "Por seguridad, alcanzaste el máximo de reservas por hora. Esperá una hora para volver a intentar.",
    };
  }

  // Re-verificar que el slot combinado sigue libre (evita choques por condición de carrera).
  const disponibles = await getDisponibilidad(tenant.id, servicioIds, fecha);
  if (!disponibles.some((s) => s.iso === iso)) {
    return { ok: false, error: "Ese horario ya no está disponible. Elegí otro." };
  }

  const { data: serviciosSinOrden } = await db
    .select("servicios", "id, nombre, duracion_minutos, precio, activo")
    .in("id", servicioIds);
  const servicios = servicioIds
    .map((id) => serviciosSinOrden?.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  if (servicios.length !== servicioIds.length || servicios.some((s) => !s.activo)) {
    return { ok: false, error: "Alguno de los servicios elegidos no está disponible." };
  }

  const { data: config } = await db.select("configuracion_negocio", "sena_porcentaje").single();
  if (!config) {
    return { ok: false, error: "No se pudo leer la configuración del negocio." };
  }

  const bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  let inicioActual = new Date(iso);
  const turnoIds: string[] = [];
  let montoSenaTotal = 0;

  for (const servicio of servicios) {
    const montoSena = calcularMontoSena(servicio.precio, config.sena_porcentaje);
    const { data: turno, error } = await db
      .insert("turnos", {
        servicio_id: servicio.id,
        cliente_nombre: clienteNombre,
        cliente_email: clienteEmail,
        cliente_telefono: clienteWhatsApp,
        fecha_hora: inicioActual.toISOString(),
        duracion_minutos: servicio.duracion_minutos,
        estado: "pendiente_pago",
        monto_sena: montoSena,
        bloqueado_hasta: bloqueadoHasta,
      })
      .select("id")
      .single();

    if (error || !turno) {
      // Revertir los turnos ya creados de esta reserva combinada.
      if (turnoIds.length > 0) await db.delete("turnos").in("id", turnoIds);
      return { ok: false, error: "No se pudo crear el turno. Probá de nuevo." };
    }

    turnoIds.push(turno.id);
    montoSenaTotal += montoSena;
    inicioActual = new Date(inicioActual.getTime() + servicio.duracion_minutos * 60000);
  }

  await db.insert("intentos_reserva", { ip });

  try {
    const titulo = `Seña — ${servicios.map((s) => s.nombre).join(" + ")}`;
    const pref = await crearPreferencia({
      titulo,
      monto: montoSenaTotal,
      externalReference: `turno:${turnoIds.join(",")}`,
      clienteEmail,
      baseUrl: urlDelTenant(tenant.slug),
      backUrls: { success: "/turnos/gracias", pending: "/turnos/gracias", failure: "/turnos" },
    });
    return { ok: true, initPoint: pref.initPoint };
  } catch {
    // Los turnos quedan pendiente_pago; el cron los libera a los 15 min si no se paga.
    return {
      ok: false,
      error: "No se pudo iniciar el pago. Probá de nuevo o escribinos por WhatsApp.",
    };
  }
}
```

- [ ] **Step 4: Reemplazar `turnos/gestion/[token]/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getDisponibilidad } from "@/lib/data/turnos";
import { puedeCancelar } from "@/lib/turnos/reglas";
import { isGoogleConfigurado, crearEvento, borrarEvento } from "@/lib/google-calendar/client";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { datosDelTenant } from "@/lib/tenant/datos";

async function getTurnoGestionable(token: string) {
  const tenant = await tenantDelRequest();
  if (!tenant) return null;
  const db = datosDelTenant(tenant.id);

  const { data: turno } = await db
    .select("turnos", "*, servicios(nombre)")
    .eq("token_gestion", token)
    .maybeSingle();
  if (!turno || turno.estado !== "confirmado") return null;

  const { data: config } = await db
    .select("configuracion_negocio", "horas_minimas_cancelacion")
    .maybeSingle();

  const permitido = puedeCancelar({
    fechaHoraIso: turno.fecha_hora,
    horasMinimas: config?.horas_minimas_cancelacion ?? 24,
    ahoraIso: new Date().toISOString(),
  });

  return { tenant, db, turno, permitido };
}

type AccionResult = { ok: true } | { ok: false; error: string };

export async function cancelarTurno(token: string): Promise<AccionResult> {
  const ctx = await getTurnoGestionable(token);
  if (!ctx || !ctx.permitido) {
    return { ok: false, error: "Fuera del plazo permitido para cancelar." };
  }

  if (ctx.turno.google_calendar_event_id && isGoogleConfigurado()) {
    try {
      await borrarEvento(ctx.turno.google_calendar_event_id);
    } catch {
      // La cancelación en la DB sigue adelante aunque falle Calendar.
    }
  }
  await ctx.db
    .update("turnos", { estado: "cancelado", google_calendar_event_id: null })
    .eq("id", ctx.turno.id);

  revalidatePath("/sitio/[tenant]/turnos/gestion/[token]", "page");
  return { ok: true };
}

export async function reprogramarTurno(
  token: string,
  nuevaFecha: string,
  nuevoIso: string,
): Promise<AccionResult> {
  const ctx = await getTurnoGestionable(token);
  if (!ctx || !ctx.permitido) {
    return { ok: false, error: "Fuera del plazo permitido para reprogramar." };
  }

  const disponibles = await getDisponibilidad(ctx.tenant.id, [ctx.turno.servicio_id], nuevaFecha);
  if (!disponibles.some((s) => s.iso === nuevoIso)) {
    return { ok: false, error: "Ese horario ya no está disponible." };
  }

  let nuevoEventId: string | null = null;
  if (isGoogleConfigurado()) {
    try {
      if (ctx.turno.google_calendar_event_id) {
        await borrarEvento(ctx.turno.google_calendar_event_id);
      }
      const fin = new Date(
        new Date(nuevoIso).getTime() + ctx.turno.duracion_minutos * 60000,
      ).toISOString();
      nuevoEventId = await crearEvento({
        titulo: `${ctx.turno.servicios.nombre} — ${ctx.turno.cliente_nombre}`,
        descripcion: "Turno reprogramado.",
        inicioIso: nuevoIso,
        finIso: fin,
        clienteEmail: ctx.turno.cliente_email,
      });
    } catch {
      // Si Calendar falla, la reprogramación en la DB sigue adelante.
    }
  }

  await ctx.db
    .update("turnos", { fecha_hora: nuevoIso, google_calendar_event_id: nuevoEventId })
    .eq("id", ctx.turno.id);

  // La nueva fecha vuelve a recibir sus recordatorios.
  await ctx.db.delete("recordatorios_enviados").eq("turno_id", ctx.turno.id);

  revalidatePath("/sitio/[tenant]/turnos/gestion/[token]", "page");
  return { ok: true };
}
```

- [ ] **Step 5: `cursos/[id]/actions.ts`, cambios exactos**

1. Agregar `import { tenantDelRequest } from "@/lib/tenant/actual";` e `import { urlDelTenant } from "@/lib/tenant/urls";`.
2. Al comienzo de `comprarCurso`, antes de leer el `formData`:

```ts
  const tenant = await tenantDelRequest();
  if (!tenant?.modulos.cursos) {
    return { ok: false, error: "Ese curso no está disponible." };
  }
```

3. `const curso = await getCursoPublico(cursoId);` → `const curso = await getCursoPublico(tenant.id, cursoId);`
4. En `crearPreferencia({...})`, agregar `baseUrl: urlDelTenant(tenant.slug),` debajo de `clienteEmail,`.

---

### Task 15: Panel `/admin` por tenant

**Files:**
- Modify: `src/app/admin/{layout,actions,page}.tsx` y `src/app/admin/{servicios,turnos,configuracion,cursos}/{page,actions}.ts(x)`, `src/app/admin/cursos/[id]/page.tsx`, `src/app/admin/cursos/[id]/video-preview/route.ts`
- Modify: `src/lib/video/provider.ts`, `src/lib/video/supabase-storage.ts`, `src/lib/storage/archivos.ts`

- [ ] **Step 1: Login, verificar que el usuario pertenece al tenant del host**

Reemplazar `src/app/admin/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tenantDelAdmin } from "@/lib/tenant/admin";

export async function login(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent("Email o contraseña incorrectos")}`);
  }

  // La cuenta tiene que ser de este sitio (o del master).
  const autorizado = await tenantDelAdmin().then(
    () => true,
    () => false,
  );
  if (!autorizado) {
    await supabase.auth.signOut();
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

- [ ] **Step 2: Reemplazar `src/app/admin/layout.tsx`**

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { logout } from "./actions";
import { Container } from "@/components/ui/Container";

export const metadata = { title: "Panel" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: la /admin/login se muestra sola (sin el shell del panel).
  if (!user) return <>{children}</>;

  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6">
        <p className="font-sans text-ink-soft">Esta cuenta no tiene acceso a este sitio.</p>
        <form action={logout}>
          <button className="font-sans text-sm text-mauve hover:text-mauve-dark">Salir</button>
        </form>
      </main>
    );
  }

  const enlaces = [
    { href: "/admin", label: "Panel", principal: true },
    { href: "/admin/servicios", label: "Servicios" },
    ...(tenant.modulos.turnos ? [{ href: "/admin/turnos", label: "Turnos" }] : []),
    ...(tenant.modulos.cursos ? [{ href: "/admin/cursos", label: "Cursos" }] : []),
    { href: "/admin/configuracion", label: "Configuración" },
    { href: "/", label: "Ver sitio" },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-mauve/15 bg-white/70">
        <Container className="flex h-16 items-center justify-between">
          <nav className="flex items-center gap-6 font-sans text-sm">
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className={e.principal ? "font-medium text-ink hover:text-mauve" : "text-ink-soft hover:text-mauve"}
              >
                {e.label}
              </Link>
            ))}
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

- [ ] **Step 3: `src/app/admin/page.tsx`, saludo con el nombre del tenant**

1. Agregar `import { tenantDelAdmin } from "@/lib/tenant/admin";`.
2. Hacer la página `async`, y en su primera línea: `const tenant = await tenantDelAdmin();`.
3. `<h1 …>Hola, Gisel</h1>` → `<h1 …>Hola, {tenant.nombre}</h1>`.

- [ ] **Step 4: Reemplazar `src/app/admin/servicios/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { datosDelTenant } from "@/lib/tenant/datos";

function revalidar() {
  revalidatePath("/admin/servicios");
  revalidatePath("/sitio/[tenant]", "layout");
}

export async function createServicio(formData: FormData) {
  const tenant = await tenantDelAdmin();
  await datosDelTenant(tenant.id).insert("servicios", {
    nombre: String(formData.get("nombre")),
    duracion_minutos: Number(formData.get("duracion_minutos")),
    precio: Number(formData.get("precio") || 0),
    orden: Number(formData.get("orden") || 0),
  });
  revalidar();
}

export async function updateServicio(formData: FormData) {
  const tenant = await tenantDelAdmin();
  await datosDelTenant(tenant.id)
    .update("servicios", {
      nombre: String(formData.get("nombre")),
      duracion_minutos: Number(formData.get("duracion_minutos")),
      precio: Number(formData.get("precio") || 0),
      orden: Number(formData.get("orden") || 0),
      activo: formData.get("activo") === "on",
    })
    .eq("id", String(formData.get("id")));
  revalidar();
}

export async function deleteServicio(formData: FormData) {
  const tenant = await tenantDelAdmin();
  await datosDelTenant(tenant.id).delete("servicios").eq("id", String(formData.get("id")));
  revalidar();
}
```

- [ ] **Step 5: Reemplazar `src/app/admin/turnos/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { isGoogleConfigurado, borrarEvento } from "@/lib/google-calendar/client";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { datosDelTenant } from "@/lib/tenant/datos";

export async function cancelarTurnoAdmin(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const db = datosDelTenant(tenant.id);
  const id = String(formData.get("id"));

  const { data: turno } = await db
    .select("turnos", "google_calendar_event_id")
    .eq("id", id)
    .maybeSingle();

  if (turno?.google_calendar_event_id && isGoogleConfigurado()) {
    try {
      await borrarEvento(turno.google_calendar_event_id);
    } catch {
      // La cancelación sigue adelante aunque falle Calendar.
    }
  }

  await db.update("turnos", { estado: "cancelado", google_calendar_event_id: null }).eq("id", id);
  revalidatePath("/admin/turnos");
}

export async function marcarCompletado(formData: FormData) {
  const tenant = await tenantDelAdmin();
  await datosDelTenant(tenant.id)
    .update("turnos", { estado: "completado" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/turnos");
}
```

- [ ] **Step 6: Reemplazar `src/app/admin/configuracion/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { construirHorarioAtencion, DIAS_SEMANA } from "@/lib/turnos/horario";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { datosDelTenant } from "@/lib/tenant/datos";

export async function updateConfiguracion(formData: FormData) {
  const tenant = await tenantDelAdmin();

  const horarioAtencion = construirHorarioAtencion(
    DIAS_SEMANA.map((d) => ({
      key: d.key,
      cerrado: formData.get(`cerrado_${d.key}`) === "on",
      desde: String(formData.get(`desde_${d.key}`) || ""),
      hasta: String(formData.get(`hasta_${d.key}`) || ""),
    })),
  );

  await datosDelTenant(tenant.id).update("configuracion_negocio", {
    horas_minimas_cancelacion: Number(formData.get("horas_minimas_cancelacion")),
    minutos_preparacion_entre_turnos: Number(formData.get("minutos_preparacion_entre_turnos")),
    sena_porcentaje: Number(formData.get("sena_porcentaje")),
    horario_atencion: horarioAtencion,
  });
  revalidatePath("/admin/configuracion");
  revalidatePath("/sitio/[tenant]", "layout");
}
```

- [ ] **Step 7: Storage con carpeta por tenant**

1. En `src/lib/video/provider.ts`, cambiar la firma a `subir(carpeta: string, archivo: Buffer, nombreArchivo: string): Promise<string>;`.
2. En `src/lib/video/supabase-storage.ts`, cambiar a `async subir(carpeta, archivo, nombreArchivo) {` y ``const path = `${carpeta}/${Date.now()}-${nombreArchivo}`;``.
3. En `src/lib/storage/archivos.ts`, cambiar a `export async function subirArchivoCurso(carpeta: string, archivo: Buffer, nombreArchivo: string)` y ``const path = `${carpeta}/${Date.now()}-${nombreArchivo}`;``.

- [ ] **Step 8: Reemplazar `src/app/admin/cursos/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { videoProvider } from "@/lib/video";
import { subirArchivoCurso, borrarArchivoCurso } from "@/lib/storage/archivos";
import { youtubeId } from "@/lib/video/youtube";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { datosDelTenant } from "@/lib/tenant/datos";

// Límites de la versión de prueba (Supabase free tier = 1 GB de storage total).
// Subir videos en MP4/H.264 comprimido (ej. 720p) para entrar cómodo en este tope.
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150 MB
const MAX_ARCHIVO_BYTES = 20 * 1024 * 1024; // 20 MB

function revalidar(cursoId?: string) {
  revalidatePath("/admin/cursos");
  revalidatePath("/sitio/[tenant]", "layout");
  if (cursoId) revalidatePath(`/admin/cursos/${cursoId}`);
}

export async function createCurso(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const db = datosDelTenant(tenant.id);

  const video = formData.get("video") as File | null;
  if (video && video.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `El video pesa ${Math.round(video.size / 1024 / 1024)}MB. Por ahora el límite es 150MB (versión de prueba) — comprimilo (MP4/H.264, ej. 720p) o subilo después.`,
    );
  }

  const { data, error } = await db
    .insert("cursos", {
      titulo: String(formData.get("titulo")),
      categoria: String(formData.get("categoria")),
      precio: Number(formData.get("precio") || 0),
      dias_acceso: Number(formData.get("dias_acceso") || 7),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el curso");

  if (video && video.size > 0) {
    const buffer = Buffer.from(await video.arrayBuffer());
    const path = await videoProvider.subir(`${tenant.id}/${data.id}`, buffer, video.name);
    await db.update("cursos", { video_storage_path: path }).eq("id", data.id);
  }

  revalidar();
  redirect(`/admin/cursos/${data.id}`);
}

export async function updateCurso(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const id = String(formData.get("id"));

  const ofertaDesde = String(formData.get("oferta_desde") || "");
  const ofertaHasta = String(formData.get("oferta_hasta") || "");
  const precioOferta = String(formData.get("precio_oferta") || "");
  const previewYoutubeUrl = String(formData.get("preview_youtube_url") || "").trim();
  if (previewYoutubeUrl && !youtubeId(previewYoutubeUrl)) {
    throw new Error("El link de vista previa no es un video de YouTube válido.");
  }

  await datosDelTenant(tenant.id)
    .update("cursos", {
      titulo: String(formData.get("titulo")),
      descripcion: String(formData.get("descripcion") || "") || null,
      preview_youtube_url: previewYoutubeUrl || null,
      categoria: String(formData.get("categoria")),
      permitir_descarga: formData.get("permitir_descarga") === "on",
      dias_acceso: Number(formData.get("dias_acceso") || 7),
      precio: Number(formData.get("precio") || 0),
      precio_oferta: precioOferta ? Number(precioOferta) : null,
      oferta_activa: formData.get("oferta_activa") === "on",
      oferta_desde: ofertaDesde || null,
      oferta_hasta: ofertaHasta || null,
      estado: String(formData.get("estado")),
      orden: Number(formData.get("orden") || 0),
    })
    .eq("id", id);

  revalidar(id);
}

export async function deleteCurso(formData: FormData) {
  const tenant = await tenantDelAdmin();
  await datosDelTenant(tenant.id).delete("cursos").eq("id", String(formData.get("id")));
  revalidar();
  redirect("/admin/cursos");
}

export async function subirVideoCurso(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const cursoId = String(formData.get("cursoId"));
  const file = formData.get("video") as File | null;
  if (!file || file.size === 0) return;
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `El video pesa ${Math.round(file.size / 1024 / 1024)}MB. Por ahora el límite es 150MB (versión de prueba) — comprimilo (MP4/H.264, ej. 720p) y volvé a intentar.`,
    );
  }

  const db = datosDelTenant(tenant.id);
  const { data: curso } = await db.select("cursos", "id").eq("id", cursoId).maybeSingle();
  if (!curso) throw new Error("Curso no encontrado.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await videoProvider.subir(`${tenant.id}/${cursoId}`, buffer, file.name);
  await db.update("cursos", { video_storage_path: path }).eq("id", cursoId);
  revalidar(cursoId);
}

export async function subirArchivoAdicional(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const cursoId = String(formData.get("cursoId"));
  const file = formData.get("archivo") as File | null;
  if (!file || file.size === 0) return;
  if (file.size > MAX_ARCHIVO_BYTES) {
    throw new Error(
      `El archivo pesa ${Math.round(file.size / 1024 / 1024)}MB. Por ahora el límite es 20MB.`,
    );
  }

  const db = datosDelTenant(tenant.id);
  const { data: curso } = await db.select("cursos", "id").eq("id", cursoId).maybeSingle();
  if (!curso) throw new Error("Curso no encontrado.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await subirArchivoCurso(`${tenant.id}/${cursoId}`, buffer, file.name);
  const ext = file.name.split(".").pop()?.toLowerCase();
  const tipo = ext === "pdf" ? "pdf" : ext === "ppt" || ext === "pptx" ? "pptx" : "otro";

  await db.insert("archivos_curso", {
    curso_id: cursoId,
    nombre_archivo: file.name,
    storage_path: path,
    tipo,
  });
  revalidar(cursoId);
}

export async function eliminarArchivoAdicional(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const db = datosDelTenant(tenant.id);
  const id = String(formData.get("id"));
  const cursoId = String(formData.get("cursoId"));

  // La ruta del archivo sale de la base del tenant, no del formulario.
  const { data: archivo } = await db
    .select("archivos_curso", "storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!archivo) return;

  await borrarArchivoCurso(archivo.storage_path);
  await db.delete("archivos_curso").eq("id", id);
  revalidar(cursoId);
}
```

Nota: antes, `eliminarArchivoAdicional` borraba la ruta que mandaba el formulario (`storagePath`). Ahora la lee de la base del tenant, así un cliente no puede borrar archivos de otro. El `<input type="hidden" name="storagePath">` de `src/app/admin/cursos/[id]/page.tsx` queda sin uso: borrarlo en el Step 9.

- [ ] **Step 9: Páginas del admin, pedir el tenant y pasarlo a la capa de datos**

En cada página, agregar `import { tenantDelAdmin } from "@/lib/tenant/admin";` y, como primera línea del componente, `const tenant = await tenantDelAdmin();`. Después:

- `src/app/admin/servicios/page.tsx`: `getServiciosAdmin()` → `getServiciosAdmin(tenant.id)`
- `src/app/admin/turnos/page.tsx`: `getTurnosAdmin()` → `getTurnosAdmin(tenant.id)`
- `src/app/admin/cursos/page.tsx`: `getCursosAdmin()` → `getCursosAdmin(tenant.id)`
- `src/app/admin/configuracion/page.tsx`: `getConfiguracion()` → `getConfiguracion(tenant.id)`
- `src/app/admin/cursos/[id]/page.tsx`:
  - `getCursoAdmin(id)` → `getCursoAdmin(tenant.id, id)`
  - `getArchivosCurso(id)` → `getArchivosCurso(tenant.id, id)`
  - `getAccesosDeCurso(id)` → `getAccesosDeCurso(tenant.id, id)`
  - Borrar la línea `<input type="hidden" name="storagePath" value={a.storage_path} />`.

- [ ] **Step 10: Reemplazar `src/app/admin/cursos/[id]/video-preview/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getCursoAdmin } from "@/lib/data/cursos";
import { videoProvider } from "@/lib/video";
import { tenantDelAdmin } from "@/lib/tenant/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const curso = await getCursoAdmin(tenant.id, id);
  if (!curso?.video_storage_path) {
    return NextResponse.json({ error: "Este curso no tiene video subido." }, { status: 404 });
  }

  const url = await videoProvider.urlFirmada(curso.video_storage_path, 300);
  return NextResponse.redirect(url);
}
```

---

### Task 16: Webhook, cron, entorno y verificación final

**Files:**
- Modify: `src/app/api/webhooks/mercadopago/route.ts`, `src/app/api/cron/recordatorios/route.ts`, `.env.example`, `.env.local` (solo variables no secretas), `README.md`

- [ ] **Step 1: Webhook, escribir en el tenant dueño del turno o del curso**

En `src/app/api/webhooks/mercadopago/route.ts`:

1. Agregar `import { datosDelTenant } from "@/lib/tenant/datos";` e `import { urlDelTenant } from "@/lib/tenant/urls";`.
2. Reemplazar `procesarPagoTurno` y `procesarPagoCurso` completas:

```ts
async function procesarPagoTurno(turnoId: string, estadoPago: string, mpPaymentId: string) {
  if (estadoPago !== "approved") return;

  // El pago llega sin tenant: se resuelve desde el turno (consulta de sistema por id).
  const { data: turno } = await createAdminClient()
    .from("turnos")
    .select("*, servicios(nombre), tenants(slug)")
    .eq("id", turnoId)
    .maybeSingle();

  if (!turno || turno.estado !== "pendiente_pago") return; // ya procesado o inexistente
  const db = datosDelTenant(turno.tenant_id);

  let eventId: string | null = null;
  if (isGoogleConfigurado()) {
    try {
      const fin = new Date(
        new Date(turno.fecha_hora).getTime() + turno.duracion_minutos * 60000,
      ).toISOString();
      eventId = await crearEvento({
        titulo: `${turno.servicios.nombre} — ${turno.cliente_nombre}`,
        descripcion: `Turno reservado online. Seña abonada.`,
        inicioIso: turno.fecha_hora,
        finIso: fin,
        clienteEmail: turno.cliente_email,
      });
    } catch {
      // No bloquea la confirmación del turno si Calendar falla.
    }
  }

  await db
    .update("turnos", { estado: "confirmado", google_calendar_event_id: eventId })
    .eq("id", turnoId);

  await db.insert("pagos", {
    tipo: "turno",
    referencia_id: turnoId,
    mp_payment_id: mpPaymentId,
    estado: "approved",
    monto: turno.monto_sena,
  });

  if (isEmailConfigurado()) {
    const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString("es-AR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    });
    const { subject, html } = plantillaConfirmacionTurno({
      servicio: turno.servicios.nombre,
      fechaHoraTexto,
      linkGestion: `${urlDelTenant(turno.tenants.slug)}/turnos/gestion/${turno.token_gestion}`,
    });
    try {
      await enviarEmail({ to: turno.cliente_email, subject, html });
    } catch {
      // El turno ya quedó confirmado; el email es best-effort.
    }
  }
}

async function procesarPagoCurso(cursoId: string, pago: MpPayment) {
  if (pago.status !== "approved" || !pago.payerEmail) return;

  // El pago llega sin tenant: se resuelve desde el curso (consulta de sistema por id).
  const { data: curso } = await createAdminClient()
    .from("cursos")
    .select("tenant_id, titulo, dias_acceso, tenants(slug)")
    .eq("id", cursoId)
    .maybeSingle();
  if (!curso) return;
  const db = datosDelTenant(curso.tenant_id);

  // Idempotencia: si este pago ya se procesó (reintento del webhook), no duplicar.
  const { data: pagoExistente } = await db
    .select("pagos", "id")
    .eq("tipo", "curso")
    .eq("mp_payment_id", pago.id)
    .maybeSingle();
  if (pagoExistente) return;

  const expiraEn = calcularExpiracion(new Date().toISOString(), curso.dias_acceso);

  const { data: acceso } = await db
    .insert("accesos_curso", {
      curso_id: cursoId,
      cliente_email: pago.payerEmail,
      expira_en: expiraEn,
      mp_payment_id: pago.id,
    })
    .select("token_acceso")
    .single();

  await db.insert("pagos", {
    tipo: "curso",
    referencia_id: cursoId,
    mp_payment_id: pago.id,
    estado: "approved",
    monto: pago.transactionAmount,
  });

  if (isEmailConfigurado() && acceso) {
    const slug = (curso.tenants as unknown as { slug: string }).slug;
    const { subject, html } = plantillaCompraCurso({
      curso: curso.titulo,
      linkAcceso: `${urlDelTenant(slug)}/cursos/acceso/${acceso.token_acceso}`,
    });
    try {
      await enviarEmail({ to: pago.payerEmail, subject, html });
    } catch {
      // El acceso ya quedó creado; el email es best-effort.
    }
  }
}
```

- [ ] **Step 2: Cron de recordatorios, link y registro por tenant**

En `src/app/api/cron/recordatorios/route.ts`:

1. Agregar `import { datosDelTenant } from "@/lib/tenant/datos";` e `import { urlDelTenant } from "@/lib/tenant/urls";`.
2. En el `.select(...)` de turnos, agregar al comienzo de la lista `tenant_id, ` y al final `, tenants(slug)`:

```ts
    .select(
      "id, tenant_id, cliente_email, fecha_hora, creado_en, token_gestion, servicios(nombre), recordatorios_enviados(tipo, canal), tenants(slug)",
    )
```

3. Borrar `const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;`.
4. Dentro del `for`, después de `if (!tipo) continue;`, agregar `const datos = datosDelTenant(turno.tenant_id);` y reemplazar los dos accesos a `recordatorios_enviados`:

```ts
    const { error: yaTomado } = await datos
      .insert("recordatorios_enviados", { turno_id: turno.id, tipo, canal: "email" });
```

```ts
      await datos
        .delete("recordatorios_enviados")
        .match({ turno_id: turno.id, tipo, canal: "email" });
```

5. El link de gestión:

```ts
      linkGestion: `${urlDelTenant((turno.tenants as unknown as { slug: string }).slug)}/turnos/gestion/${turno.token_gestion}`,
```

- [ ] **Step 3: `.env.example`, bloque nuevo al final**

```
# === Plataforma (multi-tenant) ===
# Cada cliente es <slug>.<PLATFORM_DOMAIN>. En desarrollo: localhost:3000 → http://gisel.localhost:3000
PLATFORM_DOMAIN=localhost:3000
PLATFORM_PROTOCOLO=http
# Tenant que se muestra cuando el host no es de la plataforma (túneles, IP). Vacío = 404.
TENANT_POR_DEFECTO=gisel
# Conexión directa a Postgres para scripts/migrar.mjs (Supabase → Connect → Session pooler).
SUPABASE_DB_URL=
```

- [ ] **Step 4: `.env.local`, agregar las variables no secretas**

Agregar al final `PLATFORM_DOMAIN=localhost:3000`, `PLATFORM_PROTOCOLO=http` y `TENANT_POR_DEFECTO=gisel`. `SUPABASE_DB_URL` ya la cargó Pablo como requisito previo. No imprimir el archivo.

- [ ] **Step 5: README, sección de desarrollo**

Reemplazar el bloque de código de "## Desarrollo" por:

````markdown
```bash
npm install
cp .env.example .env.local   # completar con las credenciales (nunca commitear)
npm run dev                  # http://gisel.localhost:3000 (cada cliente es un subdominio)
npm test                     # tests unitarios
npm run test:aislamiento     # aislamiento entre tenants contra la base real
npm run migrar -- supabase/migrations/<archivo>.sql
```
````

- [ ] **Step 6: Verificar tipos, lint, tests y build**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
npm run build
```

Expected:
- `tsc` y `eslint` sin errores.
- Vitest con todos los tests en PASS: los 63 anteriores más los nuevos de `host`, `consultas`, `mapear`, `urls`, `permisos` y `horario`.
- En el build aparecen `ƒ /sitio/[tenant]`, `ƒ /sitio/[tenant]/turnos`, `ƒ /sitio/[tenant]/cursos` y `ƒ Proxy (Middleware)`.

Si `tsc` marca errores de tipos por el `select` genérico de `consultasDelTenant` (filas tipadas como error de parseo), quitar el genérico y declarar `columnas: string = "*"`. El tipado de las filas queda como en el código actual (casts `as Tipo[]`).

- [ ] **Step 7: Smoke test en desarrollo**

Run (en background): `npm run dev`. Después:

```bash
curl -s -o /dev/null -w 'inicio gisel: %{http_code}\n' http://gisel.localhost:3000/
curl -s http://gisel.localhost:3000/ | grep -o -E "Tu momento de|Hola, soy Gisel|Carla M\.|Lunes a viernes" | sort -u
curl -s -o /dev/null -w 'turnos: %{http_code}\n' http://gisel.localhost:3000/turnos
curl -s -o /dev/null -w 'cursos: %{http_code}\n' http://gisel.localhost:3000/cursos
curl -s -o /dev/null -w 'tenant inexistente: %{http_code}\n' http://noexiste.localhost:3000/
curl -s -o /dev/null -w 'ruta interna directa: %{http_code}\n' http://gisel.localhost:3000/sitio/gisel
curl -s -o /dev/null -w 'raíz: %{http_code}\n' http://localhost:3000/
curl -s -o /dev/null -w 'admin sin sesión: %{http_code}\n' http://gisel.localhost:3000/admin
```

Expected:
- `inicio gisel`, `turnos` y `cursos`: `200`. El `grep` muestra los 4 textos, todos salidos de la base.
- `tenant inexistente`: `404`.
- `ruta interna directa`: `404`.
- `raíz`: `404`.
- `admin sin sesión`: `307`, redirige a `/admin/login`.

Si `curl` no resuelve `*.localhost` en Windows, usar `curl -H "Host: gisel.localhost:3000" http://localhost:3000/…`.

- [ ] **Step 8: Smoke test en Docker**

```bash
docker compose up -d --build --force-recreate
curl -s -o /dev/null -w 'docker gisel: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/
curl -s -o /dev/null -w 'docker turnos: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/turnos
```

Expected: `200` y `200`.

- [ ] **Step 9: Volver a correr el test de aislamiento**

Run: `npm run test:aislamiento`
Expected: `Aislamiento OK`.

- [ ] **Step 10: Commit de las Tasks 10 a 16**

```bash
git add -A src next.config.ts .env.example README.md
git status --short   # revisar que .env.local NO aparezca
git commit -m "feat(multitenant): sitio y panel por subdominio, datos y contenido por tenant"
```

---

## Self-review

**Cobertura del spec (sección 14, etapa A, parte A1):**

| Requisito | Task |
|---|---|
| Tablas `tenants`, `tenant_marca`, `tenant_credenciales`, `perfiles`, `testimonios` | 2 |
| `tenant_id` en tablas existentes, `configuracion_negocio` una fila por tenant | 2 |
| RLS cliente, master y anónimo; credenciales sin policies | 3 |
| Tests de aislamiento | 4 y 16.9 |
| `datosDelTenant` | 6 |
| `proxy` con subdominios, rutas internas bloqueadas | 5 y 11 |
| `/sitio/[tenant]`, 404 y suspendido | 12 |
| Módulos que ocultan páginas y menú | 12 y 13 |
| Migración de Gisel | 2 |
| `requireAdmin` verifica rol y tenant | 9 y 15 |

Quedan para **A2**: colores neutros, `<T>`, zona horaria, moneda, teléfono por país y `lang`. Galería, preguntas frecuentes, botón flotante de WhatsApp y `modo_pago` quedan para **C**.

**Tipos consistentes:** `tenantDelRequest`, `tenantDeLaPagina`, `tenantDelAdmin`, `datosDelTenant`, `getTenantPorSlug` y `urlDelTenant` tienen la misma firma en todas las tasks. Las funciones de `src/lib/data` reciben `tenantId` como primer parámetro en todas sus llamadas.
