"use client";

import { useState, useEffect } from "react";
import { VideoSurface } from "@/components/features/player/VideoSurface";
import type { PlayableItem } from "@/stores/playerStore";

const TEST_ITEM: PlayableItem = {
  mediaId: "test-debug",
  title: "Debug Test",
  filePath: "D:\\Filmes\\O Drama 2026 WEB-DL 1080p x264 DUAL 5.1\\O Drama 2026 WEB-DL 1080p x264 DUAL 5.1.mkv",
  mediaType: "MOVIE",
};

export default function TestPlayerPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="fixed inset-0 bg-black" />;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <VideoSurface
        item={TEST_ITEM}
        onEnded={() => {}}
        onClose={() => {}}
        onUnsupported={() => {}}
      />
    </div>
  );
}
