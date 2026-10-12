import { LIMITES } from "./limites";

/**
 * Textos del panel master por clave. Las actions redirigen con ?error=, ?ok= o ?aviso= y
 * la clave, nunca con un texto: lo que no está acá no se muestra. Los tipos salen de las
 * tablas, así que una action no puede usar una clave sin texto (no compila).
 * Puro y liviano: lo usan componentes de cliente.
 */
const ERRORES = {
  cliente: "No encontramos ese cliente.",
  error: "No se pudo completar la acción.",
  nombre: `El nombre tiene que tener entre 2 y ${LIMITES.nombre} caracteres.`,
  slug_invalido:
    "El subdominio tiene que tener de 3 a 40 caracteres: minúsculas, números y guiones (sin guiones en los bordes). No puede ser www, app, admin, master ni api.",
  slug_en_uso: "Ya hay un cliente con ese subdominio.",
  pais: "Elegí Argentina o Brasil.",
  idioma: "Elegí español o portugués.",
  zona: "Elegí una zona horaria del país del cliente.",
  moneda: "Elegí ARS o BRL.",
  color_invalido: "Cada color tiene que ser un hex #rgb o #rrggbb (sin transparencia).",
  contraste_texto: "El texto no se lee bien sobre el fondo: hace falta un contraste de al menos 4,5:1.",
  contraste_boton:
    "El texto de los botones (color de fondo sobre el primario) no se lee bien: hace falta un contraste de al menos 4,5:1.",
  imagen_destino: "No sabemos qué imagen querés cambiar.",
  imagen_vacia: "Elegí un archivo.",
  imagen_grande: "La imagen pesa más de 2 MB.",
  imagen_tipo: "La imagen tiene que ser PNG, JPG o WebP.",
  inicio_titulo: `El título de inicio es obligatorio (hasta ${LIMITES.titulo} caracteres).`,
  texto_largo: "Algún texto supera el largo permitido.",
  whatsapp: "El WhatsApp no es un celular válido del país del cliente.",
  instagram: "El Instagram tiene que ser un usuario (letras, números, puntos y guiones bajos).",
  email_contacto: "El email de contacto no es válido.",
  email: "Ingresá un email válido.",
  ya_es_usuario: "Ese email ya es usuario de este cliente. Usá Reenviar link.",
  limite_usuarios: "Este cliente ya tiene usuario.",
  usuario_de_otro: "Ese email ya es usuario de otro cliente.",
  usuario_master: "Ese email es del usuario master.",
  usuario_sin_cliente:
    "Ese email ya tiene una cuenta que no pertenece a ningún cliente. Borrala en Supabase (Authentication → Users) o usá otro email.",
  usuario_no_encontrado: "Ese usuario no pertenece a este cliente.",
  usuario_sin_email: "Se creó el usuario, pero no pudimos enviar el email. Probá con Reenviar link.",
  envio_fallo: "No pudimos enviar el email. Probá de nuevo en unos minutos.",
  envio_emails_no_configurado: "El envío de emails de la plataforma no está configurado.",
  cliente_suspendido: "El cliente está suspendido: reactivalo para enviar el link (lleva a su panel).",
  clave_credenciales: "Falta CREDENCIALES_KEY en el servidor: no se pueden guardar credenciales.",
  gmail_usuario: "El usuario de Gmail tiene que ser un email.",
  gmail_contrasena: "La contraseña de aplicación son 16 letras (Google la muestra en grupos de 4).",
  gmail_sin_contrasena: "Falta la contraseña de aplicación.",
  gmail_remitente: `El nombre del remitente tiene hasta ${LIMITES.remitente} caracteres, en una sola línea.`,
  gmail_autenticacion: "Gmail rechazó el usuario o la contraseña de aplicación. No se guardó nada nuevo.",
  gmail_conexion: "No pudimos conectar con Gmail. No se guardó nada nuevo.",
  gmail_otro: "La prueba de conexión con Gmail falló. No se guardó nada nuevo.",
  mp_access_token: "El access token no tiene el formato de Mercado Pago (APP_USR-… o TEST-…).",
  mp_public_key: "La public key no tiene el formato de Mercado Pago (APP_USR-… o TEST-…).",
  mp_webhook_secret: "El secreto del webhook tiene de 16 a 128 letras y números.",
  mp_sin_access_token: "Falta el access token.",
};

const INFOS = {
  creado: "Cliente creado. Completá la marca, los textos y el usuario.",
  guardado: "Cambios guardados.",
  imagen_guardada: "Imagen actualizada.",
  usuario_creado: "Usuario creado. Le enviamos el link para definir su contraseña.",
  link_reenviado: "Le enviamos un link nuevo para definir su contraseña.",
  dispositivos_revocados: "Listo: sus dispositivos recordados van a pedir el código otra vez.",
  suspendido: "Cliente suspendido: su sitio y su panel quedaron bloqueados.",
  reactivado: "Cliente reactivado.",
  gmail_ok: "Conexión con Gmail verificada y guardada.",
  mp_guardado: "Credenciales de Mercado Pago guardadas.",
};

const AVISOS = {
  contraste_secundario:
    "Se guardó, pero el color secundario tiene poco contraste con el fondo (menos de 3:1): los detalles en ese color pueden costar leerse.",
};

export type ClaveError = keyof typeof ERRORES;
export type ClaveInfo = keyof typeof INFOS;
export type ClaveAviso = keyof typeof AVISOS;

function buscar(tabla: Record<string, string>, clave: string | undefined): string | null {
  return clave !== undefined && Object.prototype.hasOwnProperty.call(tabla, clave) ? tabla[clave] : null;
}

export function mensajeError(clave: string | undefined): string | null {
  return buscar(ERRORES, clave);
}

export function mensajeInfo(clave: string | undefined): string | null {
  return buscar(INFOS, clave);
}

export function mensajeAviso(clave: string | undefined): string | null {
  return buscar(AVISOS, clave);
}
