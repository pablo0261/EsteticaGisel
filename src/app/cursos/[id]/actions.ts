"use server";

import { getCursoPublico } from "@/lib/data/cursos";
import { precioEfectivo } from "@/lib/cursos/reglas";
import { isMpConfigurado, crearPreferencia } from "@/lib/mercadopago/client";

export type ComprarCursoResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

export async function comprarCurso(formData: FormData): Promise<ComprarCursoResult> {
  const cursoId = String(formData.get("cursoId"));
  const clienteEmail = String(formData.get("clienteEmail") || "").trim();

  if (!clienteEmail) {
    return { ok: false, error: "Ingresá tu email para continuar." };
  }
  if (!isMpConfigurado()) {
    return {
      ok: false,
      error: "La compra online todavía no está habilitada. Escribinos por WhatsApp.",
    };
  }

  const curso = await getCursoPublico(cursoId);
  if (!curso) {
    return { ok: false, error: "Ese curso no está disponible." };
  }

  const monto = precioEfectivo({
    precio: curso.precio,
    precioOferta: curso.precio_oferta,
    ofertaActiva: curso.oferta_activa,
    ofertaDesde: curso.oferta_desde,
    ofertaHasta: curso.oferta_hasta,
    ahoraIso: new Date().toISOString(),
  });

  try {
    const pref = await crearPreferencia({
      titulo: curso.titulo,
      monto,
      externalReference: `curso:${curso.id}`,
      clienteEmail,
      backUrls: {
        success: "/cursos/gracias",
        pending: "/cursos/gracias",
        failure: `/cursos/${curso.id}`,
      },
    });
    return { ok: true, initPoint: pref.initPoint };
  } catch {
    return { ok: false, error: "No se pudo iniciar el pago. Probá de nuevo." };
  }
}
