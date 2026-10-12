import { LARGO_MINIMO_CONTRASENA } from "./recuperacion";

/**
 * Textos de las pantallas de ingreso (en español: son parte del panel, que se traduce en
 * la etapa C). La URL lleva solo la clave (?error=credenciales): un texto que no está
 * acá no se muestra.
 */
const ERRORES: Record<string, string> = {
  credenciales: "Email o contraseña incorrectos.",
  sitio: "Este sitio no está disponible.",
  envio_no_configurado: "El envío de códigos no está configurado.",
  envio_emails_no_configurado: "El envío de emails no está configurado.",
  envio_fallo: "No pudimos enviar el código. Probá de nuevo en unos minutos.",
  espera: "Esperá un minuto antes de pedir otro código.",
  limite: "Pediste demasiados códigos. Probá de nuevo en una hora.",
  formato: "El código tiene 6 números.",
  incorrecto: "El código no es correcto.",
  vencido: "El código venció. Pedí uno nuevo.",
  agotado: "Agotaste los intentos. Pedí un código nuevo.",
  usado: "Ese código ya se usó. Pedí uno nuevo.",
  sin_codigo: "Pedí un código para continuar.",
  reintentar: "No pudimos verificar el código. Probá de nuevo.",
  email: "Ingresá un email válido.",
  link: "El link no es válido o ya venció. Pedí uno nuevo.",
  contrasena_corta: `La contraseña tiene que tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
  contrasena_distinta: "Las contraseñas no coinciden.",
  contrasena_rechazada:
    "No pudimos guardar esa contraseña (puede ser muy débil o igual a la anterior). Pedí un link nuevo y probá con otra.",
};

const INFOS: Record<string, string> = {
  codigo_enviado: "Te enviamos un código de 6 números a tu email.",
  reenviado: "Te enviamos un código nuevo.",
  recuperacion_enviada:
    "Si el email corresponde a una cuenta, te enviamos un link para elegir una contraseña nueva. Revisá también el correo no deseado.",
  contrasena_cambiada: "Listo, tu contraseña cambió. Ya podés ingresar.",
};

function buscar(tabla: Record<string, string>, clave: string | undefined): string | null {
  return clave !== undefined && Object.prototype.hasOwnProperty.call(tabla, clave) ? tabla[clave] : null;
}

export function mensajeError(clave: string | undefined): string | null {
  return buscar(ERRORES, clave);
}

export function mensajeInfo(clave: string | undefined): string | null {
  return buscar(INFOS, clave);
}
