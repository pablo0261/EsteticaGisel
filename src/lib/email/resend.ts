export function isEmailConfigurado(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !!key && key !== "re_xxx" && key !== "xxx";
}

export async function enviarEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend rechazó el email: ${res.status} ${body}`);
  }
}
