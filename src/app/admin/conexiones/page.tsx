import type { Metadata } from "next";
import {
  AYUDA,
  BOTON,
  BOTON_SECUNDARIO,
  CAMPO,
  ETIQUETA,
  Mensajes,
  SUBTITULO,
  TARJETA,
  TITULO,
  type ParamsPanel,
} from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { claveCredencialesConfigurada } from "@/lib/cripto/clave";
import { estadoIntegraciones } from "@/lib/integraciones/cuenta";
import { traductor, type Textos } from "@/lib/i18n/textos";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { urlDelTenant } from "@/lib/tenant/urls";
import { desconectarGoogle, guardarGoogle, guardarMercadoPago } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Conexiones", pt: "Conexões" });
}

const MANTENER = { es: "configurado (vacío = mantener)", pt: "configurado (vazio = manter)" };

function pasos(items: Textos[], t: (x: Textos) => string) {
  return (
    <ol className="mt-3 list-decimal space-y-2 pl-5 font-sans text-sm text-texto">
      {items.map((item) => (
        <li key={item.es}>{t(item)}</li>
      ))}
    </ol>
  );
}

export default async function ConexionesAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("conexiones");
  if (!tenant) return null;
  const t = traductor(tenant.idioma);
  const estado = await estadoIntegraciones(tenant.id);
  const base = urlDelTenant(tenant.slug);
  const webhook = `${base}/api/webhooks/mercadopago`;
  const callback = `${base}/api/auth/google/callback`;
  const listoMp = estado.mpToken && estado.mpSecreto;
  const listoGoogle = estado.googleConectado && !!estado.googleClientId && estado.googleSecreto;

  return (
    <div className="max-w-2xl">
      <h1 className={TITULO}>{t({ es: "Conexiones", pt: "Conexões" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: "El sitio ya funciona sin Mercado Pago y sin Google Calendar: las reservas quedan confirmadas y se anotan en el panel. Estas conexiones se activan cuando las cargues.",
          pt: "O site já funciona sem Mercado Pago e sem Google Calendar: os horários ficam confirmados e aparecem no painel. Estas conexões são ativadas quando você as carregar.",
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>
      {!claveCredencialesConfigurada() && (
        <p role="alert" className="mb-6 rounded-lg bg-primario/10 px-4 py-3 font-sans text-sm text-primario-oscuro">
          {t({
            es: "El servidor no tiene CREDENCIALES_KEY. Sin esa clave no se puede guardar ningún secreto.",
            pt: "O servidor não tem CREDENCIALES_KEY. Sem essa chave não dá para guardar nenhum segredo.",
          })}
        </p>
      )}

      <section className={`${TARJETA} flex flex-col gap-4`}>
        <h2 className="font-serif text-2xl text-texto">Mercado Pago</h2>
        <p className="font-sans text-sm text-texto">
          {listoMp
            ? t({ es: "Listo para cobrar online.", pt: "Pronto para cobrar online." })
            : t({ es: "Todavía no cobra online.", pt: "Ainda não cobra online." })}
          {" · "}
          {t({ es: "Access token", pt: "Access token" })}: <strong>{estado.mpToken ? "✓" : "—"}</strong>
          {" · "}
          {t({ es: "Secreto del webhook", pt: "Segredo do webhook" })}: <strong>{estado.mpSecreto ? "✓" : "—"}</strong>
        </p>
        {pasos(
          [
            {
              es: "Entrá a mercadopago.com con la cuenta que va a cobrar → Tus integraciones → Crear aplicación (o abrí la que ya tengas).",
              pt: "Entre em mercadopago.com com a conta que vai receber → Suas integrações → Criar aplicação (ou abra a que já existe).",
            },
            {
              es: "En Credenciales de producción (o de prueba, para ensayar) copiá el Access token y la Public key.",
              pt: "Em Credenciais de produção (ou de teste, para ensaiar) copie o Access token e a Public key.",
            },
            {
              es: `En Webhooks, pegá esta URL y elegí el evento Pagos: ${webhook}. Copiá el secreto que te muestra.`,
              pt: `Em Webhooks, cole esta URL e escolha o evento Pagamentos: ${webhook}. Copie o segredo que aparece.`,
            },
            {
              es: "Pegá los tres valores acá y guardá. Un campo vacío no borra lo que ya estaba.",
              pt: "Cole os três valores aqui e salve. Um campo vazio não apaga o que já estava.",
            },
            {
              es: "En Horarios y reglas, elegí Seña o Pago total. Con “Sin pago anticipado” no se usa Mercado Pago.",
              pt: "Em Horários e regras, escolha Sinal ou Pagamento total. Com “Sem pagamento antecipado” o Mercado Pago não é usado.",
            },
          ],
          t,
        )}
        <p className={AYUDA}>
          {t({ es: "URL del webhook (copiala tal cual):", pt: "URL do webhook (copie exatamente):" })}{" "}
          <span className="break-all text-texto">{webhook}</span>
        </p>
        <form id="form-mp" action={guardarMercadoPago} className="flex flex-col gap-4">
          <FormPendingOverlay label={t({ es: "Guardando…", pt: "Salvando…" })} />
          <label className={ETIQUETA}>
            Access token
            <input
              name="mp_access_token"
              type="password"
              autoComplete="new-password"
              placeholder={estado.mpToken ? t(MANTENER) : "APP_USR-… o TEST-…"}
              className={CAMPO}
            />
          </label>
          <label className={ETIQUETA}>
            Public key
            <input
              name="mp_public_key"
              defaultValue={estado.mpPublicKey ?? ""}
              autoComplete="off"
              placeholder="APP_USR-…"
              className={CAMPO}
            />
          </label>
          <label className={ETIQUETA}>
            {t({ es: "Secreto del webhook", pt: "Segredo do webhook" })}
            <input
              name="mp_webhook_secret"
              type="password"
              autoComplete="new-password"
              placeholder={estado.mpSecreto ? t(MANTENER) : t({ es: "de la aplicación, en Webhooks", pt: "da aplicação, em Webhooks" })}
              className={CAMPO}
            />
          </label>
          <div>
            <SubmitButton className={BOTON}>{t({ es: "Guardar Mercado Pago", pt: "Salvar Mercado Pago" })}</SubmitButton>
          </div>
        </form>
      </section>

      <section className={`${TARJETA} mt-8 flex flex-col gap-4`}>
        <h2 className="font-serif text-2xl text-texto">Google Calendar</h2>
        <p className="font-sans text-sm text-texto">
          {listoGoogle
            ? t({ es: "Calendario conectado. Cada turno confirmado crea un evento.", pt: "Calendário conectado. Cada horário confirmado cria um evento." })
            : t({
                es: "Sin calendario: los turnos igual se guardan en el panel.",
                pt: "Sem calendário: os horários mesmo assim ficam salvos no painel.",
              })}
        </p>
        {pasos(
          [
            {
              es: "Entrá a console.cloud.google.com → proyecto nuevo → APIs y servicios → Biblioteca → activá Google Calendar API.",
              pt: "Entre em console.cloud.google.com → projeto novo → APIs e serviços → Biblioteca → ative Google Calendar API.",
            },
            {
              es: "En Pantalla de consentimiento, creá una de tipo Externo y agregá tu email como usuario de prueba.",
              pt: "Em Tela de consentimento, crie uma do tipo Externo e adicione seu e-mail como usuário de teste.",
            },
            {
              es: `En Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web. En URIs de redirección pegá: ${callback}`,
              pt: `Em Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web. Em URIs de redirecionamento cole: ${callback}`,
            },
            {
              es: "Copiá el Client ID y el Client secret, pegálos acá y guardá. El id del calendario puede quedar vacío (usa el principal).",
              pt: "Copie o Client ID e o Client secret, cole aqui e salve. O id do calendário pode ficar vazio (usa o principal).",
            },
            {
              es: "Apretá Conectar calendario e iniciá sesión con la cuenta de Google del calendario. No se muestra ninguna clave: queda guardada en el servidor.",
              pt: "Toque em Conectar calendário e entre com a conta do Google do calendário. Nenhuma chave é mostrada: fica guardada no servidor.",
            },
          ],
          t,
        )}
        <p className={AYUDA}>
          {t({ es: "URI de redirección (copiala tal cual):", pt: "URI de redirecionamento (copie exatamente):" })}{" "}
          <span className="break-all text-texto">{callback}</span>
        </p>
        <form id="form-google" action={guardarGoogle} className="flex flex-col gap-4">
          <FormPendingOverlay label={t({ es: "Guardando…", pt: "Salvando…" })} />
          <label className={ETIQUETA}>
            Client ID
            <input
              name="google_client_id"
              defaultValue={estado.googleClientId ?? ""}
              autoComplete="off"
              placeholder="….apps.googleusercontent.com"
              className={CAMPO}
            />
          </label>
          <label className={ETIQUETA}>
            Client secret
            <input
              name="google_client_secret"
              type="password"
              autoComplete="new-password"
              placeholder={estado.googleSecreto ? t(MANTENER) : "GOCSPX-…"}
              className={CAMPO}
            />
          </label>
          <label className={ETIQUETA}>
            {t({ es: "Id del calendario (opcional)", pt: "Id do calendário (opcional)" })}
            <input
              name="google_calendar_id"
              defaultValue={estado.googleCalendarId ?? ""}
              autoComplete="off"
              placeholder="primary"
              className={CAMPO}
            />
          </label>
          <div>
            <SubmitButton className={BOTON}>{t({ es: "Guardar app de Google", pt: "Salvar app do Google" })}</SubmitButton>
          </div>
        </form>
        {estado.googleClientId && estado.googleSecreto ? (
          <div className="flex flex-wrap items-center gap-3">
            <a href="/api/auth/google/authorize" className={BOTON}>
              {t({ es: "Conectar calendario", pt: "Conectar calendário" })}
            </a>
            {estado.googleConectado && (
              <form action={desconectarGoogle}>
                <SubmitButton className={BOTON_SECUNDARIO}>{t({ es: "Desconectar", pt: "Desconectar" })}</SubmitButton>
              </form>
            )}
          </div>
        ) : (
          <p className={AYUDA}>
            {t({
              es: "El botón Conectar aparece después de guardar el Client ID y el Client secret.",
              pt: "O botão Conectar aparece depois de salvar o Client ID e o Client secret.",
            })}
          </p>
        )}
      </section>
    </div>
  );
}
