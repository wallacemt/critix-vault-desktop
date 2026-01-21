/**
 * Scroll Area Component
 * Provides a styled scrollable area
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ScrollArea({ children, className, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn("overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900", className)}
      {...props}
    >
      {children}
    </div>
  );
}
