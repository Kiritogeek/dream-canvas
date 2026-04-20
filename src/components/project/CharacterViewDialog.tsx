import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import type { Asset } from "@/types";

interface CharacterViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Asset | null;
}

export function CharacterViewDialog({
  open,
  onOpenChange,
  character,
}: CharacterViewDialogProps) {
  const sheetUrl = character?.image_url_sheet ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-[95vw] sm:max-w-4xl mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-sm sm:text-base">
            Vues — {character?.name ?? ""}
          </DialogTitle>
        </DialogHeader>

        {character && (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Vue de face (utilisée dans la bibliothèque) et sheet 4 angles
              (utilisée comme référence pour la cohérence des panels).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Vue de face
                </p>
                <ImageWithFallback
                  src={character.image_url}
                  alt="Vue de face"
                  className="w-full h-[220px] sm:h-[320px] object-contain rounded-lg border bg-muted/20"
                  fallbackClassName="w-full h-[220px] sm:h-[320px] rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Sheet 4 angles (face / profil G / profil D / dos)
                </p>
                <ImageWithFallback
                  src={sheetUrl}
                  alt="Sheet 4 angles"
                  className="w-full h-[220px] sm:h-[320px] object-contain rounded-lg border bg-muted/20"
                  fallbackClassName="w-full h-[220px] sm:h-[320px] rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground"
                />
              </div>
            </div>

            {!sheetUrl && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                Aucune sheet enregistrée pour ce personnage. Relance une
                génération pour produire la sheet 4 angles — elle sera utilisée
                automatiquement en référence sur tous les panels du chapitre.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
