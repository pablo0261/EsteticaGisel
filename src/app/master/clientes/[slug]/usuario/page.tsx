import { notFound } from "next/navigation";
import { AYUDA, BOTON, BOTON_SECUNDARIO, CAMPO, ETIQUETA, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { invitarUsuario, reenviarLinkUsuario, revocarDispositivosUsuario } from "@/lib/master/acciones";
import { clientePorSlug } from "@/lib/master/servicio";
import { MAX_USUARIOS_POR_CLIENTE, usuariosDelCliente } from "@/lib/master/usuarios";
import { urlDelTenant } from "@/lib/tenant/urls";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });

export default async function UsuarioCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  const usuarios = await usuariosDelCliente(tenant.id);
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Mensajes params={await searchParams} />
        <p className="font-sans text-sm text-texto-suave">
          El usuario del cliente entra a {urlDelTenant(tenant.slug)}/admin. Vos nunca ves ni definís su contraseña: le
          llega un link para elegirla.
        </p>
      </div>

      {usuarios.map((u) => (
        <section key={u.userId} className={TARJETA}>
          <p className="font-sans font-medium text-texto">{u.email ?? "(sin email)"}</p>
          <p className={AYUDA}>{u.ultimoIngreso ? `Último ingreso: ${fecha(u.ultimoIngreso)}` : "Todavía no ingresó."}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form id={`form-reenviar-link-${u.userId}`} action={reenviarLinkUsuario}>
              <input type="hidden" name="slug" value={tenant.slug} />
              <input type="hidden" name="user_id" value={u.userId} />
              <SubmitButton className={BOTON_SECUNDARIO}>Reenviar link de contraseña</SubmitButton>
            </form>
            <form id={`form-revocar-${u.userId}`} action={revocarDispositivosUsuario}>
              <input type="hidden" name="slug" value={tenant.slug} />
              <input type="hidden" name="user_id" value={u.userId} />
              <SubmitButton className={BOTON_SECUNDARIO}>Revocar dispositivos recordados</SubmitButton>
            </form>
          </div>
        </section>
      ))}

      {usuarios.length < MAX_USUARIOS_POR_CLIENTE && (
        <form id="form-usuario-cliente" action={invitarUsuario} className={`${TARJETA} flex flex-col gap-4`}>
          <FormPendingOverlay label="Creando…" />
          <input type="hidden" name="slug" value={tenant.slug} />
          <h2 className="font-serif text-2xl text-texto">Usuario del cliente</h2>
          <label className={ETIQUETA}>
            Email
            <input name="email" type="email" required autoComplete="off" className={CAMPO} />
          </label>
          <p className={AYUDA}>Le enviamos un email con la marca del cliente y un link para definir su contraseña (vence en 1 hora).</p>
          <div>
            <SubmitButton className={BOTON}>Crear usuario y enviar link</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
