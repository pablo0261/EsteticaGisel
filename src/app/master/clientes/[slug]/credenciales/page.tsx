import { notFound } from "next/navigation";
import { AYUDA, BOTON, CAMPO, ETIQUETA, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { claveCredencialesConfigurada } from "@/lib/cripto/clave";
import { configurarGmail, configurarMercadoPago } from "@/lib/master/acciones";
import { estadoCredenciales } from "@/lib/master/credenciales";
import { mensajeError } from "@/lib/master/mensajes";
import { LIMITES } from "@/lib/master/limites";
import { clientePorSlug } from "@/lib/master/servicio";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

const ESTADO_GMAIL = { ok: "conexión verificada ✓", error: "con error", sin_configurar: "sin configurar" } as const;
const MANTENER = "configurado ✓ (vacío = mantener)";

export default async function CredencialesCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  // Solo estados y valores no secretos: los secretos nunca llegan a la página.
  const { gmail, mp } = await estadoCredenciales(tenant.id);
  const query = await searchParams;
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <Mensajes params={query} />
        {/* Si la action ya redirigió con ese error, Mensajes lo muestra: no se repite. */}
        {!claveCredencialesConfigurada() && query.error !== "clave_credenciales" && (
          <p role="alert" className="rounded-lg bg-primario/10 px-4 py-3 font-sans text-sm text-primario-oscuro">
            {mensajeError("clave_credenciales")}
          </p>
        )}
      </div>

      <form id="form-gmail" action={configurarGmail} className={`${TARJETA} flex flex-col gap-4`}>
        <FormPendingOverlay label="Probando conexión…" />
        <input type="hidden" name="slug" value={tenant.slug} />
        <h2 className="font-serif text-2xl text-texto">Gmail del cliente</h2>
        <p className={AYUDA}>
          Para los emails de turnos y cursos (se usa desde la etapa D). La cuenta necesita verificación en 2 pasos y una
          contraseña de aplicación.
        </p>
        <p className="font-sans text-sm text-texto">
          Estado: <strong>{ESTADO_GMAIL[gmail.estado]}</strong>
          {gmail.ultimoError && <span className="text-primario-oscuro"> — {gmail.ultimoError}</span>}
          {" · "}Contraseña de aplicación: <strong>{gmail.contrasenaConfigurada ? "configurado ✓" : "sin configurar"}</strong>
        </p>
        <label className={ETIQUETA}>
          Cuenta de Gmail
          <input
            name="smtp_usuario"
            type="email"
            required
            defaultValue={gmail.usuario ?? ""}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            className={CAMPO}
          />
        </label>
        <label className={ETIQUETA}>
          Contraseña de aplicación
          <input
            name="smtp_password"
            type="password"
            autoComplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            placeholder={gmail.contrasenaConfigurada ? MANTENER : "16 letras"}
            className={CAMPO}
          />
        </label>
        <label className={ETIQUETA}>
          Nombre del remitente
          <input
            name="smtp_nombre_remitente"
            defaultValue={gmail.remitente ?? ""}
            placeholder={tenant.nombre}
            maxLength={LIMITES.remitente}
            className={CAMPO}
          />
          <span className={AYUDA}>Si lo dejás vacío, se borra al guardar.</span>
        </label>
        <p className={AYUDA}>
          Para probar la configuración guardada, enviá el formulario con la contraseña vacía. Si cambiás de cuenta, cargá
          la contraseña de aplicación de la cuenta nueva.
        </p>
        <div>
          <SubmitButton className={BOTON}>Probar conexión y guardar</SubmitButton>
        </div>
      </form>

      <form id="form-mp" action={configurarMercadoPago} className={`${TARJETA} flex flex-col gap-4`}>
        <FormPendingOverlay />
        <input type="hidden" name="slug" value={tenant.slug} />
        <h2 className="font-serif text-2xl text-texto">Mercado Pago (carga manual)</h2>
        <p className={AYUDA}>
          Origen: {mp.origen ?? "sin configurar"}. El botón Conectar Mercado Pago (OAuth) llega en la etapa D.
        </p>
        <p className={AYUDA}>Los campos vacíos mantienen lo guardado. Un access token nuevo deja el origen en manual.</p>
        <p className="font-sans text-sm text-texto">
          Access token: <strong>{mp.accessTokenConfigurado ? "configurado ✓" : "sin configurar"}</strong>
          {" · "}Secreto del webhook: <strong>{mp.webhookSecretConfigurado ? "configurado ✓" : "sin configurar"}</strong>
        </p>
        <label className={ETIQUETA}>
          Access token
          <input
            name="mp_access_token"
            type="password"
            autoComplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            placeholder={mp.accessTokenConfigurado ? MANTENER : "APP_USR-…"}
            className={CAMPO}
          />
        </label>
        <label className={ETIQUETA}>
          Public key
          <input name="mp_public_key" defaultValue={mp.publicKey ?? ""} placeholder="APP_USR-…" autoComplete="off" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Secreto del webhook
          <input
            name="mp_webhook_secret"
            type="password"
            autoComplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            placeholder={mp.webhookSecretConfigurado ? MANTENER : "de la aplicación del cliente en Mercado Pago"}
            className={CAMPO}
          />
        </label>
        <div>
          <SubmitButton className={BOTON}>Guardar</SubmitButton>
        </div>
      </form>
    </div>
  );
}
