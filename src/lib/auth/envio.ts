/** Cómo salen los emails de login y de contraseña. */
export type ModoEnvio = "smtp" | "consola" | "bloqueado";

/**
 * Con la cuenta de la plataforma configurada, por SMTP. Sin ella, en desarrollo el
 * código se imprime en la consola del servidor y el login sigue; en producción el login
 * falla cerrado. Nunca se saltea el segundo factor.
 */
export function modoEnvio(estado: { configurado: boolean; produccion: boolean }): ModoEnvio {
  if (estado.configurado) return "smtp";
  return estado.produccion ? "bloqueado" : "consola";
}
