/**
 * ScanPreviewDialog Component
 * Shows folders and files that will be scanned before starting the scan process
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, Film, Tv, FileVideo } from "lucide-react";
import  { useState } from "react";
import { FolderPreview } from "@/types/folder";



interface ScanPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedPaths: string[]) => void;
  folders: FolderPreview[];
}

export function ScanPreviewDialog({ isOpen, onClose, onConfirm, folders }: ScanPreviewDialogProps) {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set(folders.map((f) => f.path)));

  const toggleFolder = (path: string) => {
    setSelectedPaths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedPaths));
  };

  const totalFiles = folders.filter((f) => selectedPaths.has(f.path)).reduce((sum, f) => sum + f.fileCount, 0);

  const totalMovies = folders.filter((f) => selectedPaths.has(f.path)).reduce((sum, f) => sum + f.estimatedMovies, 0);

  const totalSeries = folders.filter((f) => selectedPaths.has(f.path)).reduce((sum, f) => sum + f.estimatedSeries, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileVideo className="h-5 w-5" />
            Prévia do Scan
          </DialogTitle>
          <DialogDescription>
            Selecione as pastas que deseja processar. Você pode desmarcar pastas que não quer incluir neste momento.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {folders.map((folder) => (
              <div
                key={folder.path}
                className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={selectedPaths.has(folder.path)}
                  onCheckedChange={() => toggleFolder(folder.path)}
                  className="mt-1"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <h3 className="font-semibold text-sm truncate">{folder.name}</h3>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2 truncate">{folder.path}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileVideo className="h-3 w-3" />
                      <span>{folder.fileCount} arquivos</span>
                    </div>

                    {folder.estimatedMovies > 0 && (
                      <div className="flex items-center gap-1">
                        <Film className="h-3 w-3" />
                        <span>~{folder.estimatedMovies} filmes</span>
                      </div>
                    )}

                    {folder.estimatedSeries > 0 && (
                      <div className="flex items-center gap-1">
                        <Tv className="h-3 w-3" />
                        <span>~{folder.estimatedSeries} séries</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t pt-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-secondary">
              <div className="text-2xl font-bold text-foreground">{totalFiles}</div>
              <div className="text-xs text-muted-foreground">Arquivos</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary">
              <div className="text-2xl font-bold text-foreground">~{totalMovies}</div>
              <div className="text-xs text-muted-foreground">Filmes</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary">
              <div className="text-2xl font-bold text-foreground">~{totalSeries}</div>
              <div className="text-xs text-muted-foreground">Séries</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={selectedPaths.size === 0}>
            Escanear {selectedPaths.size} pasta(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
