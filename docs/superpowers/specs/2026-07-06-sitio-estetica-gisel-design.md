# Diseño — Sitio web Estética y Salud Gisel Bigurrarena

**Fecha:** 2026-07-06
**Estado:** Aprobado (arranca Fase 0 + Fase 1)

## 1. Contexto y objetivos

Centro de estética unipersonal en Argentina. Gisel trabaja sola. El sitio resuelve dos problemas reales:

1. **Turnos:** hoy los gestiona por WhatsApp a mano. Quiere reservas automáticas con seña.
2. **Cursos online:** vender cursos de estética en video, con acceso pago y automático, sin envío manual.

Todo debe operarse desde un panel de admin propio, en español (Argentina), moneda ARS, mobile-first, sin que Gisel toque código ni infraestructura.

## 2. Alcance del MVP

**Incluye:**
- Landing pública con identidad de marca (logo + fotos), servicios con precios, "Sobre mí", testimonios, redes, CTA WhatsApp.
- Sistema de turnos: reserva → seña (50%) → confirmación → sync Google Calendar + email → recordatorio configurable → cancelación/reprogramación.
- Catálogo de 4 cursos demo: compra → acceso temporal → video protegido + descargas firmadas → expiración.
- Panel de admin: CRUD servicios y cursos, configuración de negocio.

**No incluye (fuera de alcance ahora):**
- Facturación electrónica (Gisel es monotributista sin FE activa). El modelo de datos queda **preparado** para agregarla sin romper nada.
- Reembolsos de seña (no hay lógica de reembolso; la seña no se devuelve).
- Catálogo completo de 16 cursos (se cargan luego desde el admin).

## 3. Stack técnico

| Capa | Elección |
|---|---|
| Frontend + Backend | Next.js (App Router) + TypeScript |
| Estilos | Tailwind CSS (mobile-first, tokens de marca) |
| DB / Auth / Storage | Supabase (Postgres + Auth + Storage) |
| Pagos | Mercado Pago Checkout Pro + webhook verificado |
| Video | Supabase Storage (bucket privado + signed URLs) detrás de adaptador `VideoProvider` |
| Calendario | Google Calendar API (OAuth2 + refresh token) |
| Email | Resend |
| Jobs programados | Endpoint seguro `/api/cron/*` disparado por Supabase pg_cron (o Vercel Cron en prod) |
| Hosting | Vercel Pro (Next.js nativo, sin Docker) o Render Starter — se decide en Fase 5 |
| Gestor de paquetes | npm |

**Decisión Bunny → Supabase Storage:** Bunny Stream es pago (free solo 14 días). Como ya usamos Supabase, servimos video y documentos desde un **bucket privado** con **signed URLs de expiración corta** (modelo exacto que pide el prompt). No hay transcodificación ni streaming adaptativo, y el egress gratis es chico (≈1 GB storage + pocos GB/mes) — suficiente para 4 cursos demo. La capa de video vive detrás de un adaptador `VideoProvider`, así se cambia a Bunny/Cloudinary/Mux para escala tocando un solo archivo.

## 4. Arquitectura

```
app/
  (public)/            → landing y páginas públicas
  admin/               → panel protegido (Supabase Auth)
  cursos/              → catálogo + acceso privado
  turnos/              → flujo de reserva
  api/
    webhooks/mercadopago/   → confirma pagos (firma + reconsulta)
    cron/                   → liberar turnos vencidos, recordatorios
    auth/google/callback/   → OAuth Google Calendar
components/             → design system + UI reutilizable
lib/
  supabase/            → clientes (browser, server, service-role)
  mercadopago/         → preferencias + verificación de pagos
  google-calendar/     → crear/borrar eventos
  email/               → plantillas + envío (Resend)
  video/               → adaptador VideoProvider (impl. Supabase Storage)
  turnos/              → lógica pura: slots disponibles, transiciones de estado
  cursos/              → lógica pura: expiración de accesos, ofertas
supabase/migrations/   → SQL versionado (se aplica con `supabase db push`)
styles/                → tokens de marca (Tailwind config)
public/brand/          → logo (variantes de color) + assets
```

Cada integración vive aislada en `lib/` detrás de una interfaz clara: se testea y se cambia sin tocar el resto.

## 5. Sistema de diseño (desde el logo)

**Paleta (hex iniciales, a afinar contra los assets reales):**
- `mauve` (primario): `#C0899A`
- `sage` (acento): `#4E5340`
- `cream` (fondo): `#F6F1EA`
- `ink` (tipografía): `#1A1A1A`
- neutros derivados (bordes, muted) por escala.

**Tipografía (Google Fonts, gratis):**
- Títulos: serif editorial de alto contraste (**Cormorant Garamond**), que imita el wordmark del logo.
- Cuerpo y caps espaciados ("ESTÉTICA Y SALUD"): sans limpia (**Jost** / **Montserrat**).

**Logo:** se usan las variantes de color entregadas (negro, mauve, blanco, sage) según el fondo. Los archivos deben copiarse a `public/brand/`.

**Tono:** minimalista, cálido, profesional. Mucho espacio en blanco. Nada de "spa genérico" turquesa/violeta.

## 6. Modelo de datos (Postgres, snake_case)

```
servicios
  id, nombre, descripcion, duracion_minutos, precio, activo, orden, creado_en

configuracion_negocio  (fila única)
  id, horas_minimas_cancelacion (default 24),
  horas_anticipacion_recordatorio (default 24),
  minutos_preparacion_entre_turnos (default 15),
  horario_atencion (jsonb: días/horas), sena_porcentaje (default 50)

turnos
  id, servicio_id (fk), cliente_nombre, cliente_email, cliente_telefono,
  fecha_hora, duracion_minutos, estado (pendiente_pago|confirmado|cancelado|completado),
  monto_sena, google_calendar_event_id, bloqueado_hasta, creado_en, actualizado_en

cursos
  id, titulo, descripcion, categoria (profesional|publico_general),
  video_storage_path, permitir_descarga, dias_acceso,
  precio, precio_oferta, oferta_activa, oferta_desde, oferta_hasta,
  estado (borrador|publicado), orden, creado_en

archivos_curso
  id, curso_id (fk), nombre_archivo, storage_path, tipo (pdf|pptx|otro), creado_en

accesos_curso
  id, curso_id (fk), cliente_email, comprado_en, expira_en, mp_payment_id, creado_en

pagos
  id, tipo (turno|curso), referencia_id, mp_preference_id, mp_payment_id,
  estado, monto, creado_en

  -- campos preparados para facturación electrónica futura (sin usar aún):
  -- factura_tipo, factura_numero, factura_cae, facturado_en (nullable)
```

RLS activo: lectura pública solo de datos públicos (servicios activos, cursos publicados); escritura y datos sensibles solo vía service-role en el backend o para el admin autenticado.

## 7. Integraciones — reglas clave

**Mercado Pago:** Checkout Pro para turnos y cursos. Preferencia con `external_reference = tipo:referencia_id`. Webhook `/api/webhooks/mercadopago` que (1) **verifica la firma**, (2) **reconsulta el pago por su id contra la API de MP**, (3) actualiza turno/acceso. **Nunca** se desbloquea nada desde el `back_url` del redirect — solo el webhook confirma.

**Google Calendar:** OAuth2 con refresh token almacenado seguro. Al confirmar turno: crear evento con el cliente como asistente y `sendUpdates: 'all'`. Al cancelar: borrar el evento.

**Video / Storage:** bucket privado. Reproducción con signed URL de expiración corta, regenerada en cada visita mientras el acceso siga vigente. Descargas (video si `permitir_descarga`, y PDFs/PPT) también con URL firmada, nunca permanente.

**Email (Resend):** confirmación de turno, recordatorio (anticipación configurable), confirmación de compra de curso con acceso. El email es responsabilidad del backend propio (no depende de que el cliente acepte la invitación de Calendar).

**Jobs:** (1) liberar turnos `pendiente_pago` cuyo `bloqueado_hasta` venció (15 min); (2) enviar recordatorios a turnos `confirmado` dentro de la ventana configurable. Endpoint protegido por secreto, disparado por cron.

## 8. Flujos

**Turno:** elegir servicio → ver slots disponibles (calculados contra Calendar + duración + margen) → crear turno `pendiente_pago` (bloquea 15 min) → Checkout Pro por 50% de seña → webhook confirma → `confirmado` → crea evento Calendar + email → si no paga en 15 min, se libera.

**Cancelación/reprogramación:** configurable (horas mínimas de anticipación, default 24). Dentro del plazo: cancela, libera horario, borra evento Calendar; **la seña no se devuelve**. Reprogramación: elige nuevo horario manteniendo la seña. Fuera del plazo: no hay autogestión, se muestra mensaje para contactar a Gisel.

**Curso:** elegir curso → Checkout Pro → webhook confirma → crea acceso con `expira_en = ahora + dias_acceso` → página privada con video firmado + descargas firmadas → al expirar, muestra acceso vencido y ofrece recomprar.

## 9. Roadmap por fases

Cada fase = su propio ciclo spec → plan → build → verificación.

| Fase | Entrega | Depende de |
|---|---|---|
| **0 · Fundaciones** | Scaffold Next.js+TS+Tailwind corriendo en localhost, design system, wiring Supabase, `.env.example`, migraciones base | nada |
| **1 · Landing pública** | Hero, Sobre mí, Servicios con precios, Testimonios, Redes, CTA WhatsApp, footer. Mobile-first, demoable | nada (placeholders de contenido) |
| **2 · Admin + Auth + Config** | Login Gisel, CRUD servicios, configuración de negocio | Supabase |
| **3 · Turnos** | Reserva → seña → webhook → Calendar + email; timeout; cancel/reprogram; recordatorio | MP test, Google Client ID |
| **4 · Cursos** | Admin CRUD (upload a Storage, oferta, días acceso, borrador/publicado) + catálogo + compra + acceso temporal + video/descargas firmadas | MP test |
| **5 · Deploy** | Hosting + dominio + crons prod + credenciales reales de Gisel + verificación de dominio de email | cuentas reales |

**Arranca Fase 0 + Fase 1** (sin dependencias de credenciales).

### Detalle Fase 0
- `create-next-app` (App Router, TS, Tailwind, ESLint).
- Tokens de marca en Tailwind + fuentes (next/font).
- Clientes Supabase (browser / server / service-role) leyendo `.env`.
- `.env.example` con todas las variables documentadas; `.env.local` gitignoreado.
- Migración inicial con todas las tablas + RLS + seed de servicios y `configuracion_negocio`.
- Layout base + página home placeholder + componentes base del design system (botón, contenedor, tipografía).
- Verificación: `npm run dev` levanta, home renderiza con marca, `npm run build` pasa.

### Detalle Fase 1
- Secciones: Hero, Sobre mí, Servicios (con precios desde DB o seed), Testimonios, Redes/Instagram, CTA WhatsApp, Footer.
- Responsive mobile-first, imágenes optimizadas (next/image).
- Contenido con placeholders hasta recibir textos/fotos reales.
- Verificación: navegación fluida en mobile y desktop; Lighthouse razonable; `npm run build` pasa.

## 10. Requisitos no funcionales
- Español (Argentina), ARS.
- Mobile-first.
- Admin protegido por Supabase Auth (acceso único de Gisel).
- Ningún archivo (video/documento) accesible por URL pública permanente — todo con expiración.
- Secretos solo en `.env` (gitignoreado), nunca en el repo ni en el chat.

## 11. Inventario de credenciales / prerequisitos

| Ítem | Provee | Estado |
|---|---|---|
| Supabase URL + publishable key | Pablo | ✅ recibido |
| Supabase service_role key | Pablo → `.env` | ⏳ |
| Supabase DB (migraciones) | Pablo corre `supabase db push` | ✅ flujo acordado |
| Resend API key | Pablo → `.env` (rotada) | ⏳ |
| Vercel proyecto | Pablo | ✅ recibido |
| Google OAuth Client ID + Secret | Pablo (Google Cloud) | ⏳ en proceso |
| Google refresh token | Gisel autoriza vía link (Fase 3) | 🕒 |
| Mercado Pago TEST (Access Token + Public Key) | Pablo | ⏳ en proceso |
| Dominio `.com.ar` | Gisel (nic.ar, CUIT) | 🕒 después |
| Contenido (precios, textos, fotos, 4 cursos) | Gisel | 🕒 placeholders por ahora |
| Logo files en `public/brand/` | Pablo copia los assets | ⏳ |

**Regla de seguridad:** nunca contraseñas de cuentas — solo API keys/tokens revocables y flujos OAuth donde la persona autoriza. Secretos al `.env`, no al chat.

## 12. Testing y verificación
- Lógica de negocio pura testeada (cálculo de slots, expiración de accesos, transiciones de estado, ofertas).
- Integraciones detrás de adaptadores mockeables.
- Verificación end-to-end por fase antes de cerrarla (levantar la app y ejercitar el flujo, no solo tests).

## 13. Riesgos / decisiones abiertas
- Egress de video en free tier de Supabase: OK para demo, insuficiente para escala → swap de `VideoProvider` a CDN pago cuando haga falta.
- Duración variable de manicuría (algunos servicios 2h): se modela `duracion_minutos` por servicio.
- `EMAIL_FROM`: hasta verificar dominio, Resend solo envía a la propia casilla del dueño desde `onboarding@resend.dev` (suficiente para test).
- Hosting/cron definitivo (Vercel Pro vs Render): se decide en Fase 5.
