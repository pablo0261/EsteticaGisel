"use server";

import { claveCredencialesConfigurada } from "@/lib/cripto/clave";
import { parsearGoogle } from "@/lib/integraciones/formularios";
import { desconectarGoogleDeTenant, guardarGoogleDeTenant, guardarMercadoPagoDeTenant } from "@/lib/integraciones/guardar";
import { parsearMp } from "@/lib/master/formularios";
import { ir, tenantDeAccion } from "@/lib/panel/servidor";

const RUTA = "/admin/conexiones";

export async function guardarMercadoPago(formData: FormData) {
  const tenant = await tenantDeAccion("conexiones");
  if (!claveCredencialesConfigurada()) ir(RUTA, { error: "clave_credenciales" });
  const form = parsearMp(formData);
  if (!form.ok) ir(RUTA, { error: form.error });
  const resultado = await guardarMercadoPagoDeTenant(tenant.id, form.valor);
  if (resultado !== "ok") ir(RUTA, { error: resultado });
  ir(RUTA, { ok: "guardado" });
}

export async function guardarGoogle(formData: FormData) {
  const tenant = await tenantDeAccion("conexiones");
  if (!claveCredencialesConfigurada()) ir(RUTA, { error: "clave_credenciales" });
  const form = parsearGoogle(formData);
  if (!form.ok) ir(RUTA, { error: form.error });
  const resultado = await guardarGoogleDeTenant(tenant.id, form.valor);
  if (resultado !== "ok") ir(RUTA, { error: resultado });
  ir(RUTA, { ok: "guardado" });
}

export async function desconectarGoogle() {
  const tenant = await tenantDeAccion("conexiones");
  await desconectarGoogleDeTenant(tenant.id);
  ir(RUTA, { ok: "google_desconectado" });
}
