import { notFound } from "next/navigation";
import { CasillasModulos } from "@/components/master/CasillasModulos";
import { AYUDA, BOTON, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { editarModulos } from "@/lib/master/acciones";
import { clientePorSlug } from "@/lib/master/servicio";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

export default async function ModulosCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  return (
    <div className="max-w-2xl">
      <Mensajes params={await searchParams} />
      <form id="form-modulos" action={editarModulos} className={`${TARJETA} flex flex-col gap-5`}>
        <FormPendingOverlay />
        <input type="hidden" name="slug" value={tenant.slug} />
        <CasillasModulos valores={tenant.modulos} />
        <p className={AYUDA}>Un módulo apagado no aparece en el sitio del cliente.</p>
        <div>
          <SubmitButton className={BOTON}>Guardar</SubmitButton>
        </div>
      </form>
    </div>
  );
}
