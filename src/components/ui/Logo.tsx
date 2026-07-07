/**
 * Logo tipográfico de marca (fallback hasta cargar el asset real en public/brand/).
 * Monograma "GB" en serif + wordmark. Cambiar por <Image> cuando estén los archivos.
 */
export function Logo({
  variant = "dark",
  showName = true,
}: {
  variant?: "dark" | "light" | "mauve";
  showName?: boolean;
}) {
  const color =
    variant === "light"
      ? "text-cream"
      : variant === "mauve"
        ? "text-mauve"
        : "text-ink";

  return (
    <span className={`flex items-center gap-2.5 ${color}`}>
      <span className="font-serif text-3xl font-semibold leading-none tracking-tight">
        GB
      </span>
      {showName && (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-lg leading-tight">
            Gisel Bigurrarena
          </span>
          <span className="font-sans text-[0.55rem] uppercase tracking-[0.3em] opacity-70">
            Estética y Salud
          </span>
        </span>
      )}
    </span>
  );
}
