export type TipoRecordatorio = "48h" | "24h" | "2h";

/** De más cercano al turno a más lejano. */
const RECORDATORIOS: { tipo: TipoRecordatorio; horas: number }[] = [
  { tipo: "2h", horas: 2 },
  { tipo: "24h", horas: 24 },
  { tipo: "48h", horas: 48 },
];

const HORA_MS = 60 * 60 * 1000;

/**
 * Qué recordatorio enviar ahora para un turno, o null si no corresponde ninguno.
 * Se envía solo el más cercano cuya ventana ya se abrió (si el cron se atrasó,
 * los anteriores se omiten), y se omite si la reserva se hizo dentro de esa ventana.
 */
export function recordatorioQueCorresponde(opts: {
  fechaHoraIso: string;
  creadoEnIso: string;
  ahoraIso: string;
  enviados: TipoRecordatorio[];
}): TipoRecordatorio | null {
  const turno = new Date(opts.fechaHoraIso).getTime();
  const ahora = new Date(opts.ahoraIso).getTime();
  const creado = new Date(opts.creadoEnIso).getTime();
  if (ahora >= turno) return null;

  const vigente = RECORDATORIOS.find((r) => turno - ahora <= r.horas * HORA_MS);
  if (!vigente) return null;
  if (opts.enviados.includes(vigente.tipo)) return null;
  if (creado >= turno - vigente.horas * HORA_MS) return null;
  return vigente.tipo;
}
