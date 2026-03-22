import Link from "next/link";
import { ArrowLeft, BookOpen, Bug, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

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
              <h1 className="text-3xl font-bold text-white">Ajuda e FAQ</h1>
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
            <a href={issuesUrl} target="_blank" rel="noreferrer">
              <Button className="w-full justify-start bg-red-600 hover:bg-red-700 text-white">
                <Bug className="w-4 h-4 mr-2" />
                Reportar bug ou pedir ajuda (Issues)
              </Button>
            </a>
            <a href={discussionsUrl} target="_blank" rel="noreferrer">
              <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white">
                <MessageSquare className="w-4 h-4 mr-2" />
                Enviar feedback e ideias (Discussions)
              </Button>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
