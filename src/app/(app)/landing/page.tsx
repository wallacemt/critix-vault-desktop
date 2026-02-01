"use client";
import { LandingPage } from "@/components/features/landing/LandingPage";
import { ScanningProgress } from "@/components/ui/scanning-progress";
import { useActions } from "@/hooks/useActions";
import { useFoldersContext } from "@/context/foldersContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoaderIcon } from "lucide-react";

export default function LendingPage() {
  const { handleAddFolder, handleViewDemo, scanning, scanProgress } = useActions();
  const { folders, isLoading } = useFoldersContext();
  const router = useRouter();

  // Redirect to library if user already has folders
  useEffect(() => {
    if (!isLoading && folders && folders.length > 0) {
      console.log("📁 User has folders, redirecting to library...");
      router.push("/library");
    }
  }, [folders, isLoading, router]);

  // Show loading while checking folders
  if (isLoading) {
    return (
      <div className="flex items-center flex-col justify-center flex-1 h-screen w-full bg-[var(--bg-body)]">
        <LoaderIcon className="animate-spin size-6 text-[var(--color-primary)]" />
        <p className="text-[var(--text-secondary)] mt-2">Carregando...</p>
      </div>
    );
  }

  // If user has folders, show loading while redirect happens
  if (folders && folders.length > 0) {
    return (
      <div className="flex items-center flex-col justify-center flex-1 h-screen w-full bg-[var(--bg-body)]">
        <LoaderIcon className="animate-spin size-6 text-[var(--color-primary)]" />
        <p className="text-[var(--text-secondary)] mt-2">Carregando biblioteca...</p>
      </div>
    );
  }

  return (
    <>
      <LandingPage onAddFolder={handleAddFolder} onViewDemo={handleViewDemo} loading={scanning} />
      <ScanningProgress progress={scanProgress} isOpen={scanning} />
    </>
  );
}
