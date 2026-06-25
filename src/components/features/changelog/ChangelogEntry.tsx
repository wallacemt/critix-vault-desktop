"use client";

import React from "react";
import { ChangelogEntry as ChangelogEntryType } from "./types";
import { renderChangelogMarkdown } from "./markdown";

interface ChangelogEntryProps {
  entry: ChangelogEntryType;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatDate(iso: string): string {
  try {
    return DATE_FORMATTER.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ChangelogEntryCard({ entry }: ChangelogEntryProps) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-white leading-snug">{entry.title}</h2>
          <p className="text-xs text-slate-400">{formatDate(entry.publishedAt)}</p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-amber-400">
          v{entry.version}
        </span>
      </div>

      {entry.notes.trim() ? (
        <div className="pt-3 border-t border-slate-700/60">
          {renderChangelogMarkdown(entry.notes)}
        </div>
      ) : (
        <p className="text-xs italic text-slate-500">Sem notas de lançamento.</p>
      )}
    </article>
  );
}
