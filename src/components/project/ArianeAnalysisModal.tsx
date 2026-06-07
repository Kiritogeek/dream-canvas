import { useEffect, useState } from "react";
import { Loader2, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { triggerCompassIndex, triggerCompassPropose } from "@/services/compassIndex";

// ── Props ─────────────────────────────────────────────────────

interface ArianeAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelé quand l'analyse réussit (état "done") ou via « Continuer quand même » en cas d'erreur. */
  onComplete?: () => void;
  projectId: string;
  chapterId: string;
  chapterContent: string;
  chapterNumber: number;
}

// ── États de l'analyse ────────────────────────────────────────

type AnalysisState = "loading" | "done" | "error";

// ── Composant ────────────────────────────────────────────────

export function ArianeAnalysisModal({
  isOpen,
  onClose,
  onComplete,
  projectId,
  chapterId,
  chapterContent,
  chapterNumber,
}: ArianeAnalysisModalProps) {
  const [state, setState] = useState<AnalysisState>("loading");

  useEffect(() => {
    if (!isOpen) return;
    setState("loading");

    const run = async () => {
      try {
        await Promise.all([
          triggerCompassIndex(projectId, "chapter", chapterId, chapterContent),
          triggerCompassPropose(projectId, chapterContent, chapterId),
        ]);
        setState("done");
      } catch {
        setState("error");
      }
    };

    void run();
  }, [isOpen, projectId, chapterId, chapterContent]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && state !== "loading" && onClose()}>
      <DialogContent className="glass max-w-sm w-full p-0 overflow-hidden" hideClose={state === "loading"}>
        <DialogTitle className="sr-only">Analyse Ariane</DialogTitle>
        <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">

          {/* Icône Ariane */}
          <div className="relative">
            <div className="p-4 rounded-2xl bg-[hsl(var(--lavender)/0.12)] border border-[hsl(var(--lavender)/0.2)]">
              <Sparkles className="h-8 w-8 text-[hsl(var(--lavender))]" />
            </div>
            {state === "loading" && (
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border border-border">
                <Loader2 className="h-3.5 w-3.5 text-[hsl(var(--lavender))] animate-spin" />
              </div>
            )}
            {state === "done" && (
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 border border-background">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>

          {/* Texte */}
          {state === "loading" && (
            <>
              <div className="space-y-1.5">
                <h3 className="font-display font-semibold text-lg leading-tight">
                  Ariane lit votre chapitre…
                </h3>
                <p className="text-sm text-muted-foreground max-w-[220px]">
                  Elle identifie les éléments à ajouter dans votre Univers : personnages,
                  lieux, connexions narratives.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analyse du Chapitre {chapterNumber} en cours…</span>
              </div>
            </>
          )}

          {state === "done" && (
            <>
              <div className="space-y-1.5">
                <h3 className="font-display font-semibold text-lg leading-tight">
                  Analyse terminée, passons aux assets
                </h3>
                <p className="text-sm text-muted-foreground max-w-[220px]">
                  Ariane a relu votre chapitre. Place à la curation des assets à générer.
                </p>
              </div>
              <Button
                onClick={() => onComplete?.()}
                className="gap-2 gradient-primary text-primary-foreground rounded-xl px-6 shadow-dream"
              >
                <Check className="h-4 w-4" />
                Continuer
              </Button>
            </>
          )}

          {state === "error" && (
            <>
              <div className="space-y-1.5">
                <h3 className="font-display font-semibold text-lg leading-tight">
                  Analyse indisponible
                </h3>
                <p className="text-sm text-muted-foreground max-w-[220px]">
                  Une erreur est survenue. Vous pouvez continuer : les propositions existantes
                  restent exploitables.
                </p>
              </div>
              <Button
                onClick={() => onComplete?.()}
                className="gap-2 gradient-primary text-primary-foreground rounded-xl px-6 shadow-dream"
              >
                Continuer quand même
              </Button>
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
