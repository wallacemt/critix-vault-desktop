"use client";

import type { DiscoveryCategory, DiscoveryFilters as FiltersState } from "@/types/discovery";

interface DiscoveryFiltersProps {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
  genres: string[];
}

const CATEGORY_OPTIONS: { value: DiscoveryCategory; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "movie", label: "Filmes" },
  { value: "tv", label: "Séries" },
];

const QUALITY_OPTIONS = [
  { value: null, label: "Qualquer" },
  { value: "4K", label: "4K" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
];

const YEAR_OPTIONS = [
  { value: null, label: "Qualquer" },
  ...[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map((y) => ({
    value: y,
    label: String(y),
  })),
];

export function DiscoveryFilters({ filters, onChange, genres }: DiscoveryFiltersProps) {
  const update = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Category tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-800/60 border border-slate-700/50 p-1">
        {CATEGORY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("category", opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filters.category === opt.value
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Genre select */}
      {genres.length > 0 && (
        <select
          value={filters.genre ?? ""}
          onChange={(e) => update("genre", e.target.value || null)}
          className="rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        >
          <option value="">Gênero</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      )}

      {/* Year select */}
      <select
        value={filters.year ?? ""}
        onChange={(e) => update("year", e.target.value ? Number(e.target.value) : null)}
        className="rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
      >
        {YEAR_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value ?? ""}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Quality select */}
      <select
        value={filters.quality ?? ""}
        onChange={(e) => update("quality", e.target.value || null)}
        className="rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
      >
        {QUALITY_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value ?? ""}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
