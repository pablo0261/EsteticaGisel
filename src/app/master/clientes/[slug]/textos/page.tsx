import { notFound } from "next/navigation";
import { AYUDA, BOTON, CAMPO, ETIQUETA, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { editarTextos } from "@/lib/master/acciones";
import { LIMITES } from "@/lib/master/limites";
import { NOMBRE_PAIS } from "@/lib/master/pais";
import { clientePorSlug } from "@/lib/master/servicio";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

function Campo(props: {
  nombre: string;
  etiqueta: string;
  valor: string | null;
  max: number;
  ayuda?: string;
  requerido?: boolean;
  tipo?: "text" | "email";
  placeholder?: string;
}) {
  return (
    <label className={ETIQUETA}>
      {props.etiqueta}
      <input
        name={props.nombre}
        type={props.tipo ?? "text"}
        defaultValue={props.valor ?? ""}
        maxLength={props.max}
        required={props.requerido}
        placeholder={props.placeholder}
        className={CAMPO}
      />
      {props.ayuda && <span className={AYUDA}>{props.ayuda}</span>}
    </label>
  );
}

function Area(props: { nombre: string; etiqueta: string; valor: string | null; max: number; filas?: number }) {
  return (
    <label className={ETIQUETA}>
      {props.etiqueta}
      <textarea
        name={props.nombre}
        defaultValue={props.valor ?? ""}
        maxLength={props.max}
        rows={props.filas ?? 4}
        className={CAMPO}
      />
    </label>
  );
}

export default async function TextosCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  const m = tenant.marca;
  const ejemploWhatsapp = tenant.pais === "BR" ? "(11) 91234-5678" : "11 2345 6789";
  return (
    <div className="max-w-2xl">
      <Mensajes params={await searchParams} />
      <form id="form-textos" action={editarTextos} className={`${TARJETA} flex flex-col gap-5`}>
        <FormPendingOverlay />
        <input type="hidden" name="slug" value={tenant.slug} />
        <p className={AYUDA}>Los textos van en el idioma del sitio del cliente.</p>
        <Campo nombre="rubro" etiqueta="Rubro" valor={m.rubro} max={LIMITES.rubro} ayuda="Ej.: Estética y Salud. Va en el título de la pestaña." />
        <Campo nombre="tagline" etiqueta="Frase de la marca" valor={m.tagline} max={LIMITES.tagline} ayuda="Pie del sitio y descripción para buscadores." />
        <Campo nombre="inicio_titulo" etiqueta="Inicio: título" valor={m.inicioTitulo} max={LIMITES.titulo} requerido />
        <Campo nombre="inicio_destacado" etiqueta="Inicio: parte destacada del título" valor={m.inicioDestacado} max={LIMITES.titulo} ayuda="Se muestra con el color primario." />
        <Area nombre="inicio_texto" etiqueta="Inicio: texto" valor={m.inicioTexto} max={LIMITES.texto} />
        <Campo nombre="sobre_mi_titulo" etiqueta="Sobre mí: título" valor={m.sobreMiTitulo} max={LIMITES.titulo} />
        <Area nombre="sobre_mi_texto" etiqueta="Sobre mí: texto" valor={m.sobreMiTexto} max={LIMITES.texto} filas={8} />
        <Area nombre="nota_reservas" etiqueta="Nota en las reservas" valor={m.notaReservas} max={LIMITES.nota} filas={3} />
        <Campo
          nombre="whatsapp"
          etiqueta="WhatsApp"
          valor={m.whatsapp}
          max={30}
          placeholder={ejemploWhatsapp}
          ayuda={`Celular de ${NOMBRE_PAIS[tenant.pais]}. Se guarda en formato internacional.`}
        />
        <Campo nombre="instagram" etiqueta="Instagram" valor={m.instagram} max={100} placeholder="usuario" ayuda="Usuario o link del perfil." />
        <Campo nombre="email_contacto" etiqueta="Email de contacto" valor={m.emailContacto} max={254} tipo="email" />
        <Campo nombre="direccion" etiqueta="Dirección" valor={m.direccion} max={LIMITES.direccion} />
        <div>
          <SubmitButton className={BOTON}>Guardar</SubmitButton>
        </div>
      </form>
    </div>
  );
}
