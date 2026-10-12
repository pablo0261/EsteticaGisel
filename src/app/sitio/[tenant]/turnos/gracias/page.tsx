import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Gracias" };

export default function GraciasPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-fondo px-6 pt-24 pb-16 text-center">
      <Container className="flex flex-col items-center gap-4">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">¡Listo!</p>
        <h1 className="font-serif text-4xl text-texto sm:text-5xl">Estamos procesando tu pago</h1>
        <p className="max-w-md font-sans text-texto-suave">
          En cuanto se confirme te va a llegar un email con los datos de tu turno. Si no llega en
          unos minutos, escribinos por WhatsApp.
        </p>
        <Button href="/">Volver al inicio</Button>
      </Container>
    </main>
  );
}
