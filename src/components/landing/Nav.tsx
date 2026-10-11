"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import type { Modulos } from "@/lib/tenant/tipos";

export function Nav({
  nombre,
  logoUrl,
  modulos,
  whatsappUrl,
}: {
  nombre: string;
  logoUrl: string | null;
  modulos: Modulos;
  whatsappUrl: string | null;
}) {
  const links = [
    { href: "/#servicios", label: "Servicios" },
    ...(modulos.sobreMi ? [{ href: "/#sobre-mi", label: "Sobre mí" }] : []),
    ...(modulos.testimonios ? [{ href: "/#testimonios", label: "Testimonios" }] : []),
    ...(modulos.cursos ? [{ href: "/cursos", label: "Cursos" }] : []),
    { href: "/#contacto", label: "Contacto" },
  ];
  const reservarHref = modulos.turnos ? "/turnos" : whatsappUrl;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? "bg-cream/95 shadow-sm backdrop-blur" : "bg-transparent"
      }`}
    >
      <Container className="flex h-16 items-center justify-between sm:h-20">
        <Link href="/" aria-label="Inicio" onClick={() => setOpen(false)}>
          <Logo src={logoUrl} alt={nombre} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-sans text-sm text-ink transition hover:text-mauve"
            >
              {l.label}
            </Link>
          ))}
          {reservarHref && <Button href={reservarHref}>Reservar turno</Button>}
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </Container>

      {open && (
        <nav className="border-t border-mauve/15 bg-cream md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 font-sans text-base text-ink transition hover:bg-cream-dark"
              >
                {l.label}
              </Link>
            ))}
            {reservarHref && (
              <Button href={reservarHref} className="mt-2 w-full">
                Reservar turno
              </Button>
            )}
          </Container>
        </nav>
      )}
    </header>
  );
}
