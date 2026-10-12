import Link from "next/link";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  cerrarSesion,
  iniciarSesion,
  pedirRecuperacion,
  reenviarCodigo,
  restablecerContrasena,
  verificarCodigo,
} from "@/lib/auth/acciones";
import { mensajeError, mensajeInfo } from "@/lib/auth/mensajes";
import { LARGO_MINIMO_CONTRASENA } from "@/lib/auth/recuperacion";
import { RUTAS_AUTH, rutaDelArea, type TipoArea } from "@/lib/auth/rutas";

/**
 * Pantallas de ingreso de los dos paneles (cliente y master). Están en español, como el
 * panel, hasta la etapa C. Los ids de los formularios los usa scripts/e2e-login.mjs.
 */

/** Query de las pantallas: claves de mensajes (no textos) y el token del link de recuperación. */
export type ParamsAuth = { error?: string; info?: string; token_hash?: string };

type PropsPagina = { tipo: TipoArea; searchParams: Promise<ParamsAuth> };

const TITULO: Record<TipoArea, string> = { tenant: "Panel de gestión", master: "Panel master" };
const ETIQUETA = "font-sans text-sm text-texto-suave";
const CAMPO =
  "mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario";
const BOTON =
  "mt-2 rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60";
const ENLACE = "font-sans text-sm text-primario hover:text-primario-oscuro";

function Pantalla({
  titulo,
  subtitulo,
  params,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  params: ParamsAuth;
  children: React.ReactNode;
}) {
  const error = mensajeError(params.error);
  const info = mensajeInfo(params.info);
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6">
      <div className="w-full max-w-sm rounded-2xl border border-primario/15 bg-white/70 p-8">
        <h1 className="font-serif text-3xl text-texto">{titulo}</h1>
        {subtitulo && <p className="mt-1 font-sans text-sm text-texto-suave">{subtitulo}</p>}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="mt-4 rounded-lg bg-secundario/10 px-3 py-2 font-sans text-sm text-secundario-oscuro">
            {info}
          </p>
        )}
        {children}
      </div>
    </main>
  );
}

export async function PaginaLogin({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  return (
    <Pantalla
      titulo={TITULO[tipo]}
      subtitulo={tipo === "master" ? "Ingresá para administrar la plataforma." : "Ingresá para administrar tu sitio."}
      params={params}
    >
      <form id="form-login" action={iniciarSesion} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          Email
          <input name="email" type="email" required autoComplete="email" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Contraseña
          <input name="password" type="password" required autoComplete="current-password" className={CAMPO} />
        </label>
        <SubmitButton className={BOTON}>Ingresar</SubmitButton>
        <FormPendingOverlay label="Ingresando…" />
      </form>
      <p className="mt-4 text-center">
        <Link href={rutaDelArea(tipo, RUTAS_AUTH.recuperar)} className={ENLACE}>
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </Pantalla>
  );
}

export async function PaginaVerificar({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  return (
    <Pantalla
      titulo="Verificá que sos vos"
      subtitulo="Ingresá el código de 6 números que te enviamos por email. Vence en 10 minutos."
      params={params}
    >
      <form id="form-verificar" action={verificarCodigo} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          Código
          <input
            name="codigo"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            className={`${CAMPO} text-center text-xl tracking-[0.4em]`}
          />
        </label>
        <label className="flex items-center gap-2 font-sans text-sm text-texto-suave">
          <input type="checkbox" name="recordar" className="accent-primario" />
          Recordar este dispositivo por 30 días
        </label>
        <SubmitButton className={BOTON}>Verificar</SubmitButton>
        <FormPendingOverlay label="Verificando…" />
      </form>
      <div className="mt-4 flex items-center justify-between">
        <form id="form-reenviar" action={reenviarCodigo}>
          <button className={ENLACE}>Reenviar código</button>
        </form>
        <form id="form-salir" action={cerrarSesion}>
          <button className={ENLACE}>Usar otra cuenta</button>
        </form>
      </div>
      <p className="mt-2 text-center font-sans text-xs text-texto-suave">
        {tipo === "master" ? "Panel master" : "Panel de gestión"}
      </p>
    </Pantalla>
  );
}

export async function PaginaRecuperar({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  return (
    <Pantalla
      titulo="Recuperar contraseña"
      subtitulo="Ingresá tu email y te mandamos un link para elegir una contraseña nueva."
      params={params}
    >
      <form id="form-recuperar" action={pedirRecuperacion} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          Email
          <input name="email" type="email" required autoComplete="email" className={CAMPO} />
        </label>
        <SubmitButton className={BOTON}>Enviar link</SubmitButton>
        <FormPendingOverlay label="Enviando…" />
      </form>
      <p className="mt-4 text-center">
        <Link href={rutaDelArea(tipo, RUTAS_AUTH.login)} className={ENLACE}>
          Volver a ingresar
        </Link>
      </p>
    </Pantalla>
  );
}

export async function PaginaRestablecer({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  if (!params.token_hash) {
    return (
      <Pantalla titulo="Elegí una contraseña nueva" params={{ error: "link" }}>
        <p className="mt-6 text-center">
          <Link href={rutaDelArea(tipo, RUTAS_AUTH.recuperar)} className={ENLACE}>
            Pedir un link nuevo
          </Link>
        </p>
      </Pantalla>
    );
  }
  return (
    <Pantalla
      titulo="Elegí una contraseña nueva"
      subtitulo={`Al menos ${LARGO_MINIMO_CONTRASENA} caracteres. Después vas a ingresar con ella y un código por email.`}
      params={params}
    >
      <form id="form-restablecer" action={restablecerContrasena} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="token_hash" defaultValue={params.token_hash} />
        <label className={ETIQUETA}>
          Contraseña nueva
          <input
            name="password"
            type="password"
            required
            minLength={LARGO_MINIMO_CONTRASENA}
            autoComplete="new-password"
            className={CAMPO}
          />
        </label>
        <label className={ETIQUETA}>
          Repetila
          <input
            name="confirmacion"
            type="password"
            required
            minLength={LARGO_MINIMO_CONTRASENA}
            autoComplete="new-password"
            className={CAMPO}
          />
        </label>
        <SubmitButton className={BOTON}>Guardar contraseña</SubmitButton>
        <FormPendingOverlay label="Guardando…" />
      </form>
    </Pantalla>
  );
}
