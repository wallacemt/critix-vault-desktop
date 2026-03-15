/**
 * Demo Library Component
 * Displays trending media from TMDB in demo mode
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Film, Tv, TrendingUp } from "lucide-react";
import { Media } from "@/types/media";
import { StreamingGrid } from "../library/_components/streaming-grid";
import { cn } from "@/lib/utils";
import { useDemoData } from "@/hooks/useDemoData";

interface DemoLibraryProps {
  onBack: () => void;
  onMediaClick: (media: Media, onDemo?: boolean) => void;
  onMediaPlay: (media: Media) => void;
}

export function DemoLibrary({ onBack, onMediaClick, onMediaPlay }: DemoLibraryProps) {
  const { movies, series, loading, error, loadDemo } = useDemoData();
  const [activeTab, setActiveTab] = useState<"all" | "movies" | "series">("all");

  useEffect(() => {
    loadDemo();
  }, [loadDemo]);

  const filteredMedia = () => {
    const allMedia: Media[] = [...movies, ...series];
    switch (activeTab) {
      case "movies":
        return movies;
      case "series":
        return series;
      default:
        return allMedia;
    }
  };

  return (
    <div className="flex h-screen bg-on-primary-crx">
      {/* Sidebar */}
      <aside className="w-64 bg-primary-foreground border-r border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-2">Demo Mode</h2>
          <Button
            onClick={onBack}
            size="sm"
            variant="outline"
            className="w-full bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar a Home
          </Button>
        </div>

        {/* Info */}
        <div className="flex-1 p-4">
          <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-400 mb-1">Trending Content</h3>
                <p className="text-xs text-slate-400">
                  Esta é uma demonstração que apresenta filmes e séries populares do TMDB.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Items</span>
              <span className="text-white font-semibold">{movies.length + series.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Movies</span>
              <span className="text-white font-semibold">{movies.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Series</span>
              <span className="text-white font-semibold">{series.length}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">Demo data from TMDB API</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-primary/40 backdrop-blur-sm border-b border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">🎬 Biblioteca de Demonstrações - Conteúdo em Alta</h1>
              <p className="text-sm text-slate-200">Descubra o que está em alta agora mesmo.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("all")}
              className={cn(activeTab === "all" && "bg-blue-600 hover:bg-blue-700")}
            >
              All ({movies.length + series.length})
            </Button>
            <Button
              variant={activeTab === "movies" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("movies")}
              className={cn(activeTab === "movies" && "bg-blue-600 hover:bg-blue-700")}
            >
              <Film className="w-4 h-4 mr-1" />
              Movies ({movies.length})
            </Button>
            <Button
              variant={activeTab === "series" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("series")}
              className={cn(activeTab === "series" && "bg-blue-600 hover:bg-blue-700")}
            >
              <Tv className="w-4 h-4 mr-1" />
              Series ({series.length})
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-400">Loading trending content...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-red-400 mb-2">Failed to load demo content</p>
                <p className="text-sm text-slate-500">{error}</p>
                <Button
                  onClick={() => loadDemo()}
                  variant="outline"
                  className="mt-4 bg-slate-800/50 border-slate-700 hover:bg-slate-800"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <StreamingGrid
                demoMode
                media={filteredMedia()}
                onMediaClick={onMediaClick}
                onMediaPlay={onMediaPlay}
                emptyMessage={
                  activeTab === "all"
                    ? "Nenhum Conteudo em alta disponivel"
                    : `Sem conteudo em alta ${activeTab} encontrado`
                }
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
