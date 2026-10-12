# Etapa C1 — Panel master: alta y gestión de clientes: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** desde `app.<dominio>` el master da de alta un cliente (nombre, subdominio, país con idioma, zona horaria y moneda, módulos) y lo edita por pestañas: datos y estado, marca (4 colores con vista previa y control de contraste, logo, logo claro y foto), textos y contacto, módulos, usuario del cliente (alta con link para definir la contraseña, reenviar link, revocar dispositivos) y credenciales (Gmail con "probar conexión" y Mercado Pago manual, cifradas). Puede suspender y reactivar clientes. El sitio del cliente queda en línea sin deploy.

**Arquitectura:**
- **Reglas puras con tests:** contraste WCAG (`src/lib/tenant/contraste.ts`), cifrado AES-256-GCM (`src/lib/cripto/credenciales.ts`), validación de imágenes por bytes mágicos (`src/lib/storage/imagenes.ts`) y, en `src/lib/master/`, países, módulos, alertas, clasificación de errores SMTP, mensajes y parsers de formularios.
- **Datos:** la migración `0018` crea `crear_tenant(...)`, una función SQL que inserta el tenant y sus filas de marca, configuración y credenciales en una sola transacción. Solo la ejecuta la service role. Bucket público `sitios` creado por script (lectura pública por URL, escritura solo con la service role).
- **Servidor:** `src/lib/master/servicio.ts` (clientes, marca, imágenes), `credenciales.ts` (cifrado y prueba de Gmail), `usuarios.ts` (usuario del cliente) y `acciones.ts` (server actions). Todo empieza con `masterVerificado()`.
- **Pantallas:** `/` (lista), `/nuevo` (alta) y `/clientes/[slug]` con pestañas (`marca`, `textos`, `modulos`, `usuario`, `credenciales`), en español y con la paleta de la plataforma.

**Stack:** Next.js 16 (server actions con archivos, `experimental.serverActions.bodySizeLimit`, `images.remotePatterns`, `useSelectedLayoutSegment`, `revalidatePath`), Supabase (service role, RPC, Storage, Auth admin: `createUser`, `listUsers`, `generateLink`), `node:crypto`, nodemailer (`verify`), Tailwind 4, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-11-plataforma-multitenant-design.md](../specs/2026-10-11-plataforma-multitenant-design.md), secciones 4, 5, 6.6, 7 (panel master), 8, 9 (MP manual y Gmail "probar conexión") y la fila C de la 14.
**Plan anterior:** [2026-10-12-etapa-b-login-seguro.md](2026-10-12-etapa-b-login-seguro.md).

---

## Alcance y decisiones

**Incluido en C1:**

- Lista de clientes: nombre, subdominio, estado, módulos y alertas (email con error, Mercado Pago vencido o por vencer).
- Alta de cliente: nombre, subdominio, país (AR o BR) con sus valores por defecto editables, módulos. Crea tenant, marca, configuración y credenciales en una transacción.
- Edición por pestañas: Datos (y estado), Marca, Textos y contacto, Módulos, Usuario, Credenciales.
- Acciones: suspender y reactivar, revocar los dispositivos recordados del usuario del cliente, reenviar el link de contraseña.
- Cifrado de credenciales con `CREDENCIALES_KEY`. Se guardan ahora y se usan en la etapa D.

**Fuera de C1:**

- **C2:** traducción del panel del cliente, panel del cliente filtrado por módulos, pantallas de galería, preguntas frecuentes, botón de WhatsApp y testimonios, `modo_pago`, y los pendientes (mensaje de suspendido en el panel, borrado con errores de FK, links a secciones vacías, favicon por tenant).
- **Fuera de C:** OAuth de Mercado Pago ("Conectar Mercado Pago"), Google por tenant, el uso del Gmail de cada cliente en los emails (etapa D) y los crons (etapa E).

**Decisiones ya tomadas (no se reabren):**

1. **Alcance:** panel master en `app.<dominio>` (`src/app/master/**`, solo en español) con lista, alta, edición por pestañas y las acciones de arriba.
   - El país propone valores por defecto: AR → `es`, `America/Argentina/Buenos_Aires`, `ARS`; BR → `pt`, `America/Sao_Paulo`, `BRL`. Son editables dentro de los valores permitidos.
   - El alta crea `tenants`, `tenant_marca`, `configuracion_negocio` (horario vacío) y `tenant_credenciales` de forma atómica, con una función SQL `crear_tenant(...)` ejecutada con la service role.
2. **Colores:** solo `#rgb` o `#rrggbb` (sin alfa): `esColorHex` se ajusta, con tests. Contraste WCAG (luminancia relativa, funciones puras con tests):
   - texto sobre fondo ≥ 4,5 (bloquea);
   - fondo como texto sobre el primario (los botones son `text-fondo` sobre `bg-primario`) ≥ 4,5 (bloquea);
   - secundario sobre fondo ≥ 3 (aviso).
   - La vista previa en vivo (componente de cliente) usa `estiloMarca` y muestra un botón y textos de ejemplo. La action vuelve a validar.
3. **Imágenes:** bucket público `sitios` (script idempotente `scripts/setup-storage-sitios.mjs`), lectura pública, escritura solo con la service role.
   - Path `{tenant_id}/{tipo}-{timestamp}.{ext}`. Solo png, jpg/jpeg y webp (**nunca SVG**: XSS). Máximo 2 MB.
   - El formato se valida con los bytes mágicos en el servidor (función pura con tests), no con la extensión ni el MIME.
   - La URL pública va a `tenant_marca` (`logo_url`, `logo_claro_url`, `foto_perfil_url`). Al reemplazar se borra el objeto anterior.
   - El host de Supabase va a `images.remotePatterns` (derivado de `NEXT_PUBLIC_SUPABASE_URL`). `serverActions.bodySizeLimit` acorde.
4. **Usuario del cliente (spec 6.6):** el master carga el email. Se crea el usuario (`email_confirm: true`, contraseña aleatoria inutilizable), su perfil `cliente` con el `tenant_id`, y se envía un email "definí tu contraseña" con la plantilla de la marca, por el remitente de la plataforma (misma regla de consola y falla cerrada de B).
   - El master nunca ve ni define contraseñas de clientes.
   - Un usuario por tenant por ahora, sin cerrar la puerta a más.
   - Acciones "reenviar link" y "revocar dispositivos".
   - Si el email es de otro tenant o del master, se rechaza con un mensaje claro.
5. **Credenciales:** AES-256-GCM con `CREDENCIALES_KEY` (32 bytes en base64url). Quien ejecuta la genera en el `.env.local` **solo si falta y sin imprimirla**. Va a `.env.example` y el contenedor la recibe (es un secreto de runtime).
   - Módulo puro con tests `src/lib/cripto/credenciales.ts`: IV aleatorio de 12 bytes, formato versionado `v1.<iv>.<tag>.<cifrado>` en base64url, AAD = tenant y columna (un valor cifrado no se mueve a otro tenant ni a otra columna).
   - El panel nunca muestra secretos guardados: "configurado ✓ / sin configurar" y un campo para reemplazar (vacío = mantener).
   - Gmail: usuario, contraseña de aplicación, nombre del remitente y "probar conexión" (`verify()` de nodemailer con tiempo límite) que actualiza `smtp_estado` y `smtp_ultimo_error` (mensaje saneado, sin secretos).
   - Mercado Pago manual: access token, public key y secreto del webhook; `mp_origen = 'manual'`.
6. **Servidor:** cada action del master llama primero a `masterVerificado()`. Las escrituras de tablas con `tenant_id` usan `datosDelTenant(tenantId)`; `tenants` se escribe con la service role. Toda entrada se valida en el servidor con parsers puros con tests (no hay zod en `package.json`: validadores propios). Después de cambios de marca o textos: `revalidatePath("/sitio/[tenant]", "layout")`.
7. **Fuera de C1:** ver arriba.
8. **Pruebas:** tests unitarios de todo lo puro; `scripts/test-aislamiento.mjs` cubre la función nueva y el bucket; `scripts/e2e-master.mjs` de punta a punta; checklist manual para Pablo.
9. **Git y proceso:** todo en `main`, un commit por task con rutas explícitas y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nunca se agregan `docs/resumen-arquitectura-y-desarrollo.md` ni `.env.local`. Reglas del servidor de desarrollo más abajo.

**Decisiones tomadas al planificar C1:**

1. **Rutas del master:** `/` (lista), `/nuevo` (alta) y `/clientes/[slug]` (Datos) con `/clientes/[slug]/{marca,textos,modulos,usuario,credenciales}`.
   - El alta no va en `/clientes/nuevo` porque `nuevo` es un slug válido y la ruta estática le ganaría a `[slug]`.
   - Las pestañas marcan la activa con `useSelectedLayoutSegment()` (devuelve `null` en la página del propio layout), que no depende de la reescritura del proxy.
2. **El subdominio no se edita después del alta.** Cambiarlo rompe links de emails ya enviados, el retorno de Mercado Pago y los webhooks de la etapa D. Si hace falta, es otro cliente.
3. **Mensajes como clave en la URL** (`?error=`, `?ok=`, `?aviso=`), como en B. Los tipos `ClaveError`, `ClaveInfo` y `ClaveAviso` salen de las tablas de `src/lib/master/mensajes.ts`, así que una action no puede redirigir con una clave sin texto (no compila). Un error de validación hace perder lo tipeado en ese formulario; para un panel de un solo usuario se acepta.
4. **Una imagen por envío.** Cada imagen tiene su formulario, así que `bodySizeLimit: "3mb"` alcanza (2 MB más el overhead del multipart). La action mira `archivo.size` antes de leer el contenido.
5. **URLs de imágenes armadas por nosotros:** `prefijoPublico(url) + path`, no `getPublicUrl`.
   - `pathDeUrlPublica` solo reconoce URLs del bucket, de la carpeta de ese tenant y con el formato `{tipo}-{ms}.{ext}`. Las rutas del sitio (`/brand/…` de Gisel) nunca se borran.
   - `cacheControl` de 1 día: cada subida tiene una URL nueva, y una imagen reemplazada no queda años en la CDN.
6. **El alta usa la paleta de la plataforma** (`COLORES_PLATAFORMA`), no los valores por defecto de la tabla, que son los de Gisel y no pasan el contraste de los botones (ver 16). `inicio_titulo` = nombre del cliente.
7. **`crear_tenant` es plpgsql `security invoker`**, ejecutable solo por `service_role`. Una llamada RPC es una transacción. Subdominio repetido → error `23505` → mensaje `slug_en_uso`. La migración termina con `notify pgrst, 'reload schema'`.
8. **Usuario del cliente:**
   - `createUser` con `email_confirm: true` y una contraseña aleatoria de 32 bytes que nadie conoce; después el perfil. Si el perfil falla, se borra el usuario (compensación).
   - El link sale de `generateLink` tipo **`recovery`** (no `invite`: `invite` crea el usuario y su token se verifica con `type: "invite"`, que `/admin/restablecer` no acepta). Lleva a `<slug>.<dominio>/admin/restablecer?token_hash=…`, el mismo flujo de B (el token se consume en la action; después se cierran sesiones y se revocan dispositivos).
   - Plantilla nueva `plantillaInvitacion`, en el idioma del tenant, que avisa que el link vence en 1 hora y que se puede pedir otro desde la pantalla de ingreso.
   - Email ya registrado (`email_exists`): se busca el usuario con `listUsers` paginado. No se usa `generateLink` para eso porque dejaría un token de recuperación nuevo en una cuenta ajena. Se rechaza si es del master (`usuario_master`), de otro cliente (`usuario_de_otro`) o una cuenta sin perfil (`usuario_sin_cliente`): alguien puede conocer su contraseña.
9. **Un usuario por cliente:** `MAX_USUARIOS_POR_CLIENTE = 1` en el servidor; al llegar al límite el formulario de alta desaparece. La lista y las acciones ya trabajan con N usuarios.
10. **Crear usuario y reenviar link exigen el cliente activo** (con el tenant suspendido `/admin/restablecer` responde "sitio no disponible") y que el envío no esté bloqueado (regla de B). En desarrollo sin cuenta de plataforma el link sale en la consola: `[MFA dev] link de invitación para <email>: <link>`. Si el usuario se creó pero el email falló: `usuario_sin_email` (se reintenta con "Reenviar link").
11. **Qué se cifra:** `smtp_password`, `mp_access_token` y `mp_webhook_secret` (y ya están declarados `mp_refresh_token` y `google_refresh_token` para D). `smtp_usuario`, `smtp_nombre_remitente` y `mp_public_key` no son secretos: van en claro y el panel los muestra.
12. **Gmail: un solo botón "Probar conexión y guardar".**
    - Hace `verify()` con los datos efectivos (la contraseña nueva o la guardada, descifrada).
    - Si pasa, guarda y deja `smtp_estado = 'ok'`.
    - Si falla, no guarda nada nuevo (el spec pide verificar antes de guardar). Si los datos eran los guardados (misma cuenta y contraseña vacía), registra `smtp_estado = 'error'` y `smtp_ultimo_error`. "Probar la configuración guardada" es enviar el formulario sin contraseña.
    - `smtp_ultimo_error` sale de un vocabulario fijo más el código SMTP, nunca del mensaje de nodemailer.
    - La contraseña de aplicación son 16 letras; se aceptan con espacios (Google las muestra en grupos de 4).
13. **Mercado Pago manual:** un access token nuevo fija `mp_origen = 'manual'` y limpia los datos del OAuth (refresh token, vencimiento, user id). Guardar solo la public key o el secreto del webhook no cambia el origen ni el OAuth (si no había origen, queda `'manual'`). Los campos vacíos mantienen lo guardado.
14. **Alertas de la lista** (función pura): "Email con error" (`smtp_estado = 'error'`) y "Mercado Pago vencido / por vencer" (`mp_token_vence_en` vencido o en menos de 30 días; hoy solo lo llenaría el OAuth de D).
15. **`tenant_credenciales` se suma a `TablaTenant`** (tiene `tenant_id`): el master la lee y escribe con `datosDelTenant`.
16. **La paleta actual de Gisel no pasa la regla de los botones:** `#f6f1ea` sobre `#c0899a` da **2,56:1** (mínimo 4,5). Su pestaña Marca muestra el error y no deja guardar colores hasta elegir un primario más oscuro. Logos, textos y el resto se editan igual. No se migra su paleta: lo decide Pablo (checklist).
17. **Defensa en profundidad:** cada función exportada de `servicio.ts`, `credenciales.ts` y `usuarios.ts` llama a `masterVerificado()` (cacheado por request), además de las actions y las páginas.
18. **E2E `scripts/e2e-master.mjs`** (como `e2e-login.mjs`, navegador sin JavaScript). Reimplementa el formato de cifrado con `node:crypto` para comprobar que lo que guarda la app se descifra con la clave y el AAD esperados, y para sembrar una configuración de Gmail guardada.

**Riesgos verificados:**

- **Archivos por server actions:** `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`. `experimental.serverActions.bodySizeLimit` (por defecto 1 MB) cuenta el cuerpo crudo, con el overhead del multipart (10–20 KB). En `next/dist/server/app-render/action-handler.js` el cuerpo que supera el límite corta con `ApiError(413)` antes de ejecutar la action: un archivo de más de 3 MB muestra la pantalla de error, no nuestro mensaje. Entre 2 y 3 MB responde la validación propia (`imagen_grande`). `proxyClientMaxBodySize` (`…/proxyClientMaxBodySize.md`) es 10 MB por defecto: no cambia nada.
- **Preexistente (fuera de C1):** la subida de videos de cursos también usa server actions y ya estaba limitada a 1 MB; con 3 MB sigue limitada.
- **`next/image` y Storage:** `02-components/image.md`, `remotePatterns` acepta `new URL(...)` (sin query). `next/dist/server/config.js` llama a `loadEnvConfig` antes de evaluar `next.config`, así que `NEXT_PUBLIC_SUPABASE_URL` está en dev y en build. En `standalone` la configuración se serializa en el build; el build de Docker recibe el `.env.local` como secret. Next 16: `images.qualities` por defecto es `[75]` (la E2E pide `q=75`, `w=640`).
- **Archivos en el FormData:** Node 20+ tiene `File` y `Blob` globales. La action comprueba `instanceof Blob` (cubre el camino sin JS y con JS).
- **CDN de Storage:** borrar un objeto público no lo saca de inmediato de la CDN. La E2E comprueba el borrado con la API de Storage, no pidiendo la URL vieja.
- **Supabase Auth:** `createUser` con un email existente devuelve `code: "email_exists"` (`@supabase/auth-js`, `lib/error-codes.d.ts`).
- **Schema cache de PostgREST:** una función nueva puede tardar en exponerse; la migración hace `notify pgrst, 'reload schema'`.
- **Esquema real consultado** (solo SELECT): `configuracion_negocio` tiene `tenant_id`, `horas_minimas_cancelacion`, `minutos_preparacion_entre_turnos`, `sena_porcentaje` y `horario_atencion` (sin default). No hay bucket `sitios` ni policies en `storage.objects`. Migraciones aplicadas hasta la 0017. Postgres 17.6.

## Servidor de desarrollo (reglas para quien ejecuta)

- El contenedor `esteticagisel-web-1` ocupa el puerto 3000. Antes de `npm run dev`: `docker compose stop`.
- El servidor se levanta con la salida a un log, en background: `LOG="$TEMP/dev-etapa-c1.log"` y `CABECERA_IP_CONFIABLE=x-real-ip npm run dev > "$LOG" 2>&1` (la variable solo en ese entorno, no en el `.env.local`: la necesita `e2e-login.mjs`). Está listo cuando `grep -c "Ready" "$LOG"` da `1`. Se usa la misma ruta de `LOG` en todos los comandos. Para pasarla a `node`: `"$(cygpath -w "$LOG")"`.
- El servidor tiene que arrancar **después** de generar `CREDENCIALES_KEY` (Task 10): las variables se leen al arrancar.
- Para detenerlo, solo su árbol de procesos: `netstat -ano | grep ":3000" | grep LISTENING` da el PID (última columna), y después `taskkill //PID <pid> //T //F`. **Nunca** se matan todos los `node.exe`.
- Al terminar, se reconstruye el contenedor: `docker compose up -d --build --force-recreate`.
- La base: `SUPABASE_DB_URL` funciona (se usó para leer el esquema al planificar). Si `migrar.mjs` falla por conexión o autenticación, hay que detenerse y avisar a Pablo.

## Estructura de archivos

**Nuevos**

| Archivo | Responsabilidad |
|---|---|
| `src/lib/tenant/contraste.ts` (+test) | `normalizarHex`, luminancia y contraste WCAG, `evaluarPaleta` |
| `src/lib/cripto/credenciales.ts` (+test) | `claveDesdeTexto`, `cifrar`, `descifrar` (AES-256-GCM, formato `v1`, AAD) |
| `src/lib/cripto/clave.ts` | `claveCredenciales()` y `claveCredencialesConfigurada()` desde `CREDENCIALES_KEY` (server-only) |
| `src/lib/storage/imagenes.ts` (+test) | Bucket, tipos de imagen, bytes mágicos, tamaño, path, URL pública y su path |
| `src/lib/storage/sitios.ts` | Subir y borrar imágenes del bucket `sitios` (server-only) |
| `src/lib/master/pais.ts` (+test) | Países, idiomas, monedas, zonas horarias permitidas y valores por defecto |
| `src/lib/master/modulos.ts` (+test) | Lista de módulos, casillas del formulario y columnas |
| `src/lib/master/limites.ts` | Largos máximos de los textos |
| `src/lib/master/alertas.ts` (+test) | Alertas de la lista de clientes |
| `src/lib/master/smtp.ts` (+test) | Clasificación y texto saneado de errores SMTP |
| `src/lib/master/mensajes.ts` (+test) | Textos de error, información y aviso por clave, y sus tipos |
| `src/lib/master/formularios.ts` (+test) | Parsers de alta, datos, colores, textos, Gmail y Mercado Pago, y columnas |
| `src/lib/master/servicio.ts` | Clientes, alta (RPC), datos, estado, módulos, marca e imágenes (server-only) |
| `src/lib/master/gmail.ts` | `verificarGmail()` con tiempo límite (server-only) |
| `src/lib/master/credenciales.ts` | Estado de credenciales, Gmail (probar y guardar) y Mercado Pago (server-only) |
| `src/lib/master/usuarios.ts` | Usuarios del cliente: listar, invitar, reenviar link, revocar dispositivos (server-only) |
| `src/lib/master/acciones.ts` | Server actions del panel master |
| `src/components/master/ui.tsx` | Clases comunes y `<Mensajes>` |
| `src/components/master/CamposPais.tsx` | País, idioma, zona y moneda (cliente) |
| `src/components/master/CasillasModulos.tsx` | Casillas de módulos |
| `src/components/master/PestanasCliente.tsx` | Pestañas de la edición (cliente) |
| `src/components/master/EditorColores.tsx` | Colores con vista previa y contraste en vivo (cliente) |
| `src/app/master/nuevo/page.tsx` | Alta |
| `src/app/master/clientes/[slug]/layout.tsx`, `page.tsx` y `{marca,textos,modulos,usuario,credenciales}/page.tsx` | Edición por pestañas |
| `supabase/migrations/0018_crear_tenant.sql` | Función `crear_tenant` |
| `scripts/setup-storage-sitios.mjs` | Crea o actualiza el bucket `sitios` |
| `scripts/e2e-master.mjs` | Prueba de punta a punta del panel master |

**Reescritos completos:** `src/app/master/page.tsx` y `next.config.ts`.

**Modificados puntualmente:** `src/lib/tenant/estilo.ts` (+test), `src/lib/email/plantillas-auth.ts` (+test), `src/lib/tenant/consultas.ts`, `src/lib/auth/master.ts`, `src/app/master/layout.tsx`, `scripts/test-aislamiento.mjs`, `.env.example`, `docker-compose.yml` y `.env.local` (**no se commitea**).

**Commits:** cada task compila (`npx tsc --noEmit`), pasa los tests y termina en su propio commit. **No usar `git add -A`:** `docs/resumen-arquitectura-y-desarrollo.md` tiene cambios previos de Pablo, y `.env.local` nunca se agrega.

Formato de todos los commits:

```bash
git commit -F - <<'EOF'
<tipo>(<alcance>): <descripción>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 1: Colores sin transparencia y contraste WCAG

**Files:**
- Modify: `src/lib/tenant/estilo.ts`, `src/lib/tenant/estilo.test.ts`
- Create: `src/lib/tenant/contraste.ts`, `src/lib/tenant/contraste.test.ts`

- [ ] **Step 1: Tests que fallan**

En `src/lib/tenant/estilo.test.ts`, reemplazar:

```ts
import { estiloMarca } from "./estilo";
```

por:

```ts
import { esColorHex, estiloMarca } from "./estilo";

describe("esColorHex", () => {
  it("acepta #rgb y #rrggbb, con mayúsculas o espacios alrededor", () => {
    for (const v of ["#abc", "#ABC", "#1f6f8b", " #1F6F8B "]) expect(esColorHex(v), v).toBe(true);
  });

  it("rechaza transparencia (#rgba, #rrggbbaa) y cualquier otro formato", () => {
    for (const v of ["#abcd", "#1f6f8b80", "abc", "red", "#ggg", "", "#12345"]) expect(esColorHex(v), v).toBe(false);
  });
});
```

Y al final del `describe("estiloMarca", …)` existente, antes de su `});` final, agregar:

```ts
  it("omite los colores con transparencia", () => {
    expect(
      estiloMarca({ colorPrimario: "#c0899a80", colorSecundario: "#4e53", colorFondo: "#f6f1ea", colorTexto: "#1a1a1a" }),
    ).toEqual({ "--marca-fondo": "#f6f1ea", "--marca-texto": "#1a1a1a" });
  });
```

Crear `src/lib/tenant/contraste.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { COLORES_PLATAFORMA } from "@/lib/plataforma";
import {
  contraste,
  evaluarPaleta,
  luminancia,
  MINIMO_SECUNDARIO,
  MINIMO_TEXTO,
  normalizarHex,
} from "./contraste";

const GISEL = { colorPrimario: "#c0899a", colorSecundario: "#4e5340", colorFondo: "#f6f1ea", colorTexto: "#1a1a1a" };

describe("normalizarHex", () => {
  it("expande #rgb y pasa a minúsculas", () => {
    expect(normalizarHex("#ABC")).toBe("#aabbcc");
    expect(normalizarHex(" #1F6F8B ")).toBe("#1f6f8b");
  });

  it("rechaza lo que no es #rgb o #rrggbb", () => {
    for (const v of ["", "abc", "#abcd", "#1f6f8b80", "red", "#ggg"]) expect(normalizarHex(v), v).toBeNull();
  });
});

describe("luminancia y contraste (WCAG 2)", () => {
  it("blanco es 1 y negro es 0", () => {
    expect(luminancia("#ffffff")).toBeCloseTo(1, 5);
    expect(luminancia("#000")).toBe(0);
  });

  it("negro sobre blanco es 21:1 y un color consigo mismo es 1:1", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contraste("#1f6f8b", "#1f6f8b")).toBeCloseTo(1, 5);
  });

  it("es simétrico", () => {
    expect(contraste("#1f6f8b", "#f2f7f9")).toBeCloseTo(contraste("#f2f7f9", "#1f6f8b"), 10);
  });

  it("#777 sobre blanco queda apenas debajo de 4,5:1", () => {
    const r = contraste("#777777", "#ffffff");
    expect(r).toBeLessThan(4.5);
    expect(r).toBeGreaterThan(4.4);
  });

  it("lanza con un color inválido", () => {
    expect(() => luminancia("red")).toThrow();
  });
});

describe("evaluarPaleta", () => {
  it("la paleta de la plataforma no tiene problemas", () => {
    expect(evaluarPaleta(COLORES_PLATAFORMA)).toEqual([]);
  });

  it("texto igual al fondo: bloquea", () => {
    const problemas = evaluarPaleta({ ...COLORES_PLATAFORMA, colorTexto: COLORES_PLATAFORMA.colorFondo });
    expect(problemas.map((p) => p.clave)).toEqual(["contraste_texto"]);
    expect(problemas[0].bloquea).toBe(true);
  });

  it("la paleta actual de Gisel no pasa el contraste de los botones (2,56:1)", () => {
    const problemas = evaluarPaleta(GISEL);
    expect(problemas.map((p) => p.clave)).toEqual(["contraste_boton"]);
    expect(problemas[0].bloquea).toBe(true);
    expect(problemas[0].ratio).toBeCloseTo(2.56, 1);
    expect(problemas[0].minimo).toBe(MINIMO_TEXTO);
  });

  it("secundario con poco contraste: solo un aviso", () => {
    const problemas = evaluarPaleta({ ...COLORES_PLATAFORMA, colorSecundario: "#e9ebef" });
    expect(problemas).toEqual([
      expect.objectContaining({ clave: "contraste_secundario", bloquea: false, minimo: MINIMO_SECUNDARIO }),
    ]);
  });
});
```

- [ ] **Step 2: Correr los tests**

Run: `npx vitest run src/lib/tenant/estilo.test.ts src/lib/tenant/contraste.test.ts`
Expected: FAIL (`#abcd` y `#1f6f8b80` todavía pasan `esColorHex`; `./contraste` no existe).

- [ ] **Step 3: Implementar**

En `src/lib/tenant/estilo.ts`, reemplazar:

```ts
/** #rgb, #rgba, #rrggbb o #rrggbbaa. Cualquier otra cosa podría inyectar CSS en el style. */
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
```

por:

```ts
/**
 * #rgb o #rrggbb, sin transparencia (con alfa no se puede calcular el contraste de la
 * paleta). Cualquier otra cosa podría inyectar CSS en el style.
 */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
```

Crear `src/lib/tenant/contraste.ts`:

```ts
import { esColorHex, type ColoresMarca } from "./estilo";

/**
 * Legibilidad de la paleta de un tenant (WCAG 2, luminancia relativa). Puro: lo usan la
 * vista previa del panel master (en el navegador) y la action que guarda los colores.
 */
export const MINIMO_TEXTO = 4.5;
export const MINIMO_SECUNDARIO = 3;

/** "#ABC" → "#aabbcc". null si no es #rgb o #rrggbb. */
export function normalizarHex(valor: string): string | null {
  const v = valor.trim().toLowerCase();
  if (!esColorHex(v)) return null;
  if (v.length === 4) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return v;
}

function canal(valor: number): number {
  const s = valor / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa: 0 (negro) a 1 (blanco). Lanza si el color no es válido. */
export function luminancia(hex: string): number {
  const n = normalizarHex(hex);
  if (!n) throw new Error(`Color inválido: ${hex}`);
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Relación de contraste: de 1 (iguales) a 21 (negro y blanco). */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type ClaveContraste = "contraste_texto" | "contraste_boton" | "contraste_secundario";

export type ProblemaContraste = {
  clave: ClaveContraste;
  ratio: number;
  minimo: number;
  /** true: no se puede guardar. false: es un aviso. */
  bloquea: boolean;
};

/** Problemas de legibilidad de una paleta con los 4 colores válidos (lanza si alguno no lo es). */
export function evaluarPaleta(c: ColoresMarca): ProblemaContraste[] {
  const reglas: ProblemaContraste[] = [
    { clave: "contraste_texto", ratio: contraste(c.colorTexto, c.colorFondo), minimo: MINIMO_TEXTO, bloquea: true },
    // Los botones son bg-primario con text-fondo.
    { clave: "contraste_boton", ratio: contraste(c.colorFondo, c.colorPrimario), minimo: MINIMO_TEXTO, bloquea: true },
    {
      clave: "contraste_secundario",
      ratio: contraste(c.colorSecundario, c.colorFondo),
      minimo: MINIMO_SECUNDARIO,
      bloquea: false,
    },
  ];
  return reglas.filter((r) => r.ratio < r.minimo);
}
```

- [ ] **Step 4: Tests, tipos y la suite completa**

```bash
npx vitest run src/lib/tenant/estilo.test.ts src/lib/tenant/contraste.test.ts
npx tsc --noEmit
npx vitest run
```

Expected: todo en PASS (la suite completa también: `layout-marca` usa solo colores de 6 dígitos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant/estilo.ts src/lib/tenant/estilo.test.ts src/lib/tenant/contraste.ts src/lib/tenant/contraste.test.ts
git commit -F - <<'EOF'
feat(marca): colores sin transparencia y contraste WCAG de la paleta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Cifrado de credenciales

**Files:**
- Create: `src/lib/cripto/credenciales.ts`, `src/lib/cripto/credenciales.test.ts`

- [ ] **Step 1: Test que falla**

Crear `src/lib/cripto/credenciales.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { cifrar, claveDesdeTexto, descifrar, type ContextoCifrado } from "./credenciales";

const CLAVE = randomBytes(32);
const CTX: ContextoCifrado = { tenantId: "11111111-1111-1111-1111-111111111111", columna: "mp_access_token" };
const FORMATO = /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** Cambia un bit del primer byte de una de las partes (1 = iv, 2 = tag, 3 = cifrado). */
function alterar(valor: string, parte: number): string {
  const partes = valor.split(".");
  const bytes = Buffer.from(partes[parte], "base64url");
  bytes[0] ^= 0x01;
  partes[parte] = bytes.toString("base64url");
  return partes.join(".");
}

describe("claveDesdeTexto", () => {
  it("acepta 32 bytes en base64url", () => {
    const texto = randomBytes(32).toString("base64url");
    expect(claveDesdeTexto(texto).length).toBe(32);
    expect(claveDesdeTexto(` ${texto} `).length).toBe(32);
  });

  it("rechaza ausente, corta, larga o con caracteres inválidos", () => {
    expect(() => claveDesdeTexto(undefined)).toThrow();
    expect(() => claveDesdeTexto("")).toThrow();
    expect(() => claveDesdeTexto(randomBytes(16).toString("base64url"))).toThrow();
    expect(() => claveDesdeTexto(randomBytes(48).toString("base64url"))).toThrow();
    expect(() => claveDesdeTexto(`${randomBytes(30).toString("base64url")}+/=`)).toThrow();
  });
});

describe("cifrar y descifrar", () => {
  it("ida y vuelta, también con acentos y emojis", () => {
    for (const texto of ["APP_USR-123", "contraseña ñandú 🔐", "a"]) {
      expect(descifrar(CLAVE, cifrar(CLAVE, texto, CTX), CTX)).toBe(texto);
    }
  });

  it("formato v1.<iv>.<tag>.<cifrado> en base64url, sin el texto en claro", () => {
    const valor = cifrar(CLAVE, "APP_USR-secreto", CTX);
    expect(valor).toMatch(FORMATO);
    expect(valor).not.toContain("secreto");
    const [, iv, tag] = valor.split(".");
    expect(Buffer.from(iv, "base64url").length).toBe(12);
    expect(Buffer.from(tag, "base64url").length).toBe(16);
  });

  it("dos cifrados del mismo texto son distintos (IV aleatorio)", () => {
    expect(cifrar(CLAVE, "igual", CTX)).not.toBe(cifrar(CLAVE, "igual", CTX));
  });

  it("no se descifra con otro tenant ni con otra columna (AAD)", () => {
    const valor = cifrar(CLAVE, "secreto", CTX);
    expect(() => descifrar(CLAVE, valor, { ...CTX, tenantId: "22222222-2222-2222-2222-222222222222" })).toThrow();
    expect(() => descifrar(CLAVE, valor, { ...CTX, columna: "smtp_password" })).toThrow();
  });

  it("no se descifra con otra clave", () => {
    expect(() => descifrar(randomBytes(32), cifrar(CLAVE, "secreto", CTX), CTX)).toThrow();
  });

  it("detecta cualquier alteración del iv, el tag o el cifrado", () => {
    const valor = cifrar(CLAVE, "secreto", CTX);
    for (const parte of [1, 2, 3]) expect(() => descifrar(CLAVE, alterar(valor, parte), CTX)).toThrow();
  });

  it("rechaza formatos desconocidos", () => {
    const valor = cifrar(CLAVE, "secreto", CTX);
    expect(() => descifrar(CLAVE, valor.replace(/^v1\./, "v2."), CTX)).toThrow();
    expect(() => descifrar(CLAVE, "secreto-en-claro", CTX)).toThrow();
    expect(() => descifrar(CLAVE, valor.split(".").slice(0, 3).join("."), CTX)).toThrow();
  });

  it("rechaza una clave que no es de 32 bytes", () => {
    expect(() => cifrar(randomBytes(16), "x", CTX)).toThrow();
  });
});
```

- [ ] **Step 2: Correr el test**

Run: `npx vitest run src/lib/cripto/credenciales.test.ts`
Expected: FAIL (`./credenciales` no existe).

- [ ] **Step 3: Implementar**

Crear `src/lib/cripto/credenciales.ts`:

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de las credenciales de los clientes (spec 4.3): AES-256-GCM con CREDENCIALES_KEY.
 * Formato "v1.<iv>.<tag>.<cifrado>" en base64url. El AAD lleva el tenant y la columna: un
 * valor cifrado no se puede copiar a otro tenant ni a otra columna (no se descifra).
 * Puro: la clave la recibe por parámetro (ver clave.ts).
 */
export const VERSION_CIFRADO = "v1";
const LARGO_CLAVE = 32;
const LARGO_IV = 12;
const LARGO_TAG = 16;

/** Columnas de tenant_credenciales que se guardan cifradas. */
export type ColumnaCifrada =
  | "mp_access_token"
  | "mp_refresh_token"
  | "mp_webhook_secret"
  | "smtp_password"
  | "google_refresh_token";

export type ContextoCifrado = { tenantId: string; columna: ColumnaCifrada };

/** CREDENCIALES_KEY: 32 bytes en base64url. Lanza si falta o no tiene ese largo. */
export function claveDesdeTexto(valor: string | undefined): Buffer {
  const texto = valor?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]+$/.test(texto)) {
    throw new Error("CREDENCIALES_KEY ausente o con caracteres que no son base64url");
  }
  const clave = Buffer.from(texto, "base64url");
  if (clave.length !== LARGO_CLAVE) throw new Error("CREDENCIALES_KEY tiene que tener 32 bytes en base64url");
  return clave;
}

function validarClave(clave: Buffer): void {
  if (clave.length !== LARGO_CLAVE) throw new Error("Clave de cifrado inválida");
}

function aad(contexto: ContextoCifrado): Buffer {
  return Buffer.from(`${VERSION_CIFRADO}|${contexto.tenantId}|${contexto.columna}`, "utf8");
}

export function cifrar(clave: Buffer, texto: string, contexto: ContextoCifrado): string {
  validarClave(clave);
  const iv = randomBytes(LARGO_IV);
  const cipher = createCipheriv("aes-256-gcm", clave, iv, { authTagLength: LARGO_TAG });
  cipher.setAAD(aad(contexto));
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION_CIFRADO, iv.toString("base64url"), tag.toString("base64url"), cifrado.toString("base64url")].join(".");
}

/** Lanza si el formato no es v1, la clave no es la correcta, o el valor se alteró o es de otro tenant o columna. */
export function descifrar(clave: Buffer, valor: string, contexto: ContextoCifrado): string {
  validarClave(clave);
  const partes = valor.split(".");
  if (partes.length !== 4 || partes[0] !== VERSION_CIFRADO) {
    throw new Error("Formato de credencial cifrada desconocido");
  }
  const iv = Buffer.from(partes[1], "base64url");
  const tag = Buffer.from(partes[2], "base64url");
  const cifrado = Buffer.from(partes[3], "base64url");
  if (iv.length !== LARGO_IV || tag.length !== LARGO_TAG) throw new Error("Credencial cifrada inválida");
  const decipher = createDecipheriv("aes-256-gcm", clave, iv, { authTagLength: LARGO_TAG });
  decipher.setAAD(aad(contexto));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString("utf8");
}
```

- [ ] **Step 4: Tests y tipos**

```bash
npx vitest run src/lib/cripto/credenciales.test.ts
npx tsc --noEmit
```

Expected: PASS y sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cripto/credenciales.ts src/lib/cripto/credenciales.test.ts
git commit -F - <<'EOF'
feat(cripto): cifrado AES-256-GCM de credenciales con AAD por tenant y columna

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Validación de imágenes del sitio

**Files:**
- Create: `src/lib/storage/imagenes.ts`, `src/lib/storage/imagenes.test.ts`

- [ ] **Step 1: Test que falla**

Crear `src/lib/storage/imagenes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  detectarFormato,
  esTipoImagen,
  MAX_BYTES_IMAGEN,
  pathDeUrlPublica,
  pathImagen,
  prefijoPublico,
  urlPublica,
  validarImagen,
  validarTamano,
} from "./imagenes";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
const GIF = Buffer.from("GIF89a");
const SUPABASE = "https://abc.supabase.co/";
const TENANT = "11111111-1111-1111-1111-111111111111";
const OTRO = "22222222-2222-2222-2222-222222222222";

describe("detectarFormato (bytes mágicos)", () => {
  it("reconoce PNG, JPG y WebP", () => {
    expect(detectarFormato(PNG)).toBe("png");
    expect(detectarFormato(JPG)).toBe("jpg");
    expect(detectarFormato(WEBP)).toBe("webp");
  });

  it("rechaza SVG, GIF, HTML, vacío y un RIFF que no es WebP", () => {
    expect(detectarFormato(SVG)).toBeNull();
    expect(detectarFormato(GIF)).toBeNull();
    expect(detectarFormato(Buffer.from("<html>"))).toBeNull();
    expect(detectarFormato(Buffer.alloc(0))).toBeNull();
    expect(detectarFormato(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE")]))).toBeNull();
  });
});

describe("validarTamano y validarImagen", () => {
  it("hasta 2 MB", () => {
    expect(MAX_BYTES_IMAGEN).toBe(2 * 1024 * 1024);
    expect(validarTamano(0)).toBe("imagen_vacia");
    expect(validarTamano(MAX_BYTES_IMAGEN)).toBeNull();
    expect(validarTamano(MAX_BYTES_IMAGEN + 1)).toBe("imagen_grande");
  });

  it("devuelve el formato real o el problema", () => {
    expect(validarImagen(PNG)).toEqual({ ok: true, formato: "png" });
    expect(validarImagen(SVG)).toEqual({ ok: false, error: "imagen_tipo" });
    expect(validarImagen(Buffer.concat([PNG, Buffer.alloc(MAX_BYTES_IMAGEN)]))).toEqual({ ok: false, error: "imagen_grande" });
  });
});

describe("tipos, paths y URLs", () => {
  it("solo los tres tipos de imagen de la marca", () => {
    expect(esTipoImagen("logo")).toBe(true);
    expect(esTipoImagen("logo_claro")).toBe(true);
    expect(esTipoImagen("foto_perfil")).toBe(true);
    expect(esTipoImagen("galeria")).toBe(false);
    expect(esTipoImagen("../logo")).toBe(false);
  });

  it("path {tenant}/{tipo}-{ms}.{ext} y su URL pública", () => {
    const path = pathImagen(TENANT, "logo_claro", "webp", new Date(1_700_000_000_000));
    expect(path).toBe(`${TENANT}/logo_claro-1700000000000.webp`);
    expect(prefijoPublico(SUPABASE)).toBe("https://abc.supabase.co/storage/v1/object/public/sitios/");
    expect(urlPublica(SUPABASE, path)).toBe(`https://abc.supabase.co/storage/v1/object/public/sitios/${path}`);
  });

  it("pathDeUrlPublica: solo imágenes propias del tenant en el bucket", () => {
    const propia = urlPublica(SUPABASE, `${TENANT}/logo-123.png`);
    expect(pathDeUrlPublica(propia, SUPABASE, TENANT)).toBe(`${TENANT}/logo-123.png`);
    expect(pathDeUrlPublica(propia, SUPABASE, OTRO)).toBeNull();
    expect(pathDeUrlPublica("/brand/horizontal-negro.png", SUPABASE, TENANT)).toBeNull();
    expect(pathDeUrlPublica(null, SUPABASE, TENANT)).toBeNull();
    expect(pathDeUrlPublica(`https://abc.supabase.co/storage/v1/object/public/cursos-archivos/${TENANT}/logo-1.png`, SUPABASE, TENANT)).toBeNull();
    expect(pathDeUrlPublica(urlPublica(SUPABASE, `${TENANT}/../${OTRO}/logo-1.png`), SUPABASE, TENANT)).toBeNull();
    expect(pathDeUrlPublica(urlPublica(SUPABASE, `${TENANT}/logo-1.svg`), SUPABASE, TENANT)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test**

Run: `npx vitest run src/lib/storage/imagenes.test.ts`
Expected: FAIL (`./imagenes` no existe).

- [ ] **Step 3: Implementar**

Crear `src/lib/storage/imagenes.ts`:

```ts
/**
 * Imágenes de la marca de cada cliente (logo, logo claro y foto de perfil) en el bucket
 * público "sitios". Puro: valida el contenido real (bytes mágicos), no la extensión ni el
 * MIME que manda el navegador. SVG nunca: puede llevar scripts.
 */
export const BUCKET_SITIOS = "sitios";
export const MAX_BYTES_IMAGEN = 2 * 1024 * 1024;

export const TIPOS_IMAGEN = ["logo", "logo_claro", "foto_perfil"] as const;
export type TipoImagen = (typeof TIPOS_IMAGEN)[number];
export type FormatoImagen = "png" | "jpg" | "webp";

export const MIME_FORMATO: Record<FormatoImagen, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** Columna de tenant_marca de cada imagen. */
export const COLUMNA_IMAGEN: Record<TipoImagen, "logo_url" | "logo_claro_url" | "foto_perfil_url"> = {
  logo: "logo_url",
  logo_claro: "logo_claro_url",
  foto_perfil: "foto_perfil_url",
};

/** Campo de Marca (tipos.ts) de cada imagen. */
export const CAMPO_MARCA_IMAGEN: Record<TipoImagen, "logoUrl" | "logoClaroUrl" | "fotoPerfilUrl"> = {
  logo: "logoUrl",
  logo_claro: "logoClaroUrl",
  foto_perfil: "fotoPerfilUrl",
};

export function esTipoImagen(valor: string): valor is TipoImagen {
  return (TIPOS_IMAGEN as readonly string[]).includes(valor);
}

/** Formato según los primeros bytes. Cualquier otra cosa (SVG, GIF, HTML…): null. */
export function detectarFormato(bytes: Uint8Array): FormatoImagen | null {
  const empieza = (firma: number[], desde = 0) => firma.every((b, i) => bytes[desde + i] === b);
  if (empieza([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (empieza([0xff, 0xd8, 0xff])) return "jpg";
  // "RIFF" + 4 bytes de largo + "WEBP"
  if (empieza([0x52, 0x49, 0x46, 0x46]) && empieza([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

export type ProblemaImagen = "imagen_vacia" | "imagen_grande" | "imagen_tipo";

/** Se puede usar con el size del archivo, antes de leerlo. */
export function validarTamano(bytes: number): ProblemaImagen | null {
  if (bytes <= 0) return "imagen_vacia";
  if (bytes > MAX_BYTES_IMAGEN) return "imagen_grande";
  return null;
}

export function validarImagen(
  bytes: Uint8Array,
): { ok: true; formato: FormatoImagen } | { ok: false; error: ProblemaImagen } {
  const problema = validarTamano(bytes.length);
  if (problema) return { ok: false, error: problema };
  const formato = detectarFormato(bytes);
  return formato ? { ok: true, formato } : { ok: false, error: "imagen_tipo" };
}

/** {tenant_id}/{tipo}-{timestamp}.{ext}: cada subida tiene una URL nueva (sin caché vieja). */
export function pathImagen(tenantId: string, tipo: TipoImagen, formato: FormatoImagen, ahora: Date): string {
  return `${tenantId}/${tipo}-${ahora.getTime()}.${formato}`;
}

/** <supabase>/storage/v1/object/public/sitios/ */
export function prefijoPublico(urlSupabase: string): string {
  return `${urlSupabase.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET_SITIOS}/`;
}

export function urlPublica(urlSupabase: string, path: string): string {
  return `${prefijoPublico(urlSupabase)}${path}`;
}

const ARCHIVO_PROPIO = /^(logo|logo_claro|foto_perfil)-\d+\.(png|jpg|webp)$/;

/**
 * Path del objeto de una URL guardada en tenant_marca, solo si es una imagen subida por el
 * panel a la carpeta de ese tenant. Las rutas del sitio ("/brand/…") o de otro tenant dan
 * null: nunca se borra algo ajeno.
 */
export function pathDeUrlPublica(url: string | null, urlSupabase: string, tenantId: string): string | null {
  if (!url) return null;
  const prefijo = prefijoPublico(urlSupabase);
  if (!url.startsWith(prefijo)) return null;
  const path = url.slice(prefijo.length);
  const carpeta = `${tenantId}/`;
  if (!path.startsWith(carpeta)) return null;
  return ARCHIVO_PROPIO.test(path.slice(carpeta.length)) ? path : null;
}
```

- [ ] **Step 4: Tests y tipos**

```bash
npx vitest run src/lib/storage/imagenes.test.ts
npx tsc --noEmit
```

Expected: PASS y sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/imagenes.ts src/lib/storage/imagenes.test.ts
git commit -F - <<'EOF'
feat(storage): validación de imágenes de la marca por bytes mágicos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Reglas del master: países, módulos, alertas y errores SMTP

**Files:**
- Create: `src/lib/master/pais.ts`, `src/lib/master/modulos.ts`, `src/lib/master/limites.ts`, `src/lib/master/alertas.ts`, `src/lib/master/smtp.ts`
- Create: `src/lib/master/pais.test.ts`, `src/lib/master/modulos.test.ts`, `src/lib/master/alertas.test.ts`, `src/lib/master/smtp.test.ts`

- [ ] **Step 1: Tests que fallan**

Crear `src/lib/master/pais.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { esIdioma, esMoneda, esPais, PAISES, VALORES_POR_PAIS, ZONAS_HORARIAS, zonaPermitida } from "./pais";

describe("países", () => {
  it("valores por defecto del spec", () => {
    expect(VALORES_POR_PAIS.AR).toEqual({ idioma: "es", zonaHoraria: "America/Argentina/Buenos_Aires", moneda: "ARS" });
    expect(VALORES_POR_PAIS.BR).toEqual({ idioma: "pt", zonaHoraria: "America/Sao_Paulo", moneda: "BRL" });
  });

  it("la zona por defecto es la primera de su país y está permitida", () => {
    for (const pais of PAISES) {
      expect(ZONAS_HORARIAS[pais][0]).toBe(VALORES_POR_PAIS[pais].zonaHoraria);
      expect(zonaPermitida(pais, VALORES_POR_PAIS[pais].zonaHoraria)).toBe(true);
    }
  });

  it("cada zona permitida existe en Intl", () => {
    for (const pais of PAISES) {
      for (const zona of ZONAS_HORARIAS[pais]) {
        expect(() => new Intl.DateTimeFormat("es-AR", { timeZone: zona }), zona).not.toThrow();
      }
    }
  });

  it("una zona de otro país no se permite", () => {
    expect(zonaPermitida("AR", "America/Sao_Paulo")).toBe(false);
    expect(zonaPermitida("BR", "America/Manaus")).toBe(true);
    expect(zonaPermitida("BR", "Europe/Madrid")).toBe(false);
  });

  it("guardas de tipo", () => {
    expect(esPais("AR")).toBe(true);
    expect(esPais("UY")).toBe(false);
    expect(esIdioma("pt")).toBe(true);
    expect(esIdioma("en")).toBe(false);
    expect(esMoneda("BRL")).toBe(true);
    expect(esMoneda("USD")).toBe(false);
  });
});
```

Crear `src/lib/master/modulos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { columnasModulos, MODULOS, modulosDeFila, parsearModulos } from "./modulos";

const TODOS_APAGADOS = { turnos: false, cursos: false, sobreMi: false, testimonios: false, galeria: false, faq: false, whatsapp: false };

describe("módulos", () => {
  it("los 7 módulos del spec, cada uno con su columna y su etiqueta", () => {
    expect(MODULOS.map((m) => m.columna)).toEqual([
      "modulo_turnos", "modulo_cursos", "modulo_sobre_mi", "modulo_testimonios",
      "modulo_galeria", "modulo_faq", "modulo_whatsapp",
    ]);
    for (const m of MODULOS) expect(m.etiqueta).toBeTruthy();
  });

  it("lee las casillas tildadas (las que no llegan quedan apagadas)", () => {
    const fd = new FormData();
    fd.append("modulo_turnos", "on");
    fd.append("modulo_whatsapp", "on");
    fd.append("modulo_cursos", "off");
    expect(parsearModulos(fd)).toEqual({ ...TODOS_APAGADOS, turnos: true, whatsapp: true });
  });

  it("columnas y fila: ida y vuelta", () => {
    const m = { ...TODOS_APAGADOS, sobreMi: true, faq: true };
    expect(columnasModulos(m)).toEqual({
      modulo_turnos: false, modulo_cursos: false, modulo_sobre_mi: true, modulo_testimonios: false,
      modulo_galeria: false, modulo_faq: true, modulo_whatsapp: false,
    });
    expect(modulosDeFila(columnasModulos(m))).toEqual(m);
  });
});
```

Crear `src/lib/master/alertas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { alertasDelCliente, TEXTO_ALERTA } from "./alertas";

const AHORA = new Date("2026-10-12T12:00:00Z");
const enDias = (d: number) => new Date(AHORA.getTime() + d * 86_400_000).toISOString();

describe("alertasDelCliente", () => {
  it("sin credenciales o todo en orden: ninguna", () => {
    expect(alertasDelCliente(null, AHORA)).toEqual([]);
    expect(alertasDelCliente({ smtpEstado: "ok", mpTokenVenceEn: null }, AHORA)).toEqual([]);
    expect(alertasDelCliente({ smtpEstado: "sin_configurar", mpTokenVenceEn: enDias(40) }, AHORA)).toEqual([]);
  });

  it("email con error", () => {
    expect(alertasDelCliente({ smtpEstado: "error", mpTokenVenceEn: null }, AHORA)).toEqual(["email_error"]);
  });

  it("Mercado Pago por vencer (menos de 30 días) o vencido", () => {
    expect(alertasDelCliente({ smtpEstado: "ok", mpTokenVenceEn: enDias(10) }, AHORA)).toEqual(["mp_por_vencer"]);
    expect(alertasDelCliente({ smtpEstado: "ok", mpTokenVenceEn: enDias(-1) }, AHORA)).toEqual(["mp_vencido"]);
    expect(alertasDelCliente({ smtpEstado: "error", mpTokenVenceEn: enDias(0) }, AHORA)).toEqual(["email_error", "mp_vencido"]);
  });

  it("cada alerta tiene su texto", () => {
    for (const a of ["email_error", "mp_vencido", "mp_por_vencer"] as const) expect(TEXTO_ALERTA[a]).toBeTruthy();
  });
});
```

Crear `src/lib/master/smtp.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { clasificarErrorSmtp, textoErrorSmtp } from "./smtp";

describe("clasificarErrorSmtp", () => {
  it("autenticación (EAUTH / 535)", () => {
    const e = Object.assign(new Error("Invalid login: 535 pepe@gmail.com abcdabcdabcdabcd"), { code: "EAUTH", responseCode: 535 });
    expect(clasificarErrorSmtp(e)).toEqual({ clave: "gmail_autenticacion", codigo: 535 });
  });

  it("conexión (timeout, red)", () => {
    expect(clasificarErrorSmtp({ code: "ETIMEDOUT" })).toEqual({ clave: "gmail_conexion", codigo: null });
    expect(clasificarErrorSmtp({ code: "ECONNECTION" })).toEqual({ clave: "gmail_conexion", codigo: null });
    expect(clasificarErrorSmtp({ code: "ESOCKET" }).clave).toBe("gmail_conexion");
  });

  it("cualquier otra cosa", () => {
    expect(clasificarErrorSmtp(new Error("raro"))).toEqual({ clave: "gmail_otro", codigo: null });
    expect(clasificarErrorSmtp("texto")).toEqual({ clave: "gmail_otro", codigo: null });
    expect(clasificarErrorSmtp(null)).toEqual({ clave: "gmail_otro", codigo: null });
    expect(clasificarErrorSmtp({ responseCode: "535" })).toEqual({ clave: "gmail_otro", codigo: null });
  });
});

describe("textoErrorSmtp", () => {
  it("vocabulario fijo más el código: nunca el mensaje original", () => {
    const e = Object.assign(new Error("Invalid login: pepe@gmail.com abcdabcdabcdabcd"), { code: "EAUTH", responseCode: 535 });
    const texto = textoErrorSmtp(clasificarErrorSmtp(e));
    expect(texto).toBe("Gmail rechazó el usuario o la contraseña de aplicación (código 535)");
    expect(texto).not.toContain("pepe");
    expect(texto).not.toContain("abcd");
    expect(textoErrorSmtp({ clave: "gmail_conexion", codigo: null })).toBe("No se pudo conectar con el servidor de Gmail");
  });
});
```

- [ ] **Step 2: Correr los tests**

Run: `npx vitest run src/lib/master`
Expected: FAIL (los módulos no existen).

- [ ] **Step 3: Implementar**

Crear `src/lib/master/pais.ts`:

```ts
import type { Idioma } from "@/lib/i18n/textos";
import type { Moneda, Pais } from "@/lib/tenant/tipos";

/** Países de la plataforma y sus valores por defecto (puro: lo usa también el formulario en el navegador). */
export const PAISES: readonly Pais[] = ["AR", "BR"];
export const IDIOMAS: readonly Idioma[] = ["es", "pt"];
export const MONEDAS: readonly Moneda[] = ["ARS", "BRL"];

export const NOMBRE_PAIS: Record<Pais, string> = { AR: "Argentina", BR: "Brasil" };
export const NOMBRE_IDIOMA: Record<Idioma, string> = { es: "Español", pt: "Portugués" };

/** Zonas IANA permitidas por país. La primera es la de por defecto. Brasil tiene varias. */
export const ZONAS_HORARIAS: Record<Pais, readonly string[]> = {
  AR: ["America/Argentina/Buenos_Aires"],
  BR: [
    "America/Sao_Paulo",
    "America/Bahia",
    "America/Fortaleza",
    "America/Recife",
    "America/Belem",
    "America/Manaus",
    "America/Cuiaba",
    "America/Campo_Grande",
    "America/Porto_Velho",
    "America/Boa_Vista",
    "America/Rio_Branco",
    "America/Noronha",
  ],
};

export type ValoresPais = { idioma: Idioma; zonaHoraria: string; moneda: Moneda };

export const VALORES_POR_PAIS: Record<Pais, ValoresPais> = {
  AR: { idioma: "es", zonaHoraria: "America/Argentina/Buenos_Aires", moneda: "ARS" },
  BR: { idioma: "pt", zonaHoraria: "America/Sao_Paulo", moneda: "BRL" },
};

export function esPais(valor: string): valor is Pais {
  return (PAISES as readonly string[]).includes(valor);
}

export function esIdioma(valor: string): valor is Idioma {
  return (IDIOMAS as readonly string[]).includes(valor);
}

export function esMoneda(valor: string): valor is Moneda {
  return (MONEDAS as readonly string[]).includes(valor);
}

export function zonaPermitida(pais: Pais, zona: string): boolean {
  return ZONAS_HORARIAS[pais].includes(zona);
}
```

Crear `src/lib/master/modulos.ts`:

```ts
import type { Modulos } from "@/lib/tenant/tipos";

/** Módulos de un cliente: clave de Modulos, columna de tenants y etiqueta del panel. */
export type ColumnaModulo =
  | "modulo_turnos"
  | "modulo_cursos"
  | "modulo_sobre_mi"
  | "modulo_testimonios"
  | "modulo_galeria"
  | "modulo_faq"
  | "modulo_whatsapp";

export const MODULOS: readonly { clave: keyof Modulos; columna: ColumnaModulo; etiqueta: string }[] = [
  { clave: "turnos", columna: "modulo_turnos", etiqueta: "Turnos" },
  { clave: "cursos", columna: "modulo_cursos", etiqueta: "Cursos" },
  { clave: "sobreMi", columna: "modulo_sobre_mi", etiqueta: "Sobre mí" },
  { clave: "testimonios", columna: "modulo_testimonios", etiqueta: "Testimonios" },
  { clave: "galeria", columna: "modulo_galeria", etiqueta: "Galería" },
  { clave: "faq", columna: "modulo_faq", etiqueta: "Preguntas frecuentes" },
  { clave: "whatsapp", columna: "modulo_whatsapp", etiqueta: "Botón de WhatsApp" },
];

/** Los mismos valores por defecto que la tabla tenants. */
export const MODULOS_POR_DEFECTO: Modulos = {
  turnos: true,
  cursos: false,
  sobreMi: true,
  testimonios: false,
  galeria: false,
  faq: false,
  whatsapp: false,
};

/** Casillas del formulario: name = columna, "on" si está tildada. */
export function parsearModulos(fd: FormData): Modulos {
  const tildado = (columna: ColumnaModulo) => fd.get(columna) === "on";
  return {
    turnos: tildado("modulo_turnos"),
    cursos: tildado("modulo_cursos"),
    sobreMi: tildado("modulo_sobre_mi"),
    testimonios: tildado("modulo_testimonios"),
    galeria: tildado("modulo_galeria"),
    faq: tildado("modulo_faq"),
    whatsapp: tildado("modulo_whatsapp"),
  };
}

export function columnasModulos(m: Modulos): Record<ColumnaModulo, boolean> {
  return {
    modulo_turnos: m.turnos,
    modulo_cursos: m.cursos,
    modulo_sobre_mi: m.sobreMi,
    modulo_testimonios: m.testimonios,
    modulo_galeria: m.galeria,
    modulo_faq: m.faq,
    modulo_whatsapp: m.whatsapp,
  };
}

export function modulosDeFila(fila: Record<ColumnaModulo, boolean>): Modulos {
  return {
    turnos: fila.modulo_turnos,
    cursos: fila.modulo_cursos,
    sobreMi: fila.modulo_sobre_mi,
    testimonios: fila.modulo_testimonios,
    galeria: fila.modulo_galeria,
    faq: fila.modulo_faq,
    whatsapp: fila.modulo_whatsapp,
  };
}
```

Crear `src/lib/master/limites.ts`:

```ts
/** Largos máximos de lo que carga el master (formularios, mensajes y atributos maxLength). */
export const LIMITES = {
  nombre: 80,
  rubro: 60,
  tagline: 140,
  titulo: 80,
  texto: 2000,
  nota: 500,
  direccion: 200,
  remitente: 80,
} as const;
```

Crear `src/lib/master/alertas.ts`:

```ts
/** Alertas de la lista de clientes (spec 7): email con error y Mercado Pago por vencer. */
export type Alerta = "email_error" | "mp_vencido" | "mp_por_vencer";

export const DIAS_AVISO_MP = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

export const TEXTO_ALERTA: Record<Alerta, string> = {
  email_error: "Email con error",
  mp_vencido: "Mercado Pago vencido",
  mp_por_vencer: "Mercado Pago por vencer",
};

export type CredencialesParaAlertas = { smtpEstado: string; mpTokenVenceEn: string | null };

export function alertasDelCliente(c: CredencialesParaAlertas | null, ahora: Date): Alerta[] {
  if (!c) return [];
  const alertas: Alerta[] = [];
  if (c.smtpEstado === "error") alertas.push("email_error");
  if (c.mpTokenVenceEn) {
    const restante = new Date(c.mpTokenVenceEn).getTime() - ahora.getTime();
    if (restante <= 0) alertas.push("mp_vencido");
    else if (restante < DIAS_AVISO_MP * DIA_MS) alertas.push("mp_por_vencer");
  }
  return alertas;
}
```

Crear `src/lib/master/smtp.ts`:

```ts
/**
 * Errores de la prueba de conexión con Gmail. El mensaje de nodemailer puede traer el
 * usuario o partes de la respuesta del servidor: no se guarda ni se muestra. Solo una
 * categoría y el código SMTP numérico.
 */
export type FalloSmtp = "gmail_autenticacion" | "gmail_conexion" | "gmail_otro";
export type FalloClasificado = { clave: FalloSmtp; codigo: number | null };

const CODIGOS_CONEXION = [
  "ETIMEDOUT", "ECONNECTION", "ESOCKET", "EDNS", "ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETLS",
];

export function clasificarErrorSmtp(error: unknown): FalloClasificado {
  const e = (typeof error === "object" && error !== null ? error : {}) as { code?: unknown; responseCode?: unknown };
  const codigo = typeof e.responseCode === "number" && Number.isInteger(e.responseCode) ? e.responseCode : null;
  if (e.code === "EAUTH" || codigo === 534 || codigo === 535) return { clave: "gmail_autenticacion", codigo };
  if (typeof e.code === "string" && CODIGOS_CONEXION.includes(e.code)) return { clave: "gmail_conexion", codigo };
  return { clave: "gmail_otro", codigo };
}

const DESCRIPCION: Record<FalloSmtp, string> = {
  gmail_autenticacion: "Gmail rechazó el usuario o la contraseña de aplicación",
  gmail_conexion: "No se pudo conectar con el servidor de Gmail",
  gmail_otro: "Falló la prueba de conexión con Gmail",
};

/** Texto para smtp_ultimo_error. */
export function textoErrorSmtp(fallo: FalloClasificado): string {
  return `${DESCRIPCION[fallo.clave]}${fallo.codigo !== null ? ` (código ${fallo.codigo})` : ""}`;
}
```

- [ ] **Step 4: Tests y tipos**

```bash
npx vitest run src/lib/master
npx tsc --noEmit
```

Expected: PASS y sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/master/pais.ts src/lib/master/pais.test.ts src/lib/master/modulos.ts src/lib/master/modulos.test.ts src/lib/master/limites.ts src/lib/master/alertas.ts src/lib/master/alertas.test.ts src/lib/master/smtp.ts src/lib/master/smtp.test.ts
git commit -F - <<'EOF'
feat(master): países, módulos, alertas y errores SMTP saneados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Mensajes y validación de los formularios del master

**Files:**
- Create: `src/lib/master/mensajes.ts`, `src/lib/master/mensajes.test.ts`
- Create: `src/lib/master/formularios.ts`, `src/lib/master/formularios.test.ts`

`mensajes.ts` no importa nada pesado (lo usan componentes de cliente). `formularios.ts` sí (libphonenumber, `node:crypto` por `normalizarEmail`): solo lo importa el servidor.

- [ ] **Step 1: Tests que fallan**

Crear `src/lib/master/mensajes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mensajeAviso, mensajeError, mensajeInfo, type ClaveError, type ClaveInfo } from "./mensajes";

describe("mensajes del panel master", () => {
  it("cada clave tiene su texto", () => {
    const errores: ClaveError[] = [
      "cliente", "error", "nombre", "slug_invalido", "slug_en_uso", "pais", "idioma", "zona", "moneda",
      "color_invalido", "contraste_texto", "contraste_boton", "imagen_destino", "imagen_vacia", "imagen_grande",
      "imagen_tipo", "inicio_titulo", "texto_largo", "whatsapp", "instagram", "email_contacto", "email",
      "ya_es_usuario", "limite_usuarios", "usuario_de_otro", "usuario_master", "usuario_sin_cliente",
      "usuario_no_encontrado", "usuario_sin_email", "envio_fallo", "envio_emails_no_configurado",
      "cliente_suspendido", "clave_credenciales", "gmail_usuario", "gmail_contrasena", "gmail_sin_contrasena",
      "gmail_remitente", "gmail_autenticacion", "gmail_conexion", "gmail_otro", "mp_access_token",
      "mp_public_key", "mp_webhook_secret", "mp_sin_access_token",
    ];
    for (const c of errores) expect(mensajeError(c), c).toBeTruthy();
    const infos: ClaveInfo[] = [
      "creado", "guardado", "imagen_guardada", "usuario_creado", "link_reenviado", "dispositivos_revocados",
      "suspendido", "reactivado", "gmail_ok", "mp_guardado",
    ];
    for (const c of infos) expect(mensajeInfo(c), c).toBeTruthy();
    expect(mensajeAviso("contraste_secundario")).toBeTruthy();
  });

  it("no muestra textos arbitrarios de la URL", () => {
    expect(mensajeError(undefined)).toBeNull();
    expect(mensajeError("<script>alert(1)</script>")).toBeNull();
    expect(mensajeError("toString")).toBeNull();
    expect(mensajeInfo("constructor")).toBeNull();
    expect(mensajeAviso("__proto__")).toBeNull();
  });
});
```

Crear `src/lib/master/formularios.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  normalizarInstagram,
  parsearAlta,
  parsearColores,
  parsearDatos,
  parsearGmail,
  parsearMp,
  parsearTextos,
} from "./formularios";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

const DATOS_AR = {
  nombre: "Estética Ana",
  pais: "AR",
  idioma: "es",
  zona_horaria: "America/Argentina/Buenos_Aires",
  moneda: "ARS",
};

describe("parsearAlta y parsearDatos", () => {
  it("alta válida: subdominio normalizado y módulos tildados", () => {
    expect(parsearAlta(fd({ ...DATOS_AR, slug: "  Ana-Spa ", modulo_turnos: "on", modulo_galeria: "on" }))).toEqual({
      ok: true,
      valor: {
        nombre: "Estética Ana",
        slug: "ana-spa",
        pais: "AR",
        idioma: "es",
        zonaHoraria: "America/Argentina/Buenos_Aires",
        moneda: "ARS",
        modulos: { turnos: true, cursos: false, sobreMi: false, testimonios: false, galeria: true, faq: false, whatsapp: false },
      },
    });
  });

  it("subdominio inválido o reservado", () => {
    for (const slug of ["admin", "app", "ab", "-ana", "ana_spa", "ana.spa", ""]) {
      expect(parsearAlta(fd({ ...DATOS_AR, slug })), slug).toEqual({ ok: false, error: "slug_invalido" });
    }
  });

  it("idioma y moneda son editables (un cliente de Brasil en español)", () => {
    const r = parsearDatos(fd({ ...DATOS_AR, pais: "BR", idioma: "es", zona_horaria: "America/Manaus", moneda: "ARS" }));
    expect(r).toEqual({
      ok: true,
      valor: { nombre: "Estética Ana", pais: "BR", idioma: "es", zonaHoraria: "America/Manaus", moneda: "ARS" },
    });
  });

  it("cada campo inválido tiene su error", () => {
    expect(parsearDatos(fd({ ...DATOS_AR, nombre: "A" }))).toEqual({ ok: false, error: "nombre" });
    expect(parsearDatos(fd({ ...DATOS_AR, nombre: "x".repeat(81) }))).toEqual({ ok: false, error: "nombre" });
    expect(parsearDatos(fd({ ...DATOS_AR, pais: "UY" }))).toEqual({ ok: false, error: "pais" });
    expect(parsearDatos(fd({ ...DATOS_AR, idioma: "en" }))).toEqual({ ok: false, error: "idioma" });
    expect(parsearDatos(fd({ ...DATOS_AR, zona_horaria: "America/Sao_Paulo" }))).toEqual({ ok: false, error: "zona" });
    expect(parsearDatos(fd({ ...DATOS_AR, moneda: "USD" }))).toEqual({ ok: false, error: "moneda" });
  });
});

describe("parsearColores", () => {
  const PALETA = { color_primario: "#1F6F8B", color_secundario: "#2d4a53", color_fondo: "#f2f7f9", color_texto: "#102" };

  it("paleta válida, normalizada", () => {
    expect(parsearColores(fd(PALETA))).toEqual({
      ok: true,
      valor: {
        colores: { colorPrimario: "#1f6f8b", colorSecundario: "#2d4a53", colorFondo: "#f2f7f9", colorTexto: "#110022" },
        avisos: [],
      },
    });
  });

  it("transparencia o formato inválido", () => {
    expect(parsearColores(fd({ ...PALETA, color_primario: "#1f6f8b80" }))).toEqual({ ok: false, error: "color_invalido" });
    expect(parsearColores(fd({ ...PALETA, color_fondo: "white" }))).toEqual({ ok: false, error: "color_invalido" });
    expect(parsearColores(fd({ color_primario: "#1f6f8b" }))).toEqual({ ok: false, error: "color_invalido" });
  });

  it("contraste que bloquea", () => {
    expect(parsearColores(fd({ ...PALETA, color_texto: "#f2f7f9" }))).toEqual({ ok: false, error: "contraste_texto" });
    const gisel = { color_primario: "#c0899a", color_secundario: "#4e5340", color_fondo: "#f6f1ea", color_texto: "#1a1a1a" };
    expect(parsearColores(fd(gisel))).toEqual({ ok: false, error: "contraste_boton" });
  });

  it("secundario con poco contraste: se acepta con aviso", () => {
    const r = parsearColores(fd({ ...PALETA, color_secundario: "#e6eef1" }));
    expect(r.ok && r.valor.avisos).toEqual(["contraste_secundario"]);
  });
});

describe("normalizarInstagram", () => {
  it("usuario con o sin @, o URL del perfil", () => {
    expect(normalizarInstagram("@ana.spa")).toBe("ana.spa");
    expect(normalizarInstagram("ana_spa")).toBe("ana_spa");
    expect(normalizarInstagram("https://www.instagram.com/ana.spa/?igsh=abc")).toBe("ana.spa");
    expect(normalizarInstagram("instagram.com/ana.spa")).toBe("ana.spa");
  });

  it("rechaza lo que no es un usuario", () => {
    for (const v of ["ana spa", "<b>", "a".repeat(31), "https://example.com/ana", ""]) expect(normalizarInstagram(v), v).toBeNull();
  });
});

describe("parsearTextos", () => {
  const TEXTOS = {
    rubro: "Estética",
    tagline: "",
    inicio_titulo: "Tu momento de",
    inicio_destacado: "bienestar",
    inicio_texto: "",
    sobre_mi_titulo: "",
    sobre_mi_texto: "",
    nota_reservas: "",
    whatsapp: "11 2345 6789",
    instagram: "@ana.spa",
    email_contacto: " Hola@Ana.com ",
    direccion: "",
  };

  it("válidos: vacíos a null, WhatsApp en E.164 según el país, email en minúsculas", () => {
    expect(parsearTextos(fd(TEXTOS), "AR")).toEqual({
      ok: true,
      valor: {
        rubro: "Estética",
        tagline: null,
        inicioTitulo: "Tu momento de",
        inicioDestacado: "bienestar",
        inicioTexto: null,
        sobreMiTitulo: null,
        sobreMiTexto: null,
        notaReservas: null,
        whatsapp: "+5491123456789",
        instagram: "ana.spa",
        emailContacto: "hola@ana.com",
        direccion: null,
      },
    });
    const br = parsearTextos(fd({ ...TEXTOS, whatsapp: "(11) 91234-5678" }), "BR");
    expect(br.ok && br.valor.whatsapp).toBe("+5511912345678");
  });

  it("campos vacíos opcionales: WhatsApp, Instagram y email en null", () => {
    const r = parsearTextos(fd({ inicio_titulo: "Hola" }), "AR");
    expect(r.ok && [r.valor.whatsapp, r.valor.instagram, r.valor.emailContacto]).toEqual([null, null, null]);
  });

  it("cada error", () => {
    expect(parsearTextos(fd({ ...TEXTOS, inicio_titulo: " " }), "AR")).toEqual({ ok: false, error: "inicio_titulo" });
    expect(parsearTextos(fd({ ...TEXTOS, inicio_texto: "x".repeat(2001) }), "AR")).toEqual({ ok: false, error: "texto_largo" });
    expect(parsearTextos(fd({ ...TEXTOS, whatsapp: "123" }), "AR")).toEqual({ ok: false, error: "whatsapp" });
    expect(parsearTextos(fd({ ...TEXTOS, instagram: "ana spa" }), "AR")).toEqual({ ok: false, error: "instagram" });
    expect(parsearTextos(fd({ ...TEXTOS, email_contacto: "hola" }), "AR")).toEqual({ ok: false, error: "email_contacto" });
  });
});

describe("parsearGmail", () => {
  it("contraseña de aplicación con o sin espacios; vacía = mantener", () => {
    expect(
      parsearGmail(fd({ smtp_usuario: "Turnos@Gmail.com", smtp_password: "abcd efgh ijkl mnop", smtp_nombre_remitente: "Estética Ana" })),
    ).toEqual({ ok: true, valor: { usuario: "turnos@gmail.com", contrasena: "abcdefghijklmnop", remitente: "Estética Ana" } });
    expect(parsearGmail(fd({ smtp_usuario: "turnos@gmail.com", smtp_password: "", smtp_nombre_remitente: "" }))).toEqual({
      ok: true,
      valor: { usuario: "turnos@gmail.com", contrasena: null, remitente: null },
    });
  });

  it("cada error", () => {
    expect(parsearGmail(fd({ smtp_usuario: "turnos" }))).toEqual({ ok: false, error: "gmail_usuario" });
    expect(parsearGmail(fd({ smtp_usuario: "t@gmail.com", smtp_password: "corta" }))).toEqual({ ok: false, error: "gmail_contrasena" });
    expect(parsearGmail(fd({ smtp_usuario: "t@gmail.com", smtp_nombre_remitente: "Ana\nBcc: x@y.com" }))).toEqual({
      ok: false,
      error: "gmail_remitente",
    });
  });
});

describe("parsearMp", () => {
  const MP = {
    mp_access_token: "APP_USR-1234567890123456-101112-abcdef0123456789abcdef0123456789-123456789",
    mp_public_key: "APP_USR-12345678-1234-1234-1234-123456789012",
    mp_webhook_secret: "a1".repeat(32),
  };

  it("valores válidos; vacíos = mantener", () => {
    expect(parsearMp(fd(MP))).toEqual({
      ok: true,
      valor: { accessToken: MP.mp_access_token, publicKey: MP.mp_public_key, webhookSecret: MP.mp_webhook_secret },
    });
    expect(parsearMp(fd({ mp_access_token: "TEST-abcdef123456" }))).toEqual({
      ok: true,
      valor: { accessToken: "TEST-abcdef123456", publicKey: null, webhookSecret: null },
    });
  });

  it("cada error", () => {
    expect(parsearMp(fd({ ...MP, mp_access_token: "hola" }))).toEqual({ ok: false, error: "mp_access_token" });
    expect(parsearMp(fd({ ...MP, mp_access_token: `Bearer ${MP.mp_access_token}` }))).toEqual({ ok: false, error: "mp_access_token" });
    expect(parsearMp(fd({ ...MP, mp_public_key: "xx" }))).toEqual({ ok: false, error: "mp_public_key" });
    expect(parsearMp(fd({ ...MP, mp_webhook_secret: "corto" }))).toEqual({ ok: false, error: "mp_webhook_secret" });
  });
});
```

- [ ] **Step 2: Correr los tests**

Run: `npx vitest run src/lib/master/mensajes.test.ts src/lib/master/formularios.test.ts`
Expected: FAIL (los módulos no existen).

- [ ] **Step 3: Implementar**

Crear `src/lib/master/mensajes.ts`:

```ts
import { LIMITES } from "./limites";

/**
 * Textos del panel master por clave. Las actions redirigen con ?error=, ?ok= o ?aviso= y
 * la clave, nunca con un texto: lo que no está acá no se muestra. Los tipos salen de las
 * tablas, así que una action no puede usar una clave sin texto (no compila).
 * Puro y liviano: lo usan componentes de cliente.
 */
const ERRORES = {
  cliente: "No encontramos ese cliente.",
  error: "No se pudo completar la acción.",
  nombre: `El nombre tiene que tener entre 2 y ${LIMITES.nombre} caracteres.`,
  slug_invalido:
    "El subdominio tiene que tener de 3 a 40 caracteres: minúsculas, números y guiones (sin guiones en los bordes). No puede ser www, app, admin, master ni api.",
  slug_en_uso: "Ya hay un cliente con ese subdominio.",
  pais: "Elegí Argentina o Brasil.",
  idioma: "Elegí español o portugués.",
  zona: "Elegí una zona horaria del país del cliente.",
  moneda: "Elegí ARS o BRL.",
  color_invalido: "Cada color tiene que ser un hex #rgb o #rrggbb (sin transparencia).",
  contraste_texto: "El texto no se lee bien sobre el fondo: hace falta un contraste de al menos 4,5:1.",
  contraste_boton:
    "El texto de los botones (color de fondo sobre el primario) no se lee bien: hace falta un contraste de al menos 4,5:1.",
  imagen_destino: "No sabemos qué imagen querés cambiar.",
  imagen_vacia: "Elegí un archivo.",
  imagen_grande: "La imagen pesa más de 2 MB.",
  imagen_tipo: "La imagen tiene que ser PNG, JPG o WebP.",
  inicio_titulo: `El título de inicio es obligatorio (hasta ${LIMITES.titulo} caracteres).`,
  texto_largo: "Algún texto supera el largo permitido.",
  whatsapp: "El WhatsApp no es un celular válido del país del cliente.",
  instagram: "El Instagram tiene que ser un usuario (letras, números, puntos y guiones bajos).",
  email_contacto: "El email de contacto no es válido.",
  email: "Ingresá un email válido.",
  ya_es_usuario: "Ese email ya es usuario de este cliente. Usá Reenviar link.",
  limite_usuarios: "Este cliente ya tiene usuario.",
  usuario_de_otro: "Ese email ya es usuario de otro cliente.",
  usuario_master: "Ese email es del usuario master.",
  usuario_sin_cliente:
    "Ese email ya tiene una cuenta que no pertenece a ningún cliente. Borrala en Supabase (Authentication → Users) o usá otro email.",
  usuario_no_encontrado: "Ese usuario no pertenece a este cliente.",
  usuario_sin_email: "Se creó el usuario, pero no pudimos enviar el email. Probá con Reenviar link.",
  envio_fallo: "No pudimos enviar el email. Probá de nuevo en unos minutos.",
  envio_emails_no_configurado: "El envío de emails de la plataforma no está configurado.",
  cliente_suspendido: "El cliente está suspendido: reactivalo para enviar el link (lleva a su panel).",
  clave_credenciales: "Falta CREDENCIALES_KEY en el servidor: no se pueden guardar credenciales.",
  gmail_usuario: "El usuario de Gmail tiene que ser un email.",
  gmail_contrasena: "La contraseña de aplicación son 16 letras (Google la muestra en grupos de 4).",
  gmail_sin_contrasena: "Falta la contraseña de aplicación.",
  gmail_remitente: `El nombre del remitente tiene hasta ${LIMITES.remitente} caracteres, en una sola línea.`,
  gmail_autenticacion: "Gmail rechazó el usuario o la contraseña de aplicación. No se guardó nada nuevo.",
  gmail_conexion: "No pudimos conectar con Gmail. No se guardó nada nuevo.",
  gmail_otro: "La prueba de conexión con Gmail falló. No se guardó nada nuevo.",
  mp_access_token: "El access token no tiene el formato de Mercado Pago (APP_USR-… o TEST-…).",
  mp_public_key: "La public key no tiene el formato de Mercado Pago (APP_USR-… o TEST-…).",
  mp_webhook_secret: "El secreto del webhook tiene de 16 a 128 letras y números.",
  mp_sin_access_token: "Falta el access token.",
};

const INFOS = {
  creado: "Cliente creado. Completá la marca, los textos y el usuario.",
  guardado: "Cambios guardados.",
  imagen_guardada: "Imagen actualizada.",
  usuario_creado: "Usuario creado. Le enviamos el link para definir su contraseña.",
  link_reenviado: "Le enviamos un link nuevo para definir su contraseña.",
  dispositivos_revocados: "Listo: sus dispositivos recordados van a pedir el código otra vez.",
  suspendido: "Cliente suspendido: su sitio y su panel quedaron bloqueados.",
  reactivado: "Cliente reactivado.",
  gmail_ok: "Conexión con Gmail verificada y guardada.",
  mp_guardado: "Credenciales de Mercado Pago guardadas.",
};

const AVISOS = {
  contraste_secundario:
    "Se guardó, pero el color secundario tiene poco contraste con el fondo (menos de 3:1): los detalles en ese color pueden costar leerse.",
};

export type ClaveError = keyof typeof ERRORES;
export type ClaveInfo = keyof typeof INFOS;
export type ClaveAviso = keyof typeof AVISOS;

function buscar(tabla: Record<string, string>, clave: string | undefined): string | null {
  return clave !== undefined && Object.prototype.hasOwnProperty.call(tabla, clave) ? tabla[clave] : null;
}

export function mensajeError(clave: string | undefined): string | null {
  return buscar(ERRORES, clave);
}

export function mensajeInfo(clave: string | undefined): string | null {
  return buscar(INFOS, clave);
}

export function mensajeAviso(clave: string | undefined): string | null {
  return buscar(AVISOS, clave);
}
```

Crear `src/lib/master/formularios.ts`:

```ts
import { normalizarEmail } from "@/lib/auth/recuperacion";
import type { Idioma } from "@/lib/i18n/textos";
import { evaluarPaleta, normalizarHex } from "@/lib/tenant/contraste";
import type { ColoresMarca } from "@/lib/tenant/estilo";
import { esSlugValido } from "@/lib/tenant/host";
import type { Moneda, Modulos, Pais } from "@/lib/tenant/tipos";
import { normalizarWhatsApp } from "@/lib/turnos/whatsapp";
import { LIMITES } from "./limites";
import type { ClaveAviso, ClaveError } from "./mensajes";
import { parsearModulos } from "./modulos";
import { esIdioma, esMoneda, esPais, zonaPermitida } from "./pais";

/**
 * Validación de los formularios del panel master. Corre en el servidor: lo que llega en
 * un FormData es texto no confiable (la vista previa del navegador es solo una ayuda).
 */
export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: ClaveError };

function texto(fd: FormData, nombre: string): string {
  const v = fd.get(nombre);
  return typeof v === "string" ? v.trim() : "";
}

// ---------- Datos del cliente y alta ----------

export type DatosCliente = { nombre: string; pais: Pais; idioma: Idioma; zonaHoraria: string; moneda: Moneda };
export type AltaCliente = DatosCliente & { slug: string; modulos: Modulos };

export function parsearDatos(fd: FormData): Resultado<DatosCliente> {
  const nombre = texto(fd, "nombre");
  if (nombre.length < 2 || nombre.length > LIMITES.nombre) return { ok: false, error: "nombre" };
  const pais = texto(fd, "pais");
  if (!esPais(pais)) return { ok: false, error: "pais" };
  const idioma = texto(fd, "idioma");
  if (!esIdioma(idioma)) return { ok: false, error: "idioma" };
  const zonaHoraria = texto(fd, "zona_horaria");
  if (!zonaPermitida(pais, zonaHoraria)) return { ok: false, error: "zona" };
  const moneda = texto(fd, "moneda");
  if (!esMoneda(moneda)) return { ok: false, error: "moneda" };
  return { ok: true, valor: { nombre, pais, idioma, zonaHoraria, moneda } };
}

export function parsearAlta(fd: FormData): Resultado<AltaCliente> {
  const slug = texto(fd, "slug").toLowerCase();
  if (!esSlugValido(slug)) return { ok: false, error: "slug_invalido" };
  const datos = parsearDatos(fd);
  if (!datos.ok) return datos;
  return { ok: true, valor: { ...datos.valor, slug, modulos: parsearModulos(fd) } };
}

export function columnasDatos(d: DatosCliente) {
  return { nombre: d.nombre, pais: d.pais, idioma: d.idioma, zona_horaria: d.zonaHoraria, moneda: d.moneda };
}

// ---------- Colores ----------

export type ColoresValidados = { colores: ColoresMarca; avisos: ClaveAviso[] };

export function parsearColores(fd: FormData): Resultado<ColoresValidados> {
  const leer = (campo: string) => normalizarHex(texto(fd, campo));
  const primario = leer("color_primario");
  const secundario = leer("color_secundario");
  const fondo = leer("color_fondo");
  const textoColor = leer("color_texto");
  if (!primario || !secundario || !fondo || !textoColor) return { ok: false, error: "color_invalido" };
  const colores: ColoresMarca = {
    colorPrimario: primario,
    colorSecundario: secundario,
    colorFondo: fondo,
    colorTexto: textoColor,
  };
  const problemas = evaluarPaleta(colores);
  const bloqueo = problemas.find((p) => p.bloquea);
  if (bloqueo) return { ok: false, error: bloqueo.clave === "contraste_texto" ? "contraste_texto" : "contraste_boton" };
  const avisos: ClaveAviso[] = problemas.some((p) => p.clave === "contraste_secundario") ? ["contraste_secundario"] : [];
  return { ok: true, valor: { colores, avisos } };
}

export function columnasColores(c: ColoresMarca) {
  return {
    color_primario: c.colorPrimario,
    color_secundario: c.colorSecundario,
    color_fondo: c.colorFondo,
    color_texto: c.colorTexto,
  };
}

// ---------- Textos y contacto ----------

export type TextosMarca = {
  rubro: string | null;
  tagline: string | null;
  inicioTitulo: string;
  inicioDestacado: string | null;
  inicioTexto: string | null;
  sobreMiTitulo: string | null;
  sobreMiTexto: string | null;
  notaReservas: string | null;
  /** E.164 */
  whatsapp: string | null;
  /** Usuario sin "@" */
  instagram: string | null;
  emailContacto: string | null;
  direccion: string | null;
};

/** "@ana.spa" o "https://instagram.com/ana.spa/" → "ana.spa". null si no es un usuario válido. */
export function normalizarInstagram(entrada: string): string | null {
  const usuario = entrada
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(usuario) ? usuario : null;
}

export function parsearTextos(fd: FormData, pais: Pais): Resultado<TextosMarca> {
  const inicioTitulo = texto(fd, "inicio_titulo");
  if (!inicioTitulo || inicioTitulo.length > LIMITES.titulo) return { ok: false, error: "inicio_titulo" };

  let largo = false;
  const opcional = (nombre: string, maximo: number): string | null => {
    const v = texto(fd, nombre);
    if (v.length > maximo) largo = true;
    return v || null;
  };
  const rubro = opcional("rubro", LIMITES.rubro);
  const tagline = opcional("tagline", LIMITES.tagline);
  const inicioDestacado = opcional("inicio_destacado", LIMITES.titulo);
  const inicioTexto = opcional("inicio_texto", LIMITES.texto);
  const sobreMiTitulo = opcional("sobre_mi_titulo", LIMITES.titulo);
  const sobreMiTexto = opcional("sobre_mi_texto", LIMITES.texto);
  const notaReservas = opcional("nota_reservas", LIMITES.nota);
  const direccion = opcional("direccion", LIMITES.direccion);
  if (largo) return { ok: false, error: "texto_largo" };

  const whatsappCrudo = texto(fd, "whatsapp");
  const whatsapp = whatsappCrudo ? normalizarWhatsApp(whatsappCrudo, pais) : null;
  if (whatsappCrudo && !whatsapp) return { ok: false, error: "whatsapp" };

  const instagramCrudo = texto(fd, "instagram");
  const instagram = instagramCrudo ? normalizarInstagram(instagramCrudo) : null;
  if (instagramCrudo && !instagram) return { ok: false, error: "instagram" };

  const emailCrudo = texto(fd, "email_contacto");
  const emailContacto = emailCrudo ? normalizarEmail(emailCrudo) : null;
  if (emailCrudo && !emailContacto) return { ok: false, error: "email_contacto" };

  return {
    ok: true,
    valor: {
      rubro,
      tagline,
      inicioTitulo,
      inicioDestacado,
      inicioTexto,
      sobreMiTitulo,
      sobreMiTexto,
      notaReservas,
      whatsapp,
      instagram,
      emailContacto,
      direccion,
    },
  };
}

export function columnasTextos(t: TextosMarca) {
  return {
    rubro: t.rubro,
    tagline: t.tagline,
    inicio_titulo: t.inicioTitulo,
    inicio_destacado: t.inicioDestacado,
    inicio_texto: t.inicioTexto,
    sobre_mi_titulo: t.sobreMiTitulo,
    sobre_mi_texto: t.sobreMiTexto,
    nota_reservas: t.notaReservas,
    whatsapp: t.whatsapp,
    instagram: t.instagram,
    email_contacto: t.emailContacto,
    direccion: t.direccion,
  };
}

// ---------- Credenciales ----------

/** contrasena null = mantener la guardada. */
export type FormGmail = { usuario: string; contrasena: string | null; remitente: string | null };

export function parsearGmail(fd: FormData): Resultado<FormGmail> {
  const usuario = normalizarEmail(texto(fd, "smtp_usuario"));
  if (!usuario) return { ok: false, error: "gmail_usuario" };
  // Google muestra la contraseña de aplicación en 4 grupos de 4 letras.
  const contrasena = texto(fd, "smtp_password").replace(/\s+/g, "");
  if (contrasena && !/^[a-z]{16}$/i.test(contrasena)) return { ok: false, error: "gmail_contrasena" };
  const remitente = texto(fd, "smtp_nombre_remitente");
  if (remitente.length > LIMITES.remitente || /[\r\n]/.test(remitente)) return { ok: false, error: "gmail_remitente" };
  return { ok: true, valor: { usuario, contrasena: contrasena || null, remitente: remitente || null } };
}

const CLAVE_MP = /^(APP_USR|TEST)-[A-Za-z0-9_-]{8,300}$/;
const SECRETO_WEBHOOK = /^[A-Za-z0-9]{16,128}$/;

/** null = mantener lo guardado. */
export type FormMp = { accessToken: string | null; publicKey: string | null; webhookSecret: string | null };

export function parsearMp(fd: FormData): Resultado<FormMp> {
  const accessToken = texto(fd, "mp_access_token");
  if (accessToken && !CLAVE_MP.test(accessToken)) return { ok: false, error: "mp_access_token" };
  const publicKey = texto(fd, "mp_public_key");
  if (publicKey && !CLAVE_MP.test(publicKey)) return { ok: false, error: "mp_public_key" };
  const webhookSecret = texto(fd, "mp_webhook_secret");
  if (webhookSecret && !SECRETO_WEBHOOK.test(webhookSecret)) return { ok: false, error: "mp_webhook_secret" };
  return {
    ok: true,
    valor: { accessToken: accessToken || null, publicKey: publicKey || null, webhookSecret: webhookSecret || null },
  };
}
```

- [ ] **Step 4: Tests, tipos y lint**

```bash
npx vitest run src/lib/master
npx tsc --noEmit
npx eslint src/lib/master
```

Expected: PASS y sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/master/mensajes.ts src/lib/master/mensajes.test.ts src/lib/master/formularios.ts src/lib/master/formularios.test.ts
git commit -F - <<'EOF'
feat(master): mensajes por clave y validación de los formularios

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Email de invitación del usuario del cliente

**Files:**
- Modify: `src/lib/email/plantillas-auth.ts`, `src/lib/email/plantillas-auth.test.ts`

- [ ] **Step 1: Test que falla**

En `src/lib/email/plantillas-auth.test.ts`, reemplazar:

```ts
import { plantillaCodigoLogin, plantillaRecuperacion } from "./plantillas-auth";
```

por:

```ts
import { plantillaCodigoLogin, plantillaInvitacion, plantillaRecuperacion } from "./plantillas-auth";
```

Y agregar al final del archivo:

```ts
describe("plantillaInvitacion", () => {
  const LINK = "https://ana.tuproducto.com/admin/restablecer?token_hash=abc";

  it("en español, con el link en el botón y en el texto plano", () => {
    const email = plantillaInvitacion(MARCA, LINK);
    expect(email.asunto).toBe("Tu acceso al panel de Estética Gisel");
    expect(email.html).toContain("Definí tu contraseña");
    expect(email.html).toContain(`href="${LINK}"`);
    expect(email.html).toContain("vence en 1 hora");
    expect(email.texto).toContain(LINK);
  });

  it("en portugués", () => {
    const email = plantillaInvitacion({ ...MARCA, idioma: "pt", nombre: "Studio Demo" }, LINK);
    expect(email.asunto).toBe("Seu acesso ao painel de Studio Demo");
    expect(email.html).toContain("Defina sua senha");
    expect(email.html).toContain("expira em 1 hora");
    expect(email.html).not.toContain("Definí");
  });

  it("escapa el nombre del tenant y el link", () => {
    const email = plantillaInvitacion({ ...MARCA, nombre: "<i>Spa</i>" }, `${LINK}&x="y"`);
    expect(email.html).not.toContain("<i>Spa</i>");
    expect(email.html).not.toContain('x="y"');
  });
});
```

- [ ] **Step 2: Correr el test**

Run: `npx vitest run src/lib/email/plantillas-auth.test.ts`
Expected: FAIL (`plantillaInvitacion` no existe).

- [ ] **Step 3: Implementar**

Agregar al final de `src/lib/email/plantillas-auth.ts`:

```ts
/**
 * Alta del usuario del cliente (spec 6.6): link para definir la contraseña. Es un link de
 * recuperación de Supabase (mismo flujo que /admin/restablecer), con el mismo vencimiento.
 */
export function plantillaInvitacion(marca: MarcaEmail, link: string): EmailAuth {
  const t = traductor(marca.idioma);
  const { colorSecundario } = coloresSeguros(marca.colores);
  const intro = (nombre: string) =>
    t({
      es: `Ya tenés acceso al panel de gestión de ${nombre}. Para entrar, elegí tu contraseña:`,
      pt: `Você já tem acesso ao painel de gestão de ${nombre}. Para entrar, escolha sua senha:`,
    });
  const boton = t({ es: "Definir mi contraseña", pt: "Definir minha senha" });
  // 1 hora: "Email OTP Expiration" por defecto de Supabase Auth (3600 s).
  const vence = t({
    es: "El link se puede usar una sola vez y vence en 1 hora. Si venció, pedí uno nuevo desde la pantalla de ingreso del panel.",
    pt: "O link pode ser usado uma única vez e expira em 1 hora. Se expirou, peça um novo na tela de acesso do painel.",
  });
  const aviso = t({
    es: "Si no esperabas este email, ignoralo.",
    pt: "Se você não esperava este e-mail, ignore-o.",
  });
  return {
    asunto: t({ es: `Tu acceso al panel de ${marca.nombre}`, pt: `Seu acesso ao painel de ${marca.nombre}` }),
    html: layoutMarca(marca, {
      titulo: t({ es: "Definí tu contraseña", pt: "Defina sua senha" }),
      cuerpoHtml: `<p style="margin:0 0 20px;">${intro(escaparHtml(marca.nombre))}</p>
        ${botonMarca(marca, boton, link)}
        <p style="margin:20px 0 8px;">${vence}</p>
        <p style="margin:0; font-size:13px; color:${colorSecundario};">${aviso}</p>`,
    }),
    texto: [intro(marca.nombre), `${boton}: ${link}`, vence, aviso].join("\n\n"),
  };
}
```

- [ ] **Step 4: Tests y tipos**

```bash
npx vitest run src/lib/email
npx tsc --noEmit
```

Expected: PASS y sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/plantillas-auth.ts src/lib/email/plantillas-auth.test.ts
git commit -F - <<'EOF'
feat(email): invitación del usuario del cliente para definir su contraseña

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Migración 0018: alta atómica de clientes

**Files:**
- Create: `supabase/migrations/0018_crear_tenant.sql`
- Modify: `scripts/test-aislamiento.mjs`

- [ ] **Step 1: Crear `supabase/migrations/0018_crear_tenant.sql`**

```sql
-- Etapa C1: alta de un cliente desde el panel master en una sola transacción.
-- Crea el tenant y sus filas de marca, configuración y credenciales. Una llamada por RPC
-- es una sola transacción: si una fila falla, no queda nada a medias.
-- Solo la ejecuta el servidor con la service role (security invoker: corre con sus
-- privilegios, que se saltean RLS). anon y authenticated no la ejecutan: la 0017 cerró
-- los privilegios por defecto, y se repite acá para que quede explícito.

create function public.crear_tenant(
  p_slug text,
  p_nombre text,
  p_pais text,
  p_idioma text,
  p_zona_horaria text,
  p_moneda text,
  p_modulos jsonb,
  p_colores jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  nuevo uuid;
begin
  insert into public.tenants (
    slug, nombre, pais, idioma, zona_horaria, moneda,
    modulo_turnos, modulo_cursos, modulo_sobre_mi, modulo_testimonios,
    modulo_galeria, modulo_faq, modulo_whatsapp
  ) values (
    p_slug, p_nombre, p_pais, p_idioma, p_zona_horaria, p_moneda,
    coalesce((p_modulos ->> 'turnos')::boolean, false),
    coalesce((p_modulos ->> 'cursos')::boolean, false),
    coalesce((p_modulos ->> 'sobreMi')::boolean, false),
    coalesce((p_modulos ->> 'testimonios')::boolean, false),
    coalesce((p_modulos ->> 'galeria')::boolean, false),
    coalesce((p_modulos ->> 'faq')::boolean, false),
    coalesce((p_modulos ->> 'whatsapp')::boolean, false)
  )
  returning id into nuevo;

  -- Los colores son obligatorios (un null explícito no toma el default de la tabla): la
  -- app manda la paleta de la plataforma. El título de inicio arranca con el nombre.
  insert into public.tenant_marca (
    tenant_id, color_primario, color_secundario, color_fondo, color_texto, inicio_titulo
  ) values (
    nuevo, p_colores ->> 'primario', p_colores ->> 'secundario', p_colores ->> 'fondo',
    p_colores ->> 'texto', p_nombre
  );

  -- Horario vacío: cerrado todos los días hasta que el cliente cargue el suyo.
  insert into public.configuracion_negocio (tenant_id, horario_atencion) values (nuevo, '{}'::jsonb);

  insert into public.tenant_credenciales (tenant_id) values (nuevo);

  return nuevo;
end;
$$;

revoke execute on function public.crear_tenant(text, text, text, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.crear_tenant(text, text, text, text, text, text, jsonb, jsonb)
  to service_role;

-- PostgREST expone la función nueva sin esperar a que recargue solo su caché.
notify pgrst, 'reload schema';
```

- [ ] **Step 2: Extender `scripts/test-aislamiento.mjs`**

En el comentario del encabezado, reemplazar:

```js
// auxiliares por RPC), y que las tablas del login (códigos,
```

por:

```js
// auxiliares ni el alta de clientes por RPC), que crear_tenant crea las cuatro filas de un
// cliente en una sola transacción (con la service role), y que las tablas del login (códigos,
```

Después de:

```js
  mostrarError(pagoPropio);
  verificar(!pagoPropio.error, "pagos: sí puede apuntar a un turno propio (control)");
```

agregar:

```js

  console.log("\nAlta de clientes (crear_tenant, solo con la service role):");
  const COLORES_RPC = { primario: "#3d5a80", secundario: "#5c677d", fondo: "#f4f5f7", texto: "#1f2933" };
  const altaRpc = (slugAlta, colores) => ({
    p_slug: slugAlta, p_nombre: "Alta RPC", p_pais: "BR", p_idioma: "pt", p_zona_horaria: "America/Sao_Paulo",
    p_moneda: "BRL", p_modulos: { turnos: true, faq: true }, p_colores: colores,
  });
  const slugRpc = `test-rpc-${sufijo}`;
  const { data: idRpc, error: errorRpc } = await admin.rpc("crear_tenant", altaRpc(slugRpc, COLORES_RPC));
  mostrarError({ error: errorRpc });
  if (!idRpc) {
    verificar(false, "crear_tenant: la service role crea un cliente");
  } else {
    tenantsCreados.push(idRpc);
    const [tRpc, mRpc, cRpc, credRpc] = await Promise.all([
      admin.from("tenants").select("pais, modulo_turnos, modulo_faq, modulo_cursos").eq("id", idRpc).maybeSingle(),
      admin.from("tenant_marca").select("color_primario, inicio_titulo").eq("tenant_id", idRpc).maybeSingle(),
      admin.from("configuracion_negocio").select("horario_atencion").eq("tenant_id", idRpc).maybeSingle(),
      admin.from("tenant_credenciales").select("smtp_estado").eq("tenant_id", idRpc).maybeSingle(),
    ]);
    verificar(
      tRpc.data?.pais === "BR" && tRpc.data.modulo_turnos && tRpc.data.modulo_faq && !tRpc.data.modulo_cursos,
      "crear_tenant: crea el tenant con su país y sus módulos",
    );
    verificar(mRpc.data?.color_primario === "#3d5a80" && mRpc.data.inicio_titulo === "Alta RPC", "crear_tenant: crea la marca");
    verificar(!!cRpc.data && Object.keys(cRpc.data.horario_atencion).length === 0, "crear_tenant: crea la configuración con horario vacío");
    verificar(credRpc.data?.smtp_estado === "sin_configurar", "crear_tenant: crea la fila de credenciales");
  }
  verificar(esperaError(await admin.rpc("crear_tenant", altaRpc(slugRpc, COLORES_RPC)), "23505"), "crear_tenant: un subdominio repetido falla");
  const slugIncompleto = `test-rpc-x-${sufijo}`;
  verificar(esperaError(await admin.rpc("crear_tenant", altaRpc(slugIncompleto, {})), "23502"), "crear_tenant: sin colores falla (not null)");
  const { count: aMedias } = await admin.from("tenants").select("id", { count: "exact", head: true }).eq("slug", slugIncompleto);
  verificar(aMedias === 0, "crear_tenant: si falla una fila no queda el tenant (una sola transacción)");
```

Reemplazar el bloque:

```js
  // Las funciones auxiliares sin uso no se pueden invocar por RPC (migración 0016).
  for (const [quien, cliente] of [["anónimo", anon], ["cliente A", usuarioA], ["master", usuarioMaster]]) {
    for (const fn of ["tenant_actual", "es_master"]) {
      verificar(esperaError(await cliente.rpc(fn), "42501"), `rpc ${fn}: ${quien} no la invoca`);
    }
  }
```

por:

```js
  // Las funciones auxiliares sin uso y el alta de clientes no se invocan por RPC (migraciones 0016 y 0018).
  const altaIntrusa = {
    p_slug: `test-intruso-${sufijo}`, p_nombre: "Intruso", p_pais: "AR", p_idioma: "es",
    p_zona_horaria: "America/Argentina/Buenos_Aires", p_moneda: "ARS", p_modulos: {},
    p_colores: { primario: "#000000", secundario: "#000000", fondo: "#ffffff", texto: "#000000" },
  };
  for (const [quien, cliente] of [["anónimo", anon], ["cliente A", usuarioA], ["master", usuarioMaster]]) {
    for (const [fn, args] of [["tenant_actual"], ["es_master"], ["crear_tenant", altaIntrusa]]) {
      verificar(esperaError(await cliente.rpc(fn, args), "42501"), `rpc ${fn}: ${quien} no la invoca`);
    }
  }
  const { count: intrusos } = await admin.from("tenants").select("id", { count: "exact", head: true }).eq("slug", altaIntrusa.p_slug);
  verificar(intrusos === 0, "crear_tenant: ningún intento por la API creó un cliente");
```

En el `finally`, después del `for (const id of tenantsCreados) { … }`, agregar:

```js
  // Por si un alta indebida (o a medias) hubiera pasado.
  await admin.from("tenants").delete().like("slug", `test-%-${sufijo}`);
```

- [ ] **Step 3: Aplicar la migración**

```bash
node --env-file=.env.local scripts/migrar.mjs supabase/migrations/0018_crear_tenant.sql
```

Expected: `✓ aplicada 0018_crear_tenant.sql`. Si falla por conexión o autenticación: detenerse y avisar a Pablo.

- [ ] **Step 4: Aislamiento**

```bash
node --check scripts/test-aislamiento.mjs
npm run test:aislamiento
```

Expected: todas las verificaciones en `✓` (incluidas las de `crear_tenant`, las tres `rpc crear_tenant: … no la invoca` y `anon y authenticated solo ejecutan tenant_activo en public`) y `Aislamiento OK`. Si `rpc crear_tenant` da un código distinto de `42501` (por ejemplo `PGRST202`, función no encontrada), PostgREST todavía no recargó su caché: esperar un minuto y repetir.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0018_crear_tenant.sql scripts/test-aislamiento.mjs
git commit -F - <<'EOF'
feat(db): crear_tenant da de alta un cliente en una sola transacción

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Bucket `sitios`, imágenes remotas y límite de las actions

**Files:**
- Create: `scripts/setup-storage-sitios.mjs`
- Rewrite: `next.config.ts`
- Modify: `scripts/test-aislamiento.mjs`

- [ ] **Step 1: Crear `scripts/setup-storage-sitios.mjs`**

```js
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
```

- [ ] **Step 2: Crear el bucket**

```bash
node --env-file=.env.local scripts/setup-storage-sitios.mjs
node --env-file=.env.local scripts/setup-storage-sitios.mjs
```

Expected: `✓ sitios creado` y después `✓ sitios actualizado`.

- [ ] **Step 3: Reescribir `next.config.ts`**

```ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * Imágenes de la marca de cada cliente (bucket público "sitios" de Supabase). El host sale
 * de NEXT_PUBLIC_SUPABASE_URL, que Next carga del .env antes de evaluar esta configuración
 * (en dev y en el build; el build de Docker la recibe por el secret del .env.local).
 */
function imagenesDeSitios(): URL[] {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  return base ? [new URL(`${base}/storage/v1/object/public/sitios/**`)] : [];
}

const nextConfig: NextConfig = {
  // Genera .next/standalone (server.js + deps mínimas) para la imagen Docker.
  output: "standalone",
  // En desarrollo cada tenant es <slug>.localhost:3000 (otro origen para el dev server).
  allowedDevOrigins: ["*.localhost"],
  // Miniaturas de las vistas previas de cursos (YouTube) e imágenes de la marca (Supabase).
  images: { remotePatterns: [new URL("https://i.ytimg.com/vi/**"), ...imagenesDeSitios()] },
  experimental: {
    // El panel master sube una imagen por envío (hasta 2 MB, lo valida la action): margen
    // para el overhead del multipart. Por encima, Next corta el pedido con 413.
    serverActions: { bodySizeLimit: "3mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

- [ ] **Step 4: Extender `scripts/test-aislamiento.mjs` con el bucket**

Después de `const usuariosCreados = [];` (arriba del archivo), agregar:

```js
/** Objetos de prueba del bucket sitios (se borran al final). */
const objetosSitios = [];
/** PNG de 1×1. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
```

Antes de `  await permisosDeLaBase();`, agregar:

```js
  console.log("\nBucket sitios (imágenes de la marca):");
  const { data: bucket, error: errorBucket } = await admin.storage.getBucket("sitios");
  mostrarError({ error: errorBucket });
  verificar(bucket?.public === true, "sitios: existe y es público (lectura por URL)");
  verificar(bucket?.file_size_limit === 2 * 1024 * 1024, "sitios: límite de 2 MB");
  verificar(
    JSON.stringify([...(bucket?.allowed_mime_types ?? [])].sort()) === JSON.stringify(["image/jpeg", "image/png", "image/webp"]),
    "sitios: solo PNG, JPEG y WebP",
  );
  for (const [quien, cliente] of [["anónimo", anon], ["cliente A", usuarioA], ["master", usuarioMaster]]) {
    const path = `${a.id}/intruso-${quien === "anónimo" ? "anon" : quien.replace(" ", "-")}-${sufijo}.png`;
    objetosSitios.push(path);
    const subida = await cliente.storage.from("sitios").upload(path, PNG, { contentType: "image/png" });
    verificar(!!subida.error, `sitios: ${quien} no sube archivos`);
  }
  const pathControl = `${a.id}/control-${sufijo}.png`;
  objetosSitios.push(pathControl);
  await ok(admin.storage.from("sitios").upload(pathControl, PNG, { contentType: "image/png" }), "subir imagen de control");
  const urlControl = `${url.replace(/\/+$/, "")}/storage/v1/object/public/sitios/${pathControl}`;
  verificar((await fetch(urlControl)).status === 200, "sitios: la URL pública se lee sin sesión (control)");
  const listado = await anon.storage.from("sitios").list(a.id);
  verificar(!!listado.error || listado.data.length === 0, "sitios: un anónimo no lista la carpeta de un cliente");
  await anon.storage.from("sitios").remove([pathControl]);
  const sigue = await admin.storage.from("sitios").list(a.id, { search: `control-${sufijo}` });
  verificar(!sigue.error && sigue.data.length === 1, "sitios: un anónimo no borra");
```

En el `finally`, antes de `for (const id of usuariosCreados) {`, agregar:

```js
  if (objetosSitios.length) {
    const { error: errorObjetos } = await admin.storage.from("sitios").remove(objetosSitios);
    if (errorObjetos) {
      console.error(`✗ limpieza: sitios: ${errorObjetos.message}`);
      fallas++;
    }
  }
```

- [ ] **Step 5: Verificar**

```bash
node --check scripts/setup-storage-sitios.mjs
node --check scripts/test-aislamiento.mjs
npm run test:aislamiento
npx tsc --noEmit
npm run build
```

Expected: `Aislamiento OK` (con las verificaciones de `sitios` en `✓`), sin errores de tipos y el build sin errores.

- [ ] **Step 6: Commit**

```bash
git add scripts/setup-storage-sitios.mjs next.config.ts scripts/test-aislamiento.mjs
git commit -F - <<'EOF'
feat(storage): bucket público sitios, imágenes de Supabase en next/image y límite de 3 MB en actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Servicio del master: clientes, marca e imágenes

**Files:**
- Create: `src/lib/storage/sitios.ts`, `src/lib/master/servicio.ts`

- [ ] **Step 1: Crear `src/lib/storage/sitios.ts`**

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_SITIOS, MIME_FORMATO, pathImagen, urlPublica, type FormatoImagen, type TipoImagen } from "./imagenes";

/** URL del proyecto de Supabase (la misma de las URLs públicas de las imágenes). */
export function urlSupabase(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

/** Sube una imagen ya validada. El Content-Type sale del formato real, no del navegador. */
export async function subirImagenSitio(
  tenantId: string,
  tipo: TipoImagen,
  bytes: Buffer,
  formato: FormatoImagen,
): Promise<{ path: string; url: string }> {
  const path = pathImagen(tenantId, tipo, formato, new Date());
  const { error } = await createAdminClient()
    .storage.from(BUCKET_SITIOS)
    // Cada subida tiene una URL nueva: un día de caché, y una imagen reemplazada no queda años en la CDN.
    .upload(path, bytes, { contentType: MIME_FORMATO[formato], cacheControl: "86400", upsert: false });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return { path, url: urlPublica(urlSupabase(), path) };
}

export async function borrarImagenSitio(path: string): Promise<void> {
  const { error } = await createAdminClient().storage.from(BUCKET_SITIOS).remove([path]);
  if (error) throw new Error(`No se pudo borrar la imagen: ${error.message}`);
}
```

- [ ] **Step 2: Crear `src/lib/master/servicio.ts`**

```ts
import "server-only";
import { masterVerificado } from "@/lib/auth/master";
import { COLORES_PLATAFORMA } from "@/lib/plataforma";
import { CAMPO_MARCA_IMAGEN, COLUMNA_IMAGEN, pathDeUrlPublica, type FormatoImagen, type TipoImagen } from "@/lib/storage/imagenes";
import { borrarImagenSitio, subirImagenSitio, urlSupabase } from "@/lib/storage/sitios";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { datosDelTenant } from "@/lib/tenant/datos";
import type { ColoresMarca } from "@/lib/tenant/estilo";
import { esSlugValido } from "@/lib/tenant/host";
import type { Modulos, Tenant } from "@/lib/tenant/tipos";
import { alertasDelCliente, type Alerta } from "./alertas";
import {
  columnasColores,
  columnasDatos,
  columnasTextos,
  type AltaCliente,
  type DatosCliente,
  type TextosMarca,
} from "./formularios";
import { columnasModulos, MODULOS, modulosDeFila, type ColumnaModulo } from "./modulos";

/**
 * Datos del panel master con la service role. Cada función exportada verifica al master
 * (además de las actions y las páginas): defensa en profundidad, y masterVerificado está
 * cacheado por request.
 */
function fallar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`);
}

export type ClienteListado = {
  id: string;
  nombre: string;
  slug: string;
  estado: Tenant["estado"];
  modulos: Modulos;
  alertas: Alerta[];
};

type FilaAlertas = { smtp_estado: string; mp_token_vence_en: string | null };
type FilaListado = Record<ColumnaModulo, boolean> & {
  id: string;
  nombre: string;
  slug: string;
  estado: Tenant["estado"];
  tenant_credenciales: FilaAlertas | FilaAlertas[] | null;
};

export async function listarClientes(): Promise<ClienteListado[]> {
  await masterVerificado();
  const columnas = [
    "id, nombre, slug, estado",
    ...MODULOS.map((m) => m.columna),
    "tenant_credenciales(smtp_estado, mp_token_vence_en)",
  ].join(", ");
  const { data, error } = await createAdminClient().from("tenants").select(columnas).order("nombre");
  fallar("clientes", error);
  const ahora = new Date();
  return ((data ?? []) as unknown as FilaListado[]).map((f) => {
    const cred = Array.isArray(f.tenant_credenciales) ? f.tenant_credenciales[0] : f.tenant_credenciales;
    return {
      id: f.id,
      nombre: f.nombre,
      slug: f.slug,
      estado: f.estado,
      modulos: modulosDeFila(f),
      alertas: alertasDelCliente(cred ? { smtpEstado: cred.smtp_estado, mpTokenVenceEn: cred.mp_token_vence_en } : null, ahora),
    };
  });
}

/** Cliente para editar (activo o suspendido). null si el slug no es válido o no existe. */
export async function clientePorSlug(slug: string): Promise<Tenant | null> {
  await masterVerificado();
  if (!esSlugValido(slug)) return null;
  return getTenantPorSlug(slug);
}

/** Alta en una transacción (función SQL crear_tenant, migración 0018), con la paleta de la plataforma. */
export async function crearCliente(alta: AltaCliente): Promise<{ ok: true } | { ok: false; error: "slug_en_uso" }> {
  await masterVerificado();
  const { error } = await createAdminClient().rpc("crear_tenant", {
    p_slug: alta.slug,
    p_nombre: alta.nombre,
    p_pais: alta.pais,
    p_idioma: alta.idioma,
    p_zona_horaria: alta.zonaHoraria,
    p_moneda: alta.moneda,
    p_modulos: alta.modulos,
    p_colores: {
      primario: COLORES_PLATAFORMA.colorPrimario,
      secundario: COLORES_PLATAFORMA.colorSecundario,
      fondo: COLORES_PLATAFORMA.colorFondo,
      texto: COLORES_PLATAFORMA.colorTexto,
    },
  });
  if (error?.code === "23505") return { ok: false, error: "slug_en_uso" };
  fallar("alta del cliente", error);
  return { ok: true };
}

async function actualizarTenant(tenantId: string, cambios: Record<string, unknown>): Promise<void> {
  const { error } = await createAdminClient().from("tenants").update(cambios).eq("id", tenantId);
  fallar("actualizar cliente", error);
}

async function actualizarMarca(tenantId: string, cambios: Record<string, unknown>): Promise<void> {
  const { error } = await datosDelTenant(tenantId).update("tenant_marca", cambios);
  fallar("actualizar marca", error);
}

export async function actualizarDatos(tenantId: string, datos: DatosCliente): Promise<void> {
  await masterVerificado();
  await actualizarTenant(tenantId, columnasDatos(datos));
}

export async function actualizarEstado(tenantId: string, estado: Tenant["estado"]): Promise<void> {
  await masterVerificado();
  await actualizarTenant(tenantId, { estado });
}

export async function actualizarModulos(tenantId: string, modulos: Modulos): Promise<void> {
  await masterVerificado();
  await actualizarTenant(tenantId, columnasModulos(modulos));
}

export async function actualizarColores(tenantId: string, colores: ColoresMarca): Promise<void> {
  await masterVerificado();
  await actualizarMarca(tenantId, columnasColores(colores));
}

export async function actualizarTextos(tenantId: string, textos: TextosMarca): Promise<void> {
  await masterVerificado();
  await actualizarMarca(tenantId, columnasTextos(textos));
}

/**
 * Sube la imagen nueva, la guarda en tenant_marca y recién entonces borra la anterior (si
 * era una subida por el panel a la carpeta del tenant). Si falla el guardado, se borra la nueva.
 */
export async function guardarImagen(tenant: Tenant, tipo: TipoImagen, bytes: Buffer, formato: FormatoImagen): Promise<void> {
  await masterVerificado();
  const anterior = tenant.marca[CAMPO_MARCA_IMAGEN[tipo]];
  const nueva = await subirImagenSitio(tenant.id, tipo, bytes, formato);
  try {
    await actualizarMarca(tenant.id, { [COLUMNA_IMAGEN[tipo]]: nueva.url });
  } catch (e) {
    await borrarImagenSitio(nueva.path).catch(() => {});
    throw e;
  }
  const pathAnterior = pathDeUrlPublica(anterior, urlSupabase(), tenant.id);
  if (pathAnterior) {
    // Si falla, queda un objeto huérfano en la carpeta del tenant: no rompe nada.
    await borrarImagenSitio(pathAnterior).catch((e) => console.error("No se pudo borrar la imagen anterior:", e));
  }
}
```

- [ ] **Step 3: Tipos y lint**

```bash
npx tsc --noEmit
npx eslint src/lib/master src/lib/storage
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/storage/sitios.ts src/lib/master/servicio.ts
git commit -F - <<'EOF'
feat(master): servicio de clientes, marca e imágenes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 10: Credenciales cifradas y prueba de Gmail

**Files:**
- Create: `src/lib/cripto/clave.ts`, `src/lib/master/gmail.ts`, `src/lib/master/credenciales.ts`
- Modify: `src/lib/tenant/consultas.ts`, `.env.example`, `docker-compose.yml`, `.env.local` (**no se commitea**)

- [ ] **Step 1: Generar `CREDENCIALES_KEY` en `.env.local` (solo si falta, sin imprimirla)**

```bash
grep -q '^CREDENCIALES_KEY=' .env.local || node -e "require('fs').appendFileSync('.env.local', '\nCREDENCIALES_KEY=' + require('crypto').randomBytes(32).toString('base64url') + '\n')"
grep -c '^CREDENCIALES_KEY=[A-Za-z0-9_-]\{43\}$' .env.local
```

Expected: `1`. Si da `0`, ya había una línea `CREDENCIALES_KEY=` con otro formato: avisar a Pablo, sin mostrar su valor, y no sobrescribirla.

- [ ] **Step 2: `.env.example`**

Agregar al final:

```bash

# === Panel master (etapa C1) ===
# Clave de cifrado de las credenciales de cada cliente (Gmail, Mercado Pago) en
# tenant_credenciales: AES-256-GCM, 32 bytes aleatorios en base64url. La necesita el
# contenedor (runtime). Si se pierde, hay que volver a cargar todas las credenciales:
# guardarla en un gestor de contraseñas. No cambiarla sin volver a cifrar lo guardado.
CREDENCIALES_KEY=
```

- [ ] **Step 3: `docker-compose.yml`**

Reemplazar:

```yaml
    # Secretos de runtime (server-side). Nunca se copian a la imagen.
    env_file: .env.local
```

por:

```yaml
    # Secretos de runtime (server-side). Nunca se copian a la imagen. Incluye los que la app
    # necesita al correr: MFA_SECRET y CREDENCIALES_KEY (cifrado de credenciales de clientes).
    env_file: .env.local
```

- [ ] **Step 4: `tenant_credenciales` en `TablaTenant`**

En `src/lib/tenant/consultas.ts`, reemplazar:

```ts
  | "testimonios"
  | "tenant_marca";
```

por:

```ts
  | "testimonios"
  | "tenant_marca"
  | "tenant_credenciales";
```

- [ ] **Step 5: Crear `src/lib/cripto/clave.ts`**

```ts
import "server-only";
import { claveDesdeTexto } from "./credenciales";

/** CREDENCIALES_KEY del entorno (32 bytes). Lanza si falta o es inválida. */
export function claveCredenciales(): Buffer {
  return claveDesdeTexto(process.env.CREDENCIALES_KEY);
}

/** Para avisar en el panel antes de intentar guardar credenciales. */
export function claveCredencialesConfigurada(): boolean {
  try {
    claveCredenciales();
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 6: Crear `src/lib/master/gmail.ts`**

```ts
import "server-only";
import nodemailer from "nodemailer";
import { clasificarErrorSmtp, type FalloClasificado } from "./smtp";

const LIMITE_MS = 20_000;

/**
 * "Probar conexión" del Gmail de un cliente: login SMTP con la contraseña de aplicación,
 * sin enviar nada. Con tiempo límite propio además de los de nodemailer.
 */
export async function verificarGmail(
  usuario: string,
  contrasena: string,
): Promise<{ ok: true } | { ok: false; fallo: FalloClasificado }> {
  const transporte = nodemailer.createTransport({
    service: "gmail",
    auth: { user: usuario, pass: contrasena },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      transporte.verify(),
      new Promise((_, rechazar) => {
        temporizador = setTimeout(
          () => rechazar(Object.assign(new Error("Tiempo agotado"), { code: "ETIMEDOUT" })),
          LIMITE_MS,
        );
      }),
    ]);
    return { ok: true };
  } catch (e) {
    return { ok: false, fallo: clasificarErrorSmtp(e) };
  } finally {
    clearTimeout(temporizador);
    transporte.close();
  }
}
```

- [ ] **Step 7: Crear `src/lib/master/credenciales.ts`**

```ts
import "server-only";
import { masterVerificado } from "@/lib/auth/master";
import { claveCredenciales } from "@/lib/cripto/clave";
import { cifrar, descifrar } from "@/lib/cripto/credenciales";
import { datosDelTenant } from "@/lib/tenant/datos";
import type { FormGmail, FormMp } from "./formularios";
import { verificarGmail } from "./gmail";
import { textoErrorSmtp, type FalloSmtp } from "./smtp";

/**
 * Credenciales de un cliente (spec 4.3 y 9). Los secretos se guardan cifrados y nunca
 * salen de este módulo: el panel recibe solo si están configurados.
 */
type FilaCredenciales = {
  mp_access_token: string | null;
  mp_public_key: string | null;
  mp_webhook_secret: string | null;
  mp_origen: "oauth" | "manual" | null;
  mp_token_vence_en: string | null;
  smtp_usuario: string | null;
  smtp_password: string | null;
  smtp_nombre_remitente: string | null;
  smtp_estado: "ok" | "error" | "sin_configurar";
  smtp_ultimo_error: string | null;
};

const COLUMNAS =
  "mp_access_token, mp_public_key, mp_webhook_secret, mp_origen, mp_token_vence_en, smtp_usuario, smtp_password, smtp_nombre_remitente, smtp_estado, smtp_ultimo_error";

async function leerFila(tenantId: string): Promise<FilaCredenciales> {
  const { data, error } = await datosDelTenant(tenantId).select("tenant_credenciales", COLUMNAS).maybeSingle();
  if (error) throw new Error(`credenciales: ${error.message}`);
  if (!data) throw new Error("El cliente no tiene fila de credenciales");
  return data as unknown as FilaCredenciales;
}

async function actualizar(tenantId: string, cambios: Record<string, unknown>): Promise<void> {
  const { error } = await datosDelTenant(tenantId).update("tenant_credenciales", cambios);
  if (error) throw new Error(`guardar credenciales: ${error.message}`);
}

export type EstadoCredenciales = {
  gmail: {
    usuario: string | null;
    remitente: string | null;
    contrasenaConfigurada: boolean;
    estado: FilaCredenciales["smtp_estado"];
    ultimoError: string | null;
  };
  mp: {
    origen: FilaCredenciales["mp_origen"];
    publicKey: string | null;
    accessTokenConfigurado: boolean;
    webhookSecretConfigurado: boolean;
    venceEn: string | null;
  };
};

/** Lo que muestra el panel: nunca un valor secreto. */
export async function estadoCredenciales(tenantId: string): Promise<EstadoCredenciales> {
  await masterVerificado();
  const f = await leerFila(tenantId);
  return {
    gmail: {
      usuario: f.smtp_usuario,
      remitente: f.smtp_nombre_remitente,
      contrasenaConfigurada: !!f.smtp_password,
      estado: f.smtp_estado,
      ultimoError: f.smtp_ultimo_error,
    },
    mp: {
      origen: f.mp_origen,
      publicKey: f.mp_public_key,
      accessTokenConfigurado: !!f.mp_access_token,
      webhookSecretConfigurado: !!f.mp_webhook_secret,
      venceEn: f.mp_token_vence_en,
    },
  };
}

/** Misma cuenta de Gmail que la guardada (form.usuario ya viene normalizado). */
function mismaCuenta(usuario: string, guardado: string | null): boolean {
  return guardado !== null && usuario === guardado.trim().toLowerCase();
}

/**
 * "Probar conexión y guardar". Prueba con los datos efectivos (la contraseña nueva o la
 * guardada, que solo sirve para la misma cuenta). Si pasa, guarda y marca ok. Si falla, no
 * guarda nada nuevo; si los datos eran los guardados (misma cuenta, sin contraseña nueva),
 * registra el error (alerta en la lista). Lanza si falta CREDENCIALES_KEY (la action lo
 * chequea antes). Si la contraseña guardada no se puede descifrar (clave cambiada o valor
 * dañado), pide volver a cargarla.
 */
export async function probarYGuardarGmail(
  tenantId: string,
  form: FormGmail,
): Promise<
  | { ok: true }
  | { ok: false; error: FalloSmtp | "gmail_sin_contrasena" | "gmail_contrasena_cuenta_nueva" | "credencial_ilegible" }
> {
  await masterVerificado();
  const clave = claveCredenciales();
  const fila = await leerFila(tenantId);
  const contexto = { tenantId, columna: "smtp_password" } as const;
  const esLaMismaCuenta = mismaCuenta(form.usuario, fila.smtp_usuario);

  let contrasena = form.contrasena;
  if (!contrasena) {
    if (!fila.smtp_password) return { ok: false, error: "gmail_sin_contrasena" };
    // La contraseña guardada es de la cuenta guardada: no se prueba con otra cuenta.
    if (!esLaMismaCuenta) return { ok: false, error: "gmail_contrasena_cuenta_nueva" };
    try {
      contrasena = descifrar(clave, fila.smtp_password, contexto);
    } catch {
      return { ok: false, error: "credencial_ilegible" };
    }
  }

  const prueba = await verificarGmail(form.usuario, contrasena);
  if (!prueba.ok) {
    const esLaGuardada = !form.contrasena && esLaMismaCuenta;
    if (esLaGuardada) {
      await actualizar(tenantId, { smtp_estado: "error", smtp_ultimo_error: textoErrorSmtp(prueba.fallo) });
    }
    return { ok: false, error: prueba.fallo.clave };
  }

  await actualizar(tenantId, {
    smtp_usuario: form.usuario,
    smtp_nombre_remitente: form.remitente,
    ...(form.contrasena ? { smtp_password: cifrar(clave, form.contrasena, contexto) } : {}),
    smtp_estado: "ok",
    smtp_ultimo_error: null,
  });
  return { ok: true };
}

/**
 * Mercado Pago manual (spec 9). Un access token nuevo fija mp_origen = 'manual' y limpia
 * los datos del OAuth. Guardar solo la public key o el secreto del webhook no cambia el
 * origen ni toca el OAuth (salvo que no hubiera origen: entonces queda 'manual'). Los
 * campos vacíos mantienen lo guardado.
 */
export async function guardarMercadoPago(tenantId: string, form: FormMp): Promise<"ok" | "mp_sin_access_token"> {
  await masterVerificado();
  const clave = claveCredenciales();
  const fila = await leerFila(tenantId);
  if (!form.accessToken && !fila.mp_access_token) return "mp_sin_access_token";

  const cambios: Record<string, unknown> = {};
  if (form.accessToken) {
    cambios.mp_origen = "manual";
    cambios.mp_access_token = cifrar(clave, form.accessToken, { tenantId, columna: "mp_access_token" });
    cambios.mp_refresh_token = null;
    cambios.mp_token_vence_en = null;
    cambios.mp_user_id = null;
  }
  if (form.webhookSecret) {
    cambios.mp_webhook_secret = cifrar(clave, form.webhookSecret, { tenantId, columna: "mp_webhook_secret" });
  }
  if (form.publicKey) cambios.mp_public_key = form.publicKey;
  if (Object.keys(cambios).length === 0) return "ok";
  if (!fila.mp_origen) cambios.mp_origen = "manual";
  await actualizar(tenantId, cambios);
  return "ok";
}
```

- [ ] **Step 8: Tipos, lint y tests**

```bash
npx tsc --noEmit
npx eslint src/lib/master src/lib/cripto src/lib/tenant
npx vitest run
```

Expected: sin errores y todos los tests en PASS (los de `consultas` no cambian).

- [ ] **Step 9: Commit**

```bash
git add src/lib/cripto/clave.ts src/lib/master/gmail.ts src/lib/master/credenciales.ts src/lib/tenant/consultas.ts .env.example docker-compose.yml
git status --short   # .env.local y docs/resumen-arquitectura-y-desarrollo.md NO deben estar en staged
git commit -F - <<'EOF'
feat(master): credenciales cifradas, prueba de Gmail y Mercado Pago manual

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 11: Usuario del cliente

**Files:**
- Create: `src/lib/master/usuarios.ts`

- [ ] **Step 1: Crear `src/lib/master/usuarios.ts`**

```ts
import "server-only";
import { randomBytes } from "node:crypto";
import { masterVerificado } from "@/lib/auth/master";
import { RUTAS_AUTH, rutaDelArea } from "@/lib/auth/rutas";
import { perfilDe, revocarDispositivos } from "@/lib/auth/servicio";
import { marcaEmailDeTenant } from "@/lib/email/layout-marca";
import { entregarEmailAuth, modoEnvioActual } from "@/lib/email/plataforma";
import { plantillaInvitacion } from "@/lib/email/plantillas-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tenant } from "@/lib/tenant/tipos";
import { urlDelTenant } from "@/lib/tenant/urls";

/**
 * Usuario del panel de un cliente (spec 6.6). El master carga el email; el usuario define
 * su contraseña con un link (generateLink tipo recovery, el mismo flujo de
 * /admin/restablecer). El master nunca conoce ni define contraseñas de clientes.
 * Hoy es un usuario por cliente; la lista y las acciones ya trabajan con varios.
 */
export const MAX_USUARIOS_POR_CLIENTE = 1;
const POR_PAGINA = 200;

export type UsuarioCliente = { userId: string; email: string | null; ultimoIngreso: string | null };

export type ResultadoInvitacion =
  | "ok"
  | "ya_es_usuario"
  | "limite_usuarios"
  | "usuario_de_otro"
  | "usuario_master"
  | "usuario_sin_cliente"
  | "usuario_sin_email"
  | "cliente_suspendido"
  | "envio_emails_no_configurado";

export type ResultadoReenvio =
  | "ok"
  | "usuario_no_encontrado"
  | "envio_fallo"
  | "cliente_suspendido"
  | "envio_emails_no_configurado";

function fallar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`);
}

export async function usuariosDelCliente(tenantId: string): Promise<UsuarioCliente[]> {
  await masterVerificado();
  const db = createAdminClient();
  const { data, error } = await db.from("perfiles").select("user_id").eq("rol", "cliente").eq("tenant_id", tenantId);
  fallar("usuarios del cliente", error);
  return Promise.all(
    (data ?? []).map(async ({ user_id }: { user_id: string }) => {
      const { data: datos, error: errorUsuario } = await db.auth.admin.getUserById(user_id);
      fallar("usuario", errorUsuario);
      return { userId: user_id, email: datos.user?.email ?? null, ultimoIngreso: datos.user?.last_sign_in_at ?? null };
    }),
  );
}

/** El link lleva al panel del cliente: con el cliente suspendido no sirve; sin envío posible, tampoco. */
function bloqueoDeEnvio(tenant: Tenant): "cliente_suspendido" | "envio_emails_no_configurado" | null {
  if (tenant.estado !== "activo") return "cliente_suspendido";
  if (modoEnvioActual() === "bloqueado") return "envio_emails_no_configurado";
  return null;
}

/** Genera el link de contraseña y lo envía con la marca del cliente. false si no se pudo. */
async function enviarLinkContrasena(tenant: Tenant, email: string): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email });
    if (error) throw new Error(error.message);
    const base = urlDelTenant(tenant.slug);
    const query = new URLSearchParams({ token_hash: data.properties.hashed_token });
    const link = `${base}${rutaDelArea("tenant", RUTAS_AUTH.restablecer)}?${query}`;
    await entregarEmailAuth({
      para: email,
      email: plantillaInvitacion(marcaEmailDeTenant(tenant, base), link),
      remitente: tenant.nombre,
      avisoConsola: `[MFA dev] link de invitación para ${email}: ${link}`,
    });
    return true;
  } catch (e) {
    console.error("No se pudo enviar el link de contraseña:", e);
    return false;
  }
}

/** Id del usuario de Auth con ese email (paginando: la API admin no filtra por email). */
async function buscarUsuarioPorEmail(email: string): Promise<string | null> {
  const db = createAdminClient();
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: POR_PAGINA });
    fallar("buscar usuario", error);
    const usuario = data.users.find((u) => u.email?.toLowerCase() === email);
    if (usuario) return usuario.id;
    if (data.users.length < POR_PAGINA) return null;
  }
}

/** El email ya tiene cuenta: de quién es. Una cuenta sin perfil se rechaza (alguien puede conocer su contraseña). */
async function motivoEmailOcupado(
  tenantId: string,
  email: string,
): Promise<"ya_es_usuario" | "usuario_de_otro" | "usuario_master" | "usuario_sin_cliente"> {
  const userId = await buscarUsuarioPorEmail(email);
  if (!userId) throw new Error("Supabase dice que el email existe, pero no se encontró el usuario");
  const perfil = await perfilDe(userId);
  if (!perfil) return "usuario_sin_cliente";
  if (perfil.rol === "master") return "usuario_master";
  return perfil.tenant_id === tenantId ? "ya_es_usuario" : "usuario_de_otro";
}

/** email ya normalizado (normalizarEmail). */
export async function invitarUsuarioCliente(tenant: Tenant, email: string): Promise<ResultadoInvitacion> {
  await masterVerificado();
  const bloqueo = bloqueoDeEnvio(tenant);
  if (bloqueo) return bloqueo;

  const actuales = await usuariosDelCliente(tenant.id);
  if (actuales.some((u) => u.email?.toLowerCase() === email)) return "ya_es_usuario";
  if (actuales.length >= MAX_USUARIOS_POR_CLIENTE) return "limite_usuarios";

  const db = createAdminClient();
  // Contraseña aleatoria que nadie conoce: el usuario define la suya con el link.
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    password: randomBytes(32).toString("base64url"),
  });
  if (error) {
    if (error.code === "email_exists") return motivoEmailOcupado(tenant.id, email);
    throw new Error(`crear usuario: ${error.message}`);
  }
  const userId = data.user.id;
  const { error: errorPerfil } = await db.from("perfiles").insert({ user_id: userId, rol: "cliente", tenant_id: tenant.id });
  if (errorPerfil) {
    // Compensación: un usuario sin perfil no sirve y bloquearía ese email.
    await db.auth.admin.deleteUser(userId);
    throw new Error(`perfil del usuario: ${errorPerfil.message}`);
  }
  return (await enviarLinkContrasena(tenant, email)) ? "ok" : "usuario_sin_email";
}

export async function reenviarLinkContrasena(tenant: Tenant, userId: string): Promise<ResultadoReenvio> {
  await masterVerificado();
  const bloqueo = bloqueoDeEnvio(tenant);
  if (bloqueo) return bloqueo;
  const usuario = (await usuariosDelCliente(tenant.id)).find((u) => u.userId === userId);
  if (!usuario?.email) return "usuario_no_encontrado";
  return (await enviarLinkContrasena(tenant, usuario.email)) ? "ok" : "envio_fallo";
}

/** Olvida los dispositivos recordados del usuario: su próximo ingreso pide el código. */
export async function revocarDispositivosDeUsuario(
  tenantId: string,
  userId: string,
): Promise<"ok" | "usuario_no_encontrado"> {
  await masterVerificado();
  const { data, error } = await createAdminClient()
    .from("perfiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  fallar("perfil", error);
  if (!data) return "usuario_no_encontrado";
  await revocarDispositivos(userId);
  return "ok";
}
```

- [ ] **Step 2: Tipos y lint**

```bash
npx tsc --noEmit
npx eslint src/lib/master/usuarios.ts
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/master/usuarios.ts
git commit -F - <<'EOF'
feat(master): alta del usuario del cliente con link para definir su contraseña

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 12: Server actions del panel master

**Files:**
- Create: `src/lib/master/acciones.ts`

- [ ] **Step 1: Crear `src/lib/master/acciones.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { masterVerificado } from "@/lib/auth/master";
import { normalizarEmail } from "@/lib/auth/recuperacion";
import { claveCredencialesConfigurada } from "@/lib/cripto/clave";
import { esTipoImagen, validarImagen, validarTamano } from "@/lib/storage/imagenes";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { esSlugValido } from "@/lib/tenant/host";
import type { Tenant } from "@/lib/tenant/tipos";
import { guardarMercadoPago, probarYGuardarGmail } from "./credenciales";
import { parsearAlta, parsearColores, parsearDatos, parsearGmail, parsearMp, parsearTextos } from "./formularios";
import type { ClaveAviso, ClaveError, ClaveInfo } from "./mensajes";
import { parsearModulos } from "./modulos";
import {
  actualizarColores,
  actualizarDatos,
  actualizarEstado,
  actualizarModulos,
  actualizarTextos,
  crearCliente,
  guardarImagen,
} from "./servicio";
import { invitarUsuarioCliente, reenviarLinkContrasena, revocarDispositivosDeUsuario } from "./usuarios";

/*
 * Server actions del panel master (app.<dominio>). Cada una verifica al master antes de
 * leer el formulario, valida todo en el servidor y redirige con una clave de mensajes.ts.
 * El cliente a editar sale del campo oculto "slug" (cualquier estado: el master edita
 * también los suspendidos).
 */

type Mensaje = { error: ClaveError } | { ok: ClaveInfo; aviso?: ClaveAviso };

function ir(ruta: string, mensaje?: Mensaje): never {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(mensaje ?? {})) if (valor) params.set(clave, valor);
  const query = params.toString();
  redirect(query ? `${ruta}?${query}` : ruta);
}

function rutaCliente(slug: string, pestana?: string): string {
  return `/clientes/${slug}${pestana ? `/${pestana}` : ""}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function clienteDelFormulario(formData: FormData): Promise<Tenant> {
  await masterVerificado();
  const slug = String(formData.get("slug") ?? "");
  const tenant = esSlugValido(slug) ? await getTenantPorSlug(slug) : null;
  if (!tenant) ir("/", { error: "cliente" });
  return tenant;
}

/** Los cambios de datos, estado, módulos y marca se ven en el sitio público. */
function sitioCambio(): void {
  revalidatePath("/sitio/[tenant]", "layout");
}

export async function altaCliente(formData: FormData) {
  await masterVerificado();
  const alta = parsearAlta(formData);
  if (!alta.ok) ir("/nuevo", { error: alta.error });
  const creado = await crearCliente(alta.valor);
  if (!creado.ok) ir("/nuevo", { error: creado.error });
  ir(rutaCliente(alta.valor.slug), { ok: "creado" });
}

export async function editarDatos(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug);
  const datos = parsearDatos(formData);
  if (!datos.ok) ir(volver, { error: datos.error });
  await actualizarDatos(tenant.id, datos.valor);
  sitioCambio();
  ir(volver, { ok: "guardado" });
}

export async function cambiarEstado(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug);
  const estado = formData.get("estado");
  if (estado !== "activo" && estado !== "suspendido") ir(volver, { error: "error" });
  await actualizarEstado(tenant.id, estado);
  sitioCambio();
  ir(volver, { ok: estado === "activo" ? "reactivado" : "suspendido" });
}

export async function editarModulos(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  await actualizarModulos(tenant.id, parsearModulos(formData));
  sitioCambio();
  ir(rutaCliente(tenant.slug, "modulos"), { ok: "guardado" });
}

export async function editarColores(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "marca");
  const colores = parsearColores(formData);
  if (!colores.ok) ir(volver, { error: colores.error });
  await actualizarColores(tenant.id, colores.valor.colores);
  sitioCambio();
  ir(volver, { ok: "guardado", aviso: colores.valor.avisos[0] });
}

export async function subirImagenMarca(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "marca");
  const tipo = String(formData.get("tipo") ?? "");
  if (!esTipoImagen(tipo)) ir(volver, { error: "imagen_destino" });
  const archivo = formData.get("archivo");
  if (!(archivo instanceof Blob)) ir(volver, { error: "imagen_vacia" });
  // El tamaño se mira antes de leer el contenido.
  const problemaTamano = validarTamano(archivo.size);
  if (problemaTamano) ir(volver, { error: problemaTamano });
  const bytes = Buffer.from(await archivo.arrayBuffer());
  const imagen = validarImagen(bytes);
  if (!imagen.ok) ir(volver, { error: imagen.error });
  await guardarImagen(tenant, tipo, bytes, imagen.formato);
  sitioCambio();
  ir(volver, { ok: "imagen_guardada" });
}

export async function editarTextos(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "textos");
  const textos = parsearTextos(formData, tenant.pais);
  if (!textos.ok) ir(volver, { error: textos.error });
  await actualizarTextos(tenant.id, textos.valor);
  sitioCambio();
  ir(volver, { ok: "guardado" });
}

export async function invitarUsuario(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "usuario");
  const email = normalizarEmail(String(formData.get("email") ?? ""));
  if (!email) ir(volver, { error: "email" });
  const resultado = await invitarUsuarioCliente(tenant, email);
  ir(volver, resultado === "ok" ? { ok: "usuario_creado" } : { error: resultado });
}

function userIdDelFormulario(formData: FormData): string | null {
  const userId = String(formData.get("user_id") ?? "");
  return UUID.test(userId) ? userId : null;
}

export async function reenviarLinkUsuario(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "usuario");
  const userId = userIdDelFormulario(formData);
  if (!userId) ir(volver, { error: "usuario_no_encontrado" });
  const resultado = await reenviarLinkContrasena(tenant, userId);
  ir(volver, resultado === "ok" ? { ok: "link_reenviado" } : { error: resultado });
}

export async function revocarDispositivosUsuario(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "usuario");
  const userId = userIdDelFormulario(formData);
  if (!userId) ir(volver, { error: "usuario_no_encontrado" });
  const resultado = await revocarDispositivosDeUsuario(tenant.id, userId);
  ir(volver, resultado === "ok" ? { ok: "dispositivos_revocados" } : { error: resultado });
}

export async function configurarGmail(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "credenciales");
  if (!claveCredencialesConfigurada()) ir(volver, { error: "clave_credenciales" });
  const form = parsearGmail(formData);
  if (!form.ok) ir(volver, { error: form.error });
  const resultado = await probarYGuardarGmail(tenant.id, form.valor);
  ir(volver, resultado.ok ? { ok: "gmail_ok" } : { error: resultado.error });
}

export async function configurarMercadoPago(formData: FormData) {
  const tenant = await clienteDelFormulario(formData);
  const volver = rutaCliente(tenant.slug, "credenciales");
  if (!claveCredencialesConfigurada()) ir(volver, { error: "clave_credenciales" });
  const form = parsearMp(formData);
  if (!form.ok) ir(volver, { error: form.error });
  const resultado = await guardarMercadoPago(tenant.id, form.valor);
  ir(volver, resultado === "ok" ? { ok: "mp_guardado" } : { error: resultado });
}
```

- [ ] **Step 2: Tipos y lint**

```bash
npx tsc --noEmit
npx eslint src/lib/master
```

Expected: sin errores. Si TypeScript no estrecha un valor después de `ir(...)` (por ejemplo `alta.valor`), revisar que `ir` siga declarada como `function ir(...): never` (una función flecha no estrecha).

- [ ] **Step 3: Commit**

```bash
git add src/lib/master/acciones.ts
git commit -F - <<'EOF'
feat(master): server actions de alta, edición, usuario y credenciales

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 13: Lista de clientes y alta

**Files:**
- Create: `src/components/master/ui.tsx`, `src/components/master/CamposPais.tsx`, `src/components/master/CasillasModulos.tsx`, `src/app/master/nuevo/page.tsx`
- Rewrite: `src/app/master/page.tsx`
- Modify: `src/lib/auth/master.ts`, `src/app/master/layout.tsx`

- [ ] **Step 1: `src/lib/auth/master.ts`**

Reemplazar desde `export type TenantListado` hasta el final del archivo (queda sin uso: la lista nueva sale de `listarClientes`):

```ts
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

por:

```ts
/** Para páginas y layouts del master: sin acceso, el layout ya muestra el aviso (no se lanza). */
export async function esMasterVerificado(): Promise<boolean> {
  return masterVerificado().then(
    () => true,
    () => false,
  );
}
```

Y borrar la línea `import { createAdminClient } from "@/lib/supabase/admin";` (queda sin uso).

- [ ] **Step 2: Crear `src/components/master/ui.tsx`**

```tsx
import { mensajeAviso, mensajeError, mensajeInfo } from "@/lib/master/mensajes";

/** Piezas comunes del panel master (español, paleta de la plataforma). */
export const ETIQUETA = "font-sans text-sm text-texto-suave";
export const CAMPO =
  "mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario";
export const BOTON =
  "rounded-full bg-primario px-6 py-2.5 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60";
export const BOTON_SECUNDARIO =
  "rounded-full border border-primario px-5 py-2 font-sans text-sm text-primario transition hover:bg-primario hover:text-fondo disabled:opacity-60";
export const TARJETA = "rounded-2xl border border-primario/15 bg-white/60 p-6";
export const AYUDA = "mt-1 font-sans text-xs text-texto-suave";
export const ENLACE = "font-sans text-sm text-primario hover:text-primario-oscuro";

/** Query de las pantallas del master: claves de mensajes.ts, nunca textos. */
export type ParamsMaster = { error?: string; ok?: string; aviso?: string };

export function Mensajes({ params }: { params: ParamsMaster }) {
  const error = mensajeError(params.error);
  const info = mensajeInfo(params.ok);
  const aviso = mensajeAviso(params.aviso);
  return (
    <>
      {error && (
        <p role="alert" className="mb-6 rounded-lg bg-primario/10 px-4 py-3 font-sans text-sm text-primario-oscuro">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="mb-6 rounded-lg bg-secundario/10 px-4 py-3 font-sans text-sm text-secundario-oscuro">
          {info}
        </p>
      )}
      {aviso && (
        <p role="status" className="mb-6 rounded-lg bg-fondo-oscuro px-4 py-3 font-sans text-sm text-texto">
          {aviso}
        </p>
      )}
    </>
  );
}
```

- [ ] **Step 3: Crear `src/components/master/CamposPais.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Idioma } from "@/lib/i18n/textos";
import { IDIOMAS, MONEDAS, NOMBRE_IDIOMA, NOMBRE_PAIS, PAISES, VALORES_POR_PAIS, ZONAS_HORARIAS } from "@/lib/master/pais";
import type { Moneda, Pais } from "@/lib/tenant/tipos";
import { CAMPO, ETIQUETA } from "./ui";

export type ValoresCamposPais = { pais: Pais; idioma: Idioma; zonaHoraria: string; moneda: Moneda };

/** País, idioma, zona horaria y moneda. Al cambiar el país se proponen sus valores (editables). */
export function CamposPais({ inicial }: { inicial: ValoresCamposPais }) {
  const [valores, setValores] = useState(inicial);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={ETIQUETA}>
        País
        <select
          name="pais"
          value={valores.pais}
          onChange={(e) => {
            const pais = e.target.value as Pais;
            setValores({ pais, ...VALORES_POR_PAIS[pais] });
          }}
          className={CAMPO}
        >
          {PAISES.map((p) => (
            <option key={p} value={p}>
              {NOMBRE_PAIS[p]}
            </option>
          ))}
        </select>
      </label>
      <label className={ETIQUETA}>
        Idioma del sitio
        <select
          name="idioma"
          value={valores.idioma}
          onChange={(e) => setValores({ ...valores, idioma: e.target.value as Idioma })}
          className={CAMPO}
        >
          {IDIOMAS.map((i) => (
            <option key={i} value={i}>
              {NOMBRE_IDIOMA[i]}
            </option>
          ))}
        </select>
      </label>
      <label className={ETIQUETA}>
        Zona horaria
        <select
          name="zona_horaria"
          value={valores.zonaHoraria}
          onChange={(e) => setValores({ ...valores, zonaHoraria: e.target.value })}
          className={CAMPO}
        >
          {ZONAS_HORARIAS[valores.pais].map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>
      <label className={ETIQUETA}>
        Moneda
        <select
          name="moneda"
          value={valores.moneda}
          onChange={(e) => setValores({ ...valores, moneda: e.target.value as Moneda })}
          className={CAMPO}
        >
          {MONEDAS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Crear `src/components/master/CasillasModulos.tsx`**

```tsx
import { MODULOS } from "@/lib/master/modulos";
import type { Modulos } from "@/lib/tenant/tipos";
import { ETIQUETA } from "./ui";

/** Casillas de módulos (name = columna de tenants). */
export function CasillasModulos({ valores }: { valores: Modulos }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={ETIQUETA}>Módulos</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {MODULOS.map((m) => (
          <label key={m.columna} className="flex items-center gap-2 font-sans text-sm text-texto">
            <input type="checkbox" name={m.columna} defaultChecked={valores[m.clave]} className="h-4 w-4 accent-primario" />
            {m.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 5: Reescribir `src/app/master/page.tsx`**

```tsx
import Link from "next/link";
import { BOTON, ENLACE } from "@/components/master/ui";
import { esMasterVerificado } from "@/lib/auth/master";
import { TEXTO_ALERTA } from "@/lib/master/alertas";
import { MODULOS } from "@/lib/master/modulos";
import { listarClientes } from "@/lib/master/servicio";
import { urlDelTenant } from "@/lib/tenant/urls";

export default async function MasterInicio() {
  // Sin acceso, el layout ya muestra "Esta cuenta no tiene acceso": la página no lanza.
  if (!(await esMasterVerificado())) return null;
  const clientes = await listarClientes();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-texto">Panel master</h1>
          <p className="mt-2 font-sans text-texto-suave">Clientes de la plataforma.</p>
        </div>
        <Link href="/nuevo" className={BOTON}>
          Nuevo cliente
        </Link>
      </div>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-primario/15 bg-white/60">
        <table className="w-full font-sans text-sm">
          <thead>
            <tr className="border-b border-primario/15 text-left text-texto-suave">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Subdominio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Módulos</th>
              <th className="px-4 py-3 font-medium">Alertas</th>
              <th className="px-4 py-3 font-medium">Sitio</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-primario/10 align-top last:border-0">
                <td className="px-4 py-3 text-texto">{c.nombre}</td>
                <td className="px-4 py-3">
                  <Link href={`/clientes/${c.slug}`} className="text-primario hover:text-primario-oscuro">
                    {c.slug}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={c.estado === "activo" ? "text-secundario-oscuro" : "text-primario-oscuro"}>
                    {c.estado === "activo" ? "Activo" : "Suspendido"}
                  </span>
                </td>
                <td className="px-4 py-3 text-texto-suave">
                  {MODULOS.filter((m) => c.modulos[m.clave])
                    .map((m) => m.etiqueta)
                    .join(", ") || "Ninguno"}
                </td>
                <td className="px-4 py-3">
                  {c.alertas.length === 0 ? (
                    <span className="text-texto-suave">—</span>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {c.alertas.map((a) => (
                        <li key={a} className="font-medium text-primario-oscuro">
                          {TEXTO_ALERTA[a]}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-3">
                  <a href={urlDelTenant(c.slug)} target="_blank" rel="noopener noreferrer" className={ENLACE}>
                    Ver sitio ↗
                  </a>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-texto-suave">
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

- [ ] **Step 6: Crear `src/app/master/nuevo/page.tsx`**

```tsx
import Link from "next/link";
import { CamposPais } from "@/components/master/CamposPais";
import { CasillasModulos } from "@/components/master/CasillasModulos";
import { AYUDA, BOTON, CAMPO, ENLACE, ETIQUETA, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { altaCliente } from "@/lib/master/acciones";
import { LIMITES } from "@/lib/master/limites";
import { MODULOS_POR_DEFECTO } from "@/lib/master/modulos";
import { VALORES_POR_PAIS } from "@/lib/master/pais";

export const metadata = { title: "Nuevo cliente · Panel master" };

export default async function NuevoCliente({ searchParams }: { searchParams: Promise<ParamsMaster> }) {
  if (!(await esMasterVerificado())) return null;
  const params = await searchParams;
  return (
    <div className="max-w-2xl">
      <Link href="/" className={ENLACE}>
        ← Clientes
      </Link>
      <h1 className="mt-3 font-serif text-4xl text-texto">Nuevo cliente</h1>
      <p className="mt-2 mb-6 font-sans text-texto-suave">
        El sitio queda en línea al crearlo, con la paleta de la plataforma. Después cargás la marca, los textos y el usuario.
      </p>
      <Mensajes params={params} />
      <form id="form-alta-cliente" action={altaCliente} className={`${TARJETA} flex flex-col gap-5`}>
        <FormPendingOverlay label="Creando…" />
        <label className={ETIQUETA}>
          Nombre comercial
          <input name="nombre" required minLength={2} maxLength={LIMITES.nombre} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Subdominio
          <input
            name="slug"
            required
            minLength={3}
            maxLength={40}
            pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]"
            autoCapitalize="none"
            spellCheck={false}
            className={CAMPO}
          />
          <span className={AYUDA}>Minúsculas, números y guiones. No se puede cambiar después.</span>
        </label>
        <CamposPais inicial={{ pais: "AR", ...VALORES_POR_PAIS.AR }} />
        <CasillasModulos valores={MODULOS_POR_DEFECTO} />
        <div>
          <SubmitButton className={BOTON}>Crear cliente</SubmitButton>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Menú del layout master**

En `src/app/master/layout.tsx`, agregar `import Link from "next/link";` como primera línea y reemplazar:

```tsx
          <span className="font-serif text-xl text-texto">Panel master</span>
```

por:

```tsx
          <nav className="flex items-center gap-6">
            <Link href="/" className="font-serif text-xl text-texto">
              Panel master
            </Link>
            <Link href="/nuevo" className="font-sans text-sm text-texto-suave hover:text-primario">
              Nuevo cliente
            </Link>
          </nav>
```

- [ ] **Step 8: Tipos, lint, tests y build**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
npm run build
```

Expected: sin errores, todos los tests en PASS y el build sin errores. `grep -rn "listarTenants" src` no devuelve nada.

- [ ] **Step 9: Commit**

```bash
git add src/lib/auth/master.ts src/components/master/ui.tsx src/components/master/CamposPais.tsx src/components/master/CasillasModulos.tsx src/app/master/page.tsx src/app/master/nuevo/page.tsx src/app/master/layout.tsx
git commit -F - <<'EOF'
feat(master): lista de clientes con módulos y alertas, y alta de clientes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 14: Edición por pestañas: Datos, Marca, Textos y Módulos

**Files:**
- Create: `src/components/master/PestanasCliente.tsx`, `src/components/master/EditorColores.tsx`
- Create: `src/app/master/clientes/[slug]/layout.tsx`, `src/app/master/clientes/[slug]/page.tsx`, `src/app/master/clientes/[slug]/marca/page.tsx`, `src/app/master/clientes/[slug]/textos/page.tsx`, `src/app/master/clientes/[slug]/modulos/page.tsx`

- [ ] **Step 1: Crear `src/components/master/PestanasCliente.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

const PESTANAS = [
  { segmento: null, etiqueta: "Datos" },
  { segmento: "marca", etiqueta: "Marca" },
  { segmento: "textos", etiqueta: "Textos y contacto" },
  { segmento: "modulos", etiqueta: "Módulos" },
  { segmento: "usuario", etiqueta: "Usuario" },
  { segmento: "credenciales", etiqueta: "Credenciales" },
] as const;

/** Pestañas de la edición de un cliente. La activa sale del segmento (null = Datos). */
export function PestanasCliente({ slug }: { slug: string }) {
  const activo = useSelectedLayoutSegment();
  return (
    <nav className="mt-6 flex flex-wrap gap-1 border-b border-primario/15 font-sans text-sm">
      {PESTANAS.map((p) => {
        const href = `/clientes/${slug}${p.segmento ? `/${p.segmento}` : ""}`;
        const seleccionada = activo === p.segmento;
        return (
          <Link
            key={href}
            href={href}
            aria-current={seleccionada ? "page" : undefined}
            className={
              seleccionada
                ? "-mb-px border-b-2 border-primario px-4 py-2 font-medium text-texto"
                : "px-4 py-2 text-texto-suave hover:text-primario"
            }
          >
            {p.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Crear `src/app/master/clientes/[slug]/layout.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { PestanasCliente } from "@/components/master/PestanasCliente";
import { ENLACE } from "@/components/master/ui";
import { esMasterVerificado } from "@/lib/auth/master";
import { clientePorSlug } from "@/lib/master/servicio";
import { urlDelTenant } from "@/lib/tenant/urls";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export default async function ClienteLayout({ children, params }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  const activo = tenant.estado === "activo";
  return (
    <div>
      <Link href="/" className={ENLACE}>
        ← Clientes
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-4xl text-texto">{tenant.nombre}</h1>
        <div className="flex items-center gap-4 font-sans text-sm">
          <span className={activo ? "text-secundario-oscuro" : "font-medium text-primario-oscuro"}>
            {activo ? "Activo" : "Suspendido"}
          </span>
          <a href={urlDelTenant(tenant.slug)} target="_blank" rel="noopener noreferrer" className={ENLACE}>
            Ver sitio ↗
          </a>
        </div>
      </div>
      <PestanasCliente slug={tenant.slug} />
      <div className="mt-8">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Crear `src/app/master/clientes/[slug]/page.tsx` (Datos y estado)**

```tsx
import { notFound } from "next/navigation";
import { CamposPais } from "@/components/master/CamposPais";
import { BOTON, BOTON_SECUNDARIO, CAMPO, ETIQUETA, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { cambiarEstado, editarDatos } from "@/lib/master/acciones";
import { LIMITES } from "@/lib/master/limites";
import { clientePorSlug } from "@/lib/master/servicio";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

export default async function DatosCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  const activo = tenant.estado === "activo";
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <Mensajes params={await searchParams} />
        <form id="form-datos" action={editarDatos} className={`${TARJETA} flex flex-col gap-5`}>
          <FormPendingOverlay />
          <input type="hidden" name="slug" value={tenant.slug} />
          <label className={ETIQUETA}>
            Nombre comercial
            <input name="nombre" required minLength={2} maxLength={LIMITES.nombre} defaultValue={tenant.nombre} className={CAMPO} />
          </label>
          <p className="font-sans text-sm text-texto-suave">
            Subdominio: <strong className="text-texto">{tenant.slug}</strong> (no se cambia después del alta).
          </p>
          <CamposPais
            inicial={{ pais: tenant.pais, idioma: tenant.idioma, zonaHoraria: tenant.zonaHoraria, moneda: tenant.moneda }}
          />
          <div>
            <SubmitButton className={BOTON}>Guardar</SubmitButton>
          </div>
        </form>
      </div>
      <section className={TARJETA}>
        <h2 className="font-serif text-2xl text-texto">Estado</h2>
        <p className="mt-2 font-sans text-sm text-texto-suave">
          {activo
            ? "El sitio y el panel del cliente están en línea."
            : "Suspendido: el sitio muestra que no está disponible y el panel del cliente queda bloqueado."}
        </p>
        <form id="form-estado" action={cambiarEstado} className="mt-4">
          <input type="hidden" name="slug" value={tenant.slug} />
          <input type="hidden" name="estado" value={activo ? "suspendido" : "activo"} />
          <SubmitButton className={activo ? BOTON_SECUNDARIO : BOTON}>
            {activo ? "Suspender cliente" : "Reactivar cliente"}
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Crear `src/components/master/EditorColores.tsx`**

```tsx
"use client";

import { useState } from "react";
import { editarColores } from "@/lib/master/acciones";
import { mensajeAviso, mensajeError } from "@/lib/master/mensajes";
import { evaluarPaleta, normalizarHex } from "@/lib/tenant/contraste";
import { estiloMarca, type ColoresMarca } from "@/lib/tenant/estilo";
import { BOTON, CAMPO, ETIQUETA, TARJETA } from "./ui";

const CAMPOS: { clave: keyof ColoresMarca; nombre: string; etiqueta: string }[] = [
  { clave: "colorPrimario", nombre: "color_primario", etiqueta: "Primario (botones y destacados)" },
  { clave: "colorSecundario", nombre: "color_secundario", etiqueta: "Secundario (detalles)" },
  { clave: "colorFondo", nombre: "color_fondo", etiqueta: "Fondo (y texto de los botones)" },
  { clave: "colorTexto", nombre: "color_texto", etiqueta: "Texto" },
];

const formatoRatio = (n: number) => n.toFixed(2).replace(".", ",");

/**
 * Los 4 colores de la marca con vista previa y contraste en vivo. Es una ayuda: la action
 * vuelve a validar todo en el servidor.
 */
export function EditorColores({ slug, inicial }: { slug: string; inicial: ColoresMarca }) {
  const [colores, setColores] = useState(inicial);
  const validos = CAMPOS.every((c) => normalizarHex(colores[c.clave]) !== null);
  const problemas = validos ? evaluarPaleta(colores) : [];
  const bloquea = !validos || problemas.some((p) => p.bloquea);

  return (
    <form id="form-colores" action={editarColores} className={`${TARJETA} flex flex-col gap-5`}>
      <input type="hidden" name="slug" value={slug} />
      <h2 className="font-serif text-2xl text-texto">Colores</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map((c) => (
          <label key={c.clave} className={ETIQUETA}>
            {c.etiqueta}
            <span className="mt-1 flex items-center gap-2">
              <input
                type="color"
                aria-label={`${c.etiqueta} (selector)`}
                value={normalizarHex(colores[c.clave]) ?? "#000000"}
                onChange={(e) => setColores({ ...colores, [c.clave]: e.target.value })}
                className="h-10 w-12 shrink-0 cursor-pointer rounded border border-primario/20 bg-fondo"
              />
              <input
                name={c.nombre}
                value={colores[c.clave]}
                onChange={(e) => setColores({ ...colores, [c.clave]: e.target.value })}
                required
                maxLength={7}
                spellCheck={false}
                className={`${CAMPO} mt-0 font-mono`}
              />
            </span>
          </label>
        ))}
      </div>

      <div style={estiloMarca(colores)} className="rounded-2xl border border-primario/15 bg-fondo p-6">
        <p className="font-sans text-xs uppercase tracking-widest text-secundario">Vista previa</p>
        <p className="mt-2 font-serif text-3xl text-texto">
          Tu momento de <span className="text-primario">bienestar</span>
        </p>
        <p className="mt-2 font-sans text-sm text-texto-suave">Así se ve el texto del sitio sobre el fondo.</p>
        <span className="mt-4 inline-block rounded-full bg-primario px-6 py-2.5 font-sans text-sm font-medium text-fondo">
          Reservar turno
        </span>
      </div>

      {!validos && (
        <p role="alert" className="font-sans text-sm text-primario-oscuro">
          {mensajeError("color_invalido")}
        </p>
      )}
      {problemas.map((p) => (
        <p key={p.clave} role={p.bloquea ? "alert" : "status"} className="font-sans text-sm text-primario-oscuro">
          {p.bloquea ? mensajeError(p.clave) : mensajeAviso(p.clave)} (contraste {formatoRatio(p.ratio)}:1, mínimo{" "}
          {formatoRatio(p.minimo)}:1)
        </p>
      ))}

      <div>
        <button type="submit" disabled={bloquea} className={BOTON}>
          Guardar colores
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Crear `src/app/master/clientes/[slug]/marca/page.tsx`**

```tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import { EditorColores } from "@/components/master/EditorColores";
import { AYUDA, BOTON_SECUNDARIO, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { subirImagenMarca } from "@/lib/master/acciones";
import { clientePorSlug } from "@/lib/master/servicio";
import { CAMPO_MARCA_IMAGEN, type TipoImagen } from "@/lib/storage/imagenes";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

const IMAGENES: { tipo: TipoImagen; titulo: string; ayuda: string; oscuro: boolean; ancho: number; alto: number }[] = [
  { tipo: "logo", titulo: "Logo", ayuda: "Menú del sitio y emails.", oscuro: false, ancho: 1080, alto: 489 },
  { tipo: "logo_claro", titulo: "Logo claro", ayuda: "Versión para fondos oscuros (pie del sitio).", oscuro: true, ancho: 1080, alto: 489 },
  { tipo: "foto_perfil", titulo: "Foto de perfil", ayuda: "Sección Sobre mí.", oscuro: false, ancho: 800, alto: 1000 },
];

export default async function MarcaCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  const m = tenant.marca;
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Mensajes params={await searchParams} />
        <EditorColores
          slug={tenant.slug}
          inicial={{
            colorPrimario: m.colorPrimario,
            colorSecundario: m.colorSecundario,
            colorFondo: m.colorFondo,
            colorTexto: m.colorTexto,
          }}
        />
      </div>
      {IMAGENES.map((img) => {
        const actual = m[CAMPO_MARCA_IMAGEN[img.tipo]];
        return (
          <section key={img.tipo} className={TARJETA}>
            <h2 className="font-serif text-2xl text-texto">{img.titulo}</h2>
            <p className={AYUDA}>{img.ayuda} PNG, JPG o WebP, hasta 2 MB.</p>
            <div
              className={`mt-4 flex h-32 items-center justify-center rounded-xl ${img.oscuro ? "bg-texto" : "bg-fondo"}`}
            >
              {actual ? (
                <Image src={actual} alt={img.titulo} width={img.ancho} height={img.alto} className="h-28 w-auto object-contain" />
              ) : (
                <span className={`font-sans text-sm ${img.oscuro ? "text-fondo" : "text-texto-suave"}`}>Sin imagen</span>
              )}
            </div>
            <form id={`form-imagen-${img.tipo}`} action={subirImagenMarca} className="mt-4 flex flex-wrap items-center gap-3">
              <FormPendingOverlay label="Subiendo…" />
              <input type="hidden" name="slug" value={tenant.slug} />
              <input type="hidden" name="tipo" value={img.tipo} />
              <input
                type="file"
                name="archivo"
                required
                accept="image/png,image/jpeg,image/webp"
                className="font-sans text-sm text-texto-suave"
              />
              <SubmitButton className={BOTON_SECUNDARIO}>Subir</SubmitButton>
            </form>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Crear `src/app/master/clientes/[slug]/textos/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { AYUDA, BOTON, CAMPO, ETIQUETA, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { editarTextos } from "@/lib/master/acciones";
import { LIMITES } from "@/lib/master/limites";
import { NOMBRE_PAIS } from "@/lib/master/pais";
import { clientePorSlug } from "@/lib/master/servicio";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

function Campo(props: {
  nombre: string;
  etiqueta: string;
  valor: string | null;
  max: number;
  ayuda?: string;
  requerido?: boolean;
  tipo?: "text" | "email";
  placeholder?: string;
}) {
  return (
    <label className={ETIQUETA}>
      {props.etiqueta}
      <input
        name={props.nombre}
        type={props.tipo ?? "text"}
        defaultValue={props.valor ?? ""}
        maxLength={props.max}
        required={props.requerido}
        placeholder={props.placeholder}
        className={CAMPO}
      />
      {props.ayuda && <span className={AYUDA}>{props.ayuda}</span>}
    </label>
  );
}

function Area(props: { nombre: string; etiqueta: string; valor: string | null; max: number; filas?: number }) {
  return (
    <label className={ETIQUETA}>
      {props.etiqueta}
      <textarea
        name={props.nombre}
        defaultValue={props.valor ?? ""}
        maxLength={props.max}
        rows={props.filas ?? 4}
        className={CAMPO}
      />
    </label>
  );
}

export default async function TextosCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  const m = tenant.marca;
  const ejemploWhatsapp = tenant.pais === "BR" ? "(11) 91234-5678" : "11 2345 6789";
  return (
    <div className="max-w-2xl">
      <Mensajes params={await searchParams} />
      <form id="form-textos" action={editarTextos} className={`${TARJETA} flex flex-col gap-5`}>
        <FormPendingOverlay />
        <input type="hidden" name="slug" value={tenant.slug} />
        <p className={AYUDA}>Los textos van en el idioma del sitio del cliente.</p>
        <Campo nombre="rubro" etiqueta="Rubro" valor={m.rubro} max={LIMITES.rubro} ayuda="Ej.: Estética y Salud. Va en el título de la pestaña." />
        <Campo nombre="tagline" etiqueta="Frase de la marca" valor={m.tagline} max={LIMITES.tagline} ayuda="Pie del sitio y descripción para buscadores." />
        <Campo nombre="inicio_titulo" etiqueta="Inicio: título" valor={m.inicioTitulo} max={LIMITES.titulo} requerido />
        <Campo nombre="inicio_destacado" etiqueta="Inicio: parte destacada del título" valor={m.inicioDestacado} max={LIMITES.titulo} ayuda="Se muestra con el color primario." />
        <Area nombre="inicio_texto" etiqueta="Inicio: texto" valor={m.inicioTexto} max={LIMITES.texto} />
        <Campo nombre="sobre_mi_titulo" etiqueta="Sobre mí: título" valor={m.sobreMiTitulo} max={LIMITES.titulo} />
        <Area nombre="sobre_mi_texto" etiqueta="Sobre mí: texto" valor={m.sobreMiTexto} max={LIMITES.texto} filas={8} />
        <Area nombre="nota_reservas" etiqueta="Nota en las reservas" valor={m.notaReservas} max={LIMITES.nota} filas={3} />
        <Campo
          nombre="whatsapp"
          etiqueta="WhatsApp"
          valor={m.whatsapp}
          max={30}
          placeholder={ejemploWhatsapp}
          ayuda={`Celular de ${NOMBRE_PAIS[tenant.pais]}. Se guarda en formato internacional.`}
        />
        <Campo nombre="instagram" etiqueta="Instagram" valor={m.instagram} max={100} placeholder="usuario" ayuda="Usuario o link del perfil." />
        <Campo nombre="email_contacto" etiqueta="Email de contacto" valor={m.emailContacto} max={254} tipo="email" />
        <Campo nombre="direccion" etiqueta="Dirección" valor={m.direccion} max={LIMITES.direccion} />
        <div>
          <SubmitButton className={BOTON}>Guardar</SubmitButton>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Crear `src/app/master/clientes/[slug]/modulos/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { CasillasModulos } from "@/components/master/CasillasModulos";
import { AYUDA, BOTON, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { editarModulos } from "@/lib/master/acciones";
import { clientePorSlug } from "@/lib/master/servicio";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

export default async function ModulosCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  return (
    <div className="max-w-2xl">
      <Mensajes params={await searchParams} />
      <form id="form-modulos" action={editarModulos} className={`${TARJETA} flex flex-col gap-5`}>
        <FormPendingOverlay />
        <input type="hidden" name="slug" value={tenant.slug} />
        <CasillasModulos valores={tenant.modulos} />
        <p className={AYUDA}>Un módulo apagado no aparece en el sitio del cliente.</p>
        <div>
          <SubmitButton className={BOTON}>Guardar</SubmitButton>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 8: Tipos, lint y build**

```bash
npx tsc --noEmit
npx eslint src
npm run build
```

Expected: sin errores y el build sin errores (las rutas `/master/clientes/[slug]` y sus pestañas aparecen como dinámicas).

- [ ] **Step 9: Commit**

```bash
git add src/components/master/PestanasCliente.tsx src/components/master/EditorColores.tsx "src/app/master/clientes/[slug]/layout.tsx" "src/app/master/clientes/[slug]/page.tsx" "src/app/master/clientes/[slug]/marca/page.tsx" "src/app/master/clientes/[slug]/textos/page.tsx" "src/app/master/clientes/[slug]/modulos/page.tsx"
git commit -F - <<'EOF'
feat(master): edición del cliente por pestañas (datos, marca, textos, módulos)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 15: Pestañas Usuario y Credenciales

**Files:**
- Create: `src/app/master/clientes/[slug]/usuario/page.tsx`, `src/app/master/clientes/[slug]/credenciales/page.tsx`

- [ ] **Step 1: Crear `src/app/master/clientes/[slug]/usuario/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { AYUDA, BOTON, BOTON_SECUNDARIO, CAMPO, ETIQUETA, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { invitarUsuario, reenviarLinkUsuario, revocarDispositivosUsuario } from "@/lib/master/acciones";
import { clientePorSlug } from "@/lib/master/servicio";
import { MAX_USUARIOS_POR_CLIENTE, usuariosDelCliente } from "@/lib/master/usuarios";
import { urlDelTenant } from "@/lib/tenant/urls";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });

export default async function UsuarioCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  const usuarios = await usuariosDelCliente(tenant.id);
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Mensajes params={await searchParams} />
        <p className="font-sans text-sm text-texto-suave">
          El usuario del cliente entra a {urlDelTenant(tenant.slug)}/admin. Vos nunca ves ni definís su contraseña: le
          llega un link para elegirla.
        </p>
      </div>

      {usuarios.map((u) => (
        <section key={u.userId} className={TARJETA}>
          <p className="font-sans font-medium text-texto">{u.email ?? "(sin email)"}</p>
          <p className={AYUDA}>{u.ultimoIngreso ? `Último ingreso: ${fecha(u.ultimoIngreso)}` : "Todavía no ingresó."}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form id={`form-reenviar-link-${u.userId}`} action={reenviarLinkUsuario}>
              <input type="hidden" name="slug" value={tenant.slug} />
              <input type="hidden" name="user_id" value={u.userId} />
              <SubmitButton className={BOTON_SECUNDARIO}>Reenviar link de contraseña</SubmitButton>
            </form>
            <form id={`form-revocar-${u.userId}`} action={revocarDispositivosUsuario}>
              <input type="hidden" name="slug" value={tenant.slug} />
              <input type="hidden" name="user_id" value={u.userId} />
              <SubmitButton className={BOTON_SECUNDARIO}>Revocar dispositivos recordados</SubmitButton>
            </form>
          </div>
        </section>
      ))}

      {usuarios.length < MAX_USUARIOS_POR_CLIENTE && (
        <form id="form-usuario-cliente" action={invitarUsuario} className={`${TARJETA} flex flex-col gap-4`}>
          <FormPendingOverlay label="Creando…" />
          <input type="hidden" name="slug" value={tenant.slug} />
          <h2 className="font-serif text-2xl text-texto">Usuario del cliente</h2>
          <label className={ETIQUETA}>
            Email
            <input name="email" type="email" required autoComplete="off" className={CAMPO} />
          </label>
          <p className={AYUDA}>Le enviamos un email con la marca del cliente y un link para definir su contraseña (vence en 1 hora).</p>
          <div>
            <SubmitButton className={BOTON}>Crear usuario y enviar link</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/app/master/clientes/[slug]/credenciales/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { AYUDA, BOTON, CAMPO, ETIQUETA, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { claveCredencialesConfigurada } from "@/lib/cripto/clave";
import { configurarGmail, configurarMercadoPago } from "@/lib/master/acciones";
import { estadoCredenciales } from "@/lib/master/credenciales";
import { LIMITES } from "@/lib/master/limites";
import { clientePorSlug } from "@/lib/master/servicio";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

const ESTADO_GMAIL = { ok: "conexión verificada ✓", error: "con error", sin_configurar: "sin configurar" } as const;
const MANTENER = "configurado ✓ (vacío = mantener)";

export default async function CredencialesCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  // Solo estados y valores no secretos: los secretos nunca llegan a la página.
  const { gmail, mp } = await estadoCredenciales(tenant.id);
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <Mensajes params={await searchParams} />
        {!claveCredencialesConfigurada() && (
          <p role="alert" className="rounded-lg bg-primario/10 px-4 py-3 font-sans text-sm text-primario-oscuro">
            Falta CREDENCIALES_KEY en el servidor: no se pueden guardar credenciales.
          </p>
        )}
      </div>

      <form id="form-gmail" action={configurarGmail} className={`${TARJETA} flex flex-col gap-4`}>
        <FormPendingOverlay label="Probando conexión…" />
        <input type="hidden" name="slug" value={tenant.slug} />
        <h2 className="font-serif text-2xl text-texto">Gmail del cliente</h2>
        <p className={AYUDA}>
          Para los emails de turnos y cursos (se usa desde la etapa D). La cuenta necesita verificación en 2 pasos y una
          contraseña de aplicación.
        </p>
        <p className="font-sans text-sm text-texto">
          Estado: <strong>{ESTADO_GMAIL[gmail.estado]}</strong>
          {gmail.ultimoError && <span className="text-primario-oscuro"> — {gmail.ultimoError}</span>}
        </p>
        <label className={ETIQUETA}>
          Cuenta de Gmail
          <input name="smtp_usuario" type="email" required defaultValue={gmail.usuario ?? ""} autoComplete="off" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Contraseña de aplicación
          <input
            name="smtp_password"
            type="password"
            autoComplete="new-password"
            placeholder={gmail.contrasenaConfigurada ? MANTENER : "16 letras"}
            className={CAMPO}
          />
        </label>
        <label className={ETIQUETA}>
          Nombre del remitente
          <input
            name="smtp_nombre_remitente"
            defaultValue={gmail.remitente ?? tenant.nombre}
            maxLength={LIMITES.remitente}
            className={CAMPO}
          />
        </label>
        <p className={AYUDA}>Para probar la configuración guardada, enviá el formulario con la contraseña vacía.</p>
        <div>
          <SubmitButton className={BOTON}>Probar conexión y guardar</SubmitButton>
        </div>
      </form>

      <form id="form-mp" action={configurarMercadoPago} className={`${TARJETA} flex flex-col gap-4`}>
        <FormPendingOverlay />
        <input type="hidden" name="slug" value={tenant.slug} />
        <h2 className="font-serif text-2xl text-texto">Mercado Pago (carga manual)</h2>
        <p className={AYUDA}>
          Origen: {mp.origen ?? "sin configurar"}. El botón Conectar Mercado Pago (OAuth) llega en la etapa D.
        </p>
        <p className="font-sans text-sm text-texto">
          Access token: <strong>{mp.accessTokenConfigurado ? "configurado ✓" : "sin configurar"}</strong>
          {" · "}Secreto del webhook: <strong>{mp.webhookSecretConfigurado ? "configurado ✓" : "sin configurar"}</strong>
        </p>
        <label className={ETIQUETA}>
          Access token
          <input
            name="mp_access_token"
            type="password"
            autoComplete="new-password"
            placeholder={mp.accessTokenConfigurado ? MANTENER : "APP_USR-…"}
            className={CAMPO}
          />
        </label>
        <label className={ETIQUETA}>
          Public key
          <input name="mp_public_key" defaultValue={mp.publicKey ?? ""} placeholder="APP_USR-…" autoComplete="off" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Secreto del webhook
          <input
            name="mp_webhook_secret"
            type="password"
            autoComplete="new-password"
            placeholder={mp.webhookSecretConfigurado ? MANTENER : "de la aplicación del cliente en Mercado Pago"}
            className={CAMPO}
          />
        </label>
        <div>
          <SubmitButton className={BOTON}>Guardar</SubmitButton>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Tipos, lint y build**

```bash
npx tsc --noEmit
npx eslint src
npm run build
```

Expected: sin errores y el build sin errores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/master/clientes/[slug]/usuario/page.tsx" "src/app/master/clientes/[slug]/credenciales/page.tsx"
git commit -F - <<'EOF'
feat(master): pestañas de usuario del cliente y credenciales

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 16: Verificación de punta a punta

**Files:**
- Create: `scripts/e2e-master.mjs`

Necesita la migración 0018 (Task 7), el bucket (Task 8) y `CREDENCIALES_KEY` en el `.env.local` (Task 10).

- [ ] **Step 1: Crear `scripts/e2e-master.mjs`**

```js
// Prueba de punta a punta del panel master (etapa C1) contra el servidor de desarrollo
// (puerto 3000), como un navegador sin JavaScript (ver e2e-login.mjs): GET de la página,
// campo oculto $ACTION_ID_… y POST multipart; Next responde 303 con Location.
// Crea un master temporal, da de alta el cliente "c1-test-<sufijo>", edita sus datos, su
// marca (paleta válida e inválidas), sube imágenes (y rechaza un SVG y un archivo grande),
// carga textos, módulos y credenciales, crea el usuario del cliente, define su contraseña
// con el link del log, entra a su /admin, suspende y reactiva el cliente, y al final borra
// todo (también las imágenes del bucket).
// El servidor tiene que haber arrancado con CREDENCIALES_KEY en el .env.local y sin la
// cuenta de Gmail de la plataforma (los códigos y links salen en el log, "[MFA dev]").
// La prueba de Gmail se conecta de verdad a smtp.gmail.com con datos falsos (falla siempre).
// Uso: node --env-file=.env.local scripts/e2e-master.mjs <log>
import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { request } from "node:http";

const [rutaLog] = process.argv.slice(2);
if (!rutaLog) {
  console.error("Uso: node --env-file=.env.local scripts/e2e-master.mjs <log>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const secretoMfa = process.env.MFA_SECRET;
const claveCredenciales = Buffer.from(process.env.CREDENCIALES_KEY ?? "", "base64url");
if (!url || !secret || !secretoMfa || claveCredenciales.length !== 32) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, MFA_SECRET o CREDENCIALES_KEY (32 bytes).");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const HOST_MASTER = "app.localhost:3000";
const sufijo = Date.now().toString(36);
const slug = `c1-test-${sufijo}`;
const HOST_CLIENTE = `${slug}.localhost:3000`;
const emailMaster = `e2e-c1-master-${sufijo}@example.com`;
const emailCliente = `e2e-c1-cliente-${sufijo}@example.com`;
const emailOtro = `e2e-c1-otro-${sufijo}@example.com`;
const claveMaster = randomBytes(18).toString("base64url");
const claveCliente = randomBytes(18).toString("base64url");
const PREFIJO_PUBLICO = `${url.replace(/\/+$/, "")}/storage/v1/object/public/sitios/`;
/** PNG de 1×1. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

let fallas = 0;
function verificar(ok, descripcion, detalle) {
  console.log(`${ok ? "✓" : "✗"} ${descripcion}`);
  if (!ok) {
    fallas++;
    if (detalle) console.log(`    (${detalle})`);
  }
}

function destino(r) {
  if (!r.location) return "";
  const u = new URL(r.location, "http://base");
  return `${u.pathname}${u.search}`;
}
const resumen = (r) => `${r.status} ${r.location}`;
const parametro = (r, nombre) => new URL(r.location || "/", "http://base").searchParams.get(nombre);

function idDeAccion(html, formId) {
  const inicio = html.indexOf(`id="${formId}"`);
  if (inicio < 0) throw new Error(`la página no tiene el formulario #${formId}`);
  const m = html.slice(inicio, html.indexOf("</form>", inicio)).match(/name="(\$ACTION_ID_[0-9a-zA-Z]+)"/);
  if (!m) throw new Error(`#${formId} no tiene el campo $ACTION_ID_`);
  return m[1];
}

let siguienteIp = 50;
const ipsUsadas = [];
function ipFalsa() {
  const ip = `203.0.113.${siguienteIp++}`;
  ipsUsadas.push(ip);
  return ip;
}

class Navegador {
  constructor(host) {
    this.host = host;
    this.ip = ipFalsa();
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

  pedir(metodo, ruta, cuerpo) {
    return new Promise((resolve, reject) => {
      const headers = { host: this.host, "x-real-ip": this.ip };
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
          this.guardar(res.headers["set-cookie"] ?? []);
          resolve({ status: res.statusCode, location: res.headers.location ?? "", html: Buffer.concat(partes).toString("utf8") });
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

  /** Envía el formulario con ese id como un navegador sin JavaScript. Los valores pueden ser File. */
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
const reInvitacion = (de) => new RegExp(`\\[MFA dev\\] link de invitaci.n para ${escaparRegex(de)}: (\\S+)`, "g");
const ocurrencias = (re) => [...readFileSync(rutaLog, "utf8").matchAll(re)].map((m) => m[1]);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarNueva(re, previas) {
  for (let i = 0; i < 40; i++) {
    const todas = ocurrencias(re);
    if (todas.length > previas) return todas[todas.length - 1];
    await dormir(500);
  }
  throw new Error(`no apareció en el log: ${re}`);
}

// ---------- Cifrado con el mismo formato que src/lib/cripto/credenciales.ts ----------
const aad = (tenantId, columna) => Buffer.from(`v1|${tenantId}|${columna}`, "utf8");

function cifrarComoLaApp(texto, tenantId, columna) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", claveCredenciales, iv);
  c.setAAD(aad(tenantId, columna));
  const cifrado = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), cifrado.toString("base64url")].join(".");
}

function descifrarComoLaApp(valor, tenantId, columna) {
  const [, iv, tag, cifrado] = valor.split(".");
  const d = createDecipheriv("aes-256-gcm", claveCredenciales, Buffer.from(iv, "base64url"));
  d.setAAD(aad(tenantId, columna));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(cifrado, "base64url")), d.final()]).toString("utf8");
}

// ---------- Datos ----------
let tenantId = null;
let masterUserId = null;
const usuariosCreados = [];

const leerTenant = async () => (await admin.from("tenants").select("*").eq("slug", slug).maybeSingle()).data;
const fila = async (tabla) => (await admin.from(tabla).select("*").eq("tenant_id", tenantId).maybeSingle()).data;

async function listarObjetos(id = tenantId) {
  if (!id) return [];
  const { data, error } = await admin.storage.from("sitios").list(id, { limit: 100 });
  if (error) throw new Error(`listar imágenes: ${error.message}`);
  return data.map((o) => o.name);
}

async function crearUsuario(emailUsuario, clave, perfil) {
  const { data, error } = await admin.auth.admin.createUser({ email: emailUsuario, password: clave, email_confirm: true });
  if (error) throw new Error(`usuario de prueba: ${error.message}`);
  usuariosCreados.push(data.user.id);
  const { error: errorPerfil } = await admin.from("perfiles").insert({ user_id: data.user.id, ...perfil });
  if (errorPerfil) throw new Error(`perfil de prueba: ${errorPerfil.message}`);
  return data.user.id;
}

async function prueba() {
  console.log("\nIngreso del master:");
  const M = new Navegador(HOST_MASTER);
  const codigosAntes = ocurrencias(reCodigo(emailMaster)).length;
  let r = await ingresar(M, "", emailMaster, claveMaster);
  verificar(destino(r) === "/verificar?info=codigo_enviado", "master: pide el código", resumen(r));
  const codigo = await esperarNueva(reCodigo(emailMaster), codigosAntes);
  let pagina = await M.get("/verificar");
  r = await M.enviar("/verificar", pagina.html, "form-verificar", { codigo });
  verificar(destino(r) === "/", "master: entra con el código", resumen(r));

  console.log("\nAlta del cliente:");
  pagina = await M.get("/nuevo");
  verificar(pagina.status === 200 && pagina.html.includes('id="form-alta-cliente"'), "la pantalla de alta responde", String(pagina.status));
  const alta = {
    nombre: "Cliente C1 Alta", slug, pais: "BR", idioma: "pt", zona_horaria: "America/Manaus", moneda: "BRL",
    modulo_turnos: "on", modulo_faq: "on",
  };
  const altaCon = (cambios) => M.enviar("/nuevo", pagina.html, "form-alta-cliente", { ...alta, ...cambios });
  r = await altaCon({ slug: "admin" });
  verificar(destino(r) === "/nuevo?error=slug_invalido", "subdominio reservado: rechazado", resumen(r));
  r = await altaCon({ zona_horaria: "America/Argentina/Buenos_Aires" });
  verificar(destino(r) === "/nuevo?error=zona", "zona horaria de otro país: rechazada", resumen(r));
  r = await altaCon({});
  verificar(destino(r) === `/clientes/${slug}?ok=creado`, "alta: crea el cliente", resumen(r));
  const tenant = await leerTenant();
  tenantId = tenant?.id ?? null;
  if (!tenantId) throw new Error("el alta no creó el cliente");
  verificar(
    tenant.pais === "BR" && tenant.zona_horaria === "America/Manaus" && tenant.modulo_faq && !tenant.modulo_cursos && tenant.estado === "activo",
    "alta: país, zona, módulos y estado",
    JSON.stringify(tenant),
  );
  const [marca, config, cred] = await Promise.all([fila("tenant_marca"), fila("configuracion_negocio"), fila("tenant_credenciales")]);
  verificar(marca?.color_primario === "#3d5a80" && marca.inicio_titulo === "Cliente C1 Alta", "alta: marca con la paleta de la plataforma");
  verificar(!!config && Object.keys(config.horario_atencion).length === 0, "alta: configuración con horario vacío");
  verificar(cred?.smtp_estado === "sin_configurar", "alta: fila de credenciales");
  r = await altaCon({});
  verificar(destino(r) === "/nuevo?error=slug_en_uso", "subdominio repetido: rechazado", resumen(r));

  console.log("\nDatos:");
  const base = `/clientes/${slug}`;
  pagina = await M.get(base);
  verificar(pagina.status === 200 && pagina.html.includes('id="form-datos"'), "la pestaña Datos responde", String(pagina.status));
  const datos = { slug, nombre: "Cliente C1", pais: "BR", idioma: "pt", zona_horaria: "America/Sao_Paulo", moneda: "BRL" };
  r = await M.enviar(base, pagina.html, "form-datos", { ...datos, moneda: "USD" });
  verificar(destino(r) === `${base}?error=moneda`, "moneda inválida: rechazada", resumen(r));
  r = await M.enviar(base, pagina.html, "form-datos", datos);
  verificar(destino(r) === `${base}?ok=guardado`, "datos guardados", resumen(r));
  const editado = await leerTenant();
  verificar(editado?.nombre === "Cliente C1" && editado.zona_horaria === "America/Sao_Paulo", "nombre y zona actualizados");

  console.log("\nMarca: colores:");
  const rutaMarca = `${base}/marca`;
  pagina = await M.get(rutaMarca);
  verificar(pagina.status === 200 && pagina.html.includes('id="form-colores"'), "la pestaña Marca responde", String(pagina.status));
  const paleta = { slug, color_primario: "#1f6f8b", color_secundario: "#2d4a53", color_fondo: "#F2F7F9", color_texto: "#102027" };
  const colores = (cambios) => M.enviar(rutaMarca, pagina.html, "form-colores", { ...paleta, ...cambios });
  r = await colores({});
  verificar(destino(r) === `${rutaMarca}?ok=guardado`, "paleta válida: se guarda", resumen(r));
  verificar((await fila("tenant_marca"))?.color_fondo === "#f2f7f9", "los colores se guardan normalizados");
  r = await colores({ color_texto: "#f2f7f9" });
  verificar(destino(r) === `${rutaMarca}?error=contraste_texto`, "texto igual al fondo: rechazado", resumen(r));
  r = await colores({ color_primario: "#c0899a", color_secundario: "#4e5340", color_fondo: "#f6f1ea", color_texto: "#1a1a1a" });
  verificar(destino(r) === `${rutaMarca}?error=contraste_boton`, "paleta con botones ilegibles (la de Gisel): rechazada", resumen(r));
  r = await colores({ color_primario: "#1f6f8b80" });
  verificar(destino(r) === `${rutaMarca}?error=color_invalido`, "color con transparencia: rechazado", resumen(r));
  verificar((await fila("tenant_marca"))?.color_texto === "#102027", "las paletas rechazadas no cambian nada");
  r = await colores({ color_secundario: "#e6eef1" });
  verificar(parametro(r, "ok") === "guardado" && parametro(r, "aviso") === "contraste_secundario", "secundario con poco contraste: se guarda con aviso", resumen(r));

  console.log("\nMarca: imágenes:");
  const subir = (archivo, tipo = "logo") => M.enviar(rutaMarca, pagina.html, `form-imagen-${tipo}`, { slug, tipo, archivo });
  r = await subir(new File([PNG], "logo.png", { type: "image/png" }));
  verificar(destino(r) === `${rutaMarca}?ok=imagen_guardada`, "logo PNG: se sube", resumen(r));
  const logo1 = (await fila("tenant_marca"))?.logo_url ?? "";
  verificar(logo1.startsWith(`${PREFIJO_PUBLICO}${tenantId}/logo-`) && logo1.endsWith(".png"), "logo_url apunta al bucket sitios, carpeta del cliente", logo1);
  const publica = await fetch(logo1);
  verificar(publica.status === 200 && publica.headers.get("content-type") === "image/png", "la URL pública se lee sin sesión", `${publica.status} ${publica.headers.get("content-type")}`);
  r = await M.get(`/_next/image?url=${encodeURIComponent(logo1)}&w=640&q=75`);
  verificar(r.status === 200, "next/image acepta el host de Supabase (remotePatterns)", String(r.status));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>';
  r = await subir(new File([svg], "logo.svg", { type: "image/svg+xml" }));
  verificar(destino(r) === `${rutaMarca}?error=imagen_tipo`, "SVG: rechazado", resumen(r));
  r = await subir(new File([svg], "logo.png", { type: "image/png" }));
  verificar(destino(r) === `${rutaMarca}?error=imagen_tipo`, "SVG disfrazado de PNG: rechazado (se mira el contenido)", resumen(r));
  r = await subir(new File([Buffer.concat([PNG, Buffer.alloc(2.5 * 1024 * 1024)])], "grande.png", { type: "image/png" }));
  verificar(destino(r) === `${rutaMarca}?error=imagen_grande`, "más de 2 MB: rechazado", resumen(r));
  r = await subir(new File([PNG], "logo2.png", { type: "image/png" }));
  const logo2 = (await fila("tenant_marca"))?.logo_url ?? "";
  verificar(destino(r) === `${rutaMarca}?ok=imagen_guardada` && logo2 !== logo1, "reemplazar el logo", resumen(r));
  const objetos = await listarObjetos();
  verificar(objetos.length === 1 && logo2.endsWith(`/${objetos[0]}`), "la imagen anterior se borró del bucket", objetos.join(", "));
  r = await subir(new File([PNG], "foto.png", { type: "image/png" }), "foto_perfil");
  const foto = (await fila("tenant_marca"))?.foto_perfil_url ?? "";
  verificar(destino(r) === `${rutaMarca}?ok=imagen_guardada` && foto.startsWith(`${PREFIJO_PUBLICO}${tenantId}/foto_perfil-`), "foto de perfil: se sube", resumen(r));

  console.log("\nTextos y contacto:");
  const rutaTextos = `${base}/textos`;
  pagina = await M.get(rutaTextos);
  const textos = {
    slug, rubro: "Estética", tagline: "Cuidado com carinho", inicio_titulo: "Bem-vinda ao", inicio_destacado: "Cliente C1",
    inicio_texto: "Agende online.", sobre_mi_titulo: "", sobre_mi_texto: "", nota_reservas: "",
    whatsapp: "(11) 91234-5678", instagram: "https://instagram.com/cliente.c1/", email_contacto: "contato@example.com",
    direccion: "São Paulo",
  };
  r = await M.enviar(rutaTextos, pagina.html, "form-textos", { ...textos, whatsapp: "123" });
  verificar(destino(r) === `${rutaTextos}?error=whatsapp`, "WhatsApp inválido: rechazado", resumen(r));
  r = await M.enviar(rutaTextos, pagina.html, "form-textos", { ...textos, inicio_titulo: "" });
  verificar(destino(r) === `${rutaTextos}?error=inicio_titulo`, "título de inicio vacío: rechazado", resumen(r));
  r = await M.enviar(rutaTextos, pagina.html, "form-textos", textos);
  verificar(destino(r) === `${rutaTextos}?ok=guardado`, "textos guardados", resumen(r));
  const marcaTextos = await fila("tenant_marca");
  verificar(
    marcaTextos?.whatsapp === "+5511912345678" && marcaTextos.instagram === "cliente.c1" && marcaTextos.sobre_mi_titulo === null,
    "WhatsApp en E.164, Instagram sin URL y vacíos en null",
    JSON.stringify({ whatsapp: marcaTextos?.whatsapp, instagram: marcaTextos?.instagram }),
  );
  const S = new Navegador(HOST_CLIENTE);
  r = await S.get("/");
  verificar(r.status === 200 && r.html.includes("Bem-vinda ao"), "el sitio público muestra los textos nuevos", String(r.status));

  console.log("\nMódulos:");
  const rutaModulos = `${base}/modulos`;
  pagina = await M.get(rutaModulos);
  r = await M.enviar(rutaModulos, pagina.html, "form-modulos", { slug, modulo_turnos: "on", modulo_cursos: "on" });
  verificar(destino(r) === `${rutaModulos}?ok=guardado`, "módulos guardados", resumen(r));
  const conModulos = await leerTenant();
  verificar(conModulos?.modulo_turnos && conModulos.modulo_cursos && !conModulos.modulo_faq, "las casillas sin tildar se apagan");

  console.log("\nUsuario del cliente:");
  const rutaUsuario = `${base}/usuario`;
  pagina = await M.get(rutaUsuario);
  verificar(pagina.html.includes('id="form-usuario-cliente"'), "sin usuario, se ofrece crearlo");
  const invitar = (email) => M.enviar(rutaUsuario, pagina.html, "form-usuario-cliente", { slug, email });
  r = await invitar("no-es-un-email");
  verificar(destino(r) === `${rutaUsuario}?error=email`, "email inválido: rechazado", resumen(r));
  r = await invitar(emailMaster);
  verificar(destino(r) === `${rutaUsuario}?error=usuario_master`, "el email del master: rechazado", resumen(r));
  r = await invitar(emailOtro);
  verificar(destino(r) === `${rutaUsuario}?error=usuario_de_otro`, "un email de otro cliente: rechazado", resumen(r));
  const linksAntes = ocurrencias(reInvitacion(emailCliente)).length;
  r = await invitar(emailCliente);
  verificar(destino(r) === `${rutaUsuario}?ok=usuario_creado`, "crea el usuario del cliente", resumen(r));
  const { data: perfil } = await admin.from("perfiles").select("user_id, rol").eq("tenant_id", tenantId).maybeSingle();
  if (!perfil) throw new Error("no se creó el perfil del cliente");
  const clienteUserId = perfil.user_id;
  usuariosCreados.push(clienteUserId);
  verificar(perfil.rol === "cliente", "perfil cliente del tenant");
  const link = new URL(await esperarNueva(reInvitacion(emailCliente), linksAntes));
  verificar(link.host === HOST_CLIENTE && link.pathname === "/admin/restablecer", "el link de invitación lleva al panel del cliente", link.href);
  pagina = await M.get(rutaUsuario);
  verificar(
    !pagina.html.includes('id="form-usuario-cliente"') && pagina.html.includes(emailCliente),
    "con un usuario, el alta desaparece y el usuario aparece en la lista",
  );

  console.log("\nEl cliente define su contraseña y entra:");
  const C = new Navegador(HOST_CLIENTE);
  const rutaLink = `${link.pathname}${link.search}`;
  pagina = await C.get(rutaLink);
  r = await C.enviar(rutaLink, pagina.html, "form-restablecer", {
    token_hash: link.searchParams.get("token_hash"),
    password: claveCliente,
    confirmacion: claveCliente,
  });
  verificar(destino(r) === "/admin/login?info=contrasena_cambiada", "define su contraseña con el link", resumen(r));
  const codigosCliente = ocurrencias(reCodigo(emailCliente)).length;
  r = await ingresar(C, "/admin", emailCliente, claveCliente);
  verificar(destino(r) === "/admin/verificar?info=codigo_enviado", "ingresa: pide el código", resumen(r));
  const codigoCliente = await esperarNueva(reCodigo(emailCliente), codigosCliente);
  pagina = await C.get("/admin/verificar");
  r = await C.enviar("/admin/verificar", pagina.html, "form-verificar", { codigo: codigoCliente, recordar: "on" });
  verificar(destino(r) === "/admin", "código correcto: entra a su panel", resumen(r));
  r = await C.get("/admin");
  verificar(r.status === 200 && r.html.includes("Hola,") && r.html.includes("Cliente C1"), "su panel responde con su nombre", String(r.status));

  console.log("\nUna action del master desde la sesión del cliente:");
  const htmlDatos = (await M.get(base)).html;
  r = await C.enviar("/admin", htmlDatos, "form-estado", { slug, estado: "suspendido" });
  verificar(r.status >= 400 && (await leerTenant())?.estado === "activo", "el cliente no puede usar actions del master", resumen(r));

  console.log("\nAcciones sobre el usuario:");
  const contarDispositivos = async () =>
    (await admin.from("dispositivos_confiables").select("id", { count: "exact", head: true }).eq("user_id", clienteUserId)).count;
  verificar((await contarDispositivos()) === 1, "el cliente tiene un dispositivo recordado");
  pagina = await M.get(rutaUsuario);
  r = await M.enviar(rutaUsuario, pagina.html, `form-revocar-${clienteUserId}`, { slug, user_id: masterUserId });
  verificar(destino(r) === `${rutaUsuario}?error=usuario_no_encontrado`, "revocar a un usuario de otro: rechazado", resumen(r));
  r = await M.enviar(rutaUsuario, pagina.html, `form-revocar-${clienteUserId}`, { slug, user_id: clienteUserId });
  verificar(destino(r) === `${rutaUsuario}?ok=dispositivos_revocados` && (await contarDispositivos()) === 0, "revocar dispositivos recordados", resumen(r));
  const linksAntesReenvio = ocurrencias(reInvitacion(emailCliente)).length;
  r = await M.enviar(rutaUsuario, pagina.html, `form-reenviar-link-${clienteUserId}`, { slug, user_id: clienteUserId });
  verificar(destino(r) === `${rutaUsuario}?ok=link_reenviado`, "reenviar el link de contraseña", resumen(r));
  await esperarNueva(reInvitacion(emailCliente), linksAntesReenvio);
  verificar(true, "el link nuevo salió en el log");

  console.log("\nCredenciales:");
  const rutaCred = `${base}/credenciales`;
  pagina = await M.get(rutaCred);
  const tokenMp = `TEST-${randomBytes(12).toString("hex")}-e2e`;
  r = await M.enviar(rutaCred, pagina.html, "form-mp", { slug, mp_access_token: "hola", mp_public_key: "", mp_webhook_secret: "" });
  verificar(destino(r) === `${rutaCred}?error=mp_access_token`, "access token con formato inválido: rechazado", resumen(r));
  r = await M.enviar(rutaCred, pagina.html, "form-mp", { slug, mp_access_token: tokenMp, mp_public_key: "TEST-public-key-e2e", mp_webhook_secret: "" });
  verificar(destino(r) === `${rutaCred}?ok=mp_guardado`, "Mercado Pago manual guardado", resumen(r));
  const credMp = await fila("tenant_credenciales");
  verificar(/^v1\./.test(credMp?.mp_access_token ?? "") && !credMp.mp_access_token.includes(tokenMp), "el access token se guarda cifrado");
  let descifrado = null;
  try {
    descifrado = descifrarComoLaApp(credMp.mp_access_token, tenantId, "mp_access_token");
  } catch {
    // queda null
  }
  verificar(descifrado === tokenMp, "se descifra con CREDENCIALES_KEY y el AAD del tenant y la columna");
  verificar(
    credMp.mp_origen === "manual" && credMp.mp_public_key === "TEST-public-key-e2e" && credMp.mp_webhook_secret === null,
    "origen manual, public key en claro y secreto del webhook sin cargar",
  );
  pagina = await M.get(rutaCred);
  verificar(!pagina.html.includes(tokenMp) && pagina.html.includes("configurado ✓"), "el panel no muestra el token (solo configurado ✓)");

  const usuarioGmail = `e2e-c1-${sufijo}@gmail.com`;
  const claveGmailFalsa = "abcdabcdabcdabcd";
  r = await M.enviar(rutaCred, pagina.html, "form-gmail", { slug, smtp_usuario: "no-es-email", smtp_password: "", smtp_nombre_remitente: "" });
  verificar(destino(r) === `${rutaCred}?error=gmail_usuario`, "cuenta de Gmail inválida: rechazada", resumen(r));
  const FALLOS = ["gmail_autenticacion", "gmail_conexion", "gmail_otro"];
  r = await M.enviar(rutaCred, pagina.html, "form-gmail", {
    slug, smtp_usuario: usuarioGmail, smtp_password: "abcd abcd abcd abcd", smtp_nombre_remitente: "Cliente C1",
  });
  verificar(FALLOS.includes(parametro(r, "error")), "Gmail con datos falsos: la prueba falla", resumen(r));
  verificar((await fila("tenant_credenciales"))?.smtp_usuario === null, "datos que no pasan la prueba: no se guardan");
  // Una configuración guardada (como la guardaría la app) que deja de funcionar.
  const { error: errorSembrar } = await admin
    .from("tenant_credenciales")
    .update({ smtp_usuario: usuarioGmail, smtp_password: cifrarComoLaApp(claveGmailFalsa, tenantId, "smtp_password"), smtp_estado: "ok" })
    .eq("tenant_id", tenantId);
  if (errorSembrar) throw new Error(`sembrar Gmail: ${errorSembrar.message}`);
  r = await M.enviar(rutaCred, pagina.html, "form-gmail", { slug, smtp_usuario: usuarioGmail, smtp_password: "", smtp_nombre_remitente: "Cliente C1" });
  verificar(FALLOS.includes(parametro(r, "error")), "probar la configuración guardada: falla", resumen(r));
  const credGmail = await fila("tenant_credenciales");
  verificar(
    credGmail?.smtp_estado === "error" &&
      !!credGmail.smtp_ultimo_error &&
      !credGmail.smtp_ultimo_error.includes(claveGmailFalsa) &&
      !credGmail.smtp_ultimo_error.includes(usuarioGmail),
    "se registra el error, sin datos sensibles",
    credGmail?.smtp_ultimo_error,
  );
  pagina = await M.get("/");
  verificar(pagina.html.includes(`>${slug}<`) && pagina.html.includes("Email con error"), "la lista de clientes muestra la alerta de email");

  console.log("\nSuspender y reactivar:");
  pagina = await M.get(base);
  r = await M.enviar(base, pagina.html, "form-estado", { slug, estado: "suspendido" });
  verificar(destino(r) === `${base}?ok=suspendido` && (await leerTenant())?.estado === "suspendido", "suspender", resumen(r));
  r = await S.get("/");
  verificar(r.status === 200 && r.html.includes("indisponível"), "el sitio público muestra que no está disponible", String(r.status));
  pagina = await M.get(rutaUsuario);
  r = await M.enviar(rutaUsuario, pagina.html, `form-reenviar-link-${clienteUserId}`, { slug, user_id: clienteUserId });
  verificar(destino(r) === `${rutaUsuario}?error=cliente_suspendido`, "con el cliente suspendido no se envían links", resumen(r));
  pagina = await M.get(base);
  r = await M.enviar(base, pagina.html, "form-estado", { slug, estado: "activo" });
  verificar(destino(r) === `${base}?ok=reactivado` && (await leerTenant())?.estado === "activo", "reactivar", resumen(r));
  r = await S.get("/");
  verificar(r.status === 200 && r.html.includes("Bem-vinda ao"), "el sitio vuelve a estar en línea", String(r.status));
}

const hmacEmail = (dominio, e) => createHmac("sha256", secretoMfa).update(`${dominio}|${e}`).digest("hex");

try {
  const { data: gisel, error: errorGisel } = await admin.from("tenants").select("id").eq("slug", "gisel").single();
  if (errorGisel) throw new Error(`tenant gisel: ${errorGisel.message}`);
  masterUserId = await crearUsuario(emailMaster, claveMaster, { rol: "master", tenant_id: null });
  await crearUsuario(emailOtro, randomBytes(18).toString("base64url"), { rol: "cliente", tenant_id: gisel.id });
  await prueba();
} catch (e) {
  console.error(`\nError en la prueba: ${e.message}`);
  fallas++;
} finally {
  console.log("\nLimpieza:");
  const id = tenantId ?? (await leerTenant())?.id ?? null;
  if (id) {
    const objetos = await listarObjetos(id).catch(() => []);
    if (objetos.length) {
      const { error } = await admin.storage.from("sitios").remove(objetos.map((o) => `${id}/${o}`));
      if (error) {
        console.error(`✗ limpieza: imágenes: ${error.message}`);
        fallas++;
      }
    }
    const { data: perfiles } = await admin.from("perfiles").select("user_id").eq("tenant_id", id);
    for (const p of perfiles ?? []) if (!usuariosCreados.includes(p.user_id)) usuariosCreados.push(p.user_id);
  }
  for (const uid of usuariosCreados) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) {
      console.error(`✗ limpieza: usuario ${uid}: ${error.message}`);
      fallas++;
    }
  }
  if (id) {
    // marca, configuración y credenciales se borran en cascada.
    const { error } = await admin.from("tenants").delete().eq("id", id);
    if (error) {
      console.error(`✗ limpieza: tenant: ${error.message}`);
      fallas++;
    }
  }
  const emails = [emailMaster, emailCliente, emailOtro];
  const borrados = await Promise.all([
    admin.from("intentos_login").delete().in("email_hash", emails.map((e) => hmacEmail("login", e))),
    admin.from("intentos_login").delete().in("ip", ipsUsadas),
  ]);
  for (const { error } of borrados) {
    if (error) {
      console.error(`✗ limpieza: ${error.message}`);
      fallas++;
    }
  }
  const quedan = await Promise.all([
    leerTenant().then((t) => (t ? 1 : 0)),
    listarObjetos(id).then((o) => o.length).catch(() => 1),
    ...usuariosCreados.map((uid) => admin.auth.admin.getUserById(uid).then((r) => (r.data?.user ? 1 : 0))),
  ]);
  verificar(quedan.every((n) => n === 0), "no quedan el cliente, sus imágenes ni los usuarios de prueba", quedan.join(","));
}

console.log(fallas === 0 ? "\nE2E OK" : `\n${fallas} verificación(es) fallaron`);
process.exit(fallas === 0 ? 0 : 1);
```

- [ ] **Step 2: Tipos, lint, tests y build**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
node --check scripts/e2e-master.mjs
npm run build
```

Expected: sin errores, el build sin errores, y Vitest con todos los tests en PASS: los anteriores más `tenant/contraste`, `cripto/credenciales`, `storage/imagenes`, `master/pais`, `master/modulos`, `master/alertas`, `master/smtp`, `master/mensajes`, `master/formularios` y los casos nuevos de `tenant/estilo` y `email/plantillas-auth`.

- [ ] **Step 3: Prueba de punta a punta en desarrollo**

Levantar el servidor de desarrollo con la salida en `$LOG` (ver "Servidor de desarrollo"; con `CABECERA_IP_CONFIABLE=x-real-ip` en su entorno). Comprobar que el `.env.local` **no** tiene la cuenta de la plataforma, así los códigos y links van a la consola:

```bash
for k in PLATFORM_GMAIL_USER PLATFORM_GMAIL_APP_PASSWORD; do grep -q "^$k=." .env.local && echo "$k: presente" || echo "$k: vacío"; done
node --env-file=.env.local scripts/e2e-master.mjs "$(cygpath -w "$LOG")"
node --env-file=.env.local scripts/e2e-login.mjs dev "$(cygpath -w "$LOG")"
```

Expected:
- Las dos variables dicen `vacío` (si están presentes, los scripts fallan esperando el log: avisar a Pablo y hacer la prueba manual del Step 6).
- `e2e-master.mjs`: todas las verificaciones en `✓` y `E2E OK`.
- `e2e-login.mjs` (regresión de B; la home master cambió): `E2E OK`.

Si algo falla, revisar el log del servidor (`tail -n 80 "$LOG"`) antes de tocar código. Los scripts borran lo que crean aunque fallen.

- [ ] **Step 4: Aislamiento**

Run: `npm run test:aislamiento`
Expected: `Aislamiento OK`.

Detener el servidor de desarrollo (solo su árbol de procesos).

- [ ] **Step 5: Docker (producción)**

```bash
docker compose up -d --build --force-recreate
curl -s -o /dev/null -w 'docker gisel: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/
curl -s -o /dev/null -w 'docker app login: %{http_code}\n' -H "Host: app.localhost:3000" http://localhost:3000/login
docker compose exec web node -e "process.exit(/^[A-Za-z0-9_-]{43}$/.test(process.env.CREDENCIALES_KEY||'')?0:1)" && echo "CREDENCIALES_KEY en el contenedor: ok"
node --env-file=.env.local scripts/e2e-login.mjs docker
```

Expected: `docker gisel: 200`, `docker app login: 200`, `CREDENCIALES_KEY en el contenedor: ok` (sin imprimir su valor) y `E2E OK`.

- [ ] **Step 6: Prueba manual en el navegador (para Pablo)**

La E2E cubre el flujo **sin JavaScript**. Esta lista cubre lo que solo se ve en el navegador. Con `npm run dev` y el contenedor detenido; códigos y links en la terminal como `[MFA dev] …`.

1. `http://app.localhost:3000` → login master → lista de clientes con las columnas Módulos y Alertas, y "Nuevo cliente".
2. **Alta:** al cambiar el país a Brasil, idioma, zona y moneda pasan a `pt`, `America/Sao_Paulo` y `BRL`, y la lista de zonas muestra las de Brasil. Crear un cliente de prueba lleva a su pestaña Datos con "Cliente creado".
3. **Pestañas:** la activa queda marcada al navegar entre Datos, Marca, Textos, Módulos, Usuario y Credenciales.
4. **Marca:**
   - Al mover los selectores de color, la vista previa cambia en vivo; con texto igual al fondo aparece el error con el contraste y "Guardar colores" se deshabilita.
   - Subir un logo, un logo claro (se ve sobre fondo oscuro) y una foto: la vista previa se actualiza y el overlay "Subiendo…" aparece mientras sube.
   - Intentar subir un SVG: el selector no lo ofrece (`accept`); si se fuerza, aparece "La imagen tiene que ser PNG, JPG o WebP."
   - Un archivo de más de 3 MB muestra la pantalla de error de Next (límite del cuerpo, ver Riesgos). Entre 2 y 3 MB: "La imagen pesa más de 2 MB."
5. **Textos:** guardar y abrir el sitio (`Ver sitio ↗`): se ven el título, el destacado, el pie con Instagram y el botón de WhatsApp con el número en formato internacional.
6. **Usuario:** crear el usuario con un email propio y abrir el link de la terminal: el formulario de contraseña tiene la marca del cliente. Ingresar a su `/admin`. Volver al master: "Último ingreso" con la fecha. Probar "Revocar dispositivos" y "Reenviar link".
7. **Credenciales:**
   - Con una cuenta de Gmail de prueba real y su contraseña de aplicación: "Probar conexión y guardar" → "Conexión con Gmail verificada y guardada" y estado "conexión verificada ✓". La contraseña no vuelve a aparecer (placeholder "configurado ✓").
   - Mercado Pago manual con credenciales de prueba: "configurado ✓".
8. **Suspender** el cliente de prueba: su sitio dice "no disponible" y su panel no deja entrar. Reactivarlo.
9. **Gisel:** abrir su pestaña Marca. Su paleta actual da **2,56:1** en los botones y no deja guardar colores (ver Riesgos y checklist). Logos y textos se pueden editar igual.

**Checklist de configuración (para Pablo):**

- [ ] **Paleta de Gisel:** decidir un primario más oscuro para que el texto de los botones pase 4,5:1 (por ejemplo, probar en la vista previa tonos del mismo rosa hasta que desaparezca el error). Hasta entonces, sus colores no se pueden guardar desde el panel (todo lo demás sí).
- [ ] **`CREDENCIALES_KEY`:** guardarla en un gestor de contraseñas. En producción tiene que ser la misma con la que se cifraron las credenciales; si se pierde, hay que volver a cargarlas todas. No cambiarla sin un script que vuelva a cifrar (no existe todavía).
- [ ] **Producción:** correr `node --env-file=.env.local scripts/setup-storage-sitios.mjs` contra el proyecto de producción, aplicar la migración 0018 y reconstruir la imagen (el host de Supabase de `remotePatterns` se fija en el build).
- [ ] **Supabase → Storage → sitios:** público, límite de 2 MB, tipos `image/png`, `image/jpeg` e `image/webp`, y ninguna policy de escritura en `storage.objects` para `anon` ni `authenticated`.
- [ ] **Supabase → Authentication → Providers → Email:** "Email OTP Expiration" en 3600 s (la invitación promete 1 hora). Con el registro público desactivado (checklist de B), `createUser` con la service role sigue funcionando.
- [ ] **Usuario mal cargado:** el panel no borra usuarios de clientes (fuera de C1). Si se cargó un email equivocado: Supabase → Authentication → Users → borrar ese usuario (su perfil se borra en cascada) y volver a crearlo desde el panel.
- [ ] Cuando exista la cuenta de Gmail de la plataforma: repetir el punto 6 de la prueba manual y comprobar que la invitación llega con la marca del cliente y en su idioma (portugués para un cliente de Brasil).

- [ ] **Step 7: Commit**

```bash
git add scripts/e2e-master.mjs
git status --short   # .env.local y docs/resumen-arquitectura-y-desarrollo.md NO deben estar en staged
git commit -F - <<'EOF'
test(master): prueba de punta a punta del panel master

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Self-review

**Cobertura del spec:**

| Requisito | Task |
|---|---|
| §7 Lista de clientes: nombre, subdominio, estado, módulos y alertas (email con error, MP por vencer) | 4 (`alertasDelCliente`), 9 (`listarClientes`), 13, 16 |
| §7 Alta: datos básicos y subdominio (§4.1: 3–40, reservados) | 5 (`parsearAlta` con `esSlugValido`), 7 (`crear_tenant`, `23505`), 12, 13, 16 |
| §7 País, idioma, zona horaria y moneda (§12: zonas IANA de Brasil) | 4 (`pais.ts`), 5 (`parsearDatos`), 13 (`CamposPais`), 14, 16 |
| §7 Marca: colores con vista previa en vivo | 1 (`evaluarPaleta`), 5 (`parsearColores`), 14 (`EditorColores`), 16 |
| §8 4 colores base, tokens neutros (sin quinto color, sin alfa) | 1 (`esColorHex` estricto), 14 |
| §7 Logo y foto (§4.2 bucket público `sitios/{tenant_id}/…`) | 3, 8, 9 (`guardarImagen`), 14, 16 |
| §7 Módulos | 4 (`modulos.ts`), 12, 14, 16 |
| §7 Credenciales: Gmail con "probar conexión" | 4 (`smtp.ts`), 5 (`parsearGmail`), 10 (`verificarGmail`, `probarYGuardarGmail`), 15, 16 |
| §9 Gmail: `verify()` antes de guardar; `smtp_estado` y `smtp_ultimo_error` | 10 (no guarda si falla; registra el error de la configuración guardada), 16 |
| §7 / §9 Mercado Pago manual (`mp_origen = 'manual'`, `mp_webhook_secret`) | 5 (`parsearMp`), 10 (`guardarMercadoPago`), 15, 16 |
| §7 Usuario del cliente | 11, 12, 15, 16 |
| §6.6 Se crea el usuario y se le envía un link para definir su contraseña; el master nunca conoce contraseñas | 6 (`plantillaInvitacion`), 11 (contraseña aleatoria, `generateLink` recovery), 16 (el cliente define la suya y entra) |
| §6.5 / §10 Link enviado por la plataforma con la marca del cliente, sin emails de Supabase | 6, 11 (`entregarEmailAuth`, regla de consola y falla cerrada de B) |
| §7 Acciones: suspender o reactivar | 9, 12, 14, 16 (sitio "no disponible") |
| §7 Acciones: revocar dispositivos recordados, reenviar link | 11, 12, 15, 16 |
| §5 Cliente suspendido: "sitio no disponible", panel bloqueado | Ya existente (A2/B); 16 lo comprueba en el sitio |
| §4.3 Credenciales cifradas con AES-256-GCM y `CREDENCIALES_KEY`, solo se descifran en el servidor | 2, 10 (`clave.ts`, `credenciales.ts`), 16 (formato y descifrado con AAD) |
| §4.3 Ningún rol de la API lee `tenant_credenciales` | Ya existente (0012/0016); 7 y 16 no lo cambian |
| §4.3 Los paneles muestran solo "configurado ✓" y permiten reemplazar | 10 (`estadoCredenciales` sin secretos), 15, 16 (el token no aparece en el HTML) |
| §4.3 Acceso del servidor por `datosDelTenant` | 9, 10 (`tenant_credenciales` en `TablaTenant`) |
| §13 Cifrado de ida y vuelta, validación del slug | 2, 5 |
| §13 Aislamiento: la función nueva no es invocable por la API; el bucket no se escribe sin service role | 7, 8 |
| §14-C Panel master | 1 a 16 (el resto de la fila C queda para C2) |

**Queda para C2:** traducción del panel del cliente y sus pantallas de ingreso, panel del cliente filtrado por módulos, pantallas de galería, preguntas frecuentes, testimonios y botón de WhatsApp, `modo_pago`, y los pendientes listados en "Fuera de C1".
**Queda para D:** OAuth de Mercado Pago, Google por tenant, el uso del Gmail de cada cliente (y su respaldo) en los emails, y la migración de las credenciales globales del `.env` a `tenant_credenciales` de Gisel.

**Tipos consistentes entre tasks:**

- **Mensajes:** `ClaveError`, `ClaveInfo` y `ClaveAviso` (`mensajes.ts`) son las claves de sus tablas.
  - `Resultado<T>` de `formularios.ts` usa `ClaveError`; `ColoresValidados.avisos` es `ClaveAviso[]`.
  - Los resultados de los servicios son subconjuntos de `ClaveError` más `"ok"`: `crearCliente` → `"slug_en_uso"`; `ResultadoInvitacion`, `ResultadoReenvio`, `revocarDispositivosDeUsuario` → `"usuario_no_encontrado"`; `probarYGuardarGmail` → `FalloSmtp | "gmail_sin_contrasena" | "gmail_contrasena_cuenta_nueva" | "credencial_ilegible"`; `guardarMercadoPago` → `"mp_sin_access_token"`; `ProblemaImagen` (`imagenes.ts`). Todos están en `ERRORES` (el test de la Task 5 los enumera), así que `ir(ruta, { error })` compila.
  - `ClaveContraste` (`contraste.ts`): `contraste_texto` y `contraste_boton` están en `ERRORES` y `contraste_secundario` en `AVISOS`. `EditorColores` usa `mensajeError` para los que bloquean y `mensajeAviso` para el aviso.
- **Datos del formulario ↔ columnas:**
  - `DatosCliente` → `columnasDatos`; `AltaCliente.modulos` (`Modulos`) va como `p_modulos` con las claves de `Modulos` (`sobreMi`), las mismas que lee `crear_tenant`.
  - `ColumnaModulo` es el `name` de las casillas (`CasillasModulos`), la clave de `columnasModulos` y de `modulosDeFila`, y las columnas de `listarClientes`.
  - `TextosMarca` → `columnasTextos`; `ColoresMarca` → `columnasColores` (snake_case de `tenant_marca`).
  - `TipoImagen` → `COLUMNA_IMAGEN` (columna) y `CAMPO_MARCA_IMAGEN` (campo de `Marca`), que usan `guardarImagen` y la página Marca.
- **Cifrado:** `ContextoCifrado = { tenantId, columna: ColumnaCifrada }`. `credenciales.ts` usa `smtp_password`, `mp_access_token` y `mp_webhook_secret`. El AAD `v1|<tenant>|<columna>` es el mismo en `e2e-master.mjs`.
- **Nombres de campos de formulario** (los parsers, las páginas y la E2E): `slug`, `nombre`, `pais`, `idioma`, `zona_horaria`, `moneda`, `modulo_*`, `color_primario|secundario|fondo|texto`, `tipo`, `archivo`, `rubro`, `tagline`, `inicio_titulo`, `inicio_destacado`, `inicio_texto`, `sobre_mi_titulo`, `sobre_mi_texto`, `nota_reservas`, `whatsapp`, `instagram`, `email_contacto`, `direccion`, `email`, `user_id`, `estado`, `smtp_usuario`, `smtp_password`, `smtp_nombre_remitente`, `mp_access_token`, `mp_public_key`, `mp_webhook_secret`.
- **Ids de formulario que lee la E2E:** `form-alta-cliente`, `form-datos`, `form-estado`, `form-colores`, `form-imagen-{logo,logo_claro,foto_perfil}`, `form-textos`, `form-modulos`, `form-usuario-cliente`, `form-reenviar-link-<userId>`, `form-revocar-<userId>`, `form-gmail`, `form-mp`, y los de B (`form-login`, `form-verificar`, `form-restablecer`).
- **Rutas:** las actions redirigen a rutas del navegador de `app.` (`/`, `/nuevo`, `/clientes/<slug>[/<pestaña>]`), las mismas que usan `PestanasCliente` y la E2E. El link de invitación usa `rutaDelArea("tenant", RUTAS_AUTH.restablecer)` (`/admin/restablecer`), el mismo que la recuperación de B.

**Orden y compilación:**

- Tasks 1 a 6: módulos puros con tests (la 6 extiende las plantillas de B).
- Task 7: SQL y test de aislamiento. Task 8: script, `next.config.ts` y aislamiento del bucket.
- Tasks 9 a 12: servidor. Cada una importa solo lo de las anteriores (la 12 usa 9, 10 y 11).
- Tasks 13 a 15: pantallas. La 13 reemplaza la home y saca `listarTenants` y su import, que quedan sin uso; `e2e-login.mjs` sigue encontrando `Panel master` y `>gisel<`.
- Task 16: E2E y verificación final.
- `tsc` queda en verde al final de cada task.

**Sin placeholders:** todo archivo nuevo o reescrito tiene su contenido completo; las ediciones puntuales indican el texto exacto a buscar y a poner. El único valor que no está en el plan es `CREDENCIALES_KEY`, que se genera sin imprimirla.

**Riesgos que quedan abiertos:**

- **Archivos de más de 3 MB:** Next corta el pedido (413) antes de la action y el master ve la pantalla de error genérica, no "pesa más de 2 MB". `accept` y la ayuda lo hacen improbable. Subir el límite solo agranda la superficie de abuso.
- **URLs públicas y CDN:** una imagen reemplazada se borra del bucket, pero la CDN de Supabase y la caché de `next/image` (4 h por defecto en Next 16) pueden servirla un tiempo más. Está acotado por `cacheControl` de 1 día.
- **`remotePatterns` se fija en el build:** si cambia el proyecto de Supabase hay que reconstruir la imagen. Sin `NEXT_PUBLIC_SUPABASE_URL` en el build, las imágenes de Supabase dan 400 en `next/image` (el patrón queda vacío).
- **Atomicidad del usuario del cliente:** `createUser` y el perfil no son una transacción (Auth y PostgREST son APIs distintas). Se compensa borrando el usuario si falla el perfil; si también falla ese borrado, queda una cuenta sin perfil, que el panel rechaza (`usuario_sin_cliente`) y se borra en Supabase.
- **`listUsers` paginado:** solo corre cuando el email ya existe; con muchos miles de usuarios sería lento. Hoy son decenas.
- **Link de invitación de 1 hora:** si el cliente no lo abre a tiempo, el master usa "Reenviar link" o el cliente pide uno desde "¿Olvidaste tu contraseña?". Abrir el link no gasta el token (se consume en la action, como en B).
- **`CREDENCIALES_KEY`:** si falta, el panel lo avisa y no guarda credenciales (falla cerrada); si cambia, las guardadas no se descifran (la prueba de Gmail de una configuración guardada falla con error). No hay rotación de clave todavía (el formato `v1` la permite más adelante).
- **Prueba real contra Gmail en la E2E:** se conecta a `smtp.gmail.com` con datos falsos. Sin salida a internet en el puerto 465 la prueba igual pasa (el error es `gmail_conexion`), pero tarda hasta 20 s.
- **Paleta de Gisel:** su pestaña Marca no deja guardar colores hasta que Pablo elija un primario más oscuro (decisión 16).
