import "server-only";
import nodemailer from "nodemailer";
import { protocoloPlataforma } from "@/lib/auth/cookies";
import { modoEnvio, type ModoEnvio } from "@/lib/auth/envio";
import type { EmailAuth } from "./plantillas-auth";

/** ¿Está la cuenta de Gmail de la plataforma (usuario, contraseña de aplicación y remitente)? */
export function plataformaConfigurada(): boolean {
  return (
    !!process.env.PLATFORM_GMAIL_USER && !!process.env.PLATFORM_GMAIL_APP_PASSWORD && !!process.env.PLATFORM_EMAIL_FROM
  );
}

export function modoEnvioActual(): ModoEnvio {
  return modoEnvio({
    configurado: plataformaConfigurada(),
    produccion: process.env.NODE_ENV === "production",
    // Con los mismos valores por defecto que urlDelTenant.
    protocolo: protocoloPlataforma(),
    dominio: process.env.PLATFORM_DOMAIN || "localhost:3000",
  });
}

/**
 * Envía un email de login o de contraseña desde la cuenta de la plataforma. En desarrollo
 * local y sin cuenta, imprime avisoConsola en la consola del servidor y sigue. En otro caso
 * sin cuenta (modoEnvio), lanza. remitente: nombre visible (el del tenant); sin él, PLATFORM_EMAIL_FROM.
 */
export async function entregarEmailAuth(opts: {
  para: string;
  email: EmailAuth;
  remitente?: string;
  avisoConsola: string;
}): Promise<void> {
  const modo = modoEnvioActual();
  if (modo === "bloqueado") throw new Error("El envío de códigos no está configurado");
  if (modo === "consola") {
    console.log(`\n${opts.avisoConsola}\n`);
    return;
  }
  const usuario = process.env.PLATFORM_GMAIL_USER!;
  const transporte = nodemailer.createTransport({
    service: "gmail",
    auth: { user: usuario, pass: process.env.PLATFORM_GMAIL_APP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  await transporte.sendMail({
    from: opts.remitente ? { name: opts.remitente, address: usuario } : process.env.PLATFORM_EMAIL_FROM!,
    to: opts.para,
    subject: opts.email.asunto,
    html: opts.email.html,
    text: opts.email.texto,
  });
}
