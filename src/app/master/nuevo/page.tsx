import Link from "next/link";
import { CamposPais } from "@/components/master/CamposPais";
import { CasillasModulos } from "@/components/master/CasillasModulos";
import { AYUDA, BOTON, CAMPO, ENLACE, ETIQUETA, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { altaCliente } from "@/lib/master/acciones";
import { LIMITES } from "@/lib/master/limites";
import { MODULOS_POR_DEFECTO } from "@/lib/master/modulos";
import { VALORES_POR_PAIS } from "@/lib/master/pais";

export const metadata = { title: "Nuevo cliente · Panel master" };

export default async function NuevoCliente({ searchParams }: { searchParams: Promise<ParamsMaster> }) {
  if (!(await esMasterVerificado())) return null;
  const params = await searchParams;
  return (
    <div className="max-w-2xl">
      <Link href="/" className={ENLACE}>
        ← Clientes
      </Link>
      <h1 className="mt-3 font-serif text-4xl text-texto">Nuevo cliente</h1>
      <p className="mt-2 mb-6 font-sans text-texto-suave">
        El sitio queda en línea al crearlo, con la paleta de la plataforma. Después cargás la marca, los textos y el usuario.
      </p>
      <Mensajes params={params} />
      <form id="form-alta-cliente" action={altaCliente} className={`${TARJETA} flex flex-col gap-5`}>
        <FormPendingOverlay label="Creando…" />
        <label className={ETIQUETA}>
          Nombre comercial
          <input name="nombre" required minLength={2} maxLength={LIMITES.nombre} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Subdominio
          <input
            name="slug"
            required
            minLength={3}
            maxLength={40}
            pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]"
            autoCapitalize="none"
            spellCheck={false}
            className={CAMPO}
          />
          <span className={AYUDA}>Minúsculas, números y guiones. No se puede cambiar después.</span>
        </label>
        <CamposPais inicial={{ pais: "AR", ...VALORES_POR_PAIS.AR }} />
        <CasillasModulos valores={MODULOS_POR_DEFECTO} />
        <div>
          <SubmitButton className={BOTON}>Crear cliente</SubmitButton>
        </div>
      </form>
    </div>
  );
}
