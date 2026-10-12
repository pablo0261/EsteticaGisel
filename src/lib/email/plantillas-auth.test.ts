import { describe, it, expect } from "vitest";
import type { MarcaEmail } from "./layout-marca";
import { plantillaCodigoLogin, plantillaInvitacion, plantillaRecuperacion } from "./plantillas-auth";

const MARCA: MarcaEmail = {
  nombre: "Estética Gisel",
  idioma: "es",
  colores: { colorPrimario: "#c0899a", colorSecundario: "#4e5340", colorFondo: "#f6f1ea", colorTexto: "#1a1a1a" },
  logoUrl: null,
};

describe("plantillaCodigoLogin", () => {
  it("en español, con el código en el cuerpo y no en el asunto", () => {
    const email = plantillaCodigoLogin(MARCA, "123456");
    expect(email.asunto).toBe("Tu código de acceso a Estética Gisel");
    expect(email.asunto).not.toContain("123456");
    expect(email.html).toContain("123456");
    expect(email.html).toContain("Vence en 10 minutos.");
    expect(email.html).toContain('<html lang="es-AR">');
    expect(email.texto).toContain("123456");
  });

  it("en portugués para un tenant de Brasil", () => {
    const email = plantillaCodigoLogin({ ...MARCA, idioma: "pt", nombre: "Studio Demo" }, "654321");
    expect(email.asunto).toBe("Seu código de acesso a Studio Demo");
    expect(email.html).toContain("Expira em 10 minutos.");
    expect(email.html).toContain('<html lang="pt-BR">');
    expect(email.html).not.toContain("Vence en");
  });

  it("escapa el nombre del tenant en el HTML", () => {
    const email = plantillaCodigoLogin({ ...MARCA, nombre: "<i>Spa</i>" }, "123456");
    expect(email.html).not.toContain("<i>Spa</i>");
    expect(email.html).toContain("&lt;i&gt;Spa&lt;/i&gt;");
  });
});

describe("plantillaRecuperacion", () => {
  const LINK = "https://gisel.tuproducto.com/admin/restablecer?token_hash=abc";

  it("en español, con el link en el botón y en el texto plano", () => {
    const email = plantillaRecuperacion(MARCA, LINK);
    expect(email.asunto).toBe("Restablecé tu contraseña de Estética Gisel");
    expect(email.html).toContain(`href="${LINK}"`);
    expect(email.html).toContain("Elegir contraseña nueva");
    expect(email.texto).toContain(LINK);
  });

  it("en portugués", () => {
    const email = plantillaRecuperacion({ ...MARCA, idioma: "pt" }, LINK);
    expect(email.asunto).toBe("Redefina sua senha de Estética Gisel");
    expect(email.html).toContain("Escolher nova senha");
  });
});

describe("plantillaInvitacion", () => {
  const LINK = "https://ana.tuproducto.com/admin/restablecer?token_hash=abc";

  it("en español, con el link en el botón y en el texto plano", () => {
    const email = plantillaInvitacion(MARCA, LINK);
    expect(email.asunto).toBe("Tu acceso al panel de Estética Gisel");
    expect(email.html).toContain("Definí tu contraseña");
    expect(email.html).toContain(`href="${LINK}"`);
    expect(email.html).toContain("vence en 1 hora");
    expect(email.texto).toContain(LINK);
  });

  it("en portugués", () => {
    const email = plantillaInvitacion({ ...MARCA, idioma: "pt", nombre: "Studio Demo" }, LINK);
    expect(email.asunto).toBe("Seu acesso ao painel de Studio Demo");
    expect(email.html).toContain("Defina sua senha");
    expect(email.html).toContain("expira em 1 hora");
    expect(email.html).not.toContain("Definí");
  });

  it("escapa el nombre del tenant y el link", () => {
    const email = plantillaInvitacion({ ...MARCA, nombre: "<i>Spa</i>" }, `${LINK}&x="y"`);
    expect(email.html).not.toContain("<i>Spa</i>");
    expect(email.html).not.toContain('x="y"');
  });
});
