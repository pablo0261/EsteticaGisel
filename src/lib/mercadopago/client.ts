const MP_API = "https://api.mercadopago.com";

export function isMpConfigurado(): boolean {
  const token = process.env.MP_ACCESS_TOKEN;
  return !!token && !token.startsWith("TEST-xxx") && token !== "xxx";
}

type CrearPreferenciaOpts = {
  titulo: string;
  monto: number;
  externalReference: string;
  clienteEmail: string;
};

/** Crea una preferencia de Checkout Pro. Devuelve el init_point para redirigir. */
export async function crearPreferencia(
  opts: CrearPreferenciaOpts,
): Promise<{ id: string; initPoint: string }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const moneda = process.env.MP_CURRENCY || "ARS";

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: opts.titulo,
          quantity: 1,
          unit_price: opts.monto,
          currency_id: moneda,
        },
      ],
      payer: { email: opts.clienteEmail },
      external_reference: opts.externalReference,
      back_urls: {
        success: `${siteUrl}/turnos/gracias`,
        pending: `${siteUrl}/turnos/gracias`,
        failure: `${siteUrl}/turnos`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mercado Pago rechazó la preferencia: ${res.status} ${body}`);
  }

  const data = await res.json();
  return { id: data.id, initPoint: data.init_point };
}

export type MpPayment = {
  id: string;
  status: string; // approved | pending | rejected | ...
  externalReference: string | null;
  transactionAmount: number;
};

/** Consulta el estado real de un pago contra la API de MP (nunca confiar solo en el webhook). */
export async function obtenerPago(paymentId: string): Promise<MpPayment> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`No se pudo consultar el pago ${paymentId}: ${res.status}`);
  }
  const data = await res.json();
  return {
    id: String(data.id),
    status: data.status,
    externalReference: data.external_reference ?? null,
    transactionAmount: data.transaction_amount,
  };
}
