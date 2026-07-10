import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verificarFirmaWebhook } from "./signature";

const SECRET = "test-secret-123";

function firmarComoMercadoPago(dataId: string, requestId: string, ts: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return createHmac("sha256", SECRET).update(manifest).digest("hex");
}

describe("verificarFirmaWebhook", () => {
  it("acepta una firma válida", () => {
    const dataId = "123456789";
    const requestId = "req-abc";
    const ts = "1700000000";
    const v1 = firmarComoMercadoPago(dataId, requestId, ts);

    const ok = verificarFirmaWebhook({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId,
      secret: SECRET,
    });
    expect(ok).toBe(true);
  });

  it("rechaza si la firma no coincide", () => {
    const ok = verificarFirmaWebhook({
      xSignature: "ts=1700000000,v1=firmaInventada",
      xRequestId: "req-abc",
      dataId: "123456789",
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it("rechaza si falta el header x-signature", () => {
    const ok = verificarFirmaWebhook({
      xSignature: null,
      xRequestId: "req-abc",
      dataId: "123456789",
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it("rechaza si se usó otro secreto", () => {
    const dataId = "123456789";
    const requestId = "req-abc";
    const ts = "1700000000";
    const v1 = firmarComoMercadoPago(dataId, requestId, ts);

    const ok = verificarFirmaWebhook({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId,
      secret: "otro-secreto",
    });
    expect(ok).toBe(false);
  });
});
