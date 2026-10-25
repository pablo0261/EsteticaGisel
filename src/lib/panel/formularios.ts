import { CONTROL, CONTROL_MULTILINEA } from "@/lib/master/formularios";
import { DIAS_SEMANA } from "@/lib/turnos/horario";
import { esModoPago, type ModoPago } from "@/lib/turnos/pago";
import { LIMITES_PANEL as L } from "./limites";
import type { Moneda } from "@/lib/tenant/tipos";
import type { ClaveError } from "./mensajes";

/**
 * Validación de los formularios del panel del cliente. Corre en el servidor: un FormData es
 * texto no confiable. Cada parser devuelve solo los campos que el cliente puede cambiar (lista
 * blanca) y cada columnas*() los nombra en snake_case: lo que no está acá no llega a la base
 * aunque venga en el formulario (colores, logo, contacto, módulos y credenciales son del master).
 */
export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: ClaveError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function texto(fd: FormData, nombre: string): string {
  const v = fd.get(nombre);
  return typeof v === "string" ? v.trim() : "";
}

function tildado(fd: FormData, nombre: string): boolean {
  return fd.get(nombre) === "on";
}

/** Id (uuid) de un campo oculto, en minúsculas; null si no es un uuid. */
export function parsearId(fd: FormData, nombre = "id"): string | null {
  const v = texto(fd, nombre);
  return UUID.test(v) ? v.toLowerCase() : null;
}

/** Entero entre min y max (solo dígitos). Vacío: porDefecto, si se indica. */
function entero(fd: FormData, nombre: string, min: number, max: number, porDefecto?: number): number | null {
  const v = texto(fd, nombre);
  if (v === "" && porDefecto !== undefined) return porDefecto;
  if (!/^\d{1,9}$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

/**
 * Monto ≥ 0 con hasta `decimales` decimales (2 o 0), con punto o coma decimal ("1500",
 * "350,50"). null si no lo es.
 */
export function parsearMonto(entrada: string, maximo: number, decimales: 0 | 2 = 2): number | null {
  const v = entrada.trim().replace(",", ".");
  const formato = decimales === 0 ? /^\d{1,9}$/ : /^\d{1,9}(\.\d{1,2})?$/;
  if (!formato.test(v)) return null;
  const n = Number(v);
  return n <= maximo ? n : null;
}

type Leido = { valor: string } | { problema: "largo" | "control" };
const SIN_LEER: Leido = { valor: "" };

/** Texto ("" si falta) sin caracteres de control (los saltos de línea solo en multilínea) y con largo máximo. */
function leerTexto(fd: FormData, nombre: string, maximo: number, multilinea = false): Leido {
  const valor = texto(fd, nombre);
  if ((multilinea ? CONTROL_MULTILINEA : CONTROL).test(valor)) return { problema: "control" };
  if (valor.length > maximo) return { problema: "largo" };
  return { valor };
}

/** Error de Postgres al borrar una fila que otra todavía referencia (FK sin cascada). */
export function esReferenciaEnUso(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23503";
}

// ---------- Servicios ----------

export type FormServicio = { nombre: string; duracionMinutos: number; precio: number; orden: number; activo: boolean };

/** El precio va en la moneda del cliente: ARS en pesos enteros, BRL con hasta 2 decimales. */
export function parsearServicio(moneda: Moneda, fd: FormData): Resultado<FormServicio> {
  const nombre = leerTexto(fd, "nombre", L.nombre);
  if ("problema" in nombre) return { ok: false, error: nombre.problema === "control" ? "texto_invalido" : "nombre" };
  if (!nombre.valor) return { ok: false, error: "nombre" };
  const duracionMinutos = entero(fd, "duracion_minutos", L.duracionMin, L.duracionMax);
  if (duracionMinutos === null) return { ok: false, error: "duracion" };
  const precioTexto = texto(fd, "precio");
  // Vacío = 0: el sitio lo muestra "a consultar".
  const precio = precioTexto === "" ? 0 : parsearMonto(precioTexto, L.precioMax, moneda === "ARS" ? 0 : 2);
  if (precio === null) return { ok: false, error: "precio" };
  const orden = entero(fd, "orden", 0, L.ordenMax, 0);
  if (orden === null) return { ok: false, error: "orden" };
  return { ok: true, valor: { nombre: nombre.valor, duracionMinutos, precio, orden, activo: tildado(fd, "activo") } };
}

export function columnasServicio(s: FormServicio) {
  return { nombre: s.nombre, duracion_minutos: s.duracionMinutos, precio: s.precio, orden: s.orden, activo: s.activo };
}

// ---------- Horarios y reglas ----------

export type ReglasTurnos = {
  horasMinimasCancelacion: number;
  minutosEntreTurnos: number;
  modoPago: ModoPago;
  senaPorcentaje: number;
};

/** reglas null: el módulo turnos está apagado y sus reglas no se tocan. */
export type FormConfiguracion = {
  horario: Record<string, [string, string]>;
  reglas: ReglasTurnos | null;
  /** Crédito "Sitio creado por Certea" en el pie. Apagado si el formulario no lo tilda. */
  mostrarCredito: boolean;
};

export function parsearConfiguracion(fd: FormData, conTurnos: boolean): Resultado<FormConfiguracion> {
  const horario: Record<string, [string, string]> = {};
  for (const { key } of DIAS_SEMANA) {
    if (tildado(fd, `cerrado_${key}`)) continue;
    const desde = texto(fd, `desde_${key}`);
    const hasta = texto(fd, `hasta_${key}`);
    if (!desde && !hasta) continue; // sin horas: cerrado
    if (!HORA.test(desde) || !HORA.test(hasta) || desde >= hasta) return { ok: false, error: "horario" };
    horario[key] = [desde, hasta];
  }
  const mostrarCredito = tildado(fd, "mostrar_credito");
  if (!conTurnos) return { ok: true, valor: { horario, reglas: null, mostrarCredito } };

  const horasMinimasCancelacion = entero(fd, "horas_minimas_cancelacion", 0, L.horasCancelacionMax);
  if (horasMinimasCancelacion === null) return { ok: false, error: "horas_cancelacion" };
  const minutosEntreTurnos = entero(fd, "minutos_preparacion_entre_turnos", 0, L.minutosEntreTurnosMax);
  if (minutosEntreTurnos === null) return { ok: false, error: "minutos_entre_turnos" };
  const modoPago = texto(fd, "modo_pago");
  if (!esModoPago(modoPago)) return { ok: false, error: "modo_pago" };
  const senaPorcentaje = entero(fd, "sena_porcentaje", 1, 100);
  if (senaPorcentaje === null) return { ok: false, error: "sena_porcentaje" };
  return {
    ok: true,
    valor: {
      horario,
      reglas: { horasMinimasCancelacion, minutosEntreTurnos, modoPago, senaPorcentaje },
      mostrarCredito,
    },
  };
}

export function columnasConfiguracion(c: FormConfiguracion) {
  return {
    horario_atencion: c.horario,
    mostrar_credito: c.mostrarCredito,
    ...(c.reglas
      ? {
          horas_minimas_cancelacion: c.reglas.horasMinimasCancelacion,
          minutos_preparacion_entre_turnos: c.reglas.minutosEntreTurnos,
          modo_pago: c.reglas.modoPago,
          sena_porcentaje: c.reglas.senaPorcentaje,
        }
      : {}),
  };
}

// ---------- Textos de inicio y "sobre mí" ----------

export type FormTextosSitio = {
  inicioTitulo: string;
  inicioDestacado: string | null;
  inicioTexto: string | null;
  /** null: el módulo "sobre mí" está apagado y sus textos no se tocan. */
  sobreMi: { titulo: string | null; texto: string | null } | null;
};

export function parsearTextosSitio(fd: FormData, conSobreMi: boolean): Resultado<FormTextosSitio> {
  const titulo = leerTexto(fd, "inicio_titulo", L.titulo);
  if ("problema" in titulo) return { ok: false, error: titulo.problema === "control" ? "texto_invalido" : "inicio_titulo" };
  if (!titulo.valor) return { ok: false, error: "inicio_titulo" };

  const destacado = leerTexto(fd, "inicio_destacado", L.titulo);
  const textoInicio = leerTexto(fd, "inicio_texto", L.texto, true);
  const sobreMiTitulo = conSobreMi ? leerTexto(fd, "sobre_mi_titulo", L.titulo) : SIN_LEER;
  const sobreMiTexto = conSobreMi ? leerTexto(fd, "sobre_mi_texto", L.texto, true) : SIN_LEER;
  const leidos = [destacado, textoInicio, sobreMiTitulo, sobreMiTexto];
  if (leidos.some((l) => "problema" in l && l.problema === "control")) return { ok: false, error: "texto_invalido" };
  if (leidos.some((l) => "problema" in l)) return { ok: false, error: "texto_largo" };

  const valor = (l: Leido): string | null => ("valor" in l && l.valor ? l.valor : null);
  return {
    ok: true,
    valor: {
      inicioTitulo: titulo.valor,
      inicioDestacado: valor(destacado),
      inicioTexto: valor(textoInicio),
      sobreMi: conSobreMi ? { titulo: valor(sobreMiTitulo), texto: valor(sobreMiTexto) } : null,
    },
  };
}

export function columnasTextosSitio(t: FormTextosSitio) {
  return {
    inicio_titulo: t.inicioTitulo,
    inicio_destacado: t.inicioDestacado,
    inicio_texto: t.inicioTexto,
    ...(t.sobreMi ? { sobre_mi_titulo: t.sobreMi.titulo, sobre_mi_texto: t.sobreMi.texto } : {}),
  };
}

// ---------- Testimonios ----------

export type FormTestimonio = { nombre: string; texto: string; orden: number; activo: boolean };

export function parsearTestimonio(fd: FormData): Resultado<FormTestimonio> {
  const nombre = leerTexto(fd, "nombre", L.nombre);
  if ("problema" in nombre) return { ok: false, error: nombre.problema === "control" ? "texto_invalido" : "testimonio_nombre" };
  if (!nombre.valor) return { ok: false, error: "testimonio_nombre" };
  const cuerpo = leerTexto(fd, "texto", L.testimonio, true);
  if ("problema" in cuerpo) return { ok: false, error: cuerpo.problema === "control" ? "texto_invalido" : "testimonio_texto" };
  if (!cuerpo.valor) return { ok: false, error: "testimonio_texto" };
  const orden = entero(fd, "orden", 0, L.ordenMax, 0);
  if (orden === null) return { ok: false, error: "orden" };
  return { ok: true, valor: { nombre: nombre.valor, texto: cuerpo.valor, orden, activo: tildado(fd, "activo") } };
}

export function columnasTestimonio(t: FormTestimonio) {
  return { nombre: t.nombre, texto: t.texto, orden: t.orden, activo: t.activo };
}

// ---------- Preguntas frecuentes ----------

export type FormPregunta = { pregunta: string; respuesta: string; orden: number; activo: boolean };

export function parsearPregunta(fd: FormData): Resultado<FormPregunta> {
  const pregunta = leerTexto(fd, "pregunta", L.pregunta);
  if ("problema" in pregunta) return { ok: false, error: pregunta.problema === "control" ? "texto_invalido" : "pregunta" };
  if (!pregunta.valor) return { ok: false, error: "pregunta" };
  const respuesta = leerTexto(fd, "respuesta", L.respuesta, true);
  if ("problema" in respuesta) return { ok: false, error: respuesta.problema === "control" ? "texto_invalido" : "respuesta" };
  if (!respuesta.valor) return { ok: false, error: "respuesta" };
  const orden = entero(fd, "orden", 0, L.ordenMax, 0);
  if (orden === null) return { ok: false, error: "orden" };
  return { ok: true, valor: { pregunta: pregunta.valor, respuesta: respuesta.valor, orden, activo: tildado(fd, "activo") } };
}

export function columnasPregunta(p: FormPregunta) {
  return { pregunta: p.pregunta, respuesta: p.respuesta, orden: p.orden, activo: p.activo };
}

// ---------- Galería ----------

export function parsearDescripcionImagen(fd: FormData): Resultado<string | null> {
  const descripcion = leerTexto(fd, "descripcion", L.descripcionImagen);
  if ("problema" in descripcion) return { ok: false, error: descripcion.problema === "control" ? "texto_invalido" : "descripcion" };
  return { ok: true, valor: descripcion.valor || null };
}

export type FormImagenGaleria = { descripcion: string | null; orden: number; activo: boolean };

export function parsearImagenGaleria(fd: FormData): Resultado<FormImagenGaleria> {
  const descripcion = parsearDescripcionImagen(fd);
  if (!descripcion.ok) return descripcion;
  const orden = entero(fd, "orden", 0, L.ordenMax, 0);
  if (orden === null) return { ok: false, error: "orden" };
  return { ok: true, valor: { descripcion: descripcion.valor, orden, activo: tildado(fd, "activo") } };
}
