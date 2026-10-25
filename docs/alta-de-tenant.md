# Alta manual de un tenant

Esta guía es para dar de alta un salón a mano, desde el panel master y la infraestructura. No hay alta automática ni cobro de la suscripción.

El esquema no inserta clientes. Después de las migraciones la base queda vacía. El demo ficticio y el salón de Gisel son seeds aparte (`supabase/seeds/`).

## 1. Migraciones

En el proyecto de Supabase de la plataforma, con `SUPABASE_DB_URL` en `.env.local`:

```bash
npm run migrar -- supabase/migrations/0001_init.sql
# …el resto, en orden, hasta…
npm run migrar -- supabase/migrations/0027_credito_tema_y_rls.sql
```

`scripts/migrar.mjs` saltea las que ya están en `public.migraciones_aplicadas`. No vuelvas a forzar `0001` ni `0008` en una base que ya las corrió: el archivo cambió (se sacó el seed) pero la base vieja ya tiene los datos.

La `0027` hay que correrla en la base que ya está en producción: agrega `mostrar_credito` (apagado), deja la paleta por defecto neutra y mueve las URLs viejas `/brand/…` y `/gisel/retrato.jpg` a `/tenants/gisel/…`. Hacelo junto con el deploy que mueve esos archivos, si no el sitio de ese salón queda sin logo un rato.

## 2. Subdominio

Cada salón es `https://<slug>.<PLATFORM_DOMAIN>`.

- `PLATFORM_DOMAIN` en el entorno, sin esquema (`turnos.ejemplo.com` o `localhost:3000`).
- El slug: minúsculas, números y guiones, entre 3 y 40 caracteres. No pueden usarse `www`, `app`, `admin`, `master` ni `api`.
- DNS: un registro comodín `*.PLATFORM_DOMAIN` al servicio, con certificado comodín.
- `app.<PLATFORM_DOMAIN>` es el panel master.
- En local, `demo.localhost:3000` resuelve sin DNS.

El alta del registro la hace el panel master (función `crear_tenant`): slug, nombre, país, idioma, zona horaria, moneda, módulos y colores. Crea la fila del tenant, la marca, la configuración (horario vacío, sin pago anticipado, crédito apagado) y la fila vacía de credenciales. El usuario del salón se invita desde el mismo panel.

Para el demo ficticio, en vez del panel:

```bash
npm run migrar -- supabase/seeds/demo.sql
```

Queda en `demo.<PLATFORM_DOMAIN>`, con servicios, textos y testimonios inventados, sin fotos de nadie y con el crédito apagado. No lo uses como sitio de un cliente real.

## 3. Supabase

Un proyecto para la plataforma (no uno por salón).

- `NEXT_PUBLIC_SUPABASE_URL` y la clave publicable van al entorno del sitio.
- `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor. Con esa clave el código pasa por `datosDelTenant`, que fija `tenant_id` en cada consulta. La service role se saltea RLS: no la expongas en el navegador.
- Auth: el login del panel es el de Supabase más el segundo factor por email. Un access token solo no lee tablas (`authenticated` no tiene privilegios).
- Storage: el bucket público `sitios` guarda logos y galería por carpeta de tenant. Los videos de cursos no son públicos.
- RLS: `anon` solo puede leer el catálogo público de tenants activos (servicios activos, cursos publicados sin la ruta del video, testimonios, ficha y marca). Turnos, pagos, credenciales, configuración y login no salen por la API anónima. `interno.tenant_activo` no está en el esquema `public`, así que PostgREST no la publica como RPC.

## 4. Mercado Pago a nombre del salón

La aplicación y las credenciales son de la cuenta de Mercado Pago del salón, no de la plataforma.

1. En la cuenta del salón, crear una aplicación y un access token de producción.
2. Definir el secreto del webhook.
3. En el panel del salón, Conexiones: cargar access token, clave pública y secreto. Se guardan cifrados (`CREDENCIALES_KEY`).
4. La URL de notificación de los pagos es `https://<slug>.<PLATFORM_DOMAIN>/api/webhooks/mercadopago`.
5. El webhook exige la firma `x-signature` de Mercado Pago (HMAC del manifiesto, ventana de 5 minutos). Sin firma vigente no se confirma nada, ni en desarrollo. Después reconsulta el pago a la API y compara el monto con la reserva o el curso de ese tenant.
6. Hay un límite en el proceso (120 avisos por minuto por IP, 300 si no hay IP de confianza) además de la firma.

`TENANT_CREDENCIALES_GLOBALES` (por defecto el slug `gisel`) es el único que puede usar el Mercado Pago y el Gmail del `.env` si el salón todavía no cargó los suyos. El resto no cobra ni manda email con esas credenciales. El email, cuando sale, usa la marca de ese tenant (nombre, colores, logo, idioma), no una plantilla fija.

El modo de pago (sin anticipo, seña o total) lo elige el salón en Horarios y reglas. Un salón nuevo arranca en “sin pago anticipado”.

## 5. Google Calendar

También es la cuenta del salón.

1. En Google Cloud del salón, una pantalla de consentimiento y un cliente OAuth de tipo aplicación web.
2. URI de redirección autorizada: `https://<slug>.<PLATFORM_DOMAIN>/api/auth/google/callback`.
3. En Conexiones, cargar el client id y el client secret, y conectar Calendar. El refresh token se guarda cifrado y no se muestra.
4. El callback exige sesión del panel, el `state` firmado con `MFA_SECRET` y un límite de intentos.

Sin Calendar el sitio sigue: el turno se confirma igual y no se crea el evento.

## 6. Dominio

Hoy el direccionamiento es por subdominio del dominio de la plataforma. No hay un dominio propio distinto por salón, salvo este atajo de un solo tenant: si el host no es `PLATFORM_DOMAIN` ni un subdominio, y existe `TENANT_POR_DEFECTO` con un slug válido, todo ese host se trata como ese único salón. Sirve para apuntar un dominio suelto (CNAME al servicio) mientras haya un solo cliente con dominio propio. Con dos dominios propios a la vez, este mecanismo no alcanza: haría falta resolver el host contra una tabla, y eso no está hecho.

El crédito “Sitio creado por Certea” (enlace a https://certea.com.br) lo prende cada salón en el panel, en Horarios y reglas → Pie del sitio. Nace apagado y no lleva nombre de persona.

## 7. Qué revisar antes de abrir el salón

- Módulos que correspondan (turnos, cursos, sobre mí, testimonios, galería, preguntas, WhatsApp).
- Textos, logo y colores desde el panel. El logo se sube al bucket; no se reutilizan los archivos de `public/tenants/gisel/`.
- Horario, reglas y modo de pago.
- Un turno de prueba y, si cobra online, un pago de prueba con la cuenta de Mercado Pago del salón.
- Usuario del salón con el segundo factor.
