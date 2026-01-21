"use client";
import { LandingPage } from "@/components/features/landing/LandingPage";
import { useActions } from "@/hooks/useActions";
import { useFolders } from "@/hooks/useFolders";

export default function LendingPage() {
  const { handleAddFolder, handleViewDemo } = useActions();
  const { loading: foldersLoading } = useFolders();
  return <LandingPage onAddFolder={handleAddFolder} onViewDemo={handleViewDemo} loading={foldersLoading} />;
}
