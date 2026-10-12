import "server-only";
import nodemailer from "nodemailer";
import { clasificarErrorSmtp, type FalloClasificado } from "./smtp";

const LIMITE_MS = 20_000;

/**
 * "Probar conexión" del Gmail de un cliente: login SMTP con la contraseña de aplicación,
 * sin enviar nada. Con tiempo límite propio además de los de nodemailer.
 */
export async function verificarGmail(
  usuario: string,
  contrasena: string,
): Promise<{ ok: true } | { ok: false; fallo: FalloClasificado }> {
  const transporte = nodemailer.createTransport({
    service: "gmail",
    auth: { user: usuario, pass: contrasena },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      transporte.verify(),
      new Promise((_, rechazar) => {
        temporizador = setTimeout(
          () => rechazar(Object.assign(new Error("Tiempo agotado"), { code: "ETIMEDOUT" })),
          LIMITE_MS,
        );
      }),
    ]);
    return { ok: true };
  } catch (e) {
    return { ok: false, fallo: clasificarErrorSmtp(e) };
  } finally {
    clearTimeout(temporizador);
    transporte.close();
  }
}
