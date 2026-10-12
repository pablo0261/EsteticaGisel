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
