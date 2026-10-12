# Etapa A2 — Presentación por tenant: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que cada tenant se vea y se lea como propio. El sitio público toma los colores de la marca, habla en el idioma del tenant (español o portugués), muestra fechas en su zona horaria, precios en su moneda, valida teléfonos de su país y declara su idioma en `<html lang>`.

**Arquitectura:**
- **Colores:** los tokens de Tailwind con nombre de la marca de Gisel (`mauve`, `sage`, `cream`, `ink`) pasan a ser neutros (`primario`, `secundario`, `fondo`, `texto`, con `-oscuro` y `-suave`). En `globals.css`, un `@theme inline` los apunta a 4 variables CSS (`--marca-*`) y deriva las variantes con `color-mix()`. Los layouts del sitio y del panel definen esas variables con los colores del tenant.
- **Idioma:** `src/lib/i18n/` sin librerías. Tipo `Textos = Record<Idioma, string>`, así que un texto sin traducir no compila. El servidor usa `traducir`/`traductor(tenant.idioma)` y el cliente usa `<T es pt />` y `useT()`, con el idioma de un `IdiomaProvider` que pone el layout del sitio.
- **País:** `fechas.ts` recibe la zona IANA y calcula el offset con `Intl` (sin librerías). `formatPrecio(monto, moneda, idioma)` reemplaza a `formatPrecioARS`. `normalizarWhatsApp(input, pais)` valida celulares de AR o BR. Mercado Pago cobra en la moneda del tenant.
- **`lang`:** un solo layout raíz. El `proxy` agrega la cabecera `x-tenant-slug` al reescribir hacia `/sitio/<slug>`, y el layout raíz la lee con `headers()` para poner `es-AR` o `pt-BR`.

**Stack:** Next.js 16 (App Router, `proxy.ts`, `headers()`), React 19 (contexto), Tailwind CSS 4.3 (`@theme inline`, `color-mix`), `Intl` (fechas, números y offsets), `libphonenumber-js/max`, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-11-plataforma-multitenant-design.md](../specs/2026-10-11-plataforma-multitenant-design.md), secciones 8, 10 y 12.
**Plan anterior:** [2026-10-11-etapa-a1-nucleo-multitenant.md](2026-10-11-etapa-a1-nucleo-multitenant.md).

---

## Alcance y decisiones

**Incluido en A2:**

- Colores neutros con la paleta de cada tenant, en el sitio público y en el panel.
- `LoadingOverlay` sin el monograma de Gisel.
- Traducción al portugués de todo el sitio público: páginas de `src/app/sitio/[tenant]/**`, los componentes que usa (`landing`, `turnos`, `cursos`, `ui`), los títulos de metadata y los errores de las actions públicas.
- `lang` del HTML por tenant.
- Zona horaria, moneda y teléfono por país, también en el panel, el webhook y el cron de recordatorios.

**Fuera de A2:** el panel del cliente sigue en español (etapa C), y los emails, con su objeto `COLOR` de `src/lib/email/plantillas.ts` y sus textos, siguen como están (etapa D). El contenido que carga el tenant (textos de marca, nombres de servicios y cursos) no se traduce.

**Decisiones ya tomadas (no se reabren):**

1. **Tokens:** `mauve`→`primario`, `mauve-dark`→`primario-oscuro`, `mauve-soft`→`primario-suave`, `sage`→`secundario`, `sage-dark`→`secundario-oscuro`, `cream`→`fondo`, `cream-dark`→`fondo-oscuro`, `ink`→`texto`, `ink-soft`→`texto-suave`. Valores por defecto en `:root` = paleta actual de Gisel, así el panel y los contextos sin tenant se ven igual.
2. **`LoadingOverlay`:** spinner con el color primario y el texto, sin imagen.
3. **i18n sin librerías:** `traducir`, `IdiomaProvider`, `<T>` y `useT()`, con traducciones al portugués de Brasil escritas en este plan.
4. **`lang`:** un solo layout raíz; el `proxy` pasa el slug en `x-tenant-slug` y el layout raíz lo lee con `headers()`.
5. **Zona horaria:** `fechas.ts` recibe la zona IANA, sin offset fijo.
6. **Moneda:** `formatPrecio(monto, moneda, idioma)`. Mercado Pago toma la moneda del tenant y se elimina `MP_CURRENCY`.
7. **Teléfono:** `normalizarWhatsApp(input, pais)`, con un ejemplo de número por país.
8. **Git:** todo en `main`, un commit por task.

**Decisiones tomadas al planificar A2:**

1. **El núcleo de i18n va primero (Task 1).** `formatPrecio` y las fechas del cliente usan `LOCALES` (`es`→`es-AR`, `pt`→`pt-BR`), así que se definen una sola vez en `src/lib/i18n/textos.ts`. `Idioma` pasa a definirse ahí y `src/lib/tenant/tipos.ts` lo reexporta.
2. **API vieja temporal.** Para que cada task compile, las Tasks 2 y 3 dejan `isoFechaHoraAR`, `diaSemanaAR`, `minutosDelDiaAR`, `fechaHoyAR` y `formatPrecioARS` como envoltorios de la API nueva, sin tests. La Task 10 los borra cuando ya no queda ningún uso.
3. **Los componentes traducidos ya usan la API final.** Cada archivo del sitio que se reescribe en las Tasks 7, 8 y 9 aplica de una vez el idioma, la moneda y la zona del tenant, para no reescribirlo dos veces. La Task 10 enhebra lo que queda fuera del sitio: panel, webhook y cron.
4. **`estiloMarca` valida los colores.** Solo acepta hex (`#rgb`, `#rgba`, `#rrggbb` o `#rrggbbaa`). Un valor que no cumple se omite y queda el de `globals.css`. Así un color mal cargado (o malicioso) no puede inyectar CSS en el atributo `style`.
5. **El panel toma los colores del tenant del host** con `tenantDelRequest()`, porque la marca es pública. Así también el login (antes de la sesión) se ve con la marca del tenant.
6. **El panel conserva el locale `es-AR` en las fechas** (todavía está en español), pero usa la zona horaria y la moneda del tenant.
7. **El `lang` del panel queda en `es`.** El `proxy` agrega `x-tenant-slug` solo al reescribir el sitio público. En `/admin` el layout raíz no recibe la cabecera y usa `es`, que coincide con el idioma del panel hasta la etapa C.
8. **`resumirHorario` (horarios del footer) recibe el idioma:** "Lunes a viernes · 14:00 a 19:00 hs" / "Segunda a sexta · 14:00 às 19:00".
9. **El ejemplo de teléfono vive en `src/lib/turnos/ejemplo-whatsapp.ts`** y no en `whatsapp.ts`. `ReservaForm` es un componente de cliente, e importar `whatsapp.ts` metería la metadata de `libphonenumber-js/max` (~145 KB) en el bundle del navegador.
10. **Los días del `SlotPicker` salen de la zona del tenant.** Hoy se arman con la fecha del navegador y `toISOString()` (UTC), así que a la noche pueden correrse un día. Pasan a calcularse con `fechaHoy(zona)` y `sumarDias`, y la etiqueta se formatea en UTC sobre el mediodía de esa fecha.
11. **`calcularExpiracion` recibe la zona** (`src/lib/cursos/reglas.ts`), porque hoy usa el offset fijo de AR.
12. **`normalizarWhatsApp` rechaza fijos de Brasil en cualquier tenant.** Antes, un tenant AR aceptaba cualquier número extranjero válido, incluso un fijo brasileño. Ahora un `+55` tiene que ser celular. El resto de los números extranjeros se sigue aceptando.
13. **Script `scripts/tenant-demo-br.mjs` (crear/borrar).** Crea el tenant temporal `demo-br` para la verificación en portugués y lo borra al terminar. Queda en el repo para repetir la prueba en las etapas C y D.

**Riesgos verificados:**

- **Tailwind 4 con colores por variable y opacidad:** verificado compilando con `tailwindcss` 4.3.2 instalado. `bg-primario/15` genera `background-color: var(--marca-primario)` con un `@supports` que usa `color-mix(in oklab, var(--marca-primario) 15%, transparent)`. Las variantes derivadas (`text-primario-oscuro`) quedan como `color-mix(in srgb, var(--marca-primario) 85%, black)` en la clase misma. **Por qué `inline`:** sin `inline`, la clase usaría `var(--color-primario-oscuro)`, y esa variable se resuelve en `:root` con los colores por defecto. El `style` del layout del tenant no la cambiaría.
- **`headers()` en el layout raíz:** es una API de request (docs de Next 16, `functions/headers.md`). Vuelve dinámicas todas las rutas con layout (las páginas de "gracias" y el 404 global dejan de ser estáticas). No afecta a `/api`. El proyecto no usa `cacheComponents`, así que no hace falta `<Suspense>`.
- **`NextResponse.rewrite(url, { request: { headers } })`:** el tipo `MiddlewareResponseInit` acepta `request.headers` en `rewrite` y `next` (`next/dist/server/web/spec-extension/response.d.ts`), y la doc de `proxy.md` ("Setting Headers") indica que así llegan al render y no al cliente. Un cliente puede mandar su propia `x-tenant-slug` a `/admin`, pero solo cambia el `lang` de su propia respuesta. El layout raíz valida el slug con `esSlugValido` antes de consultar la base.
- **Variables en `style`:** custom properties en un `div` envolvente se heredan aunque el `LoadingOverlay` sea `fixed`, porque se renderiza dentro del árbol, sin portal.

## Estructura de archivos

**Nuevos**

| Archivo | Responsabilidad |
|---|---|
| `src/lib/i18n/textos.ts` (+test) | `Idioma`, `Textos`, `LOCALES`, `IDIOMA_POR_DEFECTO`, `traducir`, `traductor` (puro, servidor y cliente) |
| `src/lib/i18n/cliente.tsx` | `IdiomaProvider`, `useIdioma`, `useT`, `<T>` (cliente) |
| `src/lib/tenant/estilo.ts` (+test) | `estiloMarca(marca)`: variables `--marca-*` validadas |
| `src/lib/tenant/metadata.ts` | `metadataTraducida(params, titulo)`: título en el idioma del tenant |
| `src/lib/turnos/ejemplo-whatsapp.ts` | Ejemplo de celular por país (placeholder y errores) |
| `scripts/tenant-demo-br.mjs` | Crea y borra el tenant de prueba `demo-br` (pt, BR, BRL) |

**Reescritos completos**

- `src/lib/turnos/fechas.ts` (+test), `src/lib/format.ts` (+test), `src/lib/turnos/whatsapp.ts` (+test) y `src/lib/turnos/horario.ts` (+test).
- `src/app/globals.css`, `src/app/layout.tsx` y `src/proxy.ts`.
- `src/app/sitio/[tenant]/**`: todas las páginas, el layout, `not-found` y las actions.
- `src/components/landing/*`, `src/components/turnos/*`, `src/components/cursos/*` y `src/components/ui/LoadingOverlay.tsx`.
- `src/lib/data/turnos.ts` y `src/app/admin/layout.tsx`.

**Modificados puntualmente**

- `src/lib/tenant/tipos.ts`, `src/lib/tenant/urls.ts` y `src/lib/tenant/host.ts`.
- `src/lib/mercadopago/client.ts` y `src/lib/cursos/reglas.ts` (+test).
- `src/app/admin/{servicios,cursos,turnos}/page.tsx` y `src/app/admin/cursos/[id]/page.tsx`.
- `src/app/api/webhooks/mercadopago/route.ts`, `src/app/api/cron/recordatorios/route.ts` y `.env.example`.
- Renombre mecánico de clases en todo `src/app/**/*.tsx` y `src/components/**/*.tsx` (Task 6).

**Commits:** cada task compila (`tsc`) y pasa los tests por su cuenta, y termina en su propio commit. No hay tasks con `tsc` roto en el medio. **No usar `git add -A`:** `docs/resumen-arquitectura-y-desarrollo.md` tiene cambios previos de Pablo que no son de este plan. Cada commit agrega rutas explícitas.

Formato de todos los commits (mensaje en español, línea en blanco y la atribución):

```bash
git commit -F - <<'EOF'
<tipo>(<alcance>): <descripción>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 1: Núcleo de i18n

**Files:**
- Create: `src/lib/i18n/textos.ts`, `src/lib/i18n/textos.test.ts`, `src/lib/i18n/cliente.tsx`
- Modify: `src/lib/tenant/tipos.ts`, `src/lib/tenant/urls.ts`

- [ ] **Step 1: Test que falla**

Crear `src/lib/i18n/textos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { LOCALES, traducir, traductor } from "./textos";

describe("traducir", () => {
  it("devuelve el texto del idioma pedido", () => {
    const textos = { es: "Reservar turno", pt: "Agendar horário" };
    expect(traducir("es", textos)).toBe("Reservar turno");
    expect(traducir("pt", textos)).toBe("Agendar horário");
  });

  it("exige todas las claves (si falta una, no compila)", () => {
    // @ts-expect-error falta la traducción al portugués
    expect(traducir("es", { es: "Hola" })).toBe("Hola");
  });
});

describe("traductor", () => {
  it("fija el idioma y traduce cada texto", () => {
    const t = traductor("pt");
    expect(t({ es: "Servicios", pt: "Serviços" })).toBe("Serviços");
  });
});

describe("LOCALES", () => {
  it("usa el locale de cada país para Intl y para el lang del HTML", () => {
    expect(LOCALES).toEqual({ es: "es-AR", pt: "pt-BR" });
  });
});
```

Run: `npx vitest run src/lib/i18n`
Expected: FAIL, `Failed to resolve import "./textos"`.

- [ ] **Step 2: Crear `src/lib/i18n/textos.ts`**

```ts
/**
 * Textos en los idiomas de la plataforma, sin librerías. Este módulo es puro: lo usan
 * el servidor (con traducir/traductor y el idioma del tenant) y el cliente (vía cliente.tsx).
 */

/** Idiomas de la plataforma. Sumar uno acá obliga (por tipos) a traducir cada texto. */
export type Idioma = "es" | "pt";

/** Un texto en todos los idiomas. Si falta una clave, no compila. */
export type Textos = Record<Idioma, string>;

/** Idioma cuando no hay tenant (rutas sin tenant, errores antes de resolverlo). */
export const IDIOMA_POR_DEFECTO: Idioma = "es";

/** Locale de Intl (fechas y números) y del atributo lang del HTML. */
export const LOCALES: Record<Idioma, string> = { es: "es-AR", pt: "pt-BR" };

export function traducir(idioma: Idioma, textos: Textos): string {
  return textos[idioma];
}

/** Función de traducción con el idioma fijo: `const t = traductor(tenant.idioma)`. */
export function traductor(idioma: Idioma): (textos: Textos) => string {
  return (textos) => traducir(idioma, textos);
}
```

- [ ] **Step 3: Crear `src/lib/i18n/cliente.tsx`**

```tsx
"use client";

import { createContext, useContext } from "react";
import { IDIOMA_POR_DEFECTO, traducir, traductor, type Idioma, type Textos } from "./textos";

const IdiomaContext = createContext<Idioma>(IDIOMA_POR_DEFECTO);

/** Lo pone el layout del sitio con el idioma del tenant. */
export function IdiomaProvider({ idioma, children }: { idioma: Idioma; children: React.ReactNode }) {
  return <IdiomaContext value={idioma}>{children}</IdiomaContext>;
}

export function useIdioma(): Idioma {
  return useContext(IdiomaContext);
}

/** Para atributos, placeholders y labels en componentes de cliente: `t({ es, pt })`. */
export function useT(): (textos: Textos) => string {
  return traductor(useIdioma());
}

/** Texto en el idioma del sitio: `<T es="Volver" pt="Voltar" />`. */
export function T({ es, pt }: Textos) {
  return <>{traducir(useIdioma(), { es, pt })}</>;
}
```

- [ ] **Step 4: `Idioma` sale de i18n**

En `src/lib/tenant/tipos.ts`, reemplazar la primera línea:

```ts
export type Idioma = "es" | "pt";
```

por:

```ts
import type { Idioma } from "@/lib/i18n/textos";

export type { Idioma };
```

- [ ] **Step 5: Mensajes de WhatsApp en los dos idiomas**

En `src/lib/tenant/urls.ts`, agregar al comienzo del archivo:

```ts
import type { Textos } from "@/lib/i18n/textos";
```

y al final:

```ts
/** Mensajes precargados de los links de WhatsApp del sitio. */
export const MENSAJES_WHATSAPP = {
  consulta: { es: "¡Hola! Quería hacer una consulta.", pt: "Olá! Gostaria de fazer uma consulta." },
  turno: { es: "¡Hola! Quería consultar por un turno.", pt: "Olá! Gostaria de agendar um horário." },
} satisfies Record<string, Textos>;
```

- [ ] **Step 6: Verificar**

```bash
npx vitest run src/lib/i18n
npx tsc --noEmit
```

Expected: 4 tests en PASS. `tsc` sin errores; el `@ts-expect-error` confirma que un texto sin `pt` no compila.

- [ ] **Step 7: Commit**

```bash
git add src/lib/i18n src/lib/tenant/tipos.ts src/lib/tenant/urls.ts
git commit -F - <<'EOF'
feat(i18n): núcleo de traducción es/pt sin librerías

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Fechas en la zona horaria del tenant

**Files:**
- Modify (reemplazo completo): `src/lib/turnos/fechas.ts`, `src/lib/turnos/fechas.test.ts`

- [ ] **Step 1: Tests que fallan**

Reemplazar `src/lib/turnos/fechas.test.ts` completo. Mantiene las expectativas actuales para AR y suma Brasil (São Paulo -03:00, Manaos -04:00) y una zona con horario de verano:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  offsetEnZona,
  isoFechaHora,
  diaSemana,
  minutosDelDia,
  sumarDias,
  fechaEnZona,
  fechaHoy,
} from "./fechas";

const AR = "America/Argentina/Buenos_Aires";
const SAO_PAULO = "America/Sao_Paulo";
const MANAOS = "America/Manaus";
const MADRID = "Europe/Madrid";

describe("offsetEnZona", () => {
  it("devuelve el offset de cada zona en ese instante", () => {
    const instante = new Date("2026-07-10T15:00:00Z");
    expect(offsetEnZona(AR, instante)).toBe("-03:00");
    expect(offsetEnZona(SAO_PAULO, instante)).toBe("-03:00");
    expect(offsetEnZona(MANAOS, instante)).toBe("-04:00");
  });

  it("sigue el horario de verano de la zona", () => {
    expect(offsetEnZona(MADRID, new Date("2026-01-15T12:00:00Z"))).toBe("+01:00");
    expect(offsetEnZona(MADRID, new Date("2026-07-15T12:00:00Z"))).toBe("+02:00");
  });
});

describe("isoFechaHora", () => {
  it("arma un ISO con offset de Argentina (-03:00)", () => {
    expect(isoFechaHora("2026-07-10", 840, AR)).toBe("2026-07-10T14:00:00-03:00");
    expect(isoFechaHora("2026-07-10", 570, AR)).toBe("2026-07-10T09:30:00-03:00");
  });

  it("usa el offset de cada zona de Brasil", () => {
    expect(isoFechaHora("2026-07-10", 840, SAO_PAULO)).toBe("2026-07-10T14:00:00-03:00");
    expect(isoFechaHora("2026-07-10", 840, MANAOS)).toBe("2026-07-10T14:00:00-04:00");
    expect(isoFechaHora("2026-07-10", 0, MANAOS)).toBe("2026-07-10T00:00:00-04:00");
  });

  it("usa el offset de la fecha pedida en zonas con horario de verano", () => {
    expect(isoFechaHora("2026-01-10", 600, MADRID)).toBe("2026-01-10T10:00:00+01:00");
    expect(isoFechaHora("2026-07-10", 600, MADRID)).toBe("2026-07-10T10:00:00+02:00");
  });

  it("representa la hora de pared de la zona", () => {
    expect(new Date(isoFechaHora("2026-07-10", 840, MANAOS)).toISOString()).toBe(
      "2026-07-10T18:00:00.000Z",
    );
  });
});

describe("diaSemana", () => {
  it("devuelve la clave de día correcta", () => {
    expect(diaSemana("2026-07-10")).toBe("vie");
    expect(diaSemana("2026-07-11")).toBe("sab");
    expect(diaSemana("2026-07-12")).toBe("dom");
  });
});

describe("minutosDelDia", () => {
  it("extrae los minutos desde medianoche (hora AR) de un timestamp", () => {
    expect(minutosDelDia("2026-07-10T14:30:00-03:00", AR)).toBe(870);
    expect(minutosDelDia("2026-07-10T09:00:00-03:00", AR)).toBe(540);
  });

  it("convierte a la zona pedida", () => {
    expect(minutosDelDia("2026-07-10T14:30:00-03:00", SAO_PAULO)).toBe(870);
    expect(minutosDelDia("2026-07-10T14:30:00-03:00", MANAOS)).toBe(810);
    // 02:00 UTC del 11 son las 22:00 del 10 en Manaos.
    expect(minutosDelDia("2026-07-11T02:00:00Z", MANAOS)).toBe(1320);
  });
});

describe("sumarDias", () => {
  it("suma días cruzando fin de mes y de año", () => {
    expect(sumarDias("2026-07-10", 1)).toBe("2026-07-11");
    expect(sumarDias("2026-07-31", 1)).toBe("2026-08-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("resta con n negativo", () => {
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("fechaEnZona", () => {
  it("devuelve la fecha de calendario del instante en la zona", () => {
    const instante = new Date("2026-07-11T03:30:00Z");
    expect(fechaEnZona(instante, AR)).toBe("2026-07-11"); // 00:30 en AR
    expect(fechaEnZona(instante, SAO_PAULO)).toBe("2026-07-11");
    expect(fechaEnZona(instante, MANAOS)).toBe("2026-07-10"); // 23:30 en Manaos
  });
});

describe("fechaHoy", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("es la fecha de hoy en la zona del negocio", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T03:30:00Z"));
    expect(fechaHoy(AR)).toBe("2026-07-11");
    expect(fechaHoy(MANAOS)).toBe("2026-07-10");
  });
});
```

Run: `npx vitest run src/lib/turnos/fechas.test.ts`
Expected: FAIL, `offsetEnZona is not a function` (y el resto de los nombres nuevos).

- [ ] **Step 2: Reemplazar `src/lib/turnos/fechas.ts` completo**

```ts
/**
 * Fechas y horas en la zona horaria del negocio (IANA, ej. "America/Sao_Paulo").
 * Una fecha "YYYY-MM-DD" es un día de calendario, sin zona. Los instantes (ISO) se arman
 * con el offset que tiene la zona en ese momento, calculado con Intl (sin librerías).
 */
export type DiaSemana = "dom" | "lun" | "mar" | "mie" | "jue" | "vie" | "sab";

const DIAS: readonly DiaSemana[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

const formateadores = new Map<string, Intl.DateTimeFormat>();

function formateador(zona: string): Intl.DateTimeFormat {
  let f = formateadores.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zona,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formateadores.set(zona, f);
  }
  return f;
}

type HoraDePared = {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
};

/** Fecha y hora que marca un reloj de la zona en ese instante. */
function horaDePared(instante: Date, zona: string): HoraDePared {
  const p: Record<string, string> = {};
  for (const { type, value } of formateador(zona).formatToParts(instante)) p[type] = value;
  return {
    anio: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour),
    minuto: Number(p.minute),
    segundo: Number(p.second),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutos que la zona está adelantada (+) o atrasada (−) respecto de UTC en ese instante. */
function offsetMinutos(zona: string, instante: Date): number {
  const p = horaDePared(instante, zona);
  const paredComoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  const instanteSinMs = Math.floor(instante.getTime() / 1000) * 1000;
  return Math.round((paredComoUtc - instanteSinMs) / 60000);
}

function formatoOffset(minutos: number): string {
  const signo = minutos < 0 ? "-" : "+";
  const abs = Math.abs(minutos);
  return `${signo}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Offset "±HH:MM" de la zona en ese instante (ej. "-03:00"). */
export function offsetEnZona(zona: string, instante: Date): string {
  return formatoOffset(offsetMinutos(zona, instante));
}

/** ISO con el offset de la zona para una fecha "YYYY-MM-DD" y minutos del día (hora de pared). */
export function isoFechaHora(fecha: string, minutosDelDia: number, zona: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const paredComoUtc = Date.UTC(anio, mes - 1, dia, 0, minutosDelDia);
  // El offset depende del instante, que todavía no se conoce: se estima con la hora de
  // pared tomada como UTC y se corrige una vez (cubre los cambios de horario de verano).
  const estimado = offsetMinutos(zona, new Date(paredComoUtc));
  const offset = offsetMinutos(zona, new Date(paredComoUtc - estimado * 60000));
  const hh = pad(Math.floor(minutosDelDia / 60));
  const mm = pad(minutosDelDia % 60);
  return `${fecha}T${hh}:${mm}:00${formatoOffset(offset)}`;
}

/** Clave del día de la semana ("lun".."dom") de una fecha de calendario "YYYY-MM-DD". */
export function diaSemana(fecha: string): DiaSemana {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
}

/** Minutos desde medianoche, en la zona, de un timestamp ISO. */
export function minutosDelDia(iso: string, zona: string): number {
  const p = horaDePared(new Date(iso), zona);
  return p.hora * 60 + p.minuto;
}

/** Suma n días (o resta, con n negativo) a una fecha "YYYY-MM-DD". */
export function sumarDias(fecha: string, n: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + n)).toISOString().slice(0, 10);
}

/** Fecha de calendario "YYYY-MM-DD" de un instante en la zona. */
export function fechaEnZona(instante: Date, zona: string): string {
  const p = horaDePared(instante, zona);
  return `${p.anio}-${pad(p.mes)}-${pad(p.dia)}`;
}

/** Fecha de hoy en la zona, "YYYY-MM-DD". */
export function fechaHoy(zona: string): string {
  return fechaEnZona(new Date(), zona);
}

// --- Temporal: API anterior con la zona de Argentina fija. La Task 10 la borra. ---
const ZONA_AR = "America/Argentina/Buenos_Aires";
/** @deprecated Usar isoFechaHora(fecha, minutos, zona). */
export const isoFechaHoraAR = (fecha: string, minutos: number) =>
  isoFechaHora(fecha, minutos, ZONA_AR);
/** @deprecated Usar diaSemana(fecha). */
export const diaSemanaAR = diaSemana;
/** @deprecated Usar minutosDelDia(iso, zona). */
export const minutosDelDiaAR = (iso: string) => minutosDelDia(iso, ZONA_AR);
/** @deprecated Usar fechaHoy(zona). */
export const fechaHoyAR = () => fechaHoy(ZONA_AR);
```

- [ ] **Step 3: Verificar**

```bash
npx vitest run src/lib/turnos/fechas.test.ts
npx tsc --noEmit
```

Expected: 13 tests en PASS. `tsc` sin errores: `src/lib/data/turnos.ts` y `src/lib/cursos/reglas.ts` siguen usando los envoltorios `*AR`.

Si el test de Manaos o de Madrid falla con un offset de `+00:00`, el Node no tiene ICU completo. Node 22 lo trae por defecto, igual que la imagen `node:22-alpine`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/turnos/fechas.ts src/lib/turnos/fechas.test.ts
git commit -F - <<'EOF'
feat(turnos): fechas en la zona horaria IANA del negocio, con offset por Intl

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Precio en la moneda del tenant

**Files:**
- Modify (reemplazo completo): `src/lib/format.ts`, `src/lib/format.test.ts`

- [ ] **Step 1: Tests que fallan**

Reemplazar `src/lib/format.test.ts` completo:

```ts
import { describe, it, expect } from "vitest";
import { formatPrecio, formatDuracion } from "./format";

describe("formatPrecio", () => {
  it("ARS: símbolo $, separador de miles con punto y sin decimales", () => {
    expect(formatPrecio(15000, "ARS", "es")).toBe("$ 15.000");
    expect(formatPrecio(35000, "ARS", "es")).toBe("$ 35.000");
    expect(formatPrecio(1500, "ARS", "es")).toBe("$ 1.500");
  });

  it("ARS: maneja cero y redondea los decimales", () => {
    expect(formatPrecio(0, "ARS", "es")).toBe("$ 0");
    expect(formatPrecio(1999.9, "ARS", "es")).toBe("$ 2.000");
  });

  it("ARS en un sitio en portugués: mismo formato", () => {
    expect(formatPrecio(35000, "ARS", "pt")).toBe("$ 35.000");
  });

  it("BRL: símbolo R$ y siempre 2 decimales con coma", () => {
    expect(formatPrecio(350, "BRL", "pt")).toBe("R$ 350,00");
    expect(formatPrecio(1234.5, "BRL", "pt")).toBe("R$ 1.234,50");
    expect(formatPrecio(0, "BRL", "pt")).toBe("R$ 0,00");
    expect(formatPrecio(99.999, "BRL", "pt")).toBe("R$ 100,00");
  });
});

describe("formatDuracion", () => {
  it("horas y minutos", () => {
    expect(formatDuracion(90)).toBe("1h 30min");
  });
  it("solo horas", () => {
    expect(formatDuracion(60)).toBe("1h");
  });
  it("solo minutos", () => {
    expect(formatDuracion(40)).toBe("40min");
  });
  it("dos horas exactas", () => {
    expect(formatDuracion(120)).toBe("2h");
  });
});
```

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL, `formatPrecio is not a function`.

- [ ] **Step 2: Reemplazar `src/lib/format.ts` completo**

```ts
import { LOCALES, type Idioma } from "@/lib/i18n/textos";
import type { Moneda } from "@/lib/tenant/tipos";

const FORMATO_MONEDA: Record<Moneda, { simbolo: string; decimales: number }> = {
  ARS: { simbolo: "$", decimales: 0 },
  BRL: { simbolo: "R$", decimales: 2 },
};

/**
 * Formatea un monto en la moneda del tenant: "$ 35.000" (ARS, sin decimales) o
 * "R$ 350,00" (BRL, con 2 decimales). Los separadores siguen el idioma del sitio.
 */
export function formatPrecio(monto: number, moneda: Moneda, idioma: Idioma): string {
  const { simbolo, decimales } = FORMATO_MONEDA[moneda];
  const n = new Intl.NumberFormat(LOCALES[idioma], {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(monto);
  return `${simbolo} ${n}`;
}

/** Formatea una duración en minutos: "1h 30min", "1h", "40min". */
export function formatDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// --- Temporal: la Task 10 lo borra, cuando ya no quedan usos. ---
/** @deprecated Usar formatPrecio(monto, moneda, idioma). */
export const formatPrecioARS = (monto: number) => formatPrecio(monto, "ARS", "es");
```

- [ ] **Step 3: Verificar**

```bash
npx vitest run src/lib/format.test.ts
npx tsc --noEmit
```

Expected: 8 tests en PASS. `tsc` sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -F - <<'EOF'
feat(format): formatPrecio por moneda (ARS sin decimales, BRL con 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: WhatsApp por país

**Files:**
- Modify (reemplazo completo): `src/lib/turnos/whatsapp.ts`, `src/lib/turnos/whatsapp.test.ts`
- Create: `src/lib/turnos/ejemplo-whatsapp.ts`
- Modify: `src/app/sitio/[tenant]/turnos/actions.ts` (una línea)

- [ ] **Step 1: Tests que fallan**

Reemplazar `src/lib/turnos/whatsapp.test.ts` completo. Los casos de AR son los actuales, ahora con el país:

```ts
import { describe, it, expect } from "vitest";
import { normalizarWhatsApp } from "./whatsapp";

describe("normalizarWhatsApp en Argentina", () => {
  it("acepta celular con 15 y lo normaliza al formato internacional de WhatsApp", () => {
    expect(normalizarWhatsApp("011 15 2345-6789", "AR")).toBe("+5491123456789");
  });

  it("acepta celular sin 0 ni 15 (como lo escribe la mayoría)", () => {
    expect(normalizarWhatsApp("11 2345 6789", "AR")).toBe("+5491123456789");
  });

  it("acepta celular del interior", () => {
    expect(normalizarWhatsApp("0351 15 612-3456", "AR")).toBe("+5493516123456");
  });

  it("acepta el formato internacional con y sin el 9", () => {
    expect(normalizarWhatsApp("+54 9 11 2345-6789", "AR")).toBe("+5491123456789");
    expect(normalizarWhatsApp("+54 11 2345 6789", "AR")).toBe("+5491123456789");
  });

  it("acepta números de otros países", () => {
    expect(normalizarWhatsApp("+34 612 345 678", "AR")).toBe("+34612345678");
  });

  it("rechaza números incompletos o inválidos", () => {
    expect(normalizarWhatsApp("2345-6789", "AR")).toBeNull();
    expect(normalizarWhatsApp("123", "AR")).toBeNull();
    expect(normalizarWhatsApp("hola", "AR")).toBeNull();
    expect(normalizarWhatsApp("", "AR")).toBeNull();
  });
});

describe("normalizarWhatsApp en Brasil", () => {
  it("acepta celulares en los formatos habituales", () => {
    expect(normalizarWhatsApp("(11) 91234-5678", "BR")).toBe("+5511912345678");
    expect(normalizarWhatsApp("11 91234 5678", "BR")).toBe("+5511912345678");
    expect(normalizarWhatsApp("+55 11 91234-5678", "BR")).toBe("+5511912345678");
    expect(normalizarWhatsApp("(21) 98765-4321", "BR")).toBe("+5521987654321");
  });

  it("rechaza teléfonos fijos", () => {
    expect(normalizarWhatsApp("(11) 3456-7890", "BR")).toBeNull();
    expect(normalizarWhatsApp("+55 11 3456-7890", "AR")).toBeNull();
  });

  it("rechaza números sin DDD o inválidos", () => {
    expect(normalizarWhatsApp("91234-5678", "BR")).toBeNull();
    expect(normalizarWhatsApp("123", "BR")).toBeNull();
    expect(normalizarWhatsApp("hola", "BR")).toBeNull();
    expect(normalizarWhatsApp("", "BR")).toBeNull();
  });

  it("acepta un celular argentino en formato internacional", () => {
    expect(normalizarWhatsApp("+54 9 11 2345-6789", "BR")).toBe("+5491123456789");
  });
});
```

Run: `npx vitest run src/lib/turnos/whatsapp.test.ts`
Expected: FAIL. Los casos de Brasil sin código de país dan `null`, porque hoy se parsea siempre como AR; el fijo `+55` da un número en vez de `null`.

- [ ] **Step 2: Reemplazar `src/lib/turnos/whatsapp.ts` completo**

```ts
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import type { Pais } from "@/lib/tenant/tipos";

/**
 * Valida un número de WhatsApp y lo devuelve en formato E.164 (ej. +5491123456789), o null
 * si no es válido. Un número sin código de país se interpreta según el país del negocio.
 *
 * - Argentina: los celulares llevan un 9 tras el +54 en formato internacional, pero mucha
 *   gente escribe su celular sin 15 ni 9 (ej. "11 2345 6789"), que se parsea como fijo.
 *   Como el campo es de WhatsApp, se reinterpreta como celular.
 * - Brasil: solo celulares (ej. "(11) 91234-5678"); los fijos se rechazan.
 * - Otros países: se aceptan si el número es válido.
 */
export function normalizarWhatsApp(input: string, pais: Pais): string | null {
  const numero = parsePhoneNumberFromString(input, pais);
  if (!numero?.isValid()) return null;

  if (numero.country === "BR") return numero.getType() === "MOBILE" ? numero.number : null;
  if (numero.country !== "AR") return numero.number;
  if (numero.getType() === "MOBILE") return numero.number;

  const comoCelular = parsePhoneNumberFromString(`+549${numero.nationalNumber}`);
  return comoCelular?.isValid() && comoCelular.getType() === "MOBILE"
    ? comoCelular.number
    : null;
}
```

- [ ] **Step 3: Crear `src/lib/turnos/ejemplo-whatsapp.ts`**

Lo usan el formulario (cliente) y la action. Está aparte de `whatsapp.ts` para no meter `libphonenumber-js` en el bundle del navegador:

```ts
import type { Pais } from "@/lib/tenant/tipos";

/** Ejemplo de celular por país, para el placeholder y los mensajes de error. */
export const EJEMPLO_WHATSAPP: Record<Pais, string> = {
  AR: "11 2345 6789",
  BR: "(11) 91234-5678",
};
```

- [ ] **Step 4: Pasar el país en la reserva**

En `src/app/sitio/[tenant]/turnos/actions.ts`, reemplazar:

```ts
  const clienteWhatsApp = normalizarWhatsApp(clienteTelefono);
```

por:

```ts
  const clienteWhatsApp = normalizarWhatsApp(clienteTelefono, tenant.pais);
```

El mensaje de error se traduce en la Task 8.

- [ ] **Step 5: Verificar**

```bash
npx vitest run src/lib/turnos/whatsapp.test.ts
npx tsc --noEmit
```

Expected: 10 tests en PASS. `tsc` sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/turnos/whatsapp.ts src/lib/turnos/whatsapp.test.ts src/lib/turnos/ejemplo-whatsapp.ts "src/app/sitio/[tenant]/turnos/actions.ts"
git commit -F - <<'EOF'
feat(turnos): normalizarWhatsApp por país (celulares de AR y BR)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Horarios del footer en dos idiomas

**Files:**
- Modify (reemplazo completo): `src/lib/turnos/horario.ts`, `src/lib/turnos/horario.test.ts`
- Modify: `src/components/landing/Footer.tsx` (una línea)

- [ ] **Step 1: Tests que fallan**

Reemplazar `src/lib/turnos/horario.test.ts` completo:

```ts
import { describe, it, expect } from "vitest";
import { construirHorarioAtencion, DIAS_SEMANA, resumirHorario } from "./horario";

describe("DIAS_SEMANA", () => {
  it("tiene los 7 días de la semana en orden", () => {
    expect(DIAS_SEMANA.map((d) => d.key)).toEqual([
      "lun",
      "mar",
      "mie",
      "jue",
      "vie",
      "sab",
      "dom",
    ]);
  });
});

describe("construirHorarioAtencion", () => {
  it("incluye solo los días no marcados como cerrados", () => {
    const horario = construirHorarioAtencion([
      { key: "lun", cerrado: false, desde: "14:00", hasta: "19:00" },
      { key: "sab", cerrado: false, desde: "09:00", hasta: "14:00" },
      { key: "dom", cerrado: true, desde: "", hasta: "" },
    ]);
    expect(horario).toEqual({
      lun: ["14:00", "19:00"],
      sab: ["09:00", "14:00"],
    });
  });

  it("omite un día si falta desde/hasta aunque no esté marcado cerrado", () => {
    const horario = construirHorarioAtencion([
      { key: "mar", cerrado: false, desde: "", hasta: "" },
    ]);
    expect(horario).toEqual({});
  });
});

const SEMANA_Y_SABADO: Record<string, [string, string]> = {
  lun: ["14:00", "19:00"],
  mar: ["14:00", "19:00"],
  mie: ["14:00", "19:00"],
  jue: ["14:00", "19:00"],
  vie: ["14:00", "19:00"],
  sab: ["09:00", "14:00"],
};

const SALTEADOS: Record<string, [string, string]> = {
  lun: ["09:00", "13:00"],
  mar: ["09:00", "13:00"],
  jue: ["09:00", "13:00"],
};

describe("resumirHorario", () => {
  it("agrupa días consecutivos con el mismo horario", () => {
    expect(resumirHorario(SEMANA_Y_SABADO, "es")).toEqual([
      { dias: "Lunes a viernes", horas: "14:00 a 19:00 hs" },
      { dias: "Sábados", horas: "09:00 a 14:00 hs" },
    ]);
  });

  it("une dos días con 'y' y no agrupa días salteados", () => {
    expect(resumirHorario(SALTEADOS, "es")).toEqual([
      { dias: "Lunes y martes", horas: "09:00 a 13:00 hs" },
      { dias: "Jueves", horas: "09:00 a 13:00 hs" },
    ]);
  });

  it("en portugués", () => {
    expect(resumirHorario(SEMANA_Y_SABADO, "pt")).toEqual([
      { dias: "Segunda a sexta", horas: "14:00 às 19:00" },
      { dias: "Sábados", horas: "09:00 às 14:00" },
    ]);
    expect(resumirHorario(SALTEADOS, "pt")).toEqual([
      { dias: "Segunda e terça", horas: "09:00 às 13:00" },
      { dias: "Quintas", horas: "09:00 às 13:00" },
    ]);
  });

  it("sin días abiertos devuelve una lista vacía", () => {
    expect(resumirHorario({}, "es")).toEqual([]);
  });
});
```

Run: `npx vitest run src/lib/turnos/horario.test.ts`
Expected: FAIL en "en portugués" (devuelve los textos en español).

- [ ] **Step 2: Reemplazar `src/lib/turnos/horario.ts` completo**

`DIAS_SEMANA` queda igual, porque lo usa el formulario del panel, que sigue en español:

```ts
import type { Idioma } from "@/lib/i18n/textos";

export const DIAS_SEMANA = [
  { key: "lun", label: "Lunes" },
  { key: "mar", label: "Martes" },
  { key: "mie", label: "Miércoles" },
  { key: "jue", label: "Jueves" },
  { key: "vie", label: "Viernes" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
] as const;

type DiaFormulario = { key: string; cerrado: boolean; desde: string; hasta: string };

/** Construye el JSON de horario_atencion a partir de los datos del formulario de admin. */
export function construirHorarioAtencion(
  dias: DiaFormulario[],
): Record<string, [string, string]> {
  const horario: Record<string, [string, string]> = {};
  for (const d of dias) {
    if (!d.cerrado && d.desde && d.hasta) {
      horario[d.key] = [d.desde, d.hasta];
    }
  }
  return horario;
}

type NombresHorario = {
  /** Nombre del día en un rango ("Lunes a viernes"). */
  enRango: Record<string, string>;
  /** Nombre del día cuando va solo ("Sábados"). */
  solo: Record<string, string>;
  /** Conector de dos días seguidos. */
  y: string;
  /** Conector de tres o más días seguidos. */
  a: string;
  horas: (desde: string, hasta: string) => string;
};

const NOMBRES: Record<Idioma, NombresHorario> = {
  es: {
    enRango: {
      lun: "Lunes",
      mar: "Martes",
      mie: "Miércoles",
      jue: "Jueves",
      vie: "Viernes",
      sab: "Sábado",
      dom: "Domingo",
    },
    solo: {
      lun: "Lunes",
      mar: "Martes",
      mie: "Miércoles",
      jue: "Jueves",
      vie: "Viernes",
      sab: "Sábados",
      dom: "Domingos",
    },
    y: "y",
    a: "a",
    horas: (desde, hasta) => `${desde} a ${hasta} hs`,
  },
  pt: {
    enRango: {
      lun: "Segunda",
      mar: "Terça",
      mie: "Quarta",
      jue: "Quinta",
      vie: "Sexta",
      sab: "Sábado",
      dom: "Domingo",
    },
    solo: {
      lun: "Segundas",
      mar: "Terças",
      mie: "Quartas",
      jue: "Quintas",
      vie: "Sextas",
      sab: "Sábados",
      dom: "Domingos",
    },
    y: "e",
    a: "a",
    horas: (desde, hasta) => `${desde} às ${hasta}`,
  },
};

/**
 * Agrupa los días consecutivos con el mismo horario, en el idioma del sitio:
 * "Lunes a viernes · 14:00 a 19:00 hs" / "Segunda a sexta · 14:00 às 19:00".
 */
export function resumirHorario(
  horario: Record<string, [string, string]>,
  idioma: Idioma,
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

  const n = NOMBRES[idioma];
  return grupos.map(({ keys, rango }) => {
    const primero = keys[0];
    const ultimo = keys[keys.length - 1];
    const dias =
      keys.length === 1
        ? n.solo[primero]
        : `${n.enRango[primero]} ${keys.length === 2 ? n.y : n.a} ${n.enRango[ultimo].toLowerCase()}`;
    return { dias, horas: n.horas(rango[0], rango[1]) };
  });
}
```

- [ ] **Step 3: El footer pasa el idioma**

En `src/components/landing/Footer.tsx`, reemplazar:

```ts
  const horarios = config ? resumirHorario(config.horario_atencion) : [];
```

por:

```ts
  const horarios = config ? resumirHorario(config.horario_atencion, tenant.idioma) : [];
```

- [ ] **Step 4: Verificar**

```bash
npx vitest run src/lib/turnos/horario.test.ts
npx tsc --noEmit
```

Expected: 7 tests en PASS. `tsc` sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/turnos/horario.ts src/lib/turnos/horario.test.ts src/components/landing/Footer.tsx
git commit -F - <<'EOF'
feat(i18n): horarios del footer en español y portugués

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Colores neutros con la paleta del tenant

**Files:**
- Create: `src/lib/tenant/estilo.ts`, `src/lib/tenant/estilo.test.ts`
- Modify (reemplazo completo): `src/app/globals.css`, `src/components/ui/LoadingOverlay.tsx`, `src/components/landing/SitioSuspendido.tsx`, `src/app/sitio/[tenant]/layout.tsx`, `src/app/admin/layout.tsx`
- Modify (renombre mecánico): todos los `.tsx` de `src/app` y `src/components`

- [ ] **Step 1: Test que falla de `estiloMarca`**

Crear `src/lib/tenant/estilo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { estiloMarca } from "./estilo";

describe("estiloMarca", () => {
  it("define las 4 variables de color de la marca", () => {
    expect(
      estiloMarca({
        colorPrimario: "#c0899a",
        colorSecundario: "#4e5340",
        colorFondo: "#f6f1ea",
        colorTexto: "#1a1a1a",
      }),
    ).toEqual({
      "--marca-primario": "#c0899a",
      "--marca-secundario": "#4e5340",
      "--marca-fondo": "#f6f1ea",
      "--marca-texto": "#1a1a1a",
    });
  });

  it("omite los valores que no son un color hex (quedan los de globals.css)", () => {
    expect(
      estiloMarca({
        colorPrimario: "red;background:url(https://example.com/x)",
        colorSecundario: " #4E5340 ",
        colorFondo: "",
        colorTexto: "#123",
      }),
    ).toEqual({
      "--marca-secundario": "#4E5340",
      "--marca-texto": "#123",
    });
  });
});
```

Run: `npx vitest run src/lib/tenant/estilo.test.ts`
Expected: FAIL, `Failed to resolve import "./estilo"`.

- [ ] **Step 2: Crear `src/lib/tenant/estilo.ts`**

```ts
import type { CSSProperties } from "react";
import type { Marca } from "./tipos";

const VARIABLES = {
  colorPrimario: "--marca-primario",
  colorSecundario: "--marca-secundario",
  colorFondo: "--marca-fondo",
  colorTexto: "--marca-texto",
} as const;

export type ColoresMarca = Pick<Marca, keyof typeof VARIABLES>;

/** #rgb, #rgba, #rrggbb o #rrggbbaa. Cualquier otra cosa podría inyectar CSS en el style. */
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Variables CSS con los 4 colores base del tenant, para el style del layout. globals.css
 * deriva de ellas las clases (bg-primario, text-texto-suave…). Un color inválido se omite
 * y queda el valor por defecto de :root.
 */
export function estiloMarca(colores: ColoresMarca): CSSProperties {
  const estilo: CSSProperties & Record<string, string> = {};
  for (const campo of Object.keys(VARIABLES) as (keyof ColoresMarca)[]) {
    const valor = colores[campo].trim();
    if (HEX.test(valor)) estilo[VARIABLES[campo]] = valor;
  }
  return estilo;
}
```

Run: `npx vitest run src/lib/tenant/estilo.test.ts`
Expected: 2 tests en PASS.

- [ ] **Step 3: Reemplazar `src/app/globals.css` completo**

```css
@import "tailwindcss";

/*
 * Colores de la marca del tenant. Los layouts del sitio y del panel los redefinen con
 * style (estiloMarca). Los valores por defecto son la paleta de Gisel, para que las
 * páginas sin tenant se vean igual que antes.
 */
:root {
  color-scheme: light;
  --marca-primario: #c0899a;
  --marca-secundario: #4e5340;
  --marca-fondo: #f6f1ea;
  --marca-texto: #1a1a1a;
}

/*
 * "inline": cada clase lleva el valor (var(--marca-…) o el color-mix) y no var(--color-…).
 * Así el color-mix se resuelve en cada elemento con las variables de su tenant. Sin inline
 * se resolvería una sola vez en :root, con los colores por defecto.
 * En cada comentario: el resultado con la paleta de Gisel y el valor fijo que reemplaza.
 */
@theme inline {
  --color-primario: var(--marca-primario);
  /* #a37483 (antes #a66f82) */
  --color-primario-oscuro: color-mix(in srgb, var(--marca-primario) 85%, black);
  /* #d7b5bf (antes #d8b3bf) */
  --color-primario-suave: color-mix(in srgb, var(--marca-primario) 63%, white);
  --color-secundario: var(--marca-secundario);
  /* #3b3f31 (igual que antes) */
  --color-secundario-oscuro: color-mix(in srgb, var(--marca-secundario) 76%, black);
  --color-fondo: var(--marca-fondo);
  /* #eae5de (antes #ece3d8) */
  --color-fondo-oscuro: color-mix(in srgb, var(--marca-fondo) 95%, black);
  --color-texto: var(--marca-texto);
  /* #535250 (antes #55514e): el texto atenuado hacia el fondo */
  --color-texto-suave: color-mix(in srgb, var(--marca-texto) 74%, var(--marca-fondo));
}

@theme {
  /* Tipografía */
  --font-serif: var(--font-cormorant), Georgia, "Times New Roman", serif;
  --font-sans: var(--font-jost), system-ui, -apple-system, sans-serif;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--marca-fondo);
  color: var(--marca-texto);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1,
h2,
h3,
h4 {
  font-family: var(--font-serif);
  font-weight: 500;
  letter-spacing: -0.01em;
}

/* Feedback de interacción global: manito al pasar, achique al clickear. */
a,
button:not(:disabled),
[role="button"],
label:has(input[type="checkbox"]),
label:has(input[type="radio"]) {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

a,
button:not(:disabled) {
  transition:
    transform 0.12s ease,
    opacity 0.12s ease;
}

a:active,
button:not(:disabled):active {
  transform: scale(0.97);
}
```

Las variantes salen de mezclar el color base: `-oscuro` con negro, `-suave` con blanco y `texto-suave` con el fondo. Con la paleta de Gisel quedan a menos de 8 unidades por canal de los valores fijos actuales.

- [ ] **Step 4: Renombrar las clases (mecánico, de la más larga a la más corta)**

Primero van los nombres compuestos, para que `mauve` no pise a `mauve-dark`. El lookbehind `(?<=-)` exige el guion del prefijo de la clase (`bg-`, `text-`, `hover:bg-`, `border-t-`, etc.) y `\b` corta antes de `/15` o de un espacio:

```bash
git ls-files -z -- 'src/app/*.tsx' 'src/components/*.tsx' | xargs -0 perl -pi -e '
  s/(?<=-)mauve-dark\b/primario-oscuro/g;
  s/(?<=-)mauve-soft\b/primario-suave/g;
  s/(?<=-)sage-dark\b/secundario-oscuro/g;
  s/(?<=-)cream-dark\b/fondo-oscuro/g;
  s/(?<=-)ink-soft\b/texto-suave/g;
  s/(?<=-)mauve\b/primario/g;
  s/(?<=-)sage\b/secundario/g;
  s/(?<=-)cream\b/fondo/g;
  s/(?<=-)ink\b/texto/g;
'
```

(En el pathspec de git, `*` también cruza `/`, así que se toman todos los `.tsx` de los subdirectorios.)

Comprobar que no queda ningún token viejo, ni en los `.tsx` ni en el CSS:

```bash
grep -rnE -- "-(mauve|sage|cream|ink)\b" src/app src/components
```

Expected: sin salida. `src/lib/email/plantillas.ts` no se toca, porque su objeto `COLOR` es de la etapa D.

- [ ] **Step 5: Reemplazar `src/components/ui/LoadingOverlay.tsx` completo**

```tsx
/** Overlay de carga: spinner con el color primario del tenant y un texto opcional. */
export function LoadingOverlay({
  show,
  label,
}: {
  show: boolean;
  label?: string;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-fondo/85 backdrop-blur-sm">
      <span
        aria-hidden
        className="h-14 w-14 animate-spin rounded-full border-4 border-primario/20 border-t-primario"
      />
      {label && <p className="font-sans text-sm text-texto-suave">{label}</p>}
    </div>
  );
}
```

`public/brand/gb-rosa.png` deja de usarse en el código. No se borra, porque es un recurso de la marca de Gisel.

- [ ] **Step 6: Reemplazar `src/components/landing/SitioSuspendido.tsx` completo**

```tsx
import { Container } from "@/components/ui/Container";
import { traducir, type Idioma } from "@/lib/i18n/textos";

export function SitioSuspendido({ nombre, idioma }: { nombre: string; idioma: Idioma }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6 text-center">
      <Container className="max-w-md">
        <h1 className="font-serif text-4xl text-texto">{nombre}</h1>
        <p className="mt-4 font-sans text-texto-suave">
          {traducir(idioma, {
            es: "Este sitio no está disponible temporalmente. Volvé a intentar más tarde.",
            pt: "Este site está temporariamente indisponível. Tente novamente mais tarde.",
          })}
        </p>
      </Container>
    </main>
  );
}
```

- [ ] **Step 7: Reemplazar `src/app/sitio/[tenant]/layout.tsx` completo**

El layout pone los colores y el idioma del tenant. Los textos del `Nav` se traducen en la Task 7:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { SitioSuspendido } from "@/components/landing/SitioSuspendido";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { estiloMarca } from "@/lib/tenant/estilo";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { IdiomaProvider } from "@/lib/i18n/cliente";
import { traducir } from "@/lib/i18n/textos";

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

  return (
    <IdiomaProvider idioma={tenant.idioma}>
      {/* Colores de la marca: las clases (bg-primario, text-texto…) leen estas variables. */}
      <div style={estiloMarca(tenant.marca)} className="flex flex-1 flex-col bg-fondo text-texto">
        {tenant.estado === "suspendido" ? (
          <SitioSuspendido nombre={tenant.nombre} idioma={tenant.idioma} />
        ) : (
          <>
            <Nav
              nombre={tenant.nombre}
              logoUrl={tenant.marca.logoUrl}
              modulos={tenant.modulos}
              whatsappUrl={whatsappLink(
                tenant.marca.whatsapp,
                traducir(tenant.idioma, MENSAJES_WHATSAPP.consulta),
              )}
            />
            {children}
            <Footer tenant={tenant} />
          </>
        )}
      </div>
    </IdiomaProvider>
  );
}
```

- [ ] **Step 8: Reemplazar `src/app/admin/layout.tsx` completo**

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { estiloMarca } from "@/lib/tenant/estilo";
import { logout } from "./actions";
import { Container } from "@/components/ui/Container";

export const metadata = { title: "Panel" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Los colores de la marca son públicos: se aplican también al login, antes de la sesión.
  const tenantDelHost = await tenantDelRequest();
  const conMarca = (contenido: React.ReactNode) => (
    <div
      style={tenantDelHost ? estiloMarca(tenantDelHost.marca) : undefined}
      className="flex flex-1 flex-col"
    >
      {contenido}
    </div>
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: la /admin/login se muestra sola (sin el shell del panel).
  if (!user) return conMarca(children);

  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) {
    return conMarca(
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6">
        <p className="font-sans text-texto-suave">Esta cuenta no tiene acceso a este sitio.</p>
        <form action={logout}>
          <button className="font-sans text-sm text-primario hover:text-primario-oscuro">Salir</button>
        </form>
      </main>,
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

  return conMarca(
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-primario/15 bg-white/70">
        <Container className="flex h-16 items-center justify-between">
          <nav className="flex items-center gap-6 font-sans text-sm">
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className={
                  e.principal
                    ? "font-medium text-texto hover:text-primario"
                    : "text-texto-suave hover:text-primario"
                }
              >
                {e.label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button className="font-sans text-sm text-primario hover:text-primario-oscuro">Salir</button>
          </form>
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>,
  );
}
```

- [ ] **Step 9: Verificar tipos, tests, lint y CSS generado**

```bash
npx tsc --noEmit
npx vitest run
npx eslint src
npm run build
grep -rl --include=*.css -- "--marca-primario" .next/static | head -1
grep -rlE --include=*.css "mauve|cream-dark|ink-soft" .next/static
```

Expected:
- `tsc` y `eslint` sin errores. Vitest en PASS.
- El build termina bien.
- El primer `grep` muestra un archivo CSS y el segundo no muestra nada.

- [ ] **Step 10: Commit**

```bash
git add src/app src/components src/lib/tenant/estilo.ts src/lib/tenant/estilo.test.ts
git status --short   # docs/resumen-arquitectura-y-desarrollo.md tiene que seguir sin stagear
git commit -F - <<'EOF'
feat(marca): colores neutros con la paleta de cada tenant y overlay sin monograma

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Inicio del sitio en el idioma del tenant

Todos los textos visibles del inicio, del menú y del footer, y la moneda en los servicios. Los componentes de servidor usan `traductor(tenant.idioma)` y el `Nav` (cliente) usa `useT()`.

**Files (reemplazo completo):**
- `src/components/landing/Nav.tsx`, `Hero.tsx`, `Servicios.tsx`, `SobreMi.tsx`, `Testimonios.tsx`, `Redes.tsx`, `CtaWhatsapp.tsx` y `Footer.tsx`
- `src/app/sitio/[tenant]/page.tsx` y `src/app/sitio/[tenant]/not-found.tsx`

- [ ] **Step 1: `src/components/landing/Nav.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useT } from "@/lib/i18n/cliente";
import type { Modulos } from "@/lib/tenant/tipos";

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
  const t = useT();
  const links = [
    { href: "/#servicios", label: t({ es: "Servicios", pt: "Serviços" }) },
    ...(modulos.sobreMi
      ? [{ href: "/#sobre-mi", label: t({ es: "Sobre mí", pt: "Sobre mim" }) }]
      : []),
    ...(modulos.testimonios
      ? [{ href: "/#testimonios", label: t({ es: "Testimonios", pt: "Depoimentos" }) }]
      : []),
    ...(modulos.cursos ? [{ href: "/cursos", label: t({ es: "Cursos", pt: "Cursos" }) }] : []),
    { href: "/#contacto", label: t({ es: "Contacto", pt: "Contato" }) },
  ];
  const reservarHref = modulos.turnos ? "/turnos" : whatsappUrl;
  const reservarTexto = t({ es: "Reservar turno", pt: "Agendar horário" });
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? "bg-fondo/95 shadow-sm backdrop-blur" : "bg-transparent"
      }`}
    >
      <Container className="flex h-16 items-center justify-between sm:h-20">
        <Link href="/" aria-label={t({ es: "Inicio", pt: "Início" })} onClick={() => setOpen(false)}>
          <Logo src={logoUrl} alt={nombre} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-sans text-sm text-texto transition hover:text-primario"
            >
              {l.label}
            </Link>
          ))}
          {reservarHref && <Button href={reservarHref}>{reservarTexto}</Button>}
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center text-texto md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={
            open ? t({ es: "Cerrar menú", pt: "Fechar menu" }) : t({ es: "Abrir menú", pt: "Abrir menu" })
          }
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </Container>

      {open && (
        <nav className="border-t border-primario/15 bg-fondo md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 font-sans text-base text-texto transition hover:bg-fondo-oscuro"
              >
                {l.label}
              </Link>
            ))}
            {reservarHref && (
              <Button href={reservarHref} className="mt-2 w-full">
                {reservarTexto}
              </Button>
            )}
          </Container>
        </nav>
      )}
    </header>
  );
}
```

- [ ] **Step 2: `src/components/landing/Hero.tsx`**

```tsx
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { iniciales } from "@/lib/tenant/iniciales";
import { traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

export function Hero({ tenant }: { tenant: Tenant }) {
  const { marca, modulos } = tenant;
  const t = traductor(tenant.idioma);
  const whatsapp = whatsappLink(marca.whatsapp, t(MENSAJES_WHATSAPP.consulta));

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-b from-fondo via-fondo to-fondo-oscuro">
      {/* Watermark del monograma */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 select-none font-serif text-[22rem] leading-none text-primario/10 sm:text-[30rem]"
      >
        {iniciales(tenant.nombre)}
      </span>

      <Container className="relative z-10 py-28">
        <div className="max-w-2xl">
          {marca.rubro && (
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">{marca.rubro}</p>
          )}
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-texto sm:text-7xl">
            {marca.inicioTitulo}
            {marca.inicioDestacado && (
              <>
                {" "}
                <span className="text-primario">{marca.inicioDestacado}</span>
              </>
            )}
          </h1>
          {marca.inicioTexto && (
            <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed text-texto-suave">
              {marca.inicioTexto}
            </p>
          )}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {modulos.turnos ? (
              <Button href="/turnos">{t({ es: "Reservar turno", pt: "Agendar horário" })}</Button>
            ) : (
              whatsapp && (
                <Button href={whatsapp}>
                  {t({ es: "Escribir por WhatsApp", pt: "Falar no WhatsApp" })}
                </Button>
              )
            )}
            {modulos.cursos && (
              <Button href="/cursos" variant="outline">
                {t({ es: "Ver cursos", pt: "Ver cursos" })}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 3: `src/components/landing/Servicios.tsx`**

```tsx
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { formatPrecio, formatDuracion } from "@/lib/format";
import { getServiciosPublicos } from "@/lib/data/servicios";
import { traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

export async function Servicios({ tenant }: { tenant: Tenant }) {
  const servicios = await getServiciosPublicos(tenant.id);
  if (servicios.length === 0) return null;
  const reservaOnline = tenant.modulos.turnos;
  const t = traductor(tenant.idioma);

  return (
    <Section id="servicios" className="bg-fondo">
      <Container>
        <div className="max-w-2xl">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
            {t({ es: "Tratamientos", pt: "Tratamentos" })}
          </p>
          <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
            {t({ es: "Servicios", pt: "Serviços" })}
          </h2>
          <p className="mt-4 font-sans text-texto-suave">
            {t({ es: "Cada servicio tiene su duración y precio.", pt: "Cada serviço tem sua duração e preço." })}
            {reservaOnline &&
              ` ${t({ es: "Reservá online y asegurá tu turno.", pt: "Agende online e garanta seu horário." })}`}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => (
            <article
              key={s.id}
              className="flex flex-col rounded-2xl border border-primario/15 bg-white/60 p-6 transition hover:border-primario/40 hover:shadow-sm"
            >
              <h3 className="font-serif text-2xl text-texto">{s.nombre}</h3>
              <p className="mt-1 font-sans text-sm uppercase tracking-wider text-secundario">
                {formatDuracion(s.duracion_minutos)}
              </p>
              <p className="mt-4 font-sans text-lg text-primario-oscuro">
                {s.precio > 0
                  ? formatPrecio(s.precio, tenant.moneda, tenant.idioma)
                  : t({ es: "Consultar", pt: "Sob consulta" })}
              </p>
              {reservaOnline && (
                <Link
                  href={`/turnos?servicio=${encodeURIComponent(s.nombre)}`}
                  className="mt-6 inline-flex font-sans text-sm font-medium text-primario transition hover:text-primario-oscuro"
                >
                  {t({ es: "Reservar turno →", pt: "Agendar horário →" })}
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

- [ ] **Step 4: `src/components/landing/SobreMi.tsx`**

```tsx
import Image from "next/image";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { traducir, type Idioma } from "@/lib/i18n/textos";
import type { Marca } from "@/lib/tenant/tipos";

export function SobreMi({ nombre, marca, idioma }: { nombre: string; marca: Marca; idioma: Idioma }) {
  const parrafos = (marca.sobreMiTexto ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Section id="sobre-mi" className="bg-fondo-oscuro">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-primario-suave to-secundario/30">
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
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
              {traducir(idioma, { es: "Sobre mí", pt: "Sobre mim" })}
            </p>
            <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
              {marca.sobreMiTitulo ?? nombre}
            </h2>
            <div className="mt-6 space-y-4 font-sans text-texto-suave">
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

- [ ] **Step 5: `src/components/landing/Testimonios.tsx`**

La variable del `map` pasa de `t` a `testimonio`, porque `t` ahora es la función de traducción:

```tsx
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { traductor, type Idioma } from "@/lib/i18n/textos";
import type { Testimonio } from "@/lib/data/types";

export function Testimonios({ testimonios, idioma }: { testimonios: Testimonio[]; idioma: Idioma }) {
  const t = traductor(idioma);
  return (
    <Section id="testimonios" className="bg-fondo">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
            {t({ es: "Testimonios", pt: "Depoimentos" })}
          </p>
          <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
            {t({ es: "Lo que dicen mis clientas", pt: "O que dizem minhas clientes" })}
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonios.map((testimonio) => (
            <figure
              key={testimonio.id}
              className="flex flex-col rounded-2xl border border-primario/15 bg-white/60 p-7"
            >
              <span aria-hidden className="font-serif text-5xl leading-none text-primario/40">
                &ldquo;
              </span>
              <blockquote className="mt-2 font-sans text-texto-suave">{testimonio.texto}</blockquote>
              <figcaption className="mt-5 font-sans text-sm font-medium text-secundario">
                {testimonio.nombre}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 6: `src/components/landing/Redes.tsx`**

```tsx
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { traductor, type Idioma } from "@/lib/i18n/textos";

export function Redes({ instagram, idioma }: { instagram: string; idioma: Idioma }) {
  const t = traductor(idioma);
  return (
    <Section className="bg-fondo-oscuro">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
            {t({ es: "Seguime", pt: "Me siga" })}
          </p>
          <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
            {t({ es: "En Instagram", pt: "No Instagram" })}
          </h2>
          <p className="mt-4 font-sans text-texto-suave">
            {t({
              es: `Mirá mis trabajos, tips de cuidado y novedades en @${instagram}.`,
              pt: `Veja meus trabalhos, dicas de cuidados e novidades em @${instagram}.`,
            })}
          </p>
          <div className="mt-8 flex justify-center">
            <Button href={`https://instagram.com/${instagram}`}>
              {t({ es: "Ir a Instagram", pt: "Ir para o Instagram" })}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 7: `src/components/landing/CtaWhatsapp.tsx`**

```tsx
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

export function CtaWhatsapp({ tenant }: { tenant: Tenant }) {
  const t = traductor(tenant.idioma);
  const whatsapp = whatsappLink(tenant.marca.whatsapp, t(MENSAJES_WHATSAPP.turno));
  const reservaOnline = tenant.modulos.turnos;
  if (!whatsapp && !reservaOnline) return null;

  return (
    <section className="bg-primario">
      <Container className="flex flex-col items-center gap-6 py-16 text-center sm:py-20">
        <h2 className="max-w-2xl font-serif text-4xl text-fondo sm:text-5xl">
          {t({ es: "¿Lista para tu próximo turno?", pt: "Pronta para o seu próximo horário?" })}
        </h2>
        <p className="max-w-xl font-sans text-fondo/90">
          {whatsapp && reservaOnline
            ? t({
                es: "Escribime por WhatsApp para cualquier consulta, o reservá directamente online.",
                pt: "Me chame no WhatsApp para qualquer dúvida ou agende direto online.",
              })
            : whatsapp
              ? t({
                  es: "Escribime por WhatsApp y coordinamos tu turno.",
                  pt: "Me chame no WhatsApp e combinamos seu horário.",
                })
              : t({
                  es: "Reservá tu turno online en pocos pasos.",
                  pt: "Agende seu horário online em poucos passos.",
                })}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {whatsapp && (
            <Button href={whatsapp} variant="onDark">
              {t({ es: "Escribir por WhatsApp", pt: "Falar no WhatsApp" })}
            </Button>
          )}
          {reservaOnline && (
            <Button
              href="/turnos"
              variant="outline"
              className="border-fondo text-fondo hover:bg-fondo hover:text-primario"
            >
              {t({ es: "Reservar online", pt: "Agendar online" })}
            </Button>
          )}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 8: `src/components/landing/Footer.tsx`**

```tsx
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { getConfiguracion } from "@/lib/data/configuracion";
import { resumirHorario } from "@/lib/turnos/horario";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

export async function Footer({ tenant }: { tenant: Tenant }) {
  const { marca } = tenant;
  const t = traductor(tenant.idioma);
  const config = await getConfiguracion(tenant.id);
  const horarios = config ? resumirHorario(config.horario_atencion, tenant.idioma) : [];
  const whatsapp = whatsappLink(marca.whatsapp, t(MENSAJES_WHATSAPP.consulta));

  return (
    <footer id="contacto" className="bg-secundario-oscuro text-fondo">
      <Container className="py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo src={marca.logoClaroUrl ?? marca.logoUrl} alt={tenant.nombre} />
            {marca.tagline && (
              <p className="mt-4 max-w-xs font-sans text-sm text-fondo/70">{marca.tagline}.</p>
            )}
          </div>

          {horarios.length > 0 && (
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-fondo/90">
                {t({ es: "Horarios", pt: "Horários" })}
              </h3>
              <ul className="mt-4 space-y-2 font-sans text-sm text-fondo/70">
                {horarios.map((h) => (
                  <li key={h.dias}>
                    <span className="block text-fondo/90">{h.dias}</span>
                    {h.horas}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-fondo/90">
              {t({ es: "Contacto", pt: "Contato" })}
            </h3>
            <ul className="mt-4 space-y-2 font-sans text-sm text-fondo/70">
              {whatsapp && (
                <li>
                  <a href={whatsapp} className="transition hover:text-fondo" target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </li>
              )}
              {marca.emailContacto && (
                <li>
                  <a href={`mailto:${marca.emailContacto}`} className="transition hover:text-fondo">
                    {marca.emailContacto}
                  </a>
                </li>
              )}
              {marca.instagram && (
                <li>
                  <a
                    href={`https://instagram.com/${marca.instagram}`}
                    className="transition hover:text-fondo"
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
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-fondo/90">
                {t({ es: "Reservas", pt: "Agendamentos" })}
              </h3>
              {marca.notaReservas && (
                <p className="mt-4 font-sans text-sm text-fondo/70">{marca.notaReservas}</p>
              )}
              <Link
                href="/turnos"
                className="mt-4 inline-flex font-sans text-sm font-medium text-fondo underline-offset-4 hover:underline"
              >
                {t({ es: "Reservar turno →", pt: "Agendar horário →" })}
              </Link>
            </div>
          )}
        </div>

        <div className="mt-12 border-t border-fondo/15 pt-6 font-sans text-xs text-fondo/50">
          © {tenant.nombre}
          {marca.rubro && ` · ${marca.rubro}`}.{" "}
          {t({ es: "Todos los derechos reservados.", pt: "Todos os direitos reservados." })}
        </div>
      </Container>
    </footer>
  );
}
```

- [ ] **Step 9: `src/app/sitio/[tenant]/page.tsx`**

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
  const { modulos, marca, idioma } = tenant;
  const testimonios = modulos.testimonios ? await getTestimonios(tenant.id) : [];

  return (
    <main>
      <Hero tenant={tenant} />
      <Servicios tenant={tenant} />
      {modulos.sobreMi && <SobreMi nombre={tenant.nombre} marca={marca} idioma={idioma} />}
      {testimonios.length > 0 && <Testimonios testimonios={testimonios} idioma={idioma} />}
      {marca.instagram && <Redes instagram={marca.instagram} idioma={idioma} />}
      <CtaWhatsapp tenant={tenant} />
    </main>
  );
}
```

- [ ] **Step 10: `src/app/sitio/[tenant]/not-found.tsx`**

`not-found` no recibe `params`, así que usa `<T>`, que toma el idioma del `IdiomaProvider` del layout:

```tsx
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { T } from "@/lib/i18n/cliente";

export default function NoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6 pt-24 text-center">
      <Container className="max-w-md">
        <h1 className="font-serif text-4xl text-texto">
          <T es="Página no encontrada" pt="Página não encontrada" />
        </h1>
        <p className="mt-4 font-sans text-texto-suave">
          <T
            es="La dirección no existe o ya no está disponible."
            pt="O endereço não existe ou não está mais disponível."
          />
        </p>
        <Button href="/" className="mt-8">
          <T es="Volver al inicio" pt="Voltar ao início" />
        </Button>
      </Container>
    </main>
  );
}
```

- [ ] **Step 11: Verificar**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
```

Expected: `tsc` y `eslint` sin errores, y todos los tests en PASS.

- [ ] **Step 12: Commit**

```bash
git add src/components/landing "src/app/sitio/[tenant]/page.tsx" "src/app/sitio/[tenant]/not-found.tsx"
git commit -F - <<'EOF'
feat(i18n): inicio, menú y footer del sitio en el idioma del tenant

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Reserva y gestión de turnos por tenant

Idioma, zona horaria, moneda y teléfono del tenant en todo el flujo de turnos. Mercado Pago cobra en la moneda del tenant.

**Files:**
- Create: `src/lib/tenant/metadata.ts`
- Modify (reemplazo completo): `src/lib/data/turnos.ts`, `src/app/sitio/[tenant]/turnos/page.tsx`, `turnos/actions.ts`, `turnos/disponibilidad-action.ts`, `turnos/gracias/page.tsx`, `turnos/gestion/[token]/page.tsx`, `turnos/gestion/[token]/actions.ts`, `src/components/turnos/ReservaForm.tsx`, `SlotPicker.tsx` y `GestionPanel.tsx`
- Modify: `src/lib/mercadopago/client.ts`, `src/app/sitio/[tenant]/cursos/[id]/actions.ts` (una línea) y `.env.example`

- [ ] **Step 1: Crear `src/lib/tenant/metadata.ts`**

```ts
import "server-only";
import type { Metadata } from "next";
import { getTenantPorSlug } from "./actual";
import { IDIOMA_POR_DEFECTO, traducir, type Textos } from "@/lib/i18n/textos";

/** Metadata con el título de la página en el idioma del tenant. */
export async function metadataTraducida(
  params: Promise<{ tenant: string }>,
  titulo: Textos,
): Promise<Metadata> {
  const tenant = await getTenantPorSlug((await params).tenant);
  return { title: traducir(tenant?.idioma ?? IDIOMA_POR_DEFECTO, titulo) };
}
```

- [ ] **Step 2: Mercado Pago cobra en la moneda del tenant**

En `src/lib/mercadopago/client.ts`:

1. Agregar al comienzo: `import type { Moneda } from "@/lib/tenant/tipos";`
2. En `CrearPreferenciaOpts`, después de `monto: number;`, agregar:

```ts
  /** Moneda del tenant (currency_id de Mercado Pago). */
  moneda: Moneda;
```

3. En `crearPreferencia`, borrar la línea `const moneda = process.env.MP_CURRENCY || "ARS";` y la línea en blanco que le sigue, y reemplazar `currency_id: moneda,` por `currency_id: opts.moneda,`.

En `src/app/sitio/[tenant]/cursos/[id]/actions.ts`, dentro de `crearPreferencia({ … })`, después de `monto,` agregar:

```ts
      moneda: tenant.moneda,
```

(La Task 9 reescribe ese archivo completo, con la misma línea.)

En `.env.example`, borrar la línea `MP_CURRENCY=ARS`. En `.env.local`, borrarla sin imprimir el archivo:

```bash
sed -i '/^MP_CURRENCY=/d' .env.local
```

- [ ] **Step 3: Reemplazar `src/lib/data/turnos.ts` completo**

`getDisponibilidad` recibe la zona del tenant como segundo parámetro:

```ts
import { datosDelTenant } from "@/lib/tenant/datos";
import { calcularSlots, hhmmToMin, minToHhmm } from "@/lib/turnos/disponibilidad";
import {
  isoFechaHora,
  diaSemana,
  minutosDelDia,
  fechaHoy,
  sumarDias,
} from "@/lib/turnos/fechas";
import type { ConfiguracionNegocio, Servicio, Turno } from "./types";

export type SlotDisponible = { hora: string; iso: string };

/**
 * Calcula los horarios disponibles para uno o más servicios en una fecha
 * (YYYY-MM-DD, en la zona horaria del negocio), contra el horario de atención, la
 * duración combinada de los servicios elegidos (se reservan consecutivos, sin hueco
 * entre ellos), el margen de preparación y los turnos ya ocupados (confirmados o
 * pendientes no vencidos).
 */
export async function getDisponibilidad(
  tenantId: string,
  zonaHoraria: string,
  servicioIds: string[],
  fecha: string,
): Promise<SlotDisponible[]> {
  if (servicioIds.length === 0) return [];
  const db = datosDelTenant(tenantId);

  const { data: filasServicios } = await db
    .select("servicios", "duracion_minutos, activo")
    .in("id", servicioIds);
  const servicios = filasServicios as unknown as
    | Pick<Servicio, "duracion_minutos" | "activo">[]
    | null;
  if (
    !servicios ||
    servicios.length !== servicioIds.length ||
    servicios.some((s) => !s.activo)
  ) {
    return [];
  }
  const duracionTotal = servicios.reduce((sum, s) => sum + s.duracion_minutos, 0);

  const { data: filaConfig } = await db
    .select("configuracion_negocio", "horario_atencion, minutos_preparacion_entre_turnos")
    .single();
  const config = filaConfig as unknown as Pick<
    ConfiguracionNegocio,
    "horario_atencion" | "minutos_preparacion_entre_turnos"
  > | null;
  if (!config) return [];

  const horario = (
    config.horario_atencion as Record<string, [string, string]>
  )[diaSemana(fecha)];
  if (!horario) return []; // día cerrado (ej. domingo)

  const { data: filasTurnos } = await db
    .select("turnos", "fecha_hora, duracion_minutos, estado, bloqueado_hasta")
    .gte("fecha_hora", isoFechaHora(fecha, 0, zonaHoraria))
    .lt("fecha_hora", isoFechaHora(sumarDias(fecha, 1), 0, zonaHoraria));
  const turnos = filasTurnos as unknown as
    | Pick<Turno, "fecha_hora" | "duracion_minutos" | "estado" | "bloqueado_hasta">[]
    | null;

  const ahora = new Date().toISOString();
  const ocupados = (turnos ?? [])
    .filter(
      (t) =>
        t.estado === "confirmado" ||
        (t.estado === "pendiente_pago" &&
          !!t.bloqueado_hasta &&
          t.bloqueado_hasta > ahora),
    )
    .map((t) => {
      const inicio = minutosDelDia(t.fecha_hora, zonaHoraria);
      return { inicio, fin: inicio + t.duracion_minutos };
    });

  const desdeMin = fecha === fechaHoy(zonaHoraria) ? minutosDelDia(ahora, zonaHoraria) : 0;

  const slots = calcularSlots({
    aperturaMin: hhmmToMin(horario[0]),
    cierreMin: hhmmToMin(horario[1]),
    duracionMin: duracionTotal,
    margenMin: config.minutos_preparacion_entre_turnos,
    ocupados,
    stepMin: 30,
    desdeMin,
  });

  return slots.map((m) => ({ hora: minToHhmm(m), iso: isoFechaHora(fecha, m, zonaHoraria) }));
}

export type TurnoConServicio = {
  id: string;
  servicio_id: string;
  cliente_nombre: string;
  fecha_hora: string;
  duracion_minutos: number;
  estado: string;
  token_gestion: string;
  servicios: { nombre: string };
};

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

export type TurnoAdmin = {
  id: string;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string | null;
  fecha_hora: string;
  duracion_minutos: number;
  estado: string;
  monto_sena: number | null;
  google_calendar_event_id: string | null;
  servicios: { nombre: string };
};

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

- [ ] **Step 4: `src/app/sitio/[tenant]/turnos/disponibilidad-action.ts`**

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
  return getDisponibilidad(tenant.id, tenant.zonaHoraria, servicioIds, fecha);
}
```

- [ ] **Step 5: `src/app/sitio/[tenant]/turnos/actions.ts`**

```ts
"use server";

import { getDisponibilidad } from "@/lib/data/turnos";
import { calcularMontoSena, puedeReservar } from "@/lib/turnos/reglas";
import { getClientIp } from "@/lib/turnos/ip";
import { normalizarWhatsApp } from "@/lib/turnos/whatsapp";
import { EJEMPLO_WHATSAPP } from "@/lib/turnos/ejemplo-whatsapp";
import { isMpConfigurado, crearPreferencia } from "@/lib/mercadopago/client";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { datosDelTenant } from "@/lib/tenant/datos";
import { urlDelTenant } from "@/lib/tenant/urls";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { IDIOMA_POR_DEFECTO, traductor } from "@/lib/i18n/textos";
import type { ConfiguracionNegocio, Servicio } from "@/lib/data/types";

export type ReservarTurnoResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

const MAXIMO_RESERVAS_POR_HORA = 2;

export async function reservarTurno(formData: FormData): Promise<ReservarTurnoResult> {
  const tenant = await tenantDelRequest();
  const t = traductor(tenant?.idioma ?? IDIOMA_POR_DEFECTO);
  if (!tenant?.modulos.turnos) {
    return {
      ok: false,
      error: t({
        es: "La reserva online no está disponible.",
        pt: "O agendamento online não está disponível.",
      }),
    };
  }

  const servicioIds = formData.getAll("servicioIds").map(String);
  const fecha = String(formData.get("fecha"));
  const iso = String(formData.get("iso"));
  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  const clienteEmail = String(formData.get("clienteEmail") || "").trim();
  const clienteTelefono = String(formData.get("clienteTelefono") || "").trim();

  if (servicioIds.length === 0 || !iso || !clienteNombre || !clienteEmail || !clienteTelefono) {
    return {
      ok: false,
      error: t({
        es: "Completá todos los campos obligatorios.",
        pt: "Preencha todos os campos obrigatórios.",
      }),
    };
  }

  const clienteWhatsApp = normalizarWhatsApp(clienteTelefono, tenant.pais);
  if (!clienteWhatsApp) {
    const ejemplo = EJEMPLO_WHATSAPP[tenant.pais];
    return {
      ok: false,
      error: t({
        es: `El número de WhatsApp no es válido. Ingresalo con código de área, ej: ${ejemplo}.`,
        pt: `O número de WhatsApp não é válido. Informe com DDD, ex: ${ejemplo}.`,
      }),
    };
  }

  if (!isMpConfigurado() || !usaCredencialesGlobales(tenant.slug)) {
    return {
      ok: false,
      error: t({
        es: "La reserva online con seña todavía no está habilitada. Escribinos por WhatsApp para coordinar tu turno.",
        pt: "O agendamento online com sinal ainda não está habilitado. Fale com a gente pelo WhatsApp para combinar seu horário.",
      }),
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
      error: t({
        es: "Por seguridad, alcanzaste el máximo de reservas por hora. Esperá una hora para volver a intentar.",
        pt: "Por segurança, você atingiu o limite de agendamentos por hora. Aguarde uma hora para tentar novamente.",
      }),
    };
  }

  // Re-verificar que el slot combinado sigue libre (evita choques por condición de carrera).
  const disponibles = await getDisponibilidad(tenant.id, tenant.zonaHoraria, servicioIds, fecha);
  if (!disponibles.some((s) => s.iso === iso)) {
    return {
      ok: false,
      error: t({
        es: "Ese horario ya no está disponible. Elegí otro.",
        pt: "Esse horário não está mais disponível. Escolha outro.",
      }),
    };
  }

  const { data: filasServicios } = await db
    .select("servicios", "id, nombre, duracion_minutos, precio, activo")
    .in("id", servicioIds);
  const serviciosSinOrden = filasServicios as unknown as
    | Pick<Servicio, "id" | "nombre" | "duracion_minutos" | "precio" | "activo">[]
    | null;
  const servicios = servicioIds
    .map((id) => serviciosSinOrden?.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  if (servicios.length !== servicioIds.length || servicios.some((s) => !s.activo)) {
    return {
      ok: false,
      error: t({
        es: "Alguno de los servicios elegidos no está disponible.",
        pt: "Algum dos serviços escolhidos não está disponível.",
      }),
    };
  }

  const { data: filaConfig } = await db.select("configuracion_negocio", "sena_porcentaje").single();
  const config = filaConfig as unknown as Pick<ConfiguracionNegocio, "sena_porcentaje"> | null;
  if (!config) {
    return {
      ok: false,
      error: t({
        es: "No se pudo leer la configuración del negocio.",
        pt: "Não foi possível ler a configuração do negócio.",
      }),
    };
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
      return {
        ok: false,
        error: t({
          es: "No se pudo crear el turno. Probá de nuevo.",
          pt: "Não foi possível criar o agendamento. Tente novamente.",
        }),
      };
    }

    turnoIds.push(turno.id);
    montoSenaTotal += montoSena;
    inicioActual = new Date(inicioActual.getTime() + servicio.duracion_minutos * 60000);
  }

  await db.insert("intentos_reserva", { ip });

  try {
    const titulo = `${t({ es: "Seña", pt: "Sinal" })} — ${servicios.map((s) => s.nombre).join(" + ")}`;
    const pref = await crearPreferencia({
      titulo,
      monto: montoSenaTotal,
      moneda: tenant.moneda,
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
      error: t({
        es: "No se pudo iniciar el pago. Probá de nuevo o escribinos por WhatsApp.",
        pt: "Não foi possível iniciar o pagamento. Tente novamente ou fale com a gente pelo WhatsApp.",
      }),
    };
  }
}
```

- [ ] **Step 6: `src/app/sitio/[tenant]/turnos/page.tsx`**

```tsx
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getServiciosPublicos } from "@/lib/data/servicios";
import { getConfiguracion } from "@/lib/data/configuracion";
import { ReservaForm } from "@/components/turnos/ReservaForm";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { traductor } from "@/lib/i18n/textos";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Reservar turno", pt: "Agendar horário" });
}

export default async function TurnosPage({ params }: Props) {
  // Servicios y disponibilidad cambian: se renderiza en cada request, no en el build.
  await connection();
  const tenant = await tenantDeLaPagina(params);
  if (!tenant.modulos.turnos) notFound();
  const t = traductor(tenant.idioma);

  const servicios = await getServiciosPublicos(tenant.id);
  const config = await getConfiguracion(tenant.id);
  const senaPorcentaje = config?.sena_porcentaje ?? 50;
  const whatsapp = whatsappLink(tenant.marca.whatsapp, t(MENSAJES_WHATSAPP.turno));

  return (
    <main className="min-h-screen bg-fondo pt-24 pb-20">
      <Container className="max-w-2xl">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
          {t({ es: "Turnos", pt: "Agendamento" })}
        </p>
        <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
          {t({ es: "Reservá tu turno", pt: "Agende seu horário" })}
        </h1>

        {servicios.length === 0 ? (
          <p className="mt-6 font-sans text-texto-suave">
            {t({
              es: "Todavía no hay servicios cargados para reservar online.",
              pt: "Ainda não há serviços disponíveis para agendar online.",
            })}
            {whatsapp && (
              <>
                {" "}
                {t({ es: "Escribinos por", pt: "Fale com a gente pelo" })}{" "}
                <a href={whatsapp} className="text-primario underline" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>{" "}
                {t({ es: "para coordinar tu turno.", pt: "para combinar seu horário." })}
              </>
            )}
          </p>
        ) : (
          <div className="mt-8">
            <ReservaForm
              servicios={servicios}
              senaPorcentaje={senaPorcentaje}
              moneda={tenant.moneda}
              pais={tenant.pais}
              zonaHoraria={tenant.zonaHoraria}
            />
          </div>
        )}
      </Container>
    </main>
  );
}
```

- [ ] **Step 7: `src/components/turnos/SlotPicker.tsx`**

Los días salen de la zona del negocio, no del reloj del navegador:

```tsx
"use client";

import { useEffect, useState } from "react";
import { consultarDisponibilidad } from "@/app/sitio/[tenant]/turnos/disponibilidad-action";
import { fechaHoy, sumarDias } from "@/lib/turnos/fechas";
import { LOCALES, type Idioma } from "@/lib/i18n/textos";
import { T, useIdioma } from "@/lib/i18n/cliente";
import type { SlotDisponible } from "@/lib/data/turnos";

/** Próximos días desde hoy en la zona del negocio, con su etiqueta en el idioma del sitio. */
function proximosDias(cantidad: number, zona: string, idioma: Idioma) {
  const hoy = fechaHoy(zona);
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = sumarDias(hoy, i);
    // Mediodía UTC de esa fecha, formateado en UTC: la etiqueta no depende del navegador.
    const etiqueta = new Date(`${fecha}T12:00:00Z`).toLocaleDateString(LOCALES[idioma], {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    return { fecha, etiqueta };
  });
}

export function SlotPicker({
  servicioIds,
  zonaHoraria,
  onSelect,
}: {
  servicioIds: string[];
  zonaHoraria: string;
  onSelect: (fecha: string, iso: string) => void;
}) {
  const idioma = useIdioma();
  const dias = proximosDias(14, zonaHoraria, idioma);
  const [fecha, setFecha] = useState(dias[0].fecha);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dias.map((d) => (
          <button
            key={d.fecha}
            type="button"
            onClick={() => setFecha(d.fecha)}
            className={`shrink-0 rounded-lg px-3 py-2 font-sans text-sm capitalize transition ${
              d.fecha === fecha
                ? "bg-primario text-fondo"
                : "bg-white/60 text-texto-suave hover:bg-fondo-oscuro"
            }`}
          >
            {d.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <SlotsDelDia
          key={`${servicioIds.join(",")}-${fecha}`}
          servicioIds={servicioIds}
          fecha={fecha}
          onSelect={(iso) => onSelect(fecha, iso)}
        />
      </div>
    </div>
  );
}

function SlotsDelDia({
  servicioIds,
  fecha,
  onSelect,
}: {
  servicioIds: string[];
  fecha: string;
  onSelect: (iso: string) => void;
}) {
  const [slots, setSlots] = useState<SlotDisponible[] | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    consultarDisponibilidad(servicioIds, fecha).then((resultado) => {
      if (activo) setSlots(resultado);
    });
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioIds.join(","), fecha]);

  if (slots === null) {
    return (
      <p className="font-sans text-sm text-texto-suave">
        <T es="Buscando horarios…" pt="Buscando horários…" />
      </p>
    );
  }
  if (slots.length === 0) {
    return (
      <p className="font-sans text-sm text-texto-suave">
        <T
          es="No hay horarios disponibles este día. Probá otra fecha."
          pt="Não há horários disponíveis neste dia. Tente outra data."
        />
      </p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((s) => (
        <button
          key={s.iso}
          type="button"
          onClick={() => {
            setSeleccionado(s.iso);
            onSelect(s.iso);
          }}
          className={`rounded-lg border px-3 py-2 font-sans text-sm transition ${
            seleccionado === s.iso
              ? "border-primario bg-primario text-fondo"
              : "border-primario/20 bg-white/60 text-texto hover:border-primario/40"
          }`}
        >
          {s.hora}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: `src/components/turnos/ReservaForm.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { SlotPicker } from "./SlotPicker";
import { reservarTurno } from "@/app/sitio/[tenant]/turnos/actions";
import { formatPrecio } from "@/lib/format";
import { calcularMontoSena } from "@/lib/turnos/reglas";
import { EJEMPLO_WHATSAPP } from "@/lib/turnos/ejemplo-whatsapp";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { T, useIdioma, useT } from "@/lib/i18n/cliente";
import type { Servicio } from "@/lib/data/types";
import type { Moneda, Pais } from "@/lib/tenant/tipos";

export function ReservaForm({
  servicios,
  senaPorcentaje,
  moneda,
  pais,
  zonaHoraria,
}: {
  servicios: Servicio[];
  senaPorcentaje: number;
  moneda: Moneda;
  pais: Pais;
  zonaHoraria: string;
}) {
  const idioma = useIdioma();
  const t = useT();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    servicios[0] ? [servicios[0].id] : [],
  );
  const [fecha, setFecha] = useState("");
  const [iso, setIso] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const precio = (monto: number) => formatPrecio(monto, moneda, idioma);
  const seleccionados = servicios.filter((s) => selectedIds.includes(s.id));
  const precioTotal = seleccionados.reduce((sum, s) => sum + s.precio, 0);
  const montoSena = calcularMontoSena(precioTotal, senaPorcentaje);
  const sena = montoSena > 0 ? precio(montoSena) : "";

  function toggleServicio(id: string) {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return servicios.filter((s) => set.has(s.id)).map((s) => s.id);
    });
    setIso("");
  }

  function onSubmit(formData: FormData) {
    setError(null);
    selectedIds.forEach((id) => formData.append("servicioIds", id));
    formData.set("fecha", fecha);
    formData.set("iso", iso);

    startTransition(async () => {
      const result = await reservarTurno(formData);
      if (result.ok) {
        window.location.href = result.initPoint;
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-6">
      <div>
        <label className="font-sans text-sm font-medium text-texto">
          <T es="Elegí uno o más servicios" pt="Escolha um ou mais serviços" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {servicios.map((s) => {
            const activo = selectedIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleServicio(s.id)}
                className={`flex flex-col rounded-xl border p-3 text-left transition ${
                  activo
                    ? "border-primario bg-primario/10"
                    : "border-primario/20 bg-white/60 hover:border-primario/40"
                }`}
              >
                <span className="font-sans text-sm font-medium text-texto">{s.nombre}</span>
                <span className="mt-1 font-sans text-xs text-texto-suave">
                  {s.precio > 0 ? precio(s.precio) : t({ es: "Consultar", pt: "Sob consulta" })}
                </span>
              </button>
            );
          })}
        </div>

        {selectedIds.length > 1 && (
          <p className="mt-3 rounded-lg bg-secundario/10 px-3 py-2 font-sans text-sm text-secundario">
            <T
              es="Elegiste más de un servicio: los horarios que se muestran abajo son los que tienen ambos turnos disponibles de forma consecutiva. Si preferís horarios separados, hacé una reserva por cada servicio."
              pt="Você escolheu mais de um serviço: os horários abaixo são os que têm todos os atendimentos disponíveis em sequência. Se preferir horários separados, faça um agendamento para cada serviço."
            />
          </p>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div>
          <label className="font-sans text-sm font-medium text-texto">
            <T es="Elegí día y horario" pt="Escolha dia e horário" />
          </label>
          <div className="mt-2">
            <SlotPicker
              servicioIds={selectedIds}
              zonaHoraria={zonaHoraria}
              onSelect={(f, i) => {
                setFecha(f);
                setIso(i);
              }}
            />
          </div>
        </div>
      )}

      {iso && (
        <div className="flex flex-col gap-4 rounded-2xl border border-primario/15 bg-white/60 p-5">
          <p className="font-sans text-sm text-texto-suave">
            {t({
              es: `Reservás con una seña de ${sena} (se descuenta del precio total del servicio).`,
              pt: `Você agenda com um sinal de ${sena} (descontado do valor total do serviço).`,
            })}
          </p>
          <label className="font-sans text-sm text-texto-suave">
            <T es="Nombre y apellido" pt="Nome e sobrenome" />
            <input
              name="clienteNombre"
              required
              className="mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto"
            />
          </label>
          <label className="font-sans text-sm text-texto-suave">
            <T es="Email" pt="E-mail" />
            <input
              name="clienteEmail"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto"
            />
          </label>
          <label className="font-sans text-sm text-texto-suave">
            WhatsApp
            <input
              name="clienteTelefono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder={`${t({ es: "Ej:", pt: "Ex:" })} ${EJEMPLO_WHATSAPP[pais]}`}
              className="mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60"
          >
            <T es="Confirmar reserva" pt="Confirmar agendamento" />
          </button>
        </div>
      )}
      <LoadingOverlay
        show={pending}
        label={t({ es: "Redirigiendo a Mercado Pago…", pt: "Redirecionando para o Mercado Pago…" })}
      />
    </form>
  );
}
```

- [ ] **Step 9: `src/app/sitio/[tenant]/turnos/gracias/page.tsx`**

```tsx
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { traductor } from "@/lib/i18n/textos";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Gracias", pt: "Obrigado" });
}

export default async function GraciasPage({ params }: Props) {
  const t = traductor((await tenantDeLaPagina(params)).idioma);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-fondo px-6 pt-24 pb-16 text-center">
      <Container className="flex flex-col items-center gap-4">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
          {t({ es: "¡Listo!", pt: "Pronto!" })}
        </p>
        <h1 className="font-serif text-4xl text-texto sm:text-5xl">
          {t({ es: "Estamos procesando tu pago", pt: "Estamos processando seu pagamento" })}
        </h1>
        <p className="max-w-md font-sans text-texto-suave">
          {t({
            es: "En cuanto se confirme te va a llegar un email con los datos de tu turno. Si no llega en unos minutos, escribinos por WhatsApp.",
            pt: "Assim que for confirmado, você vai receber um e-mail com os dados do seu agendamento. Se não chegar em alguns minutos, fale com a gente pelo WhatsApp.",
          })}
        </p>
        <Button href="/">{t({ es: "Volver al inicio", pt: "Voltar ao início" })}</Button>
      </Container>
    </main>
  );
}
```

- [ ] **Step 10: `src/app/sitio/[tenant]/turnos/gestion/[token]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { getTurnoPorToken } from "@/lib/data/turnos";
import { getConfiguracion } from "@/lib/data/configuracion";
import { puedeCancelar } from "@/lib/turnos/reglas";
import { GestionPanel } from "@/components/turnos/GestionPanel";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { LOCALES, traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

type Props = { params: Promise<{ tenant: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Gestionar turno", pt: "Gerenciar agendamento" });
}

export default async function GestionTurnoPage({ params }: Props) {
  const tenant = await tenantDeLaPagina(params);
  const { token } = await params;
  const turno = await getTurnoPorToken(tenant.id, token);
  const t = traductor(tenant.idioma);

  return (
    <main className="min-h-screen bg-fondo px-6 pt-24 pb-20">
      <Container className="max-w-lg">
        {!turno ? (
          <p className="font-sans text-texto-suave">
            {t({ es: "No encontramos ese turno.", pt: "Não encontramos esse agendamento." })}
          </p>
        ) : turno.estado === "cancelado" ? (
          <p className="font-sans text-texto-suave">
            {t({ es: "Este turno ya fue cancelado.", pt: "Este agendamento já foi cancelado." })}
          </p>
        ) : turno.estado !== "confirmado" ? (
          <p className="font-sans text-texto-suave">
            {t({
              es: "Este turno todavía no está confirmado. Si ya pagaste la seña, esperá la confirmación por email.",
              pt: "Este agendamento ainda não está confirmado. Se você já pagou o sinal, aguarde a confirmação por e-mail.",
            })}
          </p>
        ) : (
          <TurnoDetalle tenant={tenant} turno={turno} />
        )}
        <Button href="/" className="mt-8">
          {t({ es: "Volver al inicio", pt: "Voltar ao início" })}
        </Button>
      </Container>
    </main>
  );
}

async function TurnoDetalle({
  tenant,
  turno,
}: {
  tenant: Tenant;
  turno: NonNullable<Awaited<ReturnType<typeof getTurnoPorToken>>>;
}) {
  const config = await getConfiguracion(tenant.id);
  const permitido = puedeCancelar({
    fechaHoraIso: turno.fecha_hora,
    horasMinimas: config?.horas_minimas_cancelacion ?? 24,
    ahoraIso: new Date().toISOString(),
  });
  const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString(LOCALES[tenant.idioma], {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: tenant.zonaHoraria,
  });
  const t = traductor(tenant.idioma);

  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
        {t({ es: "Tu turno", pt: "Seu agendamento" })}
      </p>
      <h1 className="mt-3 font-serif text-3xl text-texto sm:text-4xl">
        {turno.servicios.nombre}
      </h1>
      <p className="mt-2 font-sans text-texto-suave">{fechaHoraTexto}</p>

      <div className="mt-6">
        <GestionPanel
          token={turno.token_gestion}
          servicioId={turno.servicio_id}
          permitido={permitido}
          zonaHoraria={tenant.zonaHoraria}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 11: `src/app/sitio/[tenant]/turnos/gestion/[token]/actions.ts`**

El tenant se resuelve primero, para responder en su idioma aunque el turno no exista:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getDisponibilidad } from "@/lib/data/turnos";
import { puedeCancelar } from "@/lib/turnos/reglas";
import { isGoogleConfigurado, crearEvento, borrarEvento } from "@/lib/google-calendar/client";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { datosDelTenant } from "@/lib/tenant/datos";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { IDIOMA_POR_DEFECTO, traductor } from "@/lib/i18n/textos";
import type { ConfiguracionNegocio, Turno } from "@/lib/data/types";
import type { Tenant } from "@/lib/tenant/tipos";

async function getTurnoGestionable(tenant: Tenant, token: string) {
  const db = datosDelTenant(tenant.id);

  const { data: fila } = await db
    .select("turnos", "*, servicios(nombre)")
    .eq("token_gestion", token)
    .maybeSingle();
  const turno = fila as unknown as (Turno & { servicios: { nombre: string } }) | null;
  if (!turno || turno.estado !== "confirmado") return null;

  const { data: filaConfig } = await db
    .select("configuracion_negocio", "horas_minimas_cancelacion")
    .maybeSingle();
  const config = filaConfig as unknown as Pick<
    ConfiguracionNegocio,
    "horas_minimas_cancelacion"
  > | null;

  const permitido = puedeCancelar({
    fechaHoraIso: turno.fecha_hora,
    horasMinimas: config?.horas_minimas_cancelacion ?? 24,
    ahoraIso: new Date().toISOString(),
  });

  return { db, turno, permitido };
}

/** Tenant del host y la traducción a su idioma (español si no hay tenant). */
async function contexto() {
  const tenant = await tenantDelRequest();
  return { tenant, t: traductor(tenant?.idioma ?? IDIOMA_POR_DEFECTO) };
}

type AccionResult = { ok: true } | { ok: false; error: string };

export async function cancelarTurno(token: string): Promise<AccionResult> {
  const { tenant, t } = await contexto();
  const ctx = tenant ? await getTurnoGestionable(tenant, token) : null;
  if (!tenant || !ctx || !ctx.permitido) {
    return {
      ok: false,
      error: t({
        es: "Fuera del plazo permitido para cancelar.",
        pt: "Fora do prazo permitido para cancelar.",
      }),
    };
  }

  if (
    ctx.turno.google_calendar_event_id &&
    isGoogleConfigurado() &&
    usaCredencialesGlobales(tenant.slug)
  ) {
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
  const { tenant, t } = await contexto();
  const ctx = tenant ? await getTurnoGestionable(tenant, token) : null;
  if (!tenant || !ctx || !ctx.permitido) {
    return {
      ok: false,
      error: t({
        es: "Fuera del plazo permitido para reprogramar.",
        pt: "Fora do prazo permitido para reagendar.",
      }),
    };
  }

  const disponibles = await getDisponibilidad(
    tenant.id,
    tenant.zonaHoraria,
    [ctx.turno.servicio_id],
    nuevaFecha,
  );
  if (!disponibles.some((s) => s.iso === nuevoIso)) {
    return {
      ok: false,
      error: t({
        es: "Ese horario ya no está disponible.",
        pt: "Esse horário não está mais disponível.",
      }),
    };
  }

  let nuevoEventId: string | null = null;
  if (isGoogleConfigurado() && usaCredencialesGlobales(tenant.slug)) {
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

(La descripción del evento de Calendar es para la agenda de la dueña: Calendar por tenant llega en la etapa D.)

- [ ] **Step 12: `src/components/turnos/GestionPanel.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { SlotPicker } from "./SlotPicker";
import { cancelarTurno, reprogramarTurno } from "@/app/sitio/[tenant]/turnos/gestion/[token]/actions";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { T, useT } from "@/lib/i18n/cliente";

export function GestionPanel({
  token,
  servicioId,
  permitido,
  zonaHoraria,
}: {
  token: string;
  servicioId: string;
  permitido: boolean;
  zonaHoraria: string;
}) {
  const t = useT();
  const [modo, setModo] = useState<"inicial" | "reprogramando" | "cancelado" | "reprogramado">(
    "inicial",
  );
  const [error, setError] = useState<string | null>(null);
  const [nuevoIso, setNuevoIso] = useState<{ fecha: string; iso: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!permitido) {
    return (
      <p className="rounded-lg bg-primario/10 px-4 py-3 font-sans text-sm text-primario-oscuro">
        <T
          es="Está fuera del plazo permitido para cancelar o reprogramar online. Por favor contactanos directamente."
          pt="Está fora do prazo permitido para cancelar ou reagendar online. Por favor, entre em contato diretamente."
        />
      </p>
    );
  }

  if (modo === "cancelado") {
    return (
      <p className="rounded-lg bg-secundario/10 px-4 py-3 font-sans text-sm text-secundario-oscuro">
        <T
          es="Tu turno fue cancelado. La seña no es reembolsable."
          pt="Seu agendamento foi cancelado. O sinal não é reembolsável."
        />
      </p>
    );
  }

  if (modo === "reprogramado") {
    return (
      <p className="rounded-lg bg-secundario/10 px-4 py-3 font-sans text-sm text-secundario-oscuro">
        <T es="¡Listo! Tu turno fue reprogramado." pt="Pronto! Seu agendamento foi reagendado." />
      </p>
    );
  }

  function onCancelar() {
    setError(null);
    startTransition(async () => {
      const res = await cancelarTurno(token);
      if (res.ok) setModo("cancelado");
      else setError(res.error);
    });
  }

  function onConfirmarReprogramacion() {
    if (!nuevoIso) return;
    setError(null);
    startTransition(async () => {
      const res = await reprogramarTurno(token, nuevoIso.fecha, nuevoIso.iso);
      if (res.ok) setModo("reprogramado");
      else setError(res.error);
    });
  }

  if (modo === "reprogramando") {
    return (
      <div className="flex flex-col gap-4">
        <SlotPicker
          servicioIds={[servicioId]}
          zonaHoraria={zonaHoraria}
          onSelect={(fecha, iso) => setNuevoIso({ fecha, iso })}
        />
        {error && (
          <p className="rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={!nuevoIso || pending}
            onClick={onConfirmarReprogramacion}
            className="rounded-full bg-primario px-6 py-2 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60"
          >
            <T es="Confirmar nuevo horario" pt="Confirmar novo horário" />
          </button>
          <button
            type="button"
            onClick={() => setModo("inicial")}
            className="font-sans text-sm text-texto-suave hover:text-texto"
          >
            <T es="Volver" pt="Voltar" />
          </button>
        </div>
        <LoadingOverlay
          show={pending}
          label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setModo("reprogramando")}
          className="rounded-full border border-primario px-6 py-2 font-sans text-sm font-medium text-primario transition hover:bg-primario hover:text-fondo"
        >
          <T es="Reprogramar" pt="Reagendar" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancelar}
          className="rounded-full px-6 py-2 font-sans text-sm font-medium text-primario-oscuro underline-offset-4 hover:underline disabled:opacity-60"
        >
          <T es="Cancelar turno" pt="Cancelar agendamento" />
        </button>
      </div>
      <LoadingOverlay show={pending} label={t({ es: "Cancelando…", pt: "Cancelando…" })} />
    </div>
  );
}
```

- [ ] **Step 13: Verificar**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
grep -rn "MP_CURRENCY" --exclude-dir=node_modules --exclude-dir=.next --exclude=.env.local .
```

Expected: `tsc` y `eslint` sin errores, y todos los tests en PASS. El último `grep` no muestra nada.

- [ ] **Step 14: Commit**

```bash
git add src/lib/data/turnos.ts src/lib/tenant/metadata.ts src/lib/mercadopago/client.ts "src/app/sitio/[tenant]/turnos" "src/app/sitio/[tenant]/cursos/[id]/actions.ts" src/components/turnos .env.example
git commit -F - <<'EOF'
feat(turnos): reserva y gestión en el idioma, zona, moneda y país del tenant

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Cursos en el idioma y la moneda del tenant

**Files (reemplazo completo):**
- `src/app/sitio/[tenant]/cursos/page.tsx`, `cursos/[id]/page.tsx`, `cursos/[id]/actions.ts`, `cursos/gracias/page.tsx` y `cursos/acceso/[token]/page.tsx`
- `src/components/cursos/CompraForm.tsx` y `src/components/cursos/VistaPreviaYoutube.tsx`

- [ ] **Step 1: `src/app/sitio/[tenant]/cursos/page.tsx`**

El texto "Cursos de estética" sigue fijo (ahora traducido), igual que hoy. Que salga del rubro del tenant queda anotado para la etapa C, junto con el contenido de los módulos:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getCursosPublicos } from "@/lib/data/cursos";
import { precioEfectivo } from "@/lib/cursos/reglas";
import { formatPrecio } from "@/lib/format";
import { youtubeId, youtubeMiniatura } from "@/lib/video/youtube";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { iniciales } from "@/lib/tenant/iniciales";
import { traductor } from "@/lib/i18n/textos";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Cursos", pt: "Cursos" });
}

export default async function CursosPage({ params }: Props) {
  // El catálogo cambia desde el admin: se renderiza en cada request, no en el build.
  await connection();
  const tenant = await tenantDeLaPagina(params);
  if (!tenant.modulos.cursos) notFound();
  const t = traductor(tenant.idioma);
  const formatear = (monto: number) => formatPrecio(monto, tenant.moneda, tenant.idioma);
  const cursos = await getCursosPublicos(tenant.id);
  const ahora = new Date().toISOString();

  return (
    <main className="min-h-screen bg-fondo pt-24 pb-20">
      <Container>
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
          {t({ es: "Cursos", pt: "Cursos" })}
        </p>
        <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
          {t({ es: "Cursos de estética", pt: "Cursos de estética" })}
        </h1>
        <p className="mt-4 max-w-xl font-sans text-texto-suave">
          {t({
            es: "Contenido en video para profesionales del rubro y para quienes quieren aprender a cuidarse en casa.",
            pt: "Conteúdo em vídeo para profissionais da área e para quem quer aprender a se cuidar em casa.",
          })}
        </p>

        {cursos.length === 0 ? (
          <p className="mt-8 font-sans text-texto-suave">
            {t({
              es: "Muy pronto vas a poder comprar y ver mis cursos online desde acá.",
              pt: "Em breve você vai poder comprar e assistir aos meus cursos online por aqui.",
            })}
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((c) => {
              const precio = precioEfectivo({
                precio: c.precio,
                precioOferta: c.precio_oferta,
                ofertaActiva: c.oferta_activa,
                ofertaDesde: c.oferta_desde,
                ofertaHasta: c.oferta_hasta,
                ahoraIso: ahora,
              });
              const enOferta = precio !== c.precio;
              const videoId = c.preview_youtube_url ? youtubeId(c.preview_youtube_url) : null;
              return (
                <Link
                  key={c.id}
                  href={`/cursos/${c.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-primario/15 bg-white/60 transition hover:border-primario/40 hover:shadow-sm"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primario-suave to-secundario/30">
                    {videoId ? (
                      <>
                        <Image
                          src={youtubeMiniatura(videoId)}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-texto/10">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-fondo/90 text-primario-oscuro shadow-md">
                            <svg aria-hidden viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-current">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </span>
                        <span className="absolute bottom-3 left-3 rounded-full bg-texto/70 px-3 py-1 font-sans text-xs text-fondo">
                          {t({ es: "Vista previa", pt: "Prévia" })}
                        </span>
                      </>
                    ) : (
                      <span
                        aria-hidden
                        className="absolute inset-0 flex items-center justify-center font-serif text-6xl text-white/40"
                      >
                        {iniciales(tenant.nombre)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="font-sans text-xs uppercase tracking-wider text-secundario">
                      {c.categoria === "profesional"
                        ? t({ es: "Profesional", pt: "Profissional" })
                        : t({ es: "Público general", pt: "Público geral" })}
                    </p>
                    <h2 className="mt-2 font-serif text-2xl text-texto">{c.titulo}</h2>
                    <p className="mt-3 font-sans text-lg text-primario-oscuro">
                      {enOferta && (
                        <span className="mr-2 text-sm text-texto-suave line-through">
                          {formatear(c.precio)}
                        </span>
                      )}
                      {formatear(precio)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </main>
  );
}
```

- [ ] **Step 2: `src/app/sitio/[tenant]/cursos/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getCursoPublico } from "@/lib/data/cursos";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { precioEfectivo } from "@/lib/cursos/reglas";
import { formatPrecio } from "@/lib/format";
import { CompraForm } from "@/components/cursos/CompraForm";
import { youtubeId } from "@/lib/video/youtube";
import { VistaPreviaYoutube } from "@/components/cursos/VistaPreviaYoutube";
import { traductor } from "@/lib/i18n/textos";

const SEGUNDOS_PREVIEW = 30;

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
  const t = traductor(tenant.idioma);
  const formatear = (monto: number) => formatPrecio(monto, tenant.moneda, tenant.idioma);

  const precio = precioEfectivo({
    precio: curso.precio,
    precioOferta: curso.precio_oferta,
    ofertaActiva: curso.oferta_activa,
    ofertaDesde: curso.oferta_desde,
    ofertaHasta: curso.oferta_hasta,
    ahoraIso: new Date().toISOString(),
  });
  const enOferta = precio !== curso.precio;
  const videoId = curso.preview_youtube_url ? youtubeId(curso.preview_youtube_url) : null;

  return (
    <main className="min-h-screen bg-fondo px-6 pt-24 pb-20">
      <Container className="max-w-2xl">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
          {curso.categoria === "profesional"
            ? t({ es: "Profesional", pt: "Profissional" })
            : t({ es: "Público general", pt: "Público geral" })}
        </p>
        <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
          {curso.titulo}
        </h1>
        {curso.descripcion && (
          <p className="mt-4 font-sans text-texto-suave">{curso.descripcion}</p>
        )}

        {videoId && (
          <figure className="mt-8">
            <VistaPreviaYoutube
              videoId={videoId}
              titulo={curso.titulo}
              segundos={SEGUNDOS_PREVIEW}
            />
            <figcaption className="mt-2 font-sans text-sm text-texto-suave">
              {t({
                es: `Vista previa de ${SEGUNDOS_PREVIEW} segundos. El curso completo se habilita al comprarlo.`,
                pt: `Prévia de ${SEGUNDOS_PREVIEW} segundos. O curso completo é liberado após a compra.`,
              })}
            </figcaption>
          </figure>
        )}

        <p className="mt-6 font-sans text-2xl text-primario-oscuro">
          {enOferta && (
            <span className="mr-2 text-base text-texto-suave line-through">
              {formatear(curso.precio)}
            </span>
          )}
          {formatear(precio)}
        </p>

        <p className="mt-2 font-sans text-sm text-texto-suave">
          {t({
            es: `Acceso por ${curso.dias_acceso} días desde la compra.`,
            pt: `Acesso por ${curso.dias_acceso} dias a partir da compra.`,
          })}
        </p>

        <div id="comprar" className="scroll-mt-28">
          <CompraForm cursoId={curso.id} />
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 3: `src/app/sitio/[tenant]/cursos/[id]/actions.ts`**

```ts
"use server";

import { getCursoPublico } from "@/lib/data/cursos";
import { precioEfectivo } from "@/lib/cursos/reglas";
import { isMpConfigurado, crearPreferencia } from "@/lib/mercadopago/client";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { urlDelTenant } from "@/lib/tenant/urls";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { IDIOMA_POR_DEFECTO, traductor } from "@/lib/i18n/textos";

export type ComprarCursoResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

export async function comprarCurso(formData: FormData): Promise<ComprarCursoResult> {
  const tenant = await tenantDelRequest();
  const t = traductor(tenant?.idioma ?? IDIOMA_POR_DEFECTO);
  const noDisponible = t({ es: "Ese curso no está disponible.", pt: "Esse curso não está disponível." });
  if (!tenant?.modulos.cursos) {
    return { ok: false, error: noDisponible };
  }

  const cursoId = String(formData.get("cursoId"));
  const clienteEmail = String(formData.get("clienteEmail") || "").trim();

  if (!clienteEmail) {
    return {
      ok: false,
      error: t({ es: "Ingresá tu email para continuar.", pt: "Informe seu e-mail para continuar." }),
    };
  }
  if (!isMpConfigurado() || !usaCredencialesGlobales(tenant.slug)) {
    return {
      ok: false,
      error: t({
        es: "La compra online todavía no está habilitada. Escribinos por WhatsApp.",
        pt: "A compra online ainda não está habilitada. Fale com a gente pelo WhatsApp.",
      }),
    };
  }

  const curso = await getCursoPublico(tenant.id, cursoId);
  if (!curso) {
    return { ok: false, error: noDisponible };
  }

  const monto = precioEfectivo({
    precio: curso.precio,
    precioOferta: curso.precio_oferta,
    ofertaActiva: curso.oferta_activa,
    ofertaDesde: curso.oferta_desde,
    ofertaHasta: curso.oferta_hasta,
    ahoraIso: new Date().toISOString(),
  });

  try {
    const pref = await crearPreferencia({
      titulo: curso.titulo,
      monto,
      moneda: tenant.moneda,
      externalReference: `curso:${curso.id}`,
      clienteEmail,
      baseUrl: urlDelTenant(tenant.slug),
      backUrls: {
        success: "/cursos/gracias",
        pending: "/cursos/gracias",
        failure: `/cursos/${curso.id}`,
      },
    });
    return { ok: true, initPoint: pref.initPoint };
  } catch {
    return {
      ok: false,
      error: t({
        es: "No se pudo iniciar el pago. Probá de nuevo.",
        pt: "Não foi possível iniciar o pagamento. Tente novamente.",
      }),
    };
  }
}
```

- [ ] **Step 4: `src/app/sitio/[tenant]/cursos/gracias/page.tsx`**

```tsx
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { traductor } from "@/lib/i18n/textos";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Gracias", pt: "Obrigado" });
}

export default async function GraciasCursoPage({ params }: Props) {
  const t = traductor((await tenantDeLaPagina(params)).idioma);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-fondo px-6 pt-24 pb-16 text-center">
      <Container className="flex flex-col items-center gap-4">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
          {t({ es: "¡Listo!", pt: "Pronto!" })}
        </p>
        <h1 className="font-serif text-4xl text-texto sm:text-5xl">
          {t({ es: "Estamos procesando tu pago", pt: "Estamos processando seu pagamento" })}
        </h1>
        <p className="max-w-md font-sans text-texto-suave">
          {t({
            es: "En cuanto se confirme te va a llegar un email con el link de acceso al curso.",
            pt: "Assim que for confirmado, você vai receber um e-mail com o link de acesso ao curso.",
          })}
        </p>
        <Button href="/cursos">{t({ es: "Ver más cursos", pt: "Ver mais cursos" })}</Button>
      </Container>
    </main>
  );
}
```

- [ ] **Step 5: `src/app/sitio/[tenant]/cursos/acceso/[token]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  getAccesoPorToken,
  getArchivosCurso,
  type AccesoConCurso,
} from "@/lib/data/cursos";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { accesoVigente } from "@/lib/cursos/reglas";
import { videoProvider } from "@/lib/video";
import { urlFirmadaArchivo } from "@/lib/storage/archivos";
import { LOCALES, traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tenant: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Mi curso", pt: "Meu curso" });
}

/** Fecha corta en el idioma y la zona del tenant. */
function fechaCorta(iso: string, tenant: Tenant): string {
  return new Date(iso).toLocaleDateString(LOCALES[tenant.idioma], { timeZone: tenant.zonaHoraria });
}

export default async function AccesoCursoPage({ params }: Props) {
  const tenant = await tenantDeLaPagina(params);
  const { token } = await params;
  const acceso = await getAccesoPorToken(tenant.id, token);
  const t = traductor(tenant.idioma);

  return (
    <main className="min-h-screen bg-fondo px-6 pt-24 pb-20">
      <Container className="max-w-2xl">
        {!acceso ? (
          <p className="font-sans text-texto-suave">
            {t({ es: "No encontramos ese acceso.", pt: "Não encontramos esse acesso." })}
          </p>
        ) : !accesoVigente(acceso.expira_en, new Date().toISOString()) ? (
          <div>
            <h1 className="font-serif text-3xl text-texto">
              {t({ es: "Tu acceso expiró", pt: "Seu acesso expirou" })}
            </h1>
            <p className="mt-3 font-sans text-texto-suave">
              {t({
                es: `El acceso a “${acceso.cursos.titulo}” venció el ${fechaCorta(acceso.expira_en, tenant)}.`,
                pt: `O acesso a “${acceso.cursos.titulo}” venceu em ${fechaCorta(acceso.expira_en, tenant)}.`,
              })}
            </p>
            <Button href={`/cursos/${acceso.curso_id}`} className="mt-6">
              {t({ es: "Comprar de nuevo", pt: "Comprar novamente" })}
            </Button>
          </div>
        ) : (
          <AccesoVigenteContenido tenant={tenant} acceso={acceso} />
        )}
      </Container>
    </main>
  );
}

async function AccesoVigenteContenido({
  tenant,
  acceso,
}: {
  tenant: Tenant;
  acceso: AccesoConCurso;
}) {
  const t = traductor(tenant.idioma);
  const curso = acceso.cursos;
  const archivos = await getArchivosCurso(tenant.id, curso.id);

  const videoUrl = curso.video_storage_path
    ? await videoProvider.urlFirmada(curso.video_storage_path, 600)
    : null;
  const descargaVideoUrl =
    curso.permitir_descarga && curso.video_storage_path
      ? await videoProvider.urlFirmada(curso.video_storage_path, 600)
      : null;
  const archivosConUrl = await Promise.all(
    archivos.map(async (a) => ({
      ...a,
      url: await urlFirmadaArchivo(a.storage_path, 600),
    })),
  );

  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
        {t({
          es: `Acceso hasta ${fechaCorta(acceso.expira_en, tenant)}`,
          pt: `Acesso até ${fechaCorta(acceso.expira_en, tenant)}`,
        })}
      </p>
      <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">{curso.titulo}</h1>

      {videoUrl ? (
        <video
          key={videoUrl}
          controls
          controlsList={descargaVideoUrl ? undefined : "nodownload"}
          className="mt-6 w-full rounded-2xl bg-black"
        >
          <source src={videoUrl} />
        </video>
      ) : (
        <p className="mt-6 font-sans text-texto-suave">
          {t({
            es: "El video de este curso todavía no está disponible.",
            pt: "O vídeo deste curso ainda não está disponível.",
          })}
        </p>
      )}

      {descargaVideoUrl && (
        <a
          href={descargaVideoUrl}
          className="mt-3 inline-block font-sans text-sm text-primario underline"
        >
          {t({ es: "Descargar video", pt: "Baixar vídeo" })}
        </a>
      )}

      {archivosConUrl.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-2xl text-texto">{t({ es: "Materiales", pt: "Materiais" })}</h2>
          <ul className="mt-3 space-y-2">
            {archivosConUrl.map((a) => (
              <li key={a.id}>
                <a href={a.url} className="font-sans text-sm text-primario underline">
                  {a.nombre_archivo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: `src/components/cursos/CompraForm.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { comprarCurso } from "@/app/sitio/[tenant]/cursos/[id]/actions";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { T, useT } from "@/lib/i18n/cliente";

export function CompraForm({ cursoId }: { cursoId: string }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("cursoId", cursoId);
    startTransition(async () => {
      const result = await comprarCurso(formData);
      if (result.ok) {
        window.location.href = result.initPoint;
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
      <label className="flex-1 font-sans text-sm text-texto-suave">
        <T
          es="Tu email (ahí te va a llegar el acceso)"
          pt="Seu e-mail (o acesso será enviado para ele)"
        />
        <input
          name="clienteEmail"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-primario/20 bg-white px-3 py-2 text-texto"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60 sm:mt-0 sm:self-end"
      >
        <T es="Comprar" pt="Comprar" />
      </button>
      {error && (
        <p className="w-full rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
          {error}
        </p>
      )}
      <LoadingOverlay
        show={pending}
        label={t({ es: "Redirigiendo a Mercado Pago…", pt: "Redirecionando para o Mercado Pago…" })}
      />
    </form>
  );
}
```

- [ ] **Step 7: `src/components/cursos/VistaPreviaYoutube.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { youtubeMiniatura } from "@/lib/video/youtube";
import { T, useT } from "@/lib/i18n/cliente";

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  destroy(): void;
};
type YTEvento = { data: number };

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_ENDED = 0;

let apiLista: Promise<void> | null = null;
function cargarApiYoutube(): Promise<void> {
  apiLista ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiLista;
}

type Estado = "listo" | "cargando" | "reproduciendo" | "pausado" | "terminado";

/**
 * Vista previa limitada de un video de YouTube: sin controles, corte a los `segundos`
 * y, al llegar, se bloquea con un llamado a comprar. Es una barrera de experiencia, no de
 * seguridad: el video público sigue siendo accesible en YouTube. El contenido pago debe
 * ser otro video (el del curso vive en Storage privado y se libera al pagar).
 */
export function VistaPreviaYoutube({
  videoId,
  titulo,
  segundos,
}: {
  videoId: string;
  titulo: string;
  segundos: number;
}) {
  const t = useT();
  const contenedor = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const terminado = useRef(false);
  const [estado, setEstado] = useState<Estado>("listo");

  // Corte duro: el reproductor se pausa al llegar al límite.
  useEffect(() => {
    if (estado !== "reproduciendo") return;
    const id = setInterval(() => {
      if ((player.current?.getCurrentTime() ?? 0) >= segundos) {
        terminado.current = true;
        player.current?.pauseVideo();
        setEstado("terminado");
      }
    }, 200);
    return () => clearInterval(id);
  }, [estado, segundos]);

  useEffect(() => () => player.current?.destroy(), []);

  async function iniciar() {
    if (!contenedor.current) return;
    setEstado("cargando");
    await cargarApiYoutube();
    const destino = document.createElement("div");
    contenedor.current.replaceChildren(destino);
    player.current = new window.YT!.Player(destino, {
      host: "https://www.youtube-nocookie.com",
      videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
        autoplay: 1,
        end: segundos,
      },
      events: {
        onReady: (e: { target: YTPlayer }) => e.target.playVideo(),
        onStateChange: (e: YTEvento) => {
          if (terminado.current) return;
          if (e.data === YT_PLAYING) setEstado("reproduciendo");
          else if (e.data === YT_PAUSED) setEstado("pausado");
          else if (e.data === YT_ENDED) {
            terminado.current = true;
            setEstado("terminado");
          }
        },
      },
    });
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-texto shadow-sm">
      <div ref={contenedor} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />

      {estado === "listo" || estado === "cargando" ? (
        <button
          type="button"
          onClick={iniciar}
          disabled={estado === "cargando"}
          aria-label={t({ es: `Ver vista previa: ${titulo}`, pt: `Ver prévia: ${titulo}` })}
          className="absolute inset-0 z-10"
        >
          <Image
            src={youtubeMiniatura(videoId)}
            alt=""
            fill
            sizes="(min-width: 672px) 672px, 100vw"
            className="object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-texto/10">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-fondo/90 text-primario-oscuro shadow-md">
              {estado === "cargando" ? (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-primario-oscuro border-t-transparent" />
              ) : (
                <svg aria-hidden viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </span>
          </span>
        </button>
      ) : estado === "terminado" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-texto/90 px-6 text-center">
          <svg aria-hidden viewBox="0 0 24 24" className="h-9 w-9 fill-fondo">
            <path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z" />
          </svg>
          <p className="font-serif text-2xl text-fondo">
            <T es="Seguí viendo el curso completo" pt="Continue assistindo ao curso completo" />
          </p>
          <p className="font-sans text-sm text-fondo/70">
            <T
              es="Se libera apenas se acredita el pago."
              pt="É liberado assim que o pagamento for confirmado."
            />
          </p>
          <a
            href="#comprar"
            className="mt-1 inline-flex rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro"
          >
            <T es="Comprar el curso" pt="Comprar o curso" />
          </a>
        </div>
      ) : (
        // Capa transparente: bloquea el hover/click sobre el iframe (título, "Ver en YouTube").
        <button
          type="button"
          onClick={() =>
            estado === "reproduciendo" ? player.current?.pauseVideo() : player.current?.playVideo()
          }
          aria-label={
            estado === "reproduciendo"
              ? t({ es: "Pausar", pt: "Pausar" })
              : t({ es: "Reanudar", pt: "Retomar" })
          }
          className="absolute inset-0 z-10 cursor-pointer"
        >
          {estado === "pausado" && (
            <span className="absolute inset-0 flex items-center justify-center bg-texto/40">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-fondo/90 text-primario-oscuro shadow-md">
                <svg aria-hidden viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          )}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Verificar que no queda texto del sitio sin traducir**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
grep -rnE ">[^<{}]*[a-záéíóúñ]{3,}[^<{}]*<" "src/app/sitio" src/components/landing src/components/turnos src/components/cursos | grep -v "WhatsApp<" | grep -v "<T "
```

Expected:
- `tsc` y `eslint` sin errores, y todos los tests en PASS.
- El último `grep` busca texto literal entre tags en una misma línea y no debería mostrar nada.
- Si aparece una línea, revisarla a mano: puede ser un falso positivo (código con `>` y `<`) o un texto que se escapó. El único texto literal permitido es "WhatsApp", que es una marca. Los textos que ocupan varias líneas ya los cubre la revisión de cada archivo de las Tasks 7 a 9.

- [ ] **Step 9: Commit**

```bash
git add "src/app/sitio/[tenant]/cursos" src/components/cursos
git commit -F - <<'EOF'
feat(i18n): cursos en el idioma y la moneda del tenant

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 10: Panel, webhook y cron con la zona, la moneda y el idioma del tenant

Fuera del sitio público quedan cuatro cosas con AR fijo: el vencimiento de cursos, las fechas de los emails, el panel y la API vieja temporal. Los textos del panel y de los emails siguen en español (etapas C y D).

**Files:**
- Modify: `src/lib/cursos/reglas.ts` (+test), `src/app/api/webhooks/mercadopago/route.ts`, `src/app/api/cron/recordatorios/route.ts`
- Modify: `src/app/admin/servicios/page.tsx`, `src/app/admin/cursos/page.tsx`, `src/app/admin/turnos/page.tsx`, `src/app/admin/cursos/[id]/page.tsx`
- Modify: `src/lib/turnos/fechas.ts` y `src/lib/format.ts` (borrar la API temporal)

- [ ] **Step 1: Test que falla de `calcularExpiracion` con zona**

En `src/lib/cursos/reglas.test.ts`, reemplazar el bloque `describe("calcularExpiracion", …)` completo por:

```ts
describe("calcularExpiracion", () => {
  it("suma los días de acceso a la fecha de compra", () => {
    expect(
      calcularExpiracion("2026-07-10T12:00:00-03:00", 7, "America/Argentina/Buenos_Aires"),
    ).toBe("2026-07-17T12:00:00-03:00");
  });

  it("expresa el vencimiento en la zona del negocio", () => {
    expect(calcularExpiracion("2026-07-10T12:00:00-03:00", 7, "America/Manaus")).toBe(
      "2026-07-17T11:00:00-04:00",
    );
  });
});
```

Run: `npx vitest run src/lib/cursos/reglas.test.ts`
Expected: FAIL en "expresa el vencimiento en la zona del negocio": devuelve `2026-07-17T12:00:00-03:00`.

- [ ] **Step 2: `calcularExpiracion` recibe la zona**

En `src/lib/cursos/reglas.ts`:

1. Reemplazar `import { isoFechaHoraAR } from "@/lib/turnos/fechas";` por:

```ts
import { fechaEnZona, isoFechaHora, minutosDelDia } from "@/lib/turnos/fechas";
```

2. Borrar la línea `const OFFSET_MIN = 180;` y la línea en blanco que le sigue.
3. Reemplazar la función `calcularExpiracion` completa (con su comentario) por:

```ts
/** Fecha de expiración = fecha de compra + días de acceso, expresada en la zona del negocio. */
export function calcularExpiracion(
  fechaCompraIso: string,
  diasAcceso: number,
  zona: string,
): string {
  const vence = new Date(new Date(fechaCompraIso).getTime() + diasAcceso * 24 * 60 * 60 * 1000);
  return isoFechaHora(fechaEnZona(vence, zona), minutosDelDia(vence.toISOString(), zona), zona);
}
```

Run: `npx vitest run src/lib/cursos/reglas.test.ts`
Expected: PASS.

- [ ] **Step 3: Webhook de Mercado Pago**

En `src/app/api/webhooks/mercadopago/route.ts`:

1. Agregar a los imports: `import { LOCALES, type Idioma } from "@/lib/i18n/textos";`
2. En `procesarPagoTurno`, reemplazar `.select("*, servicios(nombre), tenants(slug)")` por:

```ts
    .select("*, servicios(nombre), tenants(slug, zona_horaria, idioma)")
```

3. Reemplazar el bloque `const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString("es-AR", { … });` por:

```ts
    const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString(
      LOCALES[turno.tenants.idioma as Idioma],
      { dateStyle: "long", timeStyle: "short", timeZone: turno.tenants.zona_horaria },
    );
```

4. En `procesarPagoCurso`, reemplazar `.select("tenant_id, titulo, dias_acceso, tenants(slug)")` por:

```ts
    .select("tenant_id, titulo, dias_acceso, tenants(slug, zona_horaria)")
```

5. Inmediatamente después de `if (!curso) return;`, agregar:

```ts
  const tenantCurso = curso.tenants as unknown as { slug: string; zona_horaria: string };
```

6. Reemplazar `const expiraEn = calcularExpiracion(new Date().toISOString(), curso.dias_acceso);` por:

```ts
  const expiraEn = calcularExpiracion(
    new Date().toISOString(),
    curso.dias_acceso,
    tenantCurso.zona_horaria,
  );
```

7. Borrar la línea `const slug = (curso.tenants as unknown as { slug: string }).slug;` y reemplazar `${urlDelTenant(slug)}` por `${urlDelTenant(tenantCurso.slug)}`.

- [ ] **Step 4: Cron de recordatorios**

En `src/app/api/cron/recordatorios/route.ts`:

1. Agregar a los imports: `import { LOCALES, type Idioma } from "@/lib/i18n/textos";`
2. En el `.select(…)`, reemplazar `tenants(slug)` por `tenants(slug, zona_horaria, idioma)`.
3. Inmediatamente después de `const datos = datosDelTenant(turno.tenant_id);`, agregar:

```ts
    const tenantTurno = turno.tenants as unknown as {
      slug: string;
      zona_horaria: string;
      idioma: Idioma;
    };
```

4. Reemplazar el bloque `const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString("es-AR", { … });` por:

```ts
    const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString(LOCALES[tenantTurno.idioma], {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: tenantTurno.zona_horaria,
    });
```

5. Reemplazar la línea de `linkGestion` por:

```ts
      linkGestion: `${urlDelTenant(tenantTurno.slug)}/turnos/gestion/${turno.token_gestion}`,
```

- [ ] **Step 5: Panel, moneda y zona del tenant (los textos siguen en español)**

`src/app/admin/servicios/page.tsx`:
- Reemplazar `import { formatPrecioARS, formatDuracion } from "@/lib/format";` por `import { formatPrecio, formatDuracion } from "@/lib/format";`
- Reemplazar `title={formatPrecioARS(s.precio)}` por `title={formatPrecio(s.precio, tenant.moneda, tenant.idioma)}`

`src/app/admin/cursos/page.tsx`:
- Reemplazar `import { formatPrecioARS } from "@/lib/format";` por `import { formatPrecio } from "@/lib/format";`
- Reemplazar `{formatPrecioARS(c.precio)}` por `{formatPrecio(c.precio, tenant.moneda, tenant.idioma)}`

`src/app/admin/turnos/page.tsx`:
- Reemplazar `import { formatPrecioARS } from "@/lib/format";` por `import { formatPrecio } from "@/lib/format";`
- Reemplazar `Seña {formatPrecioARS(t.monto_sena)}` por `Seña {formatPrecio(t.monto_sena, tenant.moneda, tenant.idioma)}`
- Reemplazar `timeZone: "America/Argentina/Buenos_Aires",` por `timeZone: tenant.zonaHoraria,`

`src/app/admin/cursos/[id]/page.tsx`, las dos apariciones:

```bash
perl -pi -e 's/toLocaleDateString\("es-AR"\)/toLocaleDateString("es-AR", { timeZone: tenant.zonaHoraria })/g' "src/app/admin/cursos/[id]/page.tsx"
```

En las cuatro páginas, `tenant` ya está en el scope (`const tenant = await tenantDelAdmin();` al comienzo del componente).

- [ ] **Step 6: Borrar la API temporal**

- En `src/lib/turnos/fechas.ts`, borrar desde la línea `// --- Temporal: API anterior con la zona de Argentina fija. La Task 10 la borra. ---` hasta el final del archivo.
- En `src/lib/format.ts`, borrar desde la línea `// --- Temporal: la Task 10 lo borra, cuando ya no quedan usos. ---` hasta el final del archivo.

Comprobar que no queda ningún uso ni ninguna zona fija fuera de los tests:

```bash
grep -rnE "formatPrecioARS|isoFechaHoraAR|diaSemanaAR|minutosDelDiaAR|fechaHoyAR|OFFSET_AR|OFFSET_MIN" src
grep -rn "America/Argentina/Buenos_Aires" src --include=*.ts --include=*.tsx | grep -v "\.test\.ts"
```

Expected: los dos `grep` sin salida.

- [ ] **Step 7: Verificar**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
```

Expected: sin errores, todos los tests en PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/cursos src/lib/turnos/fechas.ts src/lib/format.ts src/app/api src/app/admin
git commit -F - <<'EOF'
feat(multitenant): panel, webhook y recordatorios con la zona, moneda e idioma del tenant

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 11: `lang` del HTML por tenant

**Files:**
- Modify: `src/lib/tenant/host.ts` (una constante)
- Modify (reemplazo completo): `src/proxy.ts`, `src/app/layout.tsx`

- [ ] **Step 1: Nombre de la cabecera**

En `src/lib/tenant/host.ts`, agregar después de `SUBDOMINIOS_RESERVADOS`:

```ts
/** Cabecera con la que el proxy le pasa al layout raíz el slug del tenant del sitio público. */
export const CABECERA_TENANT = "x-tenant-slug";
```

- [ ] **Step 2: Reemplazar `src/proxy.ts` completo**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolverHost, configHost, CABECERA_TENANT } from "@/lib/tenant/host";

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
  // El layout raíz lee el tenant de esta cabecera para el lang del documento. Va en los
  // headers del request (no de la respuesta), así no llega al navegador; set() pisa
  // cualquier valor que haya mandado el cliente.
  const cabeceras = new Headers(request.headers);
  cabeceras.set(CABECERA_TENANT, destino.slug);
  return NextResponse.rewrite(url, { request: { headers: cabeceras } });
}

export const config = {
  // Todo menos estáticos de Next y archivos con extensión (imágenes de public/);
  // /sitio aparte, para que el bloqueo también corra en rutas con extensión.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)", "/sitio/:path*"],
};
```

- [ ] **Step 3: Reemplazar `src/app/layout.tsx` completo**

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { CABECERA_TENANT, esSlugValido } from "@/lib/tenant/host";
import { LOCALES } from "@/lib/i18n/textos";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Turnos online",
};

/**
 * Idioma del documento. En el sitio público, el proxy indica el tenant en x-tenant-slug.
 * En el resto (panel, rutas sin tenant) queda "es", el idioma del panel hasta la etapa C.
 * getTenantPorSlug está cacheado por request: el layout del sitio reutiliza la consulta.
 */
async function langDelDocumento(): Promise<string> {
  const slug = (await headers()).get(CABECERA_TENANT);
  if (!slug || !esSlugValido(slug)) return "es";
  const tenant = await getTenantPorSlug(slug).catch(() => null);
  return tenant ? LOCALES[tenant.idioma] : "es";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await langDelDocumento();
  return (
    <html
      lang={lang}
      className={`${cormorant.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

`headers()` vuelve dinámicas todas las rutas con este layout (docs de Next 16: `functions/headers.md`, "Request-time API"). Las páginas del sitio y del panel ya lo eran. Las que dejan de ser estáticas son las de "gracias" (ya leen el tenant desde la Task 8) y el 404 global. `/api` no usa layouts.

- [ ] **Step 4: Verificar tipos, lint y build**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
npm run build
```

Expected: sin errores. En el build, las rutas de `/sitio/[tenant]/**` y `/admin/**` aparecen como `ƒ` (dinámicas), y sigue estando `ƒ Proxy (Middleware)`.

- [ ] **Step 5: Comprobar el `lang` en desarrollo**

Run (en background): `npm run dev`. Después:

```bash
curl -s -H "Host: gisel.localhost:3000" http://localhost:3000/ | grep -o '<html lang="[^"]*"'
curl -s -H "Host: gisel.localhost:3000" -H "x-tenant-slug: otro" http://localhost:3000/ | grep -o '<html lang="[^"]*"'
curl -s -H "Host: gisel.localhost:3000" http://localhost:3000/admin/login | grep -o '<html lang="[^"]*"'
```

Expected, en orden:
- `<html lang="es-AR"`
- `<html lang="es-AR"`: el proxy pisa la cabecera que manda el cliente.
- `<html lang="es"`: el panel no recibe la cabecera.

Detener el servidor de desarrollo.

- [ ] **Step 6: Commit**

```bash
git add src/proxy.ts src/app/layout.tsx src/lib/tenant/host.ts
git commit -F - <<'EOF'
feat(i18n): lang del documento según el idioma del tenant

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 12: Verificación final con un tenant en portugués

**Files:**
- Create: `scripts/tenant-demo-br.mjs`

- [ ] **Step 1: Crear `scripts/tenant-demo-br.mjs`**

```js
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
```

- [ ] **Step 2: Tipos, lint, tests y build**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
npm run build
```

Expected:
- `tsc` y `eslint` sin errores.
- Vitest con todos los tests en PASS: los 110 anteriores más los nuevos de `i18n/textos`, `fechas`, `format`, `whatsapp`, `horario`, `estilo` y `reglas`.
- Build sin errores.

- [ ] **Step 3: Smoke test de Gisel (español) en desarrollo**

Run (en background): `npm run dev`. Después:

```bash
S=$(mktemp -d)
curl -s -o "$S/gisel.html" -w 'inicio gisel: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/
grep -o '<html lang="[^"]*"' "$S/gisel.html"
grep -o -E "Reservar turno|Lunes a viernes|Todos los derechos reservados" "$S/gisel.html" | sort -u
grep -o -- "--marca-primario:#[0-9a-fA-F]*" "$S/gisel.html" | head -1
curl -s -o "$S/gisel-turnos.html" -w 'turnos gisel: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/turnos
grep -o -E "Reservá tu turno|Elegí uno o más servicios|\\$ [0-9]+\.[0-9]{3}" "$S/gisel-turnos.html" | sort -u | head -5
curl -s -o /dev/null -w 'cursos gisel: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/cursos
```

Expected:
- `inicio gisel: 200`, `turnos gisel: 200` y `cursos gisel: 200`.
- `<html lang="es-AR"`.
- Los 3 textos en español.
- `--marca-primario:#c0899a`.
- En turnos, "Reservá tu turno", "Elegí uno o más servicios" y al menos un precio con formato `$ 15.000`.

- [ ] **Step 4: Smoke test en portugués con `demo-br`**

```bash
node --env-file=.env.local scripts/tenant-demo-br.mjs crear
curl -s -o "$S/br.html" -w 'inicio demo-br: %{http_code}\n' -H "Host: demo-br.localhost:3000" http://localhost:3000/
grep -o '<html lang="[^"]*"' "$S/br.html"
grep -o -E 'Agendar horário|Serviços|Segunda a sexta|09:00 às 18:00|Todos os direitos reservados|R\$ 350,00' "$S/br.html" | sort -u
grep -o -- "--marca-primario:#1f6f8b" "$S/br.html" | head -1
grep -c -E "Reservar turno|Lunes a viernes|Servicios" "$S/br.html"
curl -s -o "$S/br-turnos.html" -w 'turnos demo-br: %{http_code}\n' -H "Host: demo-br.localhost:3000" http://localhost:3000/turnos
grep -o -E 'Agende seu horário|Escolha um ou mais serviços|R\$ 350,00' "$S/br-turnos.html" | sort -u
curl -s -w '\ncursos demo-br: %{http_code}\n' -H "Host: demo-br.localhost:3000" http://localhost:3000/cursos | grep -o -E "Página não encontrada|cursos demo-br: [0-9]+"
```

Expected:
- `inicio demo-br: 200` y `turnos demo-br: 200`.
- `<html lang="pt-BR"`.
- Los 6 textos del inicio en portugués, incluido `R$ 350,00`.
- `--marca-primario:#1f6f8b`.
- El conteo de textos en español da `0`.
- En turnos, los 3 textos en portugués.
- `/cursos` (módulo apagado en `demo-br`) da `cursos demo-br: 404` y muestra el `not-found` del sitio en portugués: "Página não encontrada".

Borrar el tenant de prueba y confirmar que ya no responde:

```bash
node --env-file=.env.local scripts/tenant-demo-br.mjs borrar
curl -s -o /dev/null -w 'demo-br borrado: %{http_code}\n' -H "Host: demo-br.localhost:3000" http://localhost:3000/
```

Expected: `Tenant demo-br borrado.` y `demo-br borrado: 404`.

Si algún paso del smoke test falla, borrar igual el tenant (`… tenant-demo-br.mjs borrar`) antes de investigar. Después detener el servidor de desarrollo, que usa el puerto 3000, el mismo del contenedor.

- [ ] **Step 5: Smoke test en Docker**

```bash
docker compose up -d --build --force-recreate
curl -s -o /dev/null -w 'docker gisel: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/
curl -s -H "Host: gisel.localhost:3000" http://localhost:3000/ | grep -o '<html lang="[^"]*"'
curl -s -o /dev/null -w 'docker turnos: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/turnos
```

Expected: `docker gisel: 200`, `<html lang="es-AR"` y `docker turnos: 200`. La imagen `node:22-alpine` trae ICU completo, así que el offset de las zonas funciona igual que en desarrollo.

- [ ] **Step 6: Test de aislamiento**

Run: `npm run test:aislamiento`
Expected: `Aislamiento OK`.

- [ ] **Step 7: Commit**

```bash
git add scripts/tenant-demo-br.mjs
git status --short   # .env.local y docs/resumen-arquitectura-y-desarrollo.md NO deben estar en staged
git commit -F - <<'EOF'
chore(multitenant): script del tenant de prueba demo-br para verificar el sitio en portugués

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Self-review

**Cobertura del spec y de las decisiones:**

| Requisito | Task |
|---|---|
| Spec 8: tokens neutros `primario`, `secundario`, `fondo`, `texto` con `-oscuro` y `-suave`, variantes con `color-mix()` en el `@theme` | 6 |
| Spec 8: el layout del tenant define las variables con los 4 colores base | 6 (sitio y panel) |
| Spec 8: `<T es pt />` y `t({ es, pt })` (acá `traducir`/`traductor`/`useT`), sin librerías, tipos que exigen ambas claves | 1 (y el `@ts-expect-error` del test) |
| Spec 8: idioma desde el tenant; servidor por el layout, cliente por `IdiomaProvider` | 1, 6 |
| Spec 8: fechas, horas y precios con `Intl` según idioma y zona | 2, 3, 8, 9, 10 |
| Spec 12: `fechas.ts` con zona IANA y offset por `Intl` (incluye Manaos -04:00) | 2, 8, 10 |
| Spec 12: `normalizarWhatsApp(input, pais)` para AR y BR | 4, 8 |
| Spec 12: `formatPrecio(monto, moneda, idioma)` → `$ 35.000` / `R$ 350,00` | 3, 7, 8, 9, 10 |
| Spec 9: preferencias en la moneda del tenant | 8 |
| Spec 11: crons con la zona y el idioma de cada tenant (formato de fechas) | 10 |
| Spec 13: tests de offset por zona, teléfonos AR/BR y moneda | 2, 3, 4 |
| Spec 10 (emails): fuera de A2. Solo las fechas que se insertan en el email siguen el idioma y la zona del tenant | 10 |
| Decisión 2: `LoadingOverlay` sin monograma | 6 |
| Decisión 3: todo el sitio público traducido (páginas, componentes, metadata y errores de actions) | 6, 7, 8, 9 |
| Decisión 4: `lang` por tenant con `x-tenant-slug` y `headers()` | 11 |
| Decisión 7: placeholder por país | 4 (ejemplo), 8 (formulario y mensaje de error) |
| Decisión 8: verificación final con `demo-br`, Docker y aislamiento | 12 |

Queda para la **etapa C**: el panel del cliente en su idioma (textos, `DIAS_SEMANA`, "precio en pesos") y que "Cursos de estética" salga del rubro del tenant. Queda para la **etapa D**: plantillas de email con la marca e idioma del tenant (`COLOR` de `plantillas.ts`, `FALTA_TEXTO` del cron) y la descripción de los eventos de Calendar.

**Tipos consistentes entre tasks:**
- `Idioma` y `Textos` salen de `src/lib/i18n/textos.ts`, y `tipos.ts` reexporta `Idioma`, así que `mapear.ts` y el resto siguen importando de `./tipos` sin cambios.
- `traducir(idioma, textos)` y `traductor(idioma)` → `(textos) => string`. `useT()` devuelve la misma firma que `traductor`.
- `LOCALES: Record<Idioma, string>` se usa en `format.ts`, `SlotPicker`, las páginas de gestión y acceso, el webhook, el cron y el layout raíz.
- `isoFechaHora(fecha, minutos, zona)`, `minutosDelDia(iso, zona)`, `fechaEnZona(instante, zona)` y `fechaHoy(zona)`: la zona siempre va al final. Las únicas excepciones son `offsetEnZona(zona, instante)` (como `Intl`) y `diaSemana(fecha)` / `sumarDias(fecha, n)`, que no dependen de la zona.
- `getDisponibilidad(tenantId, zonaHoraria, servicioIds, fecha)` tiene la misma firma en sus 3 llamadas (`reservarTurno`, `consultarDisponibilidad` y `reprogramarTurno`).
- `formatPrecio(monto, moneda, idioma)` siempre recibe `tenant.moneda` y `tenant.idioma`. En el cliente, `ReservaForm` recibe `moneda` por props y toma el idioma de `useIdioma()`.
- `normalizarWhatsApp(input, pais)` y `EJEMPLO_WHATSAPP[pais]` con `Pais` de `tipos.ts`.
- `crearPreferencia({ …, moneda })` tiene `moneda: Moneda` obligatoria, y sus dos llamadas la pasan.
- `calcularExpiracion(fechaCompraIso, diasAcceso, zona)` tiene una sola llamada (webhook).
- `SlotPicker` recibe `zonaHoraria` y sus dos usos (`ReservaForm` y `GestionPanel`) la pasan.
- `GestionPanel` recibe `zonaHoraria` y la página de gestión la pasa.
- `estiloMarca(marca)` acepta la `Marca` completa (solo lee los 4 colores) en los layouts del sitio y del panel.
- `metadataTraducida(params, titulo)` acepta `params` con más claves (`token`, `id`), porque `Promise<{ tenant; token }>` es asignable a `Promise<{ tenant }>`.

**Orden y compilación:** cada task deja `tsc` en verde. Para eso, las Tasks 2 y 3 dejan la API vieja como envoltorio, la Task 4 actualiza su única llamada, la Task 5 actualiza su única llamada, la Task 8 cambia `crearPreferencia` junto con sus dos llamadas y la Task 10 borra los envoltorios después de que el último uso desaparece.

**Sin placeholders:** todo archivo nuevo o reescrito tiene su contenido completo. Las ediciones puntuales indican el texto exacto a buscar y a poner. Las traducciones al portugués de Brasil están escritas en el código de cada task.
