import Link from "next/link";
import { T } from "@/lib/i18n/cliente";

/** notFound() en una página del panel (sección de un módulo apagado o elemento inexistente). */
export default function PanelNoEncontrado() {
  return (
    <div className="py-16 text-center">
      <h1 className="font-serif text-3xl text-texto">
        <T es="Página no encontrada" pt="Página não encontrada" />
      </h1>
      <p className="mt-3 font-sans text-texto-suave">
        <T
          es="Esta sección no existe o no está habilitada para tu sitio."
          pt="Esta seção não existe ou não está habilitada para o seu site."
        />
      </p>
      <Link href="/admin" className="mt-6 inline-block font-sans text-sm text-primario hover:text-primario-oscuro">
        <T es="Volver al panel" pt="Voltar ao painel" />
      </Link>
    </div>
  );
}
