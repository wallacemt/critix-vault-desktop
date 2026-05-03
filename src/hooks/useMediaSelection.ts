"use client";

import { useMemo, useState } from "react";

export function useMediaSelection() {
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());

  const selectedCount = selectedMediaIds.size;

  const isSelected = (mediaId: string) => selectedMediaIds.has(mediaId);

  const toggleMediaSelection = (mediaId: string) => {
    setSelectedMediaIds((current) => {
      const next = new Set(current);

      if (next.has(mediaId)) {
        next.delete(mediaId);
      } else {
        next.add(mediaId);
      }

      return next;
    });
  };

  const clearSelection = () => {
    setSelectedMediaIds(new Set());
  };

  return useMemo(
    () => ({
      selectedMediaIds,
      selectedCount,
      isSelected,
      toggleMediaSelection,
      clearSelection,
    }),
    [selectedMediaIds],
  );
}
