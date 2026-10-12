import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase y protege /admin.
 * `headers` son las cabeceras que se reenvían a la app (el proxy les quita las que el
 * cliente no debe controlar, como x-tenant-slug); por defecto, las del request.
 */
export async function updateSession(request: NextRequest, headers?: Headers) {
  const cabeceras = headers ?? request.headers;
  let response = NextResponse.next({ request: { headers: cabeceras } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Con cabeceras propias, la cookie refrescada hay que copiarla también al header
          // para que llegue a la app en este mismo request.
          if (headers) headers.set("cookie", request.headers.get("cookie") ?? "");
          response = NextResponse.next({ request: { headers: cabeceras } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === "/admin/login";

  if (!isLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}
