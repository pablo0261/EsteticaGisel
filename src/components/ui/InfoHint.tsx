export function InfoHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-secundario/10 px-3 py-2 font-sans text-xs text-secundario-oscuro">
      <span aria-hidden>ⓘ</span>
      <span>{children}</span>
    </p>
  );
}
