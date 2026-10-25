"use server";

import { getCursoPublico } from "@/lib/data/cursos";
import { precioEfectivo } from "@/lib/cursos/reglas";
import { cuentaMercadoPago } from "@/lib/integraciones/cuenta";
import { crearPreferencia } from "@/lib/mercadopago/client";
import { referenciaCurso } from "@/lib/mercadopago/referencia";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { urlDelTenant } from "@/lib/tenant/urls";
import { esUuid } from "@/lib/seguridad/entrada";
import { permitirPorIpOGlobal } from "@/lib/seguridad/limite-memoria";
import { validarEmailCliente } from "@/lib/turnos/cliente";
import { bloqueadoSinIp, getClientIp } from "@/lib/turnos/ip";
import { redondearMonto } from "@/lib/turnos/reglas";
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

  const cursoId = String(formData.get("cursoId") ?? "");
  const emailCrudo = String(formData.get("clienteEmail") || "").trim();
  if (!esUuid(cursoId)) return { ok: false, error: noDisponible };

  if (!emailCrudo) {
    return {
      ok: false,
      error: t({ es: "Ingresá tu email para continuar.", pt: "Informe seu e-mail para continuar." }),
    };
  }
  const clienteEmail = validarEmailCliente(emailCrudo);
  if (!clienteEmail) {
    return {
      ok: false,
      error: t({
        es: "Ingresá un solo email válido, ej.: nombre@dominio.com.",
        pt: "Informe um único e-mail válido, ex.: nome@dominio.com.",
      }),
    };
  }
  const ip = await getClientIp();
  if (bloqueadoSinIp(process.env.NODE_ENV, ip)) {
    return {
      ok: false,
      error: t({
        es: "No pudimos validar la compra. Probá de nuevo en unos minutos.",
        pt: "Não foi possível validar a compra. Tente novamente em alguns minutos.",
      }),
    };
  }
  if (!permitirPorIpOGlobal(`compra:${tenant.id}`, ip, { porIp: 8, sinIp: 8, ventanaMs: 60 * 60 * 1000 })) {
    return {
      ok: false,
      error: t({
        es: "Por seguridad, alcanzaste el máximo de intentos de compra por hora. Esperá una hora para volver a intentar.",
        pt: "Por segurança, você atingiu o máximo de tentativas de compra por hora. Aguarde uma hora para tentar novamente.",
      }),
    };
  }

  const mercadoPago = await cuentaMercadoPago(tenant.id, tenant.slug);
  if (!mercadoPago) {
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

  // Redondeado en la moneda: es lo que se cobra y lo que la referencia lleva en centavos (el
  // webhook acepta ese monto aunque la oferta termine antes del pago).
  const monto = redondearMonto(
    precioEfectivo({
      precio: curso.precio,
      precioOferta: curso.precio_oferta,
      ofertaActiva: curso.oferta_activa,
      ofertaDesde: curso.oferta_desde,
      ofertaHasta: curso.oferta_hasta,
      ahoraIso: new Date().toISOString(),
    }),
    tenant.moneda,
  );

  try {
    const pref = await crearPreferencia({
      accessToken: mercadoPago.accessToken,
      titulo: curso.titulo,
      monto,
      moneda: tenant.moneda,
      externalReference: referenciaCurso(curso.id, monto, tenant.moneda),
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
