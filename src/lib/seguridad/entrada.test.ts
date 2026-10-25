import { describe, expect, it } from "vitest";
import { esIdNotificacionMp, esUuid } from "./entrada";

describe("esUuid", () => {
  it("acepta un uuid y rechaza inyección o basura", () => {
    expect(esUuid("0f1e2d3c-4b5a-4968-8776-655443322110")).toBe(true);
    expect(esUuid("0F1E2D3C-4B5A-4968-8776-655443322110")).toBe(true);
    expect(esUuid("0f1e2d3c-4b5a-4968-8776-655443322110' or 1=1")).toBe(false);
    expect(esUuid("no-es")).toBe(false);
    expect(esUuid("")).toBe(false);
  });
});

describe("esIdNotificacionMp", () => {
  it("solo acepta el id numérico de un pago", () => {
    expect(esIdNotificacionMp("123456789")).toBe(true);
    expect(esIdNotificacionMp("1")).toBe(true);
    expect(esIdNotificacionMp("123abc")).toBe(false);
    expect(esIdNotificacionMp("")).toBe(false);
    expect(esIdNotificacionMp("1".repeat(21))).toBe(false);
    expect(esIdNotificacionMp("1; drop")).toBe(false);
  });
});
