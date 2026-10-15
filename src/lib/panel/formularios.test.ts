import { describe, it, expect } from "vitest";
import {
  columnasConfiguracion,
  columnasServicio,
  columnasTextosSitio,
  esReferenciaEnUso,
  parsearConfiguracion,
  parsearDescripcionImagen,
  parsearId,
  parsearImagenGaleria,
  parsearMonto,
  parsearPregunta,
  parsearServicio,
  parsearTestimonio,
  parsearTextosSitio,
} from "./formularios";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

const ID = "0f1e2d3c-4b5a-4968-8776-655443322110";

describe("parsearId", () => {
  it("solo uuids (en minúsculas)", () => {
    expect(parsearId(fd({ id: ID }))).toBe(ID);
    expect(parsearId(fd({ id: ID.toUpperCase() }))).toBe(ID);
    expect(parsearId(fd({ otro: ID }), "otro")).toBe(ID);
    expect(parsearId(fd({ id: "1" }))).toBeNull();
    expect(parsearId(fd({ id: `${ID}' or 1=1` }))).toBeNull();
    expect(parsearId(fd({}))).toBeNull();
  });
});

describe("parsearMonto", () => {
  it("punto o coma decimal, hasta 2 decimales, sin negativos", () => {
    expect(parsearMonto("1500", 10_000)).toBe(1500);
    expect(parsearMonto("350,50", 10_000)).toBe(350.5);
    expect(parsearMonto(" 0.99 ", 10_000)).toBe(0.99);
    for (const v of ["-1", "1.234", "1e3", "abc", "", "10001"]) expect(parsearMonto(v, 10_000), v).toBeNull();
    // Sin decimales (ARS)
    expect(parsearMonto("1500", 10_000, 0)).toBe(1500);
    for (const v of ["1500.5", "1500,50", "0.99"]) expect(parsearMonto(v, 10_000, 0), v).toBeNull();
  });
});

describe("parsearServicio", () => {
  const SERVICIO = { nombre: " Limpieza facial ", duracion_minutos: "60", precio: "35000", orden: "2", activo: "on" };

  it("valida y devuelve solo las columnas del servicio", () => {
    const r = parsearServicio("ARS", fd({ ...SERVICIO, tenant_id: "otro", id: ID }));
    expect(r).toEqual({ ok: true, valor: { nombre: "Limpieza facial", duracionMinutos: 60, precio: 35000, orden: 2, activo: true } });
    if (r.ok) {
      expect(columnasServicio(r.valor)).toEqual({ nombre: "Limpieza facial", duracion_minutos: 60, precio: 35000, orden: 2, activo: true });
    }
  });

  it("precio y orden vacíos valen 0; sin la casilla, inactivo", () => {
    expect(parsearServicio("ARS", fd({ nombre: "A", duracion_minutos: "30", precio: "", orden: "" }))).toEqual({
      ok: true,
      valor: { nombre: "A", duracionMinutos: 30, precio: 0, orden: 0, activo: false },
    });
  });

  it("cada error", () => {
    expect(parsearServicio("ARS", fd({ ...SERVICIO, nombre: "" }))).toEqual({ ok: false, error: "nombre" });
    expect(parsearServicio("ARS", fd({ ...SERVICIO, nombre: "x".repeat(81) }))).toEqual({ ok: false, error: "nombre" });
    expect(parsearServicio("ARS", fd({ ...SERVICIO, nombre: "A\u0000B" }))).toEqual({ ok: false, error: "texto_invalido" });
    for (const d of ["4", "601", "30.5", "", "-30"]) {
      expect(parsearServicio("ARS", fd({ ...SERVICIO, duracion_minutos: d })), d).toEqual({ ok: false, error: "duracion" });
    }
    expect(parsearServicio("ARS", fd({ ...SERVICIO, precio: "-1" }))).toEqual({ ok: false, error: "precio" });
    expect(parsearServicio("ARS", fd({ ...SERVICIO, orden: "1000" }))).toEqual({ ok: false, error: "orden" });
  });

  it("precio según la moneda: ARS en pesos enteros, BRL con hasta 2 decimales", () => {
    for (const p of ["350.5", "350,50", "0.99"]) {
      expect(parsearServicio("ARS", fd({ ...SERVICIO, precio: p })), p).toEqual({ ok: false, error: "precio" });
    }
    expect(parsearServicio("ARS", fd({ ...SERVICIO, precio: "35000" })).ok).toBe(true);
    const brl = parsearServicio("BRL", fd({ ...SERVICIO, precio: "350,50" }));
    expect(brl.ok && brl.valor.precio).toBe(350.5);
    expect(parsearServicio("BRL", fd({ ...SERVICIO, precio: "350.555" }))).toEqual({ ok: false, error: "precio" });
  });
});

describe("parsearConfiguracion", () => {
  const SEMANA: Record<string, string> = {};
  for (const d of ["lun", "mar", "mie", "jue", "vie"]) {
    SEMANA[`desde_${d}`] = "09:00";
    SEMANA[`hasta_${d}`] = "18:00";
  }
  const REGLAS = {
    horas_minimas_cancelacion: "24",
    minutos_preparacion_entre_turnos: "15",
    modo_pago: "ninguno",
    sena_porcentaje: "50",
  };

  it("horario: días con las dos horas; cerrado o sin horas = sin entrada", () => {
    const r = parsearConfiguracion(fd({ ...SEMANA, desde_sab: "10:00", hasta_sab: "13:00", cerrado_vie: "on", ...REGLAS }), true);
    expect(r.ok && r.valor.horario).toEqual({
      lun: ["09:00", "18:00"],
      mar: ["09:00", "18:00"],
      mie: ["09:00", "18:00"],
      jue: ["09:00", "18:00"],
      sab: ["10:00", "13:00"],
    });
  });

  it("con turnos: reglas y modo de pago; columnas en snake_case", () => {
    const r = parsearConfiguracion(fd({ ...SEMANA, ...REGLAS }), true);
    expect(r.ok && r.valor.reglas).toEqual({
      horasMinimasCancelacion: 24,
      minutosEntreTurnos: 15,
      modoPago: "ninguno",
      senaPorcentaje: 50,
    });
    if (r.ok) {
      expect(columnasConfiguracion(r.valor)).toEqual({
        horario_atencion: r.valor.horario,
        horas_minimas_cancelacion: 24,
        minutos_preparacion_entre_turnos: 15,
        modo_pago: "ninguno",
        sena_porcentaje: 50,
      });
    }
  });

  it("sin el módulo turnos: solo el horario (las reglas no se tocan aunque vengan)", () => {
    const r = parsearConfiguracion(fd({ ...SEMANA, ...REGLAS, modo_pago: "gratis" }), false);
    expect(r.ok && r.valor.reglas).toBeNull();
    if (r.ok) expect(Object.keys(columnasConfiguracion(r.valor))).toEqual(["horario_atencion"]);
  });

  it("cada error", () => {
    expect(parsearConfiguracion(fd({ desde_lun: "18:00", hasta_lun: "09:00", ...REGLAS }), true)).toEqual({ ok: false, error: "horario" });
    expect(parsearConfiguracion(fd({ desde_lun: "09:00", ...REGLAS }), true)).toEqual({ ok: false, error: "horario" });
    expect(parsearConfiguracion(fd({ desde_lun: "9", hasta_lun: "18:00", ...REGLAS }), true)).toEqual({ ok: false, error: "horario" });
    expect(parsearConfiguracion(fd({ ...REGLAS, horas_minimas_cancelacion: "721" }), true)).toEqual({ ok: false, error: "horas_cancelacion" });
    expect(parsearConfiguracion(fd({ ...REGLAS, minutos_preparacion_entre_turnos: "x" }), true)).toEqual({
      ok: false,
      error: "minutos_entre_turnos",
    });
    expect(parsearConfiguracion(fd({ ...REGLAS, modo_pago: "gratis" }), true)).toEqual({ ok: false, error: "modo_pago" });
    expect(parsearConfiguracion(fd({ ...REGLAS, sena_porcentaje: "0" }), true)).toEqual({ ok: false, error: "sena_porcentaje" });
    expect(parsearConfiguracion(fd({ ...REGLAS, sena_porcentaje: "101" }), true)).toEqual({ ok: false, error: "sena_porcentaje" });
  });
});

describe("parsearTextosSitio", () => {
  const TEXTOS = {
    inicio_titulo: "Tu momento de",
    inicio_destacado: "bienestar",
    inicio_texto: "Línea 1\n\nLínea 2",
    sobre_mi_titulo: "Hola, soy Ana",
    sobre_mi_texto: "Cosmetóloga.",
  };

  it("lista blanca: solo los textos de inicio y sobre mí (colores, contacto o logo se ignoran)", () => {
    const r = parsearTextosSitio(
      fd({ ...TEXTOS, color_primario: "#000000", whatsapp: "+5491100000000", logo_url: "https://x.example/a.png" }),
      true,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(columnasTextosSitio(r.valor)).toEqual({
        inicio_titulo: "Tu momento de",
        inicio_destacado: "bienestar",
        inicio_texto: "Línea 1\n\nLínea 2",
        sobre_mi_titulo: "Hola, soy Ana",
        sobre_mi_texto: "Cosmetóloga.",
      });
    }
  });

  it("sin el módulo sobre mí, sus textos no se tocan; vacíos opcionales = null", () => {
    const r = parsearTextosSitio(fd({ ...TEXTOS, inicio_destacado: "", inicio_texto: "" }), false);
    expect(r.ok && columnasTextosSitio(r.valor)).toEqual({ inicio_titulo: "Tu momento de", inicio_destacado: null, inicio_texto: null });
  });

  it("cada error", () => {
    expect(parsearTextosSitio(fd({ ...TEXTOS, inicio_titulo: " " }), true)).toEqual({ ok: false, error: "inicio_titulo" });
    expect(parsearTextosSitio(fd({ ...TEXTOS, inicio_titulo: "x".repeat(81) }), true)).toEqual({ ok: false, error: "inicio_titulo" });
    expect(parsearTextosSitio(fd({ ...TEXTOS, inicio_destacado: "a\nb" }), true)).toEqual({ ok: false, error: "texto_invalido" });
    expect(parsearTextosSitio(fd({ ...TEXTOS, sobre_mi_texto: "x".repeat(2001) }), true)).toEqual({ ok: false, error: "texto_largo" });
    // Con el módulo apagado, un texto de sobre mí inválido no importa: no se lee.
    expect(parsearTextosSitio(fd({ ...TEXTOS, sobre_mi_texto: "x".repeat(2001) }), false).ok).toBe(true);
  });
});

describe("testimonios, preguntas e imágenes", () => {
  it("testimonio", () => {
    expect(parsearTestimonio(fd({ nombre: "Ana", texto: "Excelente.\nVuelvo.", orden: "", activo: "on" }))).toEqual({
      ok: true,
      valor: { nombre: "Ana", texto: "Excelente.\nVuelvo.", orden: 0, activo: true },
    });
    expect(parsearTestimonio(fd({ nombre: "", texto: "x" }))).toEqual({ ok: false, error: "testimonio_nombre" });
    expect(parsearTestimonio(fd({ nombre: "Ana", texto: "" }))).toEqual({ ok: false, error: "testimonio_texto" });
    expect(parsearTestimonio(fd({ nombre: "Ana", texto: "x".repeat(1001) }))).toEqual({ ok: false, error: "testimonio_texto" });
  });

  it("pregunta frecuente", () => {
    expect(parsearPregunta(fd({ pregunta: "¿Cuánto dura?", respuesta: "Una hora.", orden: "3" }))).toEqual({
      ok: true,
      valor: { pregunta: "¿Cuánto dura?", respuesta: "Una hora.", orden: 3, activo: false },
    });
    expect(parsearPregunta(fd({ pregunta: "¿Una\nlínea?", respuesta: "x" }))).toEqual({ ok: false, error: "texto_invalido" });
    expect(parsearPregunta(fd({ pregunta: "", respuesta: "x" }))).toEqual({ ok: false, error: "pregunta" });
    expect(parsearPregunta(fd({ pregunta: "¿?", respuesta: "" }))).toEqual({ ok: false, error: "respuesta" });
  });

  it("descripción e imagen de la galería", () => {
    expect(parsearDescripcionImagen(fd({ descripcion: "" }))).toEqual({ ok: true, valor: null });
    expect(parsearDescripcionImagen(fd({ descripcion: "x".repeat(201) }))).toEqual({ ok: false, error: "descripcion" });
    expect(parsearImagenGaleria(fd({ descripcion: "Uñas", orden: "1", activo: "on" }))).toEqual({
      ok: true,
      valor: { descripcion: "Uñas", orden: 1, activo: true },
    });
  });
});

describe("esReferenciaEnUso", () => {
  it("solo la violación de FK de Postgres (23503)", () => {
    expect(esReferenciaEnUso({ code: "23503" })).toBe(true);
    expect(esReferenciaEnUso({ code: "42501" })).toBe(false);
    expect(esReferenciaEnUso(null)).toBe(false);
  });
});
