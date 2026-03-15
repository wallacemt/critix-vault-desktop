/**
 * Media Card Skeleton Component
 * Beautiful loading state for streaming cards
 */

"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export function MediaCardSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Card className="bg-[var(--bg-surface)] border-[var(--border-color)] overflow-hidden group relative">
        {/* Poster skeleton */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <Skeleton className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        {/* Content skeleton */}
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4 bg-slate-800" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12 bg-slate-800" />
            <Skeleton className="h-4 w-16 bg-slate-800" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}
