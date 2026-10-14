"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

const PESTANAS = [
  { segmento: null, etiqueta: "Datos" },
  { segmento: "marca", etiqueta: "Marca" },
  { segmento: "textos", etiqueta: "Textos y contacto" },
  { segmento: "modulos", etiqueta: "Módulos" },
  { segmento: "usuario", etiqueta: "Usuario" },
  { segmento: "credenciales", etiqueta: "Credenciales" },
] as const;

/** Pestañas de la edición de un cliente. La activa sale del segmento (null = Datos). */
export function PestanasCliente({ slug }: { slug: string }) {
  const activo = useSelectedLayoutSegment();
  return (
    <nav aria-label="Secciones del cliente" className="mt-6 flex flex-wrap gap-1 border-b border-primario/15 font-sans text-sm">
      {PESTANAS.map((p) => {
        const href = `/clientes/${slug}${p.segmento ? `/${p.segmento}` : ""}`;
        const seleccionada = activo === p.segmento;
        return (
          <Link
            key={href}
            href={href}
            aria-current={seleccionada ? "page" : undefined}
            className={
              seleccionada
                ? "-mb-px border-b-2 border-primario px-4 py-2 font-medium text-texto"
                : "px-4 py-2 text-texto-suave hover:text-primario"
            }
          >
            {p.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
