/**
 * Nombre de archivo apto para la key de Storage: todo carácter fuera de
 * [A-Za-z0-9._-] pasa a "_" (incluidas las barras) y se sacan los puntos iniciales.
 */
export function nombreSeguro(nombre: string): string {
  return nombre.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "");
}
