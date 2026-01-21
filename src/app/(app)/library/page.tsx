"use client";

import { LibraryLayout } from "@/components/features/library/LibraryLayout";
import { useActions } from "@/hooks/useActions";
import { useFolders } from "@/hooks/useFolders";
import { Movie } from "@/types";

export default function LibraryPage() {
  const { folders } = useFolders();
  const { handleAddFolder, removeFolder, handleMediaClick, handlePlayMovie } = useActions();
  return folders ? (
    <LibraryLayout
      folders={folders}
      onAddFolder={handleAddFolder}
      onRemoveFolder={removeFolder}
      onMediaClick={handleMediaClick}
      onMediaPlay={(media) => {
        if (media.type === "MOVIE") {
          handlePlayMovie(media as Movie);
        }
      }}
    />
  ) : (
    <div className="flex items-center justify-center flex-1">
      <p>Nenhuma pasta encontrada para carregar midias</p>
    </div>
  );
}
