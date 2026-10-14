# Etapa C2b — Cursos del panel con subida directa a Storage y favicon por cliente: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** la sección Cursos del panel del cliente queda traducida (es/pt) y validada en el servidor, y los videos y materiales de los cursos se suben **directo del navegador a Storage** con URLs de subida firmadas (sin pasar por el cuerpo de una server action, limitado a 3 MB). El límite que muestra la pantalla es el real (50 MB por video, 20 MB por material) y lo exige también el bucket. Borrar un curso con compras da un error claro (hoy no hace nada en silencio) y borrar uno sin compras borra también sus archivos de Storage. El sitio y el panel de cada cliente usan su logo como favicon.

**Arquitectura:**
- **Reglas puras con tests:** tipos de subida, buckets, límites, Content-Type por extensión, paths firmados y su verificación (`src/lib/cursos/subidas.ts`); validación de los formularios de cursos con lista blanca (`src/lib/panel/formularios.ts`); íconos de la marca (`src/lib/tenant/iconos.ts`).
- **Storage:** los buckets privados `cursos-videos` y `cursos-archivos` pasan a tener límite de tamaño y tipos permitidos (`scripts/setup-storage.mjs`, idempotente). Siguen sin policies: solo la service role firma subidas y lecturas.
- **Servidor:** `src/lib/storage/subidas.ts` (firmar, leer el objeto subido, borrar) y dos server actions nuevas en `src/app/admin/cursos/subidas.ts`: `pedirSubida` (valida, arma el path `{tenant_id}/{curso_id}/{tipo}-{ms}-{16 hex}.{ext}` y firma) y `registrarSubida` (verifica que el path sea el que firmó, que el objeto exista con tamaño y tipo válidos, y lo guarda en el curso).
- **Navegador:** `src/components/panel/SubidaDirecta.tsx` pide la subida, sube con `uploadToSignedUrl` de `@supabase/supabase-js` y la publishable key (sin sesión), y registra.

**Stack:** Next.js 16 (server actions llamadas desde un componente de cliente, `generateMetadata` con `icons`), Supabase Storage (`createSignedUploadUrl`, `uploadToSignedUrl`, `list`), Tailwind 4, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-11-plataforma-multitenant-design.md](../specs/2026-10-11-plataforma-multitenant-design.md), secciones 4.2 (Storage de cursos por tenant), 7 (panel del cliente: cursos), 8 (idioma y marca) y la fila C de la 14.
**Plan anterior:** [2026-10-14-etapa-c2a-panel-cliente.md](2026-10-14-etapa-c2a-panel-cliente.md) (**tiene que estar terminado**: este plan usa `tenantDeSeccion`, `tenantDeAccion`, `ir`, `revalidarSitio`, `metadataDelPanel`, `src/components/panel/ui.tsx`, los parsers y los mensajes del panel, y extiende `scripts/e2e-cliente.mjs`).

---

## Alcance y decisiones

**Incluido en C2b:**

- Cursos del panel (lista, alta, edición, materiales, compras, borrado) en el idioma del cliente, con validación en el servidor y mensajes por clave.
- Subida directa de videos y materiales a Storage con URLs firmadas; el servidor verifica el objeto antes de registrarlo; reemplazar el video borra el anterior; borrar un material o un curso borra sus objetos.
- Buckets de cursos con límite y tipos permitidos; aislamiento extendido (nadie sube sin firma; un token firma un solo path).
- Borrar un curso con compras: error claro.
- Favicon por cliente (sitio y panel) con su logo.

**Fuera de C2b:** limpieza periódica de objetos huérfanos (subidas firmadas que nunca se registraron: etapa E, crons), subidas reanudables (TUS) para videos de más de 50 MB, y lo que ya estaba fuera de C2 (Mercado Pago OAuth, Calendar y Gmail por cliente, plantillas de emails: etapa D).

**Decisiones ya tomadas (no se reabren):**

1. Panel del cliente traducido, secciones por módulo también en el servidor (hecho en C2a; acá se completa Cursos).
2. El cliente edita cursos (lista blanca en el servidor).
5. Videos y archivos de los cursos se suben directo del navegador a Storage con URLs firmadas: la action verifica `tenantDelAdmin` y el módulo cursos y crea `createSignedUploadUrl` para `{tenant_id}/{curso_id}/...`; el navegador sube con `uploadToSignedUrl` de `@supabase/supabase-js` y la publishable key (se verifica que funcione con los buckets privados y sin policies); una segunda action registra el path después de verificar que el objeto existe y su tamaño y tipo. El texto engañoso de "150MB" se saca o se vuelve cierto. `bodySizeLimit` queda en 3 MB.
6. Pendientes: borrar un curso con accesos da un error claro; favicon por cliente con `generateMetadata` `icons` y el logo del cliente cuando tiene.
8. Pruebas: tests unitarios de las reglas de paths de subida; aislamiento extendido; la E2E sube un archivo chico con la subida firmada; regresión de las E2E y del aislamiento.
9. Git y proceso: igual que C2a (un commit por task, rutas explícitas, nunca `docs/resumen-arquitectura-y-desarrollo.md` ni `.env.local`, reglas del servidor de desarrollo).

**Decisiones tomadas al planificar C2b:**

1. **Límite real: 50 MB por video, 20 MB por material.** 50 MB es el máximo por archivo del plan Free de Supabase para una subida estándar (un solo `PUT`, que es lo que hace `uploadToSignedUrl`). El "150MB" de hoy era falso por partida doble: la action tenía un límite de cuerpo de 3 MB y el plan no acepta más de 50 MB. Se fija en el código (`LIMITE_SUBIDA`), en el texto de la pantalla y en el bucket (`file_size_limit`). Para videos más grandes hace falta el plan Pro y subidas reanudables (fuera de C2b).
2. **Tipos permitidos por extensión, exigidos por el bucket:** videos MP4, WebM y MOV (`video/mp4`, `video/webm`, `video/quicktime`); materiales PDF, PPT y PPTX. El navegador sube el archivo con el Content-Type de su extensión (`archivo.slice(0, size, mime)`), y el bucket (`allowed_mime_types`) rechaza cualquier otro aunque el token sea válido. No se validan bytes mágicos de videos (los buckets son privados y solo se sirven con URL firmada a compradores; las imágenes públicas de `sitios` sí los validan).
3. **El path lo arma el servidor:** `{tenant_id}/{curso_id}/{video|archivo}-{ms}-{16 hex}.{ext}`; el nombre original del archivo nunca va al path (solo a `archivos_curso.nombre_archivo`, validado: hasta 120 caracteres, sin caracteres de control). `registrarSubida` solo acepta un path con ese formato exacto para ese tenant, curso y tipo (`esPathDeSubida`), así un navegador no puede registrar un objeto de otro curso o de otro cliente.
4. **Verificación del objeto con `list`** (no `info`): `list(carpeta, { search: nombre })` devuelve `metadata.size` y `metadata.mimetype` y ya lo usan los scripts. Si el objeto no existe, pesa 0 o más del límite, o su tipo no es el de la extensión, se borra y se responde `subida_invalida`.
5. **Server actions que devuelven valores** (no redirigen): las llama un componente de cliente. Con el módulo apagado, `tenantDeAccion` redirige igual (el router del navegador lleva al panel con el aviso).
6. **Subida sin sesión de Supabase:** el componente crea un cliente con `createClient(url, publishableKey, { auth: { persistSession: false } })` en vez de `createBrowserClient` de `@supabase/ssr`, que mandaría el JWT del usuario del panel. El token firmado es la única autorización; los buckets no tienen policies.
7. **Reemplazar el video** borra el anterior si está en la carpeta de ese curso (`enCarpetaDelCurso`, que también reconoce los nombres de antes de C2b: `{tenant}/{curso}/{ms}-{nombre}`). **Borrar un curso** lee antes las rutas del video y de los materiales (de la base del tenant), borra la fila (los materiales se borran en cascada) y después los objetos; si hay compras, Postgres lo impide (`23503`) y se responde `curso_con_compras`.
8. **El alta del curso ya no sube video:** el formulario de alta tiene lo básico (título, categoría, precio, días de acceso) y lleva a la edición, donde están las subidas directas.
9. **Código que queda sin uso y se borra:** `VideoProvider.subir` (y su implementación), `subirArchivoCurso` y `src/lib/storage/nombre-seguro.ts` (+test), que solo usaban las subidas por server action. `videoProvider.urlFirmada`, `urlFirmadaArchivo` y `borrarArchivoCurso` se siguen usando.
10. **Favicon:** `iconosDeMarca(logoUrl)` devuelve `{ icons: { icon, apple } }` con el logo, o `{}` sin logo (queda `src/app/icon.png`: Next solo agrega los íconos de archivo si ningún segmento definió `icons`, ver Riesgos verificados). Se usa en el `generateMetadata` del sitio y en `metadataDelPanel`.
11. **E2E:** `scripts/e2e-cliente.mjs` suma una sección de cursos y favicon. Las actions de subida se llaman como React (igual que la reserva en C2a) con los ids de `.next/dev/server/app/admin/cursos/[id]/page/server-reference-manifest.json`; la subida a Storage la hace la E2E con `@supabase/supabase-js` y la publishable key, como el navegador.

**Riesgos verificados:**

- **Subida firmada** (`node_modules/@supabase/storage-js/dist/index.mjs`, v2.110.1): `createSignedUploadUrl(path)` hace `POST /object/upload/sign/<bucket>/<path>` y devuelve `{ signedUrl, path, token }` (vale 2 horas); necesita permiso de insert en `storage.objects` **al firmar** (la service role lo tiene). `uploadToSignedUrl(path, token, blob)` hace `PUT /object/upload/sign/<bucket>/<path>?token=…` en multipart, con `x-upsert: false` por defecto, y no necesita sesión ni policies: lo autoriza el token. **Se verifica de verdad** en la Task 2 (test de aislamiento) antes de construir encima: control positivo (el anónimo sube con el token), token usado en otro path (falla), tipo no permitido (falla) y segundo intento sobre el mismo objeto (falla).
- **Buckets reales** (SELECT a `storage.buckets` al planificar): `cursos-videos` y `cursos-archivos` privados, **sin** `file_size_limit` ni `allowed_mime_types`; `storage.objects` **vacío** (no hay videos ni materiales que migrar) y sin policies.
- **Íconos y metadata** (`node_modules/next/dist/lib/metadata/resolve-metadata.js`): los íconos de archivo (`src/app/icon.png`) solo se agregan al final si `resolvedMetadata.icons` quedó vacío; un `icons` definido por un segmento los reemplaza. `metadata.js` renderiza `<link rel="icon" href="…"/>` (la E2E busca ese texto).
- **Respuesta de una action con valor** (`node_modules/next/dist/server/app-render/app-render.js`): la fila `0:` del payload lleva `a: options.actionResult`; la E2E de C2a ya lo resuelve.
- **Paths de Storage de antes de C2b:** `{tenant}/{curso}/{ms}-{nombreSeguro}` (sin subcarpetas); `enCarpetaDelCurso` los reconoce para borrarlos.

## Servidor de desarrollo (reglas para quien ejecuta)

- El contenedor `esteticagisel-web-1` ocupa el puerto 3000. Antes de `npm run dev`: `docker compose stop`.
- El servidor se levanta con la salida a un log, en background: `LOG="$TEMP/dev-etapa-c2b.log"` y `CABECERA_IP_CONFIABLE=x-real-ip npm run dev > "$LOG" 2>&1` (la variable solo en ese entorno, no en el `.env.local`). Está listo cuando `grep -c "Ready" "$LOG"` da `1`. Se usa la misma ruta de `LOG` en todos los comandos. Para pasarla a `node`: `"$(cygpath -w "$LOG")"`.
- Para detenerlo, solo su árbol de procesos: `netstat -ano | grep ":3000" | grep LISTENING` da el PID (última columna), y después `taskkill //PID <pid> //T //F`. **Nunca** se matan todos los `node.exe`.
- Al terminar, se reconstruye el contenedor: `docker compose up -d --build --force-recreate`.
- Los scripts E2E se corren desde la raíz del repo (leen `.next/dev/...`).

## Estructura de archivos

**Nuevos**

| Archivo | Responsabilidad |
|---|---|
| `src/lib/cursos/subidas.ts` (+test) | Tipos de subida, buckets, límites, tipos por extensión, paths firmados y su verificación |
| `src/lib/storage/subidas.ts` | Firmar una subida, leer el objeto subido, borrar objetos (server-only) |
| `src/app/admin/cursos/subidas.ts` | Server actions `pedirSubida` y `registrarSubida` |
| `src/components/panel/SubidaDirecta.tsx` | Subida directa del navegador a Storage (cliente) |
| `src/lib/cursos/textos.ts` | Nombres de las categorías y estados de un curso (es/pt) |
| `src/lib/tenant/iconos.ts` (+test) | Íconos (favicon) con el logo del cliente |

**Reescritos completos:** `scripts/setup-storage.mjs`, `src/app/admin/cursos/actions.ts`, `src/app/admin/cursos/page.tsx`, `src/app/admin/cursos/[id]/page.tsx`, `src/lib/video/provider.ts`, `src/lib/video/supabase-storage.ts`, `src/lib/storage/archivos.ts`.

**Modificados puntualmente:** `src/lib/panel/{formularios,mensajes,limites}.ts` (+tests), `src/app/sitio/[tenant]/layout.tsx`, `src/lib/panel/metadata.ts`, `scripts/test-aislamiento.mjs`, `scripts/e2e-cliente.mjs`.

**Borrados:** `src/lib/storage/nombre-seguro.ts`, `src/lib/storage/nombre-seguro.test.ts`.

**Commits:** cada task compila (`npx tsc --noEmit`), pasa los tests y termina en su propio commit. **No usar `git add -A`.** Formato:

```bash
git commit -F - <<'EOF'
<tipo>(<alcance>): <descripción>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 1: Reglas de las subidas, formularios y mensajes de cursos

**Files:**
- Create: `src/lib/cursos/subidas.ts`, `src/lib/cursos/subidas.test.ts`
- Modify: `src/lib/panel/limites.ts`, `src/lib/panel/mensajes.ts`, `src/lib/panel/mensajes.test.ts`, `src/lib/panel/formularios.ts`, `src/lib/panel/formularios.test.ts`

- [ ] **Step 1: Tests que fallan**

`src/lib/cursos/subidas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  aceptaSubida,
  BUCKET_SUBIDA,
  enCarpetaDelCurso,
  esPathDeSubida,
  esTipoSubida,
  extensionDe,
  LIMITE_SUBIDA,
  mimeDeSubida,
  pathDeSubida,
  tipoArchivoCurso,
  validarSubida,
} from "./subidas";

const TENANT = "11111111-1111-4111-8111-111111111111";
const CURSO = "22222222-2222-4222-8222-222222222222";
const OTRO = "33333333-3333-4333-8333-333333333333";
const MB = 1024 * 1024;
const SUFIJO = "0123456789abcdef";

describe("tipos, buckets y límites", () => {
  it("dos tipos de subida, cada uno con su bucket privado y su límite", () => {
    expect(esTipoSubida("video")).toBe(true);
    expect(esTipoSubida("archivo")).toBe(true);
    for (const v of ["imagen", "", null, 1]) expect(esTipoSubida(v), String(v)).toBe(false);
    expect(BUCKET_SUBIDA).toEqual({ video: "cursos-videos", archivo: "cursos-archivos" });
    expect(LIMITE_SUBIDA).toEqual({ video: 50 * MB, archivo: 20 * MB });
  });

  it("Content-Type por extensión, sin importar mayúsculas", () => {
    expect(extensionDe("Clase 1.MP4")).toBe("mp4");
    expect(extensionDe("material.tar.gz")).toBe("gz");
    expect(extensionDe("sin-extension")).toBeNull();
    expect(mimeDeSubida("video", "clase.mov")).toBe("video/quicktime");
    expect(mimeDeSubida("video", "clase.webm")).toBe("video/webm");
    expect(mimeDeSubida("archivo", "guia.PPTX")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    expect(mimeDeSubida("video", "guia.pdf")).toBeNull();
    expect(mimeDeSubida("archivo", "clase.mp4")).toBeNull();
    expect(aceptaSubida("video")).toBe(".mp4,.webm,.mov");
    expect(aceptaSubida("archivo")).toBe(".pdf,.ppt,.pptx");
  });
});

describe("validarSubida", () => {
  it("tamaño, nombre y tipo", () => {
    expect(validarSubida("video", "clase.mp4", 10 * MB)).toBeNull();
    expect(validarSubida("video", "clase.mp4", 0)).toBe("archivo_vacio");
    expect(validarSubida("video", "clase.mp4", 1.5)).toBe("archivo_vacio");
    expect(validarSubida("video", "clase.mp4", 50 * MB + 1)).toBe("archivo_grande");
    expect(validarSubida("archivo", "guia.pdf", 20 * MB + 1)).toBe("archivo_grande");
    expect(validarSubida("video", "clase.avi", 100)).toBe("archivo_tipo");
    expect(validarSubida("archivo", `${"x".repeat(116)}.pdf`, 100)).toBeNull();
    expect(validarSubida("archivo", `${"x".repeat(117)}.pdf`, 100)).toBe("nombre_archivo");
    expect(validarSubida("archivo", "guia\n.pdf", 100)).toBe("nombre_archivo");
  });
});

describe("paths", () => {
  const path = pathDeSubida(TENANT, CURSO, "video", "mp4", new Date(1_700_000_000_000), SUFIJO);

  it("el servidor arma {tenant}/{curso}/{tipo}-{ms}-{16 hex}.{ext}", () => {
    expect(path).toBe(`${TENANT}/${CURSO}/video-1700000000000-${SUFIJO}.mp4`);
    expect(esPathDeSubida(path, TENANT, CURSO, "video")).toBe(true);
    expect(() => pathDeSubida(TENANT, CURSO, "video", "pdf", new Date(0), SUFIJO)).toThrow();
    expect(() => pathDeSubida(TENANT, CURSO, "video", "mp4", new Date(0), "../x")).toThrow();
  });

  it("esPathDeSubida: solo el de ese tenant, ese curso y ese tipo", () => {
    expect(esPathDeSubida(path, OTRO, CURSO, "video")).toBe(false);
    expect(esPathDeSubida(path, TENANT, OTRO, "video")).toBe(false);
    expect(esPathDeSubida(path, TENANT, CURSO, "archivo")).toBe(false);
    expect(esPathDeSubida(`${path}.exe`, TENANT, CURSO, "video")).toBe(false);
    expect(esPathDeSubida(`${TENANT}/${CURSO}/../${OTRO}/video-1700000000000-${SUFIJO}.mp4`, TENANT, CURSO, "video")).toBe(false);
    expect(esPathDeSubida(`${TENANT}/${CURSO}/video-1-${SUFIJO}.mp4`, TENANT, CURSO, "video")).toBe(false);
  });

  it("enCarpetaDelCurso: objetos sueltos de la carpeta del curso (también los nombres de antes de C2b)", () => {
    expect(enCarpetaDelCurso(path, TENANT, CURSO)).toBe(true);
    expect(enCarpetaDelCurso(`${TENANT}/${CURSO}/1700000000000-clase_1.mp4`, TENANT, CURSO)).toBe(true);
    expect(enCarpetaDelCurso(`${TENANT}/${OTRO}/x.mp4`, TENANT, CURSO)).toBe(false);
    expect(enCarpetaDelCurso(`${TENANT}/${CURSO}/sub/x.mp4`, TENANT, CURSO)).toBe(false);
    expect(enCarpetaDelCurso(`${TENANT}/${CURSO}/`, TENANT, CURSO)).toBe(false);
    expect(enCarpetaDelCurso(`${OTRO}/${TENANT}/${CURSO}/x.mp4`, TENANT, CURSO)).toBe(false);
  });

  it("tipo de archivos_curso (check: pdf, pptx u otro)", () => {
    expect(tipoArchivoCurso("pdf")).toBe("pdf");
    expect(tipoArchivoCurso("ppt")).toBe("pptx");
    expect(tipoArchivoCurso("pptx")).toBe("pptx");
    expect(tipoArchivoCurso("doc")).toBe("otro");
  });
});
```

En `src/lib/panel/formularios.test.ts`, reemplazar:

```ts
  columnasConfiguracion,
  columnasServicio,
```

por:

```ts
  columnasConfiguracion,
  columnasCurso,
  columnasCursoNuevo,
  columnasServicio,
```

reemplazar:

```ts
  parsearConfiguracion,
  parsearDescripcionImagen,
```

por:

```ts
  parsearConfiguracion,
  parsearCurso,
  parsearCursoNuevo,
  parsearDescripcionImagen,
```

y agregar al final:

```ts

describe("cursos", () => {
  const NUEVO = { titulo: " Curso de cejas ", categoria: "profesional", precio: "45000", dias_acceso: "" };
  const EDICION = {
    ...NUEVO,
    dias_acceso: "30",
    descripcion: "Línea 1\nLínea 2",
    preview_youtube_url: "https://youtu.be/Ku5kU3eJ2Ik",
    permitir_descarga: "on",
    precio_oferta: "40000",
    oferta_activa: "on",
    oferta_desde: "2026-11-01T00:00",
    oferta_hasta: "2026-11-30T23:59",
    estado: "publicado",
    orden: "2",
    video_storage_path: "otro-tenant/otro-curso/x.mp4",
    tenant_id: "otro",
  };

  it("alta: título, categoría, precio y días de acceso (7 por defecto)", () => {
    const r = parsearCursoNuevo(fd(NUEVO));
    expect(r).toEqual({ ok: true, valor: { titulo: "Curso de cejas", categoria: "profesional", precio: 45000, diasAcceso: 7 } });
    if (r.ok) {
      expect(columnasCursoNuevo(r.valor)).toEqual({ titulo: "Curso de cejas", categoria: "profesional", precio: 45000, dias_acceso: 7 });
    }
  });

  it("alta: cada error", () => {
    expect(parsearCursoNuevo(fd({ ...NUEVO, titulo: "" }))).toEqual({ ok: false, error: "titulo_curso" });
    expect(parsearCursoNuevo(fd({ ...NUEVO, titulo: "x".repeat(121) }))).toEqual({ ok: false, error: "titulo_curso" });
    expect(parsearCursoNuevo(fd({ ...NUEVO, categoria: "otra" }))).toEqual({ ok: false, error: "categoria" });
    expect(parsearCursoNuevo(fd({ ...NUEVO, precio: "-1" }))).toEqual({ ok: false, error: "precio" });
    expect(parsearCursoNuevo(fd({ ...NUEVO, dias_acceso: "0" }))).toEqual({ ok: false, error: "dias_acceso" });
  });

  it("edición: lista blanca (el video y el tenant no se cambian desde el formulario)", () => {
    const r = parsearCurso(fd(EDICION));
    expect(r.ok && columnasCurso(r.valor)).toEqual({
      titulo: "Curso de cejas",
      categoria: "profesional",
      precio: 45000,
      dias_acceso: 30,
      descripcion: "Línea 1\nLínea 2",
      preview_youtube_url: "https://youtu.be/Ku5kU3eJ2Ik",
      permitir_descarga: true,
      precio_oferta: 40000,
      oferta_activa: true,
      oferta_desde: "2026-11-01T00:00",
      oferta_hasta: "2026-11-30T23:59",
      estado: "publicado",
      orden: 2,
    });
  });

  it("edición: vacíos opcionales y cada error", () => {
    const r = parsearCurso(fd({ ...EDICION, descripcion: "", preview_youtube_url: "", precio_oferta: "", oferta_desde: "", oferta_hasta: "" }));
    expect(r.ok && r.valor.precioOferta).toBeNull();
    expect(r.ok && r.valor.previewYoutubeUrl).toBeNull();
    expect(parsearCurso(fd({ ...EDICION, preview_youtube_url: "https://vimeo.com/1" }))).toEqual({ ok: false, error: "youtube" });
    expect(parsearCurso(fd({ ...EDICION, oferta_desde: "2026-12-01T00:00" }))).toEqual({ ok: false, error: "fecha_oferta" });
    expect(parsearCurso(fd({ ...EDICION, oferta_hasta: "mañana" }))).toEqual({ ok: false, error: "fecha_oferta" });
    expect(parsearCurso(fd({ ...EDICION, estado: "archivado" }))).toEqual({ ok: false, error: "estado_curso" });
    expect(parsearCurso(fd({ ...EDICION, precio_oferta: "x" }))).toEqual({ ok: false, error: "precio" });
    expect(parsearCurso(fd({ ...EDICION, descripcion: "x".repeat(2001) }))).toEqual({ ok: false, error: "texto_largo" });
    expect(parsearCurso(fd({ ...EDICION, orden: "-1" }))).toEqual({ ok: false, error: "orden" });
  });
});
```

En `src/lib/panel/mensajes.test.ts`, reemplazar:

```ts
import type { ProblemaImagen } from "@/lib/storage/imagenes";
```

por:

```ts
import type { ProblemaSubida } from "@/lib/cursos/subidas";
import type { ProblemaImagen } from "@/lib/storage/imagenes";
```

reemplazar:

```ts
      "descripcion",
      "galeria_llena",
    ];
```

por:

```ts
      "descripcion",
      "galeria_llena",
      ...subida,
      "titulo_curso",
      "categoria",
      "dias_acceso",
      "youtube",
      "fecha_oferta",
      "estado_curso",
      "curso_con_compras",
      "subida_invalida",
      "subida_fallo",
    ];
```

reemplazar:

```ts
    const imagen: ProblemaImagen[] = ["imagen_vacia", "imagen_grande", "imagen_tipo"];
```

por:

```ts
    const imagen: ProblemaImagen[] = ["imagen_vacia", "imagen_grande", "imagen_tipo"];
    // Lo mismo con los problemas de las subidas de cursos.
    const subida: ProblemaSubida[] = ["archivo_vacio", "archivo_grande", "archivo_tipo", "nombre_archivo"];
```

y reemplazar:

```ts
    const infos: ClaveInfo[] = ["guardado", "creado", "eliminado", "imagen_subida", "turno_completado", "turno_cancelado"];
```

por:

```ts
    const infos: ClaveInfo[] = [
      "guardado",
      "creado",
      "eliminado",
      "imagen_subida",
      "turno_completado",
      "turno_cancelado",
      "video_subido",
      "archivo_subido",
    ];
```

- [ ] **Step 2: Correr los tests y ver que fallan**

Run: `npx vitest run src/lib/cursos src/lib/panel`
Expected: FAIL (no existe `./subidas`; faltan los parsers y las claves de cursos).

- [ ] **Step 3: Implementación**

`src/lib/cursos/subidas.ts`:

```ts
/**
 * Videos y materiales de los cursos, que el navegador sube directo a Storage con una URL
 * firmada (sin pasar por el cuerpo de una server action, limitado a 3 MB). Puro: lo usan las
 * actions (servidor), el componente de subida (navegador) y sus tests. El límite y los tipos
 * los exige también cada bucket (scripts/setup-storage.mjs: mantenerlos iguales).
 */
export type TipoSubida = "video" | "archivo";

export const TIPOS_SUBIDA: readonly TipoSubida[] = ["video", "archivo"];

export const BUCKET_SUBIDA: Record<TipoSubida, string> = { video: "cursos-videos", archivo: "cursos-archivos" };

const MB = 1024 * 1024;

/**
 * Video: 50 MB, el máximo por archivo del plan Free de Supabase con una subida estándar (un
 * solo PUT, que es lo que hace uploadToSignedUrl). Material: 20 MB.
 */
export const LIMITE_SUBIDA: Record<TipoSubida, number> = { video: 50 * MB, archivo: 20 * MB };

/** Extensión → Content-Type permitido. El bucket solo acepta estos tipos. */
export const MIME_SUBIDA: Record<TipoSubida, Record<string, string>> = {
  video: { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" },
  archivo: {
    pdf: "application/pdf",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
};

export const LARGO_MAXIMO_NOMBRE_ARCHIVO = 120;

/** Caracteres de control (mismo criterio que los textos del panel). */
const CONTROL = /[\u0000-\u001f\u007f]/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function esTipoSubida(valor: unknown): valor is TipoSubida {
  return typeof valor === "string" && (TIPOS_SUBIDA as readonly string[]).includes(valor);
}

/** "Clase 1.MP4" → "mp4"; null si no tiene extensión. */
export function extensionDe(nombre: string): string | null {
  const m = /\.([a-z0-9]{1,5})$/i.exec(nombre.trim());
  return m ? m[1].toLowerCase() : null;
}

export function mimeDeSubida(tipo: TipoSubida, nombre: string): string | null {
  const ext = extensionDe(nombre);
  return ext && Object.prototype.hasOwnProperty.call(MIME_SUBIDA[tipo], ext) ? MIME_SUBIDA[tipo][ext] : null;
}

/** accept del <input type="file">: ".mp4,.webm,.mov". */
export function aceptaSubida(tipo: TipoSubida): string {
  return Object.keys(MIME_SUBIDA[tipo])
    .map((ext) => `.${ext}`)
    .join(",");
}

export type ProblemaSubida = "archivo_vacio" | "nombre_archivo" | "archivo_grande" | "archivo_tipo";

/** Antes de firmar (servidor) y antes de pedir la firma (navegador). */
export function validarSubida(tipo: TipoSubida, nombre: string, tamano: number): ProblemaSubida | null {
  if (!Number.isInteger(tamano) || tamano <= 0) return "archivo_vacio";
  const limpio = nombre.trim();
  if (!limpio || limpio.length > LARGO_MAXIMO_NOMBRE_ARCHIVO || CONTROL.test(limpio)) return "nombre_archivo";
  if (tamano > LIMITE_SUBIDA[tipo]) return "archivo_grande";
  if (!mimeDeSubida(tipo, limpio)) return "archivo_tipo";
  return null;
}

/** {tenant}/{curso}/{tipo}-{ms}-{16 hex}.{ext}: lo arma el servidor, nunca con el nombre del archivo. */
export function pathDeSubida(
  tenantId: string,
  cursoId: string,
  tipo: TipoSubida,
  ext: string,
  ahora: Date,
  sufijo: string,
): string {
  if (!/^[0-9a-f]{16}$/.test(sufijo)) throw new Error("Sufijo de subida inválido");
  if (!Object.prototype.hasOwnProperty.call(MIME_SUBIDA[tipo], ext)) throw new Error("Extensión no permitida");
  return `${tenantId}/${cursoId}/${tipo}-${ahora.getTime()}-${sufijo}.${ext}`;
}

/** ¿Es un path armado por pathDeSubida para ese tenant, curso y tipo? (lo que vuelve del navegador no es confiable) */
export function esPathDeSubida(path: string, tenantId: string, cursoId: string, tipo: TipoSubida): boolean {
  if (!UUID.test(tenantId) || !UUID.test(cursoId)) return false;
  const extensiones = Object.keys(MIME_SUBIDA[tipo]).join("|");
  return new RegExp(`^${tenantId}/${cursoId}/${tipo}-\\d{13}-[0-9a-f]{16}\\.(${extensiones})$`).test(path);
}

/**
 * ¿El objeto está suelto en la carpeta de ese curso? Para borrar el video anterior o los
 * archivos de un curso borrado, también con los nombres de antes de C2b ({ms}-{nombre}).
 */
export function enCarpetaDelCurso(path: string, tenantId: string, cursoId: string): boolean {
  const carpeta = `${tenantId}/${cursoId}/`;
  if (!path.startsWith(carpeta)) return false;
  const nombre = path.slice(carpeta.length);
  return nombre.length > 0 && !nombre.includes("/");
}

/** Valor de archivos_curso.tipo (la base admite pdf, pptx u otro). */
export function tipoArchivoCurso(ext: string): "pdf" | "pptx" | "otro" {
  if (ext === "pdf") return "pdf";
  if (ext === "ppt" || ext === "pptx") return "pptx";
  return "otro";
}
```

En `src/lib/panel/limites.ts`, reemplazar:

```ts
  descripcionImagen: 200,
  imagenesGaleria: 30,
} as const;
```

por:

```ts
  descripcionImagen: 200,
  imagenesGaleria: 30,
  tituloCurso: 120,
  diasAccesoMax: 3650,
} as const;
```

En `src/lib/panel/mensajes.ts`, reemplazar:

```ts
import type { Idioma, Textos } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "./limites";
```

por:

```ts
import { LARGO_MAXIMO_NOMBRE_ARCHIVO, LIMITE_SUBIDA } from "@/lib/cursos/subidas";
import type { Idioma, Textos } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "./limites";

const MB_VIDEO = LIMITE_SUBIDA.video / (1024 * 1024);
const MB_ARCHIVO = LIMITE_SUBIDA.archivo / (1024 * 1024);
```

reemplazar:

```ts
  galeria_llena: {
    es: `La galería ya tiene ${L.imagenesGaleria} imágenes: eliminá alguna para subir otra.`,
    pt: `A galeria já tem ${L.imagenesGaleria} imagens: exclua alguma para enviar outra.`,
  },
} satisfies Record<string, Textos>;
```

por:

```ts
  galeria_llena: {
    es: `La galería ya tiene ${L.imagenesGaleria} imágenes: eliminá alguna para subir otra.`,
    pt: `A galeria já tem ${L.imagenesGaleria} imagens: exclua alguma para enviar outra.`,
  },
  titulo_curso: {
    es: `El título del curso es obligatorio (hasta ${L.tituloCurso} caracteres).`,
    pt: `O título do curso é obrigatório (até ${L.tituloCurso} caracteres).`,
  },
  categoria: { es: "Elegí la categoría del curso.", pt: "Escolha a categoria do curso." },
  dias_acceso: {
    es: `Los días de acceso tienen que ser un número entero entre 1 y ${L.diasAccesoMax}.`,
    pt: `Os dias de acesso precisam ser um número inteiro entre 1 e ${L.diasAccesoMax}.`,
  },
  youtube: {
    es: "El link de vista previa no es un video de YouTube.",
    pt: "O link de prévia não é um vídeo do YouTube.",
  },
  fecha_oferta: {
    es: "Revisá las fechas de la oferta: el inicio tiene que ser antes del fin.",
    pt: "Revise as datas da oferta: o início precisa ser antes do fim.",
  },
  estado_curso: {
    es: "Elegí si el curso es un borrador o está publicado.",
    pt: "Escolha se o curso é um rascunho ou está publicado.",
  },
  curso_con_compras: {
    es: "Este curso tiene compras registradas y no se puede eliminar. Pasalo a borrador para ocultarlo del sitio.",
    pt: "Este curso tem compras registradas e não pode ser excluído. Mude-o para rascunho para ocultá-lo do site.",
  },
  archivo_vacio: { es: "Elegí un archivo.", pt: "Escolha um arquivo." },
  nombre_archivo: {
    es: `El nombre del archivo tiene que tener hasta ${LARGO_MAXIMO_NOMBRE_ARCHIVO} caracteres, sin caracteres especiales.`,
    pt: `O nome do arquivo precisa ter até ${LARGO_MAXIMO_NOMBRE_ARCHIVO} caracteres, sem caracteres especiais.`,
  },
  archivo_grande: {
    es: `El archivo supera el tamaño permitido: videos hasta ${MB_VIDEO} MB, materiales hasta ${MB_ARCHIVO} MB.`,
    pt: `O arquivo ultrapassa o tamanho permitido: vídeos até ${MB_VIDEO} MB, materiais até ${MB_ARCHIVO} MB.`,
  },
  archivo_tipo: {
    es: "Tipo de archivo no permitido: videos MP4, WebM o MOV; materiales PDF, PPT o PPTX.",
    pt: "Tipo de arquivo não permitido: vídeos MP4, WebM ou MOV; materiais PDF, PPT ou PPTX.",
  },
  subida_invalida: {
    es: "No encontramos el archivo subido o no es válido. Probá subirlo de nuevo.",
    pt: "Não encontramos o arquivo enviado ou ele não é válido. Tente enviá-lo de novo.",
  },
  subida_fallo: {
    es: "No se pudo subir el archivo. Revisá tu conexión y probá de nuevo.",
    pt: "Não foi possível enviar o arquivo. Verifique sua conexão e tente novamente.",
  },
} satisfies Record<string, Textos>;
```

y reemplazar:

```ts
  turno_cancelado: { es: "Turno cancelado.", pt: "Agendamento cancelado." },
} satisfies Record<string, Textos>;
```

por:

```ts
  turno_cancelado: { es: "Turno cancelado.", pt: "Agendamento cancelado." },
  video_subido: { es: "Video subido.", pt: "Vídeo enviado." },
  archivo_subido: { es: "Material subido.", pt: "Material enviado." },
} satisfies Record<string, Textos>;
```

En `src/lib/panel/formularios.ts`, reemplazar:

```ts
import { CONTROL, CONTROL_MULTILINEA } from "@/lib/master/formularios";
import { DIAS_SEMANA } from "@/lib/turnos/horario";
```

por:

```ts
import type { CategoriaCurso, EstadoCurso } from "@/lib/data/types";
import { CONTROL, CONTROL_MULTILINEA } from "@/lib/master/formularios";
import { DIAS_SEMANA } from "@/lib/turnos/horario";
import { youtubeId } from "@/lib/video/youtube";
```

y agregar al final:

```ts

// ---------- Cursos ----------

const CATEGORIAS: readonly CategoriaCurso[] = ["publico_general", "profesional"];
const ESTADOS_CURSO: readonly EstadoCurso[] = ["borrador", "publicado"];
/** <input type="datetime-local">: "2026-11-01T09:30". */
const FECHA_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export type FormCursoNuevo = { titulo: string; categoria: CategoriaCurso; precio: number; diasAcceso: number };

export function parsearCursoNuevo(fd: FormData): Resultado<FormCursoNuevo> {
  const titulo = leerTexto(fd, "titulo", L.tituloCurso);
  if ("problema" in titulo) return { ok: false, error: titulo.problema === "control" ? "texto_invalido" : "titulo_curso" };
  if (!titulo.valor) return { ok: false, error: "titulo_curso" };
  const categoria = CATEGORIAS.find((c) => c === texto(fd, "categoria"));
  if (!categoria) return { ok: false, error: "categoria" };
  const precioTexto = texto(fd, "precio");
  const precio = precioTexto === "" ? 0 : parsearMonto(precioTexto, L.precioMax);
  if (precio === null) return { ok: false, error: "precio" };
  const diasAcceso = entero(fd, "dias_acceso", 1, L.diasAccesoMax, 7);
  if (diasAcceso === null) return { ok: false, error: "dias_acceso" };
  return { ok: true, valor: { titulo: titulo.valor, categoria, precio, diasAcceso } };
}

export function columnasCursoNuevo(c: FormCursoNuevo) {
  return { titulo: c.titulo, categoria: c.categoria, precio: c.precio, dias_acceso: c.diasAcceso };
}

export type FormCurso = FormCursoNuevo & {
  descripcion: string | null;
  previewYoutubeUrl: string | null;
  permitirDescarga: boolean;
  precioOferta: number | null;
  ofertaActiva: boolean;
  ofertaDesde: string | null;
  ofertaHasta: string | null;
  estado: EstadoCurso;
  orden: number;
};

/** Edición. El video y los materiales no van acá: los registra la subida directa. */
export function parsearCurso(fd: FormData): Resultado<FormCurso> {
  const base = parsearCursoNuevo(fd);
  if (!base.ok) return base;
  const descripcion = leerTexto(fd, "descripcion", L.texto, true);
  if ("problema" in descripcion) return { ok: false, error: descripcion.problema === "control" ? "texto_invalido" : "texto_largo" };
  const preview = texto(fd, "preview_youtube_url");
  if (preview && (preview.length > 300 || !youtubeId(preview))) return { ok: false, error: "youtube" };
  const ofertaTexto = texto(fd, "precio_oferta");
  const precioOferta = ofertaTexto === "" ? null : parsearMonto(ofertaTexto, L.precioMax);
  if (ofertaTexto !== "" && precioOferta === null) return { ok: false, error: "precio" };
  const desde = texto(fd, "oferta_desde");
  const hasta = texto(fd, "oferta_hasta");
  if ((desde && !FECHA_LOCAL.test(desde)) || (hasta && !FECHA_LOCAL.test(hasta)) || (desde && hasta && desde >= hasta)) {
    return { ok: false, error: "fecha_oferta" };
  }
  const estado = ESTADOS_CURSO.find((e) => e === texto(fd, "estado"));
  if (!estado) return { ok: false, error: "estado_curso" };
  const orden = entero(fd, "orden", 0, L.ordenMax, 0);
  if (orden === null) return { ok: false, error: "orden" };
  return {
    ok: true,
    valor: {
      ...base.valor,
      descripcion: descripcion.valor || null,
      previewYoutubeUrl: preview || null,
      permitirDescarga: tildado(fd, "permitir_descarga"),
      precioOferta,
      ofertaActiva: tildado(fd, "oferta_activa"),
      ofertaDesde: desde || null,
      ofertaHasta: hasta || null,
      estado,
      orden,
    },
  };
}

export function columnasCurso(c: FormCurso) {
  return {
    ...columnasCursoNuevo(c),
    descripcion: c.descripcion,
    preview_youtube_url: c.previewYoutubeUrl,
    permitir_descarga: c.permitirDescarga,
    precio_oferta: c.precioOferta,
    oferta_activa: c.ofertaActiva,
    oferta_desde: c.ofertaDesde,
    oferta_hasta: c.ofertaHasta,
    estado: c.estado,
    orden: c.orden,
  };
}
```

Las fechas de la oferta se guardan como hasta ahora (el texto del `datetime-local`, sin zona): ver Riesgos.

- [ ] **Step 4: Correr los tests y ver que pasan**

Run: `npx vitest run && npx tsc --noEmit`
Expected: todos los tests en PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cursos/subidas.ts src/lib/cursos/subidas.test.ts src/lib/panel/limites.ts src/lib/panel/mensajes.ts src/lib/panel/mensajes.test.ts src/lib/panel/formularios.ts src/lib/panel/formularios.test.ts
git commit -F - <<'EOF'
feat(cursos): reglas de la subida directa y validación de los formularios de cursos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Buckets de cursos con límites, subida firmada verificada y aislamiento

**Files:**
- Rewrite: `scripts/setup-storage.mjs`
- Create: `src/lib/storage/subidas.ts`
- Modify: `scripts/test-aislamiento.mjs`

- [ ] **Step 1: Buckets con límite y tipos**

`scripts/setup-storage.mjs` (reemplazo completo):

```js
// Crea o actualiza los buckets privados de los cursos: videos y materiales, en
// {tenant_id}/{curso_id}/… Sin acceso público ni policies: el panel firma las subidas con la
// service role (el navegador sube con el token) y el sitio entrega URLs firmadas de lectura.
// El límite y los tipos los exige Storage también en las subidas firmadas; son los de
// src/lib/cursos/subidas.ts (mantenerlos iguales).
// Idempotente: correrlo de nuevo vuelve a fijar las opciones. Correrlo también en producción.
// Uso: node --env-file=.env.local scripts/setup-storage.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const MB = 1024 * 1024;
const BUCKETS = {
  // 50 MB: el máximo por archivo del plan Free de Supabase con una subida estándar.
  "cursos-videos": { public: false, fileSizeLimit: 50 * MB, allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"] },
  "cursos-archivos": {
    public: false,
    fileSizeLimit: 20 * MB,
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
};

for (const [id, opciones] of Object.entries(BUCKETS)) {
  const { data: existente, error: errorLectura } = await supabase.storage.getBucket(id);
  // Solo "no encontrado" significa que hay que crearlo; cualquier otro error (clave, red) corta.
  if (errorLectura && String(errorLectura.statusCode) !== "404") {
    console.error(`❌ ${id}: no se pudo leer el bucket: ${errorLectura.message}`);
    process.exit(1);
  }
  const { error } = existente
    ? await supabase.storage.updateBucket(id, opciones)
    : await supabase.storage.createBucket(id, opciones);
  if (error) {
    console.error(`❌ ${id}: ${error.message}`);
    process.exit(1);
  }
  console.log(existente ? `✓ ${id} actualizado` : `✓ ${id} creado`);
}
```

Run: `node --env-file=.env.local scripts/setup-storage.mjs`
Expected: `✓ cursos-videos actualizado` y `✓ cursos-archivos actualizado`. Si falla con "The object exceeded the maximum allowed size" o un error de límite, el proyecto tiene un límite global menor a 50 MB (Supabase → Storage → Settings): detenerse y avisar a Pablo.

- [ ] **Step 2: Firmar, leer y borrar objetos de los cursos**

`src/lib/storage/subidas.ts`:

```ts
import "server-only";
import { BUCKET_SUBIDA, type TipoSubida } from "@/lib/cursos/subidas";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Storage de los cursos para la subida directa. Solo la service role firma y lee: los buckets
 * son privados y no tienen policies; el token firmado autoriza a subir un solo objeto.
 */

/** Token para subir ese objeto (vale 2 horas; sin sobrescribir uno existente). */
export async function crearSubidaFirmada(tipo: TipoSubida, path: string): Promise<{ path: string; token: string }> {
  const { data, error } = await createAdminClient().storage.from(BUCKET_SUBIDA[tipo]).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`No se pudo firmar la subida: ${error?.message}`);
  return { path: data.path, token: data.token };
}

/** Tamaño y Content-Type que guardó Storage para ese objeto, o null si no existe. */
export async function infoDeSubida(tipo: TipoSubida, path: string): Promise<{ tamano: number; mime: string } | null> {
  const corte = path.lastIndexOf("/");
  const carpeta = path.slice(0, corte);
  const nombre = path.slice(corte + 1);
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET_SUBIDA[tipo])
    .list(carpeta, { search: nombre, limit: 10 });
  if (error) throw new Error(`No se pudo leer el archivo subido: ${error.message}`);
  const objeto = data.find((o) => o.name === nombre);
  if (!objeto) return null;
  const metadata = (objeto.metadata ?? {}) as { size?: number; mimetype?: string };
  return { tamano: Number(metadata.size ?? 0), mime: String(metadata.mimetype ?? "") };
}

export async function borrarSubidas(tipo: TipoSubida, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await createAdminClient().storage.from(BUCKET_SUBIDA[tipo]).remove(paths);
  if (error) throw new Error(`No se pudieron borrar archivos del curso: ${error.message}`);
}
```

- [ ] **Step 3: El aislamiento prueba los buckets de cursos y la subida firmada**

En `scripts/test-aislamiento.mjs`:

Reemplazar:

```js
/** Objetos de prueba del bucket sitios (se borran al final). */
const objetosSitios = [];
```

por:

```js
/** Objetos de prueba del bucket sitios (se borran al final). */
const objetosSitios = [];
/** Objetos de prueba de los buckets de cursos, como [bucket, path] (se borran al final). */
const objetosCursos = [];
/** Límite y tipos de los buckets de cursos: los de src/lib/cursos/subidas.ts y scripts/setup-storage.mjs. */
const BUCKETS_CURSOS = {
  "cursos-videos": { limite: 50 * 1024 * 1024, tipos: ["video/mp4", "video/quicktime", "video/webm"] },
  "cursos-archivos": {
    limite: 20 * 1024 * 1024,
    tipos: [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
};
/** Comienzo de un MP4 (caja ftyp): alcanza para Storage, que mira el Content-Type. */
const VIDEO = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.alloc(16)]);
```

Reemplazar:

```js
  await permisosDeLaBase();
```

por:

```js
  console.log("\nBuckets de cursos (videos y materiales):");
  for (const [bucketId, { limite, tipos }] of Object.entries(BUCKETS_CURSOS)) {
    const { data: bucketCurso, error: errorBucketCurso } = await admin.storage.getBucket(bucketId);
    mostrarError({ error: errorBucketCurso });
    verificar(bucketCurso?.public === false, `${bucketId}: privado`);
    verificar(Number(bucketCurso?.file_size_limit) === limite, `${bucketId}: límite de ${limite / 1024 / 1024} MB`);
    verificar(
      JSON.stringify([...(bucketCurso?.allowed_mime_types ?? [])].sort()) === JSON.stringify([...tipos].sort()),
      `${bucketId}: solo sus tipos de archivo`,
    );
    for (const [quien, cliente] of [["anónimo", anon], ["cliente A", usuarioA], ["master", usuarioMaster]]) {
      const path = `${a.id}/${a.cursoId}/intruso-${quien === "anónimo" ? "anon" : quien.replace(" ", "-")}-${sufijo}`;
      objetosCursos.push([bucketId, path]);
      const subida = await cliente.storage.from(bucketId).upload(path, Buffer.from("x"), { contentType: tipos[0] });
      verificar(denegadoPorStorage(subida), `${bucketId}: ${quien} no sube archivos sin firma (lo deniega RLS)`);
    }
  }

  // La subida directa del panel: la service role firma un path y el navegador (anónimo, con la
  // publishable key) sube con ese token. Sin policies en storage.objects.
  const pathFirmado = `${a.id}/${a.cursoId}/video-${Date.now()}-${randomBytes(8).toString("hex")}.mp4`;
  const pathAjeno = `${b.id}/${b.cursoId}/video-intruso-${sufijo}.mp4`;
  objetosCursos.push(["cursos-videos", pathFirmado], ["cursos-videos", pathAjeno]);
  const { data: firma, error: errorFirma } = await admin.storage.from("cursos-videos").createSignedUploadUrl(pathFirmado);
  mostrarError({ error: errorFirma });
  verificar(!!firma?.token, "subida firmada: la service role firma la subida");
  if (firma?.token) {
    const videos = anon.storage.from("cursos-videos");
    const enOtroPath = await videos.uploadToSignedUrl(pathAjeno, firma.token, new Blob([VIDEO], { type: "video/mp4" }));
    verificar(!!enOtroPath.error, "subida firmada: el token no sirve para otro path (ni de otro cliente)");
    const tipoMalo = await videos.uploadToSignedUrl(pathFirmado, firma.token, new Blob(["<html></html>"], { type: "text/html" }));
    verificar(!!tipoMalo.error, "subida firmada: el bucket rechaza un tipo no permitido aunque el token sea válido");
    const propia = await videos.uploadToSignedUrl(pathFirmado, firma.token, new Blob([VIDEO], { type: "video/mp4" }));
    mostrarError(propia);
    verificar(!propia.error, "subida firmada: el anónimo sube ese objeto con el token, sin policies (control)");
    const repetida = await videos.uploadToSignedUrl(pathFirmado, firma.token, new Blob([VIDEO], { type: "video/mp4" }));
    verificar(!!repetida.error, "subida firmada: el token no sobrescribe el objeto ya subido");
    const listadoCurso = await videos.list(`${a.id}/${a.cursoId}`);
    verificar(!!listadoCurso.error || listadoCurso.data.length === 0, "cursos-videos: un anónimo no lista la carpeta de un curso");
    const descarga = await videos.download(pathFirmado);
    verificar(!!descarga.error, "cursos-videos: un anónimo no descarga un video sin URL firmada");
  }

  await permisosDeLaBase();
```

Reemplazar:

```js
  if (objetosSitios.length) {
```

por:

```js
  for (const [bucketId, path] of objetosCursos) {
    const { error: errorObjeto } = await admin.storage.from(bucketId).remove([path]);
    if (errorObjeto) {
      console.error(`✗ limpieza: ${bucketId}: ${errorObjeto.message}`);
      fallas++;
    }
  }
  if (objetosSitios.length) {
```

Y en el comentario del principio, reemplazar:

```js
// privilegios para la API, ni siquiera de lectura para anon. Al final borra todo.
```

por:

```js
// privilegios para la API, ni siquiera de lectura para anon. Los buckets de cursos son
// privados, con límite y tipos, y una subida firmada (etapa C2) sube un solo objeto. Al final
// borra todo.
```

(`remove` de un path que no existe no da error, así que borrar los paths de los intentos denegados es inocuo.)

- [ ] **Step 4: Verificar la subida firmada contra Storage real**

```bash
node --check scripts/test-aislamiento.mjs
npx tsc --noEmit
npm run test:aislamiento
```

Expected: `Aislamiento OK`, con las verificaciones nuevas en `✓`, en particular "subida firmada: el anónimo sube ese objeto con el token, sin policies (control)". **Si esa falla, detenerse:** la decisión 5 supone que la subida firmada funciona con buckets privados sin policies; avisar a Pablo con el error que imprime `mostrarError` antes de seguir con la Task 3. Si falla solo "el token no sobrescribe el objeto ya subido", anotarlo como riesgo (un token filtrado podría reemplazar el video durante 2 horas) y seguir.

- [ ] **Step 5: Commit**

```bash
git add scripts/setup-storage.mjs src/lib/storage/subidas.ts scripts/test-aislamiento.mjs
git commit -F - <<'EOF'
feat(storage): buckets de cursos con límite y tipos, y subida firmada verificada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Subida directa: actions y componente

**Files:**
- Create: `src/app/admin/cursos/subidas.ts`, `src/components/panel/SubidaDirecta.tsx`

Las actions viven en un módulo propio (no en `actions.ts`): las llama un componente de cliente y devuelven un resultado, mientras que las de `actions.ts` son de formularios y redirigen.

- [ ] **Step 1: Actions**

`src/app/admin/cursos/subidas.ts`:

```ts
"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  enCarpetaDelCurso,
  esPathDeSubida,
  esTipoSubida,
  extensionDe,
  LIMITE_SUBIDA,
  mimeDeSubida,
  pathDeSubida,
  tipoArchivoCurso,
  validarSubida,
  type TipoSubida,
} from "@/lib/cursos/subidas";
import type { ClaveError } from "@/lib/panel/mensajes";
import { tenantDeAccion } from "@/lib/panel/servidor";
import { borrarSubidas, crearSubidaFirmada, infoDeSubida } from "@/lib/storage/subidas";
import { datosDelTenant } from "@/lib/tenant/datos";

/*
 * Subida directa de videos y materiales de un curso: el archivo no pasa por Next.
 * 1) pedirSubida valida el pedido y firma un path que arma el servidor.
 * 2) El navegador sube a Storage con ese token (SubidaDirecta).
 * 3) registrarSubida verifica el objeto subido y lo guarda en el curso.
 * Devuelven un resultado (no redirigen). Los argumentos vienen del navegador: se validan
 * aunque tengan tipo.
 */

export type PedidoSubida = { ok: true; path: string; token: string } | { ok: false; error: ClaveError };
export type RegistroSubida = { ok: true } | { ok: false; error: ClaveError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CursoDeSubida = { id: string; video_storage_path: string | null };

async function cursoDelTenant(tenantId: string, cursoId: unknown): Promise<CursoDeSubida | null> {
  if (typeof cursoId !== "string" || !UUID.test(cursoId)) return null;
  const { data } = await datosDelTenant(tenantId)
    .select("cursos", "id, video_storage_path")
    .eq("id", cursoId.toLowerCase())
    .maybeSingle();
  return (data as unknown as CursoDeSubida | null) ?? null;
}

export async function pedirSubida(cursoId: string, tipo: TipoSubida, nombre: string, tamano: number): Promise<PedidoSubida> {
  const tenant = await tenantDeAccion("cursos");
  if (!esTipoSubida(tipo) || typeof nombre !== "string" || typeof tamano !== "number") return { ok: false, error: "error" };
  const problema = validarSubida(tipo, nombre, tamano);
  if (problema) return { ok: false, error: problema };
  const ext = extensionDe(nombre);
  if (!ext) return { ok: false, error: "archivo_tipo" };
  const curso = await cursoDelTenant(tenant.id, cursoId);
  if (!curso) return { ok: false, error: "id" };
  const path = pathDeSubida(tenant.id, curso.id, tipo, ext, new Date(), randomBytes(8).toString("hex"));
  const { token } = await crearSubidaFirmada(tipo, path);
  return { ok: true, path, token };
}

export async function registrarSubida(cursoId: string, tipo: TipoSubida, path: string, nombre: string): Promise<RegistroSubida> {
  const tenant = await tenantDeAccion("cursos");
  if (!esTipoSubida(tipo) || typeof path !== "string" || typeof nombre !== "string") return { ok: false, error: "error" };
  const curso = await cursoDelTenant(tenant.id, cursoId);
  if (!curso) return { ok: false, error: "id" };
  // El path vuelve del navegador: tiene que tener el formato que firmó pedirSubida para este tenant, curso y tipo.
  if (!esPathDeSubida(path, tenant.id, curso.id, tipo)) return { ok: false, error: "subida_invalida" };
  const info = await infoDeSubida(tipo, path);
  if (!info) return { ok: false, error: "subida_invalida" };
  const descartar = () => borrarSubidas(tipo, [path]).catch(() => undefined);
  // El bucket ya exige su límite y sus tipos; se vuelve a mirar por si cambió su configuración.
  if (info.tamano <= 0 || info.tamano > LIMITE_SUBIDA[tipo] || info.mime !== mimeDeSubida(tipo, path)) {
    await descartar();
    return { ok: false, error: "subida_invalida" };
  }

  const db = datosDelTenant(tenant.id);
  if (tipo === "video") {
    const { error } = await db.update("cursos", { video_storage_path: path }).eq("id", curso.id);
    if (error) {
      await descartar();
      return { ok: false, error: "error" };
    }
    // El video anterior se borra si es de la carpeta de este curso (también uno de antes de C2b).
    const anterior = curso.video_storage_path;
    if (anterior && anterior !== path && enCarpetaDelCurso(anterior, tenant.id, curso.id)) {
      await borrarSubidas("video", [anterior]).catch((e) => console.error("No se pudo borrar el video anterior:", e));
    }
  } else {
    // El nombre visible es el del archivo original (validado de nuevo: viene del navegador).
    const problemaNombre = validarSubida(tipo, nombre, info.tamano);
    if (problemaNombre) {
      await descartar();
      return { ok: false, error: problemaNombre };
    }
    const { error } = await db.insert("archivos_curso", {
      curso_id: curso.id,
      nombre_archivo: nombre.trim(),
      storage_path: path,
      tipo: tipoArchivoCurso(extensionDe(path) ?? ""),
    });
    if (error) {
      await descartar();
      return { ok: false, error: "error" };
    }
  }
  revalidatePath(`/admin/cursos/${curso.id}`);
  revalidatePath("/sitio/[tenant]", "layout");
  return { ok: true };
}
```

- [ ] **Step 2: Componente**

`src/components/panel/SubidaDirecta.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { pedirSubida, registrarSubida } from "@/app/admin/cursos/subidas";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { aceptaSubida, BUCKET_SUBIDA, mimeDeSubida, validarSubida, type TipoSubida } from "@/lib/cursos/subidas";
import { useIdioma, useT } from "@/lib/i18n/cliente";
import { mensajeError, mensajeInfo, type ClaveError } from "@/lib/panel/mensajes";

/**
 * Sube un video o un material del curso directo del navegador a Storage: pide al servidor un
 * path firmado, sube con el token y la publishable key (sin la sesión de Supabase: el token es
 * la única autorización; los buckets son privados y no tienen policies) y avisa al servidor,
 * que verifica el objeto antes de guardarlo en el curso.
 */
export function SubidaDirecta({ id, cursoId, tipo }: { id: string; cursoId: string; tipo: TipoSubida }) {
  const idioma = useIdioma();
  const t = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<ClaveError | null>(null);
  const [listo, setListo] = useState(false);

  async function subir() {
    setError(null);
    setListo(false);
    const archivo = input.current?.files?.[0];
    if (!archivo) {
      setError("archivo_vacio");
      return;
    }
    const problema = validarSubida(tipo, archivo.name, archivo.size);
    const mime = mimeDeSubida(tipo, archivo.name);
    if (problema || !mime) {
      setError(problema ?? "archivo_tipo");
      return;
    }
    setSubiendo(true);
    try {
      const pedido = await pedirSubida(cursoId, tipo, archivo.name, archivo.size);
      if (!pedido.ok) {
        setError(pedido.error);
        return;
      }
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      // Content-Type de la extensión (el bucket solo acepta esos), no el que adivine el navegador.
      const { error: errorSubida } = await supabase.storage
        .from(BUCKET_SUBIDA[tipo])
        .uploadToSignedUrl(pedido.path, pedido.token, archivo.slice(0, archivo.size, mime), { contentType: mime });
      if (errorSubida) {
        setError("subida_fallo");
        return;
      }
      const registro = await registrarSubida(cursoId, tipo, pedido.path, archivo.name);
      if (!registro.ok) {
        setError(registro.error);
        return;
      }
      setListo(true);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setError("subida_fallo");
    } finally {
      setSubiendo(false);
    }
  }

  const etiqueta = tipo === "video" ? t({ es: "Archivo de video", pt: "Arquivo de vídeo" }) : t({ es: "Material", pt: "Material" });
  return (
    <div id={id} className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept={aceptaSubida(tipo)} aria-label={etiqueta} className="font-sans text-sm" />
        <button
          type="button"
          onClick={subir}
          disabled={subiendo}
          className="rounded-full bg-secundario px-4 py-2 font-sans text-sm text-fondo transition hover:bg-secundario-oscuro disabled:opacity-60"
        >
          {t({ es: "Subir", pt: "Enviar" })}
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
          {mensajeError(idioma, error)}
        </p>
      )}
      {listo && (
        <p role="status" className="rounded-lg bg-secundario/10 px-3 py-2 font-sans text-sm text-secundario-oscuro">
          {mensajeInfo(idioma, tipo === "video" ? "video_subido" : "archivo_subido")}
        </p>
      )}
      <LoadingOverlay show={subiendo} label={t({ es: "Subiendo… no cierres esta página.", pt: "Enviando… não feche esta página." })} />
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

Expected: sin errores. (El componente todavía no se usa: lo usa la pantalla del curso en la Task 4.)

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/cursos/subidas.ts src/components/panel/SubidaDirecta.tsx
git commit -F - <<'EOF'
feat(cursos): subida directa a Storage con URL firmada y verificación del objeto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Cursos del panel traducidos

**Files:**
- Create: `src/lib/cursos/textos.ts`
- Rewrite: `src/app/admin/cursos/actions.ts`, `src/app/admin/cursos/page.tsx`, `src/app/admin/cursos/[id]/page.tsx`
- Rewrite: `src/lib/video/provider.ts`, `src/lib/video/supabase-storage.ts`, `src/lib/storage/archivos.ts`
- Delete: `src/lib/storage/nombre-seguro.ts`, `src/lib/storage/nombre-seguro.test.ts`

- [ ] **Step 1: Actions de los formularios**

`src/app/admin/cursos/actions.ts` (reemplazo completo):

```ts
"use server";

import { enCarpetaDelCurso } from "@/lib/cursos/subidas";
import type { ArchivoCurso, Curso } from "@/lib/data/types";
import {
  columnasCurso,
  columnasCursoNuevo,
  esReferenciaEnUso,
  parsearCurso,
  parsearCursoNuevo,
  parsearId,
} from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { borrarArchivoCurso } from "@/lib/storage/archivos";
import { borrarSubidas } from "@/lib/storage/subidas";
import { datosDelTenant } from "@/lib/tenant/datos";

/*
 * Cursos del cliente (formularios). El video y los materiales se suben directo a Storage
 * (subidas.ts); acá se crean, editan y borran cursos y materiales.
 */
const RUTA = "/admin/cursos";
const rutaCurso = (id: string) => `${RUTA}/${id}`;

export async function crearCurso(formData: FormData) {
  const tenant = await tenantDeAccion("cursos");
  const curso = parsearCursoNuevo(formData);
  if (!curso.ok) ir(RUTA, { error: curso.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .insert("cursos", columnasCursoNuevo(curso.valor))
    .select("id")
    .single();
  if (error || !data) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  // El video, los materiales y la oferta se cargan en la edición.
  ir(rutaCurso(data.id), { ok: "creado" });
}

export async function editarCurso(formData: FormData) {
  const tenant = await tenantDeAccion("cursos");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const curso = parsearCurso(formData);
  if (!curso.ok) ir(rutaCurso(id), { error: curso.error });
  const { data, error } = await datosDelTenant(tenant.id).update("cursos", columnasCurso(curso.valor)).eq("id", id).select("id");
  if (error) ir(rutaCurso(id), { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(rutaCurso(id));
  ir(rutaCurso(id), { ok: "guardado" });
}

export async function eliminarCurso(formData: FormData) {
  const tenant = await tenantDeAccion("cursos");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const db = datosDelTenant(tenant.id);
  // Las rutas de los objetos salen de la base del tenant y se leen antes de borrar
  // (los materiales se borran en cascada con el curso).
  const { data: filaCurso } = await db.select("cursos", "video_storage_path").eq("id", id).maybeSingle();
  const { data: filasArchivos } = await db.select("archivos_curso", "storage_path").eq("curso_id", id);
  const { data, error } = await db.delete("cursos").eq("id", id).select("id");
  // Las compras (accesos_curso) referencian el curso sin cascada: un curso vendido no se borra.
  if (esReferenciaEnUso(error)) ir(rutaCurso(id), { error: "curso_con_compras" });
  if (error) ir(rutaCurso(id), { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });

  const video = (filaCurso as unknown as Pick<Curso, "video_storage_path"> | null)?.video_storage_path ?? null;
  const archivos = ((filasArchivos as unknown as Pick<ArchivoCurso, "storage_path">[] | null) ?? [])
    .map((a) => a.storage_path)
    .filter((path) => enCarpetaDelCurso(path, tenant.id, id));
  try {
    if (video && enCarpetaDelCurso(video, tenant.id, id)) await borrarSubidas("video", [video]);
    await borrarSubidas("archivo", archivos);
  } catch (e) {
    console.error("Se borró el curso, pero no todos sus archivos de Storage:", e);
  }
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "eliminado" });
}

export async function eliminarArchivo(formData: FormData) {
  const tenant = await tenantDeAccion("cursos");
  const id = parsearId(formData);
  const cursoId = parsearId(formData, "curso_id");
  if (!id || !cursoId) ir(RUTA, { error: "id" });
  // La ruta del objeto sale de la fila del tenant, no del formulario.
  const { data, error } = await datosDelTenant(tenant.id)
    .delete("archivos_curso")
    .eq("id", id)
    .eq("curso_id", cursoId)
    .select("storage_path");
  if (error) ir(rutaCurso(cursoId), { error: "error" });
  const fila = (data as unknown as Pick<ArchivoCurso, "storage_path">[] | null)?.[0];
  if (!fila) ir(rutaCurso(cursoId), { error: "id" });
  if (enCarpetaDelCurso(fila.storage_path, tenant.id, cursoId)) await borrarArchivoCurso(fila.storage_path);
  revalidarSitio(rutaCurso(cursoId));
  ir(rutaCurso(cursoId), { ok: "eliminado" });
}
```

- [ ] **Step 2: Lista y alta**

`src/lib/cursos/textos.ts` (fuera de `page.tsx`: Next solo admite sus propios exports en un archivo de página):

```ts
import type { CategoriaCurso, EstadoCurso } from "@/lib/data/types";
import type { Textos } from "@/lib/i18n/textos";

/** Nombres de las categorías y estados de un curso en el panel. */
export const CATEGORIA_CURSO: Record<CategoriaCurso, Textos> = {
  publico_general: { es: "Público general", pt: "Público geral" },
  profesional: { es: "Profesional", pt: "Profissional" },
};

export const ESTADO_CURSO: Record<EstadoCurso, Textos> = {
  borrador: { es: "Borrador", pt: "Rascunho" },
  publicado: { es: "Publicado", pt: "Publicado" },
};
```

`src/app/admin/cursos/page.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { BOTON, CAMPO_EN_LINEA, ETIQUETA, FILA, Mensajes, SUBTITULO, TARJETA, TITULO, type ParamsPanel } from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { CATEGORIA_CURSO, ESTADO_CURSO } from "@/lib/cursos/textos";
import { getCursosAdmin } from "@/lib/data/cursos";
import { formatPrecio } from "@/lib/format";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { crearCurso } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Cursos", pt: "Cursos" });
}

export default async function CursosAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("cursos");
  const t = traductor(tenant.idioma);
  const cursos = await getCursosAdmin(tenant.id);
  const pasoPrecio = tenant.moneda === "BRL" ? "0.01" : "1";
  const etiqueta = {
    titulo: t({ es: "Título", pt: "Título" }),
    categoria: t({ es: "Categoría", pt: "Categoria" }),
    precio: t({ es: "Precio", pt: "Preço" }),
  };

  return (
    <div>
      <h1 className={TITULO}>{t({ es: "Cursos", pt: "Cursos" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: "Creá el curso con lo básico; el video, los materiales y la oferta se cargan después, en su edición.",
          pt: "Crie o curso com o básico; o vídeo, os materiais e a oferta são adicionados depois, na edição.",
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-nuevo-curso" action={crearCurso} className={`${TARJETA} flex flex-wrap items-end gap-3`}>
        <input
          name="titulo"
          placeholder={etiqueta.titulo}
          aria-label={etiqueta.titulo}
          required
          maxLength={L.tituloCurso}
          className={`${CAMPO_EN_LINEA} min-w-48 flex-1`}
        />
        <select name="categoria" aria-label={etiqueta.categoria} required defaultValue="publico_general" className={CAMPO_EN_LINEA}>
          <option value="publico_general">{t(CATEGORIA_CURSO.publico_general)}</option>
          <option value="profesional">{t(CATEGORIA_CURSO.profesional)}</option>
        </select>
        <input
          name="precio"
          type="number"
          min={0}
          step={pasoPrecio}
          placeholder={etiqueta.precio}
          aria-label={etiqueta.precio}
          className={`${CAMPO_EN_LINEA} w-32`}
        />
        <label className={ETIQUETA}>
          {t({ es: "Días de acceso", pt: "Dias de acesso" })}
          <input
            name="dias_acceso"
            type="number"
            min={1}
            max={L.diasAccesoMax}
            defaultValue={7}
            className={`${CAMPO_EN_LINEA} ml-2 w-24`}
          />
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Crear", pt: "Criar" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Creando curso…", pt: "Criando curso…" })} />
      </form>

      <div className="mt-6 space-y-3">
        {cursos.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">{t({ es: "Todavía no hay cursos.", pt: "Ainda não há cursos." })}</p>
        )}
        {cursos.map((c) => (
          <Link
            key={c.id}
            href={`/admin/cursos/${c.id}`}
            className={`${FILA} flex flex-wrap items-center justify-between gap-2 p-4 transition hover:border-primario/40`}
          >
            <div>
              <p className="font-serif text-xl text-texto">{c.titulo}</p>
              <p className="font-sans text-xs uppercase tracking-wider text-secundario">
                {`${t(CATEGORIA_CURSO[c.categoria])} · ${t(ESTADO_CURSO[c.estado])}`}
              </p>
            </div>
            <p className="font-sans text-primario-oscuro">{formatPrecio(c.precio, tenant.moneda, tenant.idioma)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Edición, video, materiales y compras**

`src/app/admin/cursos/[id]/page.tsx` (reemplazo completo):

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubidaDirecta } from "@/components/panel/SubidaDirecta";
import { AYUDA, BOTON, CAMPO, CASILLA, ENLACE, ETIQUETA, Mensajes, TARJETA, TITULO, type ParamsPanel } from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { InfoHint } from "@/components/ui/InfoHint";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { LIMITE_SUBIDA } from "@/lib/cursos/subidas";
import { CATEGORIA_CURSO, ESTADO_CURSO } from "@/lib/cursos/textos";
import { getAccesosDeCurso, getArchivosCurso, getCursoAdmin } from "@/lib/data/cursos";
import { LOCALES, traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { editarCurso, eliminarArchivo, eliminarCurso } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<ParamsPanel> };

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Editar curso", pt: "Editar curso" });
}

const MB = 1024 * 1024;

export default async function EditarCursoAdmin({ params, searchParams }: Props) {
  const tenant = await tenantDeSeccion("cursos");
  const t = traductor(tenant.idioma);
  const { id } = await params;
  const curso = await getCursoAdmin(tenant.id, id);
  if (!curso) notFound();
  const [archivos, accesos] = await Promise.all([getArchivosCurso(tenant.id, id), getAccesosDeCurso(tenant.id, id)]);
  const fecha = (iso: string) => new Date(iso).toLocaleDateString(LOCALES[tenant.idioma], { timeZone: tenant.zonaHoraria });
  const pasoPrecio = tenant.moneda === "BRL" ? "0.01" : "1";
  const ahora = new Date();

  return (
    <div className="max-w-2xl">
      <h1 className={TITULO}>{curso.titulo}</h1>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-curso" action={editarCurso} className={`${TARJETA} flex flex-col gap-4`}>
        <input type="hidden" name="id" value={curso.id} />
        <label className={ETIQUETA}>
          {t({ es: "Título", pt: "Título" })}
          <input name="titulo" defaultValue={curso.titulo} required maxLength={L.tituloCurso} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {t({ es: "Descripción", pt: "Descrição" })}
          <textarea name="descripcion" defaultValue={curso.descripcion ?? ""} maxLength={L.texto} rows={3} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {t({
            es: "Vista previa (link de YouTube; se muestran los primeros 30 segundos)",
            pt: "Prévia (link do YouTube; são exibidos os primeiros 30 segundos)",
          })}
          <input
            name="preview_youtube_url"
            type="url"
            defaultValue={curso.preview_youtube_url ?? ""}
            placeholder="https://www.youtube.com/watch?v=..."
            className={CAMPO}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className={`${ETIQUETA} flex-1`}>
            {t({ es: "Categoría", pt: "Categoria" })}
            <select name="categoria" defaultValue={curso.categoria} className={CAMPO}>
              <option value="publico_general">{t(CATEGORIA_CURSO.publico_general)}</option>
              <option value="profesional">{t(CATEGORIA_CURSO.profesional)}</option>
            </select>
          </label>
          <label className={`${ETIQUETA} flex-1`}>
            {t({ es: "Estado", pt: "Status" })}
            <select name="estado" defaultValue={curso.estado} className={CAMPO}>
              <option value="borrador">{t(ESTADO_CURSO.borrador)}</option>
              <option value="publicado">{t(ESTADO_CURSO.publicado)}</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className={`${ETIQUETA} flex-1`}>
            {t({ es: "Precio", pt: "Preço" })}
            <input name="precio" type="number" min={0} step={pasoPrecio} defaultValue={curso.precio} className={CAMPO} />
          </label>
          <label className={`${ETIQUETA} flex-1`}>
            {t({ es: "Días de acceso", pt: "Dias de acesso" })}
            <input name="dias_acceso" type="number" min={1} max={L.diasAccesoMax} defaultValue={curso.dias_acceso} className={CAMPO} />
          </label>
          <label className={`${ETIQUETA} flex-1`}>
            {t({ es: "Orden", pt: "Ordem" })}
            <input name="orden" type="number" min={0} max={L.ordenMax} defaultValue={curso.orden} className={CAMPO} />
          </label>
        </div>
        <label className={CASILLA}>
          <input name="permitir_descarga" type="checkbox" defaultChecked={curso.permitir_descarga} />
          {t({
            es: "Permitir descargar el video (si no, solo se puede ver online)",
            pt: "Permitir baixar o vídeo (se não, só pode ser assistido online)",
          })}
        </label>

        <div className="rounded-xl border border-primario/10 bg-fondo p-4">
          <label className={`${CASILLA} font-medium text-texto`}>
            <input name="oferta_activa" type="checkbox" defaultChecked={curso.oferta_activa} />
            {t({ es: "Oferta activa", pt: "Oferta ativa" })}
          </label>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className={ETIQUETA}>
              {t({ es: "Precio de oferta", pt: "Preço da oferta" })}
              <input
                name="precio_oferta"
                type="number"
                min={0}
                step={pasoPrecio}
                defaultValue={curso.precio_oferta ?? ""}
                className={`${CAMPO} w-40`}
              />
            </label>
            <label className={ETIQUETA}>
              {t({ es: "Desde", pt: "De" })}
              <input name="oferta_desde" type="datetime-local" defaultValue={curso.oferta_desde?.slice(0, 16) ?? ""} className={CAMPO} />
            </label>
            <label className={ETIQUETA}>
              {t({ es: "Hasta", pt: "Até" })}
              <input name="oferta_hasta" type="datetime-local" defaultValue={curso.oferta_hasta?.slice(0, 16) ?? ""} className={CAMPO} />
            </label>
          </div>
        </div>

        <div>
          <SubmitButton className={BOTON}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
        </div>
        <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
      </form>

      <section className={`${TARJETA} mt-6`}>
        <h2 className="font-serif text-2xl text-texto">{t({ es: "Video", pt: "Vídeo" })}</h2>
        <div className="mt-2">
          <InfoHint>
            {t({
              es: `Subilo en MP4 (H.264), comprimido a 720p si podés: es el formato más liviano que se reproduce bien en todos los celulares y navegadores. Hasta ${LIMITE_SUBIDA.video / MB} MB por video.`,
              pt: `Envie em MP4 (H.264), comprimido em 720p se possível: é o formato mais leve que funciona bem em todos os celulares e navegadores. Até ${LIMITE_SUBIDA.video / MB} MB por vídeo.`,
            })}
          </InfoHint>
        </div>
        {curso.video_storage_path ? (
          <p className="mt-2 font-sans text-sm text-texto-suave">
            {t({ es: "Video cargado.", pt: "Vídeo enviado." })}{" "}
            <a
              href={`/admin/cursos/${curso.id}/video-preview`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primario underline"
            >
              {t({ es: "Ver (link temporal)", pt: "Ver (link temporário)" })}
            </a>
          </p>
        ) : (
          <p className="mt-2 font-sans text-sm text-texto-suave">
            {t({ es: "Todavía no se subió el video.", pt: "O vídeo ainda não foi enviado." })}
          </p>
        )}
        <SubidaDirecta id="subida-video" cursoId={curso.id} tipo="video" />
      </section>

      <section className={`${TARJETA} mt-6`}>
        <h2 className="font-serif text-2xl text-texto">{t({ es: "Materiales", pt: "Materiais" })}</h2>
        <p className={AYUDA}>
          {t({
            es: `PDF, PPT o PPTX, hasta ${LIMITE_SUBIDA.archivo / MB} MB cada uno.`,
            pt: `PDF, PPT ou PPTX, até ${LIMITE_SUBIDA.archivo / MB} MB cada um.`,
          })}
        </p>
        <ul className="mt-3 space-y-2">
          {archivos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 font-sans text-sm text-texto-suave">
              {a.nombre_archivo}
              <form id={`form-eliminar-archivo-${a.id}`} action={eliminarArchivo}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="curso_id" value={curso.id} />
                <SubmitButton className={ENLACE}>{t({ es: "Eliminar", pt: "Excluir" })}</SubmitButton>
                <FormPendingOverlay label={t({ es: "Eliminando…", pt: "Excluindo…" })} />
              </form>
            </li>
          ))}
          {archivos.length === 0 && (
            <li className="font-sans text-sm text-texto-suave">{t({ es: "Sin materiales.", pt: "Sem materiais." })}</li>
          )}
        </ul>
        <SubidaDirecta id="subida-archivo" cursoId={curso.id} tipo="archivo" />
      </section>

      <section className={`${TARJETA} mt-6`}>
        <h2 className="font-serif text-2xl text-texto">{t({ es: "Compras", pt: "Compras" })}</h2>
        {accesos.length === 0 ? (
          <p className="mt-2 font-sans text-sm text-texto-suave">
            {t({ es: "Todavía no hay compras de este curso.", pt: "Ainda não há compras deste curso." })}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {accesos.map((a) => {
              const vigente = new Date(a.expira_en) > ahora;
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 font-sans text-sm text-texto-suave">
                  <span>{`${a.cliente_email} · ${t({ es: "comprado el", pt: "comprado em" })} ${fecha(a.comprado_en)}`}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      vigente ? "bg-secundario/15 text-secundario-oscuro" : "bg-texto/5 text-texto-suave"
                    }`}
                  >
                    {`${vigente ? t({ es: "Vigente hasta", pt: "Válido até" }) : t({ es: "Venció el", pt: "Expirou em" })} ${fecha(a.expira_en)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form id="form-eliminar-curso" action={eliminarCurso} className="mt-6">
        <input type="hidden" name="id" value={curso.id} />
        <SubmitButton className={ENLACE}>{t({ es: "Eliminar este curso", pt: "Excluir este curso" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Eliminando curso…", pt: "Excluindo curso…" })} />
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Sacar las subidas por server action**

`src/lib/video/provider.ts` (reemplazo completo):

```ts
/**
 * Punto de swap para el proveedor de video. Hoy: Supabase Storage.
 * Mañana: Bunny/Cloudinary/Mux, sin tocar el resto de la app.
 * Las subidas no pasan por acá: el navegador sube directo a Storage con una URL firmada
 * (src/app/admin/cursos/subidas.ts).
 */
export type VideoProvider = {
  urlFirmada(storagePath: string, segundos?: number): Promise<string>;
  borrar(storagePath: string): Promise<void>;
};
```

`src/lib/video/supabase-storage.ts` (reemplazo completo):

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import type { VideoProvider } from "./provider";

export const BUCKET_VIDEOS = "cursos-videos";

export const supabaseVideoProvider: VideoProvider = {
  async urlFirmada(storagePath, segundos = 300) {
    const db = createAdminClient();
    const { data, error } = await db.storage
      .from(BUCKET_VIDEOS)
      .createSignedUrl(storagePath, segundos);
    if (error || !data) throw new Error(`No se pudo firmar la URL: ${error?.message}`);
    return data.signedUrl;
  },

  async borrar(storagePath) {
    const db = createAdminClient();
    await db.storage.from(BUCKET_VIDEOS).remove([storagePath]);
  },
};
```

`src/lib/storage/archivos.ts` (reemplazo completo):

```ts
import { createAdminClient } from "@/lib/supabase/admin";

export const BUCKET_ARCHIVOS = "cursos-archivos";

export async function urlFirmadaArchivo(storagePath: string, segundos = 300): Promise<string> {
  const db = createAdminClient();
  const { data, error } = await db.storage
    .from(BUCKET_ARCHIVOS)
    .createSignedUrl(storagePath, segundos);
  if (error || !data) throw new Error(`No se pudo firmar la URL: ${error?.message}`);
  return data.signedUrl;
}

export async function borrarArchivoCurso(storagePath: string): Promise<void> {
  const db = createAdminClient();
  await db.storage.from(BUCKET_ARCHIVOS).remove([storagePath]);
}
```

```bash
git rm src/lib/storage/nombre-seguro.ts src/lib/storage/nombre-seguro.test.ts
```

- [ ] **Step 5: Tipos, lint, tests y build**

```bash
grep -rn "nombreSeguro\|subirArchivoCurso\|videoProvider.subir\|150MB\|150 MB" src
npx tsc --noEmit
npx eslint src
npx vitest run
npm run build
```

Expected: el `grep` no encuentra nada; sin errores; tests en PASS; build sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cursos/textos.ts src/app/admin/cursos/actions.ts src/app/admin/cursos/page.tsx "src/app/admin/cursos/[id]/page.tsx" src/lib/video/provider.ts src/lib/video/supabase-storage.ts src/lib/storage/archivos.ts
git commit -F - <<'EOF'
feat(panel): cursos traducidos, con subida directa y error claro al borrar uno vendido

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

(Los dos archivos borrados ya quedaron en el índice con `git rm`.)

---

### Task 5: Favicon por cliente

**Files:**
- Create: `src/lib/tenant/iconos.ts`, `src/lib/tenant/iconos.test.ts`
- Modify: `src/app/sitio/[tenant]/layout.tsx`, `src/lib/panel/metadata.ts`

- [ ] **Step 1: Test que falla**

`src/lib/tenant/iconos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { iconosDeMarca } from "./iconos";

describe("iconosDeMarca", () => {
  it("con logo: favicon e ícono de Apple con el logo del cliente", () => {
    const logo = "https://abc.supabase.co/storage/v1/object/public/sitios/t/logo-1.png";
    expect(iconosDeMarca(logo)).toEqual({ icons: { icon: logo, apple: logo } });
    expect(iconosDeMarca("/brand/horizontal-negro.png")).toEqual({
      icons: { icon: "/brand/horizontal-negro.png", apple: "/brand/horizontal-negro.png" },
    });
  });

  it("sin logo: no define íconos (queda el de la app)", () => {
    expect(iconosDeMarca(null)).toEqual({});
  });
});
```

Run: `npx vitest run src/lib/tenant/iconos.test.ts`
Expected: FAIL (no existe `./iconos`).

- [ ] **Step 2: Implementación**

`src/lib/tenant/iconos.ts`:

```ts
import type { Metadata } from "next";

/**
 * Ícono de la pestaña (favicon) del sitio y del panel de un cliente: su logo, si tiene. Sin
 * logo no se define nada y queda el ícono de la app (src/app/icon.png): Next agrega los
 * íconos de archivo solo si ningún segmento definió `icons`.
 */
export function iconosDeMarca(logoUrl: string | null): Pick<Metadata, "icons"> {
  return logoUrl ? { icons: { icon: logoUrl, apple: logoUrl } } : {};
}
```

En `src/app/sitio/[tenant]/layout.tsx`, reemplazar:

```tsx
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { estiloMarca } from "@/lib/tenant/estilo";
```

por:

```tsx
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { estiloMarca } from "@/lib/tenant/estilo";
import { iconosDeMarca } from "@/lib/tenant/iconos";
```

y reemplazar:

```tsx
    title: { default: titulo, template: `%s · ${tenant.nombre}` },
    description: tenant.marca.tagline ?? undefined,
  };
```

por:

```tsx
    title: { default: titulo, template: `%s · ${tenant.nombre}` },
    description: tenant.marca.tagline ?? undefined,
    ...iconosDeMarca(tenant.marca.logoUrl),
  };
```

En `src/lib/panel/metadata.ts`, reemplazar:

```ts
import { tenantDelHost } from "@/lib/tenant/actual";
```

por:

```ts
import { tenantDelHost } from "@/lib/tenant/actual";
import { iconosDeMarca } from "@/lib/tenant/iconos";
```

y reemplazar:

```ts
  return { title: titulo ? `${t(titulo)} · ${t(PANEL)}` : t(PANEL) };
```

por:

```ts
  return { title: titulo ? `${t(titulo)} · ${t(PANEL)}` : t(PANEL), ...iconosDeMarca(tenant?.marca.logoUrl ?? null) };
```

- [ ] **Step 3: Tests, tipos y build**

```bash
npx vitest run
npx tsc --noEmit
npx eslint src
npm run build
```

Expected: todo en PASS y sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tenant/iconos.ts src/lib/tenant/iconos.test.ts "src/app/sitio/[tenant]/layout.tsx" src/lib/panel/metadata.ts
git commit -F - <<'EOF'
feat(sitio): favicon del sitio y del panel con el logo del cliente

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Verificación de punta a punta

**Files:**
- Modify: `scripts/e2e-cliente.mjs`

- [ ] **Step 1: La E2E suma cursos (subida directa) y favicon**

En `scripts/e2e-cliente.mjs`:

Reemplazar:

```js
// módulos y suspende el cliente. Al final borra todo (también las imágenes del bucket).
```

por:

```js
// módulos y suspende el cliente. Desde la etapa C2b también: cursos en portugués, subida
// directa de un video y un material con URL firmada (como el navegador, con la publishable
// key), borrado de un curso con y sin compras, y el favicon con el logo del cliente.
// Al final borra todo (también las imágenes y los archivos de los buckets).
```

Reemplazar:

```js
const secretoMfa = process.env.MFA_SECRET;
if (!url || !secret || !secretoMfa) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY o MFA_SECRET.");
  process.exit(1);
}
```

por:

```js
const secretoMfa = process.env.MFA_SECRET;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !secret || !secretoMfa || !publishable) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, MFA_SECRET o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}
```

Reemplazar:

```js
  console.log("\nMódulos apagados:");
```

por:

```js
  await pruebaCursos(C, S);

  console.log("\nMódulos apagados:");
```

Agregar, antes de `const hmacEmail = (dominio, e) =>`:

```js
/** Objetos del cliente en los buckets de cursos ({tenant}/{curso}/…), como [bucket, path]. */
async function objetosDeCursos(id = tenantId) {
  if (!id) return [];
  const objetos = [];
  for (const bucket of ["cursos-videos", "cursos-archivos"]) {
    const { data: carpetas, error } = await admin.storage.from(bucket).list(id, { limit: 100 });
    if (error) throw new Error(`listar ${bucket}: ${error.message}`);
    for (const carpeta of carpetas) {
      const { data: archivos, error: errorCarpeta } = await admin.storage.from(bucket).list(`${id}/${carpeta.name}`, { limit: 100 });
      if (errorCarpeta) throw new Error(`listar ${bucket}/${carpeta.name}: ${errorCarpeta.message}`);
      for (const archivo of archivos) objetos.push([bucket, `${id}/${carpeta.name}/${archivo.name}`]);
    }
  }
  return objetos;
}

/** Etapa C2b: cursos en portugués, subida directa a Storage, borrado con y sin compras, y favicon. */
async function pruebaCursos(C, S) {
  console.log("\nCursos:");
  await ok(admin.from("tenants").update({ modulo_cursos: true }).eq("id", tenantId), "activar cursos");
  let pagina = await C.get("/admin/cursos");
  verificar(pagina.status === 200 && pagina.html.includes("Crie o curso com o básico"), "la sección cursos está en portugués", String(pagina.status));
  const nuevo = { titulo: "Curso E2E", categoria: "profesional", precio: "100", dias_acceso: "7" };
  let r = await C.enviar("/admin/cursos", pagina.html, "form-nuevo-curso", { ...nuevo, titulo: "" });
  verificar(destino(r) === "/admin/cursos?error=titulo_curso", "curso sin título: rechazado", resumen(r));
  r = await C.enviar("/admin/cursos", pagina.html, "form-nuevo-curso", nuevo);
  const [curso] = await filas("cursos");
  verificar(!!curso && destino(r) === `/admin/cursos/${curso.id}?ok=creado`, "crea el curso y lleva a su edición", resumen(r));
  if (!curso) throw new Error("no se creó el curso");
  const rutaCurso = `/admin/cursos/${curso.id}`;
  pagina = await C.get(rutaCurso);
  verificar(
    pagina.status === 200 && pagina.html.includes("Até 50 MB por vídeo") && pagina.html.includes('id="subida-video"'),
    "la edición muestra el límite real del video y la subida directa",
    String(pagina.status),
  );

  console.log("\nSubida directa del video:");
  const rutaApp = "admin/cursos/[id]";
  const idPedir = idDeAccionCompilada(rutaApp, "pedirSubida");
  const idRegistrar = idDeAccionCompilada(rutaApp, "registrarSubida");
  const navegador = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
  /** Comienzo de un MP4 (caja ftyp): alcanza para Storage, que mira el Content-Type. */
  const VIDEO = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.alloc(64)]);
  r = await C.accion(rutaCurso, idPedir, [curso.id, "video", "aula.mp4", 60 * 1024 * 1024]);
  verificar(r.valor?.ok === false && r.valor.error === "archivo_grande", "un video de más de 50 MB: rechazado antes de subir", String(r.status));
  r = await C.accion(rutaCurso, idPedir, [curso.id, "video", "aula.exe", 100]);
  verificar(r.valor?.ok === false && r.valor.error === "archivo_tipo", "una extensión no permitida: rechazada", String(r.status));
  const pedirVideo = async (nombre) => {
    const respuesta = await C.accion(rutaCurso, idPedir, [curso.id, "video", nombre, VIDEO.length]);
    return respuesta.valor?.ok ? respuesta.valor : null;
  };
  const pedido = await pedirVideo("aula.mp4");
  verificar(
    !!pedido && pedido.path.startsWith(`${tenantId}/${curso.id}/video-`) && pedido.path.endsWith(".mp4"),
    "el servidor firma un path que arma él, en la carpeta del curso",
  );
  if (!pedido) throw new Error("no se pudo pedir la subida del video");
  const videos = navegador.storage.from("cursos-videos");
  let subida = await videos.uploadToSignedUrl(pedido.path, pedido.token, new Blob(["<html></html>"], { type: "text/html" }));
  verificar(!!subida.error, "el bucket rechaza un tipo no permitido aunque el token sea válido");
  subida = await videos.uploadToSignedUrl(pedido.path, pedido.token, new Blob([VIDEO], { type: "video/mp4" }));
  verificar(!subida.error, "el navegador sube el video con el token y la publishable key", subida.error?.message);
  r = await C.accion(rutaCurso, idRegistrar, [curso.id, "video", `${tenantId}/${curso.id}/../otro/video-1700000000000-0123456789abcdef.mp4`, "aula.mp4"]);
  verificar(r.valor?.ok === false && r.valor.error === "subida_invalida", "registrar un path que no firmó el servidor: rechazado");
  r = await C.accion(rutaCurso, idRegistrar, [curso.id, "video", pedido.path, "aula.mp4"]);
  verificar(r.valor?.ok === true && (await filas("cursos"))[0]?.video_storage_path === pedido.path, "registra el video en el curso", String(r.status));
  r = await C.get(`${rutaCurso}/video-preview`);
  verificar(
    r.status === 307 && r.location.includes("/storage/v1/object/sign/cursos-videos/"),
    "la vista previa redirige a una URL firmada del video",
    String(r.status),
  );

  console.log("\nSubida directa de un material:");
  const PDF = Buffer.from("%PDF-1.4\n%E2E\n");
  r = await C.accion(rutaCurso, idPedir, [curso.id, "archivo", "guia.pdf", PDF.length]);
  const pedidoPdf = r.valor?.ok ? r.valor : null;
  verificar(!!pedidoPdf && pedidoPdf.path.startsWith(`${tenantId}/${curso.id}/archivo-`), "pide la subida de un PDF");
  if (pedidoPdf) {
    subida = await navegador.storage
      .from("cursos-archivos")
      .uploadToSignedUrl(pedidoPdf.path, pedidoPdf.token, new Blob([PDF], { type: "application/pdf" }));
    verificar(!subida.error, "sube el PDF", subida.error?.message);
    r = await C.accion(rutaCurso, idRegistrar, [curso.id, "archivo", pedidoPdf.path, "guia.pdf"]);
    const [archivo] = await filas("archivos_curso");
    verificar(
      r.valor?.ok === true && archivo?.nombre_archivo === "guia.pdf" && archivo.tipo === "pdf" && archivo.storage_path === pedidoPdf.path,
      "registra el material con su nombre",
    );
  }

  console.log("\nReemplazar el video:");
  const pedido2 = await pedirVideo("aula2.webm");
  verificar(!!pedido2 && pedido2.path.endsWith(".webm"), "pide la subida de otro video");
  if (pedido2) {
    subida = await videos.uploadToSignedUrl(pedido2.path, pedido2.token, new Blob([VIDEO], { type: "video/webm" }));
    r = await C.accion(rutaCurso, idRegistrar, [curso.id, "video", pedido2.path, "aula2.webm"]);
    const enBucket = (await objetosDeCursos()).filter(([bucket]) => bucket === "cursos-videos").map(([, path]) => path);
    verificar(
      !subida.error && r.valor?.ok === true && (await filas("cursos"))[0]?.video_storage_path === pedido2.path && enBucket.length === 1 && enBucket[0] === pedido2.path,
      "el video nuevo reemplaza al anterior, que se borra del bucket",
      enBucket.length ? `${enBucket.length} video(s) en el bucket` : "sin videos",
    );
  }

  console.log("\nBorrar el curso:");
  const acceso = await ok(
    admin
      .from("accesos_curso")
      .insert({ tenant_id: tenantId, curso_id: curso.id, cliente_email: "compra-e2e@example.com", expira_en: new Date(Date.now() + 86_400_000).toISOString() })
      .select("id")
      .single(),
    "compra de prueba",
  );
  pagina = await C.get(rutaCurso);
  r = await C.enviar(rutaCurso, pagina.html, "form-eliminar-curso", { id: curso.id });
  verificar(
    destino(r) === `${rutaCurso}?error=curso_con_compras` && (await filas("cursos")).length === 1,
    "un curso con compras no se borra: error claro",
    resumen(r),
  );
  verificar((await C.get(destino(r))).html.includes("Este curso tem compras registradas"), "el mensaje está en portugués");
  await ok(admin.from("accesos_curso").delete().eq("id", acceso.id), "borrar la compra de prueba");
  r = await C.enviar(rutaCurso, pagina.html, "form-eliminar-curso", { id: curso.id });
  const restos = await objetosDeCursos();
  verificar(
    destino(r) === "/admin/cursos?ok=eliminado" && (await filas("cursos")).length === 0 && (await filas("archivos_curso")).length === 0 && restos.length === 0,
    "sin compras: borra el curso, sus materiales y sus archivos de Storage",
    resumen(r),
  );

  console.log("\nFavicon:");
  r = await S.get("/");
  verificar(/<link rel="icon" href="\/icon\.png/.test(r.html), "sin logo, el ícono de la app");
  const pathLogo = `${tenantId}/logo-${Date.now()}.png`;
  await ok(admin.storage.from("sitios").upload(pathLogo, PNG, { contentType: "image/png" }), "logo de prueba");
  const urlLogo = `${PREFIJO_PUBLICO}${pathLogo}`;
  await ok(admin.from("tenant_marca").update({ logo_url: urlLogo }).eq("tenant_id", tenantId), "logo del cliente");
  r = await S.get("/");
  verificar(r.html.includes(`<link rel="icon" href="${urlLogo}"`), "con logo, el favicon del sitio es el logo del cliente");
  r = await C.get("/admin");
  verificar(r.html.includes(`<link rel="icon" href="${urlLogo}"`), "el panel también usa el logo como favicon");
}

```

Reemplazar (limpieza de los buckets de cursos):

```js
  if (!userId) {
    try {
```

por:

```js
  if (id) {
    try {
      for (const [bucket, path] of await objetosDeCursos(id)) {
        const { error } = await admin.storage.from(bucket).remove([path]);
        if (error) throw new Error(`${bucket}: ${error.message}`);
      }
    } catch (e) {
      console.error(`✗ limpieza: archivos de cursos: ${e.message}`);
      fallas++;
    }
  }
  if (!userId) {
    try {
```

Reemplazar:

```js
    listarObjetos(id).then((o) => o.length).catch(() => 1),
```

por:

```js
    listarObjetos(id).then((o) => o.length).catch(() => 1),
    objetosDeCursos(id).then((o) => o.length).catch(() => 1),
```

Reemplazar:

```js
      ? ["servicios", "turnos", "testimonios", "galeria", "preguntas_frecuentes", "intentos_reserva", "tenant_marca", "configuracion_negocio"].map(
          contarTenant,
        )
```

por:

```js
      ? [
          "servicios",
          "turnos",
          "testimonios",
          "galeria",
          "preguntas_frecuentes",
          "intentos_reserva",
          "tenant_marca",
          "configuracion_negocio",
          "cursos",
          "archivos_curso",
          "accesos_curso",
        ].map(contarTenant)
```

- [ ] **Step 2: Tipos, lint, tests y build**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
node --check scripts/e2e-cliente.mjs
npm run build
```

Expected: sin errores; Vitest con todos los tests en PASS, también `cursos/subidas`, `tenant/iconos` y los casos nuevos de `panel/formularios` y `panel/mensajes` (y sin `storage/nombre-seguro`, que se borró).

- [ ] **Step 3: Pruebas de punta a punta en desarrollo**

`docker compose stop` y levantar el servidor de desarrollo con la salida en `$LOG` (con `CABECERA_IP_CONFIABLE=x-real-ip` en su entorno; sin la cuenta de Gmail de la plataforma en el `.env.local`):

```bash
for k in PLATFORM_GMAIL_USER PLATFORM_GMAIL_APP_PASSWORD; do grep -q "^$k=." .env.local && echo "$k: presente" || echo "$k: vacío"; done
node --env-file=.env.local scripts/e2e-cliente.mjs "$(cygpath -w "$LOG")"
node --env-file=.env.local scripts/e2e-master.mjs "$(cygpath -w "$LOG")"
node --env-file=.env.local scripts/e2e-login.mjs dev "$(cygpath -w "$LOG")"
```

Expected: las dos variables `vacío` y las tres E2E con `E2E OK` (`e2e-cliente.mjs` con las verificaciones nuevas de cursos y favicon en `✓`). Si algo falla, revisar el log (`tail -n 80 "$LOG"`) antes de tocar código. Si `e2e-cliente.mjs` no encuentra `pedirSubida` en el manifiesto, comprobar con `ls ".next/dev/server/app/admin/cursos/[id]/page/"` que el servidor compiló la pantalla del curso (la E2E la pide antes).

- [ ] **Step 4: Aislamiento**

Run: `npm run test:aislamiento`
Expected: `Aislamiento OK`.

Detener el servidor de desarrollo (solo su árbol de procesos).

- [ ] **Step 5: Docker (producción)**

```bash
docker compose up -d --build --force-recreate
curl -s -o /dev/null -w 'docker gisel: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/
curl -s -o /dev/null -w 'docker gisel cursos: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/cursos
curl -s -o /dev/null -w 'docker gisel admin login: %{http_code}\n' -H "Host: gisel.localhost:3000" http://localhost:3000/admin/login
node --env-file=.env.local scripts/e2e-login.mjs docker
```

Expected: los tres `200` y `E2E OK`.

- [ ] **Step 6: Prueba manual en el navegador (para Pablo)**

La E2E sube un archivo chico como lo haría el navegador. Esta lista cubre lo que solo se ve con JavaScript real. Con `npm run dev` y el contenedor detenido.

1. `http://gisel.localhost:3000/admin/cursos`: la lista en español; crear un curso de prueba lleva a su edición con "Listo, se agregó.".
2. **Video:** elegir un MP4 de unos MB y "Subir": aparece el overlay "Subiendo… no cierres esta página.", después "Video subido." y "Video cargado. Ver (link temporal)", que reproduce el video. En la pestaña Red del navegador, el archivo va directo a `<proyecto>.supabase.co/storage/v1/object/upload/sign/cursos-videos/…` (no a `/admin/...`).
3. **Límites:** un video de más de 50 MB muestra el error de tamaño sin subir nada; un `.avi` o un `.exe` (forzando "Todos los archivos" en el selector) muestra el de tipo.
4. **Material:** subir un PDF: aparece en la lista con su nombre; eliminarlo lo saca de la lista.
5. **Reemplazar el video** y comprobar en Supabase → Storage → cursos-videos que en la carpeta del curso queda uno solo.
6. **Borrar** el curso de prueba: se borra con sus archivos (en Storage la carpeta queda vacía). Un curso con compras muestra el aviso y no se borra.
7. Con un cliente de Brasil (ver el plan de C2a): la sección Cursos en portugués.
8. **Favicon:** en la pestaña del navegador, el sitio y el panel de un cliente con logo muestran su logo; uno sin logo, el ícono de la app.

**Checklist de configuración (para Pablo):**

- [ ] **Producción:** correr `node --env-file=.env.local scripts/setup-storage.mjs` contra el proyecto de producción (fija límite y tipos de los buckets de cursos) y reconstruir la imagen.
- [ ] **Supabase → Storage → Settings:** el límite global de tamaño por archivo tiene que ser al menos 50 MB (es el máximo del plan Free). Para videos más grandes: plan Pro, subir `LIMITE_SUBIDA.video` y el bucket, y pasar a subidas reanudables (no incluido).
- [ ] **Supabase → Storage → cursos-videos y cursos-archivos:** privados, con su límite y tipos, y ninguna policy en `storage.objects` para `anon` ni `authenticated`.
- [ ] **Logo de Gisel como favicon:** su logo es horizontal (`/brand/horizontal-negro.png`); como favicon se ve chico. Si molesta, subir desde el master un logo cuadrado (o pedir un campo de ícono aparte, no incluido).
- [ ] **Archivos huérfanos:** si alguien sube un archivo y cierra la página antes de que se registre, el objeto queda en el bucket sin curso. Revisar de vez en cuando o esperar la limpieza automática (etapa E).

- [ ] **Step 7: Commit**

```bash
git add scripts/e2e-cliente.mjs
git status --short   # .env.local y docs/resumen-arquitectura-y-desarrollo.md NO deben estar en staged
git commit -F - <<'EOF'
test(cursos): la E2E del panel cubre la subida directa, el borrado y el favicon

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Self-review

**Cobertura del spec y de las decisiones:**

| Requisito | Task |
|---|---|
| §7 Panel del cliente: Cursos, en el idioma del cliente | 1 (mensajes), 4, 6 |
| §7 / §5 Cursos solo con su módulo, también en el servidor | C2a Task 5 (`tenantDeSeccion`/`tenantDeAccion`), 3 (`pedirSubida` y `registrarSubida` con `tenantDeAccion`), 4 |
| §2 El cliente edita cursos (lista blanca) | 1 (`parsearCursoNuevo`, `parsearCurso`), 4 |
| §4.2 Archivos de cursos en `cursos-videos/{tenant_id}/…` y `cursos-archivos/{tenant_id}/…` | 1 (`pathDeSubida`), 3, 6 |
| Decisión 5: subida directa con URL firmada, verificada con buckets privados sin policies; registro después de verificar el objeto (existe, tamaño, tipo) | 2 (aislamiento: control positivo y negativos), 3 (`registrarSubida`), 6 |
| Decisión 5: sin "150MB" engañoso; `bodySizeLimit` en 3 MB | 1 (`LIMITE_SUBIDA`), 2 (bucket), 4 (texto real), 6 |
| Decisión 6: borrar un curso con compras da un error claro | 4 (`curso_con_compras`), 6 |
| Decisión 6: favicon por cliente con el logo | 5, 6 |
| §4.3 / §13 Aislamiento: nadie sube a los buckets de cursos sin firma; un token sube un solo objeto | 2 |

**Queda para D:** Mercado Pago OAuth y el resto de la etapa D. **Queda para E:** limpieza de objetos huérfanos de subidas que no se registraron.

**Tipos consistentes entre tasks:**

- `TipoSubida` (`"video" | "archivo"`) es el argumento de `pedirSubida`, `registrarSubida`, `crearSubidaFirmada`, `infoDeSubida`, `borrarSubidas`, de la prop `tipo` de `SubidaDirecta` y de los arreglos que manda la E2E (`[cursoId, "video", nombre, tamano]`, `[cursoId, "video", path, nombre]`).
- `ProblemaSubida` (`archivo_vacio`, `nombre_archivo`, `archivo_grande`, `archivo_tipo`) ⊂ `ClaveError` (el test de mensajes lo exige por tipos), así `pedirSubida` devuelve `{ ok: false, error: problema }` sin conversión.
- `PedidoSubida`/`RegistroSubida` usan `ClaveError`; `SubidaDirecta` los muestra con `mensajeError(idioma, …)`.
- `BUCKET_SUBIDA` y `LIMITE_SUBIDA`/`MIME_SUBIDA` (`cursos/subidas.ts`) tienen los mismos valores que `scripts/setup-storage.mjs` y `BUCKETS_CURSOS` de `test-aislamiento.mjs` (los scripts no pueden importar TypeScript: el test de aislamiento compara el bucket real con esos valores).
- `FormCursoNuevo`/`FormCurso` → `columnasCursoNuevo`/`columnasCurso` nombran columnas reales de `cursos` (consultadas); `CategoriaCurso`/`EstadoCurso` son los tipos de `data/types.ts`, los mismos que los `check` de la base.
- Ids que lee la E2E: `form-nuevo-curso`, `form-eliminar-curso`, `subida-video` (además existen `form-curso`, `form-eliminar-archivo-<id>` y `subida-archivo`). Campos: `titulo`, `categoria`, `precio`, `dias_acceso`, `descripcion`, `preview_youtube_url`, `estado`, `orden`, `permitir_descarga`, `oferta_activa`, `precio_oferta`, `oferta_desde`, `oferta_hasta`, `id`, `curso_id`.
- `iconosDeMarca` devuelve `Pick<Metadata, "icons">` y se esparce en los dos `generateMetadata`.

**Orden y compilación:**

- Task 1: puro con tests (usa `LIMITES_PANEL`, `mensajes` y `formularios` de C2a).
- Task 2: scripts y `storage/subidas.ts` (usa 1); la verificación real de la subida firmada va **antes** de construir encima.
- Task 3: actions nuevas en su propio módulo y el componente (todavía sin usar: compila).
- Task 4: pantallas y actions de formularios; saca lo que queda sin uso (`VideoProvider.subir`, `subirArchivoCurso`, `nombre-seguro`) en la misma task en que deja de usarse.
- Task 5: favicon. Task 6: E2E y verificación final.
- `tsc` queda en verde al final de cada task.

**Sin placeholders:** todo archivo nuevo o reescrito tiene su contenido completo, con los textos en español y portugués; las ediciones puntuales indican el texto exacto a buscar y a poner.

**Riesgos que quedan abiertos:**

- **Subida firmada con buckets privados sin policies:** verificada contra Storage real en la Task 2 antes de usarla. Si Supabase cambia el comportamiento de `upload/sign`, falla el control positivo del aislamiento (y la E2E) y no la producción en silencio.
- **Token filtrado:** vale 2 horas para un solo path, no sobrescribe (se verifica) y lo que suba solo se registra si `registrarSubida` lo valida; un objeto no registrado queda huérfano (limpieza en la etapa E).
- **Videos de más de 50 MB:** el plan Free no los acepta. Hace falta plan Pro y subidas reanudables (TUS), fuera de C2b.
- **Sin bytes mágicos en videos y materiales:** el bucket exige el Content-Type declarado, no el contenido real. Los objetos son privados y solo se sirven con URL firmada a quien compró el curso, así que el riesgo es bajo (a diferencia de las imágenes públicas de `sitios`).
- **Fechas de la oferta sin zona horaria** (como antes de C2b): el `datetime-local` se guarda como texto y Postgres lo interpreta en UTC. No cambia en C2b; conviene convertirlo con la zona del cliente más adelante.
- **Favicon con un logo horizontal:** se ve chico (Gisel). Un campo de ícono propio queda para más adelante.
