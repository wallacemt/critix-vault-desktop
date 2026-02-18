/**
 * Cast Section Component
 * Displays movie/series cast with photos and character names
 */

"use client";

import { TMDBCast } from "@/types";
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface CastSectionProps {
  cast: TMDBCast[];
  maxDisplay?: number;
}

export function CastSection({ cast, maxDisplay = 12 }: CastSectionProps) {
  if (!cast || cast.length === 0) return null;

  const displayCast = cast.slice(0, maxDisplay);

  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold text-white mb-6">Elenco Principal</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {displayCast.map((actor, index) => (
          <CastCard key={actor.id || index} actor={actor} index={index} />
        ))}
      </div>
    </section>
  );
}

function CastCard({ actor, index }: { actor: TMDBCast; index: number }) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="bg-[var(--bg-surface)] border-[var(--border-color)] overflow-hidden hover:border-[var(--color-primary)]/50 transition-all duration-300">
        {/* Profile Photo */}
        <div className="aspect-[2/3] relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
          {actor.profilePath && !imageError ? (
            <img
              src={actor.profilePath}
              alt={actor.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-12 h-12 text-slate-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-semibold text-white text-sm truncate">{actor.name}</h3>
          {actor.character && <p className="text-xs text-slate-400 truncate mt-1">{actor.character}</p>}
        </div>
      </Card>
    </motion.div>
  );
}
