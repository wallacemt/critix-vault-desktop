"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { WifiOff, AlertCircle } from "lucide-react";
import { ChangelogEntry, ChangelogStatus } from "./types";
import { ChangelogEntryCard } from "./ChangelogEntry";

interface ChangelogListProps {
  entries: ChangelogEntry[];
  status: ChangelogStatus;
}

function ChangelogSkeleton() {
  return (
    <div className="space-y-4" aria-label="Carregando novidades..." aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
          <div className="flex justify-between gap-2">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-2/3 rounded bg-slate-800" />
              <Skeleton className="h-3 w-1/4 rounded bg-slate-800" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full bg-slate-800" />
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
            <Skeleton className="h-3 w-full rounded bg-slate-800" />
            <Skeleton className="h-3 w-5/6 rounded bg-slate-800" />
            <Skeleton className="h-3 w-4/6 rounded bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function OfflineMessage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
      <WifiOff className="h-8 w-8 text-slate-600" />
      <p className="text-sm font-medium text-slate-300">Sem conexão</p>
      <p className="text-xs text-slate-500 max-w-xs">
        Não foi possível carregar o changelog. Verifique sua conexão e tente novamente.
      </p>
    </div>
  );
}

function ErrorMessage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
      <AlertCircle className="h-8 w-8 text-slate-600" />
      <p className="text-sm font-medium text-slate-300">Erro ao carregar</p>
      <p className="text-xs text-slate-500 max-w-xs">
        Não foi possível buscar as novidades no momento. Tente recarregar.
      </p>
    </div>
  );
}

function EmptyMessage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
      <p className="text-sm text-slate-500">Nenhuma novidade disponível.</p>
    </div>
  );
}

export function ChangelogList({ entries, status }: ChangelogListProps) {
  if (status === "loading" || status === "idle") return <ChangelogSkeleton />;
  if (status === "offline") return <OfflineMessage />;
  if (status === "error") return <ErrorMessage />;
  if (entries.length === 0) return <EmptyMessage />;

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <ChangelogEntryCard key={entry.rawTag} entry={entry} />
      ))}
    </div>
  );
}
