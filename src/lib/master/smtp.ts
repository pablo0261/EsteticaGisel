/**
 * Errores de la prueba de conexión con Gmail. El mensaje de nodemailer puede traer el
 * usuario o partes de la respuesta del servidor: no se guarda ni se muestra. Solo una
 * categoría y el código SMTP numérico.
 */
export type FalloSmtp = "gmail_autenticacion" | "gmail_conexion" | "gmail_otro";
export type FalloClasificado = { clave: FalloSmtp; codigo: number | null };

const CODIGOS_CONEXION = [
  "ETIMEDOUT", "ECONNECTION", "ESOCKET", "EDNS", "ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETLS",
];

export function clasificarErrorSmtp(error: unknown): FalloClasificado {
  const e = (typeof error === "object" && error !== null ? error : {}) as { code?: unknown; responseCode?: unknown };
  const codigo = typeof e.responseCode === "number" && Number.isInteger(e.responseCode) ? e.responseCode : null;
  if (e.code === "EAUTH" || codigo === 534 || codigo === 535) return { clave: "gmail_autenticacion", codigo };
  if (typeof e.code === "string" && CODIGOS_CONEXION.includes(e.code)) return { clave: "gmail_conexion", codigo };
  return { clave: "gmail_otro", codigo };
}

const DESCRIPCION: Record<FalloSmtp, string> = {
  gmail_autenticacion: "Gmail rechazó el usuario o la contraseña de aplicación",
  gmail_conexion: "No se pudo conectar con el servidor de Gmail",
  gmail_otro: "Falló la prueba de conexión con Gmail",
};

/** Texto para smtp_ultimo_error. */
export function textoErrorSmtp(fallo: FalloClasificado): string {
  return `${DESCRIPCION[fallo.clave]}${fallo.codigo !== null ? ` (código ${fallo.codigo})` : ""}`;
}
