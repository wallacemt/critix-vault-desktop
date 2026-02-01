/**
 * NewMediaNotification Component
 * Displays a modal notification when new media is detected during auto-scan
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Movie, Series } from "@/types";
import { Film, Tv } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NewMediaNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  movies: Movie[];
  series: Series[];
}

export function NewMediaNotification({ isOpen, onClose, movies, series }: NewMediaNotificationProps) {
  const totalNew = movies.length + series.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🎬 New Media Detected</DialogTitle>
          <DialogDescription>
            Found {totalNew} new {totalNew === 1 ? "item" : "items"} in your library
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {movies.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Film className="h-4 w-4" />
                Movies ({movies.length})
              </h3>
              <ul className="space-y-2">
                {movies.map((movie) => (
                  <li key={movie.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    {movie.poster && (
                      <img src={movie.poster} alt={movie.title} className="w-12 h-18 object-cover rounded" />
                    )}
                    <div>
                      <p className="font-medium">{movie.title}</p>
                      {movie.year && <p className="text-sm text-muted-foreground">{movie.year}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {series.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Tv className="h-4 w-4" />
                Series ({series.length})
              </h3>
              <ul className="space-y-2">
                {series.map((show) => (
                  <li key={show.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    {show.poster && (
                      <img src={show.poster} alt={show.title} className="w-12 h-18 object-cover rounded" />
                    )}
                    <div>
                      <p className="font-medium">{show.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {show.numberOfSeasons} {show.numberOfSeasons === 1 ? "season" : "seasons"}
                        {" • "}
                        {show.numberOfEpisodes} episodes
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
