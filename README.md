# Estética y Salud — Gisel Bigurrarena

Sitio web del centro de estética de Gisel Bigurrarena (Argentina): landing pública, sistema de turnos con seña, y cursos online con acceso pago.

## Stack

Next.js (App Router) + TypeScript · Tailwind CSS · Supabase (Postgres/Auth/Storage) · Mercado Pago · Google Calendar · Resend.

## Estado

En desarrollo por fases. Ver el diseño y el roadmap en
[docs/superpowers/specs/2026-07-06-sitio-estetica-gisel-design.md](docs/superpowers/specs/2026-07-06-sitio-estetica-gisel-design.md).

- **Fase 0 — Fundaciones:** scaffold + sistema de diseño + wiring Supabase.
- **Fase 1 — Landing pública.**
- Fases 2–5: admin, turnos, cursos, deploy.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar con las credenciales (nunca commitear)
npm run dev                  # http://gisel.localhost:3000 (cada cliente es un subdominio)
npm test                     # tests unitarios
npm run test:aislamiento     # aislamiento entre tenants contra la base real
npm run migrar -- supabase/migrations/<archivo>.sql
```

## Docker

Requiere `.env.local` completo (se usa en el build para las `NEXT_PUBLIC_*` y en runtime para los secretos; no se copia a la imagen).

```bash
docker compose up -d --build   # http://localhost:3000
docker compose logs -f
docker compose down
```

Si cambia alguna `NEXT_PUBLIC_*`, hay que volver a construir la imagen (`--build`).

## Crons

Los dispara Supabase (pg_cron + pg_net), no Vercel: ver [supabase/migrations/0006_cron_jobs.sql](supabase/migrations/0006_cron_jobs.sql).
Liberar turnos sin pagar cada 5 min y recordatorios (48h, 24h, 2h) cada 10 min. Requiere que el sitio tenga URL pública.

## Seguridad

Los secretos van **solo** en `.env.local` (gitignoreado). Nunca se commitean ni se comparten en texto plano.
