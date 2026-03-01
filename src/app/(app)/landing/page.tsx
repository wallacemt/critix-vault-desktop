"use client";
import { LandingPage } from "@/components/features/landing/LandingPage";
import { ScanningProgress } from "@/components/ui/scanning-progress";
import { useActions } from "@/hooks/useActions";
import { useFoldersContext } from "@/context/foldersContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { LoaderIcon } from "lucide-react";

function LendingPageContent() {
  const { handleAddFolder, handleViewDemo, scanning, scanProgress } = useActions();
  const { folders, isLoading, refreshFolders } = useFoldersContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // If accessing via home=true, don't auto-redirect
  const isHomePage = searchParams.get("home") === "true";

  // Only redirect to library on initial load (not when user explicitly navigated here)
  useEffect(() => {
    if (!isHomePage && !isLoading && folders && folders.length > 0) {
      console.log("📁 User has folders, redirecting to library...");
      router.push("/library");
    }
  }, [folders, isLoading, router, isHomePage]);

  const handleLoadBackup = async (file: File) => {
    setImportError(null);
    setImportLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/settings/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Falha ao importar backup");
      }

      await refreshFolders?.();
      router.push("/library");
    } catch (e: any) {
      console.error("Backup import failed:", e);
      const msg = e?.message ?? "Erro ao carregar backup";
      setImportError(msg);
      setTimeout(() => setImportError(null), 5000);
    } finally {
      setImportLoading(false);
    }
  };

  const handleGoToLibrary = () => {
    router.push("/library");
  };

  // Show loading while checking folders
  if (isLoading) {
    return (
      <div className="flex items-center flex-col justify-center flex-1 h-screen w-full bg-[var(--bg-body)]">
        <LoaderIcon className="animate-spin size-6 text-[var(--color-primary)]" />
        <p className="text-[var(--text-secondary)] mt-2">Carregando...</p>
      </div>
    );
  }

  // If user has folders and NOT on home page, show loading while redirect happens
  if (!isHomePage && folders && folders.length > 0) {
    return (
      <div className="flex items-center flex-col justify-center flex-1 h-screen w-full bg-[var(--bg-body)]">
        <LoaderIcon className="animate-spin size-6 text-[var(--color-primary)]" />
        <p className="text-[var(--text-secondary)] mt-2">Carregando biblioteca...</p>
      </div>
    );
  }

  const hasFolders = folders && folders.length > 0;

  return (
    <>
      {importError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 text-red-200 text-sm px-5 py-3 rounded-xl shadow-lg">
          ❌ {importError}
        </div>
      )}
      <LandingPage
        onAddFolder={handleAddFolder}
        onViewDemo={handleViewDemo}
        onLoadBackup={handleLoadBackup}
        loading={scanning || importLoading}
        folders={hasFolders ? folders : undefined}
        onGoToLibrary={hasFolders ? handleGoToLibrary : undefined}
      />
      <ScanningProgress progress={scanProgress} isOpen={scanning} />
    </>
  );
}

export default function LendingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center flex-col justify-center flex-1 h-screen w-full bg-[var(--bg-body)]">
          <LoaderIcon className="animate-spin size-6 text-[var(--color-primary)]" />
          <p className="text-[var(--text-secondary)] mt-2">Carregando...</p>
        </div>
      }
    >
      <LendingPageContent />
    </Suspense>
  );
}
