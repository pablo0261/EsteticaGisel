"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { youtubeMiniatura } from "@/lib/video/youtube";

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  destroy(): void;
};
type YTEvento = { data: number };

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_ENDED = 0;

let apiLista: Promise<void> | null = null;
function cargarApiYoutube(): Promise<void> {
  apiLista ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiLista;
}

type Estado = "listo" | "cargando" | "reproduciendo" | "pausado" | "terminado";

/**
 * Vista previa limitada de un video de YouTube: sin controles, corte a los `segundos`
 * y, al llegar, se bloquea con un llamado a comprar. Es una barrera de experiencia, no de
 * seguridad: el video público sigue siendo accesible en YouTube. El contenido pago debe
 * ser otro video (el del curso vive en Storage privado y se libera al pagar).
 */
export function VistaPreviaYoutube({
  videoId,
  titulo,
  segundos,
}: {
  videoId: string;
  titulo: string;
  segundos: number;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const terminado = useRef(false);
  const [estado, setEstado] = useState<Estado>("listo");

  // Corte duro: el reproductor se pausa al llegar al límite.
  useEffect(() => {
    if (estado !== "reproduciendo") return;
    const id = setInterval(() => {
      if ((player.current?.getCurrentTime() ?? 0) >= segundos) {
        terminado.current = true;
        player.current?.pauseVideo();
        setEstado("terminado");
      }
    }, 200);
    return () => clearInterval(id);
  }, [estado, segundos]);

  useEffect(() => () => player.current?.destroy(), []);

  async function iniciar() {
    if (!contenedor.current) return;
    setEstado("cargando");
    await cargarApiYoutube();
    const destino = document.createElement("div");
    contenedor.current.replaceChildren(destino);
    player.current = new window.YT!.Player(destino, {
      host: "https://www.youtube-nocookie.com",
      videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
        autoplay: 1,
        end: segundos,
      },
      events: {
        onReady: (e: { target: YTPlayer }) => e.target.playVideo(),
        onStateChange: (e: YTEvento) => {
          if (terminado.current) return;
          if (e.data === YT_PLAYING) setEstado("reproduciendo");
          else if (e.data === YT_PAUSED) setEstado("pausado");
          else if (e.data === YT_ENDED) {
            terminado.current = true;
            setEstado("terminado");
          }
        },
      },
    });
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-texto shadow-sm">
      <div ref={contenedor} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />

      {estado === "listo" || estado === "cargando" ? (
        <button
          type="button"
          onClick={iniciar}
          disabled={estado === "cargando"}
          aria-label={`Ver vista previa: ${titulo}`}
          className="absolute inset-0 z-10"
        >
          <Image
            src={youtubeMiniatura(videoId)}
            alt=""
            fill
            sizes="(min-width: 672px) 672px, 100vw"
            className="object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-texto/10">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-fondo/90 text-primario-oscuro shadow-md">
              {estado === "cargando" ? (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-primario-oscuro border-t-transparent" />
              ) : (
                <svg aria-hidden viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </span>
          </span>
        </button>
      ) : estado === "terminado" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-texto/90 px-6 text-center">
          <svg aria-hidden viewBox="0 0 24 24" className="h-9 w-9 fill-fondo">
            <path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z" />
          </svg>
          <p className="font-serif text-2xl text-fondo">Seguí viendo el curso completo</p>
          <p className="font-sans text-sm text-fondo/70">
            Se libera apenas se acredita el pago.
          </p>
          <a
            href="#comprar"
            className="mt-1 inline-flex rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro"
          >
            Comprar el curso
          </a>
        </div>
      ) : (
        // Capa transparente: bloquea el hover/click sobre el iframe (título, "Ver en YouTube").
        <button
          type="button"
          onClick={() =>
            estado === "reproduciendo" ? player.current?.pauseVideo() : player.current?.playVideo()
          }
          aria-label={estado === "reproduciendo" ? "Pausar" : "Reanudar"}
          className="absolute inset-0 z-10 cursor-pointer"
        >
          {estado === "pausado" && (
            <span className="absolute inset-0 flex items-center justify-center bg-texto/40">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-fondo/90 text-primario-oscuro shadow-md">
                <svg aria-hidden viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          )}
        </button>
      )}
    </div>
  );
}
