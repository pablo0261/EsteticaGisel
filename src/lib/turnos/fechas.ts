/**
 * Fechas y horas en la zona horaria del negocio (IANA, ej. "America/Sao_Paulo").
 * Una fecha "YYYY-MM-DD" es un día de calendario, sin zona. Los instantes (ISO) se arman
 * con el offset que tiene la zona en ese momento, calculado con Intl (sin librerías).
 */
export type DiaSemana = "dom" | "lun" | "mar" | "mie" | "jue" | "vie" | "sab";

const DIAS: readonly DiaSemana[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

const formateadores = new Map<string, Intl.DateTimeFormat>();

function formateador(zona: string): Intl.DateTimeFormat {
  let f = formateadores.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zona,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formateadores.set(zona, f);
  }
  return f;
}

type HoraDePared = {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
};

/** Fecha y hora que marca un reloj de la zona en ese instante. */
function horaDePared(instante: Date, zona: string): HoraDePared {
  const p: Record<string, string> = {};
  for (const { type, value } of formateador(zona).formatToParts(instante)) p[type] = value;
  return {
    anio: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour),
    minuto: Number(p.minute),
    segundo: Number(p.second),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutos que la zona está adelantada (+) o atrasada (−) respecto de UTC en ese instante. */
function offsetMinutos(zona: string, instante: Date): number {
  const p = horaDePared(instante, zona);
  const paredComoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  const instanteSinMs = Math.floor(instante.getTime() / 1000) * 1000;
  return Math.round((paredComoUtc - instanteSinMs) / 60000);
}

function formatoOffset(minutos: number): string {
  const signo = minutos < 0 ? "-" : "+";
  const abs = Math.abs(minutos);
  return `${signo}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Offset "±HH:MM" de la zona en ese instante (ej. "-03:00"). */
export function offsetEnZona(zona: string, instante: Date): string {
  return formatoOffset(offsetMinutos(zona, instante));
}

/** ISO con el offset de la zona para una fecha "YYYY-MM-DD" y minutos del día (hora de pared). */
export function isoFechaHora(fecha: string, minutosDelDia: number, zona: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const paredComoUtc = Date.UTC(anio, mes - 1, dia, 0, minutosDelDia);
  // El offset depende del instante, que todavía no se conoce: se estima con la hora de
  // pared tomada como UTC y se corrige una vez (cubre los cambios de horario de verano).
  const estimado = offsetMinutos(zona, new Date(paredComoUtc));
  const offset = offsetMinutos(zona, new Date(paredComoUtc - estimado * 60000));
  const hh = pad(Math.floor(minutosDelDia / 60));
  const mm = pad(minutosDelDia % 60);
  return `${fecha}T${hh}:${mm}:00${formatoOffset(offset)}`;
}

/** Clave del día de la semana ("lun".."dom") de una fecha de calendario "YYYY-MM-DD". */
export function diaSemana(fecha: string): DiaSemana {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
}

/** Minutos desde medianoche, en la zona, de un timestamp ISO. */
export function minutosDelDia(iso: string, zona: string): number {
  const p = horaDePared(new Date(iso), zona);
  return p.hora * 60 + p.minuto;
}

/** Suma n días (o resta, con n negativo) a una fecha "YYYY-MM-DD". */
export function sumarDias(fecha: string, n: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + n)).toISOString().slice(0, 10);
}

/** Fecha de calendario "YYYY-MM-DD" de un instante en la zona. */
export function fechaEnZona(instante: Date, zona: string): string {
  const p = horaDePared(instante, zona);
  return `${p.anio}-${pad(p.mes)}-${pad(p.dia)}`;
}

/** Fecha de hoy en la zona, "YYYY-MM-DD". */
export function fechaHoy(zona: string): string {
  return fechaEnZona(new Date(), zona);
}

// --- Temporal: API anterior con la zona de Argentina fija. La Task 10 la borra. ---
const ZONA_AR = "America/Argentina/Buenos_Aires";
/** @deprecated Usar isoFechaHora(fecha, minutos, zona). */
export const isoFechaHoraAR = (fecha: string, minutos: number) =>
  isoFechaHora(fecha, minutos, ZONA_AR);
/** @deprecated Usar diaSemana(fecha). */
export const diaSemanaAR = diaSemana;
/** @deprecated Usar minutosDelDia(iso, zona). */
export const minutosDelDiaAR = (iso: string) => minutosDelDia(iso, ZONA_AR);
/** @deprecated Usar fechaHoy(zona). */
export const fechaHoyAR = () => fechaHoy(ZONA_AR);
