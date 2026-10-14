import type { Idioma, Textos } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "./limites";

/**
 * Textos del panel del cliente por clave, en el idioma del cliente. Las actions redirigen
 * con ?error= u ?ok= y la clave, nunca con un texto: lo que no está acá no se muestra. Los
 * tipos salen de las tablas, así que una action no puede usar una clave sin texto.
 * Puro y liviano: lo usan componentes de cliente.
 */
const ERRORES = {
  error: { es: "No se pudo completar la acción. Probá de nuevo.", pt: "Não foi possível concluir a ação. Tente novamente." },
  modulo_inactivo: {
    es: "Esa sección no está habilitada para tu sitio.",
    pt: "Essa seção não está habilitada para o seu site.",
  },
  id: { es: "No encontramos ese elemento.", pt: "Não encontramos esse item." },
  nombre: {
    es: `El nombre es obligatorio (hasta ${L.nombre} caracteres).`,
    pt: `O nome é obrigatório (até ${L.nombre} caracteres).`,
  },
  duracion: {
    es: `La duración tiene que ser un número entero de minutos, entre ${L.duracionMin} y ${L.duracionMax}.`,
    pt: `A duração precisa ser um número inteiro de minutos, entre ${L.duracionMin} e ${L.duracionMax}.`,
  },
  precio: {
    es: "El precio tiene que ser un número mayor o igual a 0, con hasta 2 decimales.",
    pt: "O preço precisa ser um número maior ou igual a 0, com até 2 casas decimais.",
  },
  orden: {
    es: `El orden tiene que ser un número entero entre 0 y ${L.ordenMax}.`,
    pt: `A ordem precisa ser um número inteiro entre 0 e ${L.ordenMax}.`,
  },
  texto_invalido: { es: "Algún texto tiene caracteres no permitidos.", pt: "Algum texto tem caracteres não permitidos." },
  texto_largo: { es: "Algún texto supera el largo permitido.", pt: "Algum texto ultrapassa o tamanho permitido." },
  inicio_titulo: {
    es: `El título de inicio es obligatorio (hasta ${L.titulo} caracteres).`,
    pt: `O título da página inicial é obrigatório (até ${L.titulo} caracteres).`,
  },
  horario: {
    es: "Revisá el horario: cada día abierto necesita hora de inicio y de fin, y el inicio tiene que ser antes del fin.",
    pt: "Revise o horário: cada dia aberto precisa de horário de início e de fim, e o início precisa ser antes do fim.",
  },
  horas_cancelacion: {
    es: `Las horas mínimas para cancelar tienen que ser un número entero entre 0 y ${L.horasCancelacionMax}.`,
    pt: `As horas mínimas para cancelar precisam ser um número inteiro entre 0 e ${L.horasCancelacionMax}.`,
  },
  minutos_entre_turnos: {
    es: `Los minutos entre turnos tienen que ser un número entero entre 0 y ${L.minutosEntreTurnosMax}.`,
    pt: `Os minutos entre atendimentos precisam ser um número inteiro entre 0 e ${L.minutosEntreTurnosMax}.`,
  },
  modo_pago: { es: "Elegí cómo se paga al reservar.", pt: "Escolha como se paga ao agendar." },
  sena_porcentaje: {
    es: "El porcentaje de seña tiene que ser un número entero entre 1 y 100.",
    pt: "A porcentagem do sinal precisa ser um número inteiro entre 1 e 100.",
  },
  servicio_con_turnos: {
    es: "Este servicio tiene turnos registrados y no se puede eliminar. Desmarcá “activo” para ocultarlo del sitio.",
    pt: "Este serviço tem agendamentos registrados e não pode ser excluído. Desmarque “ativo” para ocultá-lo do site.",
  },
  testimonio_nombre: {
    es: `El nombre de quien opina es obligatorio (hasta ${L.nombre} caracteres).`,
    pt: `O nome de quem dá o depoimento é obrigatório (até ${L.nombre} caracteres).`,
  },
  testimonio_texto: {
    es: `El testimonio es obligatorio (hasta ${L.testimonio} caracteres).`,
    pt: `O depoimento é obrigatório (até ${L.testimonio} caracteres).`,
  },
  pregunta: {
    es: `La pregunta es obligatoria (hasta ${L.pregunta} caracteres, en una línea).`,
    pt: `A pergunta é obrigatória (até ${L.pregunta} caracteres, em uma linha).`,
  },
  respuesta: {
    es: `La respuesta es obligatoria (hasta ${L.respuesta} caracteres).`,
    pt: `A resposta é obrigatória (até ${L.respuesta} caracteres).`,
  },
  descripcion: {
    es: `La descripción tiene hasta ${L.descripcionImagen} caracteres, en una línea.`,
    pt: `A descrição tem até ${L.descripcionImagen} caracteres, em uma linha.`,
  },
  imagen_vacia: { es: "Elegí una imagen.", pt: "Escolha uma imagem." },
  imagen_grande: { es: "La imagen pesa más de 2 MB.", pt: "A imagem tem mais de 2 MB." },
  imagen_tipo: { es: "La imagen tiene que ser PNG, JPG o WebP.", pt: "A imagem precisa ser PNG, JPG ou WebP." },
  galeria_llena: {
    es: `La galería ya tiene ${L.imagenesGaleria} imágenes: eliminá alguna para subir otra.`,
    pt: `A galeria já tem ${L.imagenesGaleria} imagens: exclua alguma para enviar outra.`,
  },
} satisfies Record<string, Textos>;

const INFOS = {
  guardado: { es: "Cambios guardados.", pt: "Alterações salvas." },
  creado: { es: "Listo, se agregó.", pt: "Pronto, foi adicionado." },
  eliminado: { es: "Se eliminó.", pt: "Foi excluído." },
  imagen_subida: { es: "Imagen subida.", pt: "Imagem enviada." },
  turno_completado: { es: "Turno marcado como completado.", pt: "Atendimento marcado como concluído." },
  turno_cancelado: { es: "Turno cancelado.", pt: "Agendamento cancelado." },
} satisfies Record<string, Textos>;

export type ClaveError = keyof typeof ERRORES;
export type ClaveInfo = keyof typeof INFOS;

function buscar(tabla: Record<string, Textos>, idioma: Idioma, clave: string | undefined): string | null {
  return clave !== undefined && Object.prototype.hasOwnProperty.call(tabla, clave) ? tabla[clave][idioma] : null;
}

export function mensajeError(idioma: Idioma, clave: string | undefined): string | null {
  return buscar(ERRORES, idioma, clave);
}

export function mensajeInfo(idioma: Idioma, clave: string | undefined): string | null {
  return buscar(INFOS, idioma, clave);
}
