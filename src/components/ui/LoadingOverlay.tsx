import Image from "next/image";

export function LoadingOverlay({
  show,
  label,
}: {
  show: boolean;
  label?: string;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-cream/85 backdrop-blur-sm">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-mauve/20 border-t-mauve" />
        <Image
          src="/brand/gb-rosa.png"
          alt=""
          width={44}
          height={44}
          className="animate-pulse"
        />
      </div>
      {label && <p className="font-sans text-sm text-ink-soft">{label}</p>}
    </div>
  );
}
