"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Bug, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEasterEggProgress, MYSTERY_LINK, registerEasterEggClue } from "@/lib/easter-egg";
import { openExternalLink } from "@/lib/external-link";

const issuesUrl = "https://github.com/wallacemt/critix-vault-desktop/issues/new/choose";
const discussionsUrl = "https://github.com/wallacemt/critix-vault-desktop/wiki";

const quickStart = [
  "Adicione uma ou mais pastas na Biblioteca.",
  "Execute o escaneamento para detectar filmes e séries automaticamente.",
  "Abra os detalhes para corrigir metadados e vínculos de arquivos.",
  "Use Configurações para criar backups periódicos do banco local.",
];

const faq = [
  {
    question: "O aplicativo move ou altera meus arquivos de vídeo?",
    answer: "Não. O Critix Vault só indexa e referencia os caminhos locais. Seus arquivos permanecem onde já estão.",
  },
  {
    question: "O que entra no backup?",
    answer:
      "Pastas monitoradas, metadados de filmes e séries, histórico de visualização e ações do usuário. Arquivos de vídeo não são incluídos.",
  },
  {
    question: "Perdi os vínculos dos episódios após mudar pasta de lugar. E agora?",
    answer:
      "Abra a série, use a edição avançada para ajustar a pasta da série, da temporada e os arquivos dos episódios quando necessário.",
  },
  {
    question: "Como reportar um bug ou pedir ajuda técnica?",
    answer:
      "Use o botão de Issues para abrir um chamado. Inclua passos para reproduzir, prints e versão do aplicativo.",
  },
];

export default function HelpPage() {
  const [helpClicks, setHelpClicks] = useState(0);
  const [unlocked, setUnlocked] = useState<string[]>([]);

  const refreshProgress = useCallback(() => {
    const progress = getEasterEggProgress();
    setUnlocked(progress.unlocked);
  }, []);

  useEffect(() => {
    refreshProgress();

    const handleFocus = () => refreshProgress();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshProgress();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshProgress]);

  const requiredClues = [
    {
      id: "help",
      hint: "toque cinco vezes no título desta página para começar o enigma.",
    },
    {
      id: "home-no-folder",
      hint: "quando a biblioteca estiver vazia, o caminho aparece no início.",
    },
    {
      id: "empty-scan",
      hint: "existe uma pasta que parece conter nada, mas ainda conta para a trilha.",
    },
  ] as const;

  const nextHint = useMemo(() => {
    const unlockedSet = new Set(unlocked);
    const missing = requiredClues.filter((clue) => !unlockedSet.has(clue.id));

    if (missing.length === 0) {
      return (
        <div className="flex items-center gap-2 w-full">
          Enigma completo. O portal misterioso já deve ter sido aberto. Para ver o que continha no portal acesse:
          <Button variant={"ghost"} className="underline  rounded-2xl" onClick={() => openExternalLink(MYSTERY_LINK)}>
            🧙🏻‍♂️ Link Misteriso
          </Button>
        </div>
      );
    }

    const foundCount = requiredClues.length - missing.length;
    const next = missing[0];

    if (foundCount > 0) {
      return `Você já encontrou ${foundCount}/${requiredClues.length} sinais. Pista ${foundCount + 1}: ${next.hint}`;
    }

    return `Pista 1: ${next.hint}`;
  }, [unlocked]);

  const handleTitleClick = async () => {
    const updatedClicks = helpClicks + 1;
    setHelpClicks(updatedClicks);

    if (updatedClicks >= 5) {
      setHelpClicks(0);
      const progress = await registerEasterEggClue("help");
      setUnlocked(progress.unlocked);
      if (!progress.completed) {
        alert("Pista da Ajuda desbloqueada. Falta pouco para abrir o link misterioso.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto p-6 pb-16 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/library">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <button onClick={handleTitleClick} className="text-left" title="Ajuda e FAQ">
                <h1 className="text-3xl font-bold text-white">Ajuda e FAQ</h1>
              </button>
              <p className="text-sm text-slate-400">Guia rápido, perguntas frequentes e canais de suporte</p>
            </div>
          </div>
        </header>

        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            Como usar o Critix Vault
          </h2>
          <ol className="space-y-3">
            {quickStart.map((step) => (
              <li
                key={step}
                className="text-sm text-slate-300 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Perguntas Frequentes
          </h2>
          <div className="space-y-3">
            {faq.map((item) => (
              <details key={item.question} className="group rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-200 group-open:text-white">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Precisa falar com o time?</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Button
              className="w-full justify-start bg-red-600 hover:bg-red-700 text-white"
              onClick={() => openExternalLink(issuesUrl)}
            >
              <Bug className="w-4 h-4 mr-2" />
              Reportar bug ou pedir ajuda (Issues)
            </Button>
            <Button
              className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => openExternalLink(discussionsUrl)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Enviar feedback e ideias (Discussions)
            </Button>
          </div>
        </section>

        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Transmissão Desconhecida</h2>
          <p className="text-sm text-slate-400">{nextHint}</p>
          <p className="text-xs text-slate-500 mt-2">Progresso: {unlocked.length}/3 sinais coletados.</p>
        </section>
      </div>
    </div>
  );
}
