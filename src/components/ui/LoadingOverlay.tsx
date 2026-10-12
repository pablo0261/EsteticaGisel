/** Overlay de carga: spinner con el color primario del tenant y un texto opcional. */
export function LoadingOverlay({
  show,
  label,
}: {
  show: boolean;
  label?: string;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-fondo/85 backdrop-blur-sm">
      <span
        aria-hidden
        className="h-14 w-14 animate-spin rounded-full border-4 border-primario/20 border-t-primario"
      />
      {label && <p className="font-sans text-sm text-texto-suave">{label}</p>}
    </div>
  );
}
