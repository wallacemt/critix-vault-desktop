/**
 * Landing Page Component
 * Displayed when no folders are added yet
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Folder, Film, Tv, Sparkles, FolderPlus, Play } from "lucide-react";
import Image from "next/image";

interface LandingPageProps {
  onAddFolder: () => void;
  onViewDemo?: () => void;
  loading?: boolean;
}

export function LandingPage({ onAddFolder, onViewDemo, loading }: LandingPageProps) {
  const features = [
    {
      icon: Film,
      title: "Otima Organização",
      description: "Transforme seus arquivos de mídia locais em uma biblioteca visual impressionante.",
    },
    {
      icon: Tv,
      title: "Experiência de streaming",
      description: "Navegue por filmes e séries como na Netflix, mas com sua própria coleção.",
    },
    {
      icon: Sparkles,
      title: "Reconhecimento Inteligente",
      description: "Identifica automaticamente seus arquivos de mídia e extrai metadados completos.",
    },
  ];

  return (
    <div className="min-h-screen bg-on-primary-crx flex space-y-8 items-center justify-center p-8">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="flex items-center justify-center gap-4 flex-1 flex-col mb-16  text-justify">
          <div className="relative  flex items-center justify-center w-80 h-32 rounded-2xl bg-gradient-to-br ">
            <Image src={"/images/logo-full.png"} alt="App Image" fill />
          </div>

          <h1 className="text-5xl font-bold text-white mb-4 font-display">Bem-Vindo(a) ao Critix Vault</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-sans ">
            Seu gerenciador de biblioteca de mídia pessoal. Adicione pastas para começar e experimente sua coleção como
            nunca antes.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center  mb-12">
          <Card className="bg-surface-crx rounded-2xl border-slate-800 backdrop-blur-sm p-8 max-w-xl mx-auto">
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                <FolderPlus className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 font-display">Adicione sua primeira pasta</h2>
                <p className="text-slate-400 font-sans">
                  Selecione uma pasta que contenha seus filmes ou programas de TV para começar a construir sua
                  biblioteca.
                </p>
              </div>
              <Button
                size="lg"
                onClick={onAddFolder}
                disabled={loading}
                className="bg-gradient-to-r rounded-lg from-blue-600 to-amber-600 hover:from-blue-700 hover:to-yellow-700 text-white shadow-lg shadow-blue-500/20"
              >
                <FolderPlus className="w-5 h-5 mr-2" />
                {loading ? "Adicionando..." : "Adicionar Pasta"}
              </Button>
              {onViewDemo && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onViewDemo}
                  className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Ver Demo
                </Button>
              )}{" "}
            </div>
          </Card>
        </div>
        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="bg-primary-crx/30 border-slate-800 backdrop-blur-sm p-6 hover:bg-slate-900/70 transition-all duration-300"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2 font-display">{feature.title}</h3>
                    <p className="text-sm text-slate-300 font-sans">{feature.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-xs text-slate-600">
            {onViewDemo
              ? "Dica: Experimente a versão de demonstração para ver os filmes e séries mais populares do TMDB."
              : "Dica: Você pode adicionar várias pastas para organizar diferentes tipos de mídia."}
          </p>
        </div>
      </div>
    </div>
  );
}
