const ID_VALIDO = /^[\w-]{11}$/;

/** Id de video a partir de un link de YouTube (watch, youtu.be, shorts, embed), o null. */
export function youtubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");

  let id: string | null = null;
  if (host === "youtu.be") {
    id = u.pathname.slice(1);
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, tipo, valor] = u.pathname.split("/");
    id = tipo === "watch" ? u.searchParams.get("v") : ["shorts", "embed"].includes(tipo) ? valor : null;
  }
  return id && ID_VALIDO.test(id) ? id : null;
}

/** Miniatura 4:3 con franjas negras: recortarla a 16:9 (object-cover) deja solo el cuadro. */
export function youtubeMiniatura(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
