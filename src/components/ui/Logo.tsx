import Image from "next/image";

/** Logo del tenant; si no tiene, muestra el nombre. */
export function Logo({
  src,
  alt,
  className = "h-11 w-auto sm:h-14",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) return <span className="font-serif text-2xl">{alt}</span>;
  return <Image src={src} alt={alt} width={1080} height={489} priority className={className} />;
}
