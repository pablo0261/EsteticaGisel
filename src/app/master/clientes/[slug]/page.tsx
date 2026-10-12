import { notFound } from "next/navigation";
import { CamposPais } from "@/components/master/CamposPais";
import { BOTON, BOTON_SECUNDARIO, CAMPO, ETIQUETA, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { cambiarEstado, editarDatos } from "@/lib/master/acciones";
import { LIMITES } from "@/lib/master/limites";
import { clientePorSlug } from "@/lib/master/servicio";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

export default async function DatosCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  const activo = tenant.estado === "activo";
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <Mensajes params={await searchParams} />
        <form id="form-datos" action={editarDatos} className={`${TARJETA} flex flex-col gap-5`}>
          <FormPendingOverlay />
          <input type="hidden" name="slug" value={tenant.slug} />
          <label className={ETIQUETA}>
            Nombre comercial
            <input name="nombre" required minLength={2} maxLength={LIMITES.nombre} defaultValue={tenant.nombre} className={CAMPO} />
          </label>
          <p className="font-sans text-sm text-texto-suave">
            Subdominio: <strong className="text-texto">{tenant.slug}</strong> (no se cambia después del alta).
          </p>
          <CamposPais
            inicial={{ pais: tenant.pais, idioma: tenant.idioma, zonaHoraria: tenant.zonaHoraria, moneda: tenant.moneda }}
          />
          <div>
            <SubmitButton className={BOTON}>Guardar</SubmitButton>
          </div>
        </form>
      </div>
      <section className={TARJETA}>
        <h2 className="font-serif text-2xl text-texto">Estado</h2>
        <p className="mt-2 font-sans text-sm text-texto-suave">
          {activo
            ? "El sitio y el panel del cliente están en línea."
            : "Suspendido: el sitio muestra que no está disponible y el panel del cliente queda bloqueado."}
        </p>
        <form id="form-estado" action={cambiarEstado} className="mt-4">
          <input type="hidden" name="slug" value={tenant.slug} />
          <input type="hidden" name="estado" value={activo ? "suspendido" : "activo"} />
          <SubmitButton className={activo ? BOTON_SECUNDARIO : BOTON}>
            {activo ? "Suspender cliente" : "Reactivar cliente"}
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
