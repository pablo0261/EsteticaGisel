"use client";

import { useState, useTransition } from "react";
import { SlotPicker } from "./SlotPicker";
import { reservarTurno } from "@/app/sitio/[tenant]/turnos/actions";
import { formatPrecio } from "@/lib/format";
import { calcularMontoSena } from "@/lib/turnos/reglas";
import { EJEMPLO_WHATSAPP } from "@/lib/turnos/ejemplo-whatsapp";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { T, useIdioma, useT } from "@/lib/i18n/cliente";
import type { Servicio } from "@/lib/data/types";
import type { Moneda, Pais } from "@/lib/tenant/tipos";

export function ReservaForm({
  servicios,
  senaPorcentaje,
  moneda,
  pais,
  zonaHoraria,
}: {
  servicios: Servicio[];
  senaPorcentaje: number;
  moneda: Moneda;
  pais: Pais;
  zonaHoraria: string;
}) {
  const idioma = useIdioma();
  const t = useT();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    servicios[0] ? [servicios[0].id] : [],
  );
  const [fecha, setFecha] = useState("");
  const [iso, setIso] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const precio = (monto: number) => formatPrecio(monto, moneda, idioma);
  const seleccionados = servicios.filter((s) => selectedIds.includes(s.id));
  const precioTotal = seleccionados.reduce((sum, s) => sum + s.precio, 0);
  const montoSena = calcularMontoSena(precioTotal, senaPorcentaje);
  const sena = montoSena > 0 ? precio(montoSena) : "";

  function toggleServicio(id: string) {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return servicios.filter((s) => set.has(s.id)).map((s) => s.id);
    });
    setIso("");
  }

  function onSubmit(formData: FormData) {
    setError(null);
    selectedIds.forEach((id) => formData.append("servicioIds", id));
    formData.set("fecha", fecha);
    formData.set("iso", iso);

    startTransition(async () => {
      const result = await reservarTurno(formData);
      if (result.ok) {
        window.location.href = result.initPoint;
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-6">
      <div>
        <label className="font-sans text-sm font-medium text-texto">
          <T es="Elegí uno o más servicios" pt="Escolha um ou mais serviços" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {servicios.map((s) => {
            const activo = selectedIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleServicio(s.id)}
                className={`flex flex-col rounded-xl border p-3 text-left transition ${
                  activo
                    ? "border-primario bg-primario/10"
                    : "border-primario/20 bg-white/60 hover:border-primario/40"
                }`}
              >
                <span className="font-sans text-sm font-medium text-texto">{s.nombre}</span>
                <span className="mt-1 font-sans text-xs text-texto-suave">
                  {s.precio > 0 ? precio(s.precio) : t({ es: "Consultar", pt: "Sob consulta" })}
                </span>
              </button>
            );
          })}
        </div>

        {selectedIds.length > 1 && (
          <p className="mt-3 rounded-lg bg-secundario/10 px-3 py-2 font-sans text-sm text-secundario">
            <T
              es="Elegiste más de un servicio: los horarios que se muestran abajo son los que tienen ambos turnos disponibles de forma consecutiva. Si preferís horarios separados, hacé una reserva por cada servicio."
              pt="Você escolheu mais de um serviço: os horários abaixo são os que têm todos os atendimentos disponíveis em sequência. Se preferir horários separados, faça um agendamento para cada serviço."
            />
          </p>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div>
          <label className="font-sans text-sm font-medium text-texto">
            <T es="Elegí día y horario" pt="Escolha dia e horário" />
          </label>
          <div className="mt-2">
            <SlotPicker
              servicioIds={selectedIds}
              zonaHoraria={zonaHoraria}
              onSelect={(f, i) => {
                setFecha(f);
                setIso(i);
              }}
            />
          </div>
        </div>
      )}

      {iso && (
        <div className="flex flex-col gap-4 rounded-2xl border border-primario/15 bg-white/60 p-5">
          <p className="font-sans text-sm text-texto-suave">
            {t({
              es: `Reservás con una seña de ${sena} (se descuenta del precio total del servicio).`,
              pt: `Você agenda com um sinal de ${sena} (descontado do valor total do serviço).`,
            })}
          </p>
          <label className="font-sans text-sm text-texto-suave">
            <T es="Nombre y apellido" pt="Nome e sobrenome" />
            <input
              name="clienteNombre"
              required
              className="mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto"
            />
          </label>
          <label className="font-sans text-sm text-texto-suave">
            <T es="Email" pt="E-mail" />
            <input
              name="clienteEmail"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto"
            />
          </label>
          <label className="font-sans text-sm text-texto-suave">
            WhatsApp
            <input
              name="clienteTelefono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder={`${t({ es: "Ej:", pt: "Ex:" })} ${EJEMPLO_WHATSAPP[pais]}`}
              className="mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60"
          >
            <T es="Confirmar reserva" pt="Confirmar agendamento" />
          </button>
        </div>
      )}
      <LoadingOverlay
        show={pending}
        label={t({ es: "Redirigiendo a Mercado Pago…", pt: "Redirecionando para o Mercado Pago…" })}
      />
    </form>
  );
}
