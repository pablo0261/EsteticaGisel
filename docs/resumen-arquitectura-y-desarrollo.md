    # Estética y Salud Gisel Bigurrarena — Resumen técnico y funcional

    **Propósito de este documento:** describir de forma completa y verificable la arquitectura, el alcance funcional y la calidad de ingeniería de este proyecto, para que un evaluador (humano o IA) pueda compararlo con productos equivalentes del mercado y estimar el valor de un servicio de desarrollo y mantenimiento similar. Este documento **no incluye una valuación propia** — solo los datos de entrada para que quien lo lea pueda hacerla.

    Repositorio: `github.com/pablo0261/EsteticaGisel` (privado). Stack 100% propio (no-code cero, sin plantillas SaaS de terceros).

    ---

    ## 1. Contexto de negocio

    Sitio web para un centro de estética **unipersonal** en Argentina (Gisel Bigurrarena). La dueña trabaja sola: atiende, hace los tratamientos, graba los cursos y gestiona todo. El sitio resuelve dos problemas de negocio reales, hoy manejados a mano por WhatsApp:

    1. **Reservas de turnos con seña**, sin intervención manual de la dueña.
    2. **Venta de cursos en video** (para profesionales del rubro y público general) con acceso pago temporal y entrega automática, sin envío manual de archivos.

    Todo el negocio se administra desde un panel propio (sin código, sin infraestructura visible) para una usuaria no técnica.

    ---

    ## 2. Alcance funcional completo

    ### 2.1 Landing pública
    - Diseño de marca extraído del logo real de la clienta (paleta, tipografía, monograma como favicon).
    - Secciones: Hero, Servicios (con precios reales desde base de datos, con fallback a datos semilla si la base no responde), Sobre mí, Testimonios, Redes sociales, CTA de WhatsApp, Footer.
    - Totalmente responsive (mobile-first), navegación con efecto de scroll y menú mobile.
    - Feedback de interacción global (cursor, estados de click) en todo el sitio.

    ### 2.2 Sistema de turnos
    - **Motor de disponibilidad propio** (lógica pura, sin dependencias externas): calcula horarios libres respetando horario de atención configurable por día, duración de servicio(s), margen de preparación entre turnos y turnos ya ocupados.
    - **Reserva multi-servicio**: el cliente puede elegir uno o más servicios en la misma reserva; si elige más de uno, el sistema calcula automáticamente horarios donde ambos turnos entran **consecutivos** (sin hueco), y avisa que para horarios separados debe hacer reservas independientes.
    - **Bloqueo temporal de 15 minutos** por reserva pendiente de pago, con liberación automática (vía cron) y exclusión inmediata de la disponibilidad (no depende del cron para ser seguro — la exclusión ocurre en el momento de calcular disponibilidad).
    - **Pago real vía Mercado Pago Checkout Pro**: creación de preferencia de pago, redirect al checkout hospedado de Mercado Pago.
    - **Webhook de confirmación de pago** que nunca confía en el payload recibido: verifica la firma HMAC (con tests dedicados) y **siempre reconsulta el estado real del pago contra la API de Mercado Pago** antes de confirmar nada. Es idempotente (soporta reintentos de notificación sin duplicar turnos).
    - **Sincronización con Google Calendar** (OAuth2 completo, con flujo de autorización propio que genera y muestra el refresh token): crea el evento con el cliente como invitado al confirmarse el pago, lo borra al cancelar/reprogramar.
    - **Emails transaccionales** (confirmación, recordatorio, cancelación) con plantillas HTML de diseño propio (tabla compatible con clientes de correo, logo, colores de marca, botones).
    - **Autogestión del cliente** vía link con token no adivinable (UUID v4): cancelar o reprogramar el propio turno, respetando un mínimo de horas de anticipación configurable por la dueña. Fuera de ese plazo, se indica contactar directamente.
    - **Recordatorio automático configurable** (cron horario) con ventana de anticipación ajustable desde el panel.
    - **Rate limiting anti-abuso**: máximo de reservas exitosas por hora por IP, con mensaje claro al superarlo — previene que un script bloquee todos los horarios sin pagar nunca.

    ### 2.3 Cursos online
    - **Catálogo público** con precio dinámico (soporta oferta con ventana de fechas de inicio/fin).
    - **Compra vía Mercado Pago** (mismo webhook que turnos, con la misma garantía de verificación + idempotencia).
    - **Acceso privado por link con token**, con expiración automática configurable por curso (días de acceso).
    - **Video servido con URL firmada de expiración corta, regenerada en cada visita** — nunca hay una URL pública permanente al archivo. Arquitectura desacoplada de video (interfaz `VideoProvider`) para poder migrar a un proveedor de streaming dedicado (Bunny, Cloudinary, Mux) sin reescribir el resto de la aplicación.
    - **Descargas adicionales** (PDF/PPT) con el mismo esquema de URL firmada.
    - **Toggle de permitir/prohibir descarga del video** por curso (streaming-only vs. descargable).
    - **Panel de administración de cursos completo**: alta con video opcional en el mismo paso, edición de todos los campos (categoría, precio, oferta, días de acceso, estado borrador/publicado), gestión de archivos adicionales, vista de compras por curso (quién compró, cuándo, vigente o vencido).
    - **Límites de subida** ajustados al plan gratuito de la base de datos utilizada en esta etapa (150MB por video, 20MB por archivo adicional), con aviso explicativo en el panel sobre el formato recomendado (MP4/H.264) y la posibilidad de migrar a otro almacenamiento si el contenido crece.

    ### 2.4 Panel de administración
    - Autenticación propia (Supabase Auth), acceso único, contraseña fuerte generada aleatoriamente.
    - CRUD de servicios (nombre, duración, precio, orden, activo/inactivo).
    - Configuración de negocio editable sin tocar código: horas mínimas de cancelación, horas de anticipación del recordatorio, minutos de preparación entre turnos, porcentaje de seña, horario de atención por día de la semana (o marcarlo cerrado).
    - Listado y gestión de turnos (ver todos, cancelar desde el panel, marcar como completado).
    - CRUD completo de cursos (ver 2.3).
    - Feedback visual de carga (overlay de marca) en **todas** las acciones de guardado/subida del panel y del sitio público, no solo indicadores de texto.
    - Manejo de errores con pantalla propia (no la genérica de Next.js) mostrando el mensaje real al usuario.

    ---

    ## 3. Arquitectura técnica

    ### 3.1 Stack
    - **Framework:** Next.js 16 (App Router), React 19, TypeScript.
    - **Estilos:** Tailwind CSS v4, sistema de diseño de marca propio (tokens de color/tipografía).
    - **Base de datos / Auth / Storage:** Supabase (Postgres administrado, Auth propio, Storage de objetos).
    - **Pagos:** Mercado Pago Checkout Pro (API REST directa, sin SDK de terceros).
    - **Calendario:** Google Calendar API v3 (OAuth2, API REST directa).
    - **Email:** Resend (API REST directa).
    - **Testing:** Vitest.
    - **Hosting objetivo:** Vercel (Next.js nativo, sin contenedores).

    Dependencias de producción externas al framework: solo `@supabase/supabase-js` y `@supabase/ssr`. El resto de las integraciones (Mercado Pago, Google Calendar, Resend) están implementadas contra sus APIs REST directamente, sin SDKs de terceros — menos superficie de dependencias, más control.

    ### 3.2 Patrones de diseño relevantes
    - **Server Actions** de Next.js para toda mutación (sin API REST propia intermedia salvo webhooks/crons/OAuth), con protección CSRF nativa del framework.
    - **Row Level Security (RLS)** en las 8 tablas de la base: solo `servicios` activos y `cursos` publicados son legibles públicamente; todo lo demás (turnos, pagos, accesos, configuración) es inaccesible salvo por el backend con clave de servicio.
    - **Capability URLs** (tokens UUID v4 no adivinables) para autogestión de turnos y acceso a cursos comprados, sin requerir cuentas de usuario para los clientes finales.
    - **Adaptador de proveedor de video** (`VideoProvider`) — un único punto de cambio para migrar de almacenamiento a un CDN de streaming dedicado sin tocar el resto del código.
    - **Verificación de doble capa en pagos**: firma criptográfica del webhook + reconsulta del estado real contra la API del proveedor de pago (nunca se confía en el payload recibido).
    - **Autenticación siempre revalidada contra el servidor** (`getUser()`, nunca `getSession()`), evitando el vector clásico de spoofing de cookies de sesión.

    ### 3.3 Modelo de datos
    8 tablas: `servicios`, `configuracion_negocio`, `turnos`, `cursos`, `archivos_curso`, `accesos_curso`, `pagos`, `intentos_reserva` (rate limiting). Modelo preparado para agregar facturación electrónica en el futuro sin romper nada (campos reservados en `pagos`).

    ### 3.4 Integraciones externas activas
    | Integración | Uso | Estado |
    |---|---|---|
    | Mercado Pago Checkout Pro | Cobro de seña de turnos y compra de cursos | Funcional, credenciales de prueba (pendiente swap a producción) |
    | Google Calendar API | Sincronización de turnos confirmados | Código completo, pendiente credenciales OAuth reales |
    | Resend | Emails transaccionales | Funcional, pendiente verificar dominio propio para envío masivo |
    | Supabase Storage | Video y archivos de cursos | Funcional, verificado en producción real (buckets privados) |

    ---

    ## 4. Calidad de ingeniería (evidencia objetiva)

    - **Desarrollo guiado por tests (TDD)** en toda la lógica de negocio pura: motor de disponibilidad, cálculo de zona horaria Argentina, reglas de cancelación/seña/rate-limit, verificación de firma de webhook, reglas de precio con oferta y expiración de acceso de cursos, construcción de horario de atención.
    - **47 tests unitarios** (Vitest), 9 archivos de test, ~470 líneas de tests — cubren la lógica de negocio crítica, no solo happy-paths.
    - **Verificación continua contra infraestructura real**, no solo mocks: decenas de pruebas end-to-end ejecutadas contra el proyecto real de Supabase durante el desarrollo (creación de preferencias reales en Mercado Pago, envío real de emails vía Resend, subida y descarga real de archivos con URLs firmadas, simulación de webhooks de pago con datos reales, verificación de bloqueo/liberación de horarios).
    - **Auditoría de seguridad completa realizada antes del primer despliegue**, cubriendo: fuga de secretos en todo el historial de git (ninguna encontrada), políticas RLS de las 8 tablas, autorización de las 18 funciones de mutación del panel de administración, XSS, SQL injection, CSRF, headers HTTP de seguridad (agregados: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), validación de límites de subida de archivos, superficie de abuso/DoS en endpoints públicos.
    - **Higiene de repositorio**: cero secretos commiteados en ningún momento del historial (verificado por auditoría completa, no por confianza), `.env` siempre fuera de control de versiones.

    ---

    ## 5. Métricas objetivas del repositorio

    | Métrica | Valor |
    |---|---|
    | Commits | 47 |
    | Archivos de código (`.ts`/`.tsx`) | 91 |
    | Líneas de código de aplicación | ~5.021 |
    | Archivos de test | 9 |
    | Líneas de test | ~470 |
    | Tests unitarios | 47 |
    | Migraciones de base de datos versionadas | 4 |
    | Rutas/páginas de la aplicación | 21 |
    | Tablas de base de datos | 8 |
    | Integraciones externas activas | 4 (Supabase, Mercado Pago, Google Calendar, Resend) |
    | Rango de fechas de desarrollo | 2026-07-06 a 2026-07-11 |

    *(Nota: el rango de fechas refleja los timestamps de commits, no necesariamente horas-persona reales — el desarrollo se realizó con asistencia de IA de forma intensiva, lo cual no es equivalente a horas de desarrollo manual tradicional. No se incluye una estimación de horas por no ser un dato medible de forma confiable en este contexto.)*

    ---

    ## 6. Estado actual / pendientes para producción real

    Completado y verificado en código y contra infraestructura real:
    - Los 4 módulos funcionales completos (landing, turnos, cursos, admin).
    - Seguridad revisada y endurecida.
    - Repositorio en GitHub, listo para desplegar.

    Pendiente, no por limitación técnica sino por decisiones/credenciales que dependen de la clienta o de terceros:
    - Credenciales de producción de Mercado Pago (hoy en modo prueba).
    - Client ID/Secret de Google Cloud para Calendar (la clienta o el desarrollador debe crear el proyecto OAuth).
    - Verificación de dominio propio en Resend (para enviar a clientes reales, no solo a la casilla del desarrollador).
    - Registro de dominio propio (`.com.ar`, vía NIC Argentina) — opcional, el hosting funciona igual sin él.
    - Decisión de plan de hosting: Vercel Hobby (gratis, solo para demo/desarrollo — sus términos de servicio prohíben uso comercial) vs. Vercel Pro (~US$20/mes, requerido para uso comercial real y para ejecutar tareas programadas con la frecuencia que el negocio necesita).
    - Contenido real de la clienta: textos definitivos, fotos/videos propios, cursos reales cargados.

    ---

    ## 7. Contexto de mercado para comparación

    Este producto combina, en un desarrollo a medida integrado en un solo sitio de marca propia, capacidades que en el mercado suelen venderse por separado como SaaS de terceros:

    - **Sistemas de reserva de turnos con seña/pago online**: categoría ocupada por productos como Calendly (con pagos), Acuity Scheduling, Booksy, Fresha, SimplyBook.me.
    - **Plataformas de venta de cursos en video con acceso temporal**: categoría ocupada por Hotmart, Teachable, Thinkific, Podia.

    La diferencia estructural frente a esas alternativas SaaS: este desarrollo **no depende de una plataforma de terceros ni de sus comisiones por transacción o suscripción mensual de plataforma** (más allá de las comisiones propias de Mercado Pago por cobro, inherentes a cualquier medio de pago). El costo de infraestructura propio, una vez en producción, es de aproximadamente **US$20/mes fijos** (hosting) más comisión variable de Mercado Pago por venta — sin mensualidad de plataforma de terceros, y con la marca, el dominio y los datos completamente bajo control de la clienta.

    Para una estimación de valor de venta de un servicio de desarrollo y mantenimiento equivalente, un evaluador debería considerar: (a) el costo de las alternativas SaaS combinadas (suscripción de un sistema de reservas + suscripción de una plataforma de cursos, mes a mes, de forma indefinida) versus (b) el costo de un desarrollo a medida único más un mantenimiento continuo menor, dado el alcance funcional, la cobertura de tests y la auditoría de seguridad ya documentadas en este informe.
