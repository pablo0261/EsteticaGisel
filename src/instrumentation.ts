/**
 * Se ejecuta una vez al arrancar el servidor. En producción, sin CABECERA_IP_CONFIABLE los
 * límites por IP no se aplican y el login se limita solo por email (un tercero puede trabar
 * una cuenta 15 minutos): se avisa en el log, pero el servidor arranca igual.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production" && !process.env.CABECERA_IP_CONFIABLE?.trim()) {
    console.error(
      "[seguridad] CABECERA_IP_CONFIABLE está vacía: no se limita por IP y el login se limita solo por email. " +
        "Configurala con la cabecera que fija el reverse proxy (ej. x-real-ip con Caddy).",
    );
  }
}
