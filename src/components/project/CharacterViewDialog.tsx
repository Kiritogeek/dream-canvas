import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useUserPlan } from "@/hooks/useUserPlan";
import type { Asset, CharacterView } from "@/types";

interface CharacterViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Asset | null;
  generatingView: CharacterView | null;
  onGenerateView: (asset: Asset, view: CharacterView) => void;
}

const VIEWS: { key: CharacterView; label: string }[] = [
  { key: "profile_left", label: "Profil gauche" },
  { key: "profile_right", label: "Profil droite" },
  { key: "back", label: "Dos" },
];

function getViewUrl(character: Asset, view: CharacterView): string | null {
  switch (view) {
    case "profile_left":
      return character.image_url_profile_left;
    case "profile_right":
      return character.image_url_profile_right;
    case "back":
      return character.image_url_back;
  }
}

export function CharacterViewDialog({
  open,
  onOpenChange,
  character,
  generatingView,
  onGenerateView,
}: CharacterViewDialogProps) {
  const { limits } = useUserPlan();
  const viewsAllowed = limits.allowMultipleViews;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
      }}
    >
      <DialogContent className="glass max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            Vues du personnage — {character?.name ?? ""}
          </DialogTitle>
        </DialogHeader>
        {character && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {viewsAllowed
                ? "Vue de face (principale). Générez les vues profil et dos pour utiliser le personnage sous tous les angles."
                : "Vue de face (principale). Les vues multiples sont réservées au plan Pro."}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Vue Face */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Face
                </p>
                <ImageWithFallback
                  src={character.image_url}
                  alt="Face"
                  className="w-full aspect-[2/3] object-cover rounded-lg border"
                  fallbackClassName="w-full aspect-[2/3] rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground"
                />
              </div>

              {/* Vues additionnelles */}
              {VIEWS.map(({ key, label }) => {
                const url = getViewUrl(character, key);
                return (
                  <div key={key} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                    {!viewsAllowed ? (
                      <div className="w-full aspect-[2/3] rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 p-2 bg-muted/30">
                        <Lock className="h-6 w-6 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground text-center">
                          Pro
                        </span>
                      </div>
                    ) : generatingView === key ? (
                      <div className="w-full aspect-[2/3] rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 p-2">
                        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                        <span className="text-xs text-muted-foreground">
                          Génération…
                        </span>
                      </div>
                    ) : (
                      <>
                        <ImageWithFallback
                          src={url}
                          alt={label}
                          className="w-full aspect-[2/3] object-cover rounded-lg border"
                          fallbackClassName="w-full aspect-[2/3] rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 p-2"
                        />
                        <Button
                          size="sm"
                          variant={url ? "ghost" : "outline"}
                          className={url ? "w-full text-xs" : "text-xs"}
                          onClick={() => onGenerateView(character, key)}
                        >
                          {url ? "Régénérer" : "Générer"}
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
