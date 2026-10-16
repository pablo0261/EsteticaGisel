"use client";

/**
 * Error en el layout raíz (por ejemplo, la base no responde): reemplaza todo el documento, así
 * que lleva su propio <html> y <body> y no tiene el idioma del tenant (texto en es y pt). No
 * muestra error.message; el digest sirve para buscarlo en el log del servidor.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "0 1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#ffffff",
          color: "#1f2933",
        }}
      >
        <title>Error</title>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Algo no funcionó · Algo deu errado</h1>
        <p style={{ maxWidth: "28rem", margin: 0 }}>
          Probá de nuevo en unos segundos. · Tente novamente em alguns segundos.
        </p>
        {error.digest && <p style={{ fontFamily: "monospace", fontSize: "0.75rem", margin: 0 }}>{error.digest}</p>}
        <button
          onClick={() => unstable_retry()}
          style={{ padding: "0.6rem 1.5rem", borderRadius: "9999px", border: "1px solid #1f2933", background: "transparent", cursor: "pointer" }}
        >
          Volver a intentar · Tentar novamente
        </button>
      </body>
    </html>
  );
}
