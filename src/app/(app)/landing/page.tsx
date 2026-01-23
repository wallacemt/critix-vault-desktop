"use client";
import { LandingPage } from "@/components/features/landing/LandingPage";
import { ScanningProgress } from "@/components/ui/scanning-progress";
import { useActions } from "@/hooks/useActions";
import { useFolders } from "@/hooks/useFolders";

export default function LendingPage() {
  const { handleAddFolder, handleViewDemo, scanning, scanProgress } = useActions();
  const { loading: foldersLoading } = useFolders();
  return (
    <>
      <LandingPage onAddFolder={handleAddFolder} onViewDemo={handleViewDemo} loading={foldersLoading || scanning} />
      <ScanningProgress progress={scanProgress} isOpen={scanning} />
    </>
  );
}
