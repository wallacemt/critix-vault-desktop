"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.error("[Critix] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-body)] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient red glow (error tone) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-600/5 blur-[100px]" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-[var(--color-primary)]/4 blur-[60px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
        {/* Error icon + illustration */}
        <div className="relative mb-6">
          <div className="opacity-80 mt-2 animate-pulse">
            <Image src="/images/503.svg" alt="" width={200} height={184} className="object-contain mx-auto " />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2 font-display">Algo deu errado</h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-sm">
          Ocorreu um erro inesperado nesta cena. Você pode tentar novamente ou voltar ao início.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm
                       bg-[var(--color-primary)] text-[var(--bg-body)]
                       hover:brightness-110 active:scale-95 transition-all duration-150"
            style={{ boxShadow: "var(--glow-primary)" }}
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm
                       bg-[var(--bg-surface)] text-[var(--text-primary)]
                       border border-[var(--border-color)]
                       hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]
                       active:scale-95 transition-all duration-150"
          >
            Ir ao início
          </Link>
        </div>

        {/* Collapsible error details */}
        {mounted && (
          <div className="w-full max-w-sm">
            <button
              onClick={() => setDetailsOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]
                         hover:text-[var(--text-secondary)] transition-colors mx-auto mb-2"
            >
              {detailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Detalhes do erro
            </button>

            {detailsOpen && (
              <div className="rounded-xl border border-red-500/15 bg-red-950/20 p-4 text-left">
                {error.digest && (
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-mono">Digest: {error.digest}</p>
                )}
                <p className="text-xs text-red-300/80 font-mono break-all leading-relaxed">
                  {error.message || "Erro desconhecido"}
                </p>
              </div>
            )}
          </div>
        )}

        <p className="mt-10 text-xs text-[var(--text-muted)]">Critix Vault · Erro de renderização</p>
      </div>
    </div>
  );
}
