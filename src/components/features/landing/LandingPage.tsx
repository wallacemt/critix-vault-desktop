/**
 * Premium Landing Page Component
 * Experiência de primeira impressão com animações sofisticadas
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FolderPlus,
  Play,
  Zap,
  Library,
  Shield,
  UploadCloud,
  ArrowRight,
  Folder,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { Folder as FolderType } from "@/types/folder";
import type { LucideIcon } from "lucide-react";

interface LandingPageProps {
  onAddFolder: () => void;
  onViewDemo?: () => void;
  onLoadBackup?: (file: File) => void;
  loading?: boolean;
  folders?: FolderType[];
  onGoToLibrary?: () => void;
  onOpenHelp?: () => void;
}

interface CarouselAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "neutral" | "accent" | "success";
}

function CircularActionCarousel({ actions }: { actions: CarouselAction[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollTrack = (direction: "left" | "right") => {
    if (!trackRef.current) return;
    const amount = trackRef.current.clientWidth * 0.7;
    trackRef.current.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

  const toneClasses: Record<NonNullable<CarouselAction["tone"]>, string> = {
    primary:
      "bg-gradient-to-br from-[var(--color-primary)] to-amber-500 text-[var(--color-on-primary)] border border-yellow-300/20 shadow-[var(--glow-primary)]",
    neutral: "bg-[var(--bg-surface-light)]/80 text-[var(--text-primary)] border border-[var(--border-color)]",
    accent: "bg-blue-600/20 text-blue-100 border border-blue-500/40",
    success: "bg-emerald-600/20 text-emerald-100 border border-emerald-500/50",
  };

  return (
    <div className="w-full max-w-xl">
      <div className="flex  items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Acoes rapidas</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => scrollTrack("left")}
            className="h-8 w-8 rounded-full bg-[var(--bg-surface-light)]/70 border-[var(--border-color)]"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => scrollTrack("right")}
            className="h-8 w-8 rounded-full bg-[var(--bg-surface-light)]/70 border-[var(--border-color)]"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {actions.map((action, index) => {
          const Icon = action.icon;
          const tone = action.tone ?? "neutral";

          return (
            <motion.div
              key={action.id}
              className="snap-center shrink-0 w-28"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
            >
              <button
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed ${toneClasses[tone]}`}
              >
                <Icon className="w-8 h-8" />
              </button>
              <p className="text-center text-xs text-[var(--text-secondary)] mt-2 font-medium leading-tight">
                {action.label}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function LandingPage({
  onAddFolder,
  onViewDemo,
  onLoadBackup,
  loading,
  folders,
  onGoToLibrary,
  onOpenHelp,
}: LandingPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    let isActive = true;
    const activeTweens: { kill: () => void }[] = [];

    void import("gsap").then(({ default: gsap }) => {
      if (!isActive) return;

      activeTweens.push(
        gsap.from(".feature-card", {
          opacity: 50,
          y: 60,
          stagger: 0.2,
          duration: 1,
          ease: "power3.out",
          delay: 0.5,
        }),
      );

      activeTweens.push(
        gsap.to(".logo-float", {
          y: -10,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        }),
      );

      activeTweens.push(
        gsap.to(".glow-pulse", {
          opacity: 0.6,
          scale: 1.05,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        }),
      );
    });

    return () => {
      isActive = false;
      activeTweens.forEach((tween) => tween.kill());
    };
  }, [shouldReduceMotion]);

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
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }
          }
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-600/5 to-transparent rounded-full blur-3xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  scale: [1.2, 1, 1.2],
                  rotate: [90, 0, 90],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  duration: 25,
                  repeat: Infinity,
                  ease: "linear",
                }
          }
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
          <motion.div className="text-center mb-16 mt-16" style={{ opacity, scale }}>
            {/* Logo with floating animation */}
            <motion.div
              className="logo-float flex hover:scale-105 transition-all items-center justify-center group cursor-pointer mx-auto mb-8"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <Image
                src="/images/logo-full.png"
                width={300}
                height={300}
                alt="Critix Logo"
                title="Critix"
                className="drop-shadow-2xl"
                priority
              />
              <span className="w-3 h-3 bg-amber-400 rounded-tl-full rounded-bl-full rounded-tr-full" />
              <span className="font-display font-bold text-[var(--text-primary)] text-8xl ml-1">
                <span className="text-[var(--color-primary)] animate-pulse">V</span>ault
              </span>
            </motion.div>

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
                    <CircularActionCarousel
                      actions={[
                        ...(onGoToLibrary
                          ? [
                              {
                                id: "go-library",
                                label: "Ir para Biblioteca",
                                icon: ArrowRight,
                                onClick: onGoToLibrary,
                                tone: "primary" as const,
                              },
                            ]
                          : []),
                        ...(onOpenHelp
                          ? [
                              {
                                id: "open-help",
                                label: "Ajuda e FAQ",
                                icon: CircleHelp,
                                onClick: onOpenHelp,
                                tone: "accent" as const,
                              },
                            ]
                          : []),
                        {
                          id: "add-folder",
                          label: loading ? "Adicionando..." : "Adicionar Pasta",
                          icon: FolderPlus,
                          onClick: onAddFolder,
                          disabled: loading,
                          tone: "neutral" as const,
                        },
                      ]}
                    />
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

                    {onLoadBackup && (
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
                    )}

                    <CircularActionCarousel
                      actions={[
                        {
                          id: "add-folder",
                          label: loading ? "Adicionando..." : "Adicionar Pasta",
                          icon: FolderPlus,
                          onClick: onAddFolder,
                          disabled: loading,
                          tone: "primary" as const,
                        },
                        ...(onViewDemo
                          ? [
                              {
                                id: "view-demo",
                                label: "Ver Demo",
                                icon: Play,
                                onClick: onViewDemo,
                                tone: "neutral" as const,
                              },
                            ]
                          : []),
                        ...(onOpenHelp
                          ? [
                              {
                                id: "open-help",
                                label: "Ajuda e FAQ",
                                icon: CircleHelp,
                                onClick: onOpenHelp,
                                tone: "accent" as const,
                              },
                            ]
                          : []),
                        ...(onLoadBackup
                          ? [
                              {
                                id: "load-backup",
                                label: "Carregar Backup",
                                icon: UploadCloud,
                                onClick: () => fileInputRef.current?.click(),
                                disabled: loading,
                                tone: "success" as const,
                              },
                            ]
                          : []),
                      ]}
                    />
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
                  <Card className="bg-surface-crx/80 rounded-xl z-20 border-[var(--border-color)]  p-8 h-full relative overflow-hidden group">
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
