import { LOCALES, type Idioma } from "@/lib/i18n/textos";
import { COLORES_PLATAFORMA, NOMBRE_PLATAFORMA } from "@/lib/plataforma";
import { esColorHex, type ColoresMarca } from "@/lib/tenant/estilo";
import type { Tenant } from "@/lib/tenant/tipos";

/**
 * Layout de email con la marca del tenant: tablas y estilos inline, que es lo que
 * soportan los clientes de email. Lo usan el login y los emails de turnos y cursos.
 */
export type MarcaEmail = {
  nombre: string;
  idioma: Idioma;
  colores: ColoresMarca;
  /** URL absoluta del logo, o null para mostrar el nombre. */
  logoUrl: string | null;
};

export const MARCA_PLATAFORMA: MarcaEmail = {
  nombre: NOMBRE_PLATAFORMA,
  idioma: "es",
  colores: COLORES_PLATAFORMA,
  logoUrl: null,
};

const FONT_SERIF = "Georgia, 'Times New Roman', serif";
const FONT_SANS = "Helvetica, Arial, sans-serif";

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Colores listos para un style inline: un valor inválido cae al de la plataforma. */
export function coloresSeguros(colores: ColoresMarca): ColoresMarca {
  const elegir = (campo: keyof ColoresMarca) =>
    esColorHex(colores[campo]) ? colores[campo].trim() : COLORES_PLATAFORMA[campo];
  return {
    colorPrimario: elegir("colorPrimario"),
    colorSecundario: elegir("colorSecundario"),
    colorFondo: elegir("colorFondo"),
    colorTexto: elegir("colorTexto"),
  };
}

/** URL absoluta del logo. Las rutas del sitio ("/tenants/<slug>/…") se completan con su URL. */
export function logoAbsoluto(logo: string | null, urlBase: string): string | null {
  if (!logo) return null;
  if (/^https?:\/\//i.test(logo)) return logo;
  if (logo.startsWith("/") && !logo.startsWith("//")) return `${urlBase.replace(/\/+$/, "")}${logo}`;
  return null;
}

export function marcaEmailDeTenant(tenant: Tenant, urlBase: string): MarcaEmail {
  return {
    nombre: tenant.nombre,
    idioma: tenant.idioma,
    colores: {
      colorPrimario: tenant.marca.colorPrimario,
      colorSecundario: tenant.marca.colorSecundario,
      colorFondo: tenant.marca.colorFondo,
      colorTexto: tenant.marca.colorTexto,
    },
    logoUrl: logoAbsoluto(tenant.marca.logoUrl, urlBase),
  };
}

export function botonMarca(marca: MarcaEmail, texto: string, url: string): string {
  const c = coloresSeguros(marca.colores);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
      <tr>
        <td style="background-color:${c.colorPrimario}; border-radius:999px;">
          <a href="${escaparHtml(url)}" style="display:inline-block; padding:12px 28px; font-family:${FONT_SANS}; font-size:14px; font-weight:600; color:${c.colorFondo}; text-decoration:none;">${escaparHtml(texto)}</a>
        </td>
      </tr>
    </table>`;
}

/** El título y el nombre se escapan acá; cuerpoHtml lo arma (y escapa) cada plantilla. */
export function layoutMarca(marca: MarcaEmail, contenido: { titulo: string; cuerpoHtml: string }): string {
  const c = coloresSeguros(marca.colores);
  const nombre = escaparHtml(marca.nombre);
  const titulo = escaparHtml(contenido.titulo);
  const encabezado = marca.logoUrl
    ? `<img src="${escaparHtml(marca.logoUrl)}" alt="${nombre}" width="200" style="display:block; max-width:200px; height:auto; border:0;" />`
    : `<span style="font-family:${FONT_SERIF}; font-size:26px; color:${c.colorTexto};">${nombre}</span>`;
  return `<!doctype html>
<html lang="${LOCALES[marca.idioma]}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${titulo}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${c.colorFondo};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${c.colorFondo};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td align="center" style="padding-bottom:28px;">${encabezado}</td>
            </tr>
            <tr>
              <td style="background-color:#ffffff; border-radius:16px; padding:36px 32px; border-top:4px solid ${c.colorPrimario};">
                <h1 style="margin:0 0 16px; font-family:${FONT_SERIF}; font-size:24px; font-weight:500; color:${c.colorPrimario};">${titulo}</h1>
                <div style="font-family:${FONT_SANS}; font-size:15px; line-height:1.7; color:${c.colorTexto};">
                  ${contenido.cuerpoHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:28px; font-family:${FONT_SANS}; font-size:12px; letter-spacing:0.05em; text-transform:uppercase; color:${c.colorSecundario};">${nombre}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
