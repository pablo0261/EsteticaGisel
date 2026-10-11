import nodemailer from "nodemailer";

export function isEmailConfigurado(): boolean {
  return !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
}

/** Envía por SMTP de Gmail con una contraseña de aplicación (requiere 2FA en la cuenta). */
export async function enviarEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
