"use client";

import { LibraryLayout } from "@/components/features/library/LibraryLayout";
import { useActions } from "@/hooks/useActions";
import { useFoldersContext } from "@/context/foldersContext";
import { Movie } from "@/types/movie";
import { LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LibraryPage() {
  const { folders, isLoading } = useFoldersContext();
  const { handleAddFolder, handleMediaClick, handlePlayMovie, scanning, scanProgress } = useActions();
  const router = useRouter();

  // Redirect if no folders
  if (!folders || folders.length === 0) {
    router.push("/landing");
    return null;
  }

  return (
    <>
      {isLoading ? (
        <div className="flex items-center flex-col justify-center flex-1 h-screen w-full">
          <LoaderIcon className="animate-spin size-6" />
          <p>Carregando mídias...</p>
        </div>
      ) : (
        <LibraryLayout
          onAddFolder={handleAddFolder}
          onMediaClick={handleMediaClick}
          onMediaPlay={(media) => {
            if (media.type === "MOVIE") {
              handlePlayMovie(media as Movie);
            }
          }}
        />
      )}

      {/* Show scanning modal when adding folder from library */}
      {scanning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--border-color)] max-w-md w-full">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center mx-auto mb-6">
                <LoaderIcon className="w-10 h-10 text-[var(--color-primary)] animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-display">Escaneando pasta...</h3>
              <p className="text-[var(--text-secondary)] mb-6 font-sans">{Math.round(scanProgress)}% concluído</p>
              <div className="w-full h-2 bg-[var(--bg-surface-light)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-primary)] to-amber-500 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
