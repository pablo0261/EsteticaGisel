import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolverHost, configHost } from "@/lib/tenant/host";

/**
 * Enruta por subdominio: <slug>.<dominio>/… se reescribe a /sitio/<slug>/…
 * /admin queda en su ruta (resuelve el tenant por host) y /api atiende cualquier host.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Las rutas internas por tenant solo se alcanzan por reescritura.
  if (path === "/sitio" || path.startsWith("/sitio/")) {
    return new NextResponse(null, { status: 404 });
  }
  if (path.startsWith("/api/")) return NextResponse.next();

  const destino = resolverHost(request.headers.get("host") ?? "", configHost());
  if (destino.tipo !== "tenant") {
    // El panel master (app.) y la página del producto llegan en la etapa C.
    return new NextResponse("No encontrado", { status: 404 });
  }

  if (path === "/admin" || path.startsWith("/admin/")) return updateSession(request);

  const url = request.nextUrl.clone();
  url.pathname = `/sitio/${destino.slug}${path === "/" ? "" : path}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Todo menos estáticos de Next y archivos con extensión (imágenes de public/).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
