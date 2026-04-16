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
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
      }}
    >
      <DialogContent className="glass max-w-[95vw] sm:max-w-4xl mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-sm sm:text-base">
            Vues — {character?.name ?? ""}
          </DialogTitle>
        </DialogHeader>
        {character && (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              La sheet regroupe les angles utiles du même asset. Affichage en format carré/paysage.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              {/* Vue Face */}
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Vue principale
                </p>
                <ImageWithFallback
                  src={character.image_url}
                  alt="Vue principale"
                  className="w-full h-[300px] sm:h-[360px] object-contain rounded-lg border bg-muted/20"
                  fallbackClassName="w-full h-[300px] sm:h-[360px] rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground"
                />
              </div>

              {/* Sheet composite multi-angles */}
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Sheet (multi-angles)</p>
                {character.image_url_sheet ? (
                  <ImageWithFallback
                    src={character.image_url_sheet}
                    alt="Sheet multi-angles"
                    className="w-full h-[300px] sm:h-[360px] object-contain rounded-lg border bg-muted/20"
                    fallbackClassName="w-full h-[300px] sm:h-[360px] rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground"
                  />
                ) : (
                  <div className="w-full h-[300px] sm:h-[360px] rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                    Non généré
                  </div>
                )}
              </div>
            </div>
            {!character.image_url_sheet && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Génère ou régénère l’asset pour créer automatiquement la sheet multi-angles.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
