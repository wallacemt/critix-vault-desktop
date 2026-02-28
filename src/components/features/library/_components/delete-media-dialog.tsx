/**
 * DeleteMediaDialog Component
 * Confirmation dialog for deleting media from the library
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Media } from "@/types/media";
import { Trash2 } from "lucide-react";

interface DeleteMediaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  media: Media | null;
  isDeleting: boolean;
}

export function DeleteMediaDialog({ isOpen, onClose, onConfirm, media, isDeleting }: DeleteMediaDialogProps) {
  if (!media) return null;

  const mediaType = media.type === "MOVIE" ? "filme" : "série";

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Excluir {mediaType}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a excluir <strong>"{media.title}"</strong> da biblioteca.
            </p>
            <p className="text-sm text-muted-foreground">Esta ação irá:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>Remover a mídia do banco de dados</li>
              <li>Remover da biblioteca visual</li>
              <li className="text-amber-600 dark:text-amber-500">
                <strong>Nota:</strong> Os arquivos físicos NÃO serão deletados
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              Você pode adicionar novamente fazendo um novo scan da pasta.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
