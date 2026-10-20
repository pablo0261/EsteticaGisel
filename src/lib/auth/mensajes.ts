import { IDIOMA_POR_DEFECTO, type Idioma, type Textos } from "@/lib/i18n/textos";
import { LARGO_MINIMO_CONTRASENA } from "./recuperacion";

/**
 * Textos de las pantallas de ingreso, en el idioma del área: el del cliente en su panel, el
 * español en el master. La URL lleva solo la clave (?error=credenciales): un texto que no
 * está acá no se muestra.
 */
const ERRORES: Record<string, Textos> = {
  credenciales: { es: "Email o contraseña incorrectos.", pt: "E-mail ou senha incorretos." },
  demasiados_intentos: {
    es: "Demasiados intentos. Esperá unos minutos.",
    pt: "Muitas tentativas. Aguarde alguns minutos.",
  },
  servicio_ocupado: {
    es: "El servicio está ocupado. Probá de nuevo en unos minutos.",
    pt: "O serviço está ocupado. Tente novamente em alguns minutos.",
  },
  sitio: { es: "Este sitio no está disponible.", pt: "Este site não está disponível." },
  origen: {
    es: "El servidor no puede identificar la conexión. Tiene que estar detrás del proxy, con la cabecera de IP configurada.",
    pt: "O servidor não consegue identificar a conexão. Ele precisa estar atrás do proxy, com o cabeçalho de IP configurado.",
  },
  envio_no_configurado: {
    es: "El envío de códigos no está configurado.",
    pt: "O envio de códigos não está configurado.",
  },
  envio_emails_no_configurado: {
    es: "El envío de emails no está configurado.",
    pt: "O envio de e-mails não está configurado.",
  },
  envio_fallo: {
    es: "No pudimos enviar el código. Probá de nuevo en unos minutos.",
    pt: "Não conseguimos enviar o código. Tente novamente em alguns minutos.",
  },
  espera: {
    es: "Esperá un minuto antes de pedir otro código.",
    pt: "Aguarde um minuto antes de pedir outro código.",
  },
  limite: {
    es: "Pediste demasiados códigos. Probá de nuevo en una hora.",
    pt: "Você solicitou muitos códigos. Tente novamente em uma hora.",
  },
  formato: { es: "El código tiene 6 números.", pt: "O código tem 6 números." },
  incorrecto: { es: "El código no es correcto.", pt: "O código não está correto." },
  vencido: { es: "El código venció. Pedí uno nuevo.", pt: "O código expirou. Peça um novo." },
  agotado: {
    es: "Agotaste los intentos. Pedí un código nuevo.",
    pt: "Você esgotou as tentativas. Solicite um novo código.",
  },
  usado: { es: "Ese código ya se usó. Pedí uno nuevo.", pt: "Esse código já foi usado. Peça um novo." },
  sin_codigo: { es: "Pedí un código para continuar.", pt: "Peça um código para continuar." },
  reintentar: {
    es: "No pudimos verificar el código. Probá de nuevo.",
    pt: "Não conseguimos verificar o código. Tente novamente.",
  },
  email: { es: "Ingresá un email válido.", pt: "Informe um e-mail válido." },
  link: {
    es: "El link no es válido o ya venció. Pedí uno nuevo.",
    pt: "O link não é válido ou já expirou. Peça um novo.",
  },
  contrasena_corta: {
    es: `La contraseña tiene que tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
    pt: `A senha precisa ter pelo menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
  },
  contrasena_distinta: { es: "Las contraseñas no coinciden.", pt: "As senhas não coincidem." },
  sesiones_no_cerradas: {
    es: "Tu contraseña cambió, pero no pudimos cerrar las otras sesiones abiertas. Ingresá y volvé a cambiarla para cerrarlas.",
    pt: "Sua senha foi alterada, mas não conseguimos encerrar as outras sessões abertas. Entre e altere-a novamente para encerrá-las.",
  },
  contrasena_rechazada: {
    es: "No pudimos guardar esa contraseña (puede ser muy débil o igual a la anterior). Pedí un link nuevo y probá con otra.",
    pt: "Não conseguimos salvar essa senha (pode ser muito fraca ou igual à anterior). Solicite um novo link e tente outra.",
  },
};

const INFOS: Record<string, Textos> = {
  codigo_enviado: {
    es: "Te enviamos un código de 6 números a tu email.",
    pt: "Enviamos um código de 6 números para o seu e-mail.",
  },
  reenviado: { es: "Te enviamos un código nuevo.", pt: "Enviamos um código novo." },
  recuperacion_enviada: {
    es: "Si el email corresponde a una cuenta, te enviamos un link para elegir una contraseña nueva. Revisá también el correo no deseado.",
    pt: "Se o e-mail corresponder a uma conta, enviamos um link para escolher uma nova senha. Verifique também a caixa de spam.",
  },
  contrasena_cambiada: {
    es: "Listo, tu contraseña cambió. Ya podés ingresar.",
    pt: "Pronto, sua senha foi alterada. Você já pode entrar.",
  },
};

function buscar(tabla: Record<string, Textos>, clave: string | undefined, idioma: Idioma): string | null {
  return clave !== undefined && Object.prototype.hasOwnProperty.call(tabla, clave) ? tabla[clave][idioma] : null;
}

export function mensajeError(clave: string | undefined, idioma: Idioma = IDIOMA_POR_DEFECTO): string | null {
  return buscar(ERRORES, clave, idioma);
}

export function mensajeInfo(clave: string | undefined, idioma: Idioma = IDIOMA_POR_DEFECTO): string | null {
  return buscar(INFOS, clave, idioma);
}
