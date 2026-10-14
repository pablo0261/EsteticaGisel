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
import { IDIOMA_POR_DEFECTO, traductor, type Idioma, type Textos } from "@/lib/i18n/textos";
import { tenantDelHost } from "@/lib/tenant/actual";

/**
 * Pantallas de ingreso de los dos paneles. Las del cliente, en el idioma del tenant del host;
 * las del master, en español. Los ids de los formularios los usan los scripts E2E.
 */

/** Query de las pantallas: claves de mensajes (no textos) y el token del link de recuperación. */
export type ParamsAuth = { error?: string; info?: string; token_hash?: string };

type PropsPagina = { tipo: TipoArea; searchParams: Promise<ParamsAuth> };
type Traductor = (textos: Textos) => string;

const TITULO: Record<TipoArea, Textos> = {
  tenant: { es: "Panel de gestión", pt: "Painel de gestão" },
  master: { es: "Panel master", pt: "Painel master" },
};
const ETIQUETA = "font-sans text-sm text-texto-suave";
const CAMPO =
  "mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario";
const BOTON =
  "mt-2 rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60";
const ENLACE = "font-sans text-sm text-primario hover:text-primario-oscuro";

async function idiomaDelArea(tipo: TipoArea): Promise<Idioma> {
  if (tipo === "master") return IDIOMA_POR_DEFECTO;
  return (await tenantDelHost())?.idioma ?? IDIOMA_POR_DEFECTO;
}

function Pantalla({
  titulo,
  subtitulo,
  params,
  idioma,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  params: ParamsAuth;
  idioma: Idioma;
  children: React.ReactNode;
}) {
  const error = mensajeError(params.error, idioma);
  const info = mensajeInfo(params.info, idioma);
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

async function contexto(tipo: TipoArea): Promise<{ idioma: Idioma; t: Traductor }> {
  const idioma = await idiomaDelArea(tipo);
  return { idioma, t: traductor(idioma) };
}

export async function PaginaLogin({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  const { idioma, t } = await contexto(tipo);
  return (
    <Pantalla
      titulo={t(TITULO[tipo])}
      subtitulo={
        tipo === "master"
          ? "Ingresá para administrar la plataforma."
          : t({ es: "Ingresá para administrar tu sitio.", pt: "Entre para administrar seu site." })
      }
      params={params}
      idioma={idioma}
    >
      <form id="form-login" action={iniciarSesion} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          {t({ es: "Email", pt: "E-mail" })}
          <input name="email" type="email" required autoComplete="email" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {t({ es: "Contraseña", pt: "Senha" })}
          <input name="password" type="password" required autoComplete="current-password" className={CAMPO} />
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Ingresar", pt: "Entrar" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Ingresando…", pt: "Entrando…" })} />
      </form>
      <p className="mt-4 text-center">
        <Link href={rutaDelArea(tipo, RUTAS_AUTH.recuperar)} className={ENLACE}>
          {t({ es: "¿Olvidaste tu contraseña?", pt: "Esqueceu sua senha?" })}
        </Link>
      </p>
    </Pantalla>
  );
}

export async function PaginaVerificar({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  const { idioma, t } = await contexto(tipo);
  return (
    <Pantalla
      titulo={t({ es: "Verificá que sos vos", pt: "Confirme que é você" })}
      subtitulo={t({
        es: "Ingresá el código de 6 números que te enviamos por email. Vence en 10 minutos.",
        pt: "Digite o código de 6 números que enviamos por e-mail. Ele expira em 10 minutos.",
      })}
      params={params}
      idioma={idioma}
    >
      <form id="form-verificar" action={verificarCodigo} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          {t({ es: "Código", pt: "Código" })}
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
          {t({ es: "Recordar este dispositivo por 30 días", pt: "Lembrar deste dispositivo por 30 dias" })}
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Verificar", pt: "Verificar" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Verificando…", pt: "Verificando…" })} />
      </form>
      <div className="mt-4 flex items-center justify-between">
        <form id="form-reenviar" action={reenviarCodigo}>
          <button className={ENLACE}>{t({ es: "Reenviar código", pt: "Reenviar código" })}</button>
        </form>
        <form id="form-salir" action={cerrarSesion}>
          <button className={ENLACE}>{t({ es: "Usar otra cuenta", pt: "Usar outra conta" })}</button>
        </form>
      </div>
      <p className="mt-2 text-center font-sans text-xs text-texto-suave">{t(TITULO[tipo])}</p>
    </Pantalla>
  );
}

export async function PaginaRecuperar({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  const { idioma, t } = await contexto(tipo);
  return (
    <Pantalla
      titulo={t({ es: "Recuperar contraseña", pt: "Recuperar senha" })}
      subtitulo={t({
        es: "Ingresá tu email y te mandamos un link para elegir una contraseña nueva.",
        pt: "Informe seu e-mail e enviaremos um link para escolher uma nova senha.",
      })}
      params={params}
      idioma={idioma}
    >
      <form id="form-recuperar" action={pedirRecuperacion} className="mt-6 flex flex-col gap-4">
        <label className={ETIQUETA}>
          {t({ es: "Email", pt: "E-mail" })}
          <input name="email" type="email" required autoComplete="email" className={CAMPO} />
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Enviar link", pt: "Enviar link" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Enviando…", pt: "Enviando…" })} />
      </form>
      <p className="mt-4 text-center">
        <Link href={rutaDelArea(tipo, RUTAS_AUTH.login)} className={ENLACE}>
          {t({ es: "Volver a ingresar", pt: "Voltar para o login" })}
        </Link>
      </p>
    </Pantalla>
  );
}

export async function PaginaRestablecer({ tipo, searchParams }: PropsPagina) {
  const params = await searchParams;
  const { idioma, t } = await contexto(tipo);
  const titulo = t({ es: "Elegí una contraseña nueva", pt: "Escolha uma nova senha" });
  if (!params.token_hash) {
    return (
      <Pantalla titulo={titulo} params={{ error: "link" }} idioma={idioma}>
        <p className="mt-6 text-center">
          <Link href={rutaDelArea(tipo, RUTAS_AUTH.recuperar)} className={ENLACE}>
            {t({ es: "Pedir un link nuevo", pt: "Pedir um link novo" })}
          </Link>
        </p>
      </Pantalla>
    );
  }
  return (
    <Pantalla
      titulo={titulo}
      subtitulo={t({
        es: `Al menos ${LARGO_MINIMO_CONTRASENA} caracteres. Después vas a ingresar con ella y un código por email.`,
        pt: `Pelo menos ${LARGO_MINIMO_CONTRASENA} caracteres. Depois você vai entrar com ela e um código por e-mail.`,
      })}
      params={params}
      idioma={idioma}
    >
      <form id="form-restablecer" action={restablecerContrasena} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="token_hash" defaultValue={params.token_hash} />
        <label className={ETIQUETA}>
          {t({ es: "Contraseña nueva", pt: "Nova senha" })}
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
          {t({ es: "Repetila", pt: "Repita a senha" })}
          <input
            name="confirmacion"
            type="password"
            required
            minLength={LARGO_MINIMO_CONTRASENA}
            autoComplete="new-password"
            className={CAMPO}
          />
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Guardar contraseña", pt: "Salvar senha" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Guardando…", pt: "Salvando…" })} />
      </form>
    </Pantalla>
  );
}
