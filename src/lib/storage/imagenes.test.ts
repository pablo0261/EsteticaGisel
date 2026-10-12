import { describe, it, expect } from "vitest";
import {
  detectarFormato,
  esTipoImagen,
  MAX_BYTES_IMAGEN,
  pathDeUrlPublica,
  pathImagen,
  prefijoPublico,
  urlPublica,
  validarImagen,
  validarTamano,
} from "./imagenes";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
const GIF = Buffer.from("GIF89a");
const SUPABASE = "https://abc.supabase.co/";
const TENANT = "11111111-1111-1111-1111-111111111111";
const OTRO = "22222222-2222-2222-2222-222222222222";

describe("detectarFormato (bytes mágicos)", () => {
  it("reconoce PNG, JPG y WebP", () => {
    expect(detectarFormato(PNG)).toBe("png");
    expect(detectarFormato(JPG)).toBe("jpg");
    expect(detectarFormato(WEBP)).toBe("webp");
  });

  it("rechaza SVG, GIF, HTML, vacío y un RIFF que no es WebP", () => {
    expect(detectarFormato(SVG)).toBeNull();
    expect(detectarFormato(GIF)).toBeNull();
    expect(detectarFormato(Buffer.from("<html>"))).toBeNull();
    expect(detectarFormato(Buffer.alloc(0))).toBeNull();
    expect(detectarFormato(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE")]))).toBeNull();
  });
});

describe("validarTamano y validarImagen", () => {
  it("hasta 2 MB", () => {
    expect(MAX_BYTES_IMAGEN).toBe(2 * 1024 * 1024);
    expect(validarTamano(0)).toBe("imagen_vacia");
    expect(validarTamano(MAX_BYTES_IMAGEN)).toBeNull();
    expect(validarTamano(MAX_BYTES_IMAGEN + 1)).toBe("imagen_grande");
  });

  it("devuelve el formato real o el problema", () => {
    expect(validarImagen(PNG)).toEqual({ ok: true, formato: "png" });
    expect(validarImagen(SVG)).toEqual({ ok: false, error: "imagen_tipo" });
    expect(validarImagen(Buffer.concat([PNG, Buffer.alloc(MAX_BYTES_IMAGEN)]))).toEqual({ ok: false, error: "imagen_grande" });
  });
});

describe("tipos, paths y URLs", () => {
  it("solo los tres tipos de imagen de la marca", () => {
    expect(esTipoImagen("logo")).toBe(true);
    expect(esTipoImagen("logo_claro")).toBe(true);
    expect(esTipoImagen("foto_perfil")).toBe(true);
    expect(esTipoImagen("galeria")).toBe(false);
    expect(esTipoImagen("../logo")).toBe(false);
  });

  it("path {tenant}/{tipo}-{ms}.{ext} y su URL pública", () => {
    const path = pathImagen(TENANT, "logo_claro", "webp", new Date(1_700_000_000_000));
    expect(path).toBe(`${TENANT}/logo_claro-1700000000000.webp`);
    expect(prefijoPublico(SUPABASE)).toBe("https://abc.supabase.co/storage/v1/object/public/sitios/");
    expect(urlPublica(SUPABASE, path)).toBe(`https://abc.supabase.co/storage/v1/object/public/sitios/${path}`);
  });

  it("pathDeUrlPublica: solo imágenes propias del tenant en el bucket", () => {
    const propia = urlPublica(SUPABASE, `${TENANT}/logo-123.png`);
    expect(pathDeUrlPublica(propia, SUPABASE, TENANT)).toBe(`${TENANT}/logo-123.png`);
    expect(pathDeUrlPublica(propia, SUPABASE, OTRO)).toBeNull();
    expect(pathDeUrlPublica("/brand/horizontal-negro.png", SUPABASE, TENANT)).toBeNull();
    expect(pathDeUrlPublica(null, SUPABASE, TENANT)).toBeNull();
    expect(pathDeUrlPublica(`https://abc.supabase.co/storage/v1/object/public/cursos-archivos/${TENANT}/logo-1.png`, SUPABASE, TENANT)).toBeNull();
    expect(pathDeUrlPublica(urlPublica(SUPABASE, `${TENANT}/../${OTRO}/logo-1.png`), SUPABASE, TENANT)).toBeNull();
    expect(pathDeUrlPublica(urlPublica(SUPABASE, `${TENANT}/logo-1.svg`), SUPABASE, TENANT)).toBeNull();
  });
});
