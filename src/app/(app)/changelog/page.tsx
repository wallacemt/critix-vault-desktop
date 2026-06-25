"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw, ScrollText } from "lucide-react";
import { useChangelogContext } from "@/context/changelogContext";
import { ChangelogList } from "@/components/features/changelog/ChangelogList";
import { Button } from "@/components/ui/button";

export default function ChangelogPage() {
  const { entries, changelogStatus: status, refetch } = useChangelogContext();
  const showRefetchButton = status === "offline" || status === "error";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto p-6 pb-16 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Link href="/library" aria-label="Voltar para Biblioteca">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-display font-bold text-white">Novidades</h1>
              <p className="text-sm text-slate-400">Histórico de versões e atualizações do Critix Vault</p>
            </div>
          </div>

          {showRefetchButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="shrink-0 gap-1.5 text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
              aria-label="Recarregar changelog"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recarregar
            </Button>
          )}
        </header>

        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-display font-semibold text-white mb-6 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-amber-400" />
            Versões lançadas
          </h2>
          <ChangelogList entries={entries} status={status} />
        </section>
      </div>
    </div>
  );
}
