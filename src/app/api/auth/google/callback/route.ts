import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google-calendar/client";

/**
 * Callback de una sola vez: canjea el "code" por tokens y muestra el
 * refresh_token en pantalla para copiarlo a GOOGLE_REFRESH_TOKEN en .env.
 * No se persiste en la base — es un paso manual de configuración inicial.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return htmlResponse(`<p>Google devolvió un error: <code>${escapeHtml(error)}</code></p>`);
  }
  if (!code) {
    return htmlResponse("<p>Falta el parámetro <code>code</code>.</p>", 400);
  }

  try {
    const { refreshToken } = await exchangeCodeForTokens(code);
    if (!refreshToken) {
      return htmlResponse(
        `<p>Google no devolvió un refresh token (esto pasa si ya se autorizó antes).
         Revocá el acceso en <a href="https://myaccount.google.com/permissions" target="_blank">
         myaccount.google.com/permissions</a> y volvé a intentar.</p>`,
      );
    }
    return htmlResponse(`
      <p>✅ Autorización exitosa. Copiá este valor en <code>.env.local</code> como
      <code>GOOGLE_REFRESH_TOKEN</code>:</p>
      <pre style="background:#f6f1ea;padding:16px;border-radius:8px;word-break:break-all;">${escapeHtml(refreshToken)}</pre>
      <p>Después reiniciá el servidor (<code>npm run dev</code>).</p>
    `);
  } catch (e) {
    return htmlResponse(`<p>Error al canjear el code: ${escapeHtml((e as Error).message)}</p>`, 500);
  }
}

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlResponse(bodyHtml: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="es-AR"><body style="font-family: sans-serif; max-width: 560px; margin: 60px auto;">${bodyHtml}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
