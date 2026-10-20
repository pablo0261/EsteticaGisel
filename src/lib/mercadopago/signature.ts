import { createHmac, timingSafeEqual } from "node:crypto";

/** Una firma de más de 5 minutos, o fechada en el futuro, no se acepta. */
export const VENTANA_FIRMA_MS = 5 * 60 * 1000;
const TOLERANCIA_FUTURO_MS = 60 * 1000;

/** ts del header: 10 dígitos son segundos, 13 son milisegundos. */
export function timestampFirmaMs(ts: string): number | null {
  if (!/^\d{10}$|^\d{13}$/.test(ts)) return null;
  const n = Number(ts);
  return ts.length === 10 ? n * 1000 : n;
}

export function firmaVigente(ts: string, ahoraMs: number, ventanaMs = VENTANA_FIRMA_MS): boolean {
  const ms = timestampFirmaMs(ts);
  if (ms === null) return false;
  return ms <= ahoraMs + TOLERANCIA_FUTURO_MS && ahoraMs - ms <= ventanaMs;
}

/**
 * Verifica la firma de un webhook de Mercado Pago (header x-signature).
 * https://www.mercadopago.com.ar/developers/es/docs/checkout-api/webhooks
 * `ahoraMs` permite testear la vigencia; en el webhook es Date.now().
 */
export function verificarFirmaWebhook(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
  secret: string;
  ahoraMs?: number;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = opts;
  if (!xSignature || !xRequestId || !secret) return false;

  const partes = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v?.trim()];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1 || !firmaVigente(ts, opts.ahoraMs ?? Date.now())) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const esperada = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(v1);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
