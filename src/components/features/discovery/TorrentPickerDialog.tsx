"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Search } from "lucide-react";
import { TorrentMatch, DiscoveryItem } from "@/types/discovery";

interface TorrentPickerDialogProps {
  open: boolean;
  onClose: () => void;
  item: DiscoveryItem | null;
  /** Called when the user picks a torrent to download. */
  onSelect: (torrent: TorrentMatch) => Promise<void>;
  /** Called when the item has no torrents and the user wants to fetch them. */
  onFetchTorrents: (item: DiscoveryItem) => Promise<TorrentMatch[]>;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "?";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function seederColor(seeders: number): string {
  if (seeders > 50) return "text-emerald-400";
  if (seeders > 10) return "text-yellow-400";
  return "text-red-400";
}

export function TorrentPickerDialog({
  open,
  onClose,
  item,
  onSelect,
  onFetchTorrents,
}: TorrentPickerDialogProps) {
  const [torrents, setTorrents] = useState<TorrentMatch[]>(item?.torrents ?? []);
  const [fetching, setFetching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Sync local state when item changes (dialog re-opened for a different card)
  const currentTorrents = item?.torrents.length ? item.torrents : torrents;

  const handleFetch = async () => {
    if (!item) return;
    setFetching(true);
    try {
      const results = await onFetchTorrents(item);
      setTorrents(results);
    } finally {
      setFetching(false);
    }
  };

  const handleSelect = async (torrent: TorrentMatch) => {
    setDownloadingId(torrent.id);
    try {
      await onSelect(torrent);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível abrir o link magnet.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            {item?.title ?? "Escolher Torrent"}
          </DialogTitle>
        </DialogHeader>

        {currentTorrents.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-slate-400 text-sm text-center">
              Nenhum torrent encontrado para esta mídia.
            </p>
            <Button
              onClick={handleFetch}
              disabled={fetching}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {fetching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Buscar torrents
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {currentTorrents.map((torrent) => (
              <div
                key={torrent.id}
                className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3 hover:border-slate-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate" title={torrent.name}>
                    {torrent.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {torrent.quality && (
                      <Badge className="bg-emerald-600/30 text-emerald-300 border-emerald-500/30 text-xs">
                        {torrent.quality}
                      </Badge>
                    )}
                    <span className="text-xs text-slate-500">{formatBytes(torrent.sizeBytes)}</span>
                    <span className={`text-xs font-medium ${seederColor(torrent.seeders)}`}>
                      {torrent.seeders} seeds
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSelect(torrent)}
                  disabled={downloadingId === torrent.id}
                  className="shrink-0 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg"
                >
                  {downloadingId === torrent.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
