import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import type { Asset, UserPlan } from "@/types";

type ViewKey = "profile_left" | "profile_right" | "back";

interface CharacterViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Asset | null;
  generatingView?: ViewKey | null;
  onGenerateView?: (asset: Asset, view: ViewKey) => void;
  userPlan?: UserPlan;
}

interface ViewSlot {
  key: ViewKey;
  label: string;
  imageUrl: string | null | undefined;
}

export function CharacterViewDialog({
  open,
  onOpenChange,
  character,
  generatingView,
  onGenerateView,
  userPlan,
}: CharacterViewDialogProps) {
  const isFree = userPlan === "free";

  const viewSlots: ViewSlot[] = character
    ? [
        { key: "profile_left", label: "Profil gauche", imageUrl: character.image_url_profile_left },
        { key: "profile_right", label: "Profil droit", imageUrl: character.image_url_profile_right },
        { key: "back", label: "Dos", imageUrl: character.image_url_back },
      ]
    : [];

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
          <TooltipProvider>
            <div className="space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground">
                La sheet regroupe les angles utiles du même asset. Affichage en format carré/paysage.
              </p>

              {/* Grille 2×2 : face + 3 vues générables */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {/* Vue face — toujours affichée, non régénérable ici */}
                <div className="space-y-1.5 sm:space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Vue principale</p>
                  <ImageWithFallback
                    src={character.image_url}
                    alt="Vue principale"
                    className="w-full h-[200px] sm:h-[260px] object-contain rounded-lg border bg-muted/20"
                    fallbackClassName="w-full h-[200px] sm:h-[260px] rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground"
                  />
                </div>

                {/* 3 vues générables */}
                {viewSlots.map((slot) => {
                  const isGeneratingThis = generatingView === slot.key;
                  const hasImage = !!slot.imageUrl;

                  return (
                    <div key={slot.key} className="space-y-1.5 sm:space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{slot.label}</p>
                      {isGeneratingThis ? (
                        <div className="w-full h-[200px] sm:h-[260px] rounded-lg border bg-muted/20 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                          <span className="text-xs text-muted-foreground">Génération…</span>
                        </div>
                      ) : hasImage ? (
                        <div className="relative group">
                          <ImageWithFallback
                            src={slot.imageUrl!}
                            alt={slot.label}
                            className="w-full h-[200px] sm:h-[260px] object-contain rounded-lg border bg-muted/20"
                            fallbackClassName="w-full h-[200px] sm:h-[260px] rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground"
                          />
                          {onGenerateView && (
                            <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="sm"
                                      disabled={isFree || !!generatingView}
                                      onClick={() => onGenerateView(character, slot.key)}
                                      className="gradient-primary text-primary-foreground text-xs"
                                    >
                                      Régénérer
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {isFree && (
                                  <TooltipContent>Pro uniquement</TooltipContent>
                                )}
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-[200px] sm:h-[260px] rounded-lg border border-dashed flex flex-col items-center justify-center gap-2">
                          {onGenerateView ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="sm"
                                    disabled={isFree || !!generatingView}
                                    onClick={() => onGenerateView(character, slot.key)}
                                    className="gradient-primary text-primary-foreground text-xs"
                                  >
                                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                                    Générer cette vue
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {isFree && (
                                <TooltipContent>Pro uniquement</TooltipContent>
                              )}
                            </Tooltip>
                          ) : (
                            <p className="text-xs text-muted-foreground">Non généré</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!character.image_url_sheet && (
                <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Génère ou régénère l'asset pour créer automatiquement la sheet multi-angles.
                </div>
              )}
            </div>
          </TooltipProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
