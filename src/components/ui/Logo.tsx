import Image from "next/image";

const SRC = {
  dark: "/brand/horizontal-negro.png",
  light: "/brand/horizontal-blanco.png",
  mauve: "/brand/horizontal-rosa.png",
} as const;

/** Logo de marca (lockup horizontal). El color se elige según el fondo. */
export function Logo({
  variant = "dark",
  className = "h-11 w-auto sm:h-14",
}: {
  variant?: "dark" | "light" | "mauve";
  className?: string;
}) {
  return (
    <Image
      src={SRC[variant]}
      alt="Gisel Bigurrarena · Estética y Salud"
      width={1080}
      height={489}
      priority
      className={className}
    />
  );
}
