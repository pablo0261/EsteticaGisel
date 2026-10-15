import { traducir, type Idioma } from "@/lib/i18n/textos";

/**
 * Botón flotante de WhatsApp (módulo whatsapp). La URL viene de whatsappLink (número del
 * tenant y mensaje precargado). Usa el color primario de la marca, cuyo contraste con el texto
 * de los botones ya valida el master.
 */
export function BotonWhatsapp({ url, idioma }: { url: string; idioma: Idioma }) {
  const etiqueta = traducir(idioma, { es: "Escribinos por WhatsApp", pt: "Fale com a gente no WhatsApp" });
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={etiqueta}
      title={etiqueta}
      className="fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primario text-fondo shadow-lg transition hover:bg-primario-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
    >
      <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    </a>
  );
}
