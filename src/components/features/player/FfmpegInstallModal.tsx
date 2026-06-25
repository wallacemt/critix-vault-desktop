"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ExternalLink, Copy, Check, X, Terminal } from "lucide-react";

interface FfmpegInstallModalProps {
  audioCodec: string;
  onOpenExternal: () => void;
  onDismiss: () => void;
}

type Method = "winget" | "scoop" | "choco" | "manual";

const METHODS: { id: Method; label: string; command?: string; hint?: string }[] = [
  {
    id: "winget",
    label: "winget",
    command: "winget install --id=Gyan.FFmpeg -e",
    hint: "Recomendado — disponível no Windows 10/11 por padrão",
  },
  {
    id: "scoop",
    label: "Scoop",
    command: "scoop install ffmpeg",
    hint: "Requer Scoop instalado: scoop.sh",
  },
  {
    id: "choco",
    label: "Chocolatey",
    command: "choco install ffmpeg",
    hint: "Requer Chocolatey instalado: chocolatey.org",
  },
  {
    id: "manual",
    label: "Manual",
    hint: "Baixe em ffmpeg.org/download.html → extraia → adicione a pasta bin ao PATH do sistema",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copiado!" : "Copiar comando"}
      className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:text-white transition-colors"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy className="w-3.5 h-3.5" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function FfmpegInstallModal({
  audioCodec,
  onOpenExternal,
  onDismiss,
}: FfmpegInstallModalProps) {
  const [activeMethod, setActiveMethod] = useState<Method>("winget");
  const selected = METHODS.find((m) => m.id === activeMethod)!;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">FFmpeg não encontrado</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Codec <span className="font-mono text-amber-400/80">{audioCodec.toUpperCase()}</span> requer transcodificação
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-zinc-600 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            O áudio deste arquivo usa um codec que o browser não suporta nativamente.
            O <span className="text-white font-medium">FFmpeg</span> é necessário para recodificá-lo
            em tempo real. Instale com um dos métodos abaixo e{" "}
            <span className="text-amber-300">reinicie o Critix Vault</span>.
          </p>

          {/* Method tabs */}
          <div>
            <div className="flex gap-1 mb-3">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMethod(m.id)}
                  className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    activeMethod === m.id
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/10"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeMethod}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="space-y-2"
              >
                {/* Command block */}
                {selected.command ? (
                  <div className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-white/8 px-3 py-2.5">
                    <Terminal className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <code className="flex-1 text-xs text-amber-300 font-mono break-all">
                      {selected.command}
                    </code>
                    <CopyButton text={selected.command} />
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-900 border border-white/8 px-3 py-2.5">
                    <p className="text-xs text-zinc-400 leading-relaxed">{selected.hint}</p>
                  </div>
                )}

                {/* Hint (for methods with commands) */}
                {selected.command && selected.hint && (
                  <p className="text-xs text-zinc-600 px-0.5">{selected.hint}</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* After install note */}
          <div className="flex items-start gap-2 rounded-xl bg-zinc-900/60 border border-white/6 px-3 py-2.5">
            <span className="text-amber-400 text-sm leading-none mt-0.5">→</span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Após instalar, feche e reabra o <span className="text-white">Critix Vault</span>.
              O FFmpeg precisa estar no <span className="font-mono text-zinc-300">PATH</span> do sistema.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 pb-5">
          <button
            onClick={onOpenExternal}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl
                       px-4 py-2.5 text-sm font-medium border border-white/10
                       bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10
                       transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir no player externo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
