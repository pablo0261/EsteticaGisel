import { VIGENCIA_DISPOSITIVO_MS } from "./dispositivo";

/** Duración de las cookies mfa y dispositivo (la mfa además muere con la sesión). */
export const DURACION_COOKIE_S = VIGENCIA_DISPOSITIVO_MS / 1000;

export type OpcionesCookie = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

/** httpOnly y SameSite=Lax siempre; Secure salvo que sea http explícito (en desarrollo es http). */
export function opcionesCookieAuth(protocolo: string, maxAgeSegundos: number): OpcionesCookie {
  return { httpOnly: true, secure: protocolo.toLowerCase() !== "http", sameSite: "lax", path: "/", maxAge: maxAgeSegundos };
}

/** Mismo criterio que urlDelTenant: https salvo que el .env diga otra cosa. */
export function protocoloPlataforma(): string {
  return process.env.PLATFORM_PROTOCOLO || "https";
}
