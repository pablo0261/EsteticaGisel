import { VIGENCIA_CODIGO_MS } from "@/lib/auth/codigos";
import { traductor } from "@/lib/i18n/textos";
import { botonMarca, coloresSeguros, escaparHtml, layoutMarca, type MarcaEmail } from "./layout-marca";

/** Emails de login y contraseña: salen siempre por la cuenta de la plataforma (spec 10). */
export type EmailAuth = { asunto: string; html: string; texto: string };

const MINUTOS_CODIGO = VIGENCIA_CODIGO_MS / 60_000;

/** El asunto no lleva el código, para que no aparezca en las notificaciones. */
export function plantillaCodigoLogin(marca: MarcaEmail, codigo: string): EmailAuth {
  const t = traductor(marca.idioma);
  const { colorPrimario, colorSecundario } = coloresSeguros(marca.colores);
  const intro = (nombre: string) =>
    t({
      es: `Usá este código para terminar de ingresar al panel de ${nombre}:`,
      pt: `Use este código para concluir o acesso ao painel de ${nombre}:`,
    });
  const vence = t({ es: `Vence en ${MINUTOS_CODIGO} minutos.`, pt: `Expira em ${MINUTOS_CODIGO} minutos.` });
  const aviso = t({
    es: "Si no intentaste ingresar, ignorá este email y cambiá tu contraseña.",
    pt: "Se não foi você que tentou entrar, ignore este e-mail e altere sua senha.",
  });
  return {
    asunto: t({ es: `Tu código de acceso a ${marca.nombre}`, pt: `Seu código de acesso a ${marca.nombre}` }),
    html: layoutMarca(marca, {
      titulo: t({ es: "Tu código de acceso", pt: "Seu código de acesso" }),
      cuerpoHtml: `<p style="margin:0 0 16px;">${intro(escaparHtml(marca.nombre))}</p>
        <p style="margin:0 0 16px; font-family:'Courier New', Courier, monospace; font-size:34px; font-weight:700; letter-spacing:8px; text-align:center; color:${colorPrimario};">${escaparHtml(codigo)}</p>
        <p style="margin:0 0 8px;">${vence}</p>
        <p style="margin:0; font-size:13px; color:${colorSecundario};">${aviso}</p>`,
    }),
    texto: [intro(marca.nombre), codigo, vence, aviso].join("\n\n"),
  };
}

export function plantillaRecuperacion(marca: MarcaEmail, link: string): EmailAuth {
  const t = traductor(marca.idioma);
  const { colorSecundario } = coloresSeguros(marca.colores);
  const intro = (nombre: string) =>
    t({
      es: `Recibimos un pedido para restablecer la contraseña de tu cuenta en ${nombre}.`,
      pt: `Recebemos um pedido para redefinir a senha da sua conta em ${nombre}.`,
    });
  const boton = t({ es: "Elegir contraseña nueva", pt: "Escolher nova senha" });
  // 1 hora: "Email OTP Expiration" por defecto de Supabase Auth (3600 s).
  const vence = t({
    es: "El link se puede usar una sola vez y vence en 1 hora.",
    pt: "O link pode ser usado uma única vez e expira em 1 hora.",
  });
  const aviso = t({
    es: "Si no lo pediste, ignorá este email: tu contraseña no cambia.",
    pt: "Se você não pediu, ignore este e-mail: sua senha não muda.",
  });
  return {
    asunto: t({ es: `Restablecé tu contraseña de ${marca.nombre}`, pt: `Redefina sua senha de ${marca.nombre}` }),
    html: layoutMarca(marca, {
      titulo: t({ es: "Restablecé tu contraseña", pt: "Redefina sua senha" }),
      cuerpoHtml: `<p style="margin:0 0 20px;">${intro(escaparHtml(marca.nombre))}</p>
        ${botonMarca(marca, boton, link)}
        <p style="margin:20px 0 8px;">${vence}</p>
        <p style="margin:0; font-size:13px; color:${colorSecundario};">${aviso}</p>`,
    }),
    texto: [intro(marca.nombre), `${boton}: ${link}`, vence, aviso].join("\n\n"),
  };
}
