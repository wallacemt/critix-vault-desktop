"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Extra classes applied to the pulse skeleton div. */
  skeletonClassName?: string;
  /** Fallback content shown when src is empty or the image errors. */
  fallback?: React.ReactNode;
}

/**
 * Drop-in replacement for <img> that shows an animated skeleton while loading
 * and fades in the image on load. Renders a relative-positioned wrapper div
 * so skeletons fill whatever container the parent provides.
 */
export function LazyImage({
  className,
  skeletonClassName,
  fallback,
  onError,
  src,
  ...props
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div
          className={cn(
            "absolute inset-0 bg-zinc-800 animate-pulse rounded-[inherit]",
            skeletonClassName,
          )}
        />
      )}
      <img
        src={src}
        {...props}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setError(true);
          onError?.(e);
        }}
      />
    </div>
  );
}
