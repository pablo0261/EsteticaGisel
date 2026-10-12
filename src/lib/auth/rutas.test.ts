import { describe, it, expect } from "vitest";
import { RUTAS_AUTH, decidirAcceso, rutaDelArea, rutaRelativa } from "./rutas";

describe("rutaDelArea", () => {
  it("el panel del cliente vive bajo /admin", () => {
    expect(rutaDelArea("tenant", "/")).toBe("/admin");
    expect(rutaDelArea("tenant", RUTAS_AUTH.login)).toBe("/admin/login");
  });

  it("el master vive en la raíz de app.", () => {
    expect(rutaDelArea("master", "/")).toBe("/");
    expect(rutaDelArea("master", RUTAS_AUTH.verificar)).toBe("/verificar");
  });
});

describe("rutaRelativa", () => {
  it("quita /admin en el panel del cliente", () => {
    expect(rutaRelativa("tenant", "/admin")).toBe("/");
    expect(rutaRelativa("tenant", "/admin/login")).toBe("/login");
    expect(rutaRelativa("tenant", "/admin/cursos/1")).toBe("/cursos/1");
  });

  it("deja igual la del master", () => {
    expect(rutaRelativa("master", "/")).toBe("/");
    expect(rutaRelativa("master", "/restablecer")).toBe("/restablecer");
  });
});

describe("rutaRelativa con prefijos parecidos", () => {
  it("no recorta /administrator ni /admin/login/ como si fueran rutas abiertas", () => {
    expect(rutaRelativa("tenant", "/administrator")).toBe("/administrator");
    const sinSesion = { haySesion: false, mfaValida: false };
    expect(decidirAcceso(rutaRelativa("tenant", "/administrator"), sinSesion)).toEqual({ tipo: "redirigir", a: "/login" });
    expect(decidirAcceso(rutaRelativa("tenant", "/admin/login/"), sinSesion)).toEqual({ tipo: "redirigir", a: "/login" });
    expect(decidirAcceso(rutaRelativa("tenant", "/administrator/recuperar"), sinSesion)).toEqual({ tipo: "redirigir", a: "/login" });
  });
});

describe("decidirAcceso", () => {
  const sinSesion = { haySesion: false, mfaValida: false };
  const sinCodigo = { haySesion: true, mfaValida: false };
  const verificada = { haySesion: true, mfaValida: true };

  it("recuperar y restablecer están siempre abiertas", () => {
    for (const ruta of [RUTAS_AUTH.recuperar, RUTAS_AUTH.restablecer]) {
      for (const estado of [sinSesion, sinCodigo, verificada]) {
        expect(decidirAcceso(ruta, estado)).toEqual({ tipo: "seguir" });
      }
    }
  });

  it("login: abierto, salvo que ya esté todo verificado", () => {
    expect(decidirAcceso(RUTAS_AUTH.login, sinSesion)).toEqual({ tipo: "seguir" });
    expect(decidirAcceso(RUTAS_AUTH.login, sinCodigo)).toEqual({ tipo: "seguir" });
    expect(decidirAcceso(RUTAS_AUTH.login, verificada)).toEqual({ tipo: "redirigir", a: "/" });
  });

  it("verificar: exige sesión y no tiene sentido ya verificado", () => {
    expect(decidirAcceso(RUTAS_AUTH.verificar, sinSesion)).toEqual({ tipo: "redirigir", a: "/login" });
    expect(decidirAcceso(RUTAS_AUTH.verificar, sinCodigo)).toEqual({ tipo: "seguir" });
    expect(decidirAcceso(RUTAS_AUTH.verificar, verificada)).toEqual({ tipo: "redirigir", a: "/" });
  });

  it("el resto exige sesión y código", () => {
    for (const ruta of ["/", "/cursos", "/cursos/1/video-preview"]) {
      expect(decidirAcceso(ruta, sinSesion)).toEqual({ tipo: "redirigir", a: "/login" });
      expect(decidirAcceso(ruta, sinCodigo)).toEqual({ tipo: "redirigir", a: "/verificar" });
      expect(decidirAcceso(ruta, verificada)).toEqual({ tipo: "seguir" });
    }
  });

  it("una cookie mfa sin sesión no alcanza", () => {
    expect(decidirAcceso("/", { haySesion: false, mfaValida: true })).toEqual({ tipo: "redirigir", a: "/login" });
  });
});
