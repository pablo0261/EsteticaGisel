# Etapa B — Login seguro y usuario master: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** el ingreso al panel de cada cliente (`<slug>.<dominio>/admin`) y al panel master (`app.<dominio>`) pide email y contraseña más un código de 6 dígitos por email, con "recordar este dispositivo por 30 días". También permite recuperar la contraseña con un link propio, con la marca del tenant. Se crea el usuario master con un script y una home master mínima con la lista de clientes.

**Arquitectura:**
- **Reglas puras con tests** (`src/lib/auth/*.ts`): códigos (HMAC, vencimiento, intentos, reenvío), cookie `mfa` firmada sobre `user_id` y el `session_id` del JWT, dispositivos recordados, rutas protegidas por área, regla de envío (SMTP, consola o bloqueado), límites de recuperación y mensajes.
- **Datos:** la migración `0011` crea `codigos_login`, `dispositivos_confiables` y `pedidos_recuperacion`, con RLS y sin policies, así que solo el servidor (service role) las usa. El test de aislamiento lo comprueba.
- **Servidor:** `servicio.ts` (consultas con service role), `area.ts` (tenant o master según el host), `sesion.ts` (sesión con la verificación hecha) y `acciones.ts`, con las server actions que comparten los dos paneles.
- **Proxy:** `protegerArea()` exige sesión de Supabase y una cookie `mfa` válida en `/admin/*` y en todo `app.`, salvo en login, verificación y contraseña. `app.<dominio>/…` se reescribe a `/master/…`. `tenantDelAdmin()` y `masterVerificado()` repiten la verificación del lado del servidor.
- **Emails:** salen desde la cuenta de Gmail de la plataforma (`PLATFORM_GMAIL_*`), con un layout con la marca (`layoutMarca`) y en el idioma del tenant. Sin cuenta configurada, en desarrollo el código se imprime en la consola y en producción el login falla cerrado.

**Stack:** Next.js 16 (`proxy.ts` en runtime Node.js, `cookies()`, `headers()`, server actions, `redirect`, `after`), Supabase Auth (`@supabase/ssr` 0.12, `supabase-js` 2.110: `getClaims`, `verifyOtp`, `admin.generateLink`), `node:crypto`, nodemailer, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-11-plataforma-multitenant-design.md](../specs/2026-10-11-plataforma-multitenant-design.md), secciones 5, 6, 7, 10, 13 y la fila B de la 14.
**Plan anterior:** [2026-10-12-etapa-a2-presentacion-por-tenant.md](2026-10-12-etapa-a2-presentacion-por-tenant.md).

---

> **Nota (post-revisión de las Tasks 1–5):** `hashEmail` cambió a `hashEmail(secreto, email)` (HMAC con `MFA_SECRET`) en el commit d278fa5. Los bloques de la Task 4 de abajo muestran la versión original con SHA-256; el código vigente es el del repo.

## Alcance y decisiones

**Incluido en B:**

- Login en dos pasos (email y contraseña, luego un código de 6 dígitos por email) en el panel del cliente y en el master.
- Dispositivos recordados por 30 días, más una función para revocarlos (la pantalla para hacerlo llega en la etapa C).
- Cookie `mfa` ligada a la sesión de Supabase, que el proxy exige en `/admin` y en el área master.
- Recuperación de contraseña con un link propio (`generateLink` tipo `recovery`), con la marca del tenant.
- Remitente de la plataforma, con respaldo en la consola en desarrollo y falla cerrada en producción.
- Layout de email reutilizable con la marca. Las plantillas de turnos y cursos pasan a usarlo en la etapa D.
- Usuario master (`scripts/crear-master.mjs`), área `app.<dominio>` (en desarrollo, `app.localhost:3000`) y una home master de solo lectura con la lista de clientes.
- La verificación de la sesión también se aplica en `tenantDelAdmin()`. Así se completa el cierre del agujero de `requireAdmin` que empezó en la etapa A1.

**Fuera de B:** el panel master completo (alta, edición, suspensión, revocar dispositivos, reenviar link de contraseña) y la traducción del panel queda para la etapa C. La migración de las plantillas de turnos y cursos al layout nuevo, y el Gmail por cliente, quedan para la etapa D. La página del producto en el dominio raíz sigue respondiendo 404.

**Decisiones ya tomadas (no se reabren):**

1. **Login:** email y contraseña (Supabase Auth) más un código de 6 dígitos por email.
   - El código se guarda solo como HMAC con `MFA_SECRET`. Vence a los 10 minutos, admite 5 intentos y se puede reenviar después de 60 segundos.
   - "Recordar este dispositivo por 30 días" genera un token aleatorio. Su hash va a `dispositivos_confiables` y el token a una cookie httpOnly, `SameSite=Lax`, que es `Secure` solo con https.
   - Después del código se emite la cookie `mfa`, un HMAC sobre `user_id` y el `session_id` del access token. Cerrar sesión o iniciar una sesión nueva la invalida.
   - El proxy exige sesión y `mfa` válidas en `/admin/*` (salvo login, verificación y contraseña) y en el área master.
2. **Remitente:** la cuenta de la plataforma (`PLATFORM_GMAIL_USER`, `PLATFORM_GMAIL_APP_PASSWORD`, `PLATFORM_EMAIL_FROM`), que todavía no existe.
   - Sin la cuenta configurada y con `NODE_ENV !== "production"`, el código se imprime en la consola del servidor (`[MFA dev] código para <email>: 123456`) y el flujo sigue.
   - Sin la cuenta en producción, el login falla con "El envío de códigos no está configurado". Nunca se saltea el segundo factor.
   - La regla es una función pura con tests.
3. **Plantilla del código:** usa la paleta y el logo del tenant, en su idioma (es o pt). El master usa la paleta neutra de la plataforma y español. El layout (`layoutMarca`) es reutilizable, con estilos inline y tablas.
4. **Recuperación:** el link sale de `generateLink` tipo `recovery` y lo mandamos nosotros con la plantilla de la marca, con el mismo remitente y la misma regla de consola. Siempre se muestra el mismo mensaje, exista o no la cuenta, y los envíos tienen límite.
5. **Master:** rol `master` en `perfiles` (`tenant_id` null). Lo crea `scripts/crear-master.mjs` con `MASTER_EMAIL` y `MASTER_PASSWORD` del `.env.local`. Es idempotente. Pablo agrega esas variables a mano.
6. **Área master:** `app.<PLATFORM_DOMAIN>`, que el proxy reescribe a `/master/…`. Tiene `/login` con los mismos dos pasos y una home con la lista de clientes (nombre, slug y estado). El master también entra al `/admin` de cualquier tenant, con la misma verificación.
7. **Idioma:** las pantallas de login, verificación y recuperación son parte del panel, así que quedan **en español** (la etapa C las traduce). Los **emails** van en el idioma del tenant, porque el spec dice que los emails van en el idioma del cliente. El login del tenant conserva sus colores.
8. **Seguridad:**
   - Los HMAC se comparan con `timingSafeEqual` y los códigos se generan con `crypto.randomInt`.
   - Las cookies son httpOnly.
   - Hay límites de intentos por código y de códigos por usuario por hora, y no se revela si un email existe.
   - El CSRF lo cubren las server actions (ver "Riesgos verificados").
   - Cerrar sesión borra `mfa` y conserva la cookie del dispositivo.
9. **Base:** la migración `0011` tiene RLS activo, ninguna policy para `anon` ni `authenticated`, índices y `on delete cascade` desde `auth.users`. `test-aislamiento.mjs` comprueba que la API no las lee ni las escribe.
10. **Git:** todo en `main`, un commit por task con rutas explícitas. Nunca se agregan `docs/resumen-arquitectura-y-desarrollo.md` ni `.env.local`.
11. **Proceso:** ver "Servidor de desarrollo" más abajo.
12. **`MFA_SECRET`:** lo agrega quien ejecuta el plan en el `.env.local`, solo si falta y sin imprimirlo (Task 7).

**Decisiones tomadas al planificar B:**

1. **`codigos_login` suma `usado_en`.** Al verificar, el código se marca como usado y no se borra, así sigue contando para el límite de 5 códigos por usuario por hora. Hay un solo código vigente por usuario: al crear uno, los anteriores vencen.
2. **Intentos con compare-and-set.** Cada intento suma 1 a `intentos` con `update … where intentos = <leído>` antes de comparar. Dos intentos en paralelo no pueden usar el mismo número, y no hace falta una función SQL.
3. **Tabla `pedidos_recuperacion`** (`email_hash`, `ip`, `creado_en`) para limitar la recuperación a 3 pedidos por email y 10 por IP por hora. El email se guarda como HMAC-SHA256 con `MFA_SECRET` (`hashEmail(secreto, email)`, implementado en el commit d278fa5), nunca en claro.
4. **El link de recuperación es nuestro:** `<sitio>/admin/restablecer?token_hash=…`, o `app.<dominio>/restablecer?…` para el master. No se usa el `action_link` de Supabase.
   - La página (GET) solo muestra el formulario. El token se consume en la server action, con `verifyOtp({ type: "recovery", token_hash })`.
   - Así no hace falta configurar URLs de redirección en Supabase, y un antivirus que abre el link no gasta el token.
   - Después de guardar la contraseña se revocan los dispositivos recordados y se cierran todas las sesiones (`signOut({ scope: "global" })`).
5. **La recuperación se procesa con `after()`.** `generateLink`, el control del perfil y el envío corren después de responder, así la respuesta tarda lo mismo exista o no la cuenta. Solo se envía si el perfil corresponde al host. Si no, no se avisa nada.
6. **El dispositivo recordado vale aunque no haya email configurado.** Es el segundo factor, así que en producción sin cuenta de plataforma entra igual quien tiene un dispositivo recordado vigente. Quien no lo tiene recibe el error de "no configurado".
7. **La cookie `mfa` dura 30 días como máximo.** En la práctica dura lo que la sesión de Supabase, porque está atada a su `session_id`. Si la sesión sigue y la cookie falta, el proxy manda a `/verificar`, donde se pide un código nuevo ("Reenviar código").
8. **Proxy: `getUser()` más `getClaims()`.** `getUser()` valida la sesión contra Supabase, como hoy, y detecta sesiones cerradas o revocadas. `getClaims()` da el `session_id`. En server components y actions, `sesionActual()` usa solo `getClaims()` (ver Riesgos).
9. **`tenantDelAdmin()` exige la verificación.** Una server action se puede invocar con un POST a cualquier ruta, también a una del sitio público que el proxy no protege. La verificación del proxy no alcanza, así que se repite en el servidor. Lo mismo hace `masterVerificado()` en el master.
10. **"Salir" usa `signOut({ scope: "local" })`.** Antes, el `signOut()` por defecto (global) cerraba la sesión en todos los dispositivos. Los errores de login también usan `local`. Solo el cambio de contraseña usa `global`.
11. **Los mensajes viajan como clave en la URL** (`?error=credenciales`), nunca como texto. Hoy el login muestra cualquier texto que venga en `?error=`. Una clave desconocida no se muestra.
12. **Las server actions viven en `src/lib/auth/acciones.ts`** y las usan los dos paneles. Cada una deduce el área del host, nunca de un campo del formulario. `src/app/admin/actions.ts` se borra. Las pantallas son componentes compartidos (`src/components/auth/PaginasAuth.tsx`) que reciben `tipo: "tenant" | "master"`.
13. **Contraseña nueva de 8 caracteres o más** (mínimo de NIST). `crear-master.mjs` exige 12 para el master.
14. **El asunto del email no lleva el código**, para que no aparezca en las notificaciones del teléfono.
15. **Remitente visible:** en los emails de un tenant, el nombre visible es el del tenant y la dirección es la de la plataforma. En los del master, `PLATFORM_EMAIL_FROM`.
16. **Plataforma:** `src/lib/plataforma.ts` define `NOMBRE_PLATAFORMA = "Turnos online"` (el mismo título del layout raíz) y `COLORES_PLATAFORMA` neutros. Los usan el email del master y el layout del panel master.
17. **Prueba de punta a punta con HTTP (`scripts/e2e-login.mjs`).** El script se comporta como un navegador sin JavaScript: GET de la página, lee el campo oculto `$ACTION_ID_…` del formulario y hace un POST multipart. Next ejecuta la action y responde 303 con `Location`. Los códigos y links salen del log del servidor de desarrollo. El script crea y borra su propio usuario.

**Riesgos verificados:**

- **Proxy en Node.js:** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, "Runtime": "Proxy defaults to using the Node.js runtime". Así que `node:crypto` (`createHmac`, `timingSafeEqual`) funciona en `proxy.ts`. Los módulos que importa el proxy (`cookie-mfa.ts`, `rutas.ts`) no importan `server-only`.
- **CSRF:** `02-guides/data-security.md`, "Allowed origins". Las server actions solo aceptan POST y comparan `Origin` con `Host` (o `X-Forwarded-Host`). Si no coinciden, abortan. Comprobado en `next/dist/server/app-render/action-handler.js` (`parseHostHeader` y `isCsrfOriginAllowed`). No hace falta `allowedOrigins`, porque cada subdominio postea a sí mismo. Las cookies además son `SameSite=Lax`.
- **`cookies()`:** `04-functions/cookies.md`. Es async. `set` y `delete` solo funcionan en server functions y route handlers, no al renderizar. Por eso las cookies se escriben solo en `acciones.ts`, y las páginas y layouts solo las leen.
- **Formularios sin JavaScript (para la prueba E2E):** en `action-handler.js`, un POST `multipart/form-data` con un campo `$ACTION_ID_<id de 42 caracteres>` ejecuta la action. Si hay `redirect()`, responde `303` con `Location` y sin cuerpo (`RedirectStatusCode.SeeOther`).
- **`after()`:** `04-functions/after.md`. Corre aunque la action termine en `redirect()`. Dentro de una server function se pueden leer `headers()` y `cookies()`, pero acá se leen antes y se pasan como valores.
- **`getClaims()`:** `@supabase/auth-js` 2.110 (`GoTrueClient.d.ts`). Devuelve `claims.session_id` (es un claim obligatorio de `RequiredClaims`) y `claims.sub`. Acepta un JWT explícito (`getClaims(accessToken)`), que se usa justo después de `signInWithPassword`, cuando las cookies nuevas todavía no se pueden leer.
- **`generateLink`:** `GoTrueAdminApi.d.ts`. `properties.hashed_token` sirve para `verifyOtp({ type: "recovery", token_hash })`. La API admin no envía emails. Para un email inexistente devuelve un error ("User not found").

## Servidor de desarrollo (reglas para quien ejecuta)

- El contenedor `esteticagisel-web-1` ocupa el puerto 3000. Antes de `npm run dev`: `docker compose stop`.
- El servidor se levanta con la salida a un log, en background: `LOG="$TEMP/dev-etapa-b.log"` y `npm run dev > "$LOG" 2>&1`. Está listo cuando `grep -c "Ready" "$LOG"` da `1`. Hay que usar la misma ruta de `LOG` en todos los comandos. Para pasarla a `node`, se convierte con `"$(cygpath -w "$LOG")"`.
- Para detenerlo hay que matar solo su árbol de procesos. Con `netstat -ano | grep ":3000" | grep LISTENING` se obtiene el PID (última columna), y después `taskkill //PID <pid> //T //F`. **Nunca** se matan todos los `node.exe`.
- Al terminar, se reconstruye el contenedor: `docker compose up -d --build --force-recreate`.
- **No conectarse a la base hasta la Task 6, Step 4.** Las credenciales de `SUPABASE_DB_URL` se están arreglando. Si `npm run migrar` falla por conexión o autenticación, hay que **detenerse y avisar a Pablo**. Las Tasks 7 a 12 se pueden hacer igual (solo necesitan `tsc` y los tests), pero la Task 13 necesita la migración aplicada.

## Estructura de archivos

**Nuevos**

| Archivo | Responsabilidad |
|---|---|
| `src/lib/auth/codigos.ts` (+test) | Código de 6 dígitos: generar, normalizar, HMAC, comparar, estado, permiso de envío, constantes |
| `src/lib/auth/cookie-mfa.ts` (+test) | Cookie `mfa`: firmar y verificar (HMAC sobre `user_id` y `session_id`), validar el secreto |
| `src/lib/auth/dispositivo.ts` (+test) | Dispositivo recordado: token, hash, formato, vigencia |
| `src/lib/auth/cookies.ts` (+test) | Opciones de las cookies de auth (httpOnly, `Secure` solo con https, `Lax`, 30 días) |
| `src/lib/auth/rutas.ts` (+test) | Rutas por área (`/admin` o raíz de `app.`) y la decisión del proxy |
| `src/lib/auth/envio.ts` (+test) | Regla de envío: `smtp`, `consola` o `bloqueado` |
| `src/lib/auth/recuperacion.ts` (+test) | Email normalizado y su hash, límites de recuperación, validación de la contraseña nueva |
| `src/lib/auth/mensajes.ts` (+test) | Textos de error e información de las pantallas, por clave |
| `src/lib/plataforma.ts` | Nombre y colores neutros de la plataforma |
| `src/lib/email/layout-marca.ts` (+test) | `layoutMarca`, `botonMarca`, `escaparHtml`, `marcaEmailDeTenant`, `MARCA_PLATAFORMA` |
| `src/lib/email/plantillas-auth.ts` (+test) | Emails de código de login y de recuperación (es/pt) |
| `src/lib/email/plataforma.ts` | Envío desde la cuenta de la plataforma con la regla de envío (server-only) |
| `src/lib/auth/secreto.ts` | `secretoMfa()`: lee y valida `MFA_SECRET` (server-only) |
| `src/lib/auth/servicio.ts` | Consultas con service role: perfil, códigos, dispositivos, pedidos de recuperación |
| `src/lib/auth/area.ts` | Área del request (tenant o master), rutas, URL, marca y remitente del área |
| `src/lib/auth/sesion.ts` | `sesionActual()`: usuario, `session_id`, email y si la cookie `mfa` es válida |
| `src/lib/auth/acciones.ts` | Server actions: ingresar, verificar, reenviar, salir, pedir recuperación, restablecer |
| `src/lib/auth/master.ts` | `masterVerificado()` y `listarTenants()` |
| `src/components/auth/PaginasAuth.tsx` | Pantallas de login, verificación, recuperación y contraseña nueva (de los dos paneles) |
| `src/app/admin/{verificar,recuperar,restablecer}/page.tsx` | Pantallas del panel del cliente |
| `src/app/master/layout.tsx`, `page.tsx`, `{login,verificar,recuperar,restablecer}/page.tsx` | Área master |
| `supabase/migrations/0011_login_dos_pasos.sql` | `codigos_login`, `dispositivos_confiables`, `pedidos_recuperacion` |
| `scripts/crear-master.mjs` | Crea o confirma el usuario master |
| `scripts/e2e-login.mjs` | Prueba de punta a punta del login contra el servidor (dev o Docker) |

**Reescritos completos:** `src/proxy.ts`, `src/lib/supabase/middleware.ts`, `src/lib/tenant/admin.ts`, `src/app/admin/layout.tsx` y `src/app/admin/login/page.tsx`.

**Modificados puntualmente:**
- `src/lib/tenant/estilo.ts` (exporta `esColorHex`).
- `src/lib/tenant/permisos.ts` (+test) y `src/lib/tenant/urls.ts` (+test).
- `scripts/test-aislamiento.mjs` y `.env.example`.

**Borrado:** `src/app/admin/actions.ts`.

**Commits:** cada task compila (`tsc`) y pasa los tests por su cuenta, y termina en su propio commit. Entre las Tasks 9 y 11 el login funciona a medias: las pantallas nuevas existen, pero el proxy todavía no exige la verificación. Recién la Task 11 lo cierra. **No usar `git add -A`:** `docs/resumen-arquitectura-y-desarrollo.md` tiene cambios previos de Pablo, y `.env.local` nunca se agrega.

Formato de todos los commits:

```bash
git commit -F - <<'EOF'
<tipo>(<alcance>): <descripción>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 1: Códigos de login

**Files:**
- Create: `src/lib/auth/codigos.ts`, `src/lib/auth/codigos.test.ts`

- [ ] **Step 1: Test que falla**

Crear `src/lib/auth/codigos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ESPERA_REENVIO_MS,
  MAX_CODIGOS_POR_HORA,
  MAX_INTENTOS,
  VIGENCIA_CODIGO_MS,
  estadoCodigo,
  generarCodigo,
  hashCodigo,
  mismoHash,
  normalizarCodigo,
  permisoEnvio,
  vencimientoCodigo,
} from "./codigos";

const SECRETO = "s".repeat(43);
const AHORA = new Date("2026-10-12T15:00:00Z");
const segundosAntes = (s: number) => new Date(AHORA.getTime() - s * 1000);

describe("constantes del spec", () => {
  it("10 minutos, 5 intentos, reenvío a los 60 s y 5 códigos por hora", () => {
    expect(VIGENCIA_CODIGO_MS).toBe(10 * 60 * 1000);
    expect(MAX_INTENTOS).toBe(5);
    expect(ESPERA_REENVIO_MS).toBe(60 * 1000);
    expect(MAX_CODIGOS_POR_HORA).toBe(5);
  });
});

describe("generarCodigo", () => {
  it("son siempre 6 dígitos (con ceros a la izquierda)", () => {
    for (let i = 0; i < 500; i++) expect(generarCodigo()).toMatch(/^\d{6}$/);
  });

  it("no se repite", () => {
    const codigos = new Set(Array.from({ length: 50 }, () => generarCodigo()));
    expect(codigos.size).toBeGreaterThan(45);
  });
});

describe("normalizarCodigo", () => {
  it("acepta espacios y guiones", () => {
    expect(normalizarCodigo("123456")).toBe("123456");
    expect(normalizarCodigo(" 123 456 ")).toBe("123456");
    expect(normalizarCodigo("123-456")).toBe("123456");
  });

  it("rechaza lo que no son 6 dígitos", () => {
    expect(normalizarCodigo("12345")).toBeNull();
    expect(normalizarCodigo("1234567")).toBeNull();
    expect(normalizarCodigo("12a456")).toBeNull();
    expect(normalizarCodigo("")).toBeNull();
  });
});

describe("hashCodigo", () => {
  it("es determinístico y no contiene el código", () => {
    const h = hashCodigo(SECRETO, "user-1", "123456");
    expect(h).toBe(hashCodigo(SECRETO, "user-1", "123456"));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("123456");
  });

  it("depende del usuario y del secreto", () => {
    const h = hashCodigo(SECRETO, "user-1", "123456");
    expect(hashCodigo(SECRETO, "user-2", "123456")).not.toBe(h);
    expect(hashCodigo("t".repeat(43), "user-1", "123456")).not.toBe(h);
  });
});

describe("mismoHash", () => {
  it("compara en tiempo constante, también con largos distintos", () => {
    const h = hashCodigo(SECRETO, "user-1", "123456");
    expect(mismoHash(h, h)).toBe(true);
    expect(mismoHash(h, hashCodigo(SECRETO, "user-1", "654321"))).toBe(false);
    expect(mismoHash(h, h.slice(0, 10))).toBe(false);
  });
});

describe("estadoCodigo", () => {
  const vigente = { expira_en: new Date(AHORA.getTime() + 60_000).toISOString(), intentos: 0, usado_en: null };

  it("vigente mientras no venza, no se agoten los intentos ni se use", () => {
    expect(estadoCodigo(vigente, AHORA)).toBe("vigente");
    expect(estadoCodigo({ ...vigente, intentos: MAX_INTENTOS - 1 }, AHORA)).toBe("vigente");
  });

  it("vencido al llegar a expira_en", () => {
    expect(estadoCodigo({ ...vigente, expira_en: AHORA.toISOString() }, AHORA)).toBe("vencido");
  });

  it("agotado con 5 intentos", () => {
    expect(estadoCodigo({ ...vigente, intentos: MAX_INTENTOS }, AHORA)).toBe("agotado");
  });

  it("usado gana a todo lo demás", () => {
    expect(
      estadoCodigo({ expira_en: AHORA.toISOString(), intentos: MAX_INTENTOS, usado_en: AHORA.toISOString() }, AHORA),
    ).toBe("usado");
  });
});

describe("permisoEnvio", () => {
  it("permite el primero", () => {
    expect(permisoEnvio(null, 0, AHORA)).toEqual({ ok: true });
  });

  it("pide esperar hasta 60 s desde el último", () => {
    expect(permisoEnvio(segundosAntes(30), 1, AHORA)).toEqual({ ok: false, motivo: "espera", segundos: 30 });
    expect(permisoEnvio(segundosAntes(60), 1, AHORA)).toEqual({ ok: true });
  });

  it("corta en 5 códigos por hora", () => {
    expect(permisoEnvio(segundosAntes(600), MAX_CODIGOS_POR_HORA - 1, AHORA)).toEqual({ ok: true });
    expect(permisoEnvio(segundosAntes(600), MAX_CODIGOS_POR_HORA, AHORA)).toEqual({ ok: false, motivo: "limite" });
  });
});

describe("vencimientoCodigo", () => {
  it("es 10 minutos después", () => {
    expect(vencimientoCodigo(AHORA).toISOString()).toBe("2026-10-12T15:10:00.000Z");
  });
});
```

Run: `npx vitest run src/lib/auth/codigos`
Expected: FAIL, `Failed to resolve import "./codigos"`.

- [ ] **Step 2: Crear `src/lib/auth/codigos.ts`**

```ts
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/** Reglas del código de 6 dígitos del login (spec 6.3). Puro: la base la maneja servicio.ts. */
export const VIGENCIA_CODIGO_MS = 10 * 60 * 1000;
export const MAX_INTENTOS = 5;
export const ESPERA_REENVIO_MS = 60 * 1000;
export const MAX_CODIGOS_POR_HORA = 5;

export function generarCodigo(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** "123 456" o "123-456" → "123456". null si no son 6 dígitos. */
export function normalizarCodigo(entrada: string): string | null {
  const digitos = entrada.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digitos) ? digitos : null;
}

/** HMAC-SHA256 del código, ligado al usuario: el mismo código de otro usuario da otro hash. */
export function hashCodigo(secreto: string, userId: string, codigo: string): string {
  return createHmac("sha256", secreto).update(`codigo-login|${userId}|${codigo}`).digest("hex");
}

/** Comparación en tiempo constante. */
export function mismoHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

export type FilaCodigo = { expira_en: string; intentos: number; usado_en: string | null };
export type EstadoCodigo = "vigente" | "vencido" | "agotado" | "usado";

export function estadoCodigo(fila: FilaCodigo, ahora: Date): EstadoCodigo {
  if (fila.usado_en) return "usado";
  if (new Date(fila.expira_en).getTime() <= ahora.getTime()) return "vencido";
  if (fila.intentos >= MAX_INTENTOS) return "agotado";
  return "vigente";
}

/** Resultado de comprobar un código ingresado (servicio.ts). */
export type ResultadoCodigo =
  | "ok"
  | "incorrecto"
  | "reintentar"
  | "sin_codigo"
  | Exclude<EstadoCodigo, "vigente">;

export type PermisoEnvio =
  | { ok: true }
  | { ok: false; motivo: "espera"; segundos: number }
  | { ok: false; motivo: "limite" };

/** ¿Se puede generar y enviar otro código? Último envío y cantidad en la última hora. */
export function permisoEnvio(ultimoCreadoEn: Date | null, enLaUltimaHora: number, ahora: Date): PermisoEnvio {
  if (enLaUltimaHora >= MAX_CODIGOS_POR_HORA) return { ok: false, motivo: "limite" };
  if (ultimoCreadoEn) {
    const falta = ultimoCreadoEn.getTime() + ESPERA_REENVIO_MS - ahora.getTime();
    if (falta > 0) return { ok: false, motivo: "espera", segundos: Math.ceil(falta / 1000) };
  }
  return { ok: true };
}

export function vencimientoCodigo(ahora: Date): Date {
  return new Date(ahora.getTime() + VIGENCIA_CODIGO_MS);
}
```

- [ ] **Step 3: Verificar**

```bash
npx vitest run src/lib/auth/codigos
npx tsc --noEmit
```

Expected: PASS de todos los tests de `codigos` y `tsc` sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/codigos.ts src/lib/auth/codigos.test.ts
git commit -F - <<'EOF'
feat(auth): códigos de login de 6 dígitos con HMAC, vencimiento, intentos y reenvío

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Cookie `mfa`, dispositivo recordado y opciones de cookie

**Files:**
- Create: `src/lib/auth/cookie-mfa.ts`, `src/lib/auth/cookie-mfa.test.ts`, `src/lib/auth/dispositivo.ts`, `src/lib/auth/dispositivo.test.ts`, `src/lib/auth/cookies.ts`, `src/lib/auth/cookies.test.ts`

- [ ] **Step 1: Tests que fallan**

Crear `src/lib/auth/cookie-mfa.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { COOKIE_MFA, firmarMfa, secretoMfaValido, verificarMfa } from "./cookie-mfa";

const SECRETO = "s".repeat(43);

describe("secretoMfaValido", () => {
  it("exige al menos 32 caracteres", () => {
    expect(secretoMfaValido(SECRETO)).toBe(true);
    expect(secretoMfaValido("corto")).toBe(false);
    expect(secretoMfaValido(undefined)).toBe(false);
  });
});

describe("cookie mfa", () => {
  it("se llama mfa y lleva versión", () => {
    expect(COOKIE_MFA).toBe("mfa");
    expect(firmarMfa(SECRETO, "user-1", "sesion-1")).toMatch(/^v1\.[A-Za-z0-9_-]{43}$/);
  });

  it("vale para el mismo usuario y la misma sesión", () => {
    const valor = firmarMfa(SECRETO, "user-1", "sesion-1");
    expect(verificarMfa(SECRETO, valor, "user-1", "sesion-1")).toBe(true);
  });

  it("una sesión nueva (otro session_id) la invalida", () => {
    const valor = firmarMfa(SECRETO, "user-1", "sesion-1");
    expect(verificarMfa(SECRETO, valor, "user-1", "sesion-2")).toBe(false);
  });

  it("no sirve para otro usuario ni con otro secreto", () => {
    const valor = firmarMfa(SECRETO, "user-1", "sesion-1");
    expect(verificarMfa(SECRETO, valor, "user-2", "sesion-1")).toBe(false);
    expect(verificarMfa("t".repeat(43), valor, "user-1", "sesion-1")).toBe(false);
  });

  it("rechaza valores alterados, vacíos o sin datos de sesión", () => {
    const valor = firmarMfa(SECRETO, "user-1", "sesion-1");
    expect(verificarMfa(SECRETO, `${valor.slice(0, -2)}xx`, "user-1", "sesion-1")).toBe(false);
    expect(verificarMfa(SECRETO, "v1.", "user-1", "sesion-1")).toBe(false);
    expect(verificarMfa(SECRETO, undefined, "user-1", "sesion-1")).toBe(false);
    expect(verificarMfa(SECRETO, valor, undefined, "sesion-1")).toBe(false);
    expect(verificarMfa(SECRETO, valor, "user-1", undefined)).toBe(false);
  });

  it("sin secreto válido no verifica nada (falla cerrado)", () => {
    const valor = firmarMfa(SECRETO, "user-1", "sesion-1");
    expect(verificarMfa(undefined, valor, "user-1", "sesion-1")).toBe(false);
    expect(verificarMfa("corto", valor, "user-1", "sesion-1")).toBe(false);
  });
});
```

Crear `src/lib/auth/dispositivo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  COOKIE_DISPOSITIVO,
  VIGENCIA_DISPOSITIVO_MS,
  dispositivoVigente,
  generarTokenDispositivo,
  hashToken,
  tokenConFormato,
  vencimientoDispositivo,
} from "./dispositivo";

const AHORA = new Date("2026-10-12T15:00:00Z");

describe("token del dispositivo", () => {
  it("es aleatorio, de 32 bytes en base64url", () => {
    const a = generarTokenDispositivo();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generarTokenDispositivo()).not.toBe(a);
    expect(tokenConFormato(a)).toBe(true);
  });

  it("rechaza tokens con otro formato", () => {
    expect(tokenConFormato("")).toBe(false);
    expect(tokenConFormato("abc")).toBe(false);
    expect(tokenConFormato(`${"a".repeat(42)}=`)).toBe(false);
  });

  it("en la base se guarda solo su hash", () => {
    const token = generarTokenDispositivo();
    const h = hashToken(token);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(hashToken(token));
    expect(h).not.toContain(token);
  });

  it("la cookie se llama dispositivo", () => {
    expect(COOKIE_DISPOSITIVO).toBe("dispositivo");
  });
});

describe("dispositivoVigente", () => {
  it("dura 30 días", () => {
    expect(VIGENCIA_DISPOSITIVO_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(vencimientoDispositivo(AHORA).toISOString()).toBe("2026-11-11T15:00:00.000Z");
  });

  it("vale hasta que vence", () => {
    expect(dispositivoVigente({ expira_en: "2026-10-13T00:00:00Z" }, AHORA)).toBe(true);
    expect(dispositivoVigente({ expira_en: AHORA.toISOString() }, AHORA)).toBe(false);
    expect(dispositivoVigente({ expira_en: "2026-10-01T00:00:00Z" }, AHORA)).toBe(false);
  });

  it("revocado (la fila ya no existe) no vale", () => {
    expect(dispositivoVigente(null, AHORA)).toBe(false);
  });
});
```

Crear `src/lib/auth/cookies.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DURACION_COOKIE_S, opcionesCookieAuth } from "./cookies";

describe("opcionesCookieAuth", () => {
  it("httpOnly, SameSite=Lax y path /", () => {
    expect(opcionesCookieAuth("http", 60)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });
  });

  it("Secure solo con https", () => {
    expect(opcionesCookieAuth("https", 60).secure).toBe(true);
  });

  it("las cookies de auth duran 30 días", () => {
    expect(DURACION_COOKIE_S).toBe(2_592_000);
  });
});
```

Run: `npx vitest run src/lib/auth`
Expected: FAIL en los 3 archivos nuevos, `Failed to resolve import`.

- [ ] **Step 2: Crear `src/lib/auth/cookie-mfa.ts`**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cookie que marca la sesión como verificada con el segundo factor. La usa el proxy
 * (runtime Node.js), así que este módulo no importa server-only.
 */
export const COOKIE_MFA = "mfa";

/** 32 bytes aleatorios en base64url son 43 caracteres. */
export const LARGO_MINIMO_SECRETO = 32;
const VERSION = "v1";

export function secretoMfaValido(secreto: string | undefined): secreto is string {
  return typeof secreto === "string" && secreto.length >= LARGO_MINIMO_SECRETO;
}

/**
 * Valor de la cookie: HMAC sobre el usuario y el session_id del JWT de Supabase. Otra
 * sesión (un login nuevo, o después de cerrar sesión) tiene otro session_id: la cookie
 * deja de valer.
 */
export function firmarMfa(secreto: string, userId: string, sessionId: string): string {
  const firma = createHmac("sha256", secreto).update(`mfa|${userId}|${sessionId}`).digest("base64url");
  return `${VERSION}.${firma}`;
}

export function verificarMfa(
  secreto: string | undefined,
  valor: string | undefined,
  userId: string | undefined,
  sessionId: string | undefined,
): boolean {
  if (!secretoMfaValido(secreto) || !valor || !userId || !sessionId) return false;
  const esperado = Buffer.from(firmarMfa(secreto, userId, sessionId));
  const recibido = Buffer.from(valor);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}
```

- [ ] **Step 3: Crear `src/lib/auth/dispositivo.ts`**

```ts
import { createHash, randomBytes } from "node:crypto";

/** "Recordar este dispositivo por 30 días": token en la cookie, su hash en la base. */
export const COOKIE_DISPOSITIVO = "dispositivo";
export const VIGENCIA_DISPOSITIVO_MS = 30 * 24 * 60 * 60 * 1000;

export function generarTokenDispositivo(): string {
  return randomBytes(32).toString("base64url");
}

/** El token tiene 256 bits aleatorios: alcanza un SHA-256 (sin secreto) para guardarlo. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenConFormato(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** null = no existe o fue revocado (se borró la fila). */
export function dispositivoVigente(fila: { expira_en: string } | null, ahora: Date): boolean {
  return !!fila && new Date(fila.expira_en).getTime() > ahora.getTime();
}

export function vencimientoDispositivo(ahora: Date): Date {
  return new Date(ahora.getTime() + VIGENCIA_DISPOSITIVO_MS);
}
```

- [ ] **Step 4: Crear `src/lib/auth/cookies.ts`**

```ts
import { VIGENCIA_DISPOSITIVO_MS } from "./dispositivo";

/** Duración de las cookies mfa y dispositivo (la mfa además muere con la sesión). */
export const DURACION_COOKIE_S = VIGENCIA_DISPOSITIVO_MS / 1000;

export type OpcionesCookie = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

/** httpOnly y SameSite=Lax siempre; Secure solo con https (en desarrollo es http). */
export function opcionesCookieAuth(protocolo: string, maxAgeSegundos: number): OpcionesCookie {
  return { httpOnly: true, secure: protocolo === "https", sameSite: "lax", path: "/", maxAge: maxAgeSegundos };
}

/** Mismo criterio que urlDelTenant: https salvo que el .env diga otra cosa. */
export function protocoloPlataforma(): string {
  return process.env.PLATFORM_PROTOCOLO || "https";
}
```

- [ ] **Step 5: Verificar**

```bash
npx vitest run src/lib/auth
npx tsc --noEmit
```

Expected: PASS de `codigos`, `cookie-mfa`, `dispositivo` y `cookies`, y `tsc` sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/cookie-mfa.ts src/lib/auth/cookie-mfa.test.ts src/lib/auth/dispositivo.ts src/lib/auth/dispositivo.test.ts src/lib/auth/cookies.ts src/lib/auth/cookies.test.ts
git commit -F - <<'EOF'
feat(auth): cookie mfa ligada a la sesión y dispositivos recordados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Rutas protegidas, permisos por área y URL del master

**Files:**
- Create: `src/lib/auth/rutas.ts`, `src/lib/auth/rutas.test.ts`
- Modify: `src/lib/tenant/permisos.ts`, `src/lib/tenant/permisos.test.ts`, `src/lib/tenant/urls.ts`, `src/lib/tenant/urls.test.ts`

- [ ] **Step 1: Tests que fallan**

Crear `src/lib/auth/rutas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { RUTAS_AUTH, decidirAcceso, rutaDelArea, rutaRelativa } from "./rutas";

describe("rutaDelArea", () => {
  it("el panel del cliente vive bajo /admin", () => {
    expect(rutaDelArea("tenant", "/")).toBe("/admin");
    expect(rutaDelArea("tenant", RUTAS_AUTH.login)).toBe("/admin/login");
  });

  it("el master vive en la raíz de app.", () => {
    expect(rutaDelArea("master", "/")).toBe("/");
    expect(rutaDelArea("master", RUTAS_AUTH.verificar)).toBe("/verificar");
  });
});

describe("rutaRelativa", () => {
  it("quita /admin en el panel del cliente", () => {
    expect(rutaRelativa("tenant", "/admin")).toBe("/");
    expect(rutaRelativa("tenant", "/admin/login")).toBe("/login");
    expect(rutaRelativa("tenant", "/admin/cursos/1")).toBe("/cursos/1");
  });

  it("deja igual la del master", () => {
    expect(rutaRelativa("master", "/")).toBe("/");
    expect(rutaRelativa("master", "/restablecer")).toBe("/restablecer");
  });
});

describe("decidirAcceso", () => {
  const sinSesion = { haySesion: false, mfaValida: false };
  const sinCodigo = { haySesion: true, mfaValida: false };
  const verificada = { haySesion: true, mfaValida: true };

  it("recuperar y restablecer están siempre abiertas", () => {
    for (const ruta of [RUTAS_AUTH.recuperar, RUTAS_AUTH.restablecer]) {
      for (const estado of [sinSesion, sinCodigo, verificada]) {
        expect(decidirAcceso(ruta, estado)).toEqual({ tipo: "seguir" });
      }
    }
  });

  it("login: abierto, salvo que ya esté todo verificado", () => {
    expect(decidirAcceso(RUTAS_AUTH.login, sinSesion)).toEqual({ tipo: "seguir" });
    expect(decidirAcceso(RUTAS_AUTH.login, sinCodigo)).toEqual({ tipo: "seguir" });
    expect(decidirAcceso(RUTAS_AUTH.login, verificada)).toEqual({ tipo: "redirigir", a: "/" });
  });

  it("verificar: exige sesión y no tiene sentido ya verificado", () => {
    expect(decidirAcceso(RUTAS_AUTH.verificar, sinSesion)).toEqual({ tipo: "redirigir", a: "/login" });
    expect(decidirAcceso(RUTAS_AUTH.verificar, sinCodigo)).toEqual({ tipo: "seguir" });
    expect(decidirAcceso(RUTAS_AUTH.verificar, verificada)).toEqual({ tipo: "redirigir", a: "/" });
  });

  it("el resto exige sesión y código", () => {
    for (const ruta of ["/", "/cursos", "/cursos/1/video-preview"]) {
      expect(decidirAcceso(ruta, sinSesion)).toEqual({ tipo: "redirigir", a: "/login" });
      expect(decidirAcceso(ruta, sinCodigo)).toEqual({ tipo: "redirigir", a: "/verificar" });
      expect(decidirAcceso(ruta, verificada)).toEqual({ tipo: "seguir" });
    }
  });

  it("una cookie mfa sin sesión no alcanza", () => {
    expect(decidirAcceso("/", { haySesion: false, mfaValida: true })).toEqual({ tipo: "redirigir", a: "/login" });
  });
});
```

Agregar al final de `src/lib/tenant/permisos.test.ts`:

```ts
describe("perfilPermitidoEnArea", () => {
  it("al área master solo entra el master", () => {
    expect(perfilPermitidoEnArea({ rol: "master", tenant_id: null }, { tipo: "master" })).toBe(true);
    expect(perfilPermitidoEnArea({ rol: "cliente", tenant_id: "T1" }, { tipo: "master" })).toBe(false);
    expect(perfilPermitidoEnArea(null, { tipo: "master" })).toBe(false);
  });

  it("al panel de un tenant entran su cliente y el master", () => {
    const area = { tipo: "tenant", tenantId: "T1" } as const;
    expect(perfilPermitidoEnArea({ rol: "cliente", tenant_id: "T1" }, area)).toBe(true);
    expect(perfilPermitidoEnArea({ rol: "cliente", tenant_id: "T2" }, area)).toBe(false);
    expect(perfilPermitidoEnArea({ rol: "master", tenant_id: null }, area)).toBe(true);
    expect(perfilPermitidoEnArea(null, area)).toBe(false);
  });
});
```

Y en su import, cambiar:

```ts
import { perfilAutorizado } from "./permisos";
```

por:

```ts
import { perfilAutorizado, perfilPermitidoEnArea } from "./permisos";
```

En `src/lib/tenant/urls.test.ts`, cambiar el import:

```ts
import { urlDelTenant, whatsappLink } from "./urls";
```

por:

```ts
import { urlDelTenant, urlMaster, whatsappLink } from "./urls";
```

y agregar al final:

```ts
describe("urlMaster", () => {
  it("es el subdominio app. de la plataforma", () => {
    expect(urlMaster({ dominio: "tuproducto.com", protocolo: "https" })).toBe("https://app.tuproducto.com");
    expect(urlMaster({ dominio: "localhost:3000", protocolo: "http" })).toBe("http://app.localhost:3000");
  });
});
```

Run: `npx vitest run src/lib/auth/rutas src/lib/tenant/permisos src/lib/tenant/urls`
Expected: FAIL (`./rutas` no existe; `perfilPermitidoEnArea` y `urlMaster` no son funciones).

- [ ] **Step 2: Crear `src/lib/auth/rutas.ts`**

```ts
/**
 * Rutas del login por área. El panel del cliente vive en <slug>.<dominio>/admin/… y el
 * master en la raíz de app.<dominio> (el proxy lo reescribe a /master/…). Puro: lo usa
 * el proxy.
 */
export type TipoArea = "tenant" | "master";

const BASES: Record<TipoArea, string> = { tenant: "/admin", master: "" };

/** Rutas relativas al área (las que no exigen la verificación completa). */
export const RUTAS_AUTH = {
  login: "/login",
  verificar: "/verificar",
  recuperar: "/recuperar",
  restablecer: "/restablecer",
} as const;

/** Ruta que ve el navegador: ("tenant", "/login") → "/admin/login"; ("master", "/") → "/". */
export function rutaDelArea(tipo: TipoArea, ruta: string): string {
  const base = BASES[tipo];
  if (ruta === "/") return base || "/";
  return `${base}${ruta}`;
}

/** Ruta relativa al área: ("tenant", "/admin/login") → "/login"; ("tenant", "/admin") → "/". */
export function rutaRelativa(tipo: TipoArea, pathname: string): string {
  const relativa = pathname.slice(BASES[tipo].length);
  return relativa === "" ? "/" : relativa;
}

export type Decision = { tipo: "seguir" } | { tipo: "redirigir"; a: string };

/** Qué hace el proxy con un request a una ruta del área (relativa) según la sesión. */
export function decidirAcceso(ruta: string, estado: { haySesion: boolean; mfaValida: boolean }): Decision {
  const verificada = estado.haySesion && estado.mfaValida;
  if (ruta === RUTAS_AUTH.recuperar || ruta === RUTAS_AUTH.restablecer) return { tipo: "seguir" };
  if (ruta === RUTAS_AUTH.login) return verificada ? { tipo: "redirigir", a: "/" } : { tipo: "seguir" };
  if (!estado.haySesion) return { tipo: "redirigir", a: RUTAS_AUTH.login };
  if (ruta === RUTAS_AUTH.verificar) return verificada ? { tipo: "redirigir", a: "/" } : { tipo: "seguir" };
  return verificada ? { tipo: "seguir" } : { tipo: "redirigir", a: RUTAS_AUTH.verificar };
}
```

- [ ] **Step 3: `perfilPermitidoEnArea` en `src/lib/tenant/permisos.ts`**

Agregar al final del archivo:

```ts
export type AreaPerfil = { tipo: "master" } | { tipo: "tenant"; tenantId: string };

/** ¿Puede este perfil entrar a esta área? Al master, solo el master; al panel de un tenant, su cliente o el master. */
export function perfilPermitidoEnArea(perfil: Perfil | null, area: AreaPerfil): boolean {
  if (area.tipo === "master") return perfil?.rol === "master";
  return perfilAutorizado(perfil, area.tenantId);
}
```

- [ ] **Step 4: `urlMaster` en `src/lib/tenant/urls.ts`**

Agregar debajo de `urlDelTenant`:

```ts
/** URL del panel master (links de los emails de login del master). */
export function urlMaster(cfg: ConfigUrl = configUrl()): string {
  return `${cfg.protocolo}://app.${cfg.dominio}`;
}
```

- [ ] **Step 5: Verificar**

```bash
npx vitest run src/lib/auth src/lib/tenant
npx tsc --noEmit
```

Expected: todos en PASS y `tsc` sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/rutas.ts src/lib/auth/rutas.test.ts src/lib/tenant/permisos.ts src/lib/tenant/permisos.test.ts src/lib/tenant/urls.ts src/lib/tenant/urls.test.ts
git commit -F - <<'EOF'
feat(auth): reglas de acceso por área (panel del cliente y master)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Regla de envío, recuperación y mensajes

**Files:**
- Create: `src/lib/auth/envio.ts`, `src/lib/auth/envio.test.ts`, `src/lib/auth/recuperacion.ts`, `src/lib/auth/recuperacion.test.ts`, `src/lib/auth/mensajes.ts`, `src/lib/auth/mensajes.test.ts`

- [ ] **Step 1: Tests que fallan**

Crear `src/lib/auth/envio.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { modoEnvio } from "./envio";

describe("modoEnvio", () => {
  it("con la cuenta de la plataforma configurada, por SMTP (en cualquier entorno)", () => {
    expect(modoEnvio({ configurado: true, produccion: true })).toBe("smtp");
    expect(modoEnvio({ configurado: true, produccion: false })).toBe("smtp");
  });

  it("sin cuenta en desarrollo, a la consola del servidor", () => {
    expect(modoEnvio({ configurado: false, produccion: false })).toBe("consola");
  });

  it("sin cuenta en producción, bloqueado: nunca se saltea el segundo factor", () => {
    expect(modoEnvio({ configurado: false, produccion: true })).toBe("bloqueado");
  });
});
```

Crear `src/lib/auth/recuperacion.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  LARGO_MINIMO_CONTRASENA,
  MAX_RECUPERACIONES_POR_EMAIL,
  MAX_RECUPERACIONES_POR_IP,
  hashEmail,
  normalizarEmail,
  recuperacionPermitida,
  validarNuevaContrasena,
} from "./recuperacion";

describe("normalizarEmail", () => {
  it("minúsculas y sin espacios", () => {
    expect(normalizarEmail("  Gisel@Example.COM ")).toBe("gisel@example.com");
  });

  it("rechaza lo que no parece un email", () => {
    expect(normalizarEmail("")).toBeNull();
    expect(normalizarEmail("gisel")).toBeNull();
    expect(normalizarEmail("gisel@example")).toBeNull();
    expect(normalizarEmail("gi sel@example.com")).toBeNull();
    expect(normalizarEmail(`${"a".repeat(250)}@example.com`)).toBeNull();
  });
});

describe("hashEmail", () => {
  it("SHA-256 en hex, sin el email en claro", () => {
    const h = hashEmail("gisel@example.com");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(hashEmail("gisel@example.com"));
    expect(h).not.toContain("gisel");
  });
});

describe("recuperacionPermitida", () => {
  it("3 pedidos por email y 10 por IP por hora", () => {
    expect(MAX_RECUPERACIONES_POR_EMAIL).toBe(3);
    expect(MAX_RECUPERACIONES_POR_IP).toBe(10);
    expect(recuperacionPermitida(2, 9)).toBe(true);
    expect(recuperacionPermitida(3, 0)).toBe(false);
    expect(recuperacionPermitida(0, 10)).toBe(false);
  });
});

describe("validarNuevaContrasena", () => {
  it("exige un largo mínimo y que coincidan", () => {
    const buena = "x".repeat(LARGO_MINIMO_CONTRASENA);
    expect(validarNuevaContrasena(buena, buena)).toBeNull();
    expect(validarNuevaContrasena("corta", "corta")).toBe("contrasena_corta");
    expect(validarNuevaContrasena(buena, `${buena}y`)).toBe("contrasena_distinta");
  });
});
```

Crear `src/lib/auth/mensajes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mensajeError, mensajeInfo } from "./mensajes";

describe("mensajes de las pantallas de ingreso", () => {
  it("traduce las claves conocidas", () => {
    expect(mensajeError("credenciales")).toBe("Email o contraseña incorrectos.");
    expect(mensajeError("envio_no_configurado")).toBe("El envío de códigos no está configurado.");
    expect(mensajeInfo("codigo_enviado")).toContain("código");
  });

  it("no muestra textos arbitrarios de la URL", () => {
    expect(mensajeError(undefined)).toBeNull();
    expect(mensajeError("<script>alert(1)</script>")).toBeNull();
    expect(mensajeError("toString")).toBeNull();
    expect(mensajeInfo("constructor")).toBeNull();
  });

  it("cada error de código y de envío tiene su mensaje", () => {
    const claves = [
      "incorrecto", "reintentar", "sin_codigo", "vencido", "agotado", "usado", "formato",
      "espera", "limite", "envio_fallo", "envio_no_configurado", "envio_emails_no_configurado",
      "sitio", "email", "link", "contrasena_corta", "contrasena_distinta", "contrasena_rechazada",
    ];
    for (const clave of claves) expect(mensajeError(clave), clave).toBeTruthy();
    for (const clave of ["codigo_enviado", "reenviado", "recuperacion_enviada", "contrasena_cambiada"]) {
      expect(mensajeInfo(clave), clave).toBeTruthy();
    }
  });
});
```

Run: `npx vitest run src/lib/auth`
Expected: FAIL en `envio`, `recuperacion` y `mensajes` (no existen).

- [ ] **Step 2: Crear `src/lib/auth/envio.ts`**

```ts
/** Cómo salen los emails de login y de contraseña. */
export type ModoEnvio = "smtp" | "consola" | "bloqueado";

/**
 * Con la cuenta de la plataforma configurada, por SMTP. Sin ella, en desarrollo el
 * código se imprime en la consola del servidor y el login sigue; en producción el login
 * falla cerrado. Nunca se saltea el segundo factor.
 */
export function modoEnvio(estado: { configurado: boolean; produccion: boolean }): ModoEnvio {
  if (estado.configurado) return "smtp";
  return estado.produccion ? "bloqueado" : "consola";
}
```

- [ ] **Step 3: Crear `src/lib/auth/recuperacion.ts`**

```ts
import { createHash } from "node:crypto";

/** Recuperación de contraseña: límites por hora y validación de la contraseña nueva. */
export const LARGO_MINIMO_CONTRASENA = 8;
export const MAX_RECUPERACIONES_POR_EMAIL = 3;
export const MAX_RECUPERACIONES_POR_IP = 10;

export function normalizarEmail(entrada: string): string | null {
  const email = entrada.trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** Para contar pedidos sin guardar emails en claro (también los de cuentas que no existen). */
export function hashEmail(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

export function recuperacionPermitida(enLaHoraPorEmail: number, enLaHoraPorIp: number): boolean {
  return enLaHoraPorEmail < MAX_RECUPERACIONES_POR_EMAIL && enLaHoraPorIp < MAX_RECUPERACIONES_POR_IP;
}

export type ProblemaContrasena = "contrasena_corta" | "contrasena_distinta";

export function validarNuevaContrasena(clave: string, confirmacion: string): ProblemaContrasena | null {
  if (clave.length < LARGO_MINIMO_CONTRASENA) return "contrasena_corta";
  if (clave !== confirmacion) return "contrasena_distinta";
  return null;
}
```

- [ ] **Step 4: Crear `src/lib/auth/mensajes.ts`**

```ts
import { LARGO_MINIMO_CONTRASENA } from "./recuperacion";

/**
 * Textos de las pantallas de ingreso (en español: son parte del panel, que se traduce en
 * la etapa C). La URL lleva solo la clave (?error=credenciales): un texto que no está
 * acá no se muestra.
 */
const ERRORES: Record<string, string> = {
  credenciales: "Email o contraseña incorrectos.",
  sitio: "Este sitio no está disponible.",
  envio_no_configurado: "El envío de códigos no está configurado.",
  envio_emails_no_configurado: "El envío de emails no está configurado.",
  envio_fallo: "No pudimos enviar el código. Probá de nuevo en unos minutos.",
  espera: "Esperá un minuto antes de pedir otro código.",
  limite: "Pediste demasiados códigos. Probá de nuevo en una hora.",
  formato: "El código tiene 6 números.",
  incorrecto: "El código no es correcto.",
  vencido: "El código venció. Pedí uno nuevo.",
  agotado: "Agotaste los intentos. Pedí un código nuevo.",
  usado: "Ese código ya se usó. Pedí uno nuevo.",
  sin_codigo: "Pedí un código para continuar.",
  reintentar: "No pudimos verificar el código. Probá de nuevo.",
  email: "Ingresá un email válido.",
  link: "El link no es válido o ya venció. Pedí uno nuevo.",
  contrasena_corta: `La contraseña tiene que tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
  contrasena_distinta: "Las contraseñas no coinciden.",
  contrasena_rechazada:
    "No pudimos guardar esa contraseña (puede ser muy débil o igual a la anterior). Pedí un link nuevo y probá con otra.",
};

const INFOS: Record<string, string> = {
  codigo_enviado: "Te enviamos un código de 6 números a tu email.",
  reenviado: "Te enviamos un código nuevo.",
  recuperacion_enviada:
    "Si el email corresponde a una cuenta, te enviamos un link para elegir una contraseña nueva. Revisá también el correo no deseado.",
  contrasena_cambiada: "Listo, tu contraseña cambió. Ya podés ingresar.",
};

function buscar(tabla: Record<string, string>, clave: string | undefined): string | null {
  return clave !== undefined && Object.prototype.hasOwnProperty.call(tabla, clave) ? tabla[clave] : null;
}

export function mensajeError(clave: string | undefined): string | null {
  return buscar(ERRORES, clave);
}

export function mensajeInfo(clave: string | undefined): string | null {
  return buscar(INFOS, clave);
}
```

- [ ] **Step 5: Verificar**

```bash
npx vitest run src/lib/auth
npx tsc --noEmit
```

Expected: todos en PASS y `tsc` sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/envio.ts src/lib/auth/envio.test.ts src/lib/auth/recuperacion.ts src/lib/auth/recuperacion.test.ts src/lib/auth/mensajes.ts src/lib/auth/mensajes.test.ts
git commit -F - <<'EOF'
feat(auth): regla de envío de códigos, límites de recuperación y mensajes del login

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Layout de email con la marca y plantillas de login

**Files:**
- Create: `src/lib/plataforma.ts`, `src/lib/email/layout-marca.ts`, `src/lib/email/layout-marca.test.ts`, `src/lib/email/plantillas-auth.ts`, `src/lib/email/plantillas-auth.test.ts`
- Modify: `src/lib/tenant/estilo.ts`

- [ ] **Step 1: Tests que fallan**

Crear `src/lib/email/layout-marca.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { COLORES_PLATAFORMA } from "@/lib/plataforma";
import type { Tenant } from "@/lib/tenant/tipos";
import {
  MARCA_PLATAFORMA,
  botonMarca,
  escaparHtml,
  layoutMarca,
  logoAbsoluto,
  marcaEmailDeTenant,
  type MarcaEmail,
} from "./layout-marca";

const GISEL: MarcaEmail = {
  nombre: "Estética Gisel",
  idioma: "es",
  colores: { colorPrimario: "#c0899a", colorSecundario: "#4e5340", colorFondo: "#f6f1ea", colorTexto: "#1a1a1a" },
  logoUrl: "https://gisel.tuproducto.com/brand/horizontal-negro.png",
};

describe("escaparHtml", () => {
  it("escapa los caracteres de HTML", () => {
    expect(escaparHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("layoutMarca", () => {
  it("usa los colores, el logo y el idioma de la marca", () => {
    const html = layoutMarca(GISEL, { titulo: "Título", cuerpoHtml: "<p>Cuerpo</p>" });
    expect(html).toContain('<html lang="es-AR">');
    expect(html).toContain("background-color:#f6f1ea");
    expect(html).toContain("border-top:4px solid #c0899a");
    expect(html).toContain('src="https://gisel.tuproducto.com/brand/horizontal-negro.png"');
    expect(html).toContain("<p>Cuerpo</p>");
    expect(html).toContain("Título");
  });

  it("en portugués declara pt-BR", () => {
    expect(layoutMarca({ ...GISEL, idioma: "pt" }, { titulo: "T", cuerpoHtml: "" })).toContain('<html lang="pt-BR">');
  });

  it("sin logo muestra el nombre, escapado", () => {
    const html = layoutMarca({ ...GISEL, nombre: "<b>Spa</b>", logoUrl: null }, { titulo: "T", cuerpoHtml: "" });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;b&gt;Spa&lt;/b&gt;");
    expect(html).not.toContain("<b>Spa</b>");
  });

  it("un color inválido cae al de la plataforma (no inyecta CSS)", () => {
    const html = layoutMarca(
      { ...GISEL, colores: { ...GISEL.colores, colorPrimario: "red;background:url(x)" } },
      { titulo: "T", cuerpoHtml: "" },
    );
    expect(html).not.toContain("url(x)");
    expect(html).toContain(`border-top:4px solid ${COLORES_PLATAFORMA.colorPrimario}`);
  });
});

describe("botonMarca", () => {
  it("escapa el link y usa el color primario", () => {
    const html = botonMarca(GISEL, "Entrar", "https://x.com/a?b=1&c=2");
    expect(html).toContain('href="https://x.com/a?b=1&amp;c=2"');
    expect(html).toContain("background-color:#c0899a");
  });
});

describe("logoAbsoluto", () => {
  it("completa las rutas relativas con la URL del sitio", () => {
    expect(logoAbsoluto("/brand/logo.png", "https://gisel.tuproducto.com/")).toBe(
      "https://gisel.tuproducto.com/brand/logo.png",
    );
    expect(logoAbsoluto("https://cdn.x.com/l.png", "https://a.com")).toBe("https://cdn.x.com/l.png");
  });

  it("descarta lo que no es una URL utilizable", () => {
    expect(logoAbsoluto(null, "https://a.com")).toBeNull();
    expect(logoAbsoluto("//evil.com/x.png", "https://a.com")).toBeNull();
    expect(logoAbsoluto("javascript:alert(1)", "https://a.com")).toBeNull();
  });
});

describe("marcas", () => {
  it("la del tenant sale de su nombre, idioma, colores y logo", () => {
    const tenant = {
      nombre: "Studio Demo",
      idioma: "pt",
      marca: {
        colorPrimario: "#1f6f8b",
        colorSecundario: "#2d4a53",
        colorFondo: "#f2f7f9",
        colorTexto: "#102027",
        logoUrl: "/brand/demo.png",
      },
    } as unknown as Tenant;
    expect(marcaEmailDeTenant(tenant, "http://demo-br.localhost:3000")).toEqual({
      nombre: "Studio Demo",
      idioma: "pt",
      colores: { colorPrimario: "#1f6f8b", colorSecundario: "#2d4a53", colorFondo: "#f2f7f9", colorTexto: "#102027" },
      logoUrl: "http://demo-br.localhost:3000/brand/demo.png",
    });
  });

  it("la de la plataforma (master) es neutra y en español", () => {
    expect(MARCA_PLATAFORMA.idioma).toBe("es");
    expect(MARCA_PLATAFORMA.colores).toEqual(COLORES_PLATAFORMA);
    expect(MARCA_PLATAFORMA.logoUrl).toBeNull();
  });
});
```

Crear `src/lib/email/plantillas-auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { MarcaEmail } from "./layout-marca";
import { plantillaCodigoLogin, plantillaRecuperacion } from "./plantillas-auth";

const MARCA: MarcaEmail = {
  nombre: "Estética Gisel",
  idioma: "es",
  colores: { colorPrimario: "#c0899a", colorSecundario: "#4e5340", colorFondo: "#f6f1ea", colorTexto: "#1a1a1a" },
  logoUrl: null,
};

describe("plantillaCodigoLogin", () => {
  it("en español, con el código en el cuerpo y no en el asunto", () => {
    const email = plantillaCodigoLogin(MARCA, "123456");
    expect(email.asunto).toBe("Tu código de acceso a Estética Gisel");
    expect(email.asunto).not.toContain("123456");
    expect(email.html).toContain("123456");
    expect(email.html).toContain("Vence en 10 minutos.");
    expect(email.html).toContain('<html lang="es-AR">');
    expect(email.texto).toContain("123456");
  });

  it("en portugués para un tenant de Brasil", () => {
    const email = plantillaCodigoLogin({ ...MARCA, idioma: "pt", nombre: "Studio Demo" }, "654321");
    expect(email.asunto).toBe("Seu código de acesso a Studio Demo");
    expect(email.html).toContain("Expira em 10 minutos.");
    expect(email.html).toContain('<html lang="pt-BR">');
    expect(email.html).not.toContain("Vence en");
  });

  it("escapa el nombre del tenant en el HTML", () => {
    const email = plantillaCodigoLogin({ ...MARCA, nombre: "<i>Spa</i>" }, "123456");
    expect(email.html).not.toContain("<i>Spa</i>");
  });
});

describe("plantillaRecuperacion", () => {
  const LINK = "https://gisel.tuproducto.com/admin/restablecer?token_hash=abc";

  it("en español, con el link en el botón y en el texto plano", () => {
    const email = plantillaRecuperacion(MARCA, LINK);
    expect(email.asunto).toBe("Restablecé tu contraseña de Estética Gisel");
    expect(email.html).toContain(`href="${LINK}"`);
    expect(email.html).toContain("Elegir contraseña nueva");
    expect(email.texto).toContain(LINK);
  });

  it("en portugués", () => {
    const email = plantillaRecuperacion({ ...MARCA, idioma: "pt" }, LINK);
    expect(email.asunto).toBe("Redefina sua senha de Estética Gisel");
    expect(email.html).toContain("Escolher nova senha");
  });
});
```

Run: `npx vitest run src/lib/email`
Expected: FAIL en `layout-marca` y `plantillas-auth` (no existen). Los tests de `plantillas` siguen en PASS.

- [ ] **Step 2: `esColorHex` en `src/lib/tenant/estilo.ts`**

Agregar debajo de la constante `HEX`:

```ts
/** ¿Es un color hex válido? (también lo usan los emails con la marca) */
export function esColorHex(valor: string): boolean {
  return HEX.test(valor.trim());
}
```

En `estiloMarca`, reemplazar:

```ts
    if (HEX.test(valor)) estilo[VARIABLES[campo]] = valor;
```

por:

```ts
    if (esColorHex(valor)) estilo[VARIABLES[campo]] = valor;
```

- [ ] **Step 3: Crear `src/lib/plataforma.ts`**

```ts
import type { ColoresMarca } from "@/lib/tenant/estilo";

/** Nombre de la plataforma (el producto todavía no tiene nombre ni dominio definitivos). */
export const NOMBRE_PLATAFORMA = "Turnos online";

/** Paleta neutra de la plataforma: panel master y emails del master. */
export const COLORES_PLATAFORMA: ColoresMarca = {
  colorPrimario: "#3d5a80",
  colorSecundario: "#5c677d",
  colorFondo: "#f4f5f7",
  colorTexto: "#1f2933",
};
```

- [ ] **Step 4: Crear `src/lib/email/layout-marca.ts`**

```ts
import { LOCALES, type Idioma } from "@/lib/i18n/textos";
import { COLORES_PLATAFORMA, NOMBRE_PLATAFORMA } from "@/lib/plataforma";
import { esColorHex, type ColoresMarca } from "@/lib/tenant/estilo";
import type { Tenant } from "@/lib/tenant/tipos";

/**
 * Layout de email con la marca (spec 10): tablas y estilos inline, que es lo que
 * soportan los clientes de email. Lo usan los emails de login de la etapa B; la etapa D
 * pasa a usarlo en el resto de las plantillas.
 */
export type MarcaEmail = {
  nombre: string;
  idioma: Idioma;
  colores: ColoresMarca;
  /** URL absoluta del logo, o null para mostrar el nombre. */
  logoUrl: string | null;
};

export const MARCA_PLATAFORMA: MarcaEmail = {
  nombre: NOMBRE_PLATAFORMA,
  idioma: "es",
  colores: COLORES_PLATAFORMA,
  logoUrl: null,
};

const FONT_SERIF = "Georgia, 'Times New Roman', serif";
const FONT_SANS = "Helvetica, Arial, sans-serif";

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Colores listos para un style inline: un valor inválido cae al de la plataforma. */
export function coloresSeguros(colores: ColoresMarca): ColoresMarca {
  const elegir = (campo: keyof ColoresMarca) =>
    esColorHex(colores[campo]) ? colores[campo].trim() : COLORES_PLATAFORMA[campo];
  return {
    colorPrimario: elegir("colorPrimario"),
    colorSecundario: elegir("colorSecundario"),
    colorFondo: elegir("colorFondo"),
    colorTexto: elegir("colorTexto"),
  };
}

/** URL absoluta del logo. Las rutas del sitio ("/brand/x.png") se completan con su URL. */
export function logoAbsoluto(logo: string | null, urlBase: string): string | null {
  if (!logo) return null;
  if (/^https?:\/\//i.test(logo)) return logo;
  if (logo.startsWith("/") && !logo.startsWith("//")) return `${urlBase.replace(/\/+$/, "")}${logo}`;
  return null;
}

export function marcaEmailDeTenant(tenant: Tenant, urlBase: string): MarcaEmail {
  return {
    nombre: tenant.nombre,
    idioma: tenant.idioma,
    colores: {
      colorPrimario: tenant.marca.colorPrimario,
      colorSecundario: tenant.marca.colorSecundario,
      colorFondo: tenant.marca.colorFondo,
      colorTexto: tenant.marca.colorTexto,
    },
    logoUrl: logoAbsoluto(tenant.marca.logoUrl, urlBase),
  };
}

export function botonMarca(marca: MarcaEmail, texto: string, url: string): string {
  const c = coloresSeguros(marca.colores);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
      <tr>
        <td style="background-color:${c.colorPrimario}; border-radius:999px;">
          <a href="${escaparHtml(url)}" style="display:inline-block; padding:12px 28px; font-family:${FONT_SANS}; font-size:14px; font-weight:600; color:${c.colorFondo}; text-decoration:none;">${escaparHtml(texto)}</a>
        </td>
      </tr>
    </table>`;
}

/** El título y el nombre se escapan acá; cuerpoHtml lo arma (y escapa) cada plantilla. */
export function layoutMarca(marca: MarcaEmail, contenido: { titulo: string; cuerpoHtml: string }): string {
  const c = coloresSeguros(marca.colores);
  const nombre = escaparHtml(marca.nombre);
  const titulo = escaparHtml(contenido.titulo);
  const encabezado = marca.logoUrl
    ? `<img src="${escaparHtml(marca.logoUrl)}" alt="${nombre}" width="200" style="display:block; max-width:200px; height:auto; border:0;" />`
    : `<span style="font-family:${FONT_SERIF}; font-size:26px; color:${c.colorTexto};">${nombre}</span>`;
  return `<!doctype html>
<html lang="${LOCALES[marca.idioma]}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${titulo}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${c.colorFondo};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${c.colorFondo};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td align="center" style="padding-bottom:28px;">${encabezado}</td>
            </tr>
            <tr>
              <td style="background-color:#ffffff; border-radius:16px; padding:36px 32px; border-top:4px solid ${c.colorPrimario};">
                <h1 style="margin:0 0 16px; font-family:${FONT_SERIF}; font-size:24px; font-weight:500; color:${c.colorPrimario};">${titulo}</h1>
                <div style="font-family:${FONT_SANS}; font-size:15px; line-height:1.7; color:${c.colorTexto};">
                  ${contenido.cuerpoHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:28px; font-family:${FONT_SANS}; font-size:12px; letter-spacing:0.05em; text-transform:uppercase; color:${c.colorSecundario};">${nombre}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
```

- [ ] **Step 5: Crear `src/lib/email/plantillas-auth.ts`**

```ts
import { VIGENCIA_CODIGO_MS } from "@/lib/auth/codigos";
import { traductor } from "@/lib/i18n/textos";
import { botonMarca, coloresSeguros, escaparHtml, layoutMarca, type MarcaEmail } from "./layout-marca";

/** Emails de login y contraseña: salen siempre por la cuenta de la plataforma (spec 10). */
export type EmailAuth = { asunto: string; html: string; texto: string };

const MINUTOS_CODIGO = VIGENCIA_CODIGO_MS / 60_000;

/** El asunto no lleva el código, para que no aparezca en las notificaciones. */
export function plantillaCodigoLogin(marca: MarcaEmail, codigo: string): EmailAuth {
  const t = traductor(marca.idioma);
  const { colorPrimario, colorSecundario } = coloresSeguros(marca.colores);
  const intro = (nombre: string) =>
    t({
      es: `Usá este código para terminar de ingresar al panel de ${nombre}:`,
      pt: `Use este código para concluir o acesso ao painel de ${nombre}:`,
    });
  const vence = t({ es: `Vence en ${MINUTOS_CODIGO} minutos.`, pt: `Expira em ${MINUTOS_CODIGO} minutos.` });
  const aviso = t({
    es: "Si no intentaste ingresar, ignorá este email y cambiá tu contraseña.",
    pt: "Se não foi você que tentou entrar, ignore este e-mail e altere sua senha.",
  });
  return {
    asunto: t({ es: `Tu código de acceso a ${marca.nombre}`, pt: `Seu código de acesso a ${marca.nombre}` }),
    html: layoutMarca(marca, {
      titulo: t({ es: "Tu código de acceso", pt: "Seu código de acesso" }),
      cuerpoHtml: `<p style="margin:0 0 16px;">${intro(escaparHtml(marca.nombre))}</p>
        <p style="margin:0 0 16px; font-family:'Courier New', Courier, monospace; font-size:34px; font-weight:700; letter-spacing:8px; text-align:center; color:${colorPrimario};">${escaparHtml(codigo)}</p>
        <p style="margin:0 0 8px;">${vence}</p>
        <p style="margin:0; font-size:13px; color:${colorSecundario};">${aviso}</p>`,
    }),
    texto: [intro(marca.nombre), codigo, vence, aviso].join("\n\n"),
  };
}

export function plantillaRecuperacion(marca: MarcaEmail, link: string): EmailAuth {
  const t = traductor(marca.idioma);
  const { colorSecundario } = coloresSeguros(marca.colores);
  const intro = (nombre: string) =>
    t({
      es: `Recibimos un pedido para restablecer la contraseña de tu cuenta en ${nombre}.`,
      pt: `Recebemos um pedido para redefinir a senha da sua conta em ${nombre}.`,
    });
  const boton = t({ es: "Elegir contraseña nueva", pt: "Escolher nova senha" });
  // 1 hora: "Email OTP Expiration" por defecto de Supabase Auth (3600 s).
  const vence = t({
    es: "El link se puede usar una sola vez y vence en 1 hora.",
    pt: "O link pode ser usado uma única vez e expira em 1 hora.",
  });
  const aviso = t({
    es: "Si no lo pediste, ignorá este email: tu contraseña no cambia.",
    pt: "Se você não pediu, ignore este e-mail: sua senha não muda.",
  });
  return {
    asunto: t({ es: `Restablecé tu contraseña de ${marca.nombre}`, pt: `Redefina sua senha de ${marca.nombre}` }),
    html: layoutMarca(marca, {
      titulo: t({ es: "Restablecé tu contraseña", pt: "Redefina sua senha" }),
      cuerpoHtml: `<p style="margin:0 0 20px;">${intro(escaparHtml(marca.nombre))}</p>
        ${botonMarca(marca, boton, link)}
        <p style="margin:20px 0 8px;">${vence}</p>
        <p style="margin:0; font-size:13px; color:${colorSecundario};">${aviso}</p>`,
    }),
    texto: [intro(marca.nombre), `${boton}: ${link}`, vence, aviso].join("\n\n"),
  };
}
```

- [ ] **Step 6: Verificar**

```bash
npx vitest run
npx tsc --noEmit
npx eslint src
```

Expected: todos los tests en PASS (incluidos los anteriores de `estilo` y `plantillas`), y `tsc` y `eslint` sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/plataforma.ts src/lib/tenant/estilo.ts src/lib/email/layout-marca.ts src/lib/email/layout-marca.test.ts src/lib/email/plantillas-auth.ts src/lib/email/plantillas-auth.test.ts
git commit -F - <<'EOF'
feat(email): layout de email con la marca y plantillas de código y recuperación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Migración 0011 y test de aislamiento

**Files:**
- Create: `supabase/migrations/0011_login_dos_pasos.sql`
- Modify: `scripts/test-aislamiento.mjs`

- [ ] **Step 1: Crear `supabase/migrations/0011_login_dos_pasos.sql`**

```sql
-- Verificación en dos pasos (etapa B): códigos de login, dispositivos recordados y
-- pedidos de recuperación de contraseña (para limitarlos).
-- Solo los usa el servidor con la service role: RLS activo, ninguna policy y sin
-- privilegios para anon ni authenticated (ni el master las lee por la API).

create table codigos_login (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  codigo_hash text not null,
  expira_en timestamptz not null,
  intentos int not null default 0 check (intentos >= 0),
  -- Un código usado no se borra: sigue contando para el límite de códigos por hora.
  usado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index idx_codigos_login_usuario on codigos_login (user_id, creado_en desc);

create table dispositivos_confiables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  expira_en timestamptz not null,
  user_agent text,
  creado_en timestamptz not null default now(),
  ultimo_uso_en timestamptz
);
create index idx_dispositivos_confiables_usuario on dispositivos_confiables (user_id);

-- Sin user_id: se cuenta también lo que se pide para emails que no existen.
create table pedidos_recuperacion (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  ip text not null,
  creado_en timestamptz not null default now()
);
create index idx_pedidos_recuperacion_email on pedidos_recuperacion (email_hash, creado_en);
create index idx_pedidos_recuperacion_ip on pedidos_recuperacion (ip, creado_en);

alter table codigos_login enable row level security;
alter table dispositivos_confiables enable row level security;
alter table pedidos_recuperacion enable row level security;

revoke all on codigos_login, dispositivos_confiables, pedidos_recuperacion from anon, authenticated;
```

- [ ] **Step 2: Extender `scripts/test-aislamiento.mjs`**

En el comentario del encabezado, reemplazar:

```js
// usuario sin perfil, un master y un anónimo. Al final borra todo.
```

por:

```js
// usuario sin perfil, un master y un anónimo, y que las tablas del login (códigos,
// dispositivos y pedidos de recuperación) son solo del servidor. Al final borra todo.
```

Debajo de la función `vacio(r)`, agregar:

```js
/** Tabla sin acceso para la API: permiso denegado (42501) o ninguna fila visible. */
function sinAcceso(r) {
  if (r.error && r.error.code === "42501") return true;
  return vacio(r);
}
```

Después de la línea:

```js
  verificar(!tenantsMaster.error && tenantsMaster.data.length === 2, "tenants: ve A y B");
```

agregar:

```js

  console.log("\nTablas del login (solo el servidor, con la service role):");
  const enDiezMinutos = () => new Date(Date.now() + 600_000).toISOString();
  await ok(admin.from("codigos_login").insert({ user_id: a.userId, codigo_hash: "hash-de-prueba", expira_en: enDiezMinutos() }), "código de login");
  await ok(admin.from("dispositivos_confiables").insert({ user_id: a.userId, token_hash: `hash-de-prueba-${sufijo}`, expira_en: enDiezMinutos() }), "dispositivo");
  await ok(admin.from("pedidos_recuperacion").insert({ email_hash: `hash-de-prueba-${sufijo}`, ip: "127.0.0.1" }), "pedido de recuperación");
  const filasNuevas = {
    codigos_login: { user_id: a.userId, codigo_hash: "intruso", expira_en: enDiezMinutos() },
    dispositivos_confiables: { user_id: a.userId, token_hash: `intruso-${sufijo}`, expira_en: enDiezMinutos() },
    pedidos_recuperacion: { email_hash: `intruso-${sufijo}`, ip: "127.0.0.1" },
  };
  for (const [tabla, fila] of Object.entries(filasNuevas)) {
    for (const [quien, cliente] of [["cliente A", usuarioA], ["master", usuarioMaster], ["anónimo", anon]]) {
      verificar(sinAcceso(await cliente.from(tabla).select("*").limit(1)), `${tabla}: ${quien} no lee (ni las propias)`);
      verificar(esperaError(await cliente.from(tabla).insert(fila), "42501"), `${tabla}: ${quien} no inserta`);
      verificar(
        bloqueado(await cliente.from(tabla).update({ creado_en: new Date().toISOString() }).not("id", "is", null).select("id")),
        `${tabla}: ${quien} no modifica`,
      );
      verificar(bloqueado(await cliente.from(tabla).delete().not("id", "is", null).select("id")), `${tabla}: ${quien} no borra`);
    }
  }
  const intactas = await Promise.all([
    admin.from("codigos_login").select("id", { count: "exact", head: true }).eq("user_id", a.userId),
    admin.from("dispositivos_confiables").select("id", { count: "exact", head: true }).eq("user_id", a.userId),
    admin.from("pedidos_recuperacion").select("id", { count: "exact", head: true }).like("email_hash", `%-${sufijo}`),
  ]);
  verificar(intactas.every((r) => !r.error && r.count === 1), "tablas del login: las filas de prueba siguen intactas");
```

En el bloque `finally`, antes de `for (const id of usuariosCreados) {`, agregar (los códigos y los dispositivos se borran en cascada con los usuarios):

```js
  const { error: errorPedidos } = await admin.from("pedidos_recuperacion").delete().like("email_hash", `%-${sufijo}`);
  if (errorPedidos) {
    console.error(`✗ limpieza: pedidos_recuperacion: ${errorPedidos.message}`);
    fallas++;
  }
```

- [ ] **Step 3: Verificar sintaxis (sin base)**

Run: `node --check scripts/test-aislamiento.mjs`
Expected: sin salida (sintaxis OK).

- [ ] **Step 4: Aplicar la migración y correr el aislamiento (necesita la base)**

**Solo cuando Pablo confirme que `SUPABASE_DB_URL` funciona.** Si falla por conexión o autenticación, hay que detenerse y avisar. No se reintenta en loop.

```bash
npm run migrar -- supabase/migrations/0011_login_dos_pasos.sql
npm run test:aislamiento
```

Expected:
- `✓ aplicada 0011_login_dos_pasos.sql`.
- El aislamiento muestra la sección "Tablas del login" con 36 verificaciones `✓` más "las filas de prueba siguen intactas", y termina en `Aislamiento OK`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0011_login_dos_pasos.sql scripts/test-aislamiento.mjs
git commit -F - <<'EOF'
feat(db): tablas del login en dos pasos (0011) y su test de aislamiento

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Secreto MFA y envío desde la cuenta de la plataforma

**Files:**
- Create: `src/lib/auth/secreto.ts`, `src/lib/email/plataforma.ts`
- Modify: `.env.example`, `.env.local` (**no se commitea**)

- [ ] **Step 1: Generar `MFA_SECRET` en `.env.local` (solo si falta, sin imprimirlo)**

```bash
grep -q '^MFA_SECRET=' .env.local || node -e "require('fs').appendFileSync('.env.local', '\nMFA_SECRET=' + require('crypto').randomBytes(32).toString('base64url') + '\n')"
grep -c '^MFA_SECRET=[A-Za-z0-9_-]\{43\}$' .env.local
```

Expected: `1`. Si da `0`, ya había una línea `MFA_SECRET=` con otro formato. En ese caso hay que avisar a Pablo, sin mostrar su valor, y no sobrescribirla.

- [ ] **Step 2: `.env.example`**

Agregar al final:

```bash

# === Login en dos pasos (etapa B) ===
# Clave de los HMAC (códigos de login y cookie "mfa"): 32 bytes aleatorios en base64url.
MFA_SECRET=
# Cuenta de Gmail de la PLATAFORMA (no la de un cliente) para códigos de verificación y
# recuperación de contraseña. Requiere verificación en 2 pasos y una "contraseña de aplicación".
# Sin configurar: en desarrollo el código se imprime en la consola del servidor; en producción el login falla.
PLATFORM_GMAIL_USER=
PLATFORM_GMAIL_APP_PASSWORD=
PLATFORM_EMAIL_FROM="Turnos online <xxx@gmail.com>"
# Usuario master: solo lo lee scripts/crear-master.mjs. Después de crearlo se puede borrar MASTER_PASSWORD.
MASTER_EMAIL=
MASTER_PASSWORD=
```

- [ ] **Step 3: Crear `src/lib/auth/secreto.ts`**

```ts
import "server-only";
import { secretoMfaValido } from "./cookie-mfa";

/** MFA_SECRET del entorno. Sin él no se puede ni crear un código ni marcar una sesión: lanza. */
export function secretoMfa(): string {
  const secreto = process.env.MFA_SECRET;
  if (!secretoMfaValido(secreto)) {
    throw new Error("Falta MFA_SECRET en el entorno (32 bytes aleatorios en base64url).");
  }
  return secreto;
}
```

- [ ] **Step 4: Crear `src/lib/email/plataforma.ts`**

```ts
import "server-only";
import nodemailer from "nodemailer";
import { modoEnvio, type ModoEnvio } from "@/lib/auth/envio";
import type { EmailAuth } from "./plantillas-auth";

/** ¿Está la cuenta de Gmail de la plataforma (códigos de login y contraseñas)? */
export function plataformaConfigurada(): boolean {
  return !!process.env.PLATFORM_GMAIL_USER && !!process.env.PLATFORM_GMAIL_APP_PASSWORD;
}

export function modoEnvioActual(): ModoEnvio {
  return modoEnvio({ configurado: plataformaConfigurada(), produccion: process.env.NODE_ENV === "production" });
}

/**
 * Envía un email de login o de contraseña desde la cuenta de la plataforma. En desarrollo
 * y sin cuenta, imprime avisoConsola en la consola del servidor y sigue. En producción sin
 * cuenta, lanza. remitente: nombre visible (el del tenant); sin él, PLATFORM_EMAIL_FROM.
 */
export async function entregarEmailAuth(opts: {
  para: string;
  email: EmailAuth;
  remitente?: string;
  avisoConsola: string;
}): Promise<void> {
  const modo = modoEnvioActual();
  if (modo === "bloqueado") throw new Error("El envío de códigos no está configurado");
  if (modo === "consola") {
    console.log(`\n${opts.avisoConsola}\n`);
    return;
  }
  const usuario = process.env.PLATFORM_GMAIL_USER!;
  const transporte = nodemailer.createTransport({
    service: "gmail",
    auth: { user: usuario, pass: process.env.PLATFORM_GMAIL_APP_PASSWORD },
  });
  await transporte.sendMail({
    from: opts.remitente ? { name: opts.remitente, address: usuario } : process.env.PLATFORM_EMAIL_FROM || usuario,
    to: opts.para,
    subject: opts.email.asunto,
    html: opts.email.html,
    text: opts.email.texto,
  });
}
```

- [ ] **Step 5: Verificar**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
git status --short
```

Expected:
- `tsc` y `eslint` sin errores, y todos los tests en PASS.
- En `git status` aparecen `.env.example` y los 2 archivos nuevos. **No** aparece `.env.local`, que está en `.gitignore`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/secreto.ts src/lib/email/plataforma.ts .env.example
git commit -F - <<'EOF'
feat(auth): secreto MFA y envío desde la cuenta de la plataforma

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Datos del login, área del request y sesión verificada

**Files:**
- Create: `src/lib/auth/servicio.ts`, `src/lib/auth/area.ts`, `src/lib/auth/sesion.ts`

- [ ] **Step 1: Crear `src/lib/auth/servicio.ts`**

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Perfil } from "@/lib/tenant/permisos";
import {
  estadoCodigo,
  generarCodigo,
  hashCodigo,
  mismoHash,
  permisoEnvio,
  vencimientoCodigo,
  type PermisoEnvio,
  type ResultadoCodigo,
} from "./codigos";
import {
  dispositivoVigente,
  generarTokenDispositivo,
  hashToken,
  tokenConFormato,
  vencimientoDispositivo,
} from "./dispositivo";
import { hashEmail, recuperacionPermitida } from "./recuperacion";
import { secretoMfa } from "./secreto";

/**
 * Datos del login con la service role. Las tablas no tienen policies (migración 0011):
 * este módulo es el único que las toca.
 */
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

function fallar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`);
}

export async function perfilDe(userId: string): Promise<Perfil | null> {
  const { data, error } = await createAdminClient()
    .from("perfiles")
    .select("rol, tenant_id")
    .eq("user_id", userId)
    .maybeSingle();
  fallar("perfil", error);
  return (data as Perfil | null) ?? null;
}

export type CodigoNuevo = { ok: true; codigo: string } | Exclude<PermisoEnvio, { ok: true }>;

/** Genera un código nuevo (si lo permiten la espera y el límite por hora) y guarda su HMAC. */
export async function crearCodigo(userId: string): Promise<CodigoNuevo> {
  const db = createAdminClient();
  const ahora = new Date();
  const { data: recientes, error } = await db
    .from("codigos_login")
    .select("creado_en")
    .eq("user_id", userId)
    .gte("creado_en", new Date(ahora.getTime() - HORA_MS).toISOString())
    .order("creado_en", { ascending: false });
  fallar("códigos recientes", error);
  const filas = recientes ?? [];
  const permiso = permisoEnvio(filas[0] ? new Date(filas[0].creado_en) : null, filas.length, ahora);
  if (!permiso.ok) return permiso;

  // Un solo código vigente: los anteriores vencen ya (siguen contando para el límite por hora).
  const { error: errorVencer } = await db
    .from("codigos_login")
    .update({ expira_en: ahora.toISOString() })
    .eq("user_id", userId)
    .is("usado_en", null)
    .gt("expira_en", ahora.toISOString());
  fallar("vencer códigos anteriores", errorVencer);
  const { error: errorLimpieza } = await db
    .from("codigos_login")
    .delete()
    .eq("user_id", userId)
    .lt("creado_en", new Date(ahora.getTime() - DIA_MS).toISOString());
  fallar("limpiar códigos viejos", errorLimpieza);

  const codigo = generarCodigo();
  const { error: errorAlta } = await db.from("codigos_login").insert({
    user_id: userId,
    codigo_hash: hashCodigo(secretoMfa(), userId, codigo),
    expira_en: vencimientoCodigo(ahora).toISOString(),
  });
  fallar("guardar código", errorAlta);
  return { ok: true, codigo };
}

/** Compara el código ingresado con el último del usuario. Cada intento cuenta, acierte o no. */
export async function comprobarCodigo(userId: string, codigo: string): Promise<ResultadoCodigo> {
  const db = createAdminClient();
  const { data: fila, error } = await db
    .from("codigos_login")
    .select("id, codigo_hash, expira_en, intentos, usado_en")
    .eq("user_id", userId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  fallar("código", error);
  if (!fila) return "sin_codigo";
  const estado = estadoCodigo(fila, new Date());
  if (estado !== "vigente") return estado;

  // El intento se cuenta antes de comparar, con compare-and-set sobre "intentos": dos
  // intentos en paralelo no pueden usar el mismo número.
  const { data: contado, error: errorIntento } = await db
    .from("codigos_login")
    .update({ intentos: fila.intentos + 1 })
    .eq("id", fila.id)
    .eq("intentos", fila.intentos)
    .select("id");
  fallar("contar intento", errorIntento);
  if (!contado?.length) return "reintentar";

  if (!mismoHash(fila.codigo_hash, hashCodigo(secretoMfa(), userId, codigo))) return "incorrecto";

  const { data: usado, error: errorUso } = await db
    .from("codigos_login")
    .update({ usado_en: new Date().toISOString() })
    .eq("id", fila.id)
    .is("usado_en", null)
    .select("id");
  fallar("marcar código usado", errorUso);
  return usado?.length ? "ok" : "usado";
}

/** ¿El token de la cookie corresponde a un dispositivo recordado vigente de este usuario? */
export async function dispositivoValido(userId: string, token: string): Promise<boolean> {
  if (!tokenConFormato(token)) return false;
  const db = createAdminClient();
  const { data, error } = await db
    .from("dispositivos_confiables")
    .select("id, expira_en")
    .eq("user_id", userId)
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  fallar("dispositivo", error);
  if (!data || !dispositivoVigente(data, new Date())) return false;
  const { error: errorUso } = await db
    .from("dispositivos_confiables")
    .update({ ultimo_uso_en: new Date().toISOString() })
    .eq("id", data.id);
  fallar("uso del dispositivo", errorUso);
  return true;
}

/** Registra el dispositivo y devuelve el token para la cookie (en la base queda su hash). */
export async function recordarDispositivo(userId: string, userAgent: string | null): Promise<string> {
  const db = createAdminClient();
  const ahora = new Date();
  const { error: errorLimpieza } = await db
    .from("dispositivos_confiables")
    .delete()
    .eq("user_id", userId)
    .lt("expira_en", ahora.toISOString());
  fallar("limpiar dispositivos vencidos", errorLimpieza);
  const token = generarTokenDispositivo();
  const { error } = await db.from("dispositivos_confiables").insert({
    user_id: userId,
    token_hash: hashToken(token),
    expira_en: vencimientoDispositivo(ahora).toISOString(),
    user_agent: userAgent?.slice(0, 300) ?? null,
  });
  fallar("guardar dispositivo", error);
  return token;
}

/** Olvida todos los dispositivos recordados del usuario (cambio de contraseña; panel master en la etapa C). */
export async function revocarDispositivos(userId: string): Promise<void> {
  const { error } = await createAdminClient().from("dispositivos_confiables").delete().eq("user_id", userId);
  fallar("revocar dispositivos", error);
}

/** Registra un pedido de recuperación si no supera los límites por hora. false = no enviar. */
export async function registrarPedidoRecuperacion(email: string, ip: string): Promise<boolean> {
  const db = createAdminClient();
  const ahora = Date.now();
  const desde = new Date(ahora - HORA_MS).toISOString();
  const emailHash = hashEmail(secretoMfa(), email);
  const [porEmail, porIp] = await Promise.all([
    db.from("pedidos_recuperacion").select("id", { count: "exact", head: true }).eq("email_hash", emailHash).gte("creado_en", desde),
    db.from("pedidos_recuperacion").select("id", { count: "exact", head: true }).eq("ip", ip).gte("creado_en", desde),
  ]);
  fallar("pedidos por email", porEmail.error);
  fallar("pedidos por IP", porIp.error);
  if (!recuperacionPermitida(porEmail.count ?? 0, porIp.count ?? 0)) return false;

  const { error } = await db.from("pedidos_recuperacion").insert({ email_hash: emailHash, ip });
  fallar("registrar pedido", error);
  const { error: errorLimpieza } = await db
    .from("pedidos_recuperacion")
    .delete()
    .lt("creado_en", new Date(ahora - DIA_MS).toISOString());
  fallar("limpiar pedidos viejos", errorLimpieza);
  return true;
}
```

- [ ] **Step 2: Crear `src/lib/auth/area.ts`**

```ts
import "server-only";
import { headers } from "next/headers";
import { MARCA_PLATAFORMA, marcaEmailDeTenant, type MarcaEmail } from "@/lib/email/layout-marca";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { configHost, resolverHost } from "@/lib/tenant/host";
import { perfilPermitidoEnArea, type Perfil } from "@/lib/tenant/permisos";
import type { Tenant } from "@/lib/tenant/tipos";
import { urlDelTenant, urlMaster } from "@/lib/tenant/urls";
import { rutaDelArea } from "./rutas";

/** Panel al que corresponde el request: el de un tenant activo o el master (app.). */
export type Area = { tipo: "tenant"; tenant: Tenant } | { tipo: "master" };

/** Sale siempre del host, nunca de un campo del formulario. null: tenant inexistente o suspendido. */
export async function areaDelRequest(): Promise<Area | null> {
  const destino = resolverHost((await headers()).get("host") ?? "", configHost());
  if (destino.tipo === "master") return { tipo: "master" };
  const tenant = await tenantDelRequest();
  return tenant ? { tipo: "tenant", tenant } : null;
}

/** Ruta del navegador de una pantalla del área (sin área, la del panel del cliente). */
export function rutaEn(area: Area | null, ruta: string): string {
  return rutaDelArea(area?.tipo ?? "tenant", ruta);
}

/** Origen público del área, para los links de los emails. */
export function urlDelArea(area: Area): string {
  return area.tipo === "tenant" ? urlDelTenant(area.tenant.slug) : urlMaster();
}

export function perfilPermitido(perfil: Perfil | null, area: Area): boolean {
  return perfilPermitidoEnArea(
    perfil,
    area.tipo === "tenant" ? { tipo: "tenant", tenantId: area.tenant.id } : { tipo: "master" },
  );
}

/** Marca de los emails: la del tenant del host, o la neutra de la plataforma para el master. */
export function marcaEmailDelArea(area: Area): MarcaEmail {
  return area.tipo === "tenant" ? marcaEmailDeTenant(area.tenant, urlDelArea(area)) : MARCA_PLATAFORMA;
}

/** Nombre visible del remitente: el del tenant; para el master, PLATFORM_EMAIL_FROM. */
export function remitenteDelArea(area: Area): string | undefined {
  return area.tipo === "tenant" ? area.tenant.nombre : undefined;
}
```

- [ ] **Step 3: Crear `src/lib/auth/sesion.ts`**

```ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { COOKIE_MFA, verificarMfa } from "./cookie-mfa";

export type Sesion = {
  userId: string;
  /** session_id del JWT de Supabase: la cookie mfa está atada a él. */
  sessionId: string;
  email: string | null;
  /** true si la cookie mfa corresponde a esta sesión (pasó el segundo factor). */
  verificada: boolean;
};

/**
 * Sesión del request, cacheada por request. Usa getClaims(): valida la firma del JWT (con
 * claves asimétricas, sin ir a Supabase) y da el session_id. El proxy además valida la
 * sesión contra Supabase con getUser() en cada request a /admin y a app.
 */
export const sesionActual = cache(async (): Promise<Sesion | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const mfa = (await cookies()).get(COOKIE_MFA)?.value;
  return {
    userId: claims.sub,
    sessionId: claims.session_id,
    email: claims.email ?? null,
    verificada: verificarMfa(process.env.MFA_SECRET, mfa, claims.sub, claims.session_id),
  };
});
```

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
```

Expected: sin errores y todos los tests en PASS. Estos módulos no tienen tests unitarios, porque son consultas a la base y requests. Su lógica está en los módulos puros de las Tasks 1 a 4, y los cubre la prueba de punta a punta de la Task 13.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/servicio.ts src/lib/auth/area.ts src/lib/auth/sesion.ts
git commit -F - <<'EOF'
feat(auth): datos del login, área del request y sesión verificada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Server actions del login

**Files:**
- Create: `src/lib/auth/acciones.ts`

- [ ] **Step 1: Crear `src/lib/auth/acciones.ts`**

```ts
"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { entregarEmailAuth, modoEnvioActual } from "@/lib/email/plataforma";
import { plantillaCodigoLogin, plantillaRecuperacion } from "@/lib/email/plantillas-auth";
import { getClientIp } from "@/lib/turnos/ip";
import {
  areaDelRequest,
  marcaEmailDelArea,
  perfilPermitido,
  remitenteDelArea,
  rutaEn,
  urlDelArea,
  type Area,
} from "./area";
import { normalizarCodigo } from "./codigos";
import { COOKIE_MFA, firmarMfa } from "./cookie-mfa";
import { DURACION_COOKIE_S, opcionesCookieAuth, protocoloPlataforma } from "./cookies";
import { COOKIE_DISPOSITIVO } from "./dispositivo";
import { normalizarEmail, validarNuevaContrasena } from "./recuperacion";
import { RUTAS_AUTH } from "./rutas";
import { secretoMfa } from "./secreto";
import {
  comprobarCodigo,
  crearCodigo,
  dispositivoValido,
  perfilDe,
  recordarDispositivo,
  registrarPedidoRecuperacion,
  revocarDispositivos,
} from "./servicio";
import { sesionActual } from "./sesion";

/*
 * Server actions del login, compartidas por el panel del cliente (<slug>.<dominio>/admin)
 * y el master (app.<dominio>). Cada una deduce el área del host. Los mensajes viajan como
 * claves (?error=credenciales) que traduce mensajes.ts.
 */

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>;
type AlmacenCookies = Awaited<ReturnType<typeof cookies>>;
type ResultadoEnvio = "ok" | "no_configurado" | "espera" | "limite" | "envio_fallo";

/** Redirige a una pantalla del área. Sin área conocida, a la del panel del cliente. */
function ir(area: Area | null, ruta: string, params?: Record<string, string>): never {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  redirect(`${rutaEn(area, ruta)}${query}`);
}

/** session_id del access token recién emitido (las cookies nuevas no se leen en este request). */
async function sessionIdDelToken(supabase: ClienteSupabase, accessToken: string): Promise<string> {
  const { data, error } = await supabase.auth.getClaims(accessToken);
  if (error || !data) throw new Error("No se pudo leer la sesión recién creada");
  return data.claims.session_id;
}

/** Segundo factor cumplido: cookie mfa firmada sobre el usuario y el session_id. */
function marcarVerificada(almacen: AlmacenCookies, userId: string, sessionId: string): void {
  almacen.set(
    COOKIE_MFA,
    firmarMfa(secretoMfa(), userId, sessionId),
    opcionesCookieAuth(protocoloPlataforma(), DURACION_COOKIE_S),
  );
}

async function enviarCodigo(area: Area, userId: string, email: string): Promise<ResultadoEnvio> {
  if (modoEnvioActual() === "bloqueado") return "no_configurado";
  const nuevo = await crearCodigo(userId);
  if (!nuevo.ok) return nuevo.motivo;
  try {
    await entregarEmailAuth({
      para: email,
      email: plantillaCodigoLogin(marcaEmailDelArea(area), nuevo.codigo),
      remitente: remitenteDelArea(area),
      avisoConsola: `[MFA dev] código para ${email}: ${nuevo.codigo}`,
    });
    return "ok";
  } catch (e) {
    console.error("No se pudo enviar el código de login:", e);
    return "envio_fallo";
  }
}

/** Paso 1: email y contraseña. Después, dispositivo recordado o código por email. */
export async function iniciarSesion(formData: FormData) {
  const area = await areaDelRequest();
  if (!area) ir(null, RUTAS_AUTH.login, { error: "sitio" });

  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: String(formData.get("password") ?? ""),
  });
  const { user, session } = data;
  if (error || !user || !session) ir(area, RUTAS_AUTH.login, { error: "credenciales" });

  // La cuenta tiene que ser de este sitio (o del master): si no, el mismo error que una contraseña mala.
  if (!perfilPermitido(await perfilDe(user.id), area)) {
    await supabase.auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.login, { error: "credenciales" });
  }

  const almacen = await cookies();
  const sessionId = await sessionIdDelToken(supabase, session.access_token);

  // Dispositivo recordado vigente: ya es el segundo factor.
  const token = almacen.get(COOKIE_DISPOSITIVO)?.value;
  if (token && (await dispositivoValido(user.id, token))) {
    marcarVerificada(almacen, user.id, sessionId);
    ir(area, "/");
  }

  const envio = await enviarCodigo(area, user.id, user.email ?? email);
  if (envio === "no_configurado") {
    // Sin forma de mandar el código no se entra: nunca se saltea el segundo factor.
    await supabase.auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.login, { error: "envio_no_configurado" });
  }
  ir(area, RUTAS_AUTH.verificar, envio === "ok" ? { info: "codigo_enviado" } : { error: envio });
}

/** Paso 2: el código. Opcionalmente, recordar el dispositivo por 30 días. */
export async function verificarCodigo(formData: FormData) {
  const area = await areaDelRequest();
  if (!area) ir(null, RUTAS_AUTH.login, { error: "sitio" });
  const sesion = await sesionActual();
  if (!sesion) ir(area, RUTAS_AUTH.login);
  if (!perfilPermitido(await perfilDe(sesion.userId), area)) {
    await (await createClient()).auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.login, { error: "credenciales" });
  }

  const codigo = normalizarCodigo(String(formData.get("codigo") ?? ""));
  if (!codigo) ir(area, RUTAS_AUTH.verificar, { error: "formato" });
  const resultado = await comprobarCodigo(sesion.userId, codigo);
  if (resultado !== "ok") ir(area, RUTAS_AUTH.verificar, { error: resultado });

  const almacen = await cookies();
  marcarVerificada(almacen, sesion.userId, sesion.sessionId);
  if (formData.get("recordar") === "on") {
    const token = await recordarDispositivo(sesion.userId, (await headers()).get("user-agent"));
    almacen.set(COOKIE_DISPOSITIVO, token, opcionesCookieAuth(protocoloPlataforma(), DURACION_COOKIE_S));
  }
  ir(area, "/");
}

export async function reenviarCodigo() {
  const area = await areaDelRequest();
  if (!area) ir(null, RUTAS_AUTH.login, { error: "sitio" });
  const sesion = await sesionActual();
  if (!sesion?.email) ir(area, RUTAS_AUTH.login);

  const envio = await enviarCodigo(area, sesion.userId, sesion.email);
  if (envio === "no_configurado") {
    await (await createClient()).auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.login, { error: "envio_no_configurado" });
  }
  ir(area, RUTAS_AUTH.verificar, envio === "ok" ? { info: "reenviado" } : { error: envio });
}

/** Cierra la sesión de este navegador. Borra mfa y conserva la cookie del dispositivo recordado. */
export async function cerrarSesion() {
  const area = await areaDelRequest();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(COOKIE_MFA);
  ir(area, RUTAS_AUTH.login);
}

/** Envía el link de recuperación. Responde lo mismo exista o no la cuenta. */
export async function pedirRecuperacion(formData: FormData) {
  const area = await areaDelRequest();
  if (!area) ir(null, RUTAS_AUTH.recuperar, { error: "sitio" });
  const email = normalizarEmail(String(formData.get("email") ?? ""));
  if (!email) ir(area, RUTAS_AUTH.recuperar, { error: "email" });
  if (modoEnvioActual() === "bloqueado") ir(area, RUTAS_AUTH.recuperar, { error: "envio_emails_no_configurado" });

  if (await registrarPedidoRecuperacion(email, await getClientIp())) {
    // Después de responder: la respuesta tarda lo mismo exista o no la cuenta.
    after(() => enviarRecuperacion(area, email));
  }
  ir(area, RUTAS_AUTH.recuperar, { info: "recuperacion_enviada" });
}

async function enviarRecuperacion(area: Area, email: string): Promise<void> {
  try {
    const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email });
    if (error || !data.user) return; // la cuenta no existe: no se avisa
    if (!perfilPermitido(await perfilDe(data.user.id), area)) return; // no es de este sitio
    const query = new URLSearchParams({ token_hash: data.properties.hashed_token });
    const link = `${urlDelArea(area)}${rutaEn(area, RUTAS_AUTH.restablecer)}?${query}`;
    await entregarEmailAuth({
      para: email,
      email: plantillaRecuperacion(marcaEmailDelArea(area), link),
      remitente: remitenteDelArea(area),
      avisoConsola: `[MFA dev] link de recuperación para ${email}: ${link}`,
    });
  } catch (e) {
    console.error("No se pudo enviar la recuperación de contraseña:", e);
  }
}

/**
 * Contraseña nueva desde el link. El token se consume recién acá (no al abrir el link).
 * Después se cierran todas las sesiones y se olvidan los dispositivos recordados.
 */
export async function restablecerContrasena(formData: FormData) {
  const area = await areaDelRequest();
  if (!area) ir(null, RUTAS_AUTH.recuperar, { error: "sitio" });
  const tokenHash = String(formData.get("token_hash") ?? "");
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(tokenHash)) ir(area, RUTAS_AUTH.recuperar, { error: "link" });
  const clave = String(formData.get("password") ?? "");
  const problema = validarNuevaContrasena(clave, String(formData.get("confirmacion") ?? ""));
  if (problema) ir(area, RUTAS_AUTH.restablecer, { token_hash: tokenHash, error: problema });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  const usuario = data.user;
  if (error || !usuario) ir(area, RUTAS_AUTH.recuperar, { error: "link" });
  if (!perfilPermitido(await perfilDe(usuario.id), area)) {
    await supabase.auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.recuperar, { error: "link" });
  }

  const { error: errorClave } = await supabase.auth.updateUser({ password: clave });
  if (errorClave) {
    await supabase.auth.signOut({ scope: "local" });
    ir(area, RUTAS_AUTH.recuperar, { error: "contrasena_rechazada" });
  }

  await revocarDispositivos(usuario.id);
  await supabase.auth.signOut({ scope: "global" });
  (await cookies()).delete(COOKIE_MFA);
  ir(area, RUTAS_AUTH.login, { info: "contrasena_cambiada" });
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
```

Expected: sin errores y todos los tests en PASS.

Si `tsc` marca que `user`, `session`, `sesion` o `usuario` pueden ser `null` después de un `ir(...)`, hay que revisar que `ir` sea una **declaración** de función con el tipo de retorno `never` explícito. TypeScript solo corta el flujo con funciones declaradas así, no con arrow functions.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/acciones.ts
git commit -F - <<'EOF'
feat(auth): server actions de login, código, salida y recuperación de contraseña

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 10: Pantallas de ingreso del panel del cliente

**Files:**
- Create: `src/components/auth/PaginasAuth.tsx`, `src/app/admin/verificar/page.tsx`, `src/app/admin/recuperar/page.tsx`, `src/app/admin/restablecer/page.tsx`
- Rewrite: `src/app/admin/login/page.tsx`, `src/app/admin/layout.tsx`
- Delete: `src/app/admin/actions.ts`

- [ ] **Step 1: Crear `src/components/auth/PaginasAuth.tsx`**

```tsx
import Link from "next/link";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  cerrarSesion,
  iniciarSesion,
  pedirRecuperacion,
  reenviarCodigo,
  restablecerContrasena,
  verificarCodigo,
} from "@/lib/auth/acciones";
import { mensajeError, mensajeInfo } from "@/lib/auth/mensajes";
import { LARGO_MINIMO_CONTRASENA } from "@/lib/auth/recuperacion";
import { RUTAS_AUTH, rutaDelArea, type TipoArea } from "@/lib/auth/rutas";

/**
 * Pantallas de ingreso de los dos paneles (cliente y master). Están en español, como el
 * panel, hasta la etapa C. Los ids de los formularios los usa scripts/e2e-login.mjs.
 */

/** Query de las pantallas: claves de mensajes (no textos) y el token del link de recuperación. */
export type ParamsAuth = { error?: string; info?: string; token_hash?: string };

type PropsPagina = { tipo: TipoArea; searchParams: Promise<ParamsAuth> };

const TITULO: Record<TipoArea, string> = { tenant: "Panel de gestión", master: "Panel master" };
const ETIQUETA = "font-sans text-sm text-texto-suave";
const CAMPO =
  "mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario";
const BOTON =
  "mt-2 rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60";
const ENLACE = "font-sans text-sm text-primario hover:text-primario-oscuro";

function Pantalla({
  titulo,
  subtitulo,
  params,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  params: ParamsAuth;
  children: React.ReactNode;
}) {
  const error = mensajeError(params.error);
  const info = mensajeInfo(params.info);
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6">
      <div className="w-full max-w-sm rounded-2xl border border-primario/15 bg-white/70 p-8">
        <h1 className="font-serif text-3xl text-texto">{titulo}</h1>
        {subtitulo && <p className="mt-1 font-sans text-sm text-texto-suave">{subtitulo}</p>}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="mt-4 rounded-lg bg-secundario/10 px-3 py-2 font-sans text-sm text-secundario-oscuro">
            {info}
          </p>
        )}
        {children}
      </div>
    </main>
  );
}

export async function PaginaLogin({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  return (
    <Pantalla
      titulo={TITULO[tipo]}
      subtitulo={tipo === "master" ? "Ingresá para administrar la plataforma." : "Ingresá para administrar tu sitio."}
      params={params}
    >
      <form id="form-login" action={iniciarSesion} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          Email
          <input name="email" type="email" required autoComplete="email" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Contraseña
          <input name="password" type="password" required autoComplete="current-password" className={CAMPO} />
        </label>
        <SubmitButton className={BOTON}>Ingresar</SubmitButton>
        <FormPendingOverlay label="Ingresando…" />
      </form>
      <p className="mt-4 text-center">
        <Link href={rutaDelArea(tipo, RUTAS_AUTH.recuperar)} className={ENLACE}>
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </Pantalla>
  );
}

export async function PaginaVerificar({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  return (
    <Pantalla
      titulo="Verificá que sos vos"
      subtitulo="Ingresá el código de 6 números que te enviamos por email. Vence en 10 minutos."
      params={params}
    >
      <form id="form-verificar" action={verificarCodigo} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          Código
          <input
            name="codigo"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            className={`${CAMPO} text-center text-xl tracking-[0.4em]`}
          />
        </label>
        <label className="flex items-center gap-2 font-sans text-sm text-texto-suave">
          <input type="checkbox" name="recordar" className="accent-primario" />
          Recordar este dispositivo por 30 días
        </label>
        <SubmitButton className={BOTON}>Verificar</SubmitButton>
        <FormPendingOverlay label="Verificando…" />
      </form>
      <div className="mt-4 flex items-center justify-between">
        <form id="form-reenviar" action={reenviarCodigo}>
          <button className={ENLACE}>Reenviar código</button>
        </form>
        <form id="form-salir" action={cerrarSesion}>
          <button className={ENLACE}>Usar otra cuenta</button>
        </form>
      </div>
      <p className="mt-2 text-center font-sans text-xs text-texto-suave">
        {tipo === "master" ? "Panel master" : "Panel de gestión"}
      </p>
    </Pantalla>
  );
}

export async function PaginaRecuperar({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  return (
    <Pantalla
      titulo="Recuperar contraseña"
      subtitulo="Ingresá tu email y te mandamos un link para elegir una contraseña nueva."
      params={params}
    >
      <form id="form-recuperar" action={pedirRecuperacion} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          Email
          <input name="email" type="email" required autoComplete="email" className={CAMPO} />
        </label>
        <SubmitButton className={BOTON}>Enviar link</SubmitButton>
        <FormPendingOverlay label="Enviando…" />
      </form>
      <p className="mt-4 text-center">
        <Link href={rutaDelArea(tipo, RUTAS_AUTH.login)} className={ENLACE}>
          Volver a ingresar
        </Link>
      </p>
    </Pantalla>
  );
}

export async function PaginaRestablecer({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  if (!params.token_hash) {
    return (
      <Pantalla titulo="Elegí una contraseña nueva" params={{ error: "link" }}>
        <p className="mt-6 text-center">
          <Link href={rutaDelArea(tipo, RUTAS_AUTH.recuperar)} className={ENLACE}>
            Pedir un link nuevo
          </Link>
        </p>
      </Pantalla>
    );
  }
  return (
    <Pantalla
      titulo="Elegí una contraseña nueva"
      subtitulo={`Al menos ${LARGO_MINIMO_CONTRASENA} caracteres. Después vas a ingresar con ella y un código por email.`}
      params={params}
    >
      <form id="form-restablecer" action={restablecerContrasena} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="token_hash" defaultValue={params.token_hash} />
        <label className={ETIQUETA}>
          Contraseña nueva
          <input
            name="password"
            type="password"
            required
            minLength={LARGO_MINIMO_CONTRASENA}
            autoComplete="new-password"
            className={CAMPO}
          />
        </label>
        <label className={ETIQUETA}>
          Repetila
          <input
            name="confirmacion"
            type="password"
            required
            minLength={LARGO_MINIMO_CONTRASENA}
            autoComplete="new-password"
            className={CAMPO}
          />
        </label>
        <SubmitButton className={BOTON}>Guardar contraseña</SubmitButton>
        <FormPendingOverlay label="Guardando…" />
      </form>
    </Pantalla>
  );
}
```

- [ ] **Step 2: Reemplazar `src/app/admin/login/page.tsx` completo**

```tsx
import { PaginaLogin, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Ingresar · Panel" };

export default function LoginPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaLogin tipo="tenant" searchParams={searchParams} />;
}
```

- [ ] **Step 3: Crear `src/app/admin/verificar/page.tsx`**

```tsx
import { PaginaVerificar, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Verificación · Panel" };

export default function VerificarPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaVerificar tipo="tenant" searchParams={searchParams} />;
}
```

- [ ] **Step 4: Crear `src/app/admin/recuperar/page.tsx`**

```tsx
import { PaginaRecuperar, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Recuperar contraseña · Panel" };

export default function RecuperarPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRecuperar tipo="tenant" searchParams={searchParams} />;
}
```

- [ ] **Step 5: Crear `src/app/admin/restablecer/page.tsx`**

```tsx
import { PaginaRestablecer, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Contraseña nueva · Panel" };

export default function RestablecerPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRestablecer tipo="tenant" searchParams={searchParams} />;
}
```

- [ ] **Step 6: Reemplazar `src/app/admin/layout.tsx` completo**

```tsx
import Link from "next/link";
import { cerrarSesion } from "@/lib/auth/acciones";
import { sesionActual } from "@/lib/auth/sesion";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { estiloMarca } from "@/lib/tenant/estilo";
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

  // Sin la verificación en dos pasos completa, el proxy solo deja llegar a las pantallas
  // de ingreso (login, código, contraseña): se muestran solas, sin el shell del panel.
  const sesion = await sesionActual();
  if (!sesion?.verificada) return conMarca(children);

  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) {
    return conMarca(
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6">
        <p className="font-sans text-texto-suave">Esta cuenta no tiene acceso a este sitio.</p>
        <form id="form-salir" action={cerrarSesion}>
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
          <form id="form-salir" action={cerrarSesion}>
            <button className="font-sans text-sm text-primario hover:text-primario-oscuro">Salir</button>
          </form>
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>,
  );
}
```

- [ ] **Step 7: Borrar `src/app/admin/actions.ts`**

```bash
git rm src/app/admin/actions.ts
grep -rn "admin/actions\|from \"\.\./actions\"\|from \"\./actions\"" src/app/admin/layout.tsx src/app/admin/login/page.tsx
```

Expected: el `grep` no muestra nada. `login` y `logout` ya no tienen usos: los reemplazan `iniciarSesion` y `cerrarSesion`.

- [ ] **Step 8: Verificar**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
npm run build
```

Expected: sin errores, todos los tests en PASS y el build sin errores. Las rutas `/admin/verificar`, `/admin/recuperar` y `/admin/restablecer` aparecen como dinámicas (`ƒ`).

- [ ] **Step 9: Commit**

```bash
git add src/components/auth/PaginasAuth.tsx src/app/admin/login/page.tsx src/app/admin/verificar/page.tsx src/app/admin/recuperar/page.tsx src/app/admin/restablecer/page.tsx src/app/admin/layout.tsx
git status --short   # src/app/admin/actions.ts figura como borrado (D) en staged
git commit -F - <<'EOF'
feat(admin): pantallas de ingreso, verificación y recuperación del panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 11: El proxy y el panel exigen la verificación en dos pasos

**Files:**
- Rewrite: `src/lib/supabase/middleware.ts`, `src/proxy.ts`, `src/lib/tenant/admin.ts`

- [ ] **Step 1: Reemplazar `src/lib/supabase/middleware.ts` completo**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_MFA, verificarMfa } from "@/lib/auth/cookie-mfa";
import { decidirAcceso, rutaDelArea, rutaRelativa, type TipoArea } from "@/lib/auth/rutas";

type Opciones = {
  tipo: TipoArea;
  /** Cabeceras que se reenvían a la app (el proxy ya les quitó las que el cliente no controla). */
  cabeceras: Headers;
  /** Ruta interna a la que se reescribe (área master). Sin ella, el request sigue en su ruta. */
  reescribirA?: URL;
};

/**
 * Refresca la sesión de Supabase y protege el área (panel del cliente o master): exige
 * sesión válida y la cookie mfa de esa sesión, salvo en las pantallas de ingreso
 * (decidirAcceso).
 */
export async function protegerArea(request: NextRequest, { tipo, cabeceras, reescribirA }: Opciones) {
  const continuar = () =>
    reescribirA
      ? NextResponse.rewrite(reescribirA, { request: { headers: cabeceras } })
      : NextResponse.next({ request: { headers: cabeceras } });
  let response = continuar();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // La cookie refrescada también tiene que llegar a la app en este mismo request.
          cabeceras.set("cookie", request.headers.get("cookie") ?? "");
          response = continuar();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() valida la sesión contra Supabase (detecta sesiones cerradas o revocadas);
  // getClaims() da el session_id del JWT, al que está atada la cookie mfa.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const claims = user ? (await supabase.auth.getClaims()).data?.claims : undefined;
  const haySesion = Boolean(user && claims && claims.sub === user.id);
  const mfaValida =
    haySesion &&
    verificarMfa(process.env.MFA_SECRET, request.cookies.get(COOKIE_MFA)?.value, claims?.sub, claims?.session_id);

  const decision = decidirAcceso(rutaRelativa(tipo, request.nextUrl.pathname), { haySesion, mfaValida });
  if (decision.tipo === "seguir") return response;

  const url = request.nextUrl.clone();
  url.pathname = rutaDelArea(tipo, decision.a);
  url.search = "";
  const redireccion = NextResponse.redirect(url);
  // Si Supabase refrescó la sesión, las cookies nuevas viajan también en la redirección.
  response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
  return redireccion;
}
```

- [ ] **Step 2: Reemplazar `src/proxy.ts` completo**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { protegerArea } from "@/lib/supabase/middleware";
import { resolverHost, configHost, CABECERA_TENANT } from "@/lib/tenant/host";

/** Segmentos internos: solo se alcanzan por reescritura. */
function esRutaInterna(path: string): boolean {
  return ["/sitio", "/master"].some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Enruta por subdominio:
 * - app.<dominio>/… se reescribe a /master/… (panel master), con sesión y verificación.
 * - <slug>.<dominio>/admin/… queda en su ruta (resuelve el tenant por host), con sesión y verificación.
 * - <slug>.<dominio>/… se reescribe a /sitio/<slug>/…
 * /api atiende cualquier host.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (esRutaInterna(path)) return new NextResponse(null, { status: 404 });
  if (path.startsWith("/api/")) return NextResponse.next();

  // x-tenant-slug solo lo fija el proxy: se descarta el que mande el cliente.
  const cabeceras = new Headers(request.headers);
  cabeceras.delete(CABECERA_TENANT);

  const destino = resolverHost(request.headers.get("host") ?? "", configHost());
  if (destino.tipo === "master") {
    const url = request.nextUrl.clone();
    url.pathname = `/master${path === "/" ? "" : path}`;
    return protegerArea(request, { tipo: "master", cabeceras, reescribirA: url });
  }
  if (destino.tipo !== "tenant") {
    // La página del producto (dominio raíz) llega más adelante.
    return new NextResponse("No encontrado", { status: 404 });
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    return protegerArea(request, { tipo: "tenant", cabeceras });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/sitio/${destino.slug}${path === "/" ? "" : path}`;
  // El layout raíz lee el tenant de esta cabecera para el lang del documento. Va en los
  // headers del request (no de la respuesta), así no llega al navegador.
  cabeceras.set(CABECERA_TENANT, destino.slug);
  return NextResponse.rewrite(url, { request: { headers: cabeceras } });
}

export const config = {
  // Todo menos estáticos de Next y archivos con extensión (imágenes de public/);
  // /sitio y /master aparte, para que el bloqueo también corra en rutas con extensión.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)",
    "/sitio/:path*",
    "/master/:path*",
  ],
};
```

- [ ] **Step 3: Reemplazar `src/lib/tenant/admin.ts` completo**

```ts
import "server-only";
import { cache } from "react";
import { perfilDe } from "@/lib/auth/servicio";
import { sesionActual } from "@/lib/auth/sesion";
import { tenantDelRequest } from "./actual";
import { perfilAutorizado } from "./permisos";
import type { Tenant } from "./tipos";

/**
 * Tenant del panel: exige sesión con la verificación en dos pasos completa y un perfil
 * autorizado para el tenant del host (el cliente solo administra el suyo; el master,
 * cualquiera). Lanza si no.
 * La verificación se repite acá, y no queda solo en el proxy, porque una server action
 * del panel se puede invocar con un POST a cualquier ruta, incluso a una del sitio
 * público, que el proxy no protege.
 * Con cache(): layout y página comparten una sola evaluación por request.
 */
export const tenantDelAdmin = cache(async (): Promise<Tenant> => {
  const tenant = await tenantDelRequest();
  if (!tenant) throw new Error("No autorizado");

  const sesion = await sesionActual();
  if (!sesion?.verificada) throw new Error("No autorizado");

  if (!perfilAutorizado(await perfilDe(sesion.userId), tenant.id)) throw new Error("No autorizado");
  return tenant;
});
```

- [ ] **Step 4: Verificar tipos, tests, lint y build**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
npm run build
grep -rn "updateSession\|auth.getUser" src
```

Expected:
- Sin errores, todos los tests en PASS y el build sin errores.
- El `grep` solo muestra `auth.getUser` en `src/lib/supabase/middleware.ts`. No quedan usos de `updateSession`.

- [ ] **Step 5: Comprobar las redirecciones en desarrollo**

Seguir "Servidor de desarrollo": `docker compose stop` y `npm run dev > "$LOG" 2>&1` en background, hasta que el log diga `Ready`. Después:

```bash
G="Host: gisel.localhost:3000"
curl -s -o /dev/null -w 'admin sin sesión: %{http_code} %{redirect_url}\n' -H "$G" http://localhost:3000/admin
curl -s -o /dev/null -w 'servicios sin sesión: %{http_code} %{redirect_url}\n' -H "$G" http://localhost:3000/admin/servicios
curl -s -o /dev/null -w 'verificar sin sesión: %{http_code} %{redirect_url}\n' -H "$G" http://localhost:3000/admin/verificar
curl -s -o /dev/null -w 'mfa suelta: %{http_code} %{redirect_url}\n' -H "$G" -H "Cookie: mfa=v1.falsa" http://localhost:3000/admin
for p in login recuperar restablecer; do curl -s -o /dev/null -w "$p: %{http_code}\n" -H "$G" "http://localhost:3000/admin/$p"; done
curl -s -H "$G" http://localhost:3000/admin/login | grep -o -E 'id="form-login"|\$ACTION_ID_[0-9a-zA-Z]+|¿Olvidaste tu contraseña\?' | sed -E 's/(ACTION_ID_).*/\1…/' | sort -u
curl -s -o /dev/null -w 'master directo: %{http_code}\n' -H "$G" http://localhost:3000/master
curl -s -o /dev/null -w 'sitio: %{http_code}\n' -H "$G" http://localhost:3000/
```

Expected:
- `admin sin sesión: 307 http://gisel.localhost:3000/admin/login`, y lo mismo para `servicios sin sesión`, `verificar sin sesión` y `mfa suelta`. Lo que importa es la ruta `/admin/login`: el host de `%{redirect_url}` puede variar.
- `login: 200`, `recuperar: 200` y `restablecer: 200` (esta última muestra "El link no es válido…", porque no lleva `token_hash`).
- El `grep` muestra `$ACTION_ID_…`, `id="form-login"` y `¿Olvidaste tu contraseña?`. El campo oculto confirma que el formulario funciona sin JavaScript, que es lo que usa la Task 13.
- `master directo: 404` y `sitio: 200`.

Detener el servidor de desarrollo (solo su árbol de procesos; ver "Servidor de desarrollo").

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/middleware.ts src/proxy.ts src/lib/tenant/admin.ts
git commit -F - <<'EOF'
feat(auth): el proxy y el panel exigen la verificación en dos pasos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 12: Usuario master y panel master mínimo

**Files:**
- Create: `scripts/crear-master.mjs`, `src/lib/auth/master.ts`, `src/app/master/layout.tsx`, `src/app/master/page.tsx`, `src/app/master/login/page.tsx`, `src/app/master/verificar/page.tsx`, `src/app/master/recuperar/page.tsx`, `src/app/master/restablecer/page.tsx`

- [ ] **Step 1: Crear `scripts/crear-master.mjs`**

```js
// Crea (o confirma) el usuario master de la plataforma.
// Lee MASTER_EMAIL y MASTER_PASSWORD del .env.local: la contraseña nunca va en
// argumentos, código, migraciones ni repositorio.
// Idempotente: si el usuario ya existe, no toca su contraseña y se asegura de que su
// perfil sea master.
// Uso: node --env-file=.env.local scripts/crear-master.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.MASTER_EMAIL?.trim().toLowerCase();
const password = process.env.MASTER_PASSWORD;

if (!url || !secret) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  process.exit(1);
}
if (!email || !password) {
  console.error("Faltan MASTER_EMAIL o MASTER_PASSWORD en .env.local.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("MASTER_PASSWORD tiene que tener al menos 12 caracteres.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function buscarUsuario() {
  const porPagina = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: porPagina });
    if (error) throw new Error(`listar usuarios: ${error.message}`);
    const usuario = data.users.find((u) => u.email?.toLowerCase() === email);
    if (usuario) return usuario;
    if (data.users.length < porPagina) return null;
  }
}

try {
  let usuario = await buscarUsuario();
  if (usuario) {
    console.log(`= El usuario ${email} ya existía (no se cambia su contraseña).`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`crear usuario: ${error.message}`);
    usuario = data.user;
    console.log(`✓ Usuario ${email} creado.`);
  }

  const { data: previo, error: errorPerfil } = await admin
    .from("perfiles")
    .select("rol, tenant_id")
    .eq("user_id", usuario.id)
    .maybeSingle();
  if (errorPerfil) throw new Error(`leer perfil: ${errorPerfil.message}`);
  if (previo?.rol === "master") {
    console.log("= Su perfil ya era master.");
  } else {
    if (previo) console.log(`! Tenía perfil "${previo.rol}": pasa a master.`);
    const { error } = await admin
      .from("perfiles")
      .upsert({ user_id: usuario.id, rol: "master", tenant_id: null }, { onConflict: "user_id" });
    if (error) throw new Error(`asignar perfil: ${error.message}`);
    console.log("✓ Perfil master asignado.");
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
```

- [ ] **Step 2: Crear `src/lib/auth/master.ts`**

```ts
import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { perfilDe } from "./servicio";
import { sesionActual } from "./sesion";

/**
 * Master con la verificación en dos pasos completa. Lanza si no. Se repite en el servidor
 * por el mismo motivo que tenantDelAdmin: una action se puede invocar desde cualquier ruta.
 */
export const masterVerificado = cache(async (): Promise<{ userId: string }> => {
  const sesion = await sesionActual();
  if (!sesion?.verificada) throw new Error("No autorizado");
  const perfil = await perfilDe(sesion.userId);
  if (perfil?.rol !== "master") throw new Error("No autorizado");
  return { userId: sesion.userId };
});

export type TenantListado = { nombre: string; slug: string; estado: "activo" | "suspendido" };

/** Clientes de la plataforma, para la home master (solo lectura hasta la etapa C). */
export async function listarTenants(): Promise<TenantListado[]> {
  await masterVerificado();
  const { data, error } = await createAdminClient()
    .from("tenants")
    .select("nombre, slug, estado")
    .order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []) as TenantListado[];
}
```

- [ ] **Step 3: Crear `src/app/master/layout.tsx`**

```tsx
import { Container } from "@/components/ui/Container";
import { cerrarSesion } from "@/lib/auth/acciones";
import { masterVerificado } from "@/lib/auth/master";
import { sesionActual } from "@/lib/auth/sesion";
import { COLORES_PLATAFORMA } from "@/lib/plataforma";
import { estiloMarca } from "@/lib/tenant/estilo";

export const metadata = { title: "Panel master" };

const ESTILO = estiloMarca(COLORES_PLATAFORMA);

/** Área master (app.<dominio>, reescrita a /master por el proxy), en español y con la paleta de la plataforma. */
export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const envolver = (contenido: React.ReactNode) => (
    <div style={ESTILO} className="flex flex-1 flex-col">
      {contenido}
    </div>
  );

  // Pantallas de ingreso: sin el shell (el proxy no deja llegar a otra cosa sin verificar).
  const sesion = await sesionActual();
  if (!sesion?.verificada) return envolver(children);

  const esMaster = await masterVerificado().then(
    () => true,
    () => false,
  );
  if (!esMaster) {
    return envolver(
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6">
        <p className="font-sans text-texto-suave">Esta cuenta no tiene acceso al panel master.</p>
        <form id="form-salir" action={cerrarSesion}>
          <button className="font-sans text-sm text-primario hover:text-primario-oscuro">Salir</button>
        </form>
      </main>,
    );
  }

  return envolver(
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-primario/15 bg-white/70">
        <Container className="flex h-16 items-center justify-between">
          <span className="font-serif text-xl text-texto">Panel master</span>
          <form id="form-salir" action={cerrarSesion}>
            <button className="font-sans text-sm text-primario hover:text-primario-oscuro">Salir</button>
          </form>
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>,
  );
}
```

- [ ] **Step 4: Crear `src/app/master/page.tsx`**

```tsx
import { listarTenants } from "@/lib/auth/master";
import { urlDelTenant } from "@/lib/tenant/urls";

export default async function MasterInicio() {
  const tenants = await listarTenants();
  return (
    <div>
      <h1 className="font-serif text-4xl text-texto">Panel master</h1>
      <p className="mt-2 font-sans text-texto-suave">Clientes de la plataforma.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-primario/15 bg-white/60">
        <table className="w-full font-sans text-sm">
          <thead>
            <tr className="border-b border-primario/15 text-left text-texto-suave">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Subdominio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.slug} className="border-b border-primario/10 last:border-0">
                <td className="px-4 py-3 text-texto">{t.nombre}</td>
                <td className="px-4 py-3">
                  <a href={urlDelTenant(t.slug)} className="text-primario hover:text-primario-oscuro">
                    {t.slug}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className={t.estado === "activo" ? "text-secundario-oscuro" : "text-primario-oscuro"}>
                    {t.estado === "activo" ? "Activo" : "Suspendido"}
                  </span>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-texto-suave">
                  Todavía no hay clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Crear las 4 pantallas de ingreso del master**

`src/app/master/login/page.tsx`:

```tsx
import { PaginaLogin, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Ingresar · Panel master" };

export default function LoginMasterPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaLogin tipo="master" searchParams={searchParams} />;
}
```

`src/app/master/verificar/page.tsx`:

```tsx
import { PaginaVerificar, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Verificación · Panel master" };

export default function VerificarMasterPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaVerificar tipo="master" searchParams={searchParams} />;
}
```

`src/app/master/recuperar/page.tsx`:

```tsx
import { PaginaRecuperar, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Recuperar contraseña · Panel master" };

export default function RecuperarMasterPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRecuperar tipo="master" searchParams={searchParams} />;
}
```

`src/app/master/restablecer/page.tsx`:

```tsx
import { PaginaRestablecer, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Contraseña nueva · Panel master" };

export default function RestablecerMasterPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRestablecer tipo="master" searchParams={searchParams} />;
}
```

- [ ] **Step 6: Verificar tipos, lint, tests y build**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
node --check scripts/crear-master.mjs
npm run build
```

Expected: sin errores, todos los tests en PASS y el build sin errores. `/master`, `/master/login`, `/master/verificar`, `/master/recuperar` y `/master/restablecer` aparecen como dinámicas.

- [ ] **Step 7: Crear el usuario master (necesita `MASTER_EMAIL` y `MASTER_PASSWORD`)**

Comprobar que estén las variables, solo por nombre y sin mostrar valores:

```bash
for k in MASTER_EMAIL MASTER_PASSWORD; do grep -q "^$k=." .env.local && echo "$k: presente" || echo "$k: FALTA"; done
```

Si alguna dice `FALTA`, hay que **detenerse** y pedirle a Pablo que agregue al `.env.local` las dos líneas `MASTER_EMAIL=<su email>` y `MASTER_PASSWORD=<una contraseña de 12 caracteres o más>`. Las escribe él y no se le piden por el chat. Después se sigue desde acá.

Con las dos presentes:

```bash
node --env-file=.env.local scripts/crear-master.mjs
node --env-file=.env.local scripts/crear-master.mjs
```

Expected:
- **Primera corrida:** `✓ Usuario <email> creado.` (o `= El usuario <email> ya existía…`) y `✓ Perfil master asignado.`.
- **Segunda corrida (idempotente):** `= El usuario <email> ya existía (no se cambia su contraseña).` y `= Su perfil ya era master.`.

Recomendarle a Pablo que, con el master ya creado, borre `MASTER_PASSWORD` del `.env.local`. El contenedor recibe todo el `.env.local` como variables de entorno.

- [ ] **Step 8: Comprobar el área master en desarrollo**

Con el servidor de desarrollo levantado (ver "Servidor de desarrollo"):

```bash
A="Host: app.localhost:3000"
curl -s -o /dev/null -w 'app raíz sin sesión: %{http_code} %{redirect_url}\n' -H "$A" http://localhost:3000/
curl -s -H "$A" http://localhost:3000/login | grep -o -E 'Panel master|id="form-login"|--marca-primario:#3d5a80' | sort -u
curl -s -o /dev/null -w 'app /master directo: %{http_code}\n' -H "$A" http://localhost:3000/master
curl -s -o /dev/null -w 'app recuperar: %{http_code}\n' -H "$A" http://localhost:3000/recuperar
```

Expected:
- `app raíz sin sesión: 307 …/login`.
- El `grep` muestra `--marca-primario:#3d5a80`, `Panel master` e `id="form-login"`.
- `app /master directo: 404` y `app recuperar: 200`.

Detener el servidor de desarrollo.

- [ ] **Step 9: Commit**

```bash
git add scripts/crear-master.mjs src/lib/auth/master.ts src/app/master/layout.tsx src/app/master/page.tsx src/app/master/login/page.tsx src/app/master/verificar/page.tsx src/app/master/recuperar/page.tsx src/app/master/restablecer/page.tsx
git status --short   # .env.local y docs/resumen-arquitectura-y-desarrollo.md NO deben estar en staged
git commit -F - <<'EOF'
feat(master): usuario master y panel master mínimo en app.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 13: Verificación de punta a punta

**Files:**
- Create: `scripts/e2e-login.mjs`

Necesita la migración 0011 aplicada (Task 6, Step 4).

- [ ] **Step 1: Crear `scripts/e2e-login.mjs`**

```js
// Prueba de punta a punta del login en dos pasos contra el servidor en marcha (puerto 3000).
// Se comporta como un navegador sin JavaScript: los formularios con server actions llevan
// un campo oculto $ACTION_ID_…, y Next ejecuta la action y responde 303 con Location.
// Crea un usuario temporal con perfil cliente de "gisel" y lo borra al terminar.
//   dev <log>  servidor de desarrollo. <log> es el archivo con su salida, de donde se leen
//              los códigos y los links que imprime "[MFA dev]".
//   docker     contenedor de producción sin email de plataforma: el login tiene que fallar cerrado.
// Si MASTER_EMAIL y MASTER_PASSWORD están en el entorno, en modo dev también prueba el login del master.
// Uso: node --env-file=.env.local scripts/e2e-login.mjs dev <log> | docker
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { request } from "node:http";

const [modo, rutaLog] = process.argv.slice(2);
if (!(modo === "dev" && rutaLog) && modo !== "docker") {
  console.error("Uso: node --env-file=.env.local scripts/e2e-login.mjs dev <log> | docker");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const HOST_TENANT = "gisel.localhost:3000";
const HOST_MASTER = "app.localhost:3000";
const sufijo = Date.now().toString(36);
const email = `e2e-login-${sufijo}@example.com`;
const emailInexistente = `e2e-nadie-${sufijo}@example.com`;
const claveInicial = randomBytes(18).toString("base64url");
const claveNueva = randomBytes(18).toString("base64url");

let fallas = 0;
function verificar(ok, descripcion, detalle) {
  console.log(`${ok ? "✓" : "✗"} ${descripcion}`);
  if (!ok) {
    fallas++;
    if (detalle) console.log(`    (${detalle})`);
  }
}

/** Ruta y query de la redirección (Location puede venir absoluta o relativa). */
function destino(r) {
  if (!r.location) return "";
  const u = new URL(r.location, "http://base");
  return `${u.pathname}${u.search}`;
}
const resumen = (r) => `${r.status} ${r.location}`;

function idDeAccion(html, formId) {
  const inicio = html.indexOf(`id="${formId}"`);
  if (inicio < 0) throw new Error(`la página no tiene el formulario #${formId}`);
  const m = html.slice(inicio, html.indexOf("</form>", inicio)).match(/name="(\$ACTION_ID_[0-9a-zA-Z]+)"/);
  if (!m) throw new Error(`#${formId} no tiene el campo $ACTION_ID_`);
  return m[1];
}

class Navegador {
  constructor(host) {
    this.host = host;
    this.cookies = new Map();
  }

  guardar(setCookie) {
    for (const linea of setCookie) {
      const [par, ...atributos] = linea.split(";");
      const i = par.indexOf("=");
      const nombre = par.slice(0, i).trim();
      const valor = par.slice(i + 1).trim();
      const vencida = atributos.some((a) => {
        const [k, v] = a.trim().split("=");
        if (/^max-age$/i.test(k)) return Number(v) <= 0;
        if (/^expires$/i.test(k)) return new Date(v).getTime() <= Date.now();
        return false;
      });
      if (!valor || vencida) this.cookies.delete(nombre);
      else this.cookies.set(nombre, valor);
    }
  }

  tieneSesion() {
    return [...this.cookies.keys()].some((k) => k.startsWith("sb-"));
  }

  pedir(metodo, ruta, cuerpo) {
    return new Promise((resolve, reject) => {
      const headers = { host: this.host };
      const cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookie) headers.cookie = cookie;
      if (cuerpo) {
        headers["content-type"] = cuerpo.tipo;
        headers["content-length"] = cuerpo.datos.length;
        headers.origin = `http://${this.host}`;
      }
      const req = request({ hostname: "127.0.0.1", port: 3000, method: metodo, path: ruta, headers }, (res) => {
        const partes = [];
        res.on("data", (c) => partes.push(c));
        res.on("end", () => {
          const setCookie = res.headers["set-cookie"] ?? [];
          this.guardar(setCookie);
          resolve({
            status: res.statusCode,
            location: res.headers.location ?? "",
            setCookie,
            html: Buffer.concat(partes).toString("utf8"),
          });
        });
      });
      req.on("error", reject);
      if (cuerpo) req.write(cuerpo.datos);
      req.end();
    });
  }

  get(ruta) {
    return this.pedir("GET", ruta);
  }

  /** Envía el formulario con ese id como un navegador sin JavaScript (multipart). */
  async enviar(ruta, html, formId, campos) {
    const fd = new FormData();
    fd.append(idDeAccion(html, formId), "");
    for (const [k, v] of Object.entries(campos)) fd.append(k, v);
    const req = new Request("http://localhost/", { method: "POST", body: fd });
    const datos = Buffer.from(await req.arrayBuffer());
    return this.pedir("POST", ruta, { tipo: req.headers.get("content-type"), datos });
  }
}

async function ingresar(nav, base, emailUsuario, clave) {
  const pagina = await nav.get(`${base}/login`);
  return nav.enviar(`${base}/login`, pagina.html, "form-login", { email: emailUsuario, password: clave });
}

const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const reCodigo = (de) => new RegExp(`\\[MFA dev\\] c.digo para ${escaparRegex(de)}: (\\d{6})`, "g");
const reLink = (de) => new RegExp(`\\[MFA dev\\] link de recuperaci.n para ${escaparRegex(de)}: (\\S+)`, "g");
const ocurrencias = (re) => [...readFileSync(rutaLog, "utf8").matchAll(re)].map((m) => m[1]);

async function esperarNueva(re, previas) {
  for (let i = 0; i < 40; i++) {
    const todas = ocurrencias(re);
    if (todas.length > previas) return todas[todas.length - 1];
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no apareció en el log: ${re}`);
}

async function pruebaDev() {
  console.log("\nPanel del cliente (gisel):");
  const T = new Navegador(HOST_TENANT);
  let r = await T.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/login", "sin sesión, /admin redirige al login", resumen(r));

  r = await ingresar(T, "/admin", email, `${claveInicial}-mal`);
  verificar(r.status === 303 && destino(r) === "/admin/login?error=credenciales", "contraseña mala: error genérico", resumen(r));

  const codigosAntes = ocurrencias(reCodigo(email)).length;
  r = await ingresar(T, "/admin", email, claveInicial);
  verificar(destino(r) === "/admin/verificar?info=codigo_enviado", "contraseña buena: pide el código", resumen(r));
  verificar(T.tieneSesion(), "quedó la sesión de Supabase");

  r = await T.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/verificar", "con sesión y sin código, /admin redirige a verificar", resumen(r));

  const codigo = await esperarNueva(reCodigo(email), codigosAntes);
  verificar(/^\d{6}$/.test(codigo), "el código se imprimió en la consola del servidor ([MFA dev])");

  let pagina = await T.get("/admin/verificar");
  verificar(pagina.status === 200, "la pantalla de verificación responde");
  r = await T.enviar("/admin/verificar", pagina.html, "form-reenviar", {});
  verificar(destino(r) === "/admin/verificar?error=espera", "no se puede reenviar antes de 60 s", resumen(r));

  const incorrecto = codigo === "000000" ? "111111" : "000000";
  r = await T.enviar("/admin/verificar", pagina.html, "form-verificar", { codigo: incorrecto });
  verificar(destino(r) === "/admin/verificar?error=incorrecto", "código incorrecto: error", resumen(r));

  r = await T.enviar("/admin/verificar", pagina.html, "form-verificar", { codigo, recordar: "on" });
  verificar(r.status === 303 && destino(r) === "/admin", "código correcto: entra al panel", resumen(r));
  const mfa = r.setCookie.find((c) => c.startsWith("mfa=")) ?? "";
  verificar(/HttpOnly/i.test(mfa) && /SameSite=lax/i.test(mfa) && !/;\s*Secure/i.test(mfa), "cookie mfa httpOnly, SameSite=Lax y sin Secure en http", mfa);
  const dispositivo = r.setCookie.find((c) => c.startsWith("dispositivo=")) ?? "";
  verificar(/HttpOnly/i.test(dispositivo) && /Max-Age=2592000/i.test(dispositivo), "cookie dispositivo httpOnly por 30 días", dispositivo);

  r = await T.get("/admin");
  verificar(r.status === 200 && r.html.includes("Hola,"), "con sesión y código, el panel responde", String(r.status));

  const mfaOriginal = T.cookies.get("mfa");
  T.cookies.set("mfa", `${mfaOriginal.slice(0, -2)}xx`);
  r = await T.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/verificar", "cookie mfa alterada: vuelve a verificar", resumen(r));
  T.cookies.set("mfa", mfaOriginal);

  pagina = await T.get("/admin");
  r = await T.enviar("/admin", pagina.html, "form-salir", {});
  verificar(r.status === 303 && destino(r) === "/admin/login", "salir lleva al login", resumen(r));
  verificar(!T.cookies.has("mfa") && T.cookies.has("dispositivo"), "salir borra mfa y conserva el dispositivo");
  verificar(!T.tieneSesion(), "salir cierra la sesión de Supabase");

  const codigosAlSalir = ocurrencias(reCodigo(email)).length;
  r = await ingresar(T, "/admin", email, claveInicial);
  verificar(destino(r) === "/admin", "dispositivo recordado: entra sin código", resumen(r));
  verificar(ocurrencias(reCodigo(email)).length === codigosAlSalir, "no se generó un código nuevo");
  r = await T.get("/admin");
  verificar(r.status === 200, "el panel responde con el dispositivo recordado");

  console.log("\nÁrea master y rutas internas:");
  const M = new Navegador(HOST_MASTER);
  r = await M.get("/");
  verificar(r.status === 307 && destino(r) === "/login", "app.: sin sesión, redirige a /login", resumen(r));
  r = await ingresar(M, "", email, claveInicial);
  verificar(destino(r) === "/login?error=credenciales", "un usuario cliente no entra al panel master", resumen(r));
  verificar(!M.tieneSesion(), "y no le queda sesión en app.");
  verificar((await M.get("/master")).status === 404, "app.: /master directo da 404");
  verificar((await T.get("/master/login")).status === 404, "gisel: /master da 404");

  console.log("\nRecuperación de contraseña:");
  const R = new Navegador(HOST_TENANT);
  const linksAntes = ocurrencias(reLink(email)).length;
  pagina = await R.get("/admin/recuperar");
  r = await R.enviar("/admin/recuperar", pagina.html, "form-recuperar", { email });
  const respuestaExistente = destino(r);
  r = await R.enviar("/admin/recuperar", pagina.html, "form-recuperar", { email: emailInexistente });
  verificar(
    respuestaExistente === "/admin/recuperar?info=recuperacion_enviada" && destino(r) === respuestaExistente,
    "misma respuesta exista o no la cuenta",
    `${respuestaExistente} / ${destino(r)}`,
  );
  const link = new URL(await esperarNueva(reLink(email), linksAntes));
  verificar(link.host === HOST_TENANT && link.pathname === "/admin/restablecer", "el link apunta al sitio del tenant", link.href);
  verificar(ocurrencias(reLink(emailInexistente)).length === 0, "para un email inexistente no se genera link");

  const rutaLink = `${link.pathname}${link.search}`;
  pagina = await R.get(rutaLink);
  verificar(pagina.status === 200 && pagina.html.includes('id="form-restablecer"'), "el link abre el formulario (sin consumir el token)");
  r = await R.enviar(rutaLink, pagina.html, "form-restablecer", {
    token_hash: link.searchParams.get("token_hash"),
    password: "corta",
    confirmacion: "corta",
  });
  verificar(destino(r).startsWith("/admin/restablecer?") && destino(r).includes("error=contrasena_corta"), "contraseña corta: error sin gastar el link", resumen(r));
  r = await R.enviar(rutaLink, pagina.html, "form-restablecer", {
    token_hash: link.searchParams.get("token_hash"),
    password: claveNueva,
    confirmacion: claveNueva,
  });
  verificar(destino(r) === "/admin/login?info=contrasena_cambiada", "la contraseña nueva se guarda", resumen(r));
  r = await R.enviar(rutaLink, pagina.html, "form-restablecer", {
    token_hash: link.searchParams.get("token_hash"),
    password: claveNueva,
    confirmacion: claveNueva,
  });
  verificar(destino(r) === "/admin/recuperar?error=link", "el link no se puede usar dos veces", resumen(r));

  r = await ingresar(new Navegador(HOST_TENANT), "/admin", email, claveInicial);
  verificar(destino(r) === "/admin/login?error=credenciales", "la contraseña vieja ya no sirve", resumen(r));
  const conDispositivo = new Navegador(HOST_TENANT);
  conDispositivo.cookies.set("dispositivo", T.cookies.get("dispositivo"));
  r = await ingresar(conDispositivo, "/admin", email, claveNueva);
  verificar(destino(r) === "/admin/verificar?info=codigo_enviado", "después del cambio, el dispositivo recordado ya no saltea el código", resumen(r));

  const masterEmail = process.env.MASTER_EMAIL?.trim().toLowerCase();
  const masterClave = process.env.MASTER_PASSWORD;
  if (!masterEmail || !masterClave) {
    console.log("\n- MASTER_EMAIL o MASTER_PASSWORD no están: se saltea el login del master.");
    return;
  }
  console.log("\nLogin del master:");
  const MM = new Navegador(HOST_MASTER);
  const codigosMaster = ocurrencias(reCodigo(masterEmail)).length;
  r = await ingresar(MM, "", masterEmail, masterClave);
  verificar(destino(r) === "/verificar?info=codigo_enviado", "master: pide el código", resumen(r));
  const codigoMaster = await esperarNueva(reCodigo(masterEmail), codigosMaster);
  pagina = await MM.get("/verificar");
  r = await MM.enviar("/verificar", pagina.html, "form-verificar", { codigo: codigoMaster });
  verificar(destino(r) === "/", "master: entra con el código", resumen(r));
  pagina = await MM.get("/");
  verificar(pagina.status === 200 && pagina.html.includes("Panel master") && pagina.html.includes("gisel"), "master: ve la lista de clientes");
  r = await MM.enviar("/", pagina.html, "form-salir", {});
  verificar(destino(r) === "/login" && !MM.cookies.has("mfa"), "master: salir", resumen(r));
}

async function pruebaDocker() {
  console.log("\nContenedor (producción):");
  const T = new Navegador(HOST_TENANT);
  let r = await T.get("/admin");
  verificar(r.status === 307 && destino(r) === "/admin/login", "sin sesión, /admin redirige al login", resumen(r));
  verificar((await new Navegador(HOST_MASTER).get("/login")).status === 200, "app.: /login responde");
  if (process.env.PLATFORM_GMAIL_USER && process.env.PLATFORM_GMAIL_APP_PASSWORD) {
    console.log("- La cuenta de la plataforma está configurada: no se prueba la falla cerrada (mandaría un email real).");
    return;
  }
  r = await ingresar(T, "/admin", email, claveInicial);
  verificar(destino(r) === "/admin/login?error=envio_no_configurado", "sin email de plataforma, el login falla cerrado", resumen(r));
  verificar(!T.tieneSesion(), "y no queda sesión");
}

let userId = null;
try {
  const { data: gisel, error: errorTenant } = await admin.from("tenants").select("id").eq("slug", "gisel").single();
  if (errorTenant) throw new Error(`tenant gisel: ${errorTenant.message}`);
  const { data: creado, error } = await admin.auth.admin.createUser({ email, password: claveInicial, email_confirm: true });
  if (error) throw new Error(`usuario de prueba: ${error.message}`);
  userId = creado.user.id;
  const { error: errorPerfil } = await admin.from("perfiles").insert({ user_id: userId, rol: "cliente", tenant_id: gisel.id });
  if (errorPerfil) throw new Error(`perfil de prueba: ${errorPerfil.message}`);

  if (modo === "dev") await pruebaDev();
  else await pruebaDocker();
} catch (e) {
  console.error(`\nError en la prueba: ${e.message}`);
  fallas++;
} finally {
  // Códigos y dispositivos se borran en cascada con el usuario.
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`✗ limpieza: no se pudo borrar el usuario ${userId}: ${error.message}`);
      fallas++;
    }
  }
  const hashes = [email, emailInexistente].map((e) => createHash("sha256").update(e).digest("hex"));
  const { error } = await admin.from("pedidos_recuperacion").delete().in("email_hash", hashes);
  if (error) {
    console.error(`✗ limpieza: pedidos_recuperacion: ${error.message}`);
    fallas++;
  }
}

console.log(fallas === 0 ? "\nE2E OK" : `\n${fallas} verificación(es) fallaron`);
process.exit(fallas === 0 ? 0 : 1);
```

- [ ] **Step 2: Tipos, lint, tests y build**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
node --check scripts/e2e-login.mjs
npm run build
```

Expected: sin errores, el build sin errores, y Vitest con todos los tests en PASS: los anteriores más `auth/codigos`, `auth/cookie-mfa`, `auth/dispositivo`, `auth/cookies`, `auth/rutas`, `auth/envio`, `auth/recuperacion`, `auth/mensajes`, `email/layout-marca` y `email/plantillas-auth`, y los nuevos casos de `tenant/permisos` y `tenant/urls`.

- [ ] **Step 3: Prueba de punta a punta en desarrollo**

Levantar el servidor de desarrollo con la salida en `$LOG` (ver "Servidor de desarrollo"). Comprobar que el `.env.local` **no** tiene la cuenta de la plataforma, así los códigos van a la consola:

```bash
for k in PLATFORM_GMAIL_USER PLATFORM_GMAIL_APP_PASSWORD; do grep -q "^$k=." .env.local && echo "$k: presente" || echo "$k: vacío"; done
node --env-file=.env.local scripts/e2e-login.mjs dev "$(cygpath -w "$LOG")"
```

Expected:
- Las dos variables dicen `vacío`. Si están presentes, el script falla al esperar el código en el log, porque el código se envía de verdad por email. En ese caso, hay que avisar a Pablo y hacer la prueba manual del Step 6.
- Todas las verificaciones en `✓` y al final `E2E OK`.

Si una verificación falla, hay que revisar el log del servidor (`tail -n 80 "$LOG"`) antes de tocar código. El script borra su usuario aunque falle.

- [ ] **Step 4: Aislamiento**

Run: `npm run test:aislamiento`
Expected: `Aislamiento OK`.

Detener el servidor de desarrollo (solo su árbol de procesos).

- [ ] **Step 5: Docker (producción)**

```bash
docker compose up -d --build --force-recreate
curl -s -o /dev/null -w 'docker gisel: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/
node --env-file=.env.local scripts/e2e-login.mjs docker
```

Expected:
- `docker gisel: 200`.
- En el script: `✓ sin sesión, /admin redirige al login`, `✓ app.: /login responde`, `✓ sin email de plataforma, el login falla cerrado` y `✓ y no queda sesión`, y al final `E2E OK`.

- [ ] **Step 6: Prueba manual en el navegador (para Pablo)**

La prueba automática cubre el flujo **sin JavaScript**. Esta lista cubre lo que solo se ve con el navegador: redirecciones de las actions con JS, overlays, autocompletado del código y aspecto. Se hace con `npm run dev` y el contenedor detenido. Los códigos y los links aparecen en la terminal del servidor como `[MFA dev] …`.

1. `http://gisel.localhost:3000/admin` lleva al login con los colores de Gisel.
2. Ingresar con la cuenta de Gisel lleva a "Verificá que sos vos". El código aparece en la terminal.
3. Un código equivocado muestra "El código no es correcto.". El código correcto con "Recordar este dispositivo por 30 días" tildado lleva al panel.
4. "Salir" vuelve al login. Al ingresar de nuevo con la contraseña, entra directo, sin código.
5. "¿Olvidaste tu contraseña?" → ingresar el email muestra el mensaje genérico. Abrir el link de la terminal y guardar una contraseña nueva lleva a "Listo, tu contraseña cambió". Al ingresar con la nueva, pide código otra vez (los dispositivos recordados se olvidaron).
6. `http://app.localhost:3000` lleva al login del panel master con la paleta neutra. Con el master: código, después "Panel master" con la lista de clientes, y "Salir".
7. Con el master, entrar a `http://gisel.localhost:3000/admin` también pide el código.
8. Cuando exista la cuenta de Gmail de la plataforma: cargar `PLATFORM_GMAIL_USER`, `PLATFORM_GMAIL_APP_PASSWORD` y `PLATFORM_EMAIL_FROM`, reiniciar y repetir los puntos 2 y 6.
   - El email del tenant llega con el logo y los colores de Gisel y el remitente "Estética Gisel".
   - El del master llega con la paleta neutra.
   - Para el portugués: `node --env-file=.env.local scripts/tenant-demo-br.mjs crear`, un usuario de `demo-br`, y el email llega en portugués.
9. En el dashboard de Supabase (Authentication → Providers → Email), confirmar que "Email OTP Expiration" sea 3600 s, que es la hora que promete el email de recuperación.
10. **Agregado al ejecutar la Task 13.** La E2E (`scripts/e2e-login.mjs dev`) ya cubre sin JavaScript: código incorrecto y agotado (5 intentos), espera y reenvío, dispositivo recordado, salir, recuperación con cierre de las sesiones abiertas, el bloqueo por email e IP (5 contraseñas malas desde una IP bloquean esa IP y no a otra) y el login de un master temporal. Queda para el navegador:
    - Todos los puntos de arriba **con JavaScript**: la action redirige en el cliente (sin 303) y muestra los overlays; comprobar que cada pantalla llega a su destino y muestra el mensaje correcto (`demasiados_intentos`, `agotado`, `espera`, `reenviado`).
    - El aspecto de las pantallas master (paleta neutra) y de la tabla de clientes.
    - Los límites de 20 fallidos por IP y 50 por email (solo tienen tests unitarios).
    - En producción, configurar `CABECERA_IP_CONFIABLE` (por ejemplo `x-real-ip`, fijada por Caddy con `{remote_host}`). Sin ella el login se limita solo por email y un tercero puede trabar una cuenta 15 minutos.
    - Crear el master real: agregar `MASTER_EMAIL` y `MASTER_PASSWORD` (12 caracteres o más) al `.env.local`, correr `node --env-file=.env.local scripts/crear-master.mjs` dos veces (la segunda tiene que decir que ya existía y ya era master), repetir el punto 6 y borrar `MASTER_PASSWORD` del `.env.local`.

- [ ] **Step 7: Commit**

```bash
git add scripts/e2e-login.mjs
git status --short   # .env.local y docs/resumen-arquitectura-y-desarrollo.md NO deben estar en staged
git commit -F - <<'EOF'
test(auth): prueba de punta a punta del login en dos pasos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Self-review

**Cobertura del spec (sección 6) y de la fila B de la sección 14:**

| Requisito | Task |
|---|---|
| 6.1 Email y contraseña con Supabase Auth; el perfil tiene que corresponder al host; si no, se cierra la sesión con un error genérico | 3 (`perfilPermitidoEnArea`), 9 (`iniciarSesion`), 13 |
| 6.1 El master entra en `app.` (y también al `/admin` de un tenant, decisión 6) | 3, 9, 12, 13 |
| 6.2 Cookie `dispositivo` (httpOnly, Secure con https, 30 días) que coincide con un registro vigente de `dispositivos_confiables` y saltea el código | 2, 6, 8, 9, 13 |
| 6.3 Código de 6 dígitos guardado solo como HMAC | 1, 6, 8 |
| 6.3 Vence a los 10 minutos, 5 intentos, reenvío después de 60 s | 1, 8, 13 (espera e incorrecto) |
| 6.3 Sale desde la cuenta de la plataforma con la marca del tenant (o de la plataforma para el master) | 5, 7, 8 (`marcaEmailDelArea`), 9 |
| 6.3 "Recordar este dispositivo": token aleatorio, hash en la base y token en la cookie | 2, 8, 9 |
| 6.4 Cookie `mfa` con HMAC sobre `user_id` y `session_id` del JWT | 2, 9 (`getClaims(accessToken)`), 11 |
| 6.4 El proxy exige sesión válida más `mfa` en `/admin` y `/master` | 3 (`decidirAcceso`), 11, 12, 13 |
| 6.4 Cerrar sesión invalida la verificación | 2 (otro `session_id`), 9 (`cerrarSesion` borra `mfa`), 13 |
| 6.5 Recuperación con `generateLink` tipo `recovery`, enviada con nuestra plantilla, sin los emails de Supabase | 5, 9, 10, 12, 13 |
| 6.6 Alta del usuario del cliente con link para definir su contraseña | **Etapa C**. La pantalla `/restablecer` y `plantillaRecuperacion` ya sirven de base |
| 6.7 Master creado por script con `MASTER_EMAIL` y `MASTER_PASSWORD` del `.env.local` | 12 |
| 14-B Login con verificación por email, dispositivos recordados, recuperación, usuario master | 1 a 13 |
| 14-B Cierre del agujero de `requireAdmin` | A1 (rol y tenant) + 11 (`tenantDelAdmin` exige la verificación) |
| 14-B Necesita Gmail de la plataforma y `MASTER_*` en el `.env` | 7 (variables, regla de consola y falla cerrada), 12 (comprueba las variables por nombre) |
| 13 Tests de códigos (vencimiento, intentos, reenvío), dispositivos (vencimiento, revocación) y firma de la cookie `mfa` | 1, 2 |
| 13 Aislamiento: la API no lee ni escribe las tablas nuevas | 6 |
| 10 Emails de login y contraseña por la plataforma, plantilla con logo, colores e idioma | 5, 7 |
| Decisión 2: regla de envío como función pura con tests | 4 (`modoEnvio`), 7, 13 (Docker falla cerrado) |
| Decisión 7: pantallas en español, emails en el idioma del tenant | 5 (tests es/pt), 10 |
| Decisión 8: `timingSafeEqual`, `randomInt`, httpOnly, límites, sin enumeración, CSRF | 1, 2, 4, 8, 9, 13 |
| Decisión 11: reglas del servidor de desarrollo y prueba E2E con usuario temporal | "Servidor de desarrollo", 11, 12, 13 |
| Decisión 12: `MFA_SECRET` sin imprimirlo | 7 |

Queda para la **etapa C**:
- La pantalla del master para revocar dispositivos (usa `revocarDispositivos`) y para reenviar el link de contraseña.
- El alta de usuarios de clientes (6.6).
- La traducción del panel y de las pantallas de ingreso.
- El panel master completo.

Queda para la **etapa D**:
- Migrar `plantillas.ts` (turnos y cursos) a `layoutMarca`.
- El Gmail de cada cliente con respaldo en la plataforma.

**Tipos consistentes entre tasks:**

- **`TipoArea = "tenant" | "master"`** (`rutas.ts`): lo usan `protegerArea`, `PaginasAuth` y `Area["tipo"]`.
  - `Area` (`area.ts`) es `{ tipo: "tenant"; tenant: Tenant } | { tipo: "master" }`.
  - `AreaPerfil` (`permisos.ts`) es `{ tipo: "master" } | { tipo: "tenant"; tenantId: string }`. Lo convierte `perfilPermitido(perfil, area)`.
- **Rutas:**
  - `rutaDelArea(tipo, ruta)` y `rutaEn(area | null, ruta)` reciben rutas relativas de `RUTAS_AUTH` o `"/"`.
  - `decidirAcceso(ruta, { haySesion, mfaValida })` devuelve `{ tipo: "redirigir", a }` con `a` relativa, y `protegerArea` la convierte con `rutaDelArea`.
- **Cookie `mfa`:** `verificarMfa(secreto, valor, userId, sessionId)` acepta `undefined` en todo, y la usan igual `protegerArea` y `sesionActual`. `firmarMfa(secreto, userId, sessionId)` solo la usa `marcarVerificada`.
- **Códigos y envío:**
  - `ResultadoCodigo` y `PermisoEnvio` salen de `codigos.ts`.
  - `CodigoNuevo` (`servicio.ts`) es `{ ok: true; codigo } | Exclude<PermisoEnvio, { ok: true }>`, así que `nuevo.motivo` es `"espera" | "limite"`, que está dentro de `ResultadoEnvio`.
  - Todas las claves de error que generan las actions (`ResultadoCodigo` salvo `"ok"`, `ResultadoEnvio` salvo `"ok"`, `ProblemaContrasena`, `sitio`, `email`, `link`, `credenciales`, `contrasena_rechazada` y `envio_emails_no_configurado`) tienen su mensaje en `mensajes.ts`. El test de la Task 4 las enumera.
- **Emails:**
  - `EmailAuth = { asunto; html; texto }` sale de `plantillas-auth.ts` y lo consume `entregarEmailAuth({ para, email, remitente?, avisoConsola })`.
  - `MarcaEmail.colores` es `ColoresMarca` (claves `colorPrimario`…), el mismo tipo de `estiloMarca` y de `COLORES_PLATAFORMA`, así que el layout master usa `estiloMarca(COLORES_PLATAFORMA)` sin conversión.
- **Cookies y sesión:**
  - `opcionesCookieAuth(protocolo, maxAgeSegundos)` siempre recibe `protocoloPlataforma()` y `DURACION_COOKIE_S` (2.592.000 s, lo que verifica la E2E en `Max-Age`).
  - `Sesion` (`sesion.ts`) tiene `userId`, `sessionId`, `email` y `verificada`. La usan `tenantDelAdmin`, `masterVerificado`, `verificarCodigo`, `reenviarCodigo` y los dos layouts.
  - `perfilDe(userId): Perfil | null` la usan `tenantDelAdmin`, `masterVerificado` y las actions.
- **Ids de formulario que lee `e2e-login.mjs`:** `form-login`, `form-verificar`, `form-reenviar`, `form-salir` (en los layouts y en la verificación), `form-recuperar` y `form-restablecer`.

**Orden y compilación:**
- Las Tasks 1 a 5 son módulos puros con tests. La 6 es SQL y script.
- De la 7 a la 12, cada una importa solo lo que crearon las anteriores.
- La Task 10 borra `admin/actions.ts` junto con sus dos únicos usos (layout y login).
- La Task 11 reemplaza `updateSession`, que solo usaba el proxy.
- `tsc` queda en verde al final de cada task.

**Sin placeholders:** todo archivo nuevo o reescrito tiene su contenido completo. Las ediciones puntuales indican el texto exacto a buscar y a poner. Los únicos valores que no están en el plan son secretos que no van en el repo (`MFA_SECRET` se genera; `MASTER_*` y `PLATFORM_*` los carga Pablo).

**Riesgos que quedan abiertos:**
- **`session_id` y revocación:**
  - En el proxy, `getUser()` detecta una sesión revocada (por ejemplo, después del `signOut` global del cambio de contraseña).
  - `sesionActual()` usa solo `getClaims()`. Con claves asimétricas valida la firma localmente, así que un access token revocado sigue valiendo hasta que vence (1 h por defecto), solo en actions invocadas por rutas que el proxy no valida.
  - Si el proyecto de Supabase usa todavía el secreto JWT simétrico (legacy), `getClaims()` llama al servidor de Auth en cada uso. Es más lento, pero igual de correcto.
- **Cookies en actions con JavaScript:** con `redirect()` en una action invocada con JS, Next renderiza el destino en la misma respuesta usando las cookies recién escritas. La E2E prueba el camino sin JS (303). El camino con JS lo cubre la prueba manual del Step 6.
- **IP para el límite de recuperación:** sale de `x-forwarded-for` (`getClientIp`). Es confiable detrás de Caddy, pero falsificable si el puerto 3000 queda expuesto directo. El límite por email no depende de la IP.
