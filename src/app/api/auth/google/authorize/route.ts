import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google-calendar/client";

/** Punto de entrada para que Gisel autorice el acceso a su Google Calendar. */
export function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId === "xxx.apps.googleusercontent.com") {
    return NextResponse.json(
      { error: "Falta configurar GOOGLE_CLIENT_ID en el servidor." },
      { status: 500 },
    );
  }
  const url = getAuthUrl({
    clientId,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });
  return NextResponse.redirect(url);
}
