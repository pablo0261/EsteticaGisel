/** Cómo salen los emails de login y de contraseña. */
export type ModoEnvio = "smtp" | "consola" | "bloqueado";

/**
 * Con la cuenta de la plataforma configurada, por SMTP. Sin ella, solo en desarrollo local
 * (fuera de producción y con la plataforma en http o en localhost) el código se imprime en
 * la consola del servidor y el login sigue. En cualquier otro caso (producción, o un
 * servidor de desarrollo publicado con un dominio por https) el login falla cerrado: un
 * código impreso en la consola de un servidor expuesto no es un segundo factor. Nunca se
 * saltea el segundo factor.
 */
export function modoEnvio(estado: {
  configurado: boolean;
  produccion: boolean;
  protocolo: string | undefined;
  dominio: string | undefined;
}): ModoEnvio {
  if (estado.configurado) return "smtp";
  const local =
    estado.protocolo?.toLowerCase() === "http" || (estado.dominio?.toLowerCase().startsWith("localhost") ?? false);
  return !estado.produccion && local ? "consola" : "bloqueado";
}
