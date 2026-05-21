"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type MonthOption = { value: string; label: string };

interface MonthFilterProps {
  value: string;
  options?: MonthOption[];
  onValueChange: (value: string) => void;
}

export function MonthFilter({ value, options = [], onValueChange }: MonthFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { selectedYear, selectedMonth } = useMemo(() => {
    if (value === "all") return { selectedYear: null, selectedMonth: null };
    const [y, m] = value.split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return { selectedYear: null, selectedMonth: null };
    return { selectedYear: y, selectedMonth: m };
  }, [value]);

  // Available months from data keyed as "YYYY-MM"
  const availableKeys = useMemo(() => new Set(options.map((o) => o.value)), [options]);

  // Years that have at least one available month
  const availableYears = useMemo(
    () => [...new Set(options.map((o) => Number(o.value.split("-")[0])))].sort((a, b) => b - a),
    [options],
  );

  const defaultYear = useMemo(() => {
    if (selectedYear) return selectedYear;
    return availableYears[0] ?? new Date().getFullYear();
  }, [selectedYear, availableYears]);

  const [year, setYear] = useState(defaultYear);

  useEffect(() => {
    if (selectedYear) setYear(selectedYear);
  }, [selectedYear]);

  // When options load and nothing is selected yet, jump to the most recent year with data
  useEffect(() => {
    if (value === "all" && availableYears.length > 0) {
      setYear(availableYears[0]);
    }
  }, [availableYears, value]);

  const selectedLabel = useMemo(() => {
    if (!selectedYear || !selectedMonth) return "Todos os meses";
    const opt = options.find((o) => o.value === value);
    if (opt) return opt.label;
    return new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [selectedYear, selectedMonth, options, value]);

  const yearHasData = availableYears.includes(year);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (month: number) => {
    onValueChange(`${year}-${String(month).padStart(2, "0")}`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-between border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
          onClick={() => setOpen((c) => !c)}
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <span className="truncate capitalize">{selectedLabel}</span>
          </span>
          <span className="shrink-0 text-xs text-[var(--text-muted)]">{open ? "▲" : "▼"}</span>
        </Button>

        {value !== "all" && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 border border-[var(--border-color)] bg-[var(--bg-surface)]"
            onClick={() => onValueChange("all")}
            aria-label="Limpar filtro de mês"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="fixed right-[5%] top-[calc(100%+0.4rem)] z-[200] w-64 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 shadow-2xl"
          >
            {/* Year navigation */}
            <div className="mb-2 flex items-center justify-between">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-lg"
                onClick={() => setYear((y) => y - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className={cn("text-sm font-semibold", yearHasData ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
                {year}
                {!yearHasData && <span className="ml-1.5 text-xs font-normal">(sem dados)</span>}
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-lg"
                onClick={() => setYear((y) => y + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {availableYears.length > 0 && (
              <p className="mb-2 text-center text-[10px] text-[var(--text-muted)]">
                • meses com dados assistidos
              </p>
            )}

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_LABELS.map((label, idx) => {
                const month = idx + 1;
                const key = `${year}-${String(month).padStart(2, "0")}`;
                const isSelected = selectedYear === year && selectedMonth === month;
                const hasData = availableKeys.has(key);

                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => handleSelect(month)}
                    className={cn(
                      "relative rounded-lg py-2 text-sm font-medium transition-colors",
                      isSelected
                        ? "bg-amber-400 text-black"
                        : hasData
                          ? "text-[var(--text-primary)] hover:bg-amber-400/20 hover:text-amber-300"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-light)] hover:text-[var(--text-secondary)]",
                    )}
                  >
                    {label}
                    {hasData && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick-jump to available years */}
            {availableYears.length > 1 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1 border-t border-[var(--border-color)]/50 pt-2">
                {availableYears.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYear(y)}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                      y === year
                        ? "bg-amber-400/20 text-amber-300"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
