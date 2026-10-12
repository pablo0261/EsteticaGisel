import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_MFA, verificarMfa } from "@/lib/auth/cookie-mfa";
import { sesionConPassword } from "@/lib/auth/primer-factor";
import { decidirAcceso, rutaDelArea, rutaRelativa, type TipoArea } from "@/lib/auth/rutas";

type Opciones = {
  tipo: TipoArea;
  /** Cabeceras que se reenvían a la app (el proxy ya les quitó las que el cliente no controla). */
  cabeceras: Headers;
  /** Ruta interna a la que se reescribe (área master). Sin ella, el request sigue en su ruta. */
  reescribirA?: URL;
};

/**
 * Refresca la sesión de Supabase y protege el área (panel del cliente o master): exige
 * sesión válida y la cookie mfa de esa sesión, salvo en las pantallas de ingreso
 * (decidirAcceso).
 */
export async function protegerArea(request: NextRequest, { tipo, cabeceras, reescribirA }: Opciones) {
  const continuar = () =>
    reescribirA
      ? NextResponse.rewrite(reescribirA, { request: { headers: cabeceras } })
      : NextResponse.next({ request: { headers: cabeceras } });
  let response = continuar();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // La cookie refrescada también tiene que llegar a la app en este mismo request.
          cabeceras.set("cookie", request.headers.get("cookie") ?? "");
          response = continuar();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() valida la sesión contra Supabase (detecta sesiones cerradas o revocadas);
  // getClaims() da el session_id del JWT, al que está atada la cookie mfa. Una sesión que
  // no se inició con contraseña (magic link, OTP) cuenta como sin sesión.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const claims = user ? (await supabase.auth.getClaims()).data?.claims : undefined;
  const haySesion = Boolean(user && claims && claims.sub === user.id && sesionConPassword(claims));
  const mfaValida =
    haySesion &&
    verificarMfa(process.env.MFA_SECRET, request.cookies.get(COOKIE_MFA)?.value, claims?.sub, claims?.session_id);

  const decision = decidirAcceso(rutaRelativa(tipo, request.nextUrl.pathname), { haySesion, mfaValida });
  if (decision.tipo === "seguir") return response;

  const url = request.nextUrl.clone();
  url.pathname = rutaDelArea(tipo, decision.a);
  url.search = "";
  const redireccion = NextResponse.redirect(url);
  // Si Supabase refrescó la sesión, las cookies nuevas viajan también en la redirección.
  response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
  return redireccion;
}
