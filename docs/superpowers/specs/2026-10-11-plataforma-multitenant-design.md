# Plataforma multi-tenant de turnos — Diseño

**Fecha:** 2026-10-11
**Estado:** aprobado en la conversación de diseño, pendiente de revisión del documento
**Punto de partida:** el sitio de Estética Gisel (Next.js 16 + Supabase), que pasa a ser el primer cliente de la plataforma.

## 1. Objetivo

Convertir el sitio de un solo negocio en una plataforma que se pueda vender a cualquier negocio unipersonal que trabaje con turnos (estética, uñas, barbería, nutrición, psicología, etc.) en Argentina y Brasil, y dar de alta un cliente nuevo en minutos desde un panel master, sin tocar código.

**Criterios de éxito**

- Un cliente nuevo se da de alta desde el panel master (subdominio, marca, módulos, idioma y país) y su sitio queda en línea sin deploy.
- Ningún cliente puede ver ni modificar datos de otro. Lo prueban tests contra la base real.
- El sitio de Gisel sigue funcionando al terminar cada etapa, con todos sus datos actuales.
- Cada texto visible existe en español y portugués. Si falta uno, el proyecto no compila.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Dirección de cada sitio | Subdominio de la plataforma: `gisel.<PLATFORM_DOMAIN>`. Dominio propio queda para el futuro. |
| Datos | Una sola base Supabase compartida, `tenant_id` en todas las tablas y RLS. |
| Arquitectura de rutas | El `proxy` reescribe el subdominio a un segmento `/sitio/[tenant]` (patrón recomendado por Next, Platforms Starter Kit). |
| Usuarios | Un usuario de login por cliente; el esquema permite sumar más después. Un usuario master (Pablo). |
| Permisos | El cliente maneja el día a día: servicios, precios, horarios, turnos, cursos, textos y contenido de módulos. El master maneja marca, subdominio, módulos, credenciales y estado. |
| Diseño público | Una sola estructura para todos, con marca y contenido configurables. Sin plantillas ni constructor de páginas. |
| Agendas | Una agenda por negocio. |
| Países | Argentina y Brasil: idioma, zona horaria, moneda, teléfono y cuenta de Mercado Pago por cliente. |
| Idiomas | `es` y `pt`, con una etiqueta propia y textos escritos en el código, sin librerías de i18n. |
| Idioma de paneles | El panel del cliente en su idioma; el panel master solo en español. |
| Email de cada cliente | Credenciales propias de Gmail (SMTP con contraseña de aplicación), con respaldo en la cuenta de la plataforma. |
| Email de login | Cuenta de Gmail de la plataforma para códigos de verificación y recuperación de contraseña, con la marca del cliente. |
| Login | Email y contraseña más código de 6 dígitos por email, con "recordar este dispositivo por 30 días". |
| Mercado Pago | Botón "Conectar Mercado Pago" (OAuth) con una aplicación de la plataforma por país. Carga manual de credenciales como alternativa en el panel master. |
| Cobro a clientes | Fuera de la plataforma. Solo existe el estado activo o suspendido. |
| Hosting | VPS propio con Docker, Caddy y certificado comodín con DNS de Cloudflare. |
| Crons | Supabase pg_cron + pg_net (migración 0006 existente), recorriendo todos los clientes. |

## 3. Alcance

**Incluido en la primera versión**

- Núcleo multi-tenant, migración de Gisel como primer cliente.
- Login con verificación en dos pasos por email, para clientes y master.
- Panel master: alta, edición y suspensión de clientes.
- Panel del cliente, filtrado por los módulos habilitados.
- Módulos: turnos (con modo de pago configurable), cursos, sobre mí, testimonios, galería, preguntas frecuentes y botón flotante de WhatsApp.
- Integraciones por cliente: Mercado Pago (OAuth y manual), Gmail y Google Calendar.
- Crons multi-tenant: liberar turnos, recordatorios y renovación de tokens de Mercado Pago.

**Fuera de alcance** (decidido explícitamente)

- Dominio propio por cliente.
- Varios usuarios o roles por cliente.
- Varios profesionales o agendas por negocio.
- Plantillas de diseño o constructor de páginas.
- Cobro automático de suscripciones o planes con límites.
- Envío de recordatorios por WhatsApp (pendiente de que se apruebe el costo de la API de Meta).
- Países fuera de Argentina y Brasil.

## 4. Modelo de datos

### 4.1 Tablas nuevas

**`tenants`** — un negocio cliente.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text único | Subdominio. Minúsculas, números y guiones, de 3 a 40 caracteres. No admite reservados: `www`, `app`, `admin`, `master`, `api`. |
| `nombre` | text | Nombre comercial |
| `estado` | text | `activo` o `suspendido` |
| `idioma` | text | `es` o `pt` |
| `pais` | text | `AR` o `BR` |
| `zona_horaria` | text | IANA, por ejemplo `America/Argentina/Buenos_Aires` o `America/Sao_Paulo` |
| `moneda` | text | `ARS` o `BRL` |
| `modulo_turnos`, `modulo_cursos`, `modulo_sobre_mi`, `modulo_testimonios`, `modulo_galeria`, `modulo_faq`, `modulo_whatsapp` | boolean | Módulos habilitados |
| `creado_en` | timestamptz | |

**`tenant_marca`** — PK `tenant_id`.

- Colores base: `color_primario`, `color_secundario`, `color_fondo`, `color_texto`.
- Imágenes: `logo_path` y `foto_perfil_path`, en el bucket `sitios`.
- Textos: `inicio_titulo`, `inicio_texto`, `sobre_mi_titulo`, `sobre_mi_texto`.
- Contacto: `whatsapp` (E.164), `instagram`, `email_contacto`, `direccion`.

**`tenant_credenciales`** — PK `tenant_id`. Los campos sensibles se guardan cifrados (ver 4.3).

- Mercado Pago: `mp_access_token`, `mp_refresh_token`, `mp_token_vence_en`, `mp_public_key`, `mp_user_id`, `mp_origen` (`oauth` o `manual`) y `mp_webhook_secret` (solo en modo manual: el secreto de la aplicación propia del cliente).
- Gmail: `smtp_usuario`, `smtp_password`, `smtp_nombre_remitente`, `smtp_estado` (`ok`, `error` o `sin_configurar`) y `smtp_ultimo_error`.
- Google Calendar: `google_refresh_token` y `google_calendar_id`.

**`perfiles`**

- Columnas: `user_id` PK (`auth.users`), `rol` (`master` o `cliente`), `tenant_id` (null para master).
- Restricción: el rol `cliente` exige un `tenant_id`.

**Verificación en dos pasos**

- **`codigos_login`:** `id`, `user_id`, `codigo_hash`, `expira_en`, `intentos` y `creado_en`.
- **`dispositivos_confiables`:** `id`, `user_id`, `token_hash`, `expira_en`, `user_agent`, `creado_en` y `ultimo_uso_en`.

**Contenido de módulos:** cada tabla tiene `tenant_id`, `orden` y `activo`.

- **`testimonios`:** `nombre` y `texto`.
- **`galeria`:** `imagen_path` y `descripcion`.
- **`preguntas_frecuentes`:** `pregunta` y `respuesta`.

### 4.2 Cambios en tablas existentes

- **`tenant_id uuid not null references tenants`** se suma en `servicios`, `turnos`, `cursos`, `archivos_curso`, `accesos_curso`, `pagos`, `intentos_reserva` y `recordatorios_enviados`, con índice en cada una.
- **`configuracion_negocio`:**
  - Pasa de "una sola fila" (`id = 1`) a una fila por cliente, con PK `tenant_id`.
  - Suma `modo_pago`, con los valores `ninguno`, `sena` o `total`.
  - `sena_porcentaje` solo aplica cuando `modo_pago = 'sena'`.
- **Testimonios:** hoy están fijos en `Testimonios.tsx` y se mueven a la tabla `testimonios`.
- **Storage:**
  - Los archivos de cursos pasan a `cursos-videos/{tenant_id}/…` y `cursos-archivos/{tenant_id}/…`.
  - Se suma el bucket público `sitios/{tenant_id}/…` para logo, foto y galería.

### 4.3 Seguridad de datos

- **Credenciales cifradas:**
  - Se cifran con AES-256-GCM en el servidor, con la clave `CREDENCIALES_KEY` del `.env`, y solo se descifran en el servidor al usarlas.
  - Ningún rol de la API las lee, porque `tenant_credenciales` no tiene policies.
  - Los paneles muestran solo el estado ("configurado ✓") y permiten reemplazar el valor.
- **RLS:**
  - Funciones SQL `tenant_actual()` (el `tenant_id` del perfil de `auth.uid()`) y `es_master()`.
  - El usuario `cliente` lee y escribe solo filas con `tenant_id = tenant_actual()`. El `master`, todas.
  - El usuario anónimo solo lee contenido público: servicios activos, cursos publicados, testimonios, galería y preguntas activas, y los campos públicos de `tenants` y `tenant_marca` de clientes activos.
- **Acceso del servidor:**
  - El código de servidor que usa la service role (que se saltea RLS) accede a los datos solo a través del helper `datosDelTenant(tenantId)`, que agrega el filtro en cada consulta.
  - Ninguna página ni action consulta tablas directamente.
- **Agujero actual que se cierra:** hoy `requireAdmin()` solo verifica que haya sesión, así que cualquier usuario logueado es admin. Pasa a verificar el rol, el `tenant_id` del perfil y que coincida con el tenant del subdominio.

### 4.4 Migración de Gisel

1. Una migración crea el tenant `gisel` (AR, `es`, ARS, todos los módulos actuales activos) y asigna su `tenant_id` a todas las filas existentes, antes de volver obligatoria la columna.
2. Su `tenant_marca` se carga con los colores, textos y contacto actuales del código.
3. Un script mueve las credenciales del `.env.local` a `tenant_credenciales`, cifradas, y los archivos de Storage a la carpeta del tenant.

## 5. Rutas y resolución del tenant

| Host | Destino interno |
|---|---|
| `{slug}.<PLATFORM_DOMAIN>/…` | `/sitio/{slug}/…` (sitio público y `/admin` del cliente) |
| `app.<PLATFORM_DOMAIN>/…` | `/master/…` |
| `<PLATFORM_DOMAIN>` | Redirige a `app.` (hasta que exista una página del producto) |

- **Configuración del dominio:** `PLATFORM_DOMAIN` va en el `.env`. En desarrollo es `localhost:3000`, y `gisel.localhost:3000` resuelve en el navegador sin configurar DNS.
- **Rutas internas:** el `proxy` impide abrir `/sitio/…` o `/master/…` directamente.
- **Cliente inexistente o suspendido:** el layout de `/sitio/[tenant]` carga el tenant. Si no existe, devuelve 404; si está suspendido, muestra la página "sitio no disponible", y el panel queda bloqueado igual.
- **Módulo apagado:** su página devuelve 404 y desaparece del menú, de la home y del panel del cliente.
- **API:**
  - Webhook de Mercado Pago: `/api/webhooks/mercadopago/[tenantId]`.
  - OAuth: `/api/oauth/mercadopago/callback` y `/api/oauth/google/callback`. El tenant viaja en un `state` firmado.
  - Crons: `/api/cron/*` atienden desde cualquier host y recorren todos los clientes.

## 6. Login y verificación en dos pasos

1. **Email y contraseña** con Supabase Auth. Se verifica que el perfil corresponda al host: un cliente solo entra en su subdominio y el master solo en `app.`. Si no corresponde, se cierra la sesión con un error genérico.
2. **Dispositivo recordado.** Si la cookie `dispositivo` (httpOnly, Secure, 30 días) coincide con un registro vigente de `dispositivos_confiables`, se salta al paso 4.
3. **Código por email:**
   - Se genera un código de 6 dígitos y se guarda solo como HMAC.
   - Vence a los 10 minutos, admite 5 intentos y se puede reenviar después de 60 segundos.
   - Sale desde la cuenta de la plataforma, con la marca del tenant del host (o de la plataforma, para el master).
   - Si el usuario marca "Recordar este dispositivo por 30 días", se crea un token aleatorio: se guarda su hash en la base y el token en la cookie.
4. **Verificación ligada a la sesión:**
   - Se emite la cookie `mfa`, firmada con HMAC sobre `user_id` y el `session_id` del JWT de Supabase.
   - El `proxy` exige sesión válida más la cookie `mfa` en `/admin` y `/master`.
   - Cerrar sesión invalida la verificación.
5. **Recuperar contraseña:** el link se genera con la API admin de Supabase (`generateLink`, tipo `recovery`) y lo enviamos nosotros con la plantilla de la marca, sin usar los emails estándar de Supabase.
6. **Alta del usuario del cliente:** el master carga el email; se crea el usuario y se le envía un link para que defina su contraseña. El master nunca conoce contraseñas de clientes.
7. **Usuario master:** un script lo crea leyendo `MASTER_EMAIL` y `MASTER_PASSWORD` del `.env.local`. La contraseña nunca va en código, migraciones ni repositorio.

## 7. Paneles

**Panel del cliente** (`{slug}.<dominio>/admin`, en el idioma del cliente). Cada sección aparece solo si su módulo está activo:

- Agenda de turnos
- Servicios y precios
- Horarios y reglas: modo de pago, porcentaje de seña, horas mínimas de cancelación, minutos entre turnos
- Cursos
- Testimonios
- Galería
- Preguntas frecuentes
- Textos de inicio y "sobre mí"
- Integraciones del cliente:
  - **Conectar Mercado Pago** (OAuth).
  - **Conectar Google Calendar**, porque Google exige que autorice el dueño de la cuenta.
  - Estado del envío de emails.

**Panel master** (`app.<dominio>`, en español):

- **Lista de clientes:** nombre, subdominio, estado, módulos y alertas (email con error, Mercado Pago por vencer).
- **Alta y edición de un cliente:**
  - Datos básicos y subdominio.
  - País, idioma, zona horaria y moneda.
  - Marca: colores con vista previa en vivo, logo y foto.
  - Módulos.
  - Credenciales: Gmail con el botón "probar conexión" y Mercado Pago manual.
  - Usuario del cliente.
- **Acciones:** suspender o reactivar, revocar dispositivos recordados, reenviar el link de contraseña.

## 8. Marca, colores e idioma

**Colores**

- Los tokens actuales con nombre de la marca de Gisel (`mauve`, `sage`, `cream`, `ink` y sus variantes) se reemplazan por tokens neutros: `primario`, `secundario`, `fondo` y `texto`, con las variantes `-oscuro` y `-suave`.
- El layout del tenant define las variables CSS con los 4 colores base. Las variantes se calculan con `color-mix()` en `globals.css`, dentro del `@theme` de Tailwind 4.
- Se usan 4 colores base porque son los que usa el diseño actual. Se descartó el quinto color ("acento") que se había mencionado, porque ningún componente lo necesita.

**Idioma**

- Componente `<T es="…" pt="…" />` y función `t({ es, pt })` para textos fuera de JSX (atributos, emails, metadata).
- El idioma sale del tenant. Los componentes de servidor lo reciben desde el layout y los de cliente, desde un contexto `IdiomaProvider`.
- Los tipos exigen ambas claves, así que un texto sin traducir no compila. Agregar un idioma es sumar una clave al tipo.
- No se usan librerías de i18n.

**Formato por país:** fechas, horas y precios usan `Intl` con el idioma y la zona horaria del tenant.

## 9. Integraciones

**Mercado Pago**

- **Aplicaciones:** una aplicación de la plataforma por país (AR y BR), con `client_id` y `client_secret` en el `.env`.
- **Conexión (OAuth):**
  - "Conectar" redirige al OAuth de Mercado Pago con un `state` firmado (tenant y vencimiento).
  - El callback intercambia el código por `access_token` y `refresh_token` y los guarda cifrados.
- **Cobros:**
  - Las preferencias se crean con el token del tenant y en su moneda.
  - Su `notification_url` es el webhook del tenant.
  - La firma del webhook se verifica con el secreto de la aplicación del país (modo OAuth) o con el `mp_webhook_secret` del tenant (modo manual). Al empezar la etapa D se confirma en la documentación de Mercado Pago con qué secreto firma las notificaciones de vendedores conectados por OAuth.
  - El pago se consulta con el token del tenant.
- **Renovación:** los tokens vencen a los 180 días. Un cron diario renueva los que vencen en menos de 30.
- **Carga manual:** el panel master permite cargar el token a mano (`mp_origen = 'manual'`).
- **Modos de pago:**
  - `ninguno`: el turno se confirma al reservar, sin Mercado Pago.
  - `sena`: la seña es un porcentaje del precio (comportamiento actual).
  - `total`: se cobra el precio completo.

**Gmail del cliente**

- Usa SMTP con la contraseña de aplicación cifrada. El botón "probar conexión" hace un `verify()` antes de guardar.
- **Respaldo:** si el envío falla, sale desde la cuenta de la plataforma, con el nombre del cliente como remitente y `reply-to` a su email de contacto. Se registran `smtp_estado` y `smtp_ultimo_error`, y se muestra una alerta en ambos paneles.

**Google Calendar**

- Usa una sola aplicación de Google Cloud de la plataforma, y el refresh token de cada cliente se guarda cifrado.
- El evento se crea, actualiza y borra igual que hoy, pero con las credenciales del tenant.
- Riesgo: hasta que Google verifique la aplicación, al conectar se muestra el aviso de "app no verificada" y hay un límite de 100 usuarios. Hay que iniciar la verificación temprano.

## 10. Emails

- **Plantilla única** parametrizada por el tenant: logo, colores, idioma y pie con los datos de contacto.
- **Tipos de email:**
  - Confirmación de turno.
  - Recordatorios de 48 h, 24 h y 2 h.
  - Cancelación.
  - Acceso a curso.
  - Código de verificación.
  - Recuperación y creación de contraseña.
- **Envío:**
  - Los emails transaccionales salen por el Gmail del cliente, con respaldo en la plataforma.
  - Los de login y contraseña salen siempre por la cuenta de la plataforma.

## 11. Crons

- **Jobs:** se mantienen los jobs de `0006_cron_jobs.sql`, y se suma `renovar-tokens-mp` (diario).
- **Recorrido:** cada endpoint recorre los tenants activos con el módulo correspondiente.
- **Errores:** cada tenant se procesa dentro de su propio `try/catch`. Un error en uno se registra y no frena a los demás.
- **Formato:** fechas y horarios se formatean con la zona horaria y el idioma de cada tenant.

## 12. País: zona horaria, teléfono, moneda

- **Zona horaria:**
  - `src/lib/turnos/fechas.ts` hoy tiene fijo el offset `-03:00`. Pasa a recibir la zona horaria IANA del tenant, porque Brasil tiene varias (por ejemplo Manaos, `-04:00`).
  - El cálculo de offset usa `Intl`, sin librerías.
- **Teléfono:** `normalizarWhatsApp(input, pais)` valida celulares de AR o BR según el país del tenant.
- **Moneda:** `formatPrecio(monto, moneda, idioma)` muestra `$ 35.000` (ARS) o `R$ 350,00` (BRL).

## 13. Pruebas

- **Tests unitarios (Vitest) de la lógica nueva:**
  - Resolver el tenant desde el host.
  - Validar el `slug`.
  - Cifrado y descifrado de ida y vuelta.
  - Códigos de login: vencimiento, intentos y reenvío.
  - Dispositivos recordados: vencimiento y revocación.
  - Firma y verificación de la cookie `mfa` y del `state` de OAuth.
  - Offset de zona horaria por zona IANA.
  - Teléfonos de AR y BR.
  - Formato de moneda.
  - Selección del modo de pago.
- **Tests de aislamiento contra Supabase:**
  - Un script crea dos tenants de prueba, cada uno con su usuario.
  - Verifica que el usuario de A no pueda leer, insertar, actualizar ni borrar filas de B en ninguna tabla, y que el anónimo no lea credenciales ni contenido inactivo.
  - Al final borra los datos de prueba. Es requisito para cerrar la etapa A.
- **Smoke test por etapa:** el sitio de Gisel responde y su flujo de reserva funciona en el contenedor.

## 14. Etapas de construcción

Cada etapa tiene su propio plan de implementación. Al terminar cada una, el sitio de Gisel funciona.

| Etapa | Contenido | Necesita |
|---|---|---|
| A | Núcleo multi-tenant: tablas, RLS, helper `datosDelTenant`, `proxy` con subdominios, `/sitio/[tenant]`, colores neutros, `<T>`, zona horaria y moneda por tenant, migración de Gisel, tests de aislamiento | `CREDENCIALES_KEY` (la genera Claude directo en el `.env`) |
| B | Login con verificación por email, dispositivos recordados, recuperación de contraseña, usuario master, cierre del agujero de `requireAdmin` | Gmail de la plataforma con contraseña de aplicación; `MASTER_EMAIL` y `MASTER_PASSWORD` en el `.env` |
| C | Panel master, panel del cliente filtrado por módulos, galería, preguntas frecuentes, testimonios editables, botón de WhatsApp, modos de pago | — |
| D | Mercado Pago (OAuth y manual), Gmail por cliente con respaldo, Google Calendar por cliente, plantillas de email con la marca | Aplicaciones de Mercado Pago (AR y BR) y de Google Cloud de la plataforma |
| E | Crons multi-tenant y renovación de tokens de Mercado Pago | — |
| Publicación | VPS, Caddy con certificado comodín, DNS en Cloudflare | Nombre y dominio del producto, VPS |

## 15. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Filtración de datos entre clientes | RLS, acceso del servidor solo por `datosDelTenant`, tests de aislamiento obligatorios |
| Gmail de un cliente deja de funcionar | Respaldo en la cuenta de la plataforma y alertas en los paneles |
| Límite de Gmail (~500 envíos por día por cuenta) | Suficiente para negocios unipersonales; si un cliente crece, se migra a un proveedor con dominio |
| Google sin verificar la aplicación | Iniciar la verificación en la etapa D |
| Tokens de Mercado Pago vencidos | Cron diario de renovación y alerta en el panel master |
| Cambios grandes en rutas y estilos | Etapas cortas, smoke test del sitio de Gisel al cerrar cada una |
