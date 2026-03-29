"use client";
import { useEffect } from "react";
import { SplashScreen } from "@/components/features/splash/SplashScreen";

import { useRouter } from "next/navigation";
import { useFolders } from "@/hooks/useFolders";
import { useActions } from "@/hooks/useActions";
import { registerEasterEggClue } from "@/lib/easter-egg";

export default function Home() {
  const { folders, loading } = useFolders();
  const { handleSplashReady } = useActions();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!folders || folders.length === 0) {
      registerEasterEggClue("home-no-folder").catch((error) => {
        console.error("Failed to register home easter-egg clue:", error);
      });
      router.replace("/landing");
    }
  }, [folders, loading, router]);

  return <SplashScreen onReady={handleSplashReady} />;
}
