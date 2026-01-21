"use client";
import { useEffect } from "react";
import { SplashScreen } from "@/components/features/splash/SplashScreen";

import { redirect } from "next/navigation";
import { useFolders } from "@/hooks/useFolders";
import { useActions } from "@/hooks/useActions";

export default function Home() {
  const { folders } = useFolders();
  const { handleSplashReady } = useActions();
  useEffect(() => {
    if (!folders || folders.length === 0) {
      redirect("/landing");
    }
  }, [folders]);

  return <SplashScreen onReady={handleSplashReady} />;
}
