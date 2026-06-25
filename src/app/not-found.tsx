import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-body)] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-primary)]/5 blur-[120px]" />
        <div className="absolute -top-1/4 -right-1/4 w-96 h-96 rounded-full bg-amber-500/3 blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-xl w-full">
        {/* Logo */}
        <div className="mb-10 opacity-70 hover:opacity-100 transition-opacity">
          <Image
            src="/images/logo-short.png"
            alt="Critix"
            width={52}
            height={52}
            className="drop-shadow-lg"
          />
        </div>

        {/* 404 code */}
        <div className="relative mb-2 select-none">
          <span
            className="text-[clamp(120px,22vw,200px)] font-bold leading-none tracking-tighter font-display"
            style={{
              color: "var(--color-primary)",
              textShadow:
                "0 0 80px rgba(255,193,7,0.25), 0 0 20px rgba(255,193,7,0.15)",
            }}
          >
            404
          </span>
          {/* Scanline overlay for cinematic effect */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)",
            }}
          />
        </div>

        {/* Title */}
        <h1
          className="text-2xl font-bold text-[var(--text-primary)] mb-3 font-display"
        >
          Cena não encontrada
        </h1>

        {/* Description */}
        <p className="text-base text-[var(--text-secondary)] leading-relaxed mb-10 max-w-sm">
          Esta página foi cortada da edição final. Pode ter sido removida,
          renomeada ou nunca ter existido.
        </p>

        {/* Illustration */}
        <div className="mb-10 opacity-60">
          <Image
            src="/images/404.svg"
            alt=""
            width={280}
            height={180}
            className="object-contain"
            unoptimized
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm
                       bg-[var(--color-primary)] text-[var(--bg-body)]
                       hover:brightness-110 active:scale-95 transition-all duration-150"
            style={{ boxShadow: "var(--glow-primary)" }}
          >
            Ir ao início
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm
                       bg-[var(--bg-surface)] text-[var(--text-primary)]
                       border border-[var(--border-color)]
                       hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]
                       active:scale-95 transition-all duration-150"
          >
            Minha Biblioteca
          </Link>
        </div>

        {/* Footer hint */}
        <p className="mt-10 text-xs text-[var(--text-muted)]">
          Critix Vault · Erro 404
        </p>
      </div>
    </div>
  );
}
