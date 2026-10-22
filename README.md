# Turnos online

Plataforma multi-tenant para el sitio de un salón: landing, turnos con seña, cursos y panel de cada cliente. Cada salón es un subdominio. El primero que existió (Gisel) no está metido en el código: sus datos van en [`supabase/seeds/gisel.sql`](supabase/seeds/gisel.sql) y un demo ficticio en [`supabase/seeds/demo.sql`](supabase/seeds/demo.sql).

## Stack

Next.js (App Router) + TypeScript · Tailwind CSS · Supabase (Postgres/Auth/Storage) · Mercado Pago · Google Calendar · email por SMTP.

## Alta de un salón

La guía para crear un tenant a mano (subdominio, Supabase, Mercado Pago a nombre del salón, Google Calendar y dominio) está en [docs/alta-de-tenant.md](docs/alta-de-tenant.md).

Borradores legales para Argentina (Ley 25.326), no son asesoramiento:

- [docs/legal/terminos-borrador.md](docs/legal/terminos-borrador.md)
- [docs/legal/privacidad-borrador.md](docs/legal/privacidad-borrador.md)

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar con las credenciales (nunca commitear)
npm run dev                  # http://<slug>.localhost:3000
npm test
npm run lint
npm run test:aislamiento     # aislamiento entre tenants contra la base real
npm run migrar -- supabase/migrations/<archivo>.sql
```

Después de las migraciones, si hace falta un salón de ejemplo:

```bash
npm run migrar -- supabase/seeds/demo.sql
npm run migrar -- supabase/seeds/gisel.sql   # solo en la base de ese salón
```

## Docker

Requiere `.env.local` completo (se usa en el build para las `NEXT_PUBLIC_*` y en runtime para los secretos; no se copia a la imagen).

```bash
docker compose up -d --build   # http://<slug>.localhost:3000
docker compose logs -f
docker compose down
```

Si cambia alguna `NEXT_PUBLIC_*`, hay que volver a construir la imagen (`--build`).

## Crons

Los dispara Supabase (pg_cron + pg_net), no Vercel: ver [supabase/migrations/0006_cron_jobs.sql](supabase/migrations/0006_cron_jobs.sql).
Liberar turnos sin pagar cada 5 min y recordatorios (48h, 24h, 2h) cada 10 min. Requiere que el sitio tenga URL pública.

## Seguridad

Los secretos van **solo** en `.env.local` (gitignoreado). Nunca se commitean ni se comparten en texto plano.

El paquete es privado (`"private": true`, `"license": "UNLICENSED"`). El texto de la licencia está en [LICENSE](LICENSE).
