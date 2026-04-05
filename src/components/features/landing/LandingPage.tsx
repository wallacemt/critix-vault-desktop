/**
 * Premium Landing Page Component
 * Experiência de primeira impressão com animações sofisticadas
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Film,
  Tv,
  Sparkles,
  FolderPlus,
  Play,
  Zap,
  Library,
  Shield,
  UploadCloud,
  ArrowRight,
  Folder,
} from "lucide-react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Folder as FolderType } from "@/types/folder";

interface LandingPageProps {
  onAddFolder: () => void;
  onViewDemo?: () => void;
  onLoadBackup?: (file: File) => void;
  loading?: boolean;
  folders?: FolderType[];
  onGoToLibrary?: () => void;
}

export function LandingPage({
  onAddFolder,
  onViewDemo,
  onLoadBackup,
  loading,
  folders,
  onGoToLibrary,
}: LandingPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  useEffect(() => {
    // GSAP animations for feature cards
    gsap.from(".feature-card", {
      opacity: 50,
      y: 60,
      stagger: 0.2,
      duration: 1,
      ease: "power3.out",
      delay: 0.5,
    });

    // Floating animation for logo
    gsap.to(".logo-float", {
      y: -10,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    // Glow pulse animation
    gsap.to(".glow-pulse", {
      opacity: 0.6,
      scale: 1.05,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, []);

  const features = [
    {
      icon: Library,
      title: "Biblioteca Inteligente",
      description: "Transforme seus arquivos locais em uma experiência visual cinematográfica.",
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-cyan-400",
    },
    {
      icon: Zap,
      title: "Match Automático",
      description: "Reconhecimento instantâneo com TMDB. Metadados completos em segundos.",
      gradient: "from-amber-500/20 to-yellow-500/20",
      iconColor: "text-yellow-400",
    },
    {
      icon: Shield,
      title: "100% Local",
      description: "Seus arquivos ficam no seu computador. Privacidade e controle total.",
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-pink-400",
    },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--bg-body)] relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-1 z-1 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 - -left-1/2 w-full h-full bg-gradient-to-br from-blue-600/5 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-600/5 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <motion.div
          className="max-w-6xl w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {/* Hero Section */}
          <motion.div className="text-center mb-16" style={{ opacity, scale }}>
            {/* Logo with floating animation */}
            <motion.div
              className="logo-float relative flex items-center justify-center w-96 h-40 mx-auto mb-8"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="glow-pulse absolute inset-0 rounded-3xl blur-2xl" />
              <Image
                src="/images/logo-short.png"
                alt="Critix Vault Logo"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-6xl md:text-7xl font-bold text-[var(--text-primary)] mb-6 font-display"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <span className="bg-gradient-to-r from-[var(--color-primary)] via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Critix Vault
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-xl md:text-2xl text-[var(--text-secondary)] max-w-3xl mx-auto font-sans leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Sua coleção pessoal de filmes e séries{" "}
              <span className="text-[var(--color-primary)] font-semibold">com experiência de streaming premium</span>
            </motion.p>
          </motion.div>

          {/* CTA Card */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <Card className="bg-[var(--bg-surface)] rounded-2xl border-[var(--border-color)] backdrop-blur-xl p-10 max-w-2xl mx-auto relative overflow-hidden">
              {/* Gradient border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 opacity-50 blur-xl" />

              <div className="relative z-10 flex flex-col items-center gap-6">
                {folders && folders.length > 0 ? (
                  <>
                    {/* User has folders — show folder list + actions */}
                    <motion.div
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-600/30 to-emerald-600/30 flex items-center justify-center relative"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Library className="w-10 h-10 text-emerald-400" />
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-2xl animate-pulse" />
                    </motion.div>

                    <div className="text-center">
                      <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3 font-display">Suas Pastas</h2>
                      <p className="text-[var(--text-secondary)] font-sans text-lg">
                        {folders.length} pasta{folders.length > 1 ? "s" : ""} monitorada{folders.length > 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Folder list */}
                    <div className="w-full max-w-md space-y-2">
                      {folders.map((folder) => (
                        <motion.div
                          key={folder.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface-light)]/50 border border-[var(--border-color)] hover:border-[var(--color-primary)]/30 transition-all cursor-pointer"
                          whileHover={{ scale: 1.02, x: 4 }}
                          onClick={onGoToLibrary}
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                            <Folder className="w-5 h-5 text-[var(--color-primary)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{folder.name}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{folder.path}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                      {onGoToLibrary && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            size="lg"
                            onClick={onGoToLibrary}
                            className="w-full sm:w-auto bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-[var(--color-on-primary)] font-semibold shadow-[var(--glow-primary)] transition-all duration-300 text-lg px-8 py-6"
                          >
                            <ArrowRight className="w-5 h-5 mr-2" />
                            Ir para Biblioteca
                          </Button>
                        </motion.div>
                      )}
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={onAddFolder}
                          disabled={loading}
                          className="w-full sm:w-auto bg-[var(--bg-surface-light)]/50 border-[var(--border-color)] hover:bg-[var(--bg-surface-light)] hover:border-[var(--color-primary)]/50 text-[var(--text-primary)] font-semibold text-lg px-8 py-6"
                        >
                          <FolderPlus className="w-5 h-5 mr-2" />
                          {loading ? "Adicionando..." : "Adicionar Pasta"}
                        </Button>
                      </motion.div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* First-time user — original CTA */}
                    <motion.div
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center relative"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <FolderPlus className="w-10 h-10 text-[var(--color-primary)]" />
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent rounded-2xl animate-pulse" />
                    </motion.div>

                    <div className="text-center">
                      <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3 font-display">
                        Comece sua Jornada
                      </h2>
                      <p className="text-[var(--text-secondary)] font-sans text-lg">
                        Adicione sua primeira pasta e veja a mágica acontecer
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="lg"
                          onClick={onAddFolder}
                          disabled={loading}
                          className="w-full sm:w-auto bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-[var(--color-on-primary)] font-semibold shadow-[var(--glow-primary)] transition-all duration-300 text-lg px-8 py-6"
                        >
                          <FolderPlus className="w-5 h-5 mr-2" />
                          {loading ? "Adicionando..." : "Adicionar Pasta"}
                        </Button>
                      </motion.div>

                      {onViewDemo && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={onViewDemo}
                            className="w-full sm:w-auto bg-[var(--bg-surface-light)]/50 border-[var(--border-color)] hover:bg-[var(--bg-surface-light)] hover:border-[var(--color-primary)]/50 text-[var(--text-primary)] font-semibold text-lg px-8 py-6"
                          >
                            <Play className="w-5 h-5 mr-2" />
                            Ver Demo
                          </Button>
                        </motion.div>
                      )}

                      {onLoadBackup && (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onLoadBackup(file);
                              e.target.value = "";
                            }}
                          />
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              size="lg"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={loading}
                              className="w-full sm:w-auto bg-[var(--bg-surface-light)]/50 border-[var(--border-color)] hover:bg-[var(--bg-surface-light)] hover:border-emerald-500/50 text-[var(--text-primary)] font-semibold text-lg px-8 py-6"
                            >
                              <UploadCloud className="w-5 h-5 mr-2 text-emerald-400" />
                              Carregar Backup
                            </Button>
                          </motion.div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 relative z-10">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  className="feature-card"
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card className="bg-surface-crx/80 z-20 border-[var(--border-color)]  p-8 h-full relative overflow-hidden group">
                    {/* Hover gradient effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} `} />

                    <div className="relative z-10 flex flex-col items-center text-center gap-5">
                      <div
                        className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 font-display">
                          {feature.title}
                        </h3>
                        <p className="text-[var(--text-secondary)] font-sans leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Footer tip */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <p className="text-sm text-[var(--text-muted)] font-sans">
              💡{" "}
              {onViewDemo
                ? "Experimente o modo demo para ver como seus filmes e séries ficam organizados"
                : "Organize sua coleção de forma profissional e assista com estilo"}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
