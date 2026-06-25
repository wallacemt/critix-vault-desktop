"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// global-error replaces the root layout entirely — must include <html> and <body>.
// CSS variables are unavailable here, so critical styles are inlined.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[Critix] Global error:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          backgroundColor: "#121212",
          color: "#f5f5f5",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "2rem",
            maxWidth: "480px",
            width: "100%",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
            }}
          >
            <AlertTriangle
              style={{ width: 36, height: 36, color: "#f87171" }}
              strokeWidth={1.5}
            />
          </div>

          {/* Logo text fallback */}
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#ffc107",
              marginBottom: "0.75rem",
            }}
          >
            Critix Vault
          </p>

          {/* Heading */}
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#f5f5f5",
              marginBottom: "0.75rem",
              lineHeight: 1.3,
            }}
          >
            Erro crítico no aplicativo
          </h1>

          <p
            style={{
              fontSize: "0.875rem",
              color: "#b0b0b0",
              lineHeight: 1.6,
              marginBottom: "2rem",
              maxWidth: "340px",
            }}
          >
            Ocorreu um erro que impediu o carregamento do aplicativo. Tente
            recarregar ou reiniciar o Critix Vault.
          </p>

          {/* Reset button */}
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1.5rem",
              borderRadius: "0.75rem",
              fontWeight: 600,
              fontSize: "0.875rem",
              backgroundColor: "#ffc107",
              color: "#121212",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(255,193,7,0.3)",
              transition: "filter 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.filter =
                "brightness(1.1)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.filter = "none")
            }
          >
            <RefreshCw style={{ width: 16, height: 16 }} />
            Tentar novamente
          </button>

          {/* Digest */}
          {error.digest && (
            <p
              style={{
                marginTop: "2rem",
                fontSize: "0.7rem",
                color: "#6e6e6e",
                fontFamily: "monospace",
              }}
            >
              Digest: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
