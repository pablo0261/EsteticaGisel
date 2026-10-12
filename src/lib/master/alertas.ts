/** Alertas de la lista de clientes (spec 7): email con error y Mercado Pago por vencer. */
export type Alerta = "email_error" | "mp_vencido" | "mp_por_vencer";

export const DIAS_AVISO_MP = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

export const TEXTO_ALERTA: Record<Alerta, string> = {
  email_error: "Email con error",
  mp_vencido: "Mercado Pago vencido",
  mp_por_vencer: "Mercado Pago por vencer",
};

export type CredencialesParaAlertas = { smtpEstado: string; mpTokenVenceEn: string | null };

export function alertasDelCliente(c: CredencialesParaAlertas | null, ahora: Date): Alerta[] {
  if (!c) return [];
  const alertas: Alerta[] = [];
  if (c.smtpEstado === "error") alertas.push("email_error");
  if (c.mpTokenVenceEn) {
    const restante = new Date(c.mpTokenVenceEn).getTime() - ahora.getTime();
    if (restante <= 0) alertas.push("mp_vencido");
    else if (restante < DIAS_AVISO_MP * DIA_MS) alertas.push("mp_por_vencer");
  }
  return alertas;
}
