"use client";

import { LibraryLayout } from "@/components/features/library/LibraryLayout";
import { useActions } from "@/hooks/useActions";
import { useFoldersContext } from "@/context/foldersContext";
import { Movie } from "@/types";

export default function LibraryPage() {
  const { folders } = useFoldersContext();
  const { handleAddFolder, handleMediaClick, handlePlayMovie } = useActions();

  return folders && folders.length > 0 ? (
    <LibraryLayout
      onAddFolder={handleAddFolder}
      onMediaClick={handleMediaClick}
      onMediaPlay={(media) => {
        if (media.type === "MOVIE") {
          handlePlayMovie(media as Movie);
        }
      }}
    />
  ) : (
    <div className="flex items-center justify-center flex-1">
      <p>Nenhuma pasta encontrada para carregar mídias</p>
    </div>
  );
}
