# Etapa C2a — Panel del cliente traducido, módulos, modo de pago y contenido: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** el panel del cliente (`<slug>.<dominio>/admin`) queda en el idioma del cliente (es/pt), con sus pantallas de ingreso, y muestra solo las secciones de los módulos habilitados; el servidor lo vuelve a exigir en cada página y en cada action. El cliente edita servicios, horarios y reglas (con el modo de pago: sin pago anticipado, seña o pago total), turnos, textos de inicio y "sobre mí", testimonios, preguntas frecuentes y la galería de imágenes. El sitio público suma las secciones de galería y preguntas frecuentes, el botón flotante de WhatsApp, un menú que solo enlaza secciones con contenido y una reserva que respeta el modo de pago. Un cliente suspendido ve un aviso en vez de la pantalla de error. Se cierran los pendientes de la revisión de C1.

**Arquitectura:**
- **Reglas puras con tests:** secciones del panel por módulo y enlaces del sitio (`src/lib/panel/secciones.ts`, `src/lib/sitio/enlaces.ts`), mensajes del panel en es/pt por clave (`src/lib/panel/mensajes.ts`), modo de pago y montos (`src/lib/turnos/pago.ts`), validación de cada formulario del panel con lista blanca de campos (`src/lib/panel/formularios.ts`) y paths de la galería (`src/lib/storage/imagenes.ts`).
- **Datos:** la migración `0020` agrega `configuracion_negocio.modo_pago` y las tablas `galeria` y `preguntas_frecuentes` (RLS sin policies, sin privilegios para `anon` ni `authenticated`: el sitio público las lee con la service role, como todo el servidor).
- **Servidor:** `src/lib/panel/servidor.ts` (`tenantDeSeccion` para páginas: 404 con el módulo apagado; `tenantDeAccion` para actions: vuelve al panel con un aviso; `ir` y `revalidarSitio`). Cada action valida con los parsers puros y redirige con una clave de mensaje, como el master.
- **Pantallas:** el layout del panel arma el menú con `seccionesDelPanel`, pone el `IdiomaProvider` y el `lang` del documento; cada página traduce con `traductor(tenant.idioma)`. La reserva sin pago anticipado confirma el turno al reservar con las mismas funciones que usa el webhook de Mercado Pago (`src/lib/turnos/confirmacion.ts`).

**Stack:** Next.js 16 (server actions con redirect, `notFound`, `not-found.tsx` por segmento, `generateMetadata`, `revalidatePath`), Supabase (service role, Storage), Tailwind 4, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-11-plataforma-multitenant-design.md](../specs/2026-10-11-plataforma-multitenant-design.md), secciones 3 (módulos), 4.1 (contenido de módulos), 4.2 (`modo_pago`), 5 (módulo apagado, cliente suspendido), 7 (panel del cliente), 8 (idioma), 9 (modos de pago) y la fila C de la 14.
**Plan anterior:** [2026-10-12-etapa-c1-panel-master.md](2026-10-12-etapa-c1-panel-master.md). **Sigue:** [2026-10-14-etapa-c2b-cursos-y-favicon.md](2026-10-14-etapa-c2b-cursos-y-favicon.md).

---

## Alcance y decisiones

**Incluido en C2a:**

- Panel del cliente traducido (es/pt): layout, inicio, servicios, horarios y reglas, turnos, textos, testimonios, preguntas frecuentes, galería, pantallas de ingreso (login, código, recuperar, restablecer), 404 y pantalla de error del panel. Mensajes por clave, sin texto reflejado de la URL.
- Secciones del panel según los módulos, también en el servidor: cada página (404) y cada action (vuelve a `/admin?error=modulo_inactivo`). Incluye las páginas y actions de cursos que hoy existen (se traducen y pasan a subida directa en C2b).
- Cliente suspendido: aviso "panel suspendido" en su idioma en todo `/admin` (también en el login).
- El cliente edita (lista blanca en el servidor): servicios (alta, edición, baja), horario de atención, minutos entre turnos, horas mínimas de cancelación, modo de pago y porcentaje de seña, turnos (completar, cancelar), textos de inicio y "sobre mí", testimonios, preguntas frecuentes y la galería. **No** edita colores, logo, foto, contacto, módulos ni credenciales (master).
- Migración `0020`: `modo_pago`, `galeria`, `preguntas_frecuentes`. Test de aislamiento extendido.
- Sitio público: secciones de galería y preguntas frecuentes, botón flotante de WhatsApp, menú solo con secciones que tienen contenido, reserva según el modo de pago y textos que se adaptan.
- Pendientes: borrar un servicio con turnos da un error claro; links del menú a secciones vacías ocultos; pendientes menores de la revisión de C1 (abajo).

**Fuera de C2a:**

- **C2b:** cursos del panel traducidos y con subida directa del navegador a Storage (videos y archivos), borrado de cursos con compras con error claro, favicon por cliente.
- **Etapa D:** OAuth de Mercado Pago, Google Calendar por cliente, envío por el Gmail de cada cliente y plantillas de emails transaccionales con la marca y el idioma. **Etapa E:** crons.

**Decisiones ya tomadas (no se reabren):**

1. Panel del cliente en el idioma del tenant (es/pt): todas las pantallas, formularios y mensajes; mensajes con clave como en el master. Solo se ven las secciones de los módulos habilitados, y el servidor lo exige en cada página y action. Cliente suspendido: aviso amigable en vez de la pantalla de error.
2. El cliente edita (solo campos de una lista blanca, en el servidor): servicios, configuración (horario, minutos entre turnos, horas mínimas de cancelación, modo de pago, % de seña), turnos (listar, cancelar, completar), cursos, textos de inicio y "sobre mí" (`inicio_titulo`, `inicio_destacado`, `inicio_texto`, `sobre_mi_titulo`, `sobre_mi_texto`). No edita colores, logo, foto, contacto, módulos ni credenciales.
3. Módulos con tablas nuevas (migraciones ≥ 0020; RLS activado sin policies; sin privilegios para `anon` ni `authenticated`; el sitio lee con la service role; test de aislamiento extendido, también la sección "Permisos de la base"): `galeria` (`tenant_id`, `imagen_url`, `descripcion`, `orden`, `activo`; el cliente sube imágenes al bucket `sitios` en `{tenant_id}/galeria-*.ext` con la validación de bytes mágicos y el Content-Type del formato detectado; borrar una imagen borra el objeto), `preguntas_frecuentes` (`tenant_id`, `pregunta`, `respuesta`, `orden`, `activo`) y testimonios editables (la tabla existe). Secciones públicas de galería y preguntas con el módulo activo (títulos traducidos), links del menú solo a secciones con contenido. Botón flotante de WhatsApp con `modulo_whatsapp` y número cargado (`aria-label` traducido, link con `whatsappLink`).
4. Modo de pago (`configuracion_negocio.modo_pago`: `ninguno` | `sena` | `total`, `sena` para las filas existentes): `ninguno` confirma el turno al reservar (sin Mercado Pago; evento de Calendar y email por el camino existente con su condición), `sena` es lo de hoy, `total` cobra el precio completo. Los textos públicos se adaptan. El chequeo `usaCredencialesGlobales` queda como está (lo reemplaza la etapa D).
5. Subidas de cursos directas a Storage: en C2b.
6. Pendientes: borrar un servicio/curso con turnos/accesos da un error claro (curso en C2b); links a secciones vacías ocultos; favicon por cliente (C2b); menores de C1: `EditorColores` compara el hex normalizado; `e2e-master.mjs` nunca imprime `link.href` (solo host y path) ni el error SMTP; la limpieza de `e2e-master.mjs` cuenta el error del select de `perfiles` y busca el usuario del cliente por email como respaldo; el nombre del remitente de Gmail usa `CONTROL`; `data-1p-ignore`/`data-lpignore` en los secretos de Mercado Pago; el aviso en vivo menciona el mínimo 3:1.
7. Fuera de C2: OAuth de MP, Calendar por cliente, Gmail por cliente, plantillas de emails transaccionales (D); crons (E).
8. Pruebas: tests unitarios de la lógica pura (secciones por módulo, montos por modo de pago, listas blancas, reglas de paths); `test-aislamiento.mjs` cubre las tablas nuevas; `scripts/e2e-cliente.mjs` de punta a punta; regresión de `e2e-login.mjs`, `e2e-master.mjs` y aislamiento.
9. Git y proceso: todo en `main`, un commit por task con rutas explícitas y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nunca se agregan `docs/resumen-arquitectura-y-desarrollo.md` ni `.env.local`. Reglas del servidor de desarrollo más abajo.

**Decisiones tomadas al planificar C2a:**

1. **Secciones del panel** (`SECCIONES_PANEL`): turnos (módulo turnos), servicios, horarios y reglas (`/admin/configuracion`), textos (siempre), cursos (módulo cursos), testimonios, galería y preguntas frecuentes (sus módulos). Servicios, horarios y textos no dependen de un módulo: los servicios y el horario se muestran en el sitio aunque no haya reserva online. Dentro de "Horarios y reglas", las reglas de turnos (cancelación, minutos entre turnos, modo de pago, seña) solo aparecen y se guardan con el módulo turnos; dentro de "Textos", los de "sobre mí" solo con su módulo. El botón de WhatsApp no tiene sección (el número es del master).
2. **Módulo apagado:** página → `notFound()` (404 con `src/app/admin/not-found.tsx` traducido); action → `redirect("/admin?error=modulo_inactivo")` antes de leer el formulario. Un `notFound()` dentro de una action no tiene una pantalla clara; el redirect sí, y la E2E lo puede comprobar (303).
3. **Idioma del panel:** el tenant sale del host con `tenantDelHost()` (activo o suspendido; nuevo en `actual.ts`; `tenantDelRequest()` pasa a usarlo y sigue devolviendo solo activos). El proxy pasa `x-tenant-slug` también en `/admin`, así el layout raíz pone `<html lang="pt-BR">` en el panel de un cliente de Brasil. Las pantallas de ingreso del cliente usan el mismo idioma; las del master siguen en español. `src/lib/auth/mensajes.ts` pasa a tener los textos en es/pt (`mensajeError(clave, idioma = "es")`).
4. **Pantalla de error del panel:** ya no muestra `error.message` (en producción Next lo reemplaza por un texto genérico de todos modos, y en desarrollo el detalle está en la consola y el overlay). Muestra un texto traducido y el `digest`.
5. **Mensajes del panel** (`src/lib/panel/mensajes.ts`): tablas `Record<clave, Textos>`; `ClaveError` y `ClaveInfo` salen de las tablas, así una action no puede redirigir con una clave sin texto (no compila).
6. **Nuevas tablas:** `galeria.imagen_url` (no `imagen_path` como decía el spec 4.1): la URL pública armada por la app, igual que `tenant_marca.logo_url`; el path del objeto se deduce con `pathDeImagenGaleria`, que solo reconoce imágenes de la galería de ese tenant. Path `{tenant_id}/galeria-{ms}-{8 hex}.{ext}` (el sufijo aleatorio evita choques de dos subidas en el mismo milisegundo). Restricciones de largo también en la base (defensa en profundidad). Tope de 30 imágenes por galería (`galeria_llena`): acota el espacio de Storage por cliente.
7. **`modo_pago` por defecto:** la columna se agrega con `default 'sena'` (las filas existentes, o sea Gisel, quedan como hoy) y después el default pasa a `'ninguno'`: un cliente nuevo no tiene Mercado Pago hasta la etapa D, y con `sena` toda reserva suya fallaría. `crear_tenant` no cambia (usa el default). Se agrega `check (sena_porcentaje between 1 and 100)` (verificado con un SELECT: la única fila tiene 50).
8. **Montos:** `cobroDeReserva(modo, porcentaje, precios)` → `sin_cobro` (modo `ninguno`), `cobro` (montos por servicio y total) o `sin_precio` (modo con pago y total 0, por ejemplo servicios "a consultar"). `sin_precio` se rechaza **antes** de crear los turnos con un mensaje claro; hoy esos turnos quedaban pendientes 15 minutos y Mercado Pago fallaba. La seña sigue redondeada como hoy (`calcularMontoSena`); en `total` se cobra el precio tal cual (BRL con centavos). `turnos.monto_sena` guarda lo cobrado (seña o total) y queda null sin pago anticipado.
9. **Confirmación sin pago anticipado** (`src/lib/turnos/confirmacion.ts`): `crearEventoDeTurno` y `enviarConfirmacionDeTurno`, extraídas del webhook y usadas por el webhook y por la reserva. Las dos exigen `usaCredencialesGlobales(slug)`: el Calendar y el Gmail del `.env` (y la plantilla del email, con el logo de Gisel) son de un solo cliente. **Cambio de comportamiento:** el email del webhook antes no tenía esa condición; solo Gisel llega al webhook (Mercado Pago ya exige `usaCredencialesGlobales`), así que para Gisel nada cambia, y un cliente sin pago anticipado no recibe un email con la marca de otro. Los demás clientes no reciben email de confirmación hasta la etapa D: la página de gracias les muestra el turno confirmado y el link para gestionarlo.
10. **Gracias con el turno:** la reserva sin pago devuelve `/turnos/gracias?turno=<token_gestion>` (el primero si se reservaron varios servicios). La página muestra el turno confirmado con un botón "Ver o gestionar mi turno". El token ya es la credencial del turno (es el mismo link del email).
11. **Textos de gestión del turno:** el aviso de turno pendiente deja de mencionar la seña ("si ya hiciste el pago"), y el de cancelado depende de lo cobrado: seña (texto actual), pago total (sin prometer reembolso) o nada.
12. **Menú del sitio:** `enlacesDelSitio(modulos, contenido)`. El layout consulta si hay al menos un servicio activo, testimonio activo, imagen activa, pregunta activa y curso publicado (`limit(1)`, solo con el módulo activo). "Sobre mí" depende solo del módulo (la sección siempre tiene contenido: título o nombre). "Contacto" siempre (el pie).
13. **Botón flotante de WhatsApp:** `aria-label` "Escribinos por WhatsApp" / "Fale com a gente no WhatsApp" (distinto del botón "Falar no WhatsApp" de la sección de contacto, así la E2E distingue los dos), color primario de la marca (contraste de botón ya validado en C1), ícono SVG propio (globo de chat), sin logos de terceros.
14. **Formularios:** cada elemento de una lista (servicio, testimonio, pregunta, imagen) tiene su formulario de edición y un formulario aparte para eliminar (ids `form-<cosa>-<id>` y `form-eliminar-<cosa>-<id>`), porque un botón con `formAction` lleva su propio `$ACTION_ID_` y la E2E (sin JavaScript) toma el primero del formulario. Editar o borrar filtra por tenant y por id y pide `select("id")`: 0 filas → `?error=id` (un id de otro cliente no toca nada; la E2E lo prueba con un testimonio de Gisel).
15. **Precios:** se aceptan con punto o coma y hasta 2 decimales (BRL tiene centavos); vacío = 0 ("a consultar", como hoy). El campo usa `step="0.01"` en BRL y `step="1"` en ARS.
16. **Horario:** un día abierto necesita las dos horas (`HH:MM`) y la de inicio antes que la de fin; un día sin horas queda cerrado (como hoy). Hoy un día con una sola hora se cerraba en silencio; ahora es un error (`horario`).
17. **Mercado Pago sin conectar:** la pantalla de horarios y reglas avisa si el sitio no puede cobrar online (sin `MP_ACCESS_TOKEN` o no es el tenant de las credenciales globales) y sugiere "sin pago anticipado" hasta la etapa D.
18. **E2E `scripts/e2e-cliente.mjs`:** los formularios del panel se envían como en `e2e-master.mjs` (sin JavaScript). La reserva y la disponibilidad son server actions que llama un componente de cliente: la E2E las invoca como React (cabecera `Next-Action`, argumentos codificados como `encodeReply`) con el id que Next anota en `.next/dev/server/app/<ruta>/page/server-reference-manifest.json` (verificado en el `.next/dev` actual: `exportedName` por id). Corre desde la raíz del repo.
19. **Pendientes de C1 extra:** `e2e-login.mjs` también imprimía `link.href` (mismo problema que `e2e-master.mjs`): se corrige igual.
20. **E2E de C1 ajustada al panel traducido:** el cliente de `e2e-master.mjs` es de Brasil, así que su panel dice "Olá, Cliente C1" (antes "Hola,"), y con el cliente suspendido el panel muestra "suspenso".

**Riesgos verificados:**

- **Esquema real** (solo SELECT, en una transacción de solo lectura): `configuracion_negocio` (PK `tenant_id`) tiene `sena_porcentaje` (50 en la única fila), `horas_minimas_cancelacion`, `minutos_preparacion_entre_turnos` y `horario_atencion`, sin `modo_pago`. `turnos` referencia `servicios` con `(tenant_id, servicio_id)` **sin** `on delete` (no action): borrar un servicio con turnos da `23503` y hoy la action lo ignora (no-op silencioso). `accesos_curso` → `cursos` igual (C2b). `testimonios` tiene SELECT para `anon` con policy (0016 lo conserva) y 3 filas de Gisel. No existen `galeria` ni `preguntas_frecuentes`. Migraciones aplicadas hasta la 0019. Postgres 17.6. Bucket `sitios` público con 2 MB y PNG/JPEG/WebP.
- **`not-found.tsx` del segmento:** `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`: `notFound()` en una página de `/admin/**` muestra `src/app/admin/not-found.tsx` dentro del layout del panel (con el `IdiomaProvider`), con estado 404.
- **Narrowing con `never`:** las actions usan `if (!x.ok) ir(...)` y después `x.valor`, igual que `src/lib/master/acciones.ts`. Funciona con `ir` importado porque es una declaración de función con tipo de retorno `never` explícito.
- **Textos que la E2E busca en el HTML:** React separa con `<!-- -->` los textos de expresiones distintas (`{a}, {b}`). Los que la E2E busca ("Olá, Cliente C2", "Seu horário está confirmado!") se arman como un solo string.
- **Formato de las server actions llamadas desde JavaScript** (`node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.development.js`, `processReply`): argumentos JSON → cuerpo `text/plain` con el arreglo de argumentos; un `FormData` → multipart con el campo `0` = `["$K1"]` y los campos del formulario con el prefijo `_1_`. La respuesta es el payload de React: la fila `0:` lleva `"a"` con el resultado (o una referencia `"$@<id>"` a otra fila). La E2E resuelve las dos formas.
- **Layout raíz dinámico:** el layout raíz lee `headers()`, así que todas las páginas se renderizan por pedido: un cambio hecho directo en la base (la E2E apaga módulos con la service role) se ve en el próximo GET sin revalidar.

## Servidor de desarrollo (reglas para quien ejecuta)

- El contenedor `esteticagisel-web-1` ocupa el puerto 3000. Antes de `npm run dev`: `docker compose stop`.
- El servidor se levanta con la salida a un log, en background: `LOG="$TEMP/dev-etapa-c2a.log"` y `CABECERA_IP_CONFIABLE=x-real-ip npm run dev > "$LOG" 2>&1` (la variable solo en ese entorno, no en el `.env.local`: la necesitan `e2e-login.mjs` y `e2e-cliente.mjs`). Está listo cuando `grep -c "Ready" "$LOG"` da `1`. Se usa la misma ruta de `LOG` en todos los comandos. Para pasarla a `node`: `"$(cygpath -w "$LOG")"`.
- Para detenerlo, solo su árbol de procesos: `netstat -ano | grep ":3000" | grep LISTENING` da el PID (última columna), y después `taskkill //PID <pid> //T //F`. **Nunca** se matan todos los `node.exe`.
- Al terminar, se reconstruye el contenedor: `docker compose up -d --build --force-recreate`.
- La base: `SUPABASE_DB_URL` funciona (se usó para leer el esquema al planificar). Si `migrar.mjs` falla por conexión o autenticación, hay que detenerse y avisar a Pablo.
- Los scripts E2E se corren desde la raíz del repo (leen `.next/dev/...`).

## Estructura de archivos

**Nuevos**

| Archivo | Responsabilidad |
|---|---|
| `src/lib/panel/secciones.ts` (+test) | Secciones del panel, módulo de cada una, `seccionHabilitada`, `seccionesDelPanel` |
| `src/lib/sitio/enlaces.ts` (+test) | Enlaces del menú del sitio según módulos y contenido |
| `src/lib/panel/limites.ts` | Largos y rangos de los formularios del panel |
| `src/lib/panel/mensajes.ts` (+test) | Mensajes del panel en es/pt por clave y sus tipos |
| `src/lib/turnos/pago.ts` (+test) | Modos de pago, montos de la reserva y textos de cada modo |
| `src/lib/panel/formularios.ts` (+test) | Parsers con lista blanca: servicio, configuración, textos, testimonio, pregunta, imagen; `parsearId`, `esReferenciaEnUso` |
| `supabase/migrations/0020_modo_pago_galeria_faq.sql` | `modo_pago`, `galeria`, `preguntas_frecuentes` |
| `src/lib/panel/servidor.ts` | `tenantDeSeccion`, `tenantDeAccion`, `ir`, `revalidarSitio` (server-only) |
| `src/lib/panel/metadata.ts` | Títulos del panel traducidos (server-only) |
| `src/components/panel/ui.tsx` | Clases comunes y `<Mensajes>` traducido |
| `src/app/admin/not-found.tsx` | 404 del panel traducido |
| `src/app/admin/textos/{page.tsx,actions.ts}` | Textos de inicio y "sobre mí" |
| `src/app/admin/testimonios/{page.tsx,actions.ts}` | Testimonios |
| `src/app/admin/preguntas/{page.tsx,actions.ts}` | Preguntas frecuentes |
| `src/app/admin/galeria/{page.tsx,actions.ts}` | Galería |
| `src/lib/data/preguntas.ts`, `src/lib/data/galeria.ts`, `src/lib/data/contenido.ts` | Lecturas de preguntas, galería y del contenido del sitio |
| `src/components/landing/Galeria.tsx`, `PreguntasFrecuentes.tsx`, `BotonWhatsapp.tsx` | Secciones públicas y botón flotante |
| `src/lib/turnos/confirmacion.ts` | Evento de Calendar y email de un turno confirmado (server-only) |
| `scripts/e2e-cliente.mjs` | Prueba de punta a punta del panel del cliente |

**Reescritos completos:** `src/lib/auth/mensajes.ts` (+test), `src/components/auth/PaginasAuth.tsx`, `src/app/admin/{layout,page,error}.tsx`, `src/app/admin/servicios/{page.tsx,actions.ts}`, `src/app/admin/configuracion/{page.tsx,actions.ts}`, `src/app/admin/turnos/{page.tsx,actions.ts}`, `src/components/landing/Nav.tsx`, `src/app/sitio/[tenant]/{layout,page}.tsx`, `src/app/sitio/[tenant]/turnos/actions.ts`, `src/app/sitio/[tenant]/turnos/gracias/page.tsx`, `src/app/api/webhooks/mercadopago/route.ts`.

**Modificados puntualmente:** `src/lib/master/formularios.ts` (+test), `src/lib/storage/imagenes.ts` (+test), `src/lib/storage/sitios.ts`, `src/lib/turnos/horario.ts` (+test), `src/lib/tenant/consultas.ts`, `src/lib/tenant/actual.ts`, `src/lib/data/{types,testimonios,turnos}.ts`, `src/components/landing/SitioSuspendido.tsx`, `src/proxy.ts`, `src/app/layout.tsx`, `src/app/admin/{login,recuperar,verificar,restablecer}/page.tsx`, `src/app/admin/cursos/{page.tsx,actions.ts}`, `src/app/admin/cursos/[id]/page.tsx`, `src/app/admin/cursos/[id]/video-preview/route.ts`, `src/components/turnos/{ReservaForm,GestionPanel}.tsx`, `src/app/sitio/[tenant]/turnos/page.tsx`, `src/app/sitio/[tenant]/turnos/gestion/[token]/page.tsx`, `src/components/master/EditorColores.tsx`, `src/app/master/clientes/[slug]/credenciales/page.tsx`, `scripts/test-aislamiento.mjs`, `scripts/e2e-master.mjs`, `scripts/e2e-login.mjs`.

**Commits:** cada task compila (`npx tsc --noEmit`), pasa los tests y termina en su propio commit. **No usar `git add -A`:** `docs/resumen-arquitectura-y-desarrollo.md` tiene cambios previos de Pablo, y `.env.local` nunca se agrega.

Formato de todos los commits:

```bash
git commit -F - <<'EOF'
<tipo>(<alcance>): <descripción>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---
### Task 1: Secciones del panel, enlaces del sitio y mensajes traducidos

**Files:**
- Create: `src/lib/panel/secciones.ts`, `src/lib/panel/secciones.test.ts`
- Create: `src/lib/sitio/enlaces.ts`, `src/lib/sitio/enlaces.test.ts`
- Create: `src/lib/panel/limites.ts`
- Create: `src/lib/panel/mensajes.ts`, `src/lib/panel/mensajes.test.ts`

- [ ] **Step 1: Tests que fallan**

`src/lib/panel/secciones.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Modulos } from "@/lib/tenant/tipos";
import { SECCIONES_PANEL, seccionHabilitada, seccionesDelPanel } from "./secciones";

const NINGUNO: Modulos = {
  turnos: false,
  cursos: false,
  sobreMi: false,
  testimonios: false,
  galeria: false,
  faq: false,
  whatsapp: false,
};
const TODOS: Modulos = {
  turnos: true,
  cursos: true,
  sobreMi: true,
  testimonios: true,
  galeria: true,
  faq: true,
  whatsapp: true,
};

describe("seccionesDelPanel", () => {
  it("sin módulos: servicios, horarios y reglas, y textos", () => {
    expect(seccionesDelPanel(NINGUNO).map((s) => s.seccion)).toEqual(["servicios", "configuracion", "textos"]);
  });

  it("con todos los módulos: las ocho secciones, en orden", () => {
    expect(seccionesDelPanel(TODOS).map((s) => s.seccion)).toEqual([
      "turnos",
      "servicios",
      "configuracion",
      "textos",
      "cursos",
      "testimonios",
      "galeria",
      "preguntas",
    ]);
  });

  it("cada módulo agrega solo su sección; WhatsApp y sobre mí no tienen sección propia", () => {
    expect(seccionesDelPanel({ ...NINGUNO, faq: true }).map((s) => s.seccion)).toEqual([
      "servicios",
      "configuracion",
      "textos",
      "preguntas",
    ]);
    expect(seccionesDelPanel({ ...NINGUNO, whatsapp: true, sobreMi: true })).toHaveLength(3);
  });
});

describe("seccionHabilitada", () => {
  it("depende del módulo de la sección", () => {
    expect(seccionHabilitada(NINGUNO, "servicios")).toBe(true);
    expect(seccionHabilitada(NINGUNO, "configuracion")).toBe(true);
    expect(seccionHabilitada(NINGUNO, "textos")).toBe(true);
    expect(seccionHabilitada(NINGUNO, "turnos")).toBe(false);
    expect(seccionHabilitada({ ...NINGUNO, turnos: true }, "turnos")).toBe(true);
    expect(seccionHabilitada({ ...NINGUNO, faq: true }, "preguntas")).toBe(true);
    expect(seccionHabilitada({ ...TODOS, galeria: false }, "galeria")).toBe(false);
    expect(seccionHabilitada({ ...TODOS, testimonios: false }, "testimonios")).toBe(false);
    expect(seccionHabilitada(TODOS, "cursos")).toBe(true);
  });
});

describe("SECCIONES_PANEL", () => {
  it("rutas únicas bajo /admin y textos en los dos idiomas", () => {
    const rutas = SECCIONES_PANEL.map((s) => s.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
    for (const s of SECCIONES_PANEL) {
      expect(s.ruta).toMatch(/^\/admin\/[a-z]+$/);
      for (const textos of [s.titulo, s.descripcion]) {
        expect(textos.es.length, s.seccion).toBeGreaterThan(0);
        expect(textos.pt.length, s.seccion).toBeGreaterThan(0);
      }
    }
  });
});
```

`src/lib/sitio/enlaces.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Modulos } from "@/lib/tenant/tipos";
import { DESTINO_ENLACE, enlacesDelSitio, type ContenidoSitio } from "./enlaces";

const NINGUNO: Modulos = {
  turnos: false,
  cursos: false,
  sobreMi: false,
  testimonios: false,
  galeria: false,
  faq: false,
  whatsapp: false,
};
const TODOS: Modulos = {
  turnos: true,
  cursos: true,
  sobreMi: true,
  testimonios: true,
  galeria: true,
  faq: true,
  whatsapp: true,
};
const VACIO: ContenidoSitio = { servicios: false, testimonios: false, galeria: false, preguntas: false, cursos: false };
const LLENO: ContenidoSitio = { servicios: true, testimonios: true, galeria: true, preguntas: true, cursos: true };

describe("enlacesDelSitio", () => {
  it("sin módulos ni contenido: solo contacto (el pie siempre está)", () => {
    expect(enlacesDelSitio(NINGUNO, VACIO)).toEqual(["contacto"]);
  });

  it("servicios no depende de un módulo, solo de que haya alguno activo", () => {
    expect(enlacesDelSitio(NINGUNO, { ...VACIO, servicios: true })).toEqual(["servicios", "contacto"]);
  });

  it("un módulo activo sin contenido no se enlaza (sobre mí siempre tiene contenido)", () => {
    expect(enlacesDelSitio(TODOS, VACIO)).toEqual(["sobre-mi", "contacto"]);
  });

  it("el contenido de un módulo apagado no se enlaza", () => {
    expect(enlacesDelSitio(NINGUNO, LLENO)).toEqual(["servicios", "contacto"]);
  });

  it("con todo: el orden del menú", () => {
    expect(enlacesDelSitio(TODOS, LLENO)).toEqual([
      "servicios",
      "sobre-mi",
      "testimonios",
      "galeria",
      "preguntas",
      "cursos",
      "contacto",
    ]);
  });
});

describe("DESTINO_ENLACE", () => {
  it("cada enlace apunta a su sección y tiene etiqueta en los dos idiomas", () => {
    expect(DESTINO_ENLACE.preguntas.href).toBe("/#preguntas-frecuentes");
    expect(DESTINO_ENLACE.galeria.href).toBe("/#galeria");
    expect(DESTINO_ENLACE.cursos.href).toBe("/cursos");
    for (const [clave, destino] of Object.entries(DESTINO_ENLACE)) {
      expect(destino.href, clave).toMatch(/^\//);
      expect(destino.etiqueta.es, clave).toBeTruthy();
      expect(destino.etiqueta.pt, clave).toBeTruthy();
    }
  });
});
```

`src/lib/panel/mensajes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { ProblemaImagen } from "@/lib/storage/imagenes";
import { mensajeError, mensajeInfo, type ClaveError, type ClaveInfo } from "./mensajes";

describe("mensajes del panel", () => {
  it("traduce cada clave al idioma del cliente", () => {
    expect(mensajeError("es", "modulo_inactivo")).toBe("Esa sección no está habilitada para tu sitio.");
    expect(mensajeError("pt", "modulo_inactivo")).toBe("Essa seção não está habilitada para o seu site.");
    expect(mensajeInfo("es", "guardado")).toBe("Cambios guardados.");
    expect(mensajeInfo("pt", "guardado")).toBe("Alterações salvas.");
  });

  it("no muestra textos arbitrarios de la URL", () => {
    expect(mensajeError("es", undefined)).toBeNull();
    expect(mensajeError("pt", "<script>alert(1)</script>")).toBeNull();
    expect(mensajeError("es", "toString")).toBeNull();
    expect(mensajeInfo("pt", "constructor")).toBeNull();
  });

  it("los problemas de imagen y cada error de las actions tienen texto propio en los dos idiomas", () => {
    // Si ProblemaImagen tuviera una clave que no está en ERRORES, esto no compilaría.
    const imagen: ProblemaImagen[] = ["imagen_vacia", "imagen_grande", "imagen_tipo"];
    const errores: ClaveError[] = [
      ...imagen,
      "error",
      "modulo_inactivo",
      "id",
      "nombre",
      "duracion",
      "precio",
      "orden",
      "texto_invalido",
      "texto_largo",
      "inicio_titulo",
      "horario",
      "horas_cancelacion",
      "minutos_entre_turnos",
      "modo_pago",
      "sena_porcentaje",
      "servicio_con_turnos",
      "testimonio_nombre",
      "testimonio_texto",
      "pregunta",
      "respuesta",
      "descripcion",
      "galeria_llena",
    ];
    for (const clave of errores) {
      const es = mensajeError("es", clave);
      const pt = mensajeError("pt", clave);
      expect(es, clave).toBeTruthy();
      expect(pt, clave).toBeTruthy();
      expect(pt, clave).not.toBe(es);
    }
    const infos: ClaveInfo[] = ["guardado", "creado", "eliminado", "imagen_subida", "turno_completado", "turno_cancelado"];
    for (const clave of infos) {
      expect(mensajeInfo("es", clave), clave).toBeTruthy();
      expect(mensajeInfo("pt", clave), clave).not.toBe(mensajeInfo("es", clave));
    }
  });
});
```

- [ ] **Step 2: Correr los tests y ver que fallan**

Run: `npx vitest run src/lib/panel src/lib/sitio`
Expected: FAIL (no existen `./secciones`, `./enlaces` ni `./mensajes`).

- [ ] **Step 3: Implementación**

`src/lib/panel/secciones.ts`:

```ts
import type { Textos } from "@/lib/i18n/textos";
import type { Modulos } from "@/lib/tenant/tipos";

/**
 * Secciones del panel del cliente y el módulo que habilita cada una (null = siempre).
 * Puro: lo usan el menú del layout, el inicio del panel y los chequeos del servidor
 * (tenantDeSeccion y tenantDeAccion), así el menú y los permisos no se desincronizan.
 */
export type SeccionPanel =
  | "turnos"
  | "servicios"
  | "configuracion"
  | "textos"
  | "cursos"
  | "testimonios"
  | "galeria"
  | "preguntas";

export type DefinicionSeccion = {
  seccion: SeccionPanel;
  ruta: string;
  modulo: keyof Modulos | null;
  titulo: Textos;
  descripcion: Textos;
};

export const SECCIONES_PANEL: readonly DefinicionSeccion[] = [
  {
    seccion: "turnos",
    ruta: "/admin/turnos",
    modulo: "turnos",
    titulo: { es: "Turnos", pt: "Agendamentos" },
    descripcion: { es: "Tu agenda: completar o cancelar turnos.", pt: "Sua agenda: concluir ou cancelar atendimentos." },
  },
  {
    seccion: "servicios",
    ruta: "/admin/servicios",
    modulo: null,
    titulo: { es: "Servicios", pt: "Serviços" },
    descripcion: { es: "Precios, duración y visibilidad.", pt: "Preços, duração e visibilidade." },
  },
  {
    seccion: "configuracion",
    ruta: "/admin/configuracion",
    modulo: null,
    titulo: { es: "Horarios y reglas", pt: "Horários e regras" },
    descripcion: {
      es: "Horario de atención, cancelaciones y forma de pago.",
      pt: "Horário de atendimento, cancelamentos e forma de pagamento.",
    },
  },
  {
    seccion: "textos",
    ruta: "/admin/textos",
    modulo: null,
    titulo: { es: "Textos", pt: "Textos" },
    descripcion: { es: "Textos de inicio y “sobre mí”.", pt: "Textos da página inicial e “sobre mim”." },
  },
  {
    seccion: "cursos",
    ruta: "/admin/cursos",
    modulo: "cursos",
    titulo: { es: "Cursos", pt: "Cursos" },
    descripcion: { es: "Cursos online, videos y compras.", pt: "Cursos online, vídeos e compras." },
  },
  {
    seccion: "testimonios",
    ruta: "/admin/testimonios",
    modulo: "testimonios",
    titulo: { es: "Testimonios", pt: "Depoimentos" },
    descripcion: { es: "Lo que dicen tus clientes.", pt: "O que seus clientes dizem." },
  },
  {
    seccion: "galeria",
    ruta: "/admin/galeria",
    modulo: "galeria",
    titulo: { es: "Galería", pt: "Galeria" },
    descripcion: { es: "Fotos de tus trabajos.", pt: "Fotos dos seus trabalhos." },
  },
  {
    seccion: "preguntas",
    ruta: "/admin/preguntas",
    modulo: "faq",
    titulo: { es: "Preguntas frecuentes", pt: "Perguntas frequentes" },
    descripcion: { es: "Respuestas a las consultas de siempre.", pt: "Respostas para as dúvidas mais comuns." },
  },
];

function habilitada(def: DefinicionSeccion, modulos: Modulos): boolean {
  return def.modulo === null || modulos[def.modulo];
}

export function seccionHabilitada(modulos: Modulos, seccion: SeccionPanel): boolean {
  const def = SECCIONES_PANEL.find((s) => s.seccion === seccion);
  return def !== undefined && habilitada(def, modulos);
}

/** Secciones visibles con estos módulos, en el orden del menú. */
export function seccionesDelPanel(modulos: Modulos): DefinicionSeccion[] {
  return SECCIONES_PANEL.filter((s) => habilitada(s, modulos));
}
```

`src/lib/sitio/enlaces.ts`:

```ts
import type { Textos } from "@/lib/i18n/textos";
import type { Modulos } from "@/lib/tenant/tipos";

/**
 * Menú del sitio público: solo enlaza secciones que se muestran y tienen contenido. Puro:
 * el layout del sitio le pasa lo que encontró en la base (src/lib/data/contenido.ts).
 */
export type EnlaceSitio = "servicios" | "sobre-mi" | "testimonios" | "galeria" | "preguntas" | "cursos" | "contacto";

/** ¿Hay al menos un elemento visible en cada sección? */
export type ContenidoSitio = {
  servicios: boolean;
  testimonios: boolean;
  galeria: boolean;
  preguntas: boolean;
  cursos: boolean;
};

export const DESTINO_ENLACE: Record<EnlaceSitio, { href: string; etiqueta: Textos }> = {
  servicios: { href: "/#servicios", etiqueta: { es: "Servicios", pt: "Serviços" } },
  "sobre-mi": { href: "/#sobre-mi", etiqueta: { es: "Sobre mí", pt: "Sobre mim" } },
  testimonios: { href: "/#testimonios", etiqueta: { es: "Testimonios", pt: "Depoimentos" } },
  galeria: { href: "/#galeria", etiqueta: { es: "Galería", pt: "Galeria" } },
  preguntas: { href: "/#preguntas-frecuentes", etiqueta: { es: "Preguntas frecuentes", pt: "Perguntas frequentes" } },
  cursos: { href: "/cursos", etiqueta: { es: "Cursos", pt: "Cursos" } },
  contacto: { href: "/#contacto", etiqueta: { es: "Contacto", pt: "Contato" } },
};

export function enlacesDelSitio(modulos: Modulos, contenido: ContenidoSitio): EnlaceSitio[] {
  const enlaces: EnlaceSitio[] = [];
  if (contenido.servicios) enlaces.push("servicios");
  // La sección "sobre mí" siempre tiene contenido (su título o el nombre del negocio).
  if (modulos.sobreMi) enlaces.push("sobre-mi");
  if (modulos.testimonios && contenido.testimonios) enlaces.push("testimonios");
  if (modulos.galeria && contenido.galeria) enlaces.push("galeria");
  if (modulos.faq && contenido.preguntas) enlaces.push("preguntas");
  if (modulos.cursos && contenido.cursos) enlaces.push("cursos");
  enlaces.push("contacto");
  return enlaces;
}
```

`src/lib/panel/limites.ts`:

```ts
import { LIMITES } from "@/lib/master/limites";

/** Largos y rangos de los formularios del panel del cliente (validación, mensajes y atributos de los campos). */
export const LIMITES_PANEL = {
  nombre: 80,
  /** Los mismos que valida el master para los textos de la marca. */
  titulo: LIMITES.titulo,
  texto: LIMITES.texto,
  duracionMin: 5,
  duracionMax: 600,
  precioMax: 10_000_000,
  ordenMax: 999,
  horasCancelacionMax: 720,
  minutosEntreTurnosMax: 240,
  testimonio: 1000,
  pregunta: 300,
  respuesta: 2000,
  descripcionImagen: 200,
  imagenesGaleria: 30,
} as const;
```

`src/lib/panel/mensajes.ts`:

```ts
import type { Idioma, Textos } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "./limites";

/**
 * Textos del panel del cliente por clave, en el idioma del cliente. Las actions redirigen
 * con ?error= u ?ok= y la clave, nunca con un texto: lo que no está acá no se muestra. Los
 * tipos salen de las tablas, así que una action no puede usar una clave sin texto.
 * Puro y liviano: lo usan componentes de cliente.
 */
const ERRORES = {
  error: { es: "No se pudo completar la acción. Probá de nuevo.", pt: "Não foi possível concluir a ação. Tente novamente." },
  modulo_inactivo: {
    es: "Esa sección no está habilitada para tu sitio.",
    pt: "Essa seção não está habilitada para o seu site.",
  },
  id: { es: "No encontramos ese elemento.", pt: "Não encontramos esse item." },
  nombre: {
    es: `El nombre es obligatorio (hasta ${L.nombre} caracteres).`,
    pt: `O nome é obrigatório (até ${L.nombre} caracteres).`,
  },
  duracion: {
    es: `La duración tiene que ser un número entero de minutos, entre ${L.duracionMin} y ${L.duracionMax}.`,
    pt: `A duração precisa ser um número inteiro de minutos, entre ${L.duracionMin} e ${L.duracionMax}.`,
  },
  precio: {
    es: "El precio tiene que ser un número mayor o igual a 0, con hasta 2 decimales.",
    pt: "O preço precisa ser um número maior ou igual a 0, com até 2 casas decimais.",
  },
  orden: {
    es: `El orden tiene que ser un número entero entre 0 y ${L.ordenMax}.`,
    pt: `A ordem precisa ser um número inteiro entre 0 e ${L.ordenMax}.`,
  },
  texto_invalido: { es: "Algún texto tiene caracteres no permitidos.", pt: "Algum texto tem caracteres não permitidos." },
  texto_largo: { es: "Algún texto supera el largo permitido.", pt: "Algum texto ultrapassa o tamanho permitido." },
  inicio_titulo: {
    es: `El título de inicio es obligatorio (hasta ${L.titulo} caracteres).`,
    pt: `O título da página inicial é obrigatório (até ${L.titulo} caracteres).`,
  },
  horario: {
    es: "Revisá el horario: cada día abierto necesita hora de inicio y de fin, y el inicio tiene que ser antes del fin.",
    pt: "Revise o horário: cada dia aberto precisa de horário de início e de fim, e o início precisa ser antes do fim.",
  },
  horas_cancelacion: {
    es: `Las horas mínimas para cancelar tienen que ser un número entero entre 0 y ${L.horasCancelacionMax}.`,
    pt: `As horas mínimas para cancelar precisam ser um número inteiro entre 0 e ${L.horasCancelacionMax}.`,
  },
  minutos_entre_turnos: {
    es: `Los minutos entre turnos tienen que ser un número entero entre 0 y ${L.minutosEntreTurnosMax}.`,
    pt: `Os minutos entre atendimentos precisam ser um número inteiro entre 0 e ${L.minutosEntreTurnosMax}.`,
  },
  modo_pago: { es: "Elegí cómo se paga al reservar.", pt: "Escolha como se paga ao agendar." },
  sena_porcentaje: {
    es: "El porcentaje de seña tiene que ser un número entero entre 1 y 100.",
    pt: "A porcentagem do sinal precisa ser um número inteiro entre 1 e 100.",
  },
  servicio_con_turnos: {
    es: "Este servicio tiene turnos registrados y no se puede eliminar. Desmarcá “activo” para ocultarlo del sitio.",
    pt: "Este serviço tem agendamentos registrados e não pode ser excluído. Desmarque “ativo” para ocultá-lo do site.",
  },
  testimonio_nombre: {
    es: `El nombre de quien opina es obligatorio (hasta ${L.nombre} caracteres).`,
    pt: `O nome de quem dá o depoimento é obrigatório (até ${L.nombre} caracteres).`,
  },
  testimonio_texto: {
    es: `El testimonio es obligatorio (hasta ${L.testimonio} caracteres).`,
    pt: `O depoimento é obrigatório (até ${L.testimonio} caracteres).`,
  },
  pregunta: {
    es: `La pregunta es obligatoria (hasta ${L.pregunta} caracteres, en una línea).`,
    pt: `A pergunta é obrigatória (até ${L.pregunta} caracteres, em uma linha).`,
  },
  respuesta: {
    es: `La respuesta es obligatoria (hasta ${L.respuesta} caracteres).`,
    pt: `A resposta é obrigatória (até ${L.respuesta} caracteres).`,
  },
  descripcion: {
    es: `La descripción tiene hasta ${L.descripcionImagen} caracteres, en una línea.`,
    pt: `A descrição tem até ${L.descripcionImagen} caracteres, em uma linha.`,
  },
  imagen_vacia: { es: "Elegí una imagen.", pt: "Escolha uma imagem." },
  imagen_grande: { es: "La imagen pesa más de 2 MB.", pt: "A imagem tem mais de 2 MB." },
  imagen_tipo: { es: "La imagen tiene que ser PNG, JPG o WebP.", pt: "A imagem precisa ser PNG, JPG ou WebP." },
  galeria_llena: {
    es: `La galería ya tiene ${L.imagenesGaleria} imágenes: eliminá alguna para subir otra.`,
    pt: `A galeria já tem ${L.imagenesGaleria} imagens: exclua alguma para enviar outra.`,
  },
} satisfies Record<string, Textos>;

const INFOS = {
  guardado: { es: "Cambios guardados.", pt: "Alterações salvas." },
  creado: { es: "Listo, se agregó.", pt: "Pronto, foi adicionado." },
  eliminado: { es: "Se eliminó.", pt: "Foi excluído." },
  imagen_subida: { es: "Imagen subida.", pt: "Imagem enviada." },
  turno_completado: { es: "Turno marcado como completado.", pt: "Atendimento marcado como concluído." },
  turno_cancelado: { es: "Turno cancelado.", pt: "Agendamento cancelado." },
} satisfies Record<string, Textos>;

export type ClaveError = keyof typeof ERRORES;
export type ClaveInfo = keyof typeof INFOS;

function buscar(tabla: Record<string, Textos>, idioma: Idioma, clave: string | undefined): string | null {
  return clave !== undefined && Object.prototype.hasOwnProperty.call(tabla, clave) ? tabla[clave][idioma] : null;
}

export function mensajeError(idioma: Idioma, clave: string | undefined): string | null {
  return buscar(ERRORES, idioma, clave);
}

export function mensajeInfo(idioma: Idioma, clave: string | undefined): string | null {
  return buscar(INFOS, idioma, clave);
}
```

- [ ] **Step 4: Correr los tests y ver que pasan**

Run: `npx vitest run src/lib/panel src/lib/sitio && npx tsc --noEmit`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/panel/secciones.ts src/lib/panel/secciones.test.ts src/lib/sitio/enlaces.ts src/lib/sitio/enlaces.test.ts src/lib/panel/limites.ts src/lib/panel/mensajes.ts src/lib/panel/mensajes.test.ts
git commit -F - <<'EOF'
feat(panel): secciones por módulo, enlaces del sitio y mensajes en es/pt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Modo de pago y montos de la reserva

**Files:**
- Create: `src/lib/turnos/pago.ts`, `src/lib/turnos/pago.test.ts`

- [ ] **Step 1: Test que falla**

`src/lib/turnos/pago.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cobroDeReserva, detalleCobro, esModoPago, MODOS_PAGO, NOMBRE_MODO_PAGO, textoModoPago } from "./pago";

describe("esModoPago", () => {
  it("acepta los tres modos y nada más", () => {
    expect(MODOS_PAGO).toEqual(["ninguno", "sena", "total"]);
    for (const m of MODOS_PAGO) expect(esModoPago(m), m).toBe(true);
    for (const m of ["", "SENA", "gratis", null, undefined, 1]) expect(esModoPago(m), String(m)).toBe(false);
  });
});

describe("cobroDeReserva", () => {
  it("sin pago anticipado: no se cobra nada", () => {
    expect(cobroDeReserva("ninguno", 50, [1000, 2000])).toEqual({ tipo: "sin_cobro" });
  });

  it("seña: el porcentaje de cada servicio, redondeado como hoy", () => {
    expect(cobroDeReserva("sena", 50, [1000, 3001])).toEqual({ tipo: "cobro", montos: [500, 1501], total: 2001 });
    expect(cobroDeReserva("sena", 30, [0, 1000])).toEqual({ tipo: "cobro", montos: [0, 300], total: 300 });
  });

  it("pago total: el precio de cada servicio, con centavos", () => {
    expect(cobroDeReserva("total", 50, [1000, 250.5])).toEqual({ tipo: "cobro", montos: [1000, 250.5], total: 1250.5 });
  });

  it("con pago y nada para cobrar (servicios a consultar): sin_precio", () => {
    expect(cobroDeReserva("sena", 50, [0])).toEqual({ tipo: "sin_precio" });
    expect(cobroDeReserva("total", 50, [0, 0])).toEqual({ tipo: "sin_precio" });
  });
});

describe("textos de cada modo", () => {
  it("nombre y texto del sitio en los dos idiomas", () => {
    expect(NOMBRE_MODO_PAGO.ninguno).toEqual({ es: "Sin pago anticipado", pt: "Sem pagamento antecipado" });
    expect(textoModoPago("sena", 30).es).toContain("30%");
    expect(textoModoPago("sena", 30).pt).toContain("30%");
    expect(textoModoPago("ninguno", 30).pt).toContain("Sem pagamento antecipado");
    expect(textoModoPago("total", 30).es).toContain("precio total");
  });

  it("el detalle del cobro incluye el monto", () => {
    expect(detalleCobro("sena", "$ 1.000").es).toContain("$ 1.000");
    expect(detalleCobro("total", "R$ 350,00").pt).toContain("R$ 350,00");
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `npx vitest run src/lib/turnos/pago.test.ts`
Expected: FAIL (no existe `./pago`).

- [ ] **Step 3: Implementación**

`src/lib/turnos/pago.ts`:

```ts
import type { Textos } from "@/lib/i18n/textos";
import { calcularMontoSena } from "./reglas";

/**
 * Modo de pago de las reservas de un cliente (configuracion_negocio.modo_pago):
 * - ninguno: el turno se confirma al reservar, sin Mercado Pago.
 * - sena: se cobra un porcentaje del precio (comportamiento original).
 * - total: se cobra el precio completo.
 * Puro: lo usan la reserva (servidor) y el formulario de reserva (navegador).
 */
export type ModoPago = "ninguno" | "sena" | "total";

export const MODOS_PAGO: readonly ModoPago[] = ["ninguno", "sena", "total"];

export function esModoPago(valor: unknown): valor is ModoPago {
  return typeof valor === "string" && (MODOS_PAGO as readonly string[]).includes(valor);
}

export type CobroReserva =
  | { tipo: "sin_cobro" }
  /** El modo cobra, pero los servicios elegidos no tienen precio (a consultar). */
  | { tipo: "sin_precio" }
  /** Monto de cada servicio (en el orden recibido) y el total a cobrar. */
  | { tipo: "cobro"; montos: number[]; total: number };

export function cobroDeReserva(modo: ModoPago, senaPorcentaje: number, precios: number[]): CobroReserva {
  if (modo === "ninguno") return { tipo: "sin_cobro" };
  const montos = precios.map((precio) => (modo === "total" ? precio : calcularMontoSena(precio, senaPorcentaje)));
  const total = montos.reduce((suma, monto) => suma + monto, 0);
  return total > 0 ? { tipo: "cobro", montos, total } : { tipo: "sin_precio" };
}

export const NOMBRE_MODO_PAGO: Record<ModoPago, Textos> = {
  ninguno: { es: "Sin pago anticipado", pt: "Sem pagamento antecipado" },
  sena: { es: "Seña", pt: "Sinal" },
  total: { es: "Pago total", pt: "Pagamento total" },
};

/** Cómo se paga al reservar (página de turnos del sitio). */
export function textoModoPago(modo: ModoPago, senaPorcentaje: number): Textos {
  if (modo === "ninguno") {
    return {
      es: "Sin pago anticipado: tu turno queda confirmado al reservar.",
      pt: "Sem pagamento antecipado: seu horário fica confirmado ao agendar.",
    };
  }
  if (modo === "sena") {
    return {
      es: `Reservá con una seña del ${senaPorcentaje}% del precio (se descuenta del total).`,
      pt: `Agende com um sinal de ${senaPorcentaje}% do valor (descontado do total).`,
    };
  }
  return {
    es: "Al reservar pagás el precio total del servicio.",
    pt: "Ao agendar, você paga o valor total do serviço.",
  };
}

/** Lo que se cobra en esta reserva, con el monto ya formateado. */
export function detalleCobro(modo: Exclude<ModoPago, "ninguno">, monto: string): Textos {
  if (modo === "sena") {
    return {
      es: `Reservás con una seña de ${monto} (se descuenta del precio total del servicio).`,
      pt: `Você agenda com um sinal de ${monto} (descontado do valor total do serviço).`,
    };
  }
  return {
    es: `Al reservar pagás ${monto}, el precio total.`,
    pt: `Ao agendar, você paga ${monto}, o valor total.`,
  };
}
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `npx vitest run src/lib/turnos/pago.test.ts && npx tsc --noEmit`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/turnos/pago.ts src/lib/turnos/pago.test.ts
git commit -F - <<'EOF'
feat(turnos): modos de pago (sin pago, seña, total) y montos de la reserva

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Validación de los formularios del panel y paths de la galería

**Files:**
- Create: `src/lib/panel/formularios.ts`, `src/lib/panel/formularios.test.ts`
- Modify: `src/lib/master/formularios.ts`, `src/lib/master/formularios.test.ts` (exporta `CONTROL` y `CONTROL_MULTILINEA`; el remitente de Gmail usa `CONTROL`)
- Modify: `src/lib/storage/imagenes.ts`, `src/lib/storage/imagenes.test.ts` (paths de la galería)
- Modify: `src/lib/turnos/horario.ts`, `src/lib/turnos/horario.test.ts` (`nombreDia`)

- [ ] **Step 1: Tests que fallan**

`src/lib/panel/formularios.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  columnasConfiguracion,
  columnasServicio,
  columnasTextosSitio,
  esReferenciaEnUso,
  parsearConfiguracion,
  parsearDescripcionImagen,
  parsearId,
  parsearImagenGaleria,
  parsearMonto,
  parsearPregunta,
  parsearServicio,
  parsearTestimonio,
  parsearTextosSitio,
} from "./formularios";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

const ID = "0f1e2d3c-4b5a-4968-8776-655443322110";

describe("parsearId", () => {
  it("solo uuids (en minúsculas)", () => {
    expect(parsearId(fd({ id: ID }))).toBe(ID);
    expect(parsearId(fd({ id: ID.toUpperCase() }))).toBe(ID);
    expect(parsearId(fd({ otro: ID }), "otro")).toBe(ID);
    expect(parsearId(fd({ id: "1" }))).toBeNull();
    expect(parsearId(fd({ id: `${ID}' or 1=1` }))).toBeNull();
    expect(parsearId(fd({}))).toBeNull();
  });
});

describe("parsearMonto", () => {
  it("punto o coma decimal, hasta 2 decimales, sin negativos", () => {
    expect(parsearMonto("1500", 10_000)).toBe(1500);
    expect(parsearMonto("350,50", 10_000)).toBe(350.5);
    expect(parsearMonto(" 0.99 ", 10_000)).toBe(0.99);
    for (const v of ["-1", "1.234", "1e3", "abc", "", "10001"]) expect(parsearMonto(v, 10_000), v).toBeNull();
  });
});

describe("parsearServicio", () => {
  const SERVICIO = { nombre: " Limpieza facial ", duracion_minutos: "60", precio: "35000", orden: "2", activo: "on" };

  it("valida y devuelve solo las columnas del servicio", () => {
    const r = parsearServicio(fd({ ...SERVICIO, tenant_id: "otro", id: ID }));
    expect(r).toEqual({ ok: true, valor: { nombre: "Limpieza facial", duracionMinutos: 60, precio: 35000, orden: 2, activo: true } });
    if (r.ok) {
      expect(columnasServicio(r.valor)).toEqual({ nombre: "Limpieza facial", duracion_minutos: 60, precio: 35000, orden: 2, activo: true });
    }
  });

  it("precio y orden vacíos valen 0; sin la casilla, inactivo", () => {
    expect(parsearServicio(fd({ nombre: "A", duracion_minutos: "30", precio: "", orden: "" }))).toEqual({
      ok: true,
      valor: { nombre: "A", duracionMinutos: 30, precio: 0, orden: 0, activo: false },
    });
  });

  it("cada error", () => {
    expect(parsearServicio(fd({ ...SERVICIO, nombre: "" }))).toEqual({ ok: false, error: "nombre" });
    expect(parsearServicio(fd({ ...SERVICIO, nombre: "x".repeat(81) }))).toEqual({ ok: false, error: "nombre" });
    expect(parsearServicio(fd({ ...SERVICIO, nombre: "A\u0000B" }))).toEqual({ ok: false, error: "texto_invalido" });
    for (const d of ["4", "601", "30.5", "", "-30"]) {
      expect(parsearServicio(fd({ ...SERVICIO, duracion_minutos: d })), d).toEqual({ ok: false, error: "duracion" });
    }
    expect(parsearServicio(fd({ ...SERVICIO, precio: "-1" }))).toEqual({ ok: false, error: "precio" });
    expect(parsearServicio(fd({ ...SERVICIO, orden: "1000" }))).toEqual({ ok: false, error: "orden" });
  });
});

describe("parsearConfiguracion", () => {
  const SEMANA: Record<string, string> = {};
  for (const d of ["lun", "mar", "mie", "jue", "vie"]) {
    SEMANA[`desde_${d}`] = "09:00";
    SEMANA[`hasta_${d}`] = "18:00";
  }
  const REGLAS = {
    horas_minimas_cancelacion: "24",
    minutos_preparacion_entre_turnos: "15",
    modo_pago: "ninguno",
    sena_porcentaje: "50",
  };

  it("horario: días con las dos horas; cerrado o sin horas = sin entrada", () => {
    const r = parsearConfiguracion(fd({ ...SEMANA, desde_sab: "10:00", hasta_sab: "13:00", cerrado_vie: "on", ...REGLAS }), true);
    expect(r.ok && r.valor.horario).toEqual({
      lun: ["09:00", "18:00"],
      mar: ["09:00", "18:00"],
      mie: ["09:00", "18:00"],
      jue: ["09:00", "18:00"],
      sab: ["10:00", "13:00"],
    });
  });

  it("con turnos: reglas y modo de pago; columnas en snake_case", () => {
    const r = parsearConfiguracion(fd({ ...SEMANA, ...REGLAS }), true);
    expect(r.ok && r.valor.reglas).toEqual({
      horasMinimasCancelacion: 24,
      minutosEntreTurnos: 15,
      modoPago: "ninguno",
      senaPorcentaje: 50,
    });
    if (r.ok) {
      expect(columnasConfiguracion(r.valor)).toEqual({
        horario_atencion: r.valor.horario,
        horas_minimas_cancelacion: 24,
        minutos_preparacion_entre_turnos: 15,
        modo_pago: "ninguno",
        sena_porcentaje: 50,
      });
    }
  });

  it("sin el módulo turnos: solo el horario (las reglas no se tocan aunque vengan)", () => {
    const r = parsearConfiguracion(fd({ ...SEMANA, ...REGLAS, modo_pago: "gratis" }), false);
    expect(r.ok && r.valor.reglas).toBeNull();
    if (r.ok) expect(Object.keys(columnasConfiguracion(r.valor))).toEqual(["horario_atencion"]);
  });

  it("cada error", () => {
    expect(parsearConfiguracion(fd({ desde_lun: "18:00", hasta_lun: "09:00", ...REGLAS }), true)).toEqual({ ok: false, error: "horario" });
    expect(parsearConfiguracion(fd({ desde_lun: "09:00", ...REGLAS }), true)).toEqual({ ok: false, error: "horario" });
    expect(parsearConfiguracion(fd({ desde_lun: "9", hasta_lun: "18:00", ...REGLAS }), true)).toEqual({ ok: false, error: "horario" });
    expect(parsearConfiguracion(fd({ ...REGLAS, horas_minimas_cancelacion: "721" }), true)).toEqual({ ok: false, error: "horas_cancelacion" });
    expect(parsearConfiguracion(fd({ ...REGLAS, minutos_preparacion_entre_turnos: "x" }), true)).toEqual({
      ok: false,
      error: "minutos_entre_turnos",
    });
    expect(parsearConfiguracion(fd({ ...REGLAS, modo_pago: "gratis" }), true)).toEqual({ ok: false, error: "modo_pago" });
    expect(parsearConfiguracion(fd({ ...REGLAS, sena_porcentaje: "0" }), true)).toEqual({ ok: false, error: "sena_porcentaje" });
    expect(parsearConfiguracion(fd({ ...REGLAS, sena_porcentaje: "101" }), true)).toEqual({ ok: false, error: "sena_porcentaje" });
  });
});

describe("parsearTextosSitio", () => {
  const TEXTOS = {
    inicio_titulo: "Tu momento de",
    inicio_destacado: "bienestar",
    inicio_texto: "Línea 1\n\nLínea 2",
    sobre_mi_titulo: "Hola, soy Ana",
    sobre_mi_texto: "Cosmetóloga.",
  };

  it("lista blanca: solo los textos de inicio y sobre mí (colores, contacto o logo se ignoran)", () => {
    const r = parsearTextosSitio(
      fd({ ...TEXTOS, color_primario: "#000000", whatsapp: "+5491100000000", logo_url: "https://x.example/a.png" }),
      true,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(columnasTextosSitio(r.valor)).toEqual({
        inicio_titulo: "Tu momento de",
        inicio_destacado: "bienestar",
        inicio_texto: "Línea 1\n\nLínea 2",
        sobre_mi_titulo: "Hola, soy Ana",
        sobre_mi_texto: "Cosmetóloga.",
      });
    }
  });

  it("sin el módulo sobre mí, sus textos no se tocan; vacíos opcionales = null", () => {
    const r = parsearTextosSitio(fd({ ...TEXTOS, inicio_destacado: "", inicio_texto: "" }), false);
    expect(r.ok && columnasTextosSitio(r.valor)).toEqual({ inicio_titulo: "Tu momento de", inicio_destacado: null, inicio_texto: null });
  });

  it("cada error", () => {
    expect(parsearTextosSitio(fd({ ...TEXTOS, inicio_titulo: " " }), true)).toEqual({ ok: false, error: "inicio_titulo" });
    expect(parsearTextosSitio(fd({ ...TEXTOS, inicio_titulo: "x".repeat(81) }), true)).toEqual({ ok: false, error: "inicio_titulo" });
    expect(parsearTextosSitio(fd({ ...TEXTOS, inicio_destacado: "a\nb" }), true)).toEqual({ ok: false, error: "texto_invalido" });
    expect(parsearTextosSitio(fd({ ...TEXTOS, sobre_mi_texto: "x".repeat(2001) }), true)).toEqual({ ok: false, error: "texto_largo" });
    // Con el módulo apagado, un texto de sobre mí inválido no importa: no se lee.
    expect(parsearTextosSitio(fd({ ...TEXTOS, sobre_mi_texto: "x".repeat(2001) }), false).ok).toBe(true);
  });
});

describe("testimonios, preguntas e imágenes", () => {
  it("testimonio", () => {
    expect(parsearTestimonio(fd({ nombre: "Ana", texto: "Excelente.\nVuelvo.", orden: "", activo: "on" }))).toEqual({
      ok: true,
      valor: { nombre: "Ana", texto: "Excelente.\nVuelvo.", orden: 0, activo: true },
    });
    expect(parsearTestimonio(fd({ nombre: "", texto: "x" }))).toEqual({ ok: false, error: "testimonio_nombre" });
    expect(parsearTestimonio(fd({ nombre: "Ana", texto: "" }))).toEqual({ ok: false, error: "testimonio_texto" });
    expect(parsearTestimonio(fd({ nombre: "Ana", texto: "x".repeat(1001) }))).toEqual({ ok: false, error: "testimonio_texto" });
  });

  it("pregunta frecuente", () => {
    expect(parsearPregunta(fd({ pregunta: "¿Cuánto dura?", respuesta: "Una hora.", orden: "3" }))).toEqual({
      ok: true,
      valor: { pregunta: "¿Cuánto dura?", respuesta: "Una hora.", orden: 3, activo: false },
    });
    expect(parsearPregunta(fd({ pregunta: "¿Una\nlínea?", respuesta: "x" }))).toEqual({ ok: false, error: "texto_invalido" });
    expect(parsearPregunta(fd({ pregunta: "", respuesta: "x" }))).toEqual({ ok: false, error: "pregunta" });
    expect(parsearPregunta(fd({ pregunta: "¿?", respuesta: "" }))).toEqual({ ok: false, error: "respuesta" });
  });

  it("descripción e imagen de la galería", () => {
    expect(parsearDescripcionImagen(fd({ descripcion: "" }))).toEqual({ ok: true, valor: null });
    expect(parsearDescripcionImagen(fd({ descripcion: "x".repeat(201) }))).toEqual({ ok: false, error: "descripcion" });
    expect(parsearImagenGaleria(fd({ descripcion: "Uñas", orden: "1", activo: "on" }))).toEqual({
      ok: true,
      valor: { descripcion: "Uñas", orden: 1, activo: true },
    });
  });
});

describe("esReferenciaEnUso", () => {
  it("solo la violación de FK de Postgres (23503)", () => {
    expect(esReferenciaEnUso({ code: "23503" })).toBe(true);
    expect(esReferenciaEnUso({ code: "42501" })).toBe(false);
    expect(esReferenciaEnUso(null)).toBe(false);
  });
});
```

En `src/lib/master/formularios.test.ts`, reemplazar:

```ts
    expect(parsearGmail(fd({ smtp_usuario: "t@gmail.com", smtp_nombre_remitente: "Ana\nBcc: x@y.com" }))).toEqual({
      ok: false,
      error: "gmail_remitente",
    });
```

por:

```ts
    expect(parsearGmail(fd({ smtp_usuario: "t@gmail.com", smtp_nombre_remitente: "Ana\nBcc: x@y.com" }))).toEqual({
      ok: false,
      error: "gmail_remitente",
    });
    // Cualquier carácter de control, no solo los saltos de línea.
    for (const remitente of ["Ana\tB", "Ana\u0000", "Ana\u007f"]) {
      expect(parsearGmail(fd({ smtp_usuario: "t@gmail.com", smtp_nombre_remitente: remitente })), JSON.stringify(remitente)).toEqual({
        ok: false,
        error: "gmail_remitente",
      });
    }
```

En `src/lib/storage/imagenes.test.ts`, reemplazar:

```ts
  detectarFormato,
  esTipoImagen,
```

por:

```ts
  detectarFormato,
  esTipoImagen,
  pathDeImagenGaleria,
  pathImagenGaleria,
```

y agregar al final del archivo:

```ts

describe("galería", () => {
  it("path {tenant}/galeria-{ms}-{8 hex}.{ext}", () => {
    expect(pathImagenGaleria(TENANT, "jpg", new Date(1_700_000_000_000), "0a1b2c3d")).toBe(
      `${TENANT}/galeria-1700000000000-0a1b2c3d.jpg`,
    );
    expect(() => pathImagenGaleria(TENANT, "jpg", new Date(0), "../x")).toThrow();
  });

  it("pathDeImagenGaleria: solo imágenes de la galería de ese tenant", () => {
    const propia = urlPublica(SUPABASE, `${TENANT}/galeria-123-0a1b2c3d.webp`);
    expect(pathDeImagenGaleria(propia, SUPABASE, TENANT)).toBe(`${TENANT}/galeria-123-0a1b2c3d.webp`);
    expect(pathDeImagenGaleria(propia, SUPABASE, OTRO)).toBeNull();
    expect(pathDeImagenGaleria(urlPublica(SUPABASE, `${TENANT}/logo-123.png`), SUPABASE, TENANT)).toBeNull();
    expect(pathDeImagenGaleria(urlPublica(SUPABASE, `${TENANT}/galeria-1-0a1b2c3d.svg`), SUPABASE, TENANT)).toBeNull();
    expect(pathDeImagenGaleria("https://otro.example/galeria-1-0a1b2c3d.png", SUPABASE, TENANT)).toBeNull();
    expect(pathDeImagenGaleria(null, SUPABASE, TENANT)).toBeNull();
  });
});
```

En `src/lib/turnos/horario.test.ts`, reemplazar:

```ts
import { construirHorarioAtencion, DIAS_SEMANA, resumirHorario } from "./horario";
```

por:

```ts
import { construirHorarioAtencion, DIAS_SEMANA, nombreDia, resumirHorario } from "./horario";

describe("nombreDia", () => {
  it("nombre del día en el idioma del panel", () => {
    expect(nombreDia("lun", "es")).toBe("Lunes");
    expect(nombreDia("lun", "pt")).toBe("Segunda");
    expect(nombreDia("dom", "pt")).toBe("Domingo");
  });
});
```

- [ ] **Step 2: Correr los tests y ver que fallan**

Run: `npx vitest run src/lib/panel/formularios.test.ts src/lib/master/formularios.test.ts src/lib/storage/imagenes.test.ts src/lib/turnos/horario.test.ts`
Expected: FAIL (no existe `./formularios` del panel; `pathImagenGaleria`, `pathDeImagenGaleria` y `nombreDia` no existen; el remitente con tabulación pasa).

- [ ] **Step 3: Implementación**

En `src/lib/master/formularios.ts`, reemplazar:

```ts
/** Caracteres de control: en un texto de una línea no se permiten. */
const CONTROL = /[\u0000-\u001f\u007f]/;
/** En un texto de varias líneas se permiten los saltos de línea (LF y CR). */
const CONTROL_MULTILINEA = /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/;
```

por:

```ts
/** Caracteres de control: en un texto de una línea no se permiten. Lo usa también el panel del cliente. */
export const CONTROL = /[\u0000-\u001f\u007f]/;
/** En un texto de varias líneas se permiten los saltos de línea (LF y CR). */
export const CONTROL_MULTILINEA = /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/;
```

y reemplazar:

```ts
  if (remitente.length > LIMITES.remitente || /[\r\n]/.test(remitente)) return { ok: false, error: "gmail_remitente" };
```

por:

```ts
  if (remitente.length > LIMITES.remitente || CONTROL.test(remitente)) return { ok: false, error: "gmail_remitente" };
```

En `src/lib/storage/imagenes.ts`, agregar al final:

```ts

/**
 * Imagen de la galería: {tenant_id}/galeria-{ms}-{sufijo}.{ext}. El sufijo (8 hex
 * aleatorios) evita que dos subidas del mismo milisegundo se pisen.
 */
export function pathImagenGaleria(tenantId: string, formato: FormatoImagen, ahora: Date, sufijo: string): string {
  if (!/^[0-9a-f]{8}$/.test(sufijo)) throw new Error("Sufijo de imagen inválido");
  return `${tenantId}/galeria-${ahora.getTime()}-${sufijo}.${formato}`;
}

const ARCHIVO_GALERIA = /^galeria-\d+-[0-9a-f]{8}\.(png|jpg|webp)$/;

/** Path de una imagen de la galería de ese tenant (para borrarla), o null si la URL no es una. */
export function pathDeImagenGaleria(url: string | null, urlSupabase: string, tenantId: string): string | null {
  if (!url) return null;
  const prefijo = prefijoPublico(urlSupabase);
  if (!url.startsWith(prefijo)) return null;
  const path = url.slice(prefijo.length);
  const carpeta = `${tenantId}/`;
  if (!path.startsWith(carpeta)) return null;
  return ARCHIVO_GALERIA.test(path.slice(carpeta.length)) ? path : null;
}
```

En `src/lib/turnos/horario.ts`, agregar al final:

```ts

/** Nombre del día para el panel ("Lunes", "Segunda"). */
export function nombreDia(dia: DiaSemana, idioma: Idioma): string {
  return NOMBRES[idioma].enRango[dia];
}
```

`src/lib/panel/formularios.ts`:

```ts
import { CONTROL, CONTROL_MULTILINEA } from "@/lib/master/formularios";
import { DIAS_SEMANA } from "@/lib/turnos/horario";
import { esModoPago, type ModoPago } from "@/lib/turnos/pago";
import { LIMITES_PANEL as L } from "./limites";
import type { ClaveError } from "./mensajes";

/**
 * Validación de los formularios del panel del cliente. Corre en el servidor: un FormData es
 * texto no confiable. Cada parser devuelve solo los campos que el cliente puede cambiar (lista
 * blanca) y cada columnas*() los nombra en snake_case: lo que no está acá no llega a la base
 * aunque venga en el formulario (colores, logo, contacto, módulos y credenciales son del master).
 */
export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: ClaveError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function texto(fd: FormData, nombre: string): string {
  const v = fd.get(nombre);
  return typeof v === "string" ? v.trim() : "";
}

function tildado(fd: FormData, nombre: string): boolean {
  return fd.get(nombre) === "on";
}

/** Id (uuid) de un campo oculto, en minúsculas; null si no es un uuid. */
export function parsearId(fd: FormData, nombre = "id"): string | null {
  const v = texto(fd, nombre);
  return UUID.test(v) ? v.toLowerCase() : null;
}

/** Entero entre min y max (solo dígitos). Vacío: porDefecto, si se indica. */
function entero(fd: FormData, nombre: string, min: number, max: number, porDefecto?: number): number | null {
  const v = texto(fd, nombre);
  if (v === "" && porDefecto !== undefined) return porDefecto;
  if (!/^\d{1,9}$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

/** Monto ≥ 0 con hasta 2 decimales, con punto o coma decimal ("1500", "350,50"). null si no lo es. */
export function parsearMonto(entrada: string, maximo: number): number | null {
  const v = entrada.trim().replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(v)) return null;
  const n = Number(v);
  return n <= maximo ? n : null;
}

type Leido = { valor: string } | { problema: "largo" | "control" };
const SIN_LEER: Leido = { valor: "" };

/** Texto ("" si falta) sin caracteres de control (los saltos de línea solo en multilínea) y con largo máximo. */
function leerTexto(fd: FormData, nombre: string, maximo: number, multilinea = false): Leido {
  const valor = texto(fd, nombre);
  if ((multilinea ? CONTROL_MULTILINEA : CONTROL).test(valor)) return { problema: "control" };
  if (valor.length > maximo) return { problema: "largo" };
  return { valor };
}

/** Error de Postgres al borrar una fila que otra todavía referencia (FK sin cascada). */
export function esReferenciaEnUso(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23503";
}

// ---------- Servicios ----------

export type FormServicio = { nombre: string; duracionMinutos: number; precio: number; orden: number; activo: boolean };

export function parsearServicio(fd: FormData): Resultado<FormServicio> {
  const nombre = leerTexto(fd, "nombre", L.nombre);
  if ("problema" in nombre) return { ok: false, error: nombre.problema === "control" ? "texto_invalido" : "nombre" };
  if (!nombre.valor) return { ok: false, error: "nombre" };
  const duracionMinutos = entero(fd, "duracion_minutos", L.duracionMin, L.duracionMax);
  if (duracionMinutos === null) return { ok: false, error: "duracion" };
  const precioTexto = texto(fd, "precio");
  // Vacío = 0: el sitio lo muestra "a consultar".
  const precio = precioTexto === "" ? 0 : parsearMonto(precioTexto, L.precioMax);
  if (precio === null) return { ok: false, error: "precio" };
  const orden = entero(fd, "orden", 0, L.ordenMax, 0);
  if (orden === null) return { ok: false, error: "orden" };
  return { ok: true, valor: { nombre: nombre.valor, duracionMinutos, precio, orden, activo: tildado(fd, "activo") } };
}

export function columnasServicio(s: FormServicio) {
  return { nombre: s.nombre, duracion_minutos: s.duracionMinutos, precio: s.precio, orden: s.orden, activo: s.activo };
}

// ---------- Horarios y reglas ----------

export type ReglasTurnos = {
  horasMinimasCancelacion: number;
  minutosEntreTurnos: number;
  modoPago: ModoPago;
  senaPorcentaje: number;
};

/** reglas null: el módulo turnos está apagado y sus reglas no se tocan. */
export type FormConfiguracion = { horario: Record<string, [string, string]>; reglas: ReglasTurnos | null };

export function parsearConfiguracion(fd: FormData, conTurnos: boolean): Resultado<FormConfiguracion> {
  const horario: Record<string, [string, string]> = {};
  for (const { key } of DIAS_SEMANA) {
    if (tildado(fd, `cerrado_${key}`)) continue;
    const desde = texto(fd, `desde_${key}`);
    const hasta = texto(fd, `hasta_${key}`);
    if (!desde && !hasta) continue; // sin horas: cerrado
    if (!HORA.test(desde) || !HORA.test(hasta) || desde >= hasta) return { ok: false, error: "horario" };
    horario[key] = [desde, hasta];
  }
  if (!conTurnos) return { ok: true, valor: { horario, reglas: null } };

  const horasMinimasCancelacion = entero(fd, "horas_minimas_cancelacion", 0, L.horasCancelacionMax);
  if (horasMinimasCancelacion === null) return { ok: false, error: "horas_cancelacion" };
  const minutosEntreTurnos = entero(fd, "minutos_preparacion_entre_turnos", 0, L.minutosEntreTurnosMax);
  if (minutosEntreTurnos === null) return { ok: false, error: "minutos_entre_turnos" };
  const modoPago = texto(fd, "modo_pago");
  if (!esModoPago(modoPago)) return { ok: false, error: "modo_pago" };
  const senaPorcentaje = entero(fd, "sena_porcentaje", 1, 100);
  if (senaPorcentaje === null) return { ok: false, error: "sena_porcentaje" };
  return {
    ok: true,
    valor: { horario, reglas: { horasMinimasCancelacion, minutosEntreTurnos, modoPago, senaPorcentaje } },
  };
}

export function columnasConfiguracion(c: FormConfiguracion) {
  return {
    horario_atencion: c.horario,
    ...(c.reglas
      ? {
          horas_minimas_cancelacion: c.reglas.horasMinimasCancelacion,
          minutos_preparacion_entre_turnos: c.reglas.minutosEntreTurnos,
          modo_pago: c.reglas.modoPago,
          sena_porcentaje: c.reglas.senaPorcentaje,
        }
      : {}),
  };
}

// ---------- Textos de inicio y "sobre mí" ----------

export type FormTextosSitio = {
  inicioTitulo: string;
  inicioDestacado: string | null;
  inicioTexto: string | null;
  /** null: el módulo "sobre mí" está apagado y sus textos no se tocan. */
  sobreMi: { titulo: string | null; texto: string | null } | null;
};

export function parsearTextosSitio(fd: FormData, conSobreMi: boolean): Resultado<FormTextosSitio> {
  const titulo = leerTexto(fd, "inicio_titulo", L.titulo);
  if ("problema" in titulo) return { ok: false, error: titulo.problema === "control" ? "texto_invalido" : "inicio_titulo" };
  if (!titulo.valor) return { ok: false, error: "inicio_titulo" };

  const destacado = leerTexto(fd, "inicio_destacado", L.titulo);
  const textoInicio = leerTexto(fd, "inicio_texto", L.texto, true);
  const sobreMiTitulo = conSobreMi ? leerTexto(fd, "sobre_mi_titulo", L.titulo) : SIN_LEER;
  const sobreMiTexto = conSobreMi ? leerTexto(fd, "sobre_mi_texto", L.texto, true) : SIN_LEER;
  const leidos = [destacado, textoInicio, sobreMiTitulo, sobreMiTexto];
  if (leidos.some((l) => "problema" in l && l.problema === "control")) return { ok: false, error: "texto_invalido" };
  if (leidos.some((l) => "problema" in l)) return { ok: false, error: "texto_largo" };

  const valor = (l: Leido): string | null => ("valor" in l && l.valor ? l.valor : null);
  return {
    ok: true,
    valor: {
      inicioTitulo: titulo.valor,
      inicioDestacado: valor(destacado),
      inicioTexto: valor(textoInicio),
      sobreMi: conSobreMi ? { titulo: valor(sobreMiTitulo), texto: valor(sobreMiTexto) } : null,
    },
  };
}

export function columnasTextosSitio(t: FormTextosSitio) {
  return {
    inicio_titulo: t.inicioTitulo,
    inicio_destacado: t.inicioDestacado,
    inicio_texto: t.inicioTexto,
    ...(t.sobreMi ? { sobre_mi_titulo: t.sobreMi.titulo, sobre_mi_texto: t.sobreMi.texto } : {}),
  };
}

// ---------- Testimonios ----------

export type FormTestimonio = { nombre: string; texto: string; orden: number; activo: boolean };

export function parsearTestimonio(fd: FormData): Resultado<FormTestimonio> {
  const nombre = leerTexto(fd, "nombre", L.nombre);
  if ("problema" in nombre) return { ok: false, error: nombre.problema === "control" ? "texto_invalido" : "testimonio_nombre" };
  if (!nombre.valor) return { ok: false, error: "testimonio_nombre" };
  const cuerpo = leerTexto(fd, "texto", L.testimonio, true);
  if ("problema" in cuerpo) return { ok: false, error: cuerpo.problema === "control" ? "texto_invalido" : "testimonio_texto" };
  if (!cuerpo.valor) return { ok: false, error: "testimonio_texto" };
  const orden = entero(fd, "orden", 0, L.ordenMax, 0);
  if (orden === null) return { ok: false, error: "orden" };
  return { ok: true, valor: { nombre: nombre.valor, texto: cuerpo.valor, orden, activo: tildado(fd, "activo") } };
}

export function columnasTestimonio(t: FormTestimonio) {
  return { nombre: t.nombre, texto: t.texto, orden: t.orden, activo: t.activo };
}

// ---------- Preguntas frecuentes ----------

export type FormPregunta = { pregunta: string; respuesta: string; orden: number; activo: boolean };

export function parsearPregunta(fd: FormData): Resultado<FormPregunta> {
  const pregunta = leerTexto(fd, "pregunta", L.pregunta);
  if ("problema" in pregunta) return { ok: false, error: pregunta.problema === "control" ? "texto_invalido" : "pregunta" };
  if (!pregunta.valor) return { ok: false, error: "pregunta" };
  const respuesta = leerTexto(fd, "respuesta", L.respuesta, true);
  if ("problema" in respuesta) return { ok: false, error: respuesta.problema === "control" ? "texto_invalido" : "respuesta" };
  if (!respuesta.valor) return { ok: false, error: "respuesta" };
  const orden = entero(fd, "orden", 0, L.ordenMax, 0);
  if (orden === null) return { ok: false, error: "orden" };
  return { ok: true, valor: { pregunta: pregunta.valor, respuesta: respuesta.valor, orden, activo: tildado(fd, "activo") } };
}

export function columnasPregunta(p: FormPregunta) {
  return { pregunta: p.pregunta, respuesta: p.respuesta, orden: p.orden, activo: p.activo };
}

// ---------- Galería ----------

export function parsearDescripcionImagen(fd: FormData): Resultado<string | null> {
  const descripcion = leerTexto(fd, "descripcion", L.descripcionImagen);
  if ("problema" in descripcion) return { ok: false, error: descripcion.problema === "control" ? "texto_invalido" : "descripcion" };
  return { ok: true, valor: descripcion.valor || null };
}

export type FormImagenGaleria = { descripcion: string | null; orden: number; activo: boolean };

export function parsearImagenGaleria(fd: FormData): Resultado<FormImagenGaleria> {
  const descripcion = parsearDescripcionImagen(fd);
  if (!descripcion.ok) return descripcion;
  const orden = entero(fd, "orden", 0, L.ordenMax, 0);
  if (orden === null) return { ok: false, error: "orden" };
  return { ok: true, valor: { descripcion: descripcion.valor, orden, activo: tildado(fd, "activo") } };
}
```

- [ ] **Step 4: Correr los tests y ver que pasan**

Run: `npx vitest run && npx tsc --noEmit`
Expected: todos los tests en PASS (los nuevos y los anteriores) y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/panel/formularios.ts src/lib/panel/formularios.test.ts src/lib/master/formularios.ts src/lib/master/formularios.test.ts src/lib/storage/imagenes.ts src/lib/storage/imagenes.test.ts src/lib/turnos/horario.ts src/lib/turnos/horario.test.ts
git commit -F - <<'EOF'
feat(panel): validación de formularios con lista blanca y paths de la galería

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Migración 0020: modo de pago, galería y preguntas frecuentes

**Files:**
- Create: `supabase/migrations/0020_modo_pago_galeria_faq.sql`
- Modify: `src/lib/tenant/consultas.ts`, `src/lib/data/types.ts`, `scripts/test-aislamiento.mjs`

- [ ] **Step 1: La migración**

`supabase/migrations/0020_modo_pago_galeria_faq.sql`:

```sql
-- Etapa C2: modo de pago de las reservas y contenido de los módulos galería y preguntas
-- frecuentes.
--
-- modo_pago: 'ninguno' (el turno se confirma al reservar), 'sena' (un porcentaje: el
-- comportamiento original) o 'total'. Las filas existentes quedan en 'sena', como hasta
-- ahora. Los clientes nuevos arrancan en 'ninguno': no tienen Mercado Pago propio hasta la
-- etapa D, y con 'sena' ninguna reserva suya se podría completar. crear_tenant (0018) no
-- inserta modo_pago: toma el default.
alter table public.configuracion_negocio add column modo_pago text not null default 'sena';
alter table public.configuracion_negocio alter column modo_pago set default 'ninguno';
alter table public.configuracion_negocio
  add constraint configuracion_negocio_modo_pago_check check (modo_pago in ('ninguno', 'sena', 'total'));

-- El panel valida de 1 a 100. Verificado con un SELECT antes de escribir esto: la única fila
-- tiene 50. Se agrega "not valid" y se valida aparte, como en la 0019.
alter table public.configuracion_negocio
  add constraint configuracion_negocio_sena_porcentaje_check check (sena_porcentaje between 1 and 100) not valid;
alter table public.configuracion_negocio validate constraint configuracion_negocio_sena_porcentaje_check;

-- Galería: imágenes del bucket público "sitios" ({tenant_id}/galeria-*.ext). imagen_url es la
-- URL pública que arma la app, como tenant_marca.logo_url. Los largos repiten los del panel
-- (src/lib/panel/limites.ts): defensa en profundidad.
create table public.galeria (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  imagen_url text not null,
  descripcion text,
  orden integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  constraint galeria_descripcion_largo check (descripcion is null or char_length(descripcion) <= 200),
  constraint galeria_orden_rango check (orden between 0 and 999)
);
create index idx_galeria_tenant on public.galeria (tenant_id, orden);

create table public.preguntas_frecuentes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pregunta text not null,
  respuesta text not null,
  orden integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  constraint preguntas_frecuentes_pregunta_largo check (char_length(pregunta) between 1 and 300),
  constraint preguntas_frecuentes_respuesta_largo check (char_length(respuesta) between 1 and 2000),
  constraint preguntas_frecuentes_orden_rango check (orden between 0 and 999)
);
create index idx_preguntas_frecuentes_tenant on public.preguntas_frecuentes (tenant_id, orden);

-- Solo el servidor (service role) las lee y escribe, también para el sitio público: RLS
-- activado sin policies y sin privilegios para la API. Los privilegios por defecto (0017) ya
-- no le dan nada a anon ni a authenticated; se repite para que quede explícito.
alter table public.galeria enable row level security;
alter table public.preguntas_frecuentes enable row level security;
revoke all on public.galeria, public.preguntas_frecuentes from anon, authenticated;

-- Red de seguridad (como la de la 0016): anon solo tiene privilegios sobre las tablas
-- públicas de siempre, y authenticated sobre ninguna.
do $$
begin
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
      and table_name not in ('servicios', 'cursos', 'testimonios', 'tenants', 'tenant_marca')
  ) then
    raise exception 'anon tiene privilegios sobre una tabla privada de public';
  end if;
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated'
  ) then
    raise exception 'authenticated tiene privilegios sobre una tabla de public';
  end if;
end $$;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Tipos y tablas del servidor**

En `src/lib/tenant/consultas.ts`, reemplazar:

```ts
  | "testimonios"
  | "tenant_marca"
```

por:

```ts
  | "testimonios"
  | "galeria"
  | "preguntas_frecuentes"
  | "tenant_marca"
```

En `src/lib/data/types.ts`, reemplazar:

```ts
export type Servicio = {
```

por:

```ts
import type { ModoPago } from "@/lib/turnos/pago";

export type Servicio = {
```

reemplazar:

```ts
  sena_porcentaje: number;
  horario_atencion: Record<string, [string, string]>;
};
```

por:

```ts
  sena_porcentaje: number;
  modo_pago: ModoPago;
  horario_atencion: Record<string, [string, string]>;
};
```

y agregar al final:

```ts

/** Testimonio con los campos que edita el panel. */
export type TestimonioAdmin = Testimonio & { orden: number; activo: boolean };

export type ImagenGaleria = {
  id: string;
  imagen_url: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
};

export type PreguntaFrecuente = {
  id: string;
  pregunta: string;
  respuesta: string;
  orden: number;
  activo: boolean;
};
```

- [ ] **Step 3: El test de aislamiento cubre las tablas nuevas**

En `scripts/test-aislamiento.mjs`:

Reemplazar:

```js
// authenticated, RLS en todas las tablas y los privilegios por defecto. Al final borra todo.
```

por:

```js
// authenticated, RLS en todas las tablas y los privilegios por defecto. Las tablas de la
// etapa C2 (galeria, preguntas_frecuentes) son solo del servidor: sin policies y sin
// privilegios para la API, ni siquiera de lectura para anon. Al final borra todo.
```

Reemplazar:

```js
  "testimonios", "tenant_marca",
];
```

por:

```js
  "testimonios", "galeria", "preguntas_frecuentes", "tenant_marca",
];
/** Tablas sin lectura pública: el sitio las lee con la service role (etapa C2). */
const TABLAS_SOLO_SERVIDOR = ["galeria", "preguntas_frecuentes"];
```

Reemplazar:

```js
  await ok(admin.from("testimonios").insert({ tenant_id: t, nombre: "N", texto: "T" }), "testimonio");
```

por:

```js
  await ok(admin.from("testimonios").insert({ tenant_id: t, nombre: "N", texto: "T" }), "testimonio");
  await ok(admin.from("galeria").insert({ tenant_id: t, imagen_url: "https://example.com/galeria.png" }), "galería");
  await ok(admin.from("preguntas_frecuentes").insert({ tenant_id: t, pregunta: "¿P?", respuesta: "R" }), "pregunta");
```

Reemplazar:

```js
  verificar(!pagoPropio.error, "pagos: sí puede apuntar a un turno propio (control)");
```

por:

```js
  verificar(!pagoPropio.error, "pagos: sí puede apuntar a un turno propio (control)");
  const modoInvalido = await admin.from("configuracion_negocio").update({ modo_pago: "gratis" }).eq("tenant_id", a.id);
  verificar(esperaError(modoInvalido, "23514"), "configuracion_negocio: modo_pago solo ninguno, sena o total");
  const senaInvalida = await admin.from("configuracion_negocio").update({ sena_porcentaje: 0 }).eq("tenant_id", a.id);
  verificar(esperaError(senaInvalida, "23514"), "configuracion_negocio: sena_porcentaje de 1 a 100");
  const preguntaLarga = await admin
    .from("preguntas_frecuentes")
    .insert({ tenant_id: a.id, pregunta: "x".repeat(301), respuesta: "R" });
  verificar(esperaError(preguntaLarga, "23514"), "preguntas_frecuentes: la base también limita el largo");
```

Reemplazar:

```js
      admin.from("configuracion_negocio").select("horario_atencion").eq("tenant_id", idRpc).maybeSingle(),
```

por:

```js
      admin.from("configuracion_negocio").select("horario_atencion, modo_pago").eq("tenant_id", idRpc).maybeSingle(),
```

Reemplazar:

```js
    verificar(!!cRpc.data && Object.keys(cRpc.data.horario_atencion).length === 0, "crear_tenant: crea la configuración con horario vacío");
```

por:

```js
    verificar(!!cRpc.data && Object.keys(cRpc.data.horario_atencion).length === 0, "crear_tenant: crea la configuración con horario vacío");
    verificar(cRpc.data?.modo_pago === "ninguno", "crear_tenant: un cliente nuevo arranca sin pago anticipado");
```

Reemplazar:

```js
    "configuracion_negocio", "intentos_reserva", "recordatorios_enviados", "archivos_curso",
    "migraciones_aplicadas",
  ]) {
```

por:

```js
    "configuracion_negocio", "intentos_reserva", "recordatorios_enviados", "archivos_curso",
    "migraciones_aplicadas", ...TABLAS_SOLO_SERVIDOR,
  ]) {
```

Reemplazar:

```js
    verificar(sinRls.length === 0, "todas las tablas de public tienen RLS activado");
    if (sinRls.length) console.log(`    (${listar(sinRls)})`);
```

por:

```js
    verificar(sinRls.length === 0, "todas las tablas de public tienen RLS activado");
    if (sinRls.length) console.log(`    (${listar(sinRls)})`);

    const policiesSoloServidor = (
      await db.query(
        `select tablename, policyname from pg_policies where schemaname = 'public' and tablename = any($1) order by 1, 2`,
        [TABLAS_SOLO_SERVIDOR],
      )
    ).rows;
    verificar(policiesSoloServidor.length === 0, `${TABLAS_SOLO_SERVIDOR.join(" y ")}: sin policies (solo el servidor)`);
    if (policiesSoloServidor.length) console.log(`    (${listar(policiesSoloServidor)})`);
```

`TABLAS_PUBLICAS` no cambia: la verificación "anon: solo SELECT en las tablas públicas" ya falla si `galeria` o `preguntas_frecuentes` reciben cualquier privilegio de `anon`, y "authenticated: ningún privilegio" cubre el resto.

- [ ] **Step 4: Tipos, tests y sintaxis**

```bash
npx tsc --noEmit
npx vitest run
node --check scripts/test-aislamiento.mjs
```

Expected: sin errores y todos los tests en PASS.

- [ ] **Step 5: Aplicar la migración y correr el aislamiento**

```bash
node --env-file=.env.local scripts/migrar.mjs supabase/migrations/0020_modo_pago_galeria_faq.sql
npm run test:aislamiento
```

Expected: `✓ aplicada 0020_modo_pago_galeria_faq.sql` y `Aislamiento OK` (con las verificaciones nuevas de `galeria`, `preguntas_frecuentes`, `modo_pago` y `sena_porcentaje` en `✓`). Si `migrar.mjs` falla por conexión o autenticación, detenerse y avisar a Pablo.

- [ ] **Step 6: Gisel quedó en seña (solo SELECT)**

```bash
node --env-file=.env.local -e '
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query("begin read only");
  const r = await c.query("select t.slug, c.modo_pago, c.sena_porcentaje, (select column_default from information_schema.columns where table_schema = $$public$$ and table_name = $$configuracion_negocio$$ and column_name = $$modo_pago$$) as por_defecto from public.configuracion_negocio c join public.tenants t on t.id = c.tenant_id order by 1");
  console.log(r.rows);
  await c.query("rollback");
  await c.end();
})();
'
```

Expected: `gisel` con `modo_pago: 'sena'` y `sena_porcentaje: 50`, y `por_defecto: "'ninguno'::text"`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0020_modo_pago_galeria_faq.sql src/lib/tenant/consultas.ts src/lib/data/types.ts scripts/test-aislamiento.mjs
git commit -F - <<'EOF'
feat(db): modo de pago por cliente, galería y preguntas frecuentes (0020)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Base del panel: idioma, secciones por módulo, suspendido y 404

**Files:**
- Modify: `src/lib/tenant/actual.ts` (`tenantDelHost`)
- Create: `src/lib/panel/servidor.ts`, `src/lib/panel/metadata.ts`, `src/components/panel/ui.tsx`, `src/app/admin/not-found.tsx`
- Modify: `src/components/landing/SitioSuspendido.tsx`, `src/proxy.ts`, `src/app/layout.tsx`
- Rewrite: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/error.tsx`
- Modify: `src/app/admin/cursos/page.tsx`, `src/app/admin/cursos/[id]/page.tsx`, `src/app/admin/cursos/actions.ts`, `src/app/admin/cursos/[id]/video-preview/route.ts` (módulo cursos en el servidor; se traducen en C2b)

- [ ] **Step 1: El tenant del host, activo o suspendido**

En `src/lib/tenant/actual.ts`, reemplazar:

```ts
/** Tenant activo según el host del request (server actions y route handlers). */
export async function tenantDelRequest(): Promise<Tenant | null> {
  const h = await headers();
  const destino = resolverHost(h.get("host") ?? "", configHost());
  if (destino.tipo !== "tenant") return null;
  const tenant = await getTenantPorSlug(destino.slug);
  return tenant?.estado === "activo" ? tenant : null;
}
```

por:

```ts
/** Tenant del host del request, activo o suspendido. null si el host no es de un tenant o no existe. */
export async function tenantDelHost(): Promise<Tenant | null> {
  const h = await headers();
  const destino = resolverHost(h.get("host") ?? "", configHost());
  if (destino.tipo !== "tenant") return null;
  return getTenantPorSlug(destino.slug);
}

/** Tenant activo según el host del request (server actions y route handlers). */
export async function tenantDelRequest(): Promise<Tenant | null> {
  const tenant = await tenantDelHost();
  return tenant?.estado === "activo" ? tenant : null;
}
```

- [ ] **Step 2: Chequeos del servidor, títulos y piezas del panel**

`src/lib/panel/servidor.ts`:

```ts
import "server-only";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import type { Tenant } from "@/lib/tenant/tipos";
import type { ClaveError, ClaveInfo } from "./mensajes";
import { seccionHabilitada, type SeccionPanel } from "./secciones";

/*
 * Chequeos del panel del cliente en el servidor. El menú solo muestra las secciones de los
 * módulos habilitados, pero una página o una action se pueden pedir directo: cada una vuelve
 * a verificar la sesión (tenantDelAdmin) y el módulo de su sección.
 */

/** Para páginas: 404 si el módulo de la sección está apagado. */
export async function tenantDeSeccion(seccion: SeccionPanel): Promise<Tenant> {
  const tenant = await tenantDelAdmin();
  if (!seccionHabilitada(tenant.modulos, seccion)) notFound();
  return tenant;
}

/** Para server actions: con el módulo apagado vuelve al inicio del panel con el aviso, sin leer el formulario. */
export async function tenantDeAccion(seccion: SeccionPanel): Promise<Tenant> {
  const tenant = await tenantDelAdmin();
  if (!seccionHabilitada(tenant.modulos, seccion)) redirect("/admin?error=modulo_inactivo");
  return tenant;
}

export type MensajePanel = { error: ClaveError } | { ok: ClaveInfo };

/** Redirige a una ruta del panel con una clave de mensajes.ts (nunca un texto). */
export function ir(ruta: string, mensaje?: MensajePanel): never {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(mensaje ?? {})) params.set(clave, valor);
  const query = params.toString();
  redirect(query ? `${ruta}?${query}` : ruta);
}

/** Después de un cambio que se ve en el sitio público: la página del panel y el sitio. */
export function revalidarSitio(rutaPanel: string): void {
  revalidatePath(rutaPanel);
  revalidatePath("/sitio/[tenant]", "layout");
}
```

`src/lib/panel/metadata.ts`:

```ts
import "server-only";
import type { Metadata } from "next";
import { IDIOMA_POR_DEFECTO, traductor, type Textos } from "@/lib/i18n/textos";
import { tenantDelHost } from "@/lib/tenant/actual";

const PANEL: Textos = { es: "Panel", pt: "Painel" };

/** Título de una pantalla del panel en el idioma del cliente del host: "Servicios · Panel". */
export async function metadataDelPanel(titulo?: Textos): Promise<Metadata> {
  const tenant = await tenantDelHost().catch(() => null);
  const t = traductor(tenant?.idioma ?? IDIOMA_POR_DEFECTO);
  return { title: titulo ? `${t(titulo)} · ${t(PANEL)}` : t(PANEL) };
}
```

`src/components/panel/ui.tsx`:

```tsx
import type { Idioma } from "@/lib/i18n/textos";
import { mensajeError, mensajeInfo } from "@/lib/panel/mensajes";

/** Piezas comunes del panel del cliente (colores de la marca, idioma del cliente). */
export const TITULO = "font-serif text-4xl text-texto";
export const SUBTITULO = "mt-2 font-sans text-sm text-texto-suave";
export const ETIQUETA = "font-sans text-sm text-texto-suave";
export const CAMPO =
  "mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario";
export const CAMPO_EN_LINEA =
  "rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario";
export const BOTON =
  "rounded-full bg-primario px-6 py-2.5 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60";
export const BOTON_SECUNDARIO =
  "rounded-full bg-secundario px-4 py-2 font-sans text-sm text-fondo transition hover:bg-secundario-oscuro disabled:opacity-60";
export const ENLACE = "font-sans text-sm text-primario hover:text-primario-oscuro disabled:opacity-60";
export const TARJETA = "rounded-2xl border border-primario/15 bg-white/60 p-5";
export const FILA = "rounded-xl border border-primario/15 bg-white/60 p-3";
export const AYUDA = "mt-1 font-sans text-xs text-texto-suave";
export const CASILLA = "flex items-center gap-2 font-sans text-sm text-texto-suave";

/** Query de las pantallas del panel: claves de mensajes.ts, nunca textos. */
export type ParamsPanel = { error?: string; ok?: string };

export function Mensajes({ idioma, params }: { idioma: Idioma; params: ParamsPanel }) {
  const error = mensajeError(idioma, params.error);
  const info = mensajeInfo(idioma, params.ok);
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
    </>
  );
}
```

- [ ] **Step 3: Aviso de panel suspendido**

En `src/components/landing/SitioSuspendido.tsx`, reemplazar:

```tsx
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
```

por:

```tsx
/** Sitio de un cliente suspendido. Con panel, el aviso es para quien administra el sitio. */
export function SitioSuspendido({ nombre, idioma, panel = false }: { nombre: string; idioma: Idioma; panel?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6 text-center">
      <Container className="max-w-md">
        <h1 className="font-serif text-4xl text-texto">{nombre}</h1>
        <p className="mt-4 font-sans text-texto-suave">
          {traducir(
            idioma,
            panel
              ? {
                  es: "El panel de este sitio está suspendido. Si lo administrás, contactá a la plataforma para reactivarlo.",
                  pt: "O painel deste site está suspenso. Se você o administra, entre em contato com a plataforma para reativá-lo.",
                }
              : {
                  es: "Este sitio no está disponible temporalmente. Volvé a intentar más tarde.",
                  pt: "Este site está temporariamente indisponível. Tente novamente mais tarde.",
                },
          )}
        </p>
```

- [ ] **Step 4: `lang` del documento en el panel**

En `src/proxy.ts`, reemplazar:

```ts
  if (path === "/admin" || path.startsWith("/admin/")) {
    return protegerArea(request, { tipo: "tenant", cabeceras });
  }
```

por:

```ts
  if (path === "/admin" || path.startsWith("/admin/")) {
    // El panel está en el idioma del cliente: el layout raíz lee el tenant de esta cabecera.
    cabeceras.set(CABECERA_TENANT, destino.slug);
    return protegerArea(request, { tipo: "tenant", cabeceras });
  }
```

En `src/app/layout.tsx`, reemplazar:

```ts
 * Idioma del documento. En el sitio público, el proxy indica el tenant en x-tenant-slug.
 * En el resto (panel, rutas sin tenant) queda "es", el idioma del panel hasta la etapa C.
```

por:

```ts
 * Idioma del documento. En el sitio público y en el panel del cliente (/admin), el proxy
 * indica el tenant en x-tenant-slug. En el resto (master, rutas sin tenant) queda "es".
```

- [ ] **Step 5: Layout, inicio, 404 y error del panel**

`src/app/admin/layout.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { SitioSuspendido } from "@/components/landing/SitioSuspendido";
import { Container } from "@/components/ui/Container";
import { cerrarSesion } from "@/lib/auth/acciones";
import { sesionActual } from "@/lib/auth/sesion";
import { IdiomaProvider } from "@/lib/i18n/cliente";
import { IDIOMA_POR_DEFECTO, traductor } from "@/lib/i18n/textos";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { seccionesDelPanel } from "@/lib/panel/secciones";
import { tenantDelHost } from "@/lib/tenant/actual";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { estiloMarca } from "@/lib/tenant/estilo";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel();
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // El tenant sale del host (activo o suspendido). Su idioma y sus colores, que son públicos,
  // se aplican también a las pantallas de ingreso, antes de la sesión.
  const tenantHost = await tenantDelHost();
  const idioma = tenantHost?.idioma ?? IDIOMA_POR_DEFECTO;
  const t = traductor(idioma);
  const conMarca = (contenido: React.ReactNode) => (
    <IdiomaProvider idioma={idioma}>
      <div style={tenantHost ? estiloMarca(tenantHost.marca) : undefined} className="flex flex-1 flex-col">
        {contenido}
      </div>
    </IdiomaProvider>
  );

  // Cliente suspendido: ni el ingreso ni el panel, un aviso en su idioma (no la pantalla de error).
  if (tenantHost?.estado === "suspendido") {
    return conMarca(<SitioSuspendido nombre={tenantHost.nombre} idioma={idioma} panel />);
  }

  // Sin la verificación en dos pasos completa, el proxy solo deja llegar a las pantallas
  // de ingreso (login, código, contraseña): se muestran solas, sin el menú del panel.
  const sesion = await sesionActual();
  if (!sesion?.verificada) return conMarca(children);

  const salir = (
    <form id="form-salir" action={cerrarSesion}>
      <button className="font-sans text-sm text-primario hover:text-primario-oscuro">{t({ es: "Salir", pt: "Sair" })}</button>
    </form>
  );

  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) {
    return conMarca(
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6">
        <p className="font-sans text-texto-suave">
          {t({ es: "Esta cuenta no tiene acceso a este sitio.", pt: "Esta conta não tem acesso a este site." })}
        </p>
        {salir}
      </main>,
    );
  }

  // Solo las secciones de los módulos habilitados (cada página y action lo vuelve a chequear).
  const enlaces = [
    { href: "/admin", etiqueta: t({ es: "Panel", pt: "Painel" }), principal: true },
    ...seccionesDelPanel(tenant.modulos).map((s) => ({ href: s.ruta, etiqueta: t(s.titulo), principal: false })),
    { href: "/", etiqueta: t({ es: "Ver sitio", pt: "Ver site" }), principal: false },
  ];

  return conMarca(
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-primario/15 bg-white/70">
        <Container className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-sm">
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className={e.principal ? "font-medium text-texto hover:text-primario" : "text-texto-suave hover:text-primario"}
              >
                {e.etiqueta}
              </Link>
            ))}
          </nav>
          {salir}
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>,
  );
}
```

`src/app/admin/page.tsx` (reemplazo completo):

```tsx
import Link from "next/link";
import { Mensajes, SUBTITULO, TITULO, type ParamsPanel } from "@/components/panel/ui";
import { traductor } from "@/lib/i18n/textos";
import { seccionesDelPanel } from "@/lib/panel/secciones";
import { tenantDelAdmin } from "@/lib/tenant/admin";

export default async function PanelInicio({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDelAdmin();
  const t = traductor(tenant.idioma);
  return (
    <div>
      <Mensajes idioma={tenant.idioma} params={await searchParams} />
      {/* Un solo texto (sin <!-- --> en el HTML): lo buscan las pruebas E2E. */}
      <h1 className={TITULO}>{`${t({ es: "Hola", pt: "Olá" })}, ${tenant.nombre}`}</h1>
      <p className={SUBTITULO}>{t({ es: "Gestioná tu sitio desde acá.", pt: "Gerencie seu site por aqui." })}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {seccionesDelPanel(tenant.modulos).map((s) => (
          <Link
            key={s.seccion}
            href={s.ruta}
            className="rounded-2xl border border-primario/15 bg-white/60 p-6 transition hover:border-primario/40"
          >
            <h2 className="font-serif text-2xl text-texto">{t(s.titulo)}</h2>
            <p className="mt-1 font-sans text-sm text-texto-suave">{t(s.descripcion)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

`src/app/admin/not-found.tsx`:

```tsx
import Link from "next/link";
import { T } from "@/lib/i18n/cliente";

/** notFound() en una página del panel (sección de un módulo apagado o elemento inexistente). */
export default function PanelNoEncontrado() {
  return (
    <div className="py-16 text-center">
      <h1 className="font-serif text-3xl text-texto">
        <T es="Página no encontrada" pt="Página não encontrada" />
      </h1>
      <p className="mt-3 font-sans text-texto-suave">
        <T
          es="Esta sección no existe o no está habilitada para tu sitio."
          pt="Esta seção não existe ou não está habilitada para o seu site."
        />
      </p>
      <Link href="/admin" className="mt-6 inline-block font-sans text-sm text-primario hover:text-primario-oscuro">
        <T es="Volver al panel" pt="Voltar ao painel" />
      </Link>
    </div>
  );
}
```

`src/app/admin/error.tsx` (reemplazo completo):

```tsx
"use client";

import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/cliente";

/**
 * Error inesperado en el panel. No muestra error.message: en producción Next lo reemplaza por
 * un texto genérico, y en desarrollo el detalle está en la consola. El digest sirve para
 * buscarlo en el log del servidor.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
      <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">{t({ es: "Ups", pt: "Ops" })}</p>
      <h1 className="font-serif text-3xl text-texto">{t({ es: "Algo no funcionó", pt: "Algo deu errado" })}</h1>
      <p className="max-w-md font-sans text-texto-suave">
        {t({
          es: "No pudimos completar lo que pediste. Probá de nuevo en unos segundos.",
          pt: "Não conseguimos concluir o que você pediu. Tente novamente em alguns segundos.",
        })}
      </p>
      {error.digest && <p className="font-mono text-xs text-texto-suave">{error.digest}</p>}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro"
        >
          {t({ es: "Volver a intentar", pt: "Tentar novamente" })}
        </button>
        <Button href="/admin" variant="outline">
          {t({ es: "Volver al panel", pt: "Voltar ao painel" })}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Cursos exige su módulo en el servidor**

En `src/app/admin/cursos/page.tsx` y en `src/app/admin/cursos/[id]/page.tsx`, reemplazar:

```ts
import { tenantDelAdmin } from "@/lib/tenant/admin";
```

por:

```ts
import { tenantDeSeccion } from "@/lib/panel/servidor";
```

y reemplazar:

```ts
  const tenant = await tenantDelAdmin();
```

por:

```ts
  const tenant = await tenantDeSeccion("cursos");
```

En `src/app/admin/cursos/actions.ts`, reemplazar:

```ts
import { tenantDelAdmin } from "@/lib/tenant/admin";
```

por:

```ts
import { tenantDeAccion } from "@/lib/panel/servidor";
```

y reemplazar **todas** las apariciones (son 6) de:

```ts
  const tenant = await tenantDelAdmin();
```

por:

```ts
  const tenant = await tenantDeAccion("cursos");
```

En `src/app/admin/cursos/[id]/video-preview/route.ts`, reemplazar:

```ts
  if (!tenant) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
```

por:

```ts
  if (!tenant) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!tenant.modulos.cursos) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
```

- [ ] **Step 7: Tipos, lint, tests y build**

```bash
grep -c "tenantDelAdmin" src/app/admin/cursos/actions.ts src/app/admin/cursos/page.tsx "src/app/admin/cursos/[id]/page.tsx"
npx tsc --noEmit
npx eslint src
npx vitest run
npm run build
```

Expected: el `grep` da `0` en los tres archivos; sin errores de tipos ni de lint; los tests en PASS; el build sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/lib/tenant/actual.ts src/lib/panel/servidor.ts src/lib/panel/metadata.ts src/components/panel/ui.tsx src/components/landing/SitioSuspendido.tsx src/proxy.ts src/app/layout.tsx src/app/admin/layout.tsx src/app/admin/page.tsx src/app/admin/error.tsx src/app/admin/not-found.tsx src/app/admin/cursos/page.tsx "src/app/admin/cursos/[id]/page.tsx" src/app/admin/cursos/actions.ts "src/app/admin/cursos/[id]/video-preview/route.ts"
git commit -F - <<'EOF'
feat(panel): panel en el idioma del cliente, secciones por módulo y aviso de suspendido

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Pantallas de ingreso del cliente traducidas

**Files:**
- Rewrite: `src/lib/auth/mensajes.ts`, `src/lib/auth/mensajes.test.ts`, `src/components/auth/PaginasAuth.tsx`
- Modify: `src/app/admin/login/page.tsx`, `src/app/admin/recuperar/page.tsx`, `src/app/admin/verificar/page.tsx`, `src/app/admin/restablecer/page.tsx`

- [ ] **Step 1: Test que falla**

`src/lib/auth/mensajes.test.ts` (reemplazo completo):

```ts
import { describe, it, expect } from "vitest";
import { mensajeError, mensajeInfo } from "./mensajes";

describe("mensajes de las pantallas de ingreso", () => {
  it("traduce las claves conocidas (español por defecto: el panel master)", () => {
    expect(mensajeError("credenciales")).toBe("Email o contraseña incorrectos.");
    expect(mensajeError("envio_no_configurado")).toBe("El envío de códigos no está configurado.");
    expect(mensajeInfo("codigo_enviado")).toContain("código");
    expect(mensajeError("servicio_ocupado")).toBe("El servicio está ocupado. Probá de nuevo en unos minutos.");
  });

  it("en portugués para un cliente de Brasil", () => {
    expect(mensajeError("credenciales", "pt")).toBe("E-mail ou senha incorretos.");
    expect(mensajeInfo("contrasena_cambiada", "pt")).toBe("Pronto, sua senha foi alterada. Você já pode entrar.");
    expect(mensajeError("contrasena_corta", "pt")).toContain("8");
  });

  it("no muestra textos arbitrarios de la URL", () => {
    expect(mensajeError(undefined)).toBeNull();
    expect(mensajeError("<script>alert(1)</script>")).toBeNull();
    expect(mensajeError("toString", "pt")).toBeNull();
    expect(mensajeInfo("constructor")).toBeNull();
  });

  it("cada error de código y de envío tiene su mensaje en los dos idiomas", () => {
    const claves = [
      "incorrecto", "reintentar", "sin_codigo", "vencido", "agotado", "usado", "formato",
      "espera", "limite", "envio_fallo", "envio_no_configurado", "envio_emails_no_configurado",
      "sitio", "email", "link", "contrasena_corta", "contrasena_distinta", "contrasena_rechazada",
      "sesiones_no_cerradas", "demasiados_intentos", "servicio_ocupado", "credenciales",
    ];
    for (const clave of claves) {
      expect(mensajeError(clave), clave).toBeTruthy();
      expect(mensajeError(clave, "pt"), clave).toBeTruthy();
      expect(mensajeError(clave, "pt"), clave).not.toBe(mensajeError(clave));
    }
    for (const clave of ["codigo_enviado", "reenviado", "recuperacion_enviada", "contrasena_cambiada"]) {
      expect(mensajeInfo(clave), clave).toBeTruthy();
      expect(mensajeInfo(clave, "pt"), clave).not.toBe(mensajeInfo(clave));
    }
  });
});
```

Run: `npx vitest run src/lib/auth/mensajes.test.ts`
Expected: FAIL (los mensajes todavía no tienen portugués).

- [ ] **Step 2: Mensajes en es/pt**

`src/lib/auth/mensajes.ts` (reemplazo completo):

```ts
import { IDIOMA_POR_DEFECTO, type Idioma, type Textos } from "@/lib/i18n/textos";
import { LARGO_MINIMO_CONTRASENA } from "./recuperacion";

/**
 * Textos de las pantallas de ingreso, en el idioma del área: el del cliente en su panel, el
 * español en el master. La URL lleva solo la clave (?error=credenciales): un texto que no
 * está acá no se muestra.
 */
const ERRORES: Record<string, Textos> = {
  credenciales: { es: "Email o contraseña incorrectos.", pt: "E-mail ou senha incorretos." },
  demasiados_intentos: {
    es: "Demasiados intentos. Esperá unos minutos.",
    pt: "Muitas tentativas. Aguarde alguns minutos.",
  },
  servicio_ocupado: {
    es: "El servicio está ocupado. Probá de nuevo en unos minutos.",
    pt: "O serviço está ocupado. Tente novamente em alguns minutos.",
  },
  sitio: { es: "Este sitio no está disponible.", pt: "Este site não está disponível." },
  envio_no_configurado: {
    es: "El envío de códigos no está configurado.",
    pt: "O envio de códigos não está configurado.",
  },
  envio_emails_no_configurado: {
    es: "El envío de emails no está configurado.",
    pt: "O envio de e-mails não está configurado.",
  },
  envio_fallo: {
    es: "No pudimos enviar el código. Probá de nuevo en unos minutos.",
    pt: "Não conseguimos enviar o código. Tente novamente em alguns minutos.",
  },
  espera: {
    es: "Esperá un minuto antes de pedir otro código.",
    pt: "Aguarde um minuto antes de pedir outro código.",
  },
  limite: {
    es: "Pediste demasiados códigos. Probá de nuevo en una hora.",
    pt: "Você pediu códigos demais. Tente novamente em uma hora.",
  },
  formato: { es: "El código tiene 6 números.", pt: "O código tem 6 números." },
  incorrecto: { es: "El código no es correcto.", pt: "O código não está correto." },
  vencido: { es: "El código venció. Pedí uno nuevo.", pt: "O código expirou. Peça um novo." },
  agotado: {
    es: "Agotaste los intentos. Pedí un código nuevo.",
    pt: "Você esgotou as tentativas. Peça um código novo.",
  },
  usado: { es: "Ese código ya se usó. Pedí uno nuevo.", pt: "Esse código já foi usado. Peça um novo." },
  sin_codigo: { es: "Pedí un código para continuar.", pt: "Peça um código para continuar." },
  reintentar: {
    es: "No pudimos verificar el código. Probá de nuevo.",
    pt: "Não conseguimos verificar o código. Tente novamente.",
  },
  email: { es: "Ingresá un email válido.", pt: "Informe um e-mail válido." },
  link: {
    es: "El link no es válido o ya venció. Pedí uno nuevo.",
    pt: "O link não é válido ou já expirou. Peça um novo.",
  },
  contrasena_corta: {
    es: `La contraseña tiene que tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
    pt: `A senha precisa ter pelo menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
  },
  contrasena_distinta: { es: "Las contraseñas no coinciden.", pt: "As senhas não coincidem." },
  sesiones_no_cerradas: {
    es: "Tu contraseña cambió, pero no pudimos cerrar las otras sesiones abiertas. Ingresá y volvé a cambiarla para cerrarlas.",
    pt: "Sua senha foi alterada, mas não conseguimos encerrar as outras sessões abertas. Entre e altere-a novamente para encerrá-las.",
  },
  contrasena_rechazada: {
    es: "No pudimos guardar esa contraseña (puede ser muy débil o igual a la anterior). Pedí un link nuevo y probá con otra.",
    pt: "Não conseguimos salvar essa senha (pode ser muito fraca ou igual à anterior). Peça um link novo e tente outra.",
  },
};

const INFOS: Record<string, Textos> = {
  codigo_enviado: {
    es: "Te enviamos un código de 6 números a tu email.",
    pt: "Enviamos um código de 6 números para o seu e-mail.",
  },
  reenviado: { es: "Te enviamos un código nuevo.", pt: "Enviamos um código novo." },
  recuperacion_enviada: {
    es: "Si el email corresponde a una cuenta, te enviamos un link para elegir una contraseña nueva. Revisá también el correo no deseado.",
    pt: "Se o e-mail corresponder a uma conta, enviamos um link para escolher uma nova senha. Verifique também a caixa de spam.",
  },
  contrasena_cambiada: {
    es: "Listo, tu contraseña cambió. Ya podés ingresar.",
    pt: "Pronto, sua senha foi alterada. Você já pode entrar.",
  },
};

function buscar(tabla: Record<string, Textos>, clave: string | undefined, idioma: Idioma): string | null {
  return clave !== undefined && Object.prototype.hasOwnProperty.call(tabla, clave) ? tabla[clave][idioma] : null;
}

export function mensajeError(clave: string | undefined, idioma: Idioma = IDIOMA_POR_DEFECTO): string | null {
  return buscar(ERRORES, clave, idioma);
}

export function mensajeInfo(clave: string | undefined, idioma: Idioma = IDIOMA_POR_DEFECTO): string | null {
  return buscar(INFOS, clave, idioma);
}
```

- [ ] **Step 3: Pantallas en el idioma del área**

`src/components/auth/PaginasAuth.tsx` (reemplazo completo):

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
import { IDIOMA_POR_DEFECTO, traductor, type Idioma, type Textos } from "@/lib/i18n/textos";
import { tenantDelHost } from "@/lib/tenant/actual";

/**
 * Pantallas de ingreso de los dos paneles. Las del cliente, en el idioma del tenant del host;
 * las del master, en español. Los ids de los formularios los usan los scripts E2E.
 */

/** Query de las pantallas: claves de mensajes (no textos) y el token del link de recuperación. */
export type ParamsAuth = { error?: string; info?: string; token_hash?: string };

type PropsPagina = { tipo: TipoArea; searchParams: Promise<ParamsAuth> };
type Traductor = (textos: Textos) => string;

const TITULO: Record<TipoArea, Textos> = {
  tenant: { es: "Panel de gestión", pt: "Painel de gestão" },
  master: { es: "Panel master", pt: "Painel master" },
};
const ETIQUETA = "font-sans text-sm text-texto-suave";
const CAMPO =
  "mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario";
const BOTON =
  "mt-2 rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60";
const ENLACE = "font-sans text-sm text-primario hover:text-primario-oscuro";

async function idiomaDelArea(tipo: TipoArea): Promise<Idioma> {
  if (tipo === "master") return IDIOMA_POR_DEFECTO;
  return (await tenantDelHost())?.idioma ?? IDIOMA_POR_DEFECTO;
}

function Pantalla({
  titulo,
  subtitulo,
  params,
  idioma,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  params: ParamsAuth;
  idioma: Idioma;
  children: React.ReactNode;
}) {
  const error = mensajeError(params.error, idioma);
  const info = mensajeInfo(params.info, idioma);
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

async function contexto(tipo: TipoArea): Promise<{ idioma: Idioma; t: Traductor }> {
  const idioma = await idiomaDelArea(tipo);
  return { idioma, t: traductor(idioma) };
}

export async function PaginaLogin({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  const { idioma, t } = await contexto(tipo);
  return (
    <Pantalla
      titulo={t(TITULO[tipo])}
      subtitulo={
        tipo === "master"
          ? "Ingresá para administrar la plataforma."
          : t({ es: "Ingresá para administrar tu sitio.", pt: "Entre para administrar seu site." })
      }
      params={params}
      idioma={idioma}
    >
      <form id="form-login" action={iniciarSesion} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          {t({ es: "Email", pt: "E-mail" })}
          <input name="email" type="email" required autoComplete="email" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {t({ es: "Contraseña", pt: "Senha" })}
          <input name="password" type="password" required autoComplete="current-password" className={CAMPO} />
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Ingresar", pt: "Entrar" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Ingresando…", pt: "Entrando…" })} />
      </form>
      <p className="mt-4 text-center">
        <Link href={rutaDelArea(tipo, RUTAS_AUTH.recuperar)} className={ENLACE}>
          {t({ es: "¿Olvidaste tu contraseña?", pt: "Esqueceu sua senha?" })}
        </Link>
      </p>
    </Pantalla>
  );
}

export async function PaginaVerificar({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  const { idioma, t } = await contexto(tipo);
  return (
    <Pantalla
      titulo={t({ es: "Verificá que sos vos", pt: "Confirme que é você" })}
      subtitulo={t({
        es: "Ingresá el código de 6 números que te enviamos por email. Vence en 10 minutos.",
        pt: "Digite o código de 6 números que enviamos por e-mail. Ele expira em 10 minutos.",
      })}
      params={params}
      idioma={idioma}
    >
      <form id="form-verificar" action={verificarCodigo} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          {t({ es: "Código", pt: "Código" })}
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
          {t({ es: "Recordar este dispositivo por 30 días", pt: "Lembrar deste dispositivo por 30 dias" })}
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Verificar", pt: "Verificar" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Verificando…", pt: "Verificando…" })} />
      </form>
      <div className="mt-4 flex items-center justify-between">
        <form id="form-reenviar" action={reenviarCodigo}>
          <button className={ENLACE}>{t({ es: "Reenviar código", pt: "Reenviar código" })}</button>
        </form>
        <form id="form-salir" action={cerrarSesion}>
          <button className={ENLACE}>{t({ es: "Usar otra cuenta", pt: "Usar outra conta" })}</button>
        </form>
      </div>
      <p className="mt-2 text-center font-sans text-xs text-texto-suave">{t(TITULO[tipo])}</p>
    </Pantalla>
  );
}

export async function PaginaRecuperar({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  const { idioma, t } = await contexto(tipo);
  return (
    <Pantalla
      titulo={t({ es: "Recuperar contraseña", pt: "Recuperar senha" })}
      subtitulo={t({
        es: "Ingresá tu email y te mandamos un link para elegir una contraseña nueva.",
        pt: "Informe seu e-mail e enviaremos um link para escolher uma nova senha.",
      })}
      params={params}
      idioma={idioma}
    >
      <form id="form-recuperar" action={pedirRecuperacion} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          {t({ es: "Email", pt: "E-mail" })}
          <input name="email" type="email" required autoComplete="email" className={CAMPO} />
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Enviar link", pt: "Enviar link" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Enviando…", pt: "Enviando…" })} />
      </form>
      <p className="mt-4 text-center">
        <Link href={rutaDelArea(tipo, RUTAS_AUTH.login)} className={ENLACE}>
          {t({ es: "Volver a ingresar", pt: "Voltar para o login" })}
        </Link>
      </p>
    </Pantalla>
  );
}

export async function PaginaRestablecer({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  const { idioma, t } = await contexto(tipo);
  const titulo = t({ es: "Elegí una contraseña nueva", pt: "Escolha uma nova senha" });
  if (!params.token_hash) {
    return (
      <Pantalla titulo={titulo} params={{ error: "link" }} idioma={idioma}>
        <p className="mt-6 text-center">
          <Link href={rutaDelArea(tipo, RUTAS_AUTH.recuperar)} className={ENLACE}>
            {t({ es: "Pedir un link nuevo", pt: "Pedir um link novo" })}
          </Link>
        </p>
      </Pantalla>
    );
  }
  return (
    <Pantalla
      titulo={titulo}
      subtitulo={t({
        es: `Al menos ${LARGO_MINIMO_CONTRASENA} caracteres. Después vas a ingresar con ella y un código por email.`,
        pt: `Pelo menos ${LARGO_MINIMO_CONTRASENA} caracteres. Depois você vai entrar com ela e um código por e-mail.`,
      })}
      params={params}
      idioma={idioma}
    >
      <form id="form-restablecer" action={restablecerContrasena} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="token_hash" defaultValue={params.token_hash} />
        <label className={ETIQUETA}>
          {t({ es: "Contraseña nueva", pt: "Nova senha" })}
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
          {t({ es: "Repetila", pt: "Repita a senha" })}
          <input
            name="confirmacion"
            type="password"
            required
            minLength={LARGO_MINIMO_CONTRASENA}
            autoComplete="new-password"
            className={CAMPO}
          />
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Guardar contraseña", pt: "Salvar senha" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Guardando…", pt: "Salvando…" })} />
      </form>
    </Pantalla>
  );
}
```

- [ ] **Step 4: Títulos de las pantallas de ingreso del cliente**

`src/app/admin/login/page.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import { PaginaLogin, type ParamsAuth } from "@/components/auth/PaginasAuth";
import { metadataDelPanel } from "@/lib/panel/metadata";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Ingresar", pt: "Entrar" });
}

export default function LoginPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaLogin tipo="tenant" searchParams={searchParams} />;
}
```

`src/app/admin/recuperar/page.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import { PaginaRecuperar, type ParamsAuth } from "@/components/auth/PaginasAuth";
import { metadataDelPanel } from "@/lib/panel/metadata";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Recuperar contraseña", pt: "Recuperar senha" });
}

export default function RecuperarPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRecuperar tipo="tenant" searchParams={searchParams} />;
}
```

`src/app/admin/verificar/page.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import { PaginaVerificar, type ParamsAuth } from "@/components/auth/PaginasAuth";
import { metadataDelPanel } from "@/lib/panel/metadata";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Verificación", pt: "Verificação" });
}

export default function VerificarPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaVerificar tipo="tenant" searchParams={searchParams} />;
}
```

`src/app/admin/restablecer/page.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import { PaginaRestablecer, type ParamsAuth } from "@/components/auth/PaginasAuth";
import { metadataDelPanel } from "@/lib/panel/metadata";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Contraseña nueva", pt: "Nova senha" });
}

export default function RestablecerPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRestablecer tipo="tenant" searchParams={searchParams} />;
}
```

Las pantallas del master (`src/app/master/{login,recuperar,verificar,restablecer}/page.tsx`) no cambian: `tipo="master"` sigue en español.

- [ ] **Step 5: Tipos, lint y tests**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
```

Expected: sin errores; todos los tests en PASS (también `auth/mensajes`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/mensajes.ts src/lib/auth/mensajes.test.ts src/components/auth/PaginasAuth.tsx src/app/admin/login/page.tsx src/app/admin/recuperar/page.tsx src/app/admin/verificar/page.tsx src/app/admin/restablecer/page.tsx
git commit -F - <<'EOF'
feat(auth): pantallas de ingreso del cliente en su idioma

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Servicios: validados, traducidos y con error claro al borrar

**Files:**
- Rewrite: `src/app/admin/servicios/actions.ts`, `src/app/admin/servicios/page.tsx`

- [ ] **Step 1: Actions**

`src/app/admin/servicios/actions.ts` (reemplazo completo):

```ts
"use server";

import { columnasServicio, esReferenciaEnUso, parsearId, parsearServicio } from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";

/*
 * Servicios del cliente. Cada action verifica sesión y sección antes de leer el formulario,
 * valida con lista blanca (parsearServicio) y redirige con una clave de mensajes.ts. Editar
 * y borrar filtran por tenant e id: un id de otro cliente no afecta ninguna fila (?error=id).
 */
const RUTA = "/admin/servicios";

export async function crearServicio(formData: FormData) {
  const tenant = await tenantDeAccion("servicios");
  const servicio = parsearServicio(formData);
  if (!servicio.ok) ir(RUTA, { error: servicio.error });
  const { error } = await datosDelTenant(tenant.id).insert("servicios", columnasServicio(servicio.valor));
  if (error) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "creado" });
}

export async function editarServicio(formData: FormData) {
  const tenant = await tenantDeAccion("servicios");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const servicio = parsearServicio(formData);
  if (!servicio.ok) ir(RUTA, { error: servicio.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("servicios", columnasServicio(servicio.valor))
    .eq("id", id)
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}

export async function eliminarServicio(formData: FormData) {
  const tenant = await tenantDeAccion("servicios");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const { data, error } = await datosDelTenant(tenant.id).delete("servicios").eq("id", id).select("id");
  // Los turnos referencian el servicio (FK sin cascada): un servicio con turnos no se borra.
  if (esReferenciaEnUso(error)) ir(RUTA, { error: "servicio_con_turnos" });
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "eliminado" });
}
```

- [ ] **Step 2: Pantalla**

`src/app/admin/servicios/page.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import {
  BOTON,
  BOTON_SECUNDARIO,
  CAMPO_EN_LINEA,
  CASILLA,
  ENLACE,
  FILA,
  Mensajes,
  SUBTITULO,
  TARJETA,
  TITULO,
  type ParamsPanel,
} from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getServiciosAdmin } from "@/lib/data/servicios";
import { formatDuracion, formatPrecio } from "@/lib/format";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { crearServicio, editarServicio, eliminarServicio } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Servicios", pt: "Serviços" });
}

export default async function ServiciosAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("servicios");
  const t = traductor(tenant.idioma);
  const servicios = await getServiciosAdmin(tenant.id);
  // BRL tiene centavos; ARS se maneja en pesos enteros.
  const pasoPrecio = tenant.moneda === "BRL" ? "0.01" : "1";
  const etiqueta = {
    nombre: t({ es: "Nombre", pt: "Nome" }),
    minutos: t({ es: "Minutos", pt: "Minutos" }),
    precio: t({ es: "Precio", pt: "Preço" }),
    orden: t({ es: "Orden", pt: "Ordem" }),
    activo: t({ es: "activo", pt: "ativo" }),
  };

  return (
    <div>
      <h1 className={TITULO}>{t({ es: "Servicios", pt: "Serviços" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: "Cargá el precio y la duración (en minutos) de cada servicio. Con el precio vacío o en 0, el sitio muestra “Consultar”. Desmarcá “activo” para ocultarlo del sitio.",
          pt: "Informe o preço e a duração (em minutos) de cada serviço. Com o preço vazio ou 0, o site mostra “Sob consulta”. Desmarque “ativo” para ocultá-lo do site.",
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-nuevo-servicio" action={crearServicio} className={`${TARJETA} flex flex-wrap items-end gap-3`}>
        <input
          name="nombre"
          placeholder={etiqueta.nombre}
          aria-label={etiqueta.nombre}
          required
          maxLength={L.nombre}
          className={`${CAMPO_EN_LINEA} min-w-48 flex-1`}
        />
        <input
          name="duracion_minutos"
          type="number"
          min={L.duracionMin}
          max={L.duracionMax}
          placeholder={etiqueta.minutos}
          aria-label={etiqueta.minutos}
          required
          className={`${CAMPO_EN_LINEA} w-24`}
        />
        <input
          name="precio"
          type="number"
          min={0}
          step={pasoPrecio}
          placeholder={etiqueta.precio}
          aria-label={etiqueta.precio}
          className={`${CAMPO_EN_LINEA} w-32`}
        />
        <input
          name="orden"
          type="number"
          min={0}
          max={L.ordenMax}
          placeholder={etiqueta.orden}
          aria-label={etiqueta.orden}
          className={`${CAMPO_EN_LINEA} w-24`}
        />
        <label className={CASILLA}>
          <input name="activo" type="checkbox" defaultChecked />
          {etiqueta.activo}
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Agregar", pt: "Adicionar" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Agregando servicio…", pt: "Adicionando serviço…" })} />
      </form>

      <div className="mt-6 space-y-3">
        {servicios.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">{t({ es: "Todavía no hay servicios.", pt: "Ainda não há serviços." })}</p>
        )}
        {servicios.map((s) => (
          <div key={s.id} className={`${FILA} flex flex-wrap items-center gap-3`}>
            <form id={`form-servicio-${s.id}`} action={editarServicio} className="flex flex-1 flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={s.id} />
              <input
                name="nombre"
                defaultValue={s.nombre}
                aria-label={etiqueta.nombre}
                required
                maxLength={L.nombre}
                className={`${CAMPO_EN_LINEA} min-w-48 flex-1`}
              />
              <input
                name="duracion_minutos"
                type="number"
                min={L.duracionMin}
                max={L.duracionMax}
                defaultValue={s.duracion_minutos}
                aria-label={etiqueta.minutos}
                title={formatDuracion(s.duracion_minutos)}
                className={`${CAMPO_EN_LINEA} w-20`}
              />
              <input
                name="precio"
                type="number"
                min={0}
                step={pasoPrecio}
                defaultValue={s.precio}
                aria-label={etiqueta.precio}
                title={formatPrecio(s.precio, tenant.moneda, tenant.idioma)}
                className={`${CAMPO_EN_LINEA} w-28`}
              />
              <input
                name="orden"
                type="number"
                min={0}
                max={L.ordenMax}
                defaultValue={s.orden}
                aria-label={etiqueta.orden}
                className={`${CAMPO_EN_LINEA} w-20`}
              />
              <label className={CASILLA}>
                <input name="activo" type="checkbox" defaultChecked={s.activo} />
                {etiqueta.activo}
              </label>
              <SubmitButton className={BOTON_SECUNDARIO}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
              <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
            </form>
            <form id={`form-eliminar-servicio-${s.id}`} action={eliminarServicio}>
              <input type="hidden" name="id" value={s.id} />
              <SubmitButton className={ENLACE}>{t({ es: "Eliminar", pt: "Excluir" })}</SubmitButton>
              <FormPendingOverlay label={t({ es: "Eliminando…", pt: "Excluindo…" })} />
            </form>
          </div>
        ))}
      </div>
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

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/servicios/actions.ts src/app/admin/servicios/page.tsx
git commit -F - <<'EOF'
feat(panel): servicios validados y traducidos; borrar uno con turnos avisa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Horarios y reglas, con el modo de pago

**Files:**
- Rewrite: `src/app/admin/configuracion/actions.ts`, `src/app/admin/configuracion/page.tsx`

- [ ] **Step 1: Action**

`src/app/admin/configuracion/actions.ts` (reemplazo completo):

```ts
"use server";

import { columnasConfiguracion, parsearConfiguracion } from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";

const RUTA = "/admin/configuracion";

/**
 * Horario de atención y, con el módulo turnos, las reglas de los turnos y el modo de pago.
 * Sin el módulo, las reglas no se leen ni se tocan (parsearConfiguracion devuelve reglas null).
 */
export async function guardarConfiguracion(formData: FormData) {
  const tenant = await tenantDeAccion("configuracion");
  const config = parsearConfiguracion(formData, tenant.modulos.turnos);
  if (!config.ok) ir(RUTA, { error: config.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("configuracion_negocio", columnasConfiguracion(config.valor))
    .select("tenant_id");
  if (error || !data?.length) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}
```

- [ ] **Step 2: Pantalla**

`src/app/admin/configuracion/page.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import {
  AYUDA,
  BOTON,
  CAMPO,
  CAMPO_EN_LINEA,
  CASILLA,
  ETIQUETA,
  FILA,
  Mensajes,
  SUBTITULO,
  TITULO,
  type ParamsPanel,
} from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getConfiguracion } from "@/lib/data/configuracion";
import { traductor, type Textos } from "@/lib/i18n/textos";
import { isMpConfigurado } from "@/lib/mercadopago/client";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { DIAS_SEMANA, nombreDia } from "@/lib/turnos/horario";
import { MODOS_PAGO, NOMBRE_MODO_PAGO, type ModoPago } from "@/lib/turnos/pago";
import { guardarConfiguracion } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Horarios y reglas", pt: "Horários e regras" });
}

const AYUDA_MODO: Record<ModoPago, Textos> = {
  ninguno: {
    es: "El turno queda confirmado al reservar, sin Mercado Pago.",
    pt: "O horário fica confirmado ao agendar, sem Mercado Pago.",
  },
  sena: {
    es: "Se cobra un porcentaje del precio con Mercado Pago; el resto se paga en el turno.",
    pt: "Cobra-se uma porcentagem do valor pelo Mercado Pago; o restante é pago no atendimento.",
  },
  total: {
    es: "Se cobra el precio completo con Mercado Pago al reservar.",
    pt: "Cobra-se o valor total pelo Mercado Pago ao agendar.",
  },
};

export default async function ConfiguracionAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("configuracion");
  const t = traductor(tenant.idioma);
  const config = await getConfiguracion(tenant.id);

  if (!config) {
    return (
      <p className="font-sans text-texto-suave">
        {t({
          es: "No se pudo leer la configuración. Probá de nuevo en unos minutos.",
          pt: "Não foi possível ler a configuração. Tente novamente em alguns minutos.",
        })}
      </p>
    );
  }

  const conTurnos = tenant.modulos.turnos;
  // Hasta la etapa D, solo el tenant de las credenciales globales cobra con Mercado Pago.
  const cobraOnline = isMpConfigurado() && usaCredencialesGlobales(tenant.slug);
  const numero = (nombre: string, etiqueta: string, valor: number, min: number, max: number) => (
    <label className={ETIQUETA}>
      {etiqueta}
      <input name={nombre} type="number" defaultValue={valor} min={min} max={max} required className={CAMPO} />
    </label>
  );

  return (
    <div className="max-w-2xl">
      <h1 className={TITULO}>{t({ es: "Horarios y reglas", pt: "Horários e regras" })}</h1>
      <p className={SUBTITULO}>
        {conTurnos
          ? t({
              es: "El horario de atención se muestra en el sitio y define los turnos que se pueden reservar.",
              pt: "O horário de atendimento aparece no site e define os horários que podem ser agendados.",
            })
          : t({ es: "El horario de atención se muestra en el pie del sitio.", pt: "O horário de atendimento aparece no rodapé do site." })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-configuracion" action={guardarConfiguracion} className="flex flex-col gap-8">
        <section>
          <h2 className="font-serif text-2xl text-texto">{t({ es: "Horario de atención", pt: "Horário de atendimento" })}</h2>
          <p className={AYUDA}>
            {t({
              es: "Un día sin horas, o marcado como cerrado, no recibe turnos.",
              pt: "Um dia sem horários, ou marcado como fechado, não recebe agendamentos.",
            })}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {DIAS_SEMANA.map((d) => {
              const horario = config.horario_atencion[d.key];
              const dia = nombreDia(d.key, tenant.idioma);
              return (
                <div key={d.key} className={`${FILA} flex flex-wrap items-center gap-3`}>
                  <span className="w-24 font-sans text-sm text-texto">{dia}</span>
                  <input
                    name={`desde_${d.key}`}
                    type="time"
                    defaultValue={horario?.[0] ?? ""}
                    aria-label={`${dia}: ${t({ es: "desde", pt: "das" })}`}
                    className={`${CAMPO_EN_LINEA} text-sm`}
                  />
                  <span className="font-sans text-sm text-texto-suave">{t({ es: "a", pt: "às" })}</span>
                  <input
                    name={`hasta_${d.key}`}
                    type="time"
                    defaultValue={horario?.[1] ?? ""}
                    aria-label={`${dia}: ${t({ es: "hasta", pt: "até" })}`}
                    className={`${CAMPO_EN_LINEA} text-sm`}
                  />
                  <label className={`${CASILLA} ml-auto`}>
                    <input name={`cerrado_${d.key}`} type="checkbox" defaultChecked={!horario} />
                    {t({ es: "Cerrado", pt: "Fechado" })}
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        {conTurnos && (
          <>
            <section className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl text-texto">{t({ es: "Reglas de los turnos", pt: "Regras dos agendamentos" })}</h2>
              {numero(
                "horas_minimas_cancelacion",
                t({
                  es: "Horas mínimas para cancelar o reprogramar online",
                  pt: "Horas mínimas para cancelar ou reagendar online",
                }),
                config.horas_minimas_cancelacion,
                0,
                L.horasCancelacionMax,
              )}
              {numero(
                "minutos_preparacion_entre_turnos",
                t({ es: "Minutos de preparación entre turnos", pt: "Minutos de preparação entre atendimentos" }),
                config.minutos_preparacion_entre_turnos,
                0,
                L.minutosEntreTurnosMax,
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-serif text-2xl text-texto">{t({ es: "Pago al reservar", pt: "Pagamento ao agendar" })}</h2>
              {!cobraOnline && (
                <p role="status" className="rounded-lg bg-primario/10 px-4 py-3 font-sans text-sm text-primario-oscuro">
                  {t({
                    es: "Tu sitio todavía no tiene Mercado Pago conectado: con “Seña” o “Pago total” las reservas online no se pueden completar. Usá “Sin pago anticipado” hasta conectarlo.",
                    pt: "Seu site ainda não tem o Mercado Pago conectado: com “Sinal” ou “Pagamento total”, os agendamentos online não podem ser concluídos. Use “Sem pagamento antecipado” até conectá-lo.",
                  })}
                </p>
              )}
              {MODOS_PAGO.map((modo) => (
                <label key={modo} className={`${FILA} flex items-start gap-3`}>
                  <input
                    type="radio"
                    name="modo_pago"
                    value={modo}
                    defaultChecked={config.modo_pago === modo}
                    required
                    className="mt-1 accent-primario"
                  />
                  <span>
                    <span className="block font-sans text-sm font-medium text-texto">{t(NOMBRE_MODO_PAGO[modo])}</span>
                    <span className={`${AYUDA} block`}>{t(AYUDA_MODO[modo])}</span>
                  </span>
                </label>
              ))}
              {numero(
                "sena_porcentaje",
                t({ es: "Porcentaje de seña (%)", pt: "Porcentagem do sinal (%)" }),
                config.sena_porcentaje,
                1,
                100,
              )}
              <p className={AYUDA}>{t({ es: "Se usa solo con “Seña”.", pt: "Usada somente com “Sinal”." })}</p>
            </section>
          </>
        )}

        <div>
          <SubmitButton className={BOTON}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
        </div>
        <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
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

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/configuracion/actions.ts src/app/admin/configuracion/page.tsx
git commit -F - <<'EOF'
feat(panel): horarios y reglas traducidos, con el modo de pago de las reservas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Turnos del panel

**Files:**
- Rewrite: `src/app/admin/turnos/actions.ts`, `src/app/admin/turnos/page.tsx`

- [ ] **Step 1: Actions**

`src/app/admin/turnos/actions.ts` (reemplazo completo):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { isGoogleConfigurado, borrarEvento } from "@/lib/google-calendar/client";
import { parsearId } from "@/lib/panel/formularios";
import { ir, tenantDeAccion } from "@/lib/panel/servidor";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { datosDelTenant } from "@/lib/tenant/datos";
import type { Turno } from "@/lib/data/types";

const RUTA = "/admin/turnos";

export async function cancelarTurno(formData: FormData) {
  const tenant = await tenantDeAccion("turnos");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const db = datosDelTenant(tenant.id);

  const { data: fila } = await db
    .select("turnos", "google_calendar_event_id, estado")
    .eq("id", id)
    .maybeSingle();
  const turno = fila as unknown as Pick<Turno, "google_calendar_event_id" | "estado"> | null;
  if (!turno || (turno.estado !== "pendiente_pago" && turno.estado !== "confirmado")) ir(RUTA, { error: "id" });

  if (turno.google_calendar_event_id && isGoogleConfigurado() && usaCredencialesGlobales(tenant.slug)) {
    try {
      await borrarEvento(turno.google_calendar_event_id);
    } catch {
      // La cancelación sigue adelante aunque falle Calendar.
    }
  }

  const { data, error } = await db
    .update("turnos", { estado: "cancelado", google_calendar_event_id: null })
    .eq("id", id)
    .in("estado", ["pendiente_pago", "confirmado"])
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidatePath(RUTA);
  ir(RUTA, { ok: "turno_cancelado" });
}

export async function completarTurno(formData: FormData) {
  const tenant = await tenantDeAccion("turnos");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("turnos", { estado: "completado" })
    .eq("id", id)
    .eq("estado", "confirmado")
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidatePath(RUTA);
  ir(RUTA, { ok: "turno_completado" });
}
```

- [ ] **Step 2: Pantalla**

`src/app/admin/turnos/page.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import { ENLACE, FILA, Mensajes, SUBTITULO, TITULO, type ParamsPanel } from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getTurnosAdmin } from "@/lib/data/turnos";
import type { EstadoTurno } from "@/lib/data/types";
import { formatPrecio } from "@/lib/format";
import { LOCALES, traductor, type Textos } from "@/lib/i18n/textos";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { cancelarTurno, completarTurno } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Turnos", pt: "Agendamentos" });
}

const ESTADOS: Record<EstadoTurno, { etiqueta: Textos; clase: string }> = {
  pendiente_pago: {
    etiqueta: { es: "Pendiente de pago", pt: "Aguardando pagamento" },
    clase: "bg-secundario/10 text-secundario",
  },
  confirmado: { etiqueta: { es: "Confirmado", pt: "Confirmado" }, clase: "bg-primario/15 text-primario-oscuro" },
  cancelado: { etiqueta: { es: "Cancelado", pt: "Cancelado" }, clase: "bg-texto/5 text-texto-suave" },
  completado: { etiqueta: { es: "Completado", pt: "Concluído" }, clase: "bg-secundario/20 text-secundario-oscuro" },
};

export default async function TurnosAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("turnos");
  const t = traductor(tenant.idioma);
  const turnos = await getTurnosAdmin(tenant.id);

  return (
    <div>
      <h1 className={TITULO}>{t({ es: "Turnos", pt: "Agendamentos" })}</h1>
      <p className={SUBTITULO}>{t({ es: "Todos los turnos reservados, más recientes primero.", pt: "Todos os agendamentos, os mais recentes primeiro." })}</p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <div className="space-y-3">
        {turnos.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">{t({ es: "Todavía no hay turnos.", pt: "Ainda não há agendamentos." })}</p>
        )}
        {turnos.map((turno) => {
          const fechaHora = new Date(turno.fecha_hora).toLocaleString(LOCALES[tenant.idioma], {
            dateStyle: "long",
            timeStyle: "short",
            hourCycle: "h23",
            timeZone: tenant.zonaHoraria,
          });
          const estado = ESTADOS[turno.estado as EstadoTurno];
          const gestionable = turno.estado === "pendiente_pago" || turno.estado === "confirmado";
          return (
            <div key={turno.id} className={`${FILA} flex flex-wrap items-center justify-between gap-3 p-4`}>
              <div>
                <p className="font-serif text-lg text-texto">{turno.servicios.nombre}</p>
                <p className="font-sans text-sm text-texto-suave">{fechaHora}</p>
                <p className="font-sans text-sm text-texto-suave">
                  {turno.cliente_nombre} · {turno.cliente_email}
                  {turno.cliente_telefono ? ` · ${turno.cliente_telefono}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {turno.monto_sena != null && (
                  <span className="font-sans text-sm text-texto-suave">
                    {`${t({ es: "Cobro online", pt: "Pagamento online" })}: ${formatPrecio(turno.monto_sena, tenant.moneda, tenant.idioma)}`}
                  </span>
                )}
                <span className={`rounded-full px-3 py-1 font-sans text-xs font-medium ${estado?.clase ?? ""}`}>
                  {estado ? t(estado.etiqueta) : turno.estado}
                </span>
                {gestionable && (
                  <>
                    {turno.estado === "confirmado" && (
                      <form id={`form-completar-${turno.id}`} action={completarTurno}>
                        <input type="hidden" name="id" value={turno.id} />
                        <SubmitButton className="font-sans text-sm text-secundario hover:text-secundario-oscuro disabled:opacity-60">
                          {t({ es: "Marcar completado", pt: "Marcar como concluído" })}
                        </SubmitButton>
                        <FormPendingOverlay label={t({ es: "Guardando…", pt: "Salvando…" })} />
                      </form>
                    )}
                    <form id={`form-cancelar-${turno.id}`} action={cancelarTurno}>
                      <input type="hidden" name="id" value={turno.id} />
                      <SubmitButton className={ENLACE}>{t({ es: "Cancelar", pt: "Cancelar" })}</SubmitButton>
                      <FormPendingOverlay label={t({ es: "Cancelando…", pt: "Cancelando…" })} />
                    </form>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
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

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/turnos/actions.ts src/app/admin/turnos/page.tsx
git commit -F - <<'EOF'
feat(panel): turnos traducidos, con su módulo exigido en el servidor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 10: Textos de inicio y "sobre mí"

**Files:**
- Create: `src/app/admin/textos/actions.ts`, `src/app/admin/textos/page.tsx`

- [ ] **Step 1: Action**

`src/app/admin/textos/actions.ts`:

```ts
"use server";

import { columnasTextosSitio, parsearTextosSitio } from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";

const RUTA = "/admin/textos";

/**
 * Textos de inicio y, con su módulo, los de "sobre mí". Lista blanca: columnasTextosSitio
 * solo nombra esas columnas de tenant_marca (colores, imágenes y contacto son del master).
 */
export async function guardarTextosSitio(formData: FormData) {
  const tenant = await tenantDeAccion("textos");
  const textos = parsearTextosSitio(formData, tenant.modulos.sobreMi);
  if (!textos.ok) ir(RUTA, { error: textos.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("tenant_marca", columnasTextosSitio(textos.valor))
    .select("tenant_id");
  if (error || !data?.length) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}
```

- [ ] **Step 2: Pantalla**

`src/app/admin/textos/page.tsx`:

```tsx
import type { Metadata } from "next";
import { AYUDA, BOTON, CAMPO, ETIQUETA, Mensajes, SUBTITULO, TARJETA, TITULO, type ParamsPanel } from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { guardarTextosSitio } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Textos", pt: "Textos" });
}

export default async function TextosAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("textos");
  const t = traductor(tenant.idioma);
  const { marca } = tenant;

  return (
    <div className="max-w-2xl">
      <h1 className={TITULO}>{t({ es: "Textos del sitio", pt: "Textos do site" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: "Colores, logo, foto y datos de contacto los cambia la plataforma: pedíselo si necesitás cambiarlos.",
          pt: "Cores, logo, foto e dados de contato são alterados pela plataforma: peça se precisar mudá-los.",
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-textos-sitio" action={guardarTextosSitio} className={`${TARJETA} flex flex-col gap-4`}>
        <h2 className="font-serif text-2xl text-texto">{t({ es: "Inicio", pt: "Página inicial" })}</h2>
        <label className={ETIQUETA}>
          {t({ es: "Título", pt: "Título" })}
          <input name="inicio_titulo" defaultValue={marca.inicioTitulo} required maxLength={L.titulo} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {t({ es: "Destacado (va después del título, en el color de la marca)", pt: "Destaque (vem depois do título, na cor da marca)" })}
          <input name="inicio_destacado" defaultValue={marca.inicioDestacado ?? ""} maxLength={L.titulo} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {t({ es: "Texto", pt: "Texto" })}
          <textarea name="inicio_texto" defaultValue={marca.inicioTexto ?? ""} maxLength={L.texto} rows={4} className={CAMPO} />
        </label>

        {tenant.modulos.sobreMi && (
          <>
            <h2 className="mt-4 font-serif text-2xl text-texto">{t({ es: "Sobre mí", pt: "Sobre mim" })}</h2>
            <label className={ETIQUETA}>
              {t({ es: "Título", pt: "Título" })}
              <input name="sobre_mi_titulo" defaultValue={marca.sobreMiTitulo ?? ""} maxLength={L.titulo} className={CAMPO} />
              <span className={`${AYUDA} block`}>
                {t({ es: "Si lo dejás vacío, se usa el nombre del negocio.", pt: "Se ficar vazio, usa o nome do negócio." })}
              </span>
            </label>
            <label className={ETIQUETA}>
              {t({ es: "Texto", pt: "Texto" })}
              <textarea name="sobre_mi_texto" defaultValue={marca.sobreMiTexto ?? ""} maxLength={L.texto} rows={8} className={CAMPO} />
              <span className={`${AYUDA} block`}>
                {t({ es: "Separá los párrafos con una línea en blanco.", pt: "Separe os parágrafos com uma linha em branco." })}
              </span>
            </label>
          </>
        )}

        <div>
          <SubmitButton className={BOTON}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
        </div>
        <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
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

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/textos/actions.ts src/app/admin/textos/page.tsx
git commit -F - <<'EOF'
feat(panel): el cliente edita los textos de inicio y sobre mí

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 11: Testimonios y preguntas frecuentes

**Files:**
- Modify: `src/lib/data/testimonios.ts`
- Create: `src/lib/data/preguntas.ts`
- Create: `src/app/admin/testimonios/actions.ts`, `src/app/admin/testimonios/page.tsx`
- Create: `src/app/admin/preguntas/actions.ts`, `src/app/admin/preguntas/page.tsx`

- [ ] **Step 1: Lecturas**

En `src/lib/data/testimonios.ts`, reemplazar:

```ts
import type { Testimonio } from "./types";
```

por:

```ts
import type { Testimonio, TestimonioAdmin } from "./types";
```

y agregar al final:

```ts

/** Todos los testimonios del tenant, también los inactivos (panel). */
export async function getTestimoniosAdmin(tenantId: string): Promise<TestimonioAdmin[]> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("testimonios", "id, nombre, texto, orden, activo")
    .order("orden")
    .order("creado_en");
  if (error) throw new Error(error.message);
  return (data as unknown as TestimonioAdmin[]) ?? [];
}
```

`src/lib/data/preguntas.ts`:

```ts
import { datosDelTenant } from "@/lib/tenant/datos";
import type { PreguntaFrecuente } from "./types";

const COLUMNAS = "id, pregunta, respuesta, orden, activo";

/** Preguntas activas del tenant, en orden. Devuelve [] si la DB no responde. */
export async function getPreguntasPublicas(tenantId: string): Promise<PreguntaFrecuente[]> {
  try {
    const { data, error } = await datosDelTenant(tenantId)
      .select("preguntas_frecuentes", COLUMNAS)
      .eq("activo", true)
      .order("orden")
      .order("creado_en");
    if (error) return [];
    return (data as unknown as PreguntaFrecuente[]) ?? [];
  } catch {
    return [];
  }
}

/** Todas las preguntas del tenant, también las inactivas (panel). */
export async function getPreguntasAdmin(tenantId: string): Promise<PreguntaFrecuente[]> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("preguntas_frecuentes", COLUMNAS)
    .order("orden")
    .order("creado_en");
  if (error) throw new Error(error.message);
  return (data as unknown as PreguntaFrecuente[]) ?? [];
}
```

- [ ] **Step 2: Testimonios**

`src/app/admin/testimonios/actions.ts`:

```ts
"use server";

import { columnasTestimonio, parsearId, parsearTestimonio } from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";

const RUTA = "/admin/testimonios";

export async function crearTestimonio(formData: FormData) {
  const tenant = await tenantDeAccion("testimonios");
  const testimonio = parsearTestimonio(formData);
  if (!testimonio.ok) ir(RUTA, { error: testimonio.error });
  const { error } = await datosDelTenant(tenant.id).insert("testimonios", columnasTestimonio(testimonio.valor));
  if (error) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "creado" });
}

export async function editarTestimonio(formData: FormData) {
  const tenant = await tenantDeAccion("testimonios");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const testimonio = parsearTestimonio(formData);
  if (!testimonio.ok) ir(RUTA, { error: testimonio.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("testimonios", columnasTestimonio(testimonio.valor))
    .eq("id", id)
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}

export async function eliminarTestimonio(formData: FormData) {
  const tenant = await tenantDeAccion("testimonios");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const { data, error } = await datosDelTenant(tenant.id).delete("testimonios").eq("id", id).select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "eliminado" });
}
```

`src/app/admin/testimonios/page.tsx`:

```tsx
import type { Metadata } from "next";
import {
  BOTON,
  BOTON_SECUNDARIO,
  CAMPO,
  CAMPO_EN_LINEA,
  CASILLA,
  ENLACE,
  ETIQUETA,
  FILA,
  Mensajes,
  SUBTITULO,
  TARJETA,
  TITULO,
  type ParamsPanel,
} from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getTestimoniosAdmin } from "@/lib/data/testimonios";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { crearTestimonio, editarTestimonio, eliminarTestimonio } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Testimonios", pt: "Depoimentos" });
}

export default async function TestimoniosAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("testimonios");
  const t = traductor(tenant.idioma);
  const testimonios = await getTestimoniosAdmin(tenant.id);
  const etiqueta = {
    nombre: t({ es: "Nombre de quien opina", pt: "Nome de quem dá o depoimento" }),
    texto: t({ es: "Testimonio", pt: "Depoimento" }),
    orden: t({ es: "Orden", pt: "Ordem" }),
    activo: t({ es: "visible en el sitio", pt: "visível no site" }),
  };

  return (
    <div className="max-w-3xl">
      <h1 className={TITULO}>{t({ es: "Testimonios", pt: "Depoimentos" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: "Se muestran en el inicio del sitio, ordenados por el número de orden.",
          pt: "Aparecem na página inicial do site, na ordem indicada.",
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-nuevo-testimonio" action={crearTestimonio} className={`${TARJETA} flex flex-col gap-3`}>
        <h2 className="font-serif text-2xl text-texto">{t({ es: "Nuevo testimonio", pt: "Novo depoimento" })}</h2>
        <label className={ETIQUETA}>
          {etiqueta.nombre}
          <input name="nombre" required maxLength={L.nombre} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {etiqueta.texto}
          <textarea name="texto" required maxLength={L.testimonio} rows={3} className={CAMPO} />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label className={ETIQUETA}>
            {etiqueta.orden}
            <input name="orden" type="number" min={0} max={L.ordenMax} defaultValue={testimonios.length} className={`${CAMPO} w-24`} />
          </label>
          <label className={CASILLA}>
            <input name="activo" type="checkbox" defaultChecked />
            {etiqueta.activo}
          </label>
        </div>
        <div>
          <SubmitButton className={BOTON}>{t({ es: "Agregar", pt: "Adicionar" })}</SubmitButton>
        </div>
        <FormPendingOverlay label={t({ es: "Agregando…", pt: "Adicionando…" })} />
      </form>

      <div className="mt-6 space-y-3">
        {testimonios.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">
            {t({ es: "Todavía no hay testimonios.", pt: "Ainda não há depoimentos." })}
          </p>
        )}
        {testimonios.map((x) => (
          <div key={x.id} className={`${FILA} flex flex-col gap-3`}>
            <form id={`form-testimonio-${x.id}`} action={editarTestimonio} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={x.id} />
              <input
                name="nombre"
                defaultValue={x.nombre}
                aria-label={etiqueta.nombre}
                required
                maxLength={L.nombre}
                className={CAMPO_EN_LINEA}
              />
              <textarea
                name="texto"
                defaultValue={x.texto}
                aria-label={etiqueta.texto}
                required
                maxLength={L.testimonio}
                rows={3}
                className={CAMPO_EN_LINEA}
              />
              <div className="flex flex-wrap items-center gap-4">
                <input
                  name="orden"
                  type="number"
                  min={0}
                  max={L.ordenMax}
                  defaultValue={x.orden}
                  aria-label={etiqueta.orden}
                  className={`${CAMPO_EN_LINEA} w-20`}
                />
                <label className={CASILLA}>
                  <input name="activo" type="checkbox" defaultChecked={x.activo} />
                  {etiqueta.activo}
                </label>
                <SubmitButton className={BOTON_SECUNDARIO}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
              </div>
              <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
            </form>
            <form id={`form-eliminar-testimonio-${x.id}`} action={eliminarTestimonio}>
              <input type="hidden" name="id" value={x.id} />
              <SubmitButton className={ENLACE}>{t({ es: "Eliminar", pt: "Excluir" })}</SubmitButton>
              <FormPendingOverlay label={t({ es: "Eliminando…", pt: "Excluindo…" })} />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Preguntas frecuentes**

`src/app/admin/preguntas/actions.ts`:

```ts
"use server";

import { columnasPregunta, parsearId, parsearPregunta } from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";

const RUTA = "/admin/preguntas";

export async function crearPregunta(formData: FormData) {
  const tenant = await tenantDeAccion("preguntas");
  const pregunta = parsearPregunta(formData);
  if (!pregunta.ok) ir(RUTA, { error: pregunta.error });
  const { error } = await datosDelTenant(tenant.id).insert("preguntas_frecuentes", columnasPregunta(pregunta.valor));
  if (error) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "creado" });
}

export async function editarPregunta(formData: FormData) {
  const tenant = await tenantDeAccion("preguntas");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const pregunta = parsearPregunta(formData);
  if (!pregunta.ok) ir(RUTA, { error: pregunta.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("preguntas_frecuentes", columnasPregunta(pregunta.valor))
    .eq("id", id)
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}

export async function eliminarPregunta(formData: FormData) {
  const tenant = await tenantDeAccion("preguntas");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const { data, error } = await datosDelTenant(tenant.id).delete("preguntas_frecuentes").eq("id", id).select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "eliminado" });
}
```

`src/app/admin/preguntas/page.tsx`:

```tsx
import type { Metadata } from "next";
import {
  BOTON,
  BOTON_SECUNDARIO,
  CAMPO,
  CAMPO_EN_LINEA,
  CASILLA,
  ENLACE,
  ETIQUETA,
  FILA,
  Mensajes,
  SUBTITULO,
  TARJETA,
  TITULO,
  type ParamsPanel,
} from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getPreguntasAdmin } from "@/lib/data/preguntas";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { crearPregunta, editarPregunta, eliminarPregunta } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Preguntas frecuentes", pt: "Perguntas frequentes" });
}

export default async function PreguntasAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("preguntas");
  const t = traductor(tenant.idioma);
  const preguntas = await getPreguntasAdmin(tenant.id);
  const etiqueta = {
    pregunta: t({ es: "Pregunta", pt: "Pergunta" }),
    respuesta: t({ es: "Respuesta", pt: "Resposta" }),
    orden: t({ es: "Orden", pt: "Ordem" }),
    activo: t({ es: "visible en el sitio", pt: "visível no site" }),
  };

  return (
    <div className="max-w-3xl">
      <h1 className={TITULO}>{t({ es: "Preguntas frecuentes", pt: "Perguntas frequentes" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: "Se muestran en el inicio del sitio. Separá los párrafos de una respuesta con una línea en blanco.",
          pt: "Aparecem na página inicial do site. Separe os parágrafos de uma resposta com uma linha em branco.",
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-nueva-pregunta" action={crearPregunta} className={`${TARJETA} flex flex-col gap-3`}>
        <h2 className="font-serif text-2xl text-texto">{t({ es: "Nueva pregunta", pt: "Nova pergunta" })}</h2>
        <label className={ETIQUETA}>
          {etiqueta.pregunta}
          <input name="pregunta" required maxLength={L.pregunta} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {etiqueta.respuesta}
          <textarea name="respuesta" required maxLength={L.respuesta} rows={4} className={CAMPO} />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label className={ETIQUETA}>
            {etiqueta.orden}
            <input name="orden" type="number" min={0} max={L.ordenMax} defaultValue={preguntas.length} className={`${CAMPO} w-24`} />
          </label>
          <label className={CASILLA}>
            <input name="activo" type="checkbox" defaultChecked />
            {etiqueta.activo}
          </label>
        </div>
        <div>
          <SubmitButton className={BOTON}>{t({ es: "Agregar", pt: "Adicionar" })}</SubmitButton>
        </div>
        <FormPendingOverlay label={t({ es: "Agregando…", pt: "Adicionando…" })} />
      </form>

      <div className="mt-6 space-y-3">
        {preguntas.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">{t({ es: "Todavía no hay preguntas.", pt: "Ainda não há perguntas." })}</p>
        )}
        {preguntas.map((p) => (
          <div key={p.id} className={`${FILA} flex flex-col gap-3`}>
            <form id={`form-pregunta-${p.id}`} action={editarPregunta} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={p.id} />
              <input
                name="pregunta"
                defaultValue={p.pregunta}
                aria-label={etiqueta.pregunta}
                required
                maxLength={L.pregunta}
                className={CAMPO_EN_LINEA}
              />
              <textarea
                name="respuesta"
                defaultValue={p.respuesta}
                aria-label={etiqueta.respuesta}
                required
                maxLength={L.respuesta}
                rows={4}
                className={CAMPO_EN_LINEA}
              />
              <div className="flex flex-wrap items-center gap-4">
                <input
                  name="orden"
                  type="number"
                  min={0}
                  max={L.ordenMax}
                  defaultValue={p.orden}
                  aria-label={etiqueta.orden}
                  className={`${CAMPO_EN_LINEA} w-20`}
                />
                <label className={CASILLA}>
                  <input name="activo" type="checkbox" defaultChecked={p.activo} />
                  {etiqueta.activo}
                </label>
                <SubmitButton className={BOTON_SECUNDARIO}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
              </div>
              <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
            </form>
            <form id={`form-eliminar-pregunta-${p.id}`} action={eliminarPregunta}>
              <input type="hidden" name="id" value={p.id} />
              <SubmitButton className={ENLACE}>{t({ es: "Eliminar", pt: "Excluir" })}</SubmitButton>
              <FormPendingOverlay label={t({ es: "Eliminando…", pt: "Excluindo…" })} />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Tipos, lint y build**

```bash
npx tsc --noEmit
npx eslint src
npm run build
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/testimonios.ts src/lib/data/preguntas.ts src/app/admin/testimonios/actions.ts src/app/admin/testimonios/page.tsx src/app/admin/preguntas/actions.ts src/app/admin/preguntas/page.tsx
git commit -F - <<'EOF'
feat(panel): testimonios y preguntas frecuentes editables por el cliente

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 12: Galería

**Files:**
- Modify: `src/lib/storage/sitios.ts`
- Create: `src/lib/data/galeria.ts`
- Create: `src/app/admin/galeria/actions.ts`, `src/app/admin/galeria/page.tsx`

- [ ] **Step 1: Subir imágenes de la galería**

En `src/lib/storage/sitios.ts`, reemplazar:

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BUCKET_SITIOS,
  detectarFormato,
  MIME_FORMATO,
  pathImagen,
  urlPublica,
  type FormatoImagen,
  type TipoImagen,
} from "./imagenes";
```

por:

```ts
import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BUCKET_SITIOS,
  detectarFormato,
  MIME_FORMATO,
  pathImagen,
  pathImagenGaleria,
  urlPublica,
  type FormatoImagen,
  type TipoImagen,
} from "./imagenes";
```

y agregar al final:

```ts

/**
 * Sube una imagen de la galería ya validada y devuelve su URL pública. Igual que las de la
 * marca: Content-Type y extensión del formato real, una URL nueva por subida.
 */
export async function subirImagenGaleria(tenantId: string, bytes: Buffer, formato: FormatoImagen): Promise<string> {
  if (detectarFormato(bytes) !== formato) throw new Error("El formato no coincide con el contenido de la imagen");
  const path = pathImagenGaleria(tenantId, formato, new Date(), randomBytes(4).toString("hex"));
  const { error } = await createAdminClient()
    .storage.from(BUCKET_SITIOS)
    .upload(path, bytes, { contentType: MIME_FORMATO[formato], cacheControl: "86400", upsert: false });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return urlPublica(urlSupabase(), path);
}
```

- [ ] **Step 2: Lecturas**

`src/lib/data/galeria.ts`:

```ts
import { datosDelTenant } from "@/lib/tenant/datos";
import type { ImagenGaleria } from "./types";

const COLUMNAS = "id, imagen_url, descripcion, orden, activo";

/** Imágenes activas del tenant, en orden. Devuelve [] si la DB no responde. */
export async function getGaleriaPublica(tenantId: string): Promise<ImagenGaleria[]> {
  try {
    const { data, error } = await datosDelTenant(tenantId)
      .select("galeria", COLUMNAS)
      .eq("activo", true)
      .order("orden")
      .order("creado_en");
    if (error) return [];
    return (data as unknown as ImagenGaleria[]) ?? [];
  } catch {
    return [];
  }
}

/** Todas las imágenes del tenant, también las ocultas (panel). */
export async function getGaleriaAdmin(tenantId: string): Promise<ImagenGaleria[]> {
  const { data, error } = await datosDelTenant(tenantId).select("galeria", COLUMNAS).order("orden").order("creado_en");
  if (error) throw new Error(error.message);
  return (data as unknown as ImagenGaleria[]) ?? [];
}
```

- [ ] **Step 3: Actions**

`src/app/admin/galeria/actions.ts`:

```ts
"use server";

import { parsearDescripcionImagen, parsearId, parsearImagenGaleria } from "@/lib/panel/formularios";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { pathDeImagenGaleria, validarImagen, validarTamano } from "@/lib/storage/imagenes";
import { borrarImagenSitio, subirImagenGaleria, urlSupabase } from "@/lib/storage/sitios";
import { datosDelTenant } from "@/lib/tenant/datos";

const RUTA = "/admin/galeria";

/** Una imagen por envío (hasta 2 MB; bodySizeLimit de 3 MB). PNG, JPG o WebP según sus bytes. */
export async function subirImagen(formData: FormData) {
  const tenant = await tenantDeAccion("galeria");
  const descripcion = parsearDescripcionImagen(formData);
  if (!descripcion.ok) ir(RUTA, { error: descripcion.error });
  const archivo = formData.get("archivo");
  if (!(archivo instanceof Blob)) ir(RUTA, { error: "imagen_vacia" });
  // El tamaño se mira antes de leer el contenido.
  const problemaTamano = validarTamano(archivo.size);
  if (problemaTamano) ir(RUTA, { error: problemaTamano });

  const db = datosDelTenant(tenant.id);
  const { data: filas, error: errorConteo } = await db.select("galeria", "id");
  if (errorConteo) ir(RUTA, { error: "error" });
  const cantidad = filas?.length ?? 0;
  if (cantidad >= L.imagenesGaleria) ir(RUTA, { error: "galeria_llena" });

  const bytes = Buffer.from(await archivo.arrayBuffer());
  // El formato (y con él el Content-Type y la extensión) sale de los bytes, nunca de archivo.type.
  const imagen = validarImagen(bytes);
  if (!imagen.ok) ir(RUTA, { error: imagen.error });
  const url = await subirImagenGaleria(tenant.id, bytes, imagen.formato);
  const { error } = await db.insert("galeria", {
    imagen_url: url,
    descripcion: descripcion.valor,
    orden: Math.min(cantidad, L.ordenMax),
  });
  if (error) {
    // Sin la fila, el objeto quedaría huérfano en el bucket.
    const path = pathDeImagenGaleria(url, urlSupabase(), tenant.id);
    if (path) await borrarImagenSitio(path).catch(() => undefined);
    ir(RUTA, { error: "error" });
  }
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "imagen_subida" });
}

export async function editarImagen(formData: FormData) {
  const tenant = await tenantDeAccion("galeria");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const imagen = parsearImagenGaleria(formData);
  if (!imagen.ok) ir(RUTA, { error: imagen.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("galeria", { descripcion: imagen.valor.descripcion, orden: imagen.valor.orden, activo: imagen.valor.activo })
    .eq("id", id)
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}

export async function eliminarImagen(formData: FormData) {
  const tenant = await tenantDeAccion("galeria");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const { data, error } = await datosDelTenant(tenant.id).delete("galeria").eq("id", id).select("imagen_url");
  if (error) ir(RUTA, { error: "error" });
  const fila = (data as unknown as { imagen_url: string }[] | null)?.[0];
  if (!fila) ir(RUTA, { error: "id" });
  // La URL sale de la fila del tenant (no del formulario) y solo se borra si es de su galería.
  const path = pathDeImagenGaleria(fila.imagen_url, urlSupabase(), tenant.id);
  if (path) {
    try {
      await borrarImagenSitio(path);
    } catch (e) {
      console.error("No se pudo borrar la imagen de la galería del bucket:", e);
    }
  }
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "eliminado" });
}
```

- [ ] **Step 4: Pantalla**

`src/app/admin/galeria/page.tsx`:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import {
  AYUDA,
  BOTON,
  BOTON_SECUNDARIO,
  CAMPO,
  CAMPO_EN_LINEA,
  CASILLA,
  ENLACE,
  ETIQUETA,
  FILA,
  Mensajes,
  SUBTITULO,
  TARJETA,
  TITULO,
  type ParamsPanel,
} from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getGaleriaAdmin } from "@/lib/data/galeria";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { editarImagen, eliminarImagen, subirImagen } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Galería", pt: "Galeria" });
}

export default async function GaleriaAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("galeria");
  const t = traductor(tenant.idioma);
  const imagenes = await getGaleriaAdmin(tenant.id);
  const llena = imagenes.length >= L.imagenesGaleria;
  const etiqueta = {
    descripcion: t({ es: "Descripción (opcional)", pt: "Descrição (opcional)" }),
    orden: t({ es: "Orden", pt: "Ordem" }),
    activo: t({ es: "visible en el sitio", pt: "visível no site" }),
  };

  return (
    <div>
      <h1 className={TITULO}>{t({ es: "Galería", pt: "Galeria" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: `Fotos de tus trabajos para el inicio del sitio: ${imagenes.length} de ${L.imagenesGaleria}.`,
          pt: `Fotos dos seus trabalhos para a página inicial do site: ${imagenes.length} de ${L.imagenesGaleria}.`,
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      {!llena && (
        <form id="form-subir-imagen" action={subirImagen} className={`${TARJETA} flex max-w-2xl flex-col gap-3`}>
          <h2 className="font-serif text-2xl text-texto">{t({ es: "Subir una imagen", pt: "Enviar uma imagem" })}</h2>
          <label className={ETIQUETA}>
            {t({ es: "Imagen", pt: "Imagem" })}
            <input name="archivo" type="file" accept="image/png,image/jpeg,image/webp" required className="mt-1 block font-sans text-sm" />
            <span className={`${AYUDA} block`}>
              {t({ es: "PNG, JPG o WebP, hasta 2 MB.", pt: "PNG, JPG ou WebP, até 2 MB." })}
            </span>
          </label>
          <label className={ETIQUETA}>
            {etiqueta.descripcion}
            <input name="descripcion" maxLength={L.descripcionImagen} className={CAMPO} />
          </label>
          <div>
            <SubmitButton className={BOTON}>{t({ es: "Subir", pt: "Enviar" })}</SubmitButton>
          </div>
          <FormPendingOverlay label={t({ es: "Subiendo…", pt: "Enviando…" })} />
        </form>
      )}

      {imagenes.length === 0 && (
        <p className="mt-6 font-sans text-sm text-texto-suave">{t({ es: "Todavía no hay imágenes.", pt: "Ainda não há imagens." })}</p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {imagenes.map((img) => (
          <div key={img.id} className={`${FILA} flex flex-col gap-3`}>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-fondo">
              <Image
                src={img.imagen_url}
                alt={img.descripcion ?? ""}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <form id={`form-imagen-${img.id}`} action={editarImagen} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={img.id} />
              <input
                name="descripcion"
                defaultValue={img.descripcion ?? ""}
                aria-label={etiqueta.descripcion}
                placeholder={etiqueta.descripcion}
                maxLength={L.descripcionImagen}
                className={CAMPO_EN_LINEA}
              />
              <div className="flex flex-wrap items-center gap-3">
                <input
                  name="orden"
                  type="number"
                  min={0}
                  max={L.ordenMax}
                  defaultValue={img.orden}
                  aria-label={etiqueta.orden}
                  className={`${CAMPO_EN_LINEA} w-20`}
                />
                <label className={CASILLA}>
                  <input name="activo" type="checkbox" defaultChecked={img.activo} />
                  {etiqueta.activo}
                </label>
                <SubmitButton className={BOTON_SECUNDARIO}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
              </div>
              <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
            </form>
            <form id={`form-eliminar-imagen-${img.id}`} action={eliminarImagen}>
              <input type="hidden" name="id" value={img.id} />
              <SubmitButton className={ENLACE}>{t({ es: "Eliminar", pt: "Excluir" })}</SubmitButton>
              <FormPendingOverlay label={t({ es: "Eliminando…", pt: "Excluindo…" })} />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Tipos, lint y build**

```bash
npx tsc --noEmit
npx eslint src
npm run build
```

Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage/sitios.ts src/lib/data/galeria.ts src/app/admin/galeria/actions.ts src/app/admin/galeria/page.tsx
git commit -F - <<'EOF'
feat(panel): galería de imágenes del cliente en el bucket sitios

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 13: Sitio público: galería, preguntas frecuentes, WhatsApp flotante y menú con contenido

**Files:**
- Create: `src/lib/data/contenido.ts`
- Create: `src/components/landing/Galeria.tsx`, `src/components/landing/PreguntasFrecuentes.tsx`, `src/components/landing/BotonWhatsapp.tsx`
- Rewrite: `src/components/landing/Nav.tsx`, `src/app/sitio/[tenant]/layout.tsx`, `src/app/sitio/[tenant]/page.tsx`

- [ ] **Step 1: Qué secciones tienen contenido**

`src/lib/data/contenido.ts`:

```ts
import { datosDelTenant } from "@/lib/tenant/datos";
import type { ContenidoSitio } from "@/lib/sitio/enlaces";
import type { Tenant } from "@/lib/tenant/tipos";

type Consulta = PromiseLike<{ data: unknown; error: unknown }>;

/** ¿Devuelve al menos una fila? Ante un error de la base, false: la sección no se enlaza. */
async function hay(consulta: Consulta): Promise<boolean> {
  try {
    const { data, error } = await consulta;
    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Qué secciones del sitio tienen algo visible, para el menú (enlacesDelSitio). Solo se
 * consulta lo de los módulos activos, y cada consulta trae a lo sumo una fila.
 */
export async function contenidoDelSitio(tenant: Tenant): Promise<ContenidoSitio> {
  const db = datosDelTenant(tenant.id);
  const { modulos } = tenant;
  const [servicios, testimonios, galeria, preguntas, cursos] = await Promise.all([
    hay(db.select("servicios", "id").eq("activo", true).limit(1)),
    modulos.testimonios ? hay(db.select("testimonios", "id").eq("activo", true).limit(1)) : false,
    modulos.galeria ? hay(db.select("galeria", "id").eq("activo", true).limit(1)) : false,
    modulos.faq ? hay(db.select("preguntas_frecuentes", "id").eq("activo", true).limit(1)) : false,
    modulos.cursos ? hay(db.select("cursos", "id").eq("estado", "publicado").limit(1)) : false,
  ]);
  return { servicios, testimonios, galeria, preguntas, cursos };
}
```

- [ ] **Step 2: Componentes**

`src/components/landing/Galeria.tsx`:

```tsx
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import type { ImagenGaleria } from "@/lib/data/types";
import { traductor, type Idioma } from "@/lib/i18n/textos";

export function Galeria({ imagenes, nombre, idioma }: { imagenes: ImagenGaleria[]; nombre: string; idioma: Idioma }) {
  const t = traductor(idioma);
  return (
    <Section id="galeria" className="bg-fondo-oscuro">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">{t({ es: "Galería", pt: "Galeria" })}</p>
          <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">{t({ es: "Mis trabajos", pt: "Meus trabalhos" })}</h2>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
          {imagenes.map((img) => (
            <figure key={img.id} className="overflow-hidden rounded-2xl bg-fondo">
              <div className="relative aspect-square">
                <Image
                  src={img.imagen_url}
                  alt={img.descripcion ?? nombre}
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="object-cover"
                />
              </div>
              {img.descripcion && (
                <figcaption className="px-4 py-3 font-sans text-sm text-texto-suave">{img.descripcion}</figcaption>
              )}
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

`src/components/landing/PreguntasFrecuentes.tsx`:

```tsx
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import type { PreguntaFrecuente } from "@/lib/data/types";
import { traductor, type Idioma } from "@/lib/i18n/textos";

/** Acordeón sin JavaScript (<details>): cada respuesta se separa en párrafos por líneas en blanco. */
export function PreguntasFrecuentes({ preguntas, idioma }: { preguntas: PreguntaFrecuente[]; idioma: Idioma }) {
  const t = traductor(idioma);
  return (
    <Section id="preguntas-frecuentes" className="bg-fondo">
      <Container className="max-w-3xl">
        <div className="text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
            {t({ es: "Preguntas frecuentes", pt: "Perguntas frequentes" })}
          </p>
          <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
            {t({ es: "Lo que más me consultan", pt: "O que mais me perguntam" })}
          </h2>
        </div>
        <div className="mt-10 divide-y divide-primario/15 rounded-2xl border border-primario/15 bg-white/60">
          {preguntas.map((p) => (
            <details key={p.id} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-serif text-xl text-texto">
                {p.pregunta}
                <span aria-hidden className="text-primario transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="mt-3 space-y-3 font-sans text-texto-suave">
                {p.respuesta
                  .split(/\n\s*\n/)
                  .map((parrafo) => parrafo.trim())
                  .filter(Boolean)
                  .map((parrafo, i) => (
                    <p key={i}>{parrafo}</p>
                  ))}
              </div>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

`src/components/landing/BotonWhatsapp.tsx`:

```tsx
import { traducir, type Idioma } from "@/lib/i18n/textos";

/**
 * Botón flotante de WhatsApp (módulo whatsapp). La URL viene de whatsappLink (número del
 * tenant y mensaje precargado). Usa el color primario de la marca, cuyo contraste con el texto
 * de los botones ya valida el master.
 */
export function BotonWhatsapp({ url, idioma }: { url: string; idioma: Idioma }) {
  const etiqueta = traducir(idioma, { es: "Escribinos por WhatsApp", pt: "Fale com a gente no WhatsApp" });
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={etiqueta}
      title={etiqueta}
      className="fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primario text-fondo shadow-lg transition hover:bg-primario-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
    >
      <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    </a>
  );
}
```

`src/components/landing/Nav.tsx` (reemplazo completo):

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useT } from "@/lib/i18n/cliente";
import { DESTINO_ENLACE, type EnlaceSitio } from "@/lib/sitio/enlaces";

/** Menú del sitio. Los enlaces los decide el layout (enlacesDelSitio): solo secciones con contenido. */
export function Nav({
  nombre,
  logoUrl,
  enlaces,
  reservaOnline,
  whatsappUrl,
}: {
  nombre: string;
  logoUrl: string | null;
  enlaces: EnlaceSitio[];
  reservaOnline: boolean;
  whatsappUrl: string | null;
}) {
  const t = useT();
  const links = enlaces.map((e) => ({ href: DESTINO_ENLACE[e].href, label: t(DESTINO_ENLACE[e].etiqueta) }));
  const reservarHref = reservaOnline ? "/turnos" : whatsappUrl;
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
            <Link key={l.href} href={l.href} className="font-sans text-sm text-texto transition hover:text-primario">
              {l.label}
            </Link>
          ))}
          {reservarHref && <Button href={reservarHref}>{reservarTexto}</Button>}
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center text-texto md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t({ es: "Cerrar menú", pt: "Fechar menu" }) : t({ es: "Abrir menú", pt: "Abrir menu" })}
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

- [ ] **Step 3: Layout y home del sitio**

`src/app/sitio/[tenant]/layout.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonWhatsapp } from "@/components/landing/BotonWhatsapp";
import { Footer } from "@/components/landing/Footer";
import { Nav } from "@/components/landing/Nav";
import { SitioSuspendido } from "@/components/landing/SitioSuspendido";
import { contenidoDelSitio } from "@/lib/data/contenido";
import { IdiomaProvider } from "@/lib/i18n/cliente";
import { traducir } from "@/lib/i18n/textos";
import { enlacesDelSitio } from "@/lib/sitio/enlaces";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { estiloMarca } from "@/lib/tenant/estilo";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";

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
  const activo = tenant.estado === "activo";
  const whatsappUrl = whatsappLink(tenant.marca.whatsapp, traducir(tenant.idioma, MENSAJES_WHATSAPP.consulta));
  // El menú solo enlaza secciones con contenido (y de módulos activos).
  const enlaces = activo ? enlacesDelSitio(tenant.modulos, await contenidoDelSitio(tenant)) : [];

  return (
    <IdiomaProvider idioma={tenant.idioma}>
      {/* Colores de la marca: las clases (bg-primario, text-texto…) leen estas variables. */}
      <div style={estiloMarca(tenant.marca)} className="flex flex-1 flex-col bg-fondo text-texto">
        {!activo ? (
          <SitioSuspendido nombre={tenant.nombre} idioma={tenant.idioma} />
        ) : (
          <>
            <Nav
              nombre={tenant.nombre}
              logoUrl={tenant.marca.logoUrl}
              enlaces={enlaces}
              reservaOnline={tenant.modulos.turnos}
              whatsappUrl={whatsappUrl}
            />
            {children}
            <Footer tenant={tenant} />
            {tenant.modulos.whatsapp && whatsappUrl && <BotonWhatsapp url={whatsappUrl} idioma={tenant.idioma} />}
          </>
        )}
      </div>
    </IdiomaProvider>
  );
}
```

`src/app/sitio/[tenant]/page.tsx` (reemplazo completo):

```tsx
import { CtaWhatsapp } from "@/components/landing/CtaWhatsapp";
import { Galeria } from "@/components/landing/Galeria";
import { Hero } from "@/components/landing/Hero";
import { PreguntasFrecuentes } from "@/components/landing/PreguntasFrecuentes";
import { Redes } from "@/components/landing/Redes";
import { Servicios } from "@/components/landing/Servicios";
import { SobreMi } from "@/components/landing/SobreMi";
import { Testimonios } from "@/components/landing/Testimonios";
import { getGaleriaPublica } from "@/lib/data/galeria";
import { getPreguntasPublicas } from "@/lib/data/preguntas";
import { getTestimonios } from "@/lib/data/testimonios";
import { tenantDeLaPagina } from "@/lib/tenant/actual";

export default async function Inicio({ params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await tenantDeLaPagina(params);
  const { modulos, marca, idioma } = tenant;
  const [testimonios, imagenes, preguntas] = await Promise.all([
    modulos.testimonios ? getTestimonios(tenant.id) : [],
    modulos.galeria ? getGaleriaPublica(tenant.id) : [],
    modulos.faq ? getPreguntasPublicas(tenant.id) : [],
  ]);

  return (
    <main>
      <Hero tenant={tenant} />
      <Servicios tenant={tenant} />
      {modulos.sobreMi && <SobreMi nombre={tenant.nombre} marca={marca} idioma={idioma} />}
      {testimonios.length > 0 && <Testimonios testimonios={testimonios} idioma={idioma} />}
      {imagenes.length > 0 && <Galeria imagenes={imagenes} nombre={tenant.nombre} idioma={idioma} />}
      {preguntas.length > 0 && <PreguntasFrecuentes preguntas={preguntas} idioma={idioma} />}
      {marca.instagram && <Redes instagram={marca.instagram} idioma={idioma} />}
      <CtaWhatsapp tenant={tenant} />
    </main>
  );
}
```

- [ ] **Step 4: Tipos, lint y build**

```bash
npx tsc --noEmit
npx eslint src
npm run build
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/contenido.ts src/components/landing/Galeria.tsx src/components/landing/PreguntasFrecuentes.tsx src/components/landing/BotonWhatsapp.tsx src/components/landing/Nav.tsx "src/app/sitio/[tenant]/layout.tsx" "src/app/sitio/[tenant]/page.tsx"
git commit -F - <<'EOF'
feat(sitio): galería, preguntas frecuentes, WhatsApp flotante y menú solo con contenido

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 14: La reserva respeta el modo de pago

**Files:**
- Create: `src/lib/turnos/confirmacion.ts`
- Rewrite: `src/app/api/webhooks/mercadopago/route.ts`, `src/app/sitio/[tenant]/turnos/actions.ts`, `src/app/sitio/[tenant]/turnos/gracias/page.tsx`
- Modify: `src/lib/data/turnos.ts`, `src/components/turnos/ReservaForm.tsx`, `src/components/turnos/GestionPanel.tsx`, `src/app/sitio/[tenant]/turnos/page.tsx`, `src/app/sitio/[tenant]/turnos/gestion/[token]/page.tsx`

- [ ] **Step 1: Lo que pasa al confirmar un turno, en un solo lugar**

`src/lib/turnos/confirmacion.ts`:

```ts
import "server-only";
import { isEmailConfigurado, enviarEmail } from "@/lib/email/gmail";
import { plantillaConfirmacionTurno } from "@/lib/email/plantillas";
import { isGoogleConfigurado, crearEvento } from "@/lib/google-calendar/client";
import { LOCALES, type Idioma } from "@/lib/i18n/textos";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { urlDelTenant } from "@/lib/tenant/urls";

/**
 * Lo que pasa cuando un turno queda confirmado (pago aprobado por Mercado Pago o reserva sin
 * pago anticipado): el evento de Google Calendar y el email de confirmación. Hasta la etapa D
 * los dos usan las credenciales globales del .env (el Calendar y el Gmail de un solo cliente,
 * y la plantilla del email lleva su logo), así que solo corren para ese tenant
 * (usaCredencialesGlobales). Son best effort: un fallo no deshace la confirmación.
 */
export type TurnoConfirmado = {
  slug: string;
  idioma: Idioma;
  zonaHoraria: string;
  servicio: string;
  clienteNombre: string;
  clienteEmail: string;
  fechaHoraIso: string;
  duracionMinutos: number;
  tokenGestion: string;
};

/** Id del evento creado, o null si no corresponde o falló. */
export async function crearEventoDeTurno(turno: TurnoConfirmado, descripcion: string): Promise<string | null> {
  if (!isGoogleConfigurado() || !usaCredencialesGlobales(turno.slug)) return null;
  try {
    const fin = new Date(new Date(turno.fechaHoraIso).getTime() + turno.duracionMinutos * 60000).toISOString();
    return await crearEvento({
      titulo: `${turno.servicio} — ${turno.clienteNombre}`,
      descripcion,
      inicioIso: turno.fechaHoraIso,
      finIso: fin,
      clienteEmail: turno.clienteEmail,
    });
  } catch {
    return null;
  }
}

export async function enviarConfirmacionDeTurno(turno: TurnoConfirmado): Promise<void> {
  if (!isEmailConfigurado() || !usaCredencialesGlobales(turno.slug)) return;
  const fechaHoraTexto = new Date(turno.fechaHoraIso).toLocaleString(LOCALES[turno.idioma], {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: turno.zonaHoraria,
  });
  const { subject, html } = plantillaConfirmacionTurno({
    servicio: turno.servicio,
    fechaHoraTexto,
    linkGestion: `${urlDelTenant(turno.slug)}/turnos/gestion/${turno.tokenGestion}`,
  });
  try {
    await enviarEmail({ to: turno.clienteEmail, subject, html });
  } catch {
    // El turno ya quedó confirmado; el email es best effort.
  }
}
```

`src/app/api/webhooks/mercadopago/route.ts` (reemplazo completo; el procesamiento de cursos no cambia):

```ts
import { NextRequest, NextResponse } from "next/server";
import { verificarFirmaWebhook } from "@/lib/mercadopago/signature";
import { obtenerPago, type MpPayment } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigurado, enviarEmail } from "@/lib/email/gmail";
import { plantillaCompraCurso } from "@/lib/email/plantillas";
import { calcularExpiracion } from "@/lib/cursos/reglas";
import { crearEventoDeTurno, enviarConfirmacionDeTurno, type TurnoConfirmado } from "@/lib/turnos/confirmacion";
import { datosDelTenant } from "@/lib/tenant/datos";
import { urlDelTenant } from "@/lib/tenant/urls";
import type { Idioma } from "@/lib/i18n/textos";

/**
 * Webhook de Mercado Pago. Nunca confía en el payload por sí solo:
 * (1) verifica la firma, (2) reconsulta el pago contra la API de MP.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const dataId: string | undefined =
    body?.data?.id ?? request.nextUrl.searchParams.get("data.id") ?? undefined;
  const tipo: string | undefined =
    body?.type ?? request.nextUrl.searchParams.get("type") ?? undefined;

  if (tipo !== "payment" || !dataId) {
    return NextResponse.json({ received: true });
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret && secret !== "xxx") {
    const firmaOk = verificarFirmaWebhook({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret,
    });
    if (!firmaOk) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
  }
  // Sin MP_WEBHOOK_SECRET configurado, no se puede verificar la firma; se
  // procesa igual (la reconsulta contra la API de MP abajo sigue siendo la
  // fuente de verdad), pero esto DEBE configurarse antes de producción.

  let pago;
  try {
    pago = await obtenerPago(dataId);
  } catch {
    return NextResponse.json({ error: "No se pudo consultar el pago" }, { status: 502 });
  }

  const [refTipo, refId] = (pago.externalReference ?? "").split(":");
  if (refTipo === "turno" && refId) {
    // Una reserva puede combinar varios servicios consecutivos -> varios turnos.
    for (const turnoId of refId.split(",")) {
      await procesarPagoTurno(turnoId, pago.status, pago.id);
    }
  } else if (refTipo === "curso" && refId) {
    await procesarPagoCurso(refId, pago);
  }

  return NextResponse.json({ received: true });
}

async function procesarPagoTurno(turnoId: string, estadoPago: string, mpPaymentId: string) {
  if (estadoPago !== "approved") return;

  // El pago llega sin tenant: se resuelve desde el turno (consulta de sistema por id).
  const { data: turno } = await createAdminClient()
    .from("turnos")
    .select("*, servicios(nombre), tenants(slug, zona_horaria, idioma)")
    .eq("id", turnoId)
    .maybeSingle();

  if (!turno || turno.estado !== "pendiente_pago") return; // ya procesado o inexistente
  const db = datosDelTenant(turno.tenant_id);
  const confirmado: TurnoConfirmado = {
    slug: turno.tenants.slug,
    idioma: turno.tenants.idioma as Idioma,
    zonaHoraria: turno.tenants.zona_horaria,
    servicio: turno.servicios.nombre,
    clienteNombre: turno.cliente_nombre,
    clienteEmail: turno.cliente_email,
    fechaHoraIso: turno.fecha_hora,
    duracionMinutos: turno.duracion_minutos,
    tokenGestion: turno.token_gestion,
  };

  const eventId = await crearEventoDeTurno(confirmado, "Turno reservado online. Pago aprobado por Mercado Pago.");

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

  await enviarConfirmacionDeTurno(confirmado);
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
  const tenantCurso = curso.tenants as unknown as { slug: string };
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
    const { subject, html } = plantillaCompraCurso({
      curso: curso.titulo,
      linkAcceso: `${urlDelTenant(tenantCurso.slug)}/cursos/acceso/${acceso.token_acceso}`,
    });
    try {
      await enviarEmail({ to: pago.payerEmail, subject, html });
    } catch {
      // El acceso ya quedó creado; el email es best-effort.
    }
  }
}
```

- [ ] **Step 2: La reserva según el modo de pago**

`src/app/sitio/[tenant]/turnos/actions.ts` (reemplazo completo):

```ts
"use server";

import { getDisponibilidad } from "@/lib/data/turnos";
import type { ConfiguracionNegocio, Servicio } from "@/lib/data/types";
import { IDIOMA_POR_DEFECTO, traductor } from "@/lib/i18n/textos";
import { isMpConfigurado, crearPreferencia } from "@/lib/mercadopago/client";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { datosDelTenant } from "@/lib/tenant/datos";
import { urlDelTenant } from "@/lib/tenant/urls";
import { crearEventoDeTurno, enviarConfirmacionDeTurno } from "@/lib/turnos/confirmacion";
import { EJEMPLO_WHATSAPP } from "@/lib/turnos/ejemplo-whatsapp";
import { getClientIp } from "@/lib/turnos/ip";
import { cobroDeReserva } from "@/lib/turnos/pago";
import { puedeReservar } from "@/lib/turnos/reglas";
import { normalizarWhatsApp } from "@/lib/turnos/whatsapp";

/** url: el checkout de Mercado Pago, o la página de gracias si el turno ya quedó confirmado. */
export type ReservarTurnoResult = { ok: true; url: string } | { ok: false; error: string };

const MAXIMO_RESERVAS_POR_HORA = 2;

export async function reservarTurno(formData: FormData): Promise<ReservarTurnoResult> {
  const tenant = await tenantDelRequest();
  const t = traductor(tenant?.idioma ?? IDIOMA_POR_DEFECTO);
  if (!tenant?.modulos.turnos) {
    return {
      ok: false,
      error: t({ es: "La reserva online no está disponible.", pt: "O agendamento online não está disponível." }),
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
      error: t({ es: "Completá todos los campos obligatorios.", pt: "Preencha todos os campos obrigatórios." }),
    };
  }

  const clienteWhatsApp = normalizarWhatsApp(clienteTelefono, tenant.pais);
  if (!clienteWhatsApp) {
    const ejemplo = EJEMPLO_WHATSAPP[tenant.pais];
    return {
      ok: false,
      error: t({
        es: `El número de WhatsApp no es válido. Ingresalo con código de área, ej.: ${ejemplo}.`,
        pt: `O número de WhatsApp não é válido. Informe com o código de área, ex.: ${ejemplo}.`,
      }),
    };
  }

  const db = datosDelTenant(tenant.id);
  const { data: filaConfig } = await db.select("configuracion_negocio", "sena_porcentaje, modo_pago").single();
  const config = filaConfig as unknown as Pick<ConfiguracionNegocio, "sena_porcentaje" | "modo_pago"> | null;
  if (!config) {
    return {
      ok: false,
      error: t({ es: "No se pudo leer la configuración del negocio.", pt: "Não foi possível ler a configuração do negócio." }),
    };
  }

  // Con pago anticipado hace falta Mercado Pago (hasta la etapa D, solo el tenant de las credenciales globales).
  if (config.modo_pago !== "ninguno" && (!isMpConfigurado() || !usaCredencialesGlobales(tenant.slug))) {
    return {
      ok: false,
      error: t({
        es: "La reserva online con pago todavía no está habilitada. Escribinos por WhatsApp para coordinar tu turno.",
        pt: "O agendamento online com pagamento ainda não está habilitado. Fale com a gente pelo WhatsApp para combinar seu horário.",
      }),
    };
  }

  // Sin IP confiable (CABECERA_IP_CONFIABLE) no se limita por IP: no se junta a todos en un balde.
  const ip = await getClientIp();
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: intentos } = ip
    ? await db.select("intentos_reserva", "id").eq("ip", ip).gte("creado_en", haceUnaHora)
    : { data: [] };

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
      error: t({ es: "Ese horario ya no está disponible. Elegí otro.", pt: "Esse horário não está mais disponível. Escolha outro." }),
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
        pt: "Um dos serviços escolhidos não está mais disponível.",
      }),
    };
  }

  const cobro = cobroDeReserva(config.modo_pago, config.sena_porcentaje, servicios.map((s) => s.precio));
  if (cobro.tipo === "sin_precio") {
    return {
      ok: false,
      error: t({
        es: "Los servicios elegidos no tienen precio para cobrar online. Escribinos por WhatsApp para coordinar tu turno.",
        pt: "Os serviços escolhidos não têm preço para cobrança online. Fale com a gente pelo WhatsApp para combinar seu horário.",
      }),
    };
  }
  // Sin pago anticipado, los turnos nacen confirmados; con pago, pendientes 15 minutos.
  const montos = cobro.tipo === "cobro" ? cobro.montos : null;
  const bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  let inicioActual = new Date(iso);
  const creados: { id: string; token_gestion: string; inicioIso: string }[] = [];
  for (const [i, servicio] of servicios.entries()) {
    const inicioIso = inicioActual.toISOString();
    const { data: turno, error } = await db
      .insert("turnos", {
        servicio_id: servicio.id,
        cliente_nombre: clienteNombre,
        cliente_email: clienteEmail,
        cliente_telefono: clienteWhatsApp,
        fecha_hora: inicioIso,
        duracion_minutos: servicio.duracion_minutos,
        estado: montos ? "pendiente_pago" : "confirmado",
        monto_sena: montos ? montos[i] : null,
        bloqueado_hasta: montos ? bloqueadoHasta : null,
      })
      .select("id, token_gestion")
      .single();

    if (error || !turno) {
      // Revertir los turnos ya creados de esta reserva combinada.
      if (creados.length > 0) await db.delete("turnos").in("id", creados.map((c) => c.id));
      return {
        ok: false,
        error: t({ es: "No se pudo crear el turno. Probá de nuevo.", pt: "Não foi possível criar o agendamento. Tente novamente." }),
      };
    }

    creados.push({ id: turno.id, token_gestion: turno.token_gestion, inicioIso });
    inicioActual = new Date(inicioActual.getTime() + servicio.duracion_minutos * 60000);
  }

  if (ip) await db.insert("intentos_reserva", { ip });

  if (!montos) {
    // Confirmado al reservar: el mismo evento de Calendar y email que el webhook de un pago aprobado.
    for (const [i, servicio] of servicios.entries()) {
      const confirmado = {
        slug: tenant.slug,
        idioma: tenant.idioma,
        zonaHoraria: tenant.zonaHoraria,
        servicio: servicio.nombre,
        clienteNombre,
        clienteEmail,
        fechaHoraIso: creados[i].inicioIso,
        duracionMinutos: servicio.duracion_minutos,
        tokenGestion: creados[i].token_gestion,
      };
      const eventId = await crearEventoDeTurno(confirmado, "Turno reservado online, sin pago anticipado.");
      if (eventId) await db.update("turnos", { google_calendar_event_id: eventId }).eq("id", creados[i].id);
      await enviarConfirmacionDeTurno(confirmado);
    }
    return { ok: true, url: `/turnos/gracias?turno=${creados[0].token_gestion}` };
  }

  try {
    const concepto = config.modo_pago === "total" ? t({ es: "Turno", pt: "Agendamento" }) : t({ es: "Seña", pt: "Sinal" });
    const pref = await crearPreferencia({
      titulo: `${concepto} — ${servicios.map((s) => s.nombre).join(" + ")}`,
      monto: cobro.tipo === "cobro" ? cobro.total : 0,
      moneda: tenant.moneda,
      externalReference: `turno:${creados.map((c) => c.id).join(",")}`,
      clienteEmail,
      baseUrl: urlDelTenant(tenant.slug),
      backUrls: { success: "/turnos/gracias", pending: "/turnos/gracias", failure: "/turnos" },
    });
    return { ok: true, url: pref.initPoint };
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

En `src/lib/data/turnos.ts`, reemplazar:

```ts
  estado: string;
  token_gestion: string;
  servicios: { nombre: string };
};

export async function getTurnoPorToken(
```

por:

```ts
  estado: string;
  token_gestion: string;
  /** Lo cobrado al reservar (seña o total); null sin pago anticipado. */
  monto_sena: number | null;
  servicios: { nombre: string };
};

export async function getTurnoPorToken(
```

y reemplazar:

```ts
      "id, servicio_id, cliente_nombre, fecha_hora, duracion_minutos, estado, token_gestion, servicios(nombre)",
```

por:

```ts
      "id, servicio_id, cliente_nombre, fecha_hora, duracion_minutos, estado, token_gestion, monto_sena, servicios(nombre)",
```

- [ ] **Step 3: Formulario de reserva y textos del sitio**

En `src/components/turnos/ReservaForm.tsx`:

Reemplazar:

```tsx
import { formatPrecio } from "@/lib/format";
import { calcularMontoSena } from "@/lib/turnos/reglas";
```

por:

```tsx
import { formatPrecio } from "@/lib/format";
import { cobroDeReserva, detalleCobro, textoModoPago, type ModoPago } from "@/lib/turnos/pago";
```

Reemplazar:

```tsx
export function ReservaForm({
  servicios,
  senaPorcentaje,
  moneda,
  pais,
  zonaHoraria,
}: {
  servicios: Servicio[];
  senaPorcentaje: number;
```

por:

```tsx
export function ReservaForm({
  servicios,
  modoPago,
  senaPorcentaje,
  moneda,
  pais,
  zonaHoraria,
}: {
  servicios: Servicio[];
  modoPago: ModoPago;
  senaPorcentaje: number;
```

Reemplazar:

```tsx
  const precioTotal = seleccionados.reduce((sum, s) => sum + s.precio, 0);
  const montoSena = calcularMontoSena(precioTotal, senaPorcentaje);
  const sena = montoSena > 0 ? precio(montoSena) : "";
```

por:

```tsx
  const cobro = cobroDeReserva(modoPago, senaPorcentaje, seleccionados.map((s) => s.precio));
  const textoCobro =
    cobro.tipo === "cobro" && modoPago !== "ninguno"
      ? t(detalleCobro(modoPago, precio(cobro.total)))
      : cobro.tipo === "sin_cobro"
        ? t(textoModoPago("ninguno", senaPorcentaje))
        : t({
            es: "Los servicios elegidos no tienen precio para cobrar online: escribinos para coordinar tu turno.",
            pt: "Os serviços escolhidos não têm preço para cobrança online: fale com a gente para combinar seu horário.",
          });
```

Reemplazar:

```tsx
      const result = await reservarTurno(formData);
      if (result.ok) {
        window.location.href = result.initPoint;
      } else {
```

por:

```tsx
      const result = await reservarTurno(formData);
      if (result.ok) {
        window.location.href = result.url;
      } else {
```

Reemplazar:

```tsx
          <p className="font-sans text-sm text-texto-suave">
            {t({
              es: `Reservás con una seña de ${sena} (se descuenta del precio total del servicio).`,
              pt: `Você agenda com um sinal de ${sena} (descontado do valor total do serviço).`,
            })}
          </p>
```

por:

```tsx
          <p className="font-sans text-sm text-texto-suave">{textoCobro}</p>
```

Reemplazar:

```tsx
      <LoadingOverlay
        show={pending}
        label={t({ es: "Redirigiendo a Mercado Pago…", pt: "Redirecionando para o Mercado Pago…" })}
      />
```

por:

```tsx
      <LoadingOverlay
        show={pending}
        label={
          cobro.tipo === "cobro"
            ? t({ es: "Redirigiendo a Mercado Pago…", pt: "Redirecionando para o Mercado Pago…" })
            : t({ es: "Confirmando tu turno…", pt: "Confirmando seu agendamento…" })
        }
      />
```

En `src/app/sitio/[tenant]/turnos/page.tsx`:

Reemplazar:

```tsx
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { traductor } from "@/lib/i18n/textos";
```

por:

```tsx
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { traductor } from "@/lib/i18n/textos";
import { textoModoPago } from "@/lib/turnos/pago";
```

Reemplazar:

```tsx
  const senaPorcentaje = config?.sena_porcentaje ?? 50;
```

por:

```tsx
  const senaPorcentaje = config?.sena_porcentaje ?? 50;
  const modoPago = config?.modo_pago ?? "sena";
```

Reemplazar:

```tsx
        <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
          {t({ es: "Reservá tu turno", pt: "Agende seu horário" })}
        </h1>
```

por:

```tsx
        <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
          {t({ es: "Reservá tu turno", pt: "Agende seu horário" })}
        </h1>
        <p className="mt-3 font-sans text-texto-suave">{t(textoModoPago(modoPago, senaPorcentaje))}</p>
```

Reemplazar:

```tsx
              servicios={servicios}
              senaPorcentaje={senaPorcentaje}
```

por:

```tsx
              servicios={servicios}
              modoPago={modoPago}
              senaPorcentaje={senaPorcentaje}
```

`src/app/sitio/[tenant]/turnos/gracias/page.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getTurnoPorToken } from "@/lib/data/turnos";
import { LOCALES, traductor } from "@/lib/i18n/textos";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";

type Props = { params: Promise<{ tenant: string }>; searchParams: Promise<{ turno?: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Gracias", pt: "Obrigado" });
}

/**
 * Después de reservar. Sin pago anticipado, la reserva vuelve con ?turno=<token de gestión>
 * y el turno ya está confirmado. Con Mercado Pago, el pago se confirma por el webhook.
 */
export default async function GraciasPage({ params, searchParams }: Props) {
  const tenant = await tenantDeLaPagina(params);
  const t = traductor(tenant.idioma);
  const { turno: token } = await searchParams;
  const turno = token && UUID.test(token) ? await getTurnoPorToken(tenant.id, token) : null;

  if (turno?.estado === "confirmado") {
    const fechaHora = new Date(turno.fecha_hora).toLocaleString(LOCALES[tenant.idioma], {
      dateStyle: "long",
      timeStyle: "short",
      hourCycle: "h23",
      timeZone: tenant.zonaHoraria,
    });
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-fondo px-6 pt-24 pb-16 text-center">
        <Container className="flex flex-col items-center gap-4">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">{t({ es: "¡Listo!", pt: "Pronto!" })}</p>
          <h1 className="font-serif text-4xl text-texto sm:text-5xl">
            {t({ es: "¡Tu turno está confirmado!", pt: "Seu horário está confirmado!" })}
          </h1>
          <p className="max-w-md font-sans text-texto-suave">{`${turno.servicios.nombre} · ${fechaHora}`}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href={`/turnos/gestion/${turno.token_gestion}`}>
              {t({ es: "Ver o gestionar mi turno", pt: "Ver ou gerenciar meu agendamento" })}
            </Button>
            <Button href="/" variant="outline">
              {t({ es: "Volver al inicio", pt: "Voltar ao início" })}
            </Button>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-fondo px-6 pt-24 pb-16 text-center">
      <Container className="flex flex-col items-center gap-4">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">{t({ es: "¡Listo!", pt: "Pronto!" })}</p>
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

En `src/app/sitio/[tenant]/turnos/gestion/[token]/page.tsx`:

Reemplazar:

```tsx
              es: "Este turno todavía no está confirmado. Si ya pagaste la seña, esperá la confirmación por email.",
              pt: "Este agendamento ainda não está confirmado. Se você já pagou o sinal, aguarde a confirmação por e-mail.",
```

por:

```tsx
              es: "Este turno todavía no está confirmado. Si ya hiciste el pago, esperá la confirmación por email.",
              pt: "Este agendamento ainda não está confirmado. Se você já fez o pagamento, aguarde a confirmação por e-mail.",
```

Reemplazar:

```tsx
  const permitido = puedeCancelar({
```

por:

```tsx
  // Qué se cobró al reservar, para el aviso al cancelar (el modo actual dice si fue seña o total).
  const pagoAnticipado =
    turno.monto_sena != null && turno.monto_sena > 0 ? (config?.modo_pago === "total" ? "total" : "sena") : null;
  const permitido = puedeCancelar({
```

Reemplazar:

```tsx
          permitido={permitido}
          zonaHoraria={tenant.zonaHoraria}
```

por:

```tsx
          permitido={permitido}
          pagoAnticipado={pagoAnticipado}
          zonaHoraria={tenant.zonaHoraria}
```

En `src/components/turnos/GestionPanel.tsx`:

Reemplazar:

```tsx
  permitido,
  zonaHoraria,
}: {
  token: string;
  servicioId: string;
  permitido: boolean;
  zonaHoraria: string;
}) {
```

por:

```tsx
  permitido,
  pagoAnticipado,
  zonaHoraria,
}: {
  token: string;
  servicioId: string;
  permitido: boolean;
  /** Qué se cobró al reservar: cambia el aviso al cancelar. */
  pagoAnticipado: "sena" | "total" | null;
  zonaHoraria: string;
}) {
```

Reemplazar:

```tsx
        <T
          es="Tu turno fue cancelado. La seña no es reembolsable."
          pt="Seu agendamento foi cancelado. O sinal não é reembolsável."
        />
```

por:

```tsx
        {pagoAnticipado === "sena" ? (
          <T
            es="Tu turno fue cancelado. La seña no es reembolsable."
            pt="Seu agendamento foi cancelado. O sinal não é reembolsável."
          />
        ) : pagoAnticipado === "total" ? (
          <T
            es="Tu turno fue cancelado. Escribinos si tenés dudas sobre el pago."
            pt="Seu agendamento foi cancelado. Fale com a gente se tiver dúvidas sobre o pagamento."
          />
        ) : (
          <T es="Tu turno fue cancelado." pt="Seu agendamento foi cancelado." />
        )}
```

- [ ] **Step 4: Tipos, lint, tests y build**

```bash
grep -rn "initPoint\|calcularMontoSena" src/components src/app
npx tsc --noEmit
npx eslint src
npx vitest run
npm run build
```

Expected: el `grep` solo encuentra `pref.initPoint` en `src/app/sitio/[tenant]/turnos/actions.ts` (ningún uso de `calcularMontoSena` fuera de `src/lib`); sin errores; tests en PASS; build sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/turnos/confirmacion.ts src/app/api/webhooks/mercadopago/route.ts "src/app/sitio/[tenant]/turnos/actions.ts" "src/app/sitio/[tenant]/turnos/gracias/page.tsx" src/lib/data/turnos.ts src/components/turnos/ReservaForm.tsx src/components/turnos/GestionPanel.tsx "src/app/sitio/[tenant]/turnos/page.tsx" "src/app/sitio/[tenant]/turnos/gestion/[token]/page.tsx"
git commit -F - <<'EOF'
feat(turnos): la reserva respeta el modo de pago (sin pago confirma al reservar)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 15: Pendientes de la revisión de C1

**Files:**
- Modify: `src/components/master/EditorColores.tsx`, `src/app/master/clientes/[slug]/credenciales/page.tsx`
- Modify: `scripts/e2e-master.mjs`, `scripts/e2e-login.mjs`

(El nombre del remitente de Gmail con `CONTROL` ya quedó en la Task 3.)

- [ ] **Step 1: Editor de colores**

En `src/components/master/EditorColores.tsx`, reemplazar:

```tsx
/** Aviso en vivo (antes de guardar); el de después de guardar es mensajeAviso("contraste_secundario"). */
const AVISO_SECUNDARIO_EN_VIVO = "El color secundario tiene poco contraste con el fondo (se puede guardar igual).";
```

por:

```tsx
/** Aviso en vivo (antes de guardar); el de después de guardar es mensajeAviso("contraste_secundario"). */
const AVISO_SECUNDARIO_EN_VIVO =
  "El color secundario tiene poco contraste con el fondo: el mínimo recomendado es 3:1 (se puede guardar igual).";
```

y reemplazar:

```tsx
  const sinCambios = CAMPOS.every((c) => colores[c.clave] === inicial[c.clave]);
```

por:

```tsx
  // "#ABC" y "#aabbcc" son el mismo color: se comparan normalizados.
  const sinCambios = CAMPOS.every((c) => normalizarHex(colores[c.clave]) === normalizarHex(inicial[c.clave]));
```

- [ ] **Step 2: Los gestores de contraseñas no completan los secretos de Mercado Pago**

En `src/app/master/clientes/[slug]/credenciales/page.tsx`, reemplazar:

```tsx
          <input
            name="mp_access_token"
            type="password"
            autoComplete="new-password"
            placeholder={mp.accessTokenConfigurado ? MANTENER : "APP_USR-…"}
```

por:

```tsx
          <input
            name="mp_access_token"
            type="password"
            autoComplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            placeholder={mp.accessTokenConfigurado ? MANTENER : "APP_USR-…"}
```

y reemplazar:

```tsx
          <input
            name="mp_webhook_secret"
            type="password"
            autoComplete="new-password"
            placeholder={mp.webhookSecretConfigurado ? MANTENER : "de la aplicación del cliente en Mercado Pago"}
```

por:

```tsx
          <input
            name="mp_webhook_secret"
            type="password"
            autoComplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            placeholder={mp.webhookSecretConfigurado ? MANTENER : "de la aplicación del cliente en Mercado Pago"}
```

- [ ] **Step 3: `e2e-master.mjs`: sin datos sensibles en la salida, limpieza más robusta y panel traducido**

En `scripts/e2e-master.mjs`:

Reemplazar:

```js
  const AVISO_EN_VIVO = "El color secundario tiene poco contraste con el fondo (se puede guardar igual).";
```

por:

```js
  const AVISO_EN_VIVO =
    "El color secundario tiene poco contraste con el fondo: el mínimo recomendado es 3:1 (se puede guardar igual).";
```

Reemplazar:

```js
  verificar(sinAviso.includes("contraste actual") && !sinAviso.includes("mínimo"), "el contraste muestra solo el valor actual");
```

por:

```js
  verificar(
    sinAviso.includes("contraste actual") && sinAviso.includes("el mínimo recomendado es 3:1"),
    "el aviso en vivo muestra el contraste actual y el mínimo de 3:1",
  );
```

Reemplazar (el link lleva un token: solo se imprimen host y path):

```js
  verificar(link.host === HOST_CLIENTE && link.pathname === "/admin/restablecer", "el link de invitación lleva al panel del cliente", link.href);
```

por:

```js
  verificar(
    link.host === HOST_CLIENTE && link.pathname === "/admin/restablecer",
    "el link de invitación lleva al panel del cliente",
    `${link.host}${link.pathname}`,
  );
```

Reemplazar (el cliente es de Brasil: su panel está en portugués):

```js
  verificar(r.status === 200 && r.html.includes("Hola,") && r.html.includes("Cliente C1"), "su panel responde con su nombre", String(r.status));
```

por:

```js
  verificar(r.status === 200 && r.html.includes("Olá, Cliente C1"), "su panel responde con su nombre, en portugués", String(r.status));
```

Reemplazar (el error SMTP no se imprime):

```js
    "se registra el error, sin datos sensibles",
    credGmail?.smtp_ultimo_error,
  );
```

por:

```js
    "se registra el error, sin datos sensibles",
    `estado ${credGmail?.smtp_estado ?? "sin fila"}`,
  );
```

Reemplazar:

```js
  verificar(!r.html.includes("Hola,"), "con el cliente suspendido su panel no deja entrar", resumen(r));
```

por:

```js
  verificar(
    r.html.includes("suspenso") && !r.html.includes("Olá,"),
    "con el cliente suspendido su panel muestra el aviso y no deja entrar",
    resumen(r),
  );
```

Reemplazar (la limpieza cuenta el error de leer los perfiles y, si la prueba se cortó antes de crear el perfil, busca al usuario del cliente por su email):

```js
    const { data: perfiles } = await admin.from("perfiles").select("user_id").eq("tenant_id", id);
    for (const p of perfiles ?? []) if (!usuariosCreados.includes(p.user_id)) usuariosCreados.push(p.user_id);
  }
```

por:

```js
    const { data: perfiles, error: errorPerfiles } = await admin.from("perfiles").select("user_id").eq("tenant_id", id);
    if (errorPerfiles) {
      console.error(`✗ limpieza: perfiles: ${errorPerfiles.message}`);
      fallas++;
    }
    for (const p of perfiles ?? []) if (!usuariosCreados.includes(p.user_id)) usuariosCreados.push(p.user_id);
  }
  // Si la prueba se cortó entre crear el usuario del cliente y su perfil, el usuario no aparece
  // por el perfil: se lo busca por su email (único de esta corrida).
  try {
    const idPorEmail = await idDeUsuarioPorEmail(emailCliente);
    if (idPorEmail && !usuariosCreados.includes(idPorEmail)) usuariosCreados.push(idPorEmail);
  } catch (e) {
    console.error(`✗ limpieza: buscar el usuario del cliente: ${e.message}`);
    fallas++;
  }
```

Y agregar, antes de `const hmacEmail = (dominio, e) =>`:

```js
/** Id del usuario de Auth con ese email (listUsers paginado), o null. */
async function idDeUsuarioPorEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const usuario = data.users.find((u) => u.email === email);
    if (usuario) return usuario.id;
    if (data.users.length < 200) return null;
  }
}

```

- [ ] **Step 4: `e2e-login.mjs`: el link tampoco se imprime entero**

En `scripts/e2e-login.mjs`, reemplazar:

```js
  verificar(link.host === HOST_TENANT && link.pathname === "/admin/restablecer", "el link apunta al sitio del tenant", link.href);
```

por:

```js
  verificar(
    link.host === HOST_TENANT && link.pathname === "/admin/restablecer",
    "el link apunta al sitio del tenant",
    `${link.host}${link.pathname}`,
  );
```

- [ ] **Step 5: Tipos, lint y sintaxis**

```bash
grep -n "link.href\|smtp_ultimo_error,$" scripts/e2e-master.mjs scripts/e2e-login.mjs
npx tsc --noEmit
npx eslint src
node --check scripts/e2e-master.mjs
node --check scripts/e2e-login.mjs
```

Expected: el `grep` no encuentra nada; sin errores. (Las dos E2E se corren en la Task 16.)

- [ ] **Step 6: Commit**

```bash
git add src/components/master/EditorColores.tsx "src/app/master/clientes/[slug]/credenciales/page.tsx" scripts/e2e-master.mjs scripts/e2e-login.mjs
git commit -F - <<'EOF'
fix(master): pendientes de la revisión de C1 (colores, secretos de MP y E2E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 16: Verificación de punta a punta

**Files:**
- Create: `scripts/e2e-cliente.mjs`

- [ ] **Step 1: La E2E del panel del cliente**

`scripts/e2e-cliente.mjs`:

```js
// Prueba de punta a punta del panel del cliente (etapa C2) contra el servidor de desarrollo
// (puerto 3000). Los formularios del panel se envían como un navegador sin JavaScript (ver
// e2e-login.mjs): GET de la página, campo oculto $ACTION_ID_… y POST multipart; Next responde
// 303 con Location. La disponibilidad y la reserva del sitio son server actions que llama un
// componente de cliente: se invocan como lo hace React en el navegador (cabecera Next-Action
// con el id que Next anota en .next/dev/server/app/<ruta>/page/server-reference-manifest.json).
// Crea un cliente temporal (crear_tenant: Brasil, portugués, todos los módulos menos cursos) y
// su usuario, entra a su panel con el código del log, edita servicios, horarios y reglas,
// textos, testimonios, preguntas y la galería, reserva en el sitio sin pago anticipado, apaga
// módulos y suspende el cliente. Al final borra todo (también las imágenes del bucket).
// El servidor tiene que correr con CABECERA_IP_CONFIABLE=x-real-ip y sin la cuenta de Gmail de
// la plataforma (los códigos salen en el log, "[MFA dev]"). Correrla desde la raíz del repo.
// Uso: node --env-file=.env.local scripts/e2e-cliente.mjs <log>
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";

const [rutaLog] = process.argv.slice(2);
if (!rutaLog) {
  console.error("Uso: node --env-file=.env.local scripts/e2e-cliente.mjs <log>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const secretoMfa = process.env.MFA_SECRET;
if (!url || !secret || !secretoMfa) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY o MFA_SECRET.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const sufijo = Date.now().toString(36);
const slug = `c2-test-${sufijo}`;
const HOST_CLIENTE = `${slug}.localhost:3000`;
const emailCliente = `e2e-c2-cliente-${sufijo}@example.com`;
const emailReserva = `e2e-c2-reserva-${sufijo}@example.com`;
const claveCliente = randomBytes(18).toString("base64url");
const ZONA = "America/Sao_Paulo";
const WHATSAPP = "+5511912345678";
const COLORES = { primario: "#3d5a80", secundario: "#5c677d", fondo: "#f4f5f7", texto: "#1f2933" };
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

async function ok(promesa, que) {
  const { data, error } = await promesa;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
}

function destino(r) {
  if (!r.location) return "";
  const u = new URL(r.location, "http://base");
  return `${u.pathname}${u.search}`;
}
const resumen = (r) => `${r.status} ${destino(r)}`;

function idDeAccion(html, formId) {
  const inicio = html.indexOf(`id="${formId}"`);
  if (inicio < 0) throw new Error(`la página no tiene el formulario #${formId}`);
  const m = html.slice(inicio, html.indexOf("</form>", inicio)).match(/name="(\$ACTION_ID_[0-9a-zA-Z]+)"/);
  if (!m) throw new Error(`#${formId} no tiene el campo $ACTION_ID_`);
  return m[1];
}

/** Id de una server action en el manifiesto que escribe el servidor de desarrollo al compilar la página. */
function idDeAccionCompilada(rutaApp, nombre) {
  const archivo = join(".next", "dev", "server", "app", ...rutaApp.split("/"), "page", "server-reference-manifest.json");
  const manifiesto = JSON.parse(readFileSync(archivo, "utf8"));
  const id = Object.keys(manifiesto.node ?? {}).find((k) => manifiesto.node[k].exportedName === nombre);
  if (!id) throw new Error(`no encontré la action ${nombre} en ${archivo}`);
  return id;
}

/**
 * Valor que devolvió una server action, del payload de React: la fila 0 trae "a", que es el
 * valor o una referencia "$@<fila>" a la fila donde está.
 */
function valorDeAccion(texto) {
  const filas = new Map();
  for (const linea of texto.split("\n")) {
    const m = linea.match(/^([0-9a-f]+):(.*)$/);
    if (!m) continue;
    try {
      filas.set(m[1], JSON.parse(m[2]));
    } catch {
      // filas que no son JSON (textos, referencias a módulos)
    }
  }
  const raiz = filas.get("0");
  if (!raiz || typeof raiz !== "object" || !("a" in raiz)) return undefined;
  return typeof raiz.a === "string" && raiz.a.startsWith("$@") ? filas.get(raiz.a.slice(2)) : raiz.a;
}

let siguienteIp = 20;
const ipsUsadas = [];
function ipFalsa() {
  const ip = `198.51.100.${siguienteIp++}`;
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

  pedir(metodo, ruta, cuerpo, extra = {}) {
    return new Promise((resolve, reject) => {
      const headers = { host: this.host, "x-real-ip": this.ip, ...extra };
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

  /**
   * Llama a una server action como el cliente de React (encodeReply): argumentos JSON en un
   * cuerpo text/plain; un FormData, en multipart con la raíz ["$K1"] en el campo "0" y sus
   * campos con el prefijo "_1_".
   */
  async accion(ruta, idAccion, args) {
    let cuerpo;
    if (args instanceof FormData) {
      const fd = new FormData();
      fd.append("0", JSON.stringify(["$K1"]));
      for (const [k, v] of args) fd.append(`_1_${k}`, v);
      const req = new Request("http://localhost/", { method: "POST", body: fd });
      cuerpo = { tipo: req.headers.get("content-type"), datos: Buffer.from(await req.arrayBuffer()) };
    } else {
      cuerpo = { tipo: "text/plain;charset=UTF-8", datos: Buffer.from(JSON.stringify(args), "utf8") };
    }
    const r = await this.pedir("POST", ruta, cuerpo, { "next-action": idAccion, accept: "text/x-component" });
    return { ...r, valor: valorDeAccion(r.html) };
  }
}

const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const reCodigo = (de) => new RegExp(`\\[MFA dev\\] c.digo para ${escaparRegex(de)}: (\\d{6})`, "g");
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

/** "YYYY-MM-DD" en la zona horaria del cliente. */
const fechaEn = (zona, ms) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);

// ---------- Datos ----------
let tenantId = null;
let userId = null;

const leerTenant = async () => (await admin.from("tenants").select("*").eq("slug", slug).maybeSingle()).data;
const filas = async (tabla) => (await admin.from(tabla).select("*").eq("tenant_id", tenantId)).data ?? [];
const una = async (tabla) => (await admin.from(tabla).select("*").eq("tenant_id", tenantId).maybeSingle()).data;

async function listarObjetos(id = tenantId) {
  if (!id) return [];
  const { data, error } = await admin.storage.from("sitios").list(id, { limit: 100 });
  if (error) throw new Error(`listar imágenes: ${error.message}`);
  return data.map((o) => o.name);
}

/** Id del usuario de Auth con ese email (listUsers paginado), o null. */
async function idDeUsuarioPorEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const usuario = data.users.find((u) => u.email === email);
    if (usuario) return usuario.id;
    if (data.users.length < 200) return null;
  }
}

async function preparar() {
  tenantId = await ok(
    admin.rpc("crear_tenant", {
      p_slug: slug,
      p_nombre: "Cliente C2",
      p_pais: "BR",
      p_idioma: "pt",
      p_zona_horaria: ZONA,
      p_moneda: "BRL",
      p_modulos: { turnos: true, sobreMi: true, testimonios: true, galeria: true, faq: true, whatsapp: true },
      p_colores: COLORES,
    }),
    "crear_tenant",
  );
  await ok(admin.from("tenant_marca").update({ whatsapp: WHATSAPP }).eq("tenant_id", tenantId), "whatsapp");
  const creado = await ok(
    admin.auth.admin.createUser({ email: emailCliente, password: claveCliente, email_confirm: true }),
    "usuario del cliente",
  );
  userId = creado.user.id;
  await ok(admin.from("perfiles").insert({ user_id: userId, rol: "cliente", tenant_id: tenantId }), "perfil del cliente");
}

async function prueba() {
  const config0 = await una("configuracion_negocio");
  verificar(config0?.modo_pago === "ninguno", "un cliente nuevo arranca sin pago anticipado");

  console.log("\nIngreso al panel, en portugués:");
  const C = new Navegador(HOST_CLIENTE);
  let pagina = await C.get("/admin/login");
  verificar(
    pagina.status === 200 && pagina.html.includes('lang="pt-BR"') && pagina.html.includes("Esqueceu sua senha?"),
    "la pantalla de ingreso está en portugués",
    String(pagina.status),
  );
  const codigosAntes = ocurrencias(reCodigo(emailCliente)).length;
  let r = await C.enviar("/admin/login", pagina.html, "form-login", { email: emailCliente, password: claveCliente });
  verificar(destino(r) === "/admin/verificar?info=codigo_enviado", "pide el código", resumen(r));
  const codigo = await esperarNueva(reCodigo(emailCliente), codigosAntes);
  pagina = await C.get("/admin/verificar?info=codigo_enviado");
  verificar(pagina.html.includes("Enviamos um código de 6 números"), "el aviso del código está en portugués");
  r = await C.enviar("/admin/verificar", pagina.html, "form-verificar", { codigo });
  verificar(destino(r) === "/admin", "entra con el código", resumen(r));
  pagina = await C.get("/admin");
  verificar(
    pagina.status === 200 && pagina.html.includes("Olá, Cliente C2") && pagina.html.includes('lang="pt-BR"'),
    "el panel saluda en portugués",
    String(pagina.status),
  );
  const seccionesActivas = ["servicios", "configuracion", "textos", "turnos", "testimonios", "galeria", "preguntas"];
  verificar(
    seccionesActivas.every((s) => pagina.html.includes(`href="/admin/${s}"`)) && !pagina.html.includes('href="/admin/cursos"'),
    "el menú muestra solo las secciones de los módulos activos",
  );
  r = await C.get("/admin/cursos");
  verificar(r.status === 404 && r.html.includes("Página não encontrada"), "la sección de un módulo apagado da 404", String(r.status));

  console.log("\nServicios:");
  const rutaServicios = "/admin/servicios";
  pagina = await C.get(rutaServicios);
  const servicio = { nombre: "Corte E2E", duracion_minutos: "60", precio: "120,50", orden: "1", activo: "on" };
  r = await C.enviar(rutaServicios, pagina.html, "form-nuevo-servicio", { ...servicio, duracion_minutos: "2" });
  verificar(destino(r) === `${rutaServicios}?error=duracion`, "duración inválida: rechazada", resumen(r));
  verificar((await C.get(destino(r))).html.includes("A duração precisa ser um número inteiro"), "el error se muestra en portugués");
  r = await C.enviar(rutaServicios, pagina.html, "form-nuevo-servicio", {
    ...servicio,
    tenant_id: "00000000-0000-4000-8000-000000000000",
  });
  verificar(destino(r) === `${rutaServicios}?ok=creado`, "crea el servicio", resumen(r));
  const [creado] = await filas("servicios");
  verificar(
    creado?.nombre === "Corte E2E" && Number(creado.precio) === 120.5 && creado.duracion_minutos === 60 && creado.activo,
    "precio con centavos, en su tenant (el tenant_id del formulario se ignora)",
  );
  pagina = await C.get(rutaServicios);
  r = await C.enviar(rutaServicios, pagina.html, `form-servicio-${creado.id}`, { id: creado.id, ...servicio, precio: "abc" });
  verificar(destino(r) === `${rutaServicios}?error=precio`, "precio inválido: rechazado", resumen(r));
  r = await C.enviar(rutaServicios, pagina.html, `form-servicio-${creado.id}`, { id: creado.id, ...servicio, nombre: "Corte E2E editado" });
  verificar(
    destino(r) === `${rutaServicios}?ok=guardado` && (await filas("servicios"))[0]?.nombre === "Corte E2E editado",
    "edita el servicio",
    resumen(r),
  );

  console.log("\nHorarios y reglas:");
  const rutaConfig = "/admin/configuracion";
  pagina = await C.get(rutaConfig);
  verificar(
    pagina.html.includes("Sem pagamento antecipado") && pagina.html.includes("ainda não tem o Mercado Pago conectado"),
    "muestra los modos de pago y avisa que no hay Mercado Pago",
  );
  const semana = {};
  for (const d of ["lun", "mar", "mie", "jue", "vie", "sab", "dom"]) {
    semana[`desde_${d}`] = "08:00";
    semana[`hasta_${d}`] = "20:00";
  }
  const reglas = { horas_minimas_cancelacion: "24", minutos_preparacion_entre_turnos: "0", modo_pago: "ninguno", sena_porcentaje: "50" };
  r = await C.enviar(rutaConfig, pagina.html, "form-configuracion", { ...semana, ...reglas, modo_pago: "sena", sena_porcentaje: "0" });
  verificar(destino(r) === `${rutaConfig}?error=sena_porcentaje`, "seña de 0%: rechazada", resumen(r));
  r = await C.enviar(rutaConfig, pagina.html, "form-configuracion", { ...semana, ...reglas, desde_lun: "20:00", hasta_lun: "08:00" });
  verificar(destino(r) === `${rutaConfig}?error=horario`, "horario al revés: rechazado", resumen(r));
  r = await C.enviar(rutaConfig, pagina.html, "form-configuracion", { ...semana, ...reglas });
  const config = await una("configuracion_negocio");
  verificar(
    destino(r) === `${rutaConfig}?ok=guardado` &&
      config?.modo_pago === "ninguno" &&
      Object.keys(config.horario_atencion).length === 7 &&
      config.minutos_preparacion_entre_turnos === 0,
    "guarda el horario, las reglas y el modo de pago",
    resumen(r),
  );

  console.log("\nTextos (lista blanca):");
  const rutaTextos = "/admin/textos";
  pagina = await C.get(rutaTextos);
  const textos = {
    inicio_titulo: "Bem-vinda ao",
    inicio_destacado: "Cliente C2",
    inicio_texto: "Agende online.",
    sobre_mi_titulo: "Sobre a C2",
    sobre_mi_texto: "Parágrafo um.\n\nParágrafo dois.",
  };
  r = await C.enviar(rutaTextos, pagina.html, "form-textos-sitio", { ...textos, inicio_titulo: "" });
  verificar(destino(r) === `${rutaTextos}?error=inicio_titulo`, "título vacío: rechazado", resumen(r));
  r = await C.enviar(rutaTextos, pagina.html, "form-textos-sitio", {
    ...textos,
    color_primario: "#000000",
    whatsapp: "+5511000000000",
    logo_url: "https://example.com/x.png",
    modulo_cursos: "on",
  });
  const marca = await una("tenant_marca");
  verificar(
    destino(r) === `${rutaTextos}?ok=guardado` && marca?.inicio_titulo === "Bem-vinda ao" && marca.sobre_mi_titulo === "Sobre a C2",
    "guarda los textos de inicio y sobre mí",
    resumen(r),
  );
  verificar(
    marca?.color_primario === COLORES.primario && marca.whatsapp === WHATSAPP && marca.logo_url === null && !(await leerTenant())?.modulo_cursos,
    "colores, contacto, logo y módulos no cambian aunque vengan en el formulario",
  );

  console.log("\nSitio público sin contenido en los módulos:");
  const S = new Navegador(HOST_CLIENTE);
  r = await S.get("/");
  verificar(r.status === 200 && r.html.includes("Bem-vinda ao"), "muestra los textos nuevos", String(r.status));
  verificar(
    r.html.includes('href="/#servicios"') &&
      r.html.includes('href="/#sobre-mi"') &&
      !r.html.includes('href="/#testimonios"') &&
      !r.html.includes('href="/#galeria"') &&
      !r.html.includes('href="/#preguntas-frecuentes"'),
    "el menú no enlaza secciones vacías",
  );
  verificar(
    r.html.includes('aria-label="Fale com a gente no WhatsApp"') && r.html.includes(`https://wa.me/${WHATSAPP.slice(1)}`),
    "botón flotante de WhatsApp con el número del cliente",
  );

  console.log("\nTestimonios:");
  const rutaTestimonios = "/admin/testimonios";
  pagina = await C.get(rutaTestimonios);
  const testimonio = { nombre: "Ana E2E", texto: "Atendimento excelente E2E.", orden: "0", activo: "on" };
  r = await C.enviar(rutaTestimonios, pagina.html, "form-nuevo-testimonio", { ...testimonio, texto: "" });
  verificar(destino(r) === `${rutaTestimonios}?error=testimonio_texto`, "testimonio vacío: rechazado", resumen(r));
  r = await C.enviar(rutaTestimonios, pagina.html, "form-nuevo-testimonio", testimonio);
  verificar(destino(r) === `${rutaTestimonios}?ok=creado`, "crea el testimonio", resumen(r));
  const [propio] = await filas("testimonios");
  const ajeno = await ok(admin.from("testimonios").select("id, texto").neq("tenant_id", tenantId).limit(1).maybeSingle(), "testimonio ajeno");
  verificar(!!ajeno, "hay un testimonio de otro cliente (Gisel) para la prueba cruzada");
  if (ajeno && propio) {
    pagina = await C.get(rutaTestimonios);
    r = await C.enviar(rutaTestimonios, pagina.html, `form-testimonio-${propio.id}`, { ...testimonio, id: ajeno.id, texto: "Texto intruso" });
    const ajenoDespues = await ok(admin.from("testimonios").select("texto").eq("id", ajeno.id).maybeSingle(), "testimonio ajeno");
    verificar(
      destino(r) === `${rutaTestimonios}?error=id` && ajenoDespues?.texto === ajeno.texto,
      "un testimonio de otro cliente no se puede editar",
      resumen(r),
    );
  }
  r = await S.get("/");
  verificar(r.html.includes("Atendimento excelente E2E.") && r.html.includes('href="/#testimonios"'), "el sitio muestra el testimonio y lo enlaza");

  console.log("\nPreguntas frecuentes:");
  const rutaPreguntas = "/admin/preguntas";
  const htmlPreguntas = (await C.get(rutaPreguntas)).html;
  r = await C.enviar(rutaPreguntas, htmlPreguntas, "form-nueva-pregunta", { pregunta: "Uma\nlinha?", respuesta: "R", orden: "0", activo: "on" });
  verificar(destino(r) === `${rutaPreguntas}?error=texto_invalido`, "pregunta con salto de línea: rechazada", resumen(r));
  r = await C.enviar(rutaPreguntas, htmlPreguntas, "form-nueva-pregunta", {
    pregunta: "Quanto dura a sessão E2E?",
    respuesta: "Uma hora.\n\nChegue 10 minutos antes.",
    orden: "0",
    activo: "on",
  });
  verificar(destino(r) === `${rutaPreguntas}?ok=creado`, "crea la pregunta", resumen(r));
  r = await S.get("/");
  verificar(
    r.html.includes('id="preguntas-frecuentes"') && r.html.includes("Quanto dura a sessão E2E?") && r.html.includes('href="/#preguntas-frecuentes"'),
    "el sitio muestra la pregunta y la enlaza",
  );

  console.log("\nGalería:");
  const rutaGaleria = "/admin/galeria";
  pagina = await C.get(rutaGaleria);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>';
  r = await C.enviar(rutaGaleria, pagina.html, "form-subir-imagen", { descripcion: "", archivo: new File([svg], "foto.png", { type: "image/png" }) });
  verificar(destino(r) === `${rutaGaleria}?error=imagen_tipo`, "SVG disfrazado de PNG: rechazado", resumen(r));
  r = await C.enviar(rutaGaleria, pagina.html, "form-subir-imagen", {
    descripcion: "Unhas E2E",
    archivo: new File([PNG], "foto.png", { type: "image/png" }),
  });
  verificar(destino(r) === `${rutaGaleria}?ok=imagen_subida`, "sube una imagen", resumen(r));
  const [imagen] = await filas("galeria");
  verificar(
    !!imagen && imagen.imagen_url.startsWith(`${PREFIJO_PUBLICO}${tenantId}/galeria-`) && imagen.imagen_url.endsWith(".png") && imagen.descripcion === "Unhas E2E",
    "la imagen queda en la carpeta del cliente, con su descripción",
  );
  if (!imagen) throw new Error("no se creó la imagen de la galería");
  const publica = await fetch(imagen.imagen_url);
  verificar(publica.status === 200 && publica.headers.get("content-type") === "image/png", "la URL pública se lee, con el Content-Type del formato real");
  r = await S.get("/");
  verificar(
    r.html.includes('id="galeria"') && r.html.includes(encodeURIComponent(imagen.imagen_url)) && r.html.includes('href="/#galeria"'),
    "el sitio muestra la galería y la enlaza",
  );
  pagina = await C.get(rutaGaleria);
  r = await C.enviar(rutaGaleria, pagina.html, `form-imagen-${imagen.id}`, { id: imagen.id, descripcion: "Unhas E2E editada", orden: "2", activo: "on" });
  const editada = (await filas("galeria"))[0];
  verificar(destino(r) === `${rutaGaleria}?ok=guardado` && editada?.descripcion === "Unhas E2E editada" && editada.orden === 2, "edita la imagen", resumen(r));
  r = await C.enviar(rutaGaleria, pagina.html, `form-eliminar-imagen-${imagen.id}`, { id: imagen.id });
  const quedanImagenes = (await listarObjetos()).filter((o) => o.startsWith("galeria-"));
  verificar(
    destino(r) === `${rutaGaleria}?ok=eliminado` && (await filas("galeria")).length === 0 && quedanImagenes.length === 0,
    "borrar la imagen borra la fila y el objeto del bucket",
    resumen(r),
  );

  console.log("\nReserva en el sitio, sin pago anticipado:");
  r = await S.get("/turnos");
  verificar(r.status === 200 && r.html.includes("Sem pagamento antecipado"), "la página de turnos dice que no hay pago anticipado", String(r.status));
  const rutaApp = "sitio/[tenant]/turnos";
  const idDisponibilidad = idDeAccionCompilada(rutaApp, "consultarDisponibilidad");
  const idReserva = idDeAccionCompilada(rutaApp, "reservarTurno");
  const servicioId = creado.id;
  const manana = fechaEn(ZONA, Date.now() + 24 * 3600 * 1000);
  r = await S.accion("/turnos", idDisponibilidad, [[servicioId], manana]);
  const slots = Array.isArray(r.valor) ? r.valor : [];
  verificar(slots.length > 0, "hay horarios disponibles mañana", `${r.status}, ${slots.length} horarios`);
  const reserva = new FormData();
  reserva.append("servicioIds", servicioId);
  reserva.append("fecha", manana);
  reserva.append("iso", slots[0]?.iso ?? "");
  reserva.append("clienteNombre", "Cliente Reserva E2E");
  reserva.append("clienteEmail", emailReserva);
  reserva.append("clienteTelefono", "(11) 91234-5678");
  r = await S.accion("/turnos", idReserva, reserva);
  const urlGracias = r.valor?.ok ? r.valor.url : "";
  verificar(
    /^\/turnos\/gracias\?turno=[0-9a-f-]{36}$/.test(urlGracias),
    "la reserva vuelve a la página de gracias, sin Mercado Pago",
    r.valor?.ok === false ? r.valor.error : String(r.status),
  );
  const [turno] = await filas("turnos");
  verificar(
    turno?.estado === "confirmado" && turno.monto_sena === null && turno.bloqueado_hasta === null && turno.cliente_telefono === WHATSAPP,
    "el turno queda confirmado, sin monto ni bloqueo",
    turno ? `estado ${turno.estado}` : "sin turno",
  );
  verificar((await filas("pagos")).length === 0, "no se registra ningún pago");
  if (!turno) throw new Error("la reserva no creó el turno");
  r = await S.get(urlGracias || "/turnos/gracias");
  verificar(
    r.status === 200 && r.html.includes("Seu horário está confirmado!") && r.html.includes(`/turnos/gestion/${turno.token_gestion}`),
    "la página de gracias muestra el turno confirmado y el link para gestionarlo",
    String(r.status),
  );

  console.log("\nUn servicio con turnos no se borra:");
  pagina = await C.get(rutaServicios);
  r = await C.enviar(rutaServicios, pagina.html, `form-eliminar-servicio-${servicioId}`, { id: servicioId });
  verificar(
    destino(r) === `${rutaServicios}?error=servicio_con_turnos` && (await filas("servicios")).length === 1,
    "error claro y el servicio sigue",
    resumen(r),
  );
  verificar((await C.get(destino(r))).html.includes("Este serviço tem agendamentos registrados"), "el mensaje está en portugués");

  console.log("\nTurnos del panel:");
  pagina = await C.get("/admin/turnos");
  verificar(pagina.html.includes("Cliente Reserva E2E") && pagina.html.includes("Confirmado"), "el turno aparece confirmado en el panel");
  r = await C.enviar("/admin/turnos", pagina.html, `form-completar-${turno.id}`, { id: turno.id });
  verificar(
    destino(r) === "/admin/turnos?ok=turno_completado" && (await filas("turnos"))[0]?.estado === "completado",
    "marca el turno como completado",
    resumen(r),
  );

  console.log("\nMódulos apagados:");
  await ok(admin.from("tenants").update({ modulo_faq: false, modulo_whatsapp: false }).eq("id", tenantId), "apagar módulos");
  pagina = await C.get("/admin");
  verificar(!pagina.html.includes('href="/admin/preguntas"'), "el menú ya no muestra preguntas frecuentes");
  r = await C.get(rutaPreguntas);
  verificar(r.status === 404, "la página de la sección da 404", String(r.status));
  const preguntasAntes = (await filas("preguntas_frecuentes")).length;
  r = await C.enviar(rutaPreguntas, htmlPreguntas, "form-nueva-pregunta", { pregunta: "Não deveria entrar?", respuesta: "R", orden: "0", activo: "on" });
  verificar(
    destino(r) === "/admin?error=modulo_inactivo" && (await filas("preguntas_frecuentes")).length === preguntasAntes,
    "su action vuelve al panel con el aviso y no guarda nada",
    resumen(r),
  );
  verificar((await C.get(destino(r))).html.includes("Essa seção não está habilitada"), "el aviso se muestra en portugués");
  r = await S.get("/");
  verificar(
    !r.html.includes('id="preguntas-frecuentes"') &&
      !r.html.includes('href="/#preguntas-frecuentes"') &&
      !r.html.includes('aria-label="Fale com a gente no WhatsApp"'),
    "el sitio ya no muestra la sección ni el botón de WhatsApp",
  );

  console.log("\nCliente suspendido:");
  await ok(admin.from("tenants").update({ estado: "suspendido" }).eq("id", tenantId), "suspender");
  r = await C.get("/admin");
  verificar(r.status === 200 && r.html.includes("suspenso") && !r.html.includes("Olá,"), "el panel muestra el aviso de suspendido", String(r.status));
  r = await new Navegador(HOST_CLIENTE).get("/admin/login");
  verificar(r.html.includes("suspenso") && !r.html.includes('id="form-login"'), "el ingreso también muestra el aviso");
}

const hmacEmail = (dominio, e) => createHmac("sha256", secretoMfa).update(`${dominio}|${e}`).digest("hex");

try {
  await preparar();
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
  }
  if (!userId) {
    try {
      userId = await idDeUsuarioPorEmail(emailCliente);
    } catch (e) {
      console.error(`✗ limpieza: buscar el usuario del cliente: ${e.message}`);
      fallas++;
    }
  }
  if (userId) {
    // Perfil, códigos y dispositivos se borran en cascada.
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`✗ limpieza: usuario: ${error.message}`);
      fallas++;
    }
  }
  if (id) {
    // Marca, configuración, credenciales, servicios, turnos, testimonios, galería, preguntas e
    // intentos de reserva se borran en cascada.
    const { error } = await admin.from("tenants").delete().eq("id", id);
    if (error) {
      console.error(`✗ limpieza: tenant: ${error.message}`);
      fallas++;
    }
  }
  const borrados = await Promise.all([
    admin.from("intentos_login").delete().eq("email_hash", hmacEmail("login", emailCliente)),
    admin.from("intentos_login").delete().in("ip", ipsUsadas),
  ]);
  for (const { error } of borrados) {
    if (error) {
      console.error(`✗ limpieza: ${error.message}`);
      fallas++;
    }
  }
  const contarTenant = (tabla) =>
    admin.from(tabla).select("tenant_id", { count: "exact", head: true }).eq("tenant_id", id).then((r) => r.count ?? 1);
  const quedan = await Promise.all([
    leerTenant().then((t) => (t ? 1 : 0)),
    listarObjetos(id).then((o) => o.length).catch(() => 1),
    userId ? admin.auth.admin.getUserById(userId).then((r) => (r.data?.user ? 1 : 0)) : 0,
    ...(userId
      ? ["perfiles", "codigos_login", "dispositivos_confiables"].map((t) =>
          admin.from(t).select("user_id", { count: "exact", head: true }).eq("user_id", userId).then((r) => r.count ?? 1),
        )
      : []),
    ...(id
      ? ["servicios", "turnos", "testimonios", "galeria", "preguntas_frecuentes", "intentos_reserva", "tenant_marca", "configuracion_negocio"].map(
          contarTenant,
        )
      : []),
    admin.from("intentos_login").select("id", { count: "exact", head: true }).in("ip", ipsUsadas).then((r) => r.count ?? 1),
  ]);
  verificar(
    quedan.every((n) => n === 0),
    "no quedan el cliente, sus filas, sus imágenes ni el usuario de prueba",
    quedan.join(","),
  );
}

console.log(fallas === 0 ? "\nE2E OK" : `\n${fallas} verificación(es) fallaron`);
process.exit(fallas === 0 ? 0 : 1);
```

- [ ] **Step 2: Tipos, lint, tests y build**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
node --check scripts/e2e-cliente.mjs
npm run build
```

Expected: sin errores; el build sin errores; Vitest con todos los tests en PASS: los anteriores más `panel/secciones`, `panel/mensajes`, `panel/formularios`, `sitio/enlaces`, `turnos/pago` y los casos nuevos de `auth/mensajes`, `master/formularios`, `storage/imagenes` y `turnos/horario`.

- [ ] **Step 3: Pruebas de punta a punta en desarrollo**

`docker compose stop` y levantar el servidor de desarrollo con la salida en `$LOG` (ver "Servidor de desarrollo"; con `CABECERA_IP_CONFIABLE=x-real-ip` en su entorno). Comprobar que el `.env.local` **no** tiene la cuenta de la plataforma, así los códigos y links van a la consola:

```bash
for k in PLATFORM_GMAIL_USER PLATFORM_GMAIL_APP_PASSWORD; do grep -q "^$k=." .env.local && echo "$k: presente" || echo "$k: vacío"; done
node --env-file=.env.local scripts/e2e-cliente.mjs "$(cygpath -w "$LOG")"
node --env-file=.env.local scripts/e2e-master.mjs "$(cygpath -w "$LOG")"
node --env-file=.env.local scripts/e2e-login.mjs dev "$(cygpath -w "$LOG")"
```

Expected:
- Las dos variables dicen `vacío` (si están presentes, los scripts fallan esperando el log: avisar a Pablo y hacer la prueba manual del Step 6).
- `e2e-cliente.mjs`: todas las verificaciones en `✓` y `E2E OK`.
- `e2e-master.mjs` (regresión de C1, con el panel del cliente ahora en portugués): `E2E OK`.
- `e2e-login.mjs` (regresión de B; el panel de Gisel sigue en español: "Hola,"): `E2E OK`.

Si algo falla, revisar el log del servidor (`tail -n 80 "$LOG"`) antes de tocar código. Los scripts borran lo que crean aunque fallen. Si `e2e-cliente.mjs` no encuentra el manifiesto de las actions (`no encontré la action …`), comprobar con `ls ".next/dev/server/app/sitio/[tenant]/turnos/page/"` que el servidor compiló la página (la E2E la pide antes) y que se corre desde la raíz del repo.

- [ ] **Step 4: Aislamiento**

Run: `npm run test:aislamiento`
Expected: `Aislamiento OK`.

Detener el servidor de desarrollo (solo su árbol de procesos).

- [ ] **Step 5: Docker (producción)**

```bash
docker compose up -d --build --force-recreate
curl -s -o /dev/null -w 'docker gisel: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/
curl -s -o /dev/null -w 'docker gisel turnos: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/turnos
curl -s -o /dev/null -w 'docker gisel admin login: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/admin/login
curl -s -o /dev/null -w 'docker app login: %{http_code}\n' -H "Host: app.localhost:3000" http://localhost:3000/login
node --env-file=.env.local scripts/e2e-login.mjs docker
```

Expected: los cuatro `200` y `E2E OK`.

- [ ] **Step 6: Prueba manual en el navegador (para Pablo)**

Las E2E cubren los formularios sin JavaScript y la reserva por la action. Esta lista cubre lo que solo se ve en el navegador. Con `npm run dev` y el contenedor detenido; códigos y links en la terminal como `[MFA dev] …`. Para tener un cliente de Brasil: `node --env-file=.env.local scripts/tenant-demo-br.mjs crear`, y desde el master (`http://app.localhost:3000`) crearle el usuario y activarle todos los módulos.

1. `http://demo-br.localhost:3000/admin/login`: todo en portugués (también "Esqueceu sua senha?" y los mensajes de error). Entrar con el link de la terminal y el código.
2. **Menú:** solo las secciones de los módulos activos; al apagar uno desde el master, desaparece del menú y su página dice "Página não encontrada".
3. **Servicios:** agregar con precio `350,50` y verlo en el sitio como `R$ 350,50`. Intentar eliminar un servicio que tenga turnos: aparece el aviso en portugués.
4. **Horarios y reglas:** los días en portugués, los tres modos de pago, el aviso de Mercado Pago sin conectar; guardar "Sem pagamento antecipado".
5. **Reserva:** en `http://demo-br.localhost:3000/turnos` el texto "Sem pagamento antecipado…", elegir un horario y confirmar: el overlay dice "Confirmando seu agendamento…" y llega a "Seu horário está confirmado!" con el botón para gestionarlo. El turno aparece como "Confirmado" en el panel.
6. **Textos, testimonios, preguntas y galería:** cargar uno de cada uno y verlos en el inicio del sitio y en el menú; la pregunta se abre y se cierra sin JavaScript; subir una foto grande (más de 2 MB) da "A imagem tem mais de 2 MB."
7. **Botón de WhatsApp:** abajo a la derecha, abre WhatsApp con el número del cliente; con el módulo apagado no aparece.
8. **Suspender** el cliente desde el master: su panel (también el login) muestra "O painel deste site está suspenso…". Reactivarlo.
9. **Gisel** (`http://gisel.localhost:3000/admin`): todo sigue en español, su configuración muestra "Seña" elegido con 50%, y la reserva sigue yendo a Mercado Pago.
10. Borrar el cliente de prueba: `node --env-file=.env.local scripts/tenant-demo-br.mjs borrar` (y su usuario en Supabase → Authentication → Users).

**Checklist de configuración (para Pablo):**

- [ ] **Producción:** aplicar la migración 0020 y reconstruir la imagen.
- [ ] **Modo de pago de los clientes nuevos:** arrancan en "sin pago anticipado" hasta la etapa D (Mercado Pago propio). Cualquier persona puede reservar sin pagar: el límite por IP (2 reservas por hora) solo funciona con `CABECERA_IP_CONFIABLE` en producción; el cliente cancela turnos falsos desde su panel.
- [ ] **Emails de confirmación:** hasta la etapa D, solo Gisel los recibe (Gmail y plantilla globales). Los demás clientes ven la confirmación en la página de gracias, con el link para gestionar el turno.
- [ ] **Storage:** la galería suma hasta 30 imágenes de 2 MB por cliente en el bucket `sitios`. Vigilar el espacio del plan de Supabase.

- [ ] **Step 7: Commit**

```bash
git add scripts/e2e-cliente.mjs
git status --short   # .env.local y docs/resumen-arquitectura-y-desarrollo.md NO deben estar en staged
git commit -F - <<'EOF'
test(panel): prueba de punta a punta del panel del cliente

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Self-review

**Cobertura del spec y de las decisiones:**

| Requisito | Task |
|---|---|
| §7 Panel del cliente en su idioma (§2 "Idioma de paneles", §8 `<T>`/`t` sin librerías) | 1 (`mensajes.ts`), 5 (layout, inicio, 404, error, `lang`), 6 (ingreso), 7 a 12 (pantallas), 16 |
| §7 / §5 Cada sección aparece solo con su módulo; módulo apagado → 404 y fuera del menú y del panel | 1 (`secciones.ts`), 5 (`tenantDeSeccion`, `tenantDeAccion`, cursos), 7 a 12, 16 (404, action → `modulo_inactivo`) |
| §5 Cliente suspendido: panel bloqueado (aviso, no la pantalla de error) | 5 (`tenantDelHost`, `SitioSuspendido panel`), 15 (`e2e-master`), 16 |
| §7 Agenda de turnos | 9, 16 |
| §7 Servicios y precios | 3 (`parsearServicio`), 7, 16 |
| §7 Horarios y reglas: modo de pago, % de seña, horas mínimas de cancelación, minutos entre turnos | 2, 3 (`parsearConfiguracion`), 8, 16 |
| §7 Testimonios, galería, preguntas frecuentes | 3, 4 (tablas), 11, 12, 13, 16 |
| §7 Textos de inicio y "sobre mí" | 3 (`parsearTextosSitio`), 10, 16 |
| §2 Permisos: el cliente no cambia marca, módulos, credenciales | 3 (listas blancas y sus tests), 10, 16 (campos ajenos ignorados) |
| §4.1 `galeria` y `preguntas_frecuentes` con `tenant_id`, `orden`, `activo` (decisión: `imagen_url`) | 4 |
| §4.2 `modo_pago` (`ninguno`, `sena`, `total`); `sena_porcentaje` solo con `sena` | 2, 4, 8, 14 |
| §4.3 Acceso del servidor por `datosDelTenant`; anónimo sin acceso a contenido privado | 4 (`TablaTenant`, RLS sin policies, aislamiento), 7 a 13 |
| §9 Modos de pago: `ninguno` confirma al reservar; `sena` como hoy; `total` cobra el precio | 2, 14, 16 |
| §3 Botón flotante de WhatsApp | 13, 16 |
| §5 Módulo apagado desaparece del menú y de la home del sitio | 1 (`enlaces.ts`), 13, 16 |
| §13 Tests unitarios: selección del modo de pago | 2 |
| §13 Aislamiento: tablas nuevas | 4 |
| Pendientes: borrar servicio con turnos; links a secciones vacías; menores de C1 | 7, 13, 3 + 15 |

**Queda para C2b:** cursos del panel traducidos y con subida directa a Storage (videos y archivos), curso con compras con error claro al borrar, favicon por cliente.
**Queda para D:** OAuth de Mercado Pago (y con él, cobrar con seña o total fuera de Gisel), Calendar y Gmail por cliente, plantillas de emails transaccionales con la marca y el idioma del cliente. **E:** crons.

**Tipos consistentes entre tasks:**

- **Mensajes:** `ClaveError` y `ClaveInfo` (`src/lib/panel/mensajes.ts`) son las claves de sus tablas. `Resultado<T>` de `panel/formularios.ts` usa `ClaveError`. `MensajePanel` de `servidor.ts` usa las dos, así `ir()` no compila con una clave sin texto. `ProblemaImagen` (`imagen_vacia`, `imagen_grande`, `imagen_tipo`) está en `ERRORES` (el test de la Task 1 lo exige por tipos).
- **Secciones:** `SeccionPanel` es el argumento de `tenantDeSeccion`/`tenantDeAccion` en cada página y action: `turnos`, `servicios`, `configuracion`, `textos`, `cursos`, `testimonios`, `galeria`, `preguntas`; sus rutas (`/admin/<x>`) son las de las carpetas de `src/app/admin`.
- **Modo de pago:** `ModoPago` (`turnos/pago.ts`) es el tipo de `ConfiguracionNegocio.modo_pago`, de `ReglasTurnos.modoPago`, de la prop `modoPago` de `ReservaForm` y del `check` de la 0020. `cobroDeReserva` lo usan la reserva (servidor) y `ReservaForm` (navegador) con los mismos argumentos.
- **Confirmación:** `TurnoConfirmado` (`confirmacion.ts`) lo arman el webhook (desde la fila del turno) y la reserva (desde el tenant y el servicio) con los mismos campos.
- **Enlaces del sitio:** `EnlaceSitio`/`ContenidoSitio` (`sitio/enlaces.ts`): `contenidoDelSitio` devuelve `ContenidoSitio`, el layout pasa `EnlaceSitio[]` a `Nav`, que usa `DESTINO_ENLACE`. Los ids de sección (`#galeria`, `#preguntas-frecuentes`) son los de `Galeria.tsx` y `PreguntasFrecuentes.tsx`.
- **Datos ↔ columnas:** `columnasServicio`, `columnasConfiguracion`, `columnasTextosSitio`, `columnasTestimonio`, `columnasPregunta` y el update de `editarImagen` nombran columnas reales (consultadas: `servicios`, `configuracion_negocio`, `tenant_marca`, `testimonios`; las de `galeria` y `preguntas_frecuentes` son las de la 0020). `ImagenGaleria`, `PreguntaFrecuente` y `TestimonioAdmin` (`data/types.ts`) son las columnas que seleccionan `data/galeria.ts`, `data/preguntas.ts` y `getTestimoniosAdmin`.
- **Nombres de campos de formulario** (parsers, páginas y E2E): `id`, `nombre`, `duracion_minutos`, `precio`, `orden`, `activo`, `desde_<dia>`, `hasta_<dia>`, `cerrado_<dia>`, `horas_minimas_cancelacion`, `minutos_preparacion_entre_turnos`, `modo_pago`, `sena_porcentaje`, `inicio_titulo`, `inicio_destacado`, `inicio_texto`, `sobre_mi_titulo`, `sobre_mi_texto`, `texto`, `pregunta`, `respuesta`, `descripcion`, `archivo`.
- **Ids de formulario que lee la E2E:** `form-login`, `form-verificar` (B), `form-nuevo-servicio`, `form-servicio-<id>`, `form-eliminar-servicio-<id>`, `form-configuracion`, `form-textos-sitio`, `form-nuevo-testimonio`, `form-testimonio-<id>`, `form-nueva-pregunta`, `form-subir-imagen`, `form-imagen-<id>`, `form-eliminar-imagen-<id>`, `form-completar-<id>`; además existen `form-eliminar-testimonio-<id>`, `form-pregunta-<id>`, `form-eliminar-pregunta-<id>`, `form-cancelar-<id>` y `form-salir`.
- **Actions llamadas desde JavaScript:** `reservarTurno` devuelve `{ ok: true; url } | { ok: false; error }` (antes `initPoint`); `ReservaForm` y la E2E usan `url`.

**Orden y compilación:**

- Tasks 1 a 3: módulos puros con tests (la 3 extiende `master/formularios`, `storage/imagenes` y `turnos/horario`).
- Task 4: SQL, tipos (`ModoPago` ya existe por la Task 2) y aislamiento.
- Task 5: base del panel; usa 1. Cursos queda con el módulo exigido (se traduce en C2b).
- Task 6: ingreso traducido; usa `tenantDelHost` de la 5.
- Tasks 7 a 12: secciones del panel; cada una usa 1, 3 y 5 (la 8 también `nombreDia` de la 3 y `MODOS_PAGO` de la 2; la 12 `pathImagenGaleria` de la 3).
- Task 13: sitio público; usa 1 y las lecturas de 11 y 12.
- Task 14: reserva; usa 2 y 4.
- Task 15: pendientes de C1 (independiente). Task 16: E2E y verificación final.
- `tsc` queda en verde al final de cada task: lo que se reemplaza (exports de actions, props de `Nav` y `ReservaForm`) se cambia junto con todos sus usos en la misma task.

**Sin placeholders:** todo archivo nuevo o reescrito tiene su contenido completo, con los textos en español y portugués; las ediciones puntuales indican el texto exacto a buscar y a poner.

**Riesgos que quedan abiertos:**

- **Reservas sin pago anticipado (spam):** con `ninguno`, un turno falso ocupa la agenda sin costo. Mitigación existente: 2 reservas por hora por IP (solo con `CABECERA_IP_CONFIABLE`, obligatoria en producción) y el cliente cancela desde su panel. No hay límite por email ni captcha (se puede sumar si aparece abuso).
- **Sin email de confirmación fuera de Gisel hasta la etapa D:** el cliente final solo tiene la página de gracias con el link de gestión; si la cierra, no tiene cómo cancelar online (el negocio lo hace desde el panel).
- **Llamar actions como React en la E2E:** depende del formato de `encodeReply` y del manifiesto de desarrollo de Next 16.2 (verificados al planificar). Un cambio de versión de Next puede romper solo esa parte de la E2E; la reserva se prueba igual a mano (Step 6).
- **Traducción completa del panel:** los textos que escribe el cliente (nombres de servicios, testimonios) quedan en el idioma en que los cargue. Los emails transaccionales siguen en español con la marca de Gisel (etapa D). Cursos queda en español hasta C2b.
- **Doble reserva simultánea:** el chequeo de disponibilidad y el insert no son atómicos (igual que antes); con `ninguno` el turno nace confirmado, así que dos reservas al mismo tiempo podrían confirmarse las dos. El cliente lo ve en su agenda.
- **Galería y CDN:** una imagen borrada puede seguir un tiempo en la CDN de Supabase y en la caché de `next/image` (como los logos de C1).
