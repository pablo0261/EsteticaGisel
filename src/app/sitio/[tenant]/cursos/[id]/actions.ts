"use server";

import { getCursoPublico } from "@/lib/data/cursos";
import { precioEfectivo } from "@/lib/cursos/reglas";
import { isMpConfigurado, crearPreferencia } from "@/lib/mercadopago/client";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { urlDelTenant } from "@/lib/tenant/urls";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { IDIOMA_POR_DEFECTO, traductor } from "@/lib/i18n/textos";

export type ComprarCursoResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

export async function comprarCurso(formData: FormData): Promise<ComprarCursoResult> {
  const tenant = await tenantDelRequest();
  const t = traductor(tenant?.idioma ?? IDIOMA_POR_DEFECTO);
  const noDisponible = t({ es: "Ese curso no está disponible.", pt: "Esse curso não está disponível." });
  if (!tenant?.modulos.cursos) {
    return { ok: false, error: noDisponible };
  }

  const cursoId = String(formData.get("cursoId"));
  const clienteEmail = String(formData.get("clienteEmail") || "").trim();

  if (!clienteEmail) {
    return {
      ok: false,
      error: t({ es: "Ingresá tu email para continuar.", pt: "Informe seu e-mail para continuar." }),
    };
  }
  if (!isMpConfigurado() || !usaCredencialesGlobales(tenant.slug)) {
    return {
      ok: false,
      error: t({
        es: "La compra online todavía no está habilitada. Escribinos por WhatsApp.",
        pt: "A compra online ainda não está habilitada. Fale com a gente pelo WhatsApp.",
      }),
    };
  }

  const curso = await getCursoPublico(tenant.id, cursoId);
  if (!curso) {
    return { ok: false, error: noDisponible };
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
      moneda: tenant.moneda,
      externalReference: `curso:${curso.id}`,
      clienteEmail,
      baseUrl: urlDelTenant(tenant.slug),
      backUrls: {
        success: "/cursos/gracias",
        pending: "/cursos/gracias",
        failure: `/cursos/${curso.id}`,
      },
    });
    return { ok: true, initPoint: pref.initPoint };
  } catch {
    return {
      ok: false,
      error: t({
        es: "No se pudo iniciar el pago. Probá de nuevo.",
        pt: "Não foi possível iniciar o pagamento. Tente novamente.",
      }),
    };
  }
}
