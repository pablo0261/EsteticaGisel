import Link from "next/link";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "outline" | "onDark";
  className?: string;
};

const base =
  "inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-medium tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario";

const variants = {
  solid: "bg-primario text-fondo hover:bg-primario-oscuro",
  outline: "border border-primario text-primario hover:bg-primario hover:text-fondo",
  onDark: "bg-fondo text-texto hover:bg-fondo-oscuro",
} as const;

export function Button({ href, children, variant = "solid", className = "" }: Props) {
  const classes = `${base} ${variants[variant]} ${className}`;
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
