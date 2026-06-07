import { Type, Layers, Check, Save, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type ChapterStatusBarProps = {
  tab: "ecriture" | "cases";
  wordCount: number;
  casesCount: number;
  validatedCount: number;
  assetsGenerated: number;
  assetsUngenerated: number;
  saveState: "clean" | "dirty" | "saving";
  isValidated?: boolean;
  /** Libellé de l'état verrouillé (ex. « Texte validé » à l'étape Assets, « Chapitre validé » au Découpage). */
  validatedLabel?: string;
  onShowUngenerated: () => void;
};

export function ChapterStatusBar({
  tab,
  wordCount,
  casesCount,
  validatedCount,
  assetsGenerated,
  assetsUngenerated,
  saveState,
  isValidated = false,
  validatedLabel = "Chapitre validé",
  onShowUngenerated,
}: ChapterStatusBarProps) {
  const allValidated = casesCount > 0 && validatedCount >= casesCount;
  const hasUngenerated = assetsUngenerated > 0;

  return (
    <footer
      className="h-8 shrink-0 border-t border-border/60 bg-card/60 backdrop-blur-sm px-3 sm:px-5 flex items-center gap-3 sm:gap-4 text-[11px] text-muted-foreground z-20 overflow-x-auto select-none"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Mots — uniquement en mode Écriture */}
      {tab === "ecriture" && (
        <span className="flex items-center gap-1 shrink-0">
          <Type className="h-3 w-3" />
          {wordCount.toLocaleString("fr-FR")} mot{wordCount !== 1 ? "s" : ""}
        </span>
      )}

      {/* Séparateur si les deux sections sont visibles */}
      {tab === "ecriture" && <span className="shrink-0 text-border/80">|</span>}

      {/* Cases */}
      <span
        className={cn(
          "flex items-center gap-1 shrink-0",
          allValidated && "text-emerald-500"
        )}
      >
        <Layers className="h-3 w-3" />
        {casesCount} case{casesCount !== 1 ? "s" : ""}
        {casesCount > 0 && (
          <span className={cn("ml-0.5", allValidated ? "text-emerald-500" : "text-muted-foreground/60")}>
            · {validatedCount} validée{validatedCount !== 1 ? "s" : ""}
          </span>
        )}
        {allValidated && <Check className="h-3 w-3 ml-0.5" />}
      </span>

      {(assetsGenerated > 0 || assetsUngenerated > 0) && (
        <span className="shrink-0 text-border/80">|</span>
      )}

      {/* Assets */}
      {(assetsGenerated > 0 || assetsUngenerated > 0) && (
        <button
          onClick={hasUngenerated ? onShowUngenerated : undefined}
          className={cn(
            "flex items-center gap-1 shrink-0 transition-colors",
            hasUngenerated
              ? "text-amber-500 hover:text-amber-400 cursor-pointer"
              : "text-emerald-500 cursor-default"
          )}
        >
          {hasUngenerated ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          ) : (
            <Check className="h-3 w-3" />
          )}
          {hasUngenerated ? (
            <>
              {assetsGenerated} générés
              <span className="text-amber-500">
                · {assetsUngenerated} manquant{assetsUngenerated !== 1 ? "s" : ""}
              </span>
            </>
          ) : isValidated ? (
            <span className="flex items-center gap-1 text-emerald-500">
              <Lock className="h-3 w-3" />
              {validatedLabel}
            </span>
          ) : (
            <span>Tous les assets générés, chapitre validable</span>
          )}
        </button>
      )}

      {/* Spacer */}
      <span className="flex-1" />

      {/* Auto-sauvegarde — masquée quand le chapitre est validé (lecture seule) */}
      {!isValidated && (
        <span className="hidden sm:flex items-center gap-1 shrink-0">
          <Save className="h-3 w-3" />
          {saveState === "saving" && "Sauvegarde…"}
          {saveState === "clean" && <span className="text-emerald-500">Auto-sauvegardé</span>}
          {saveState === "dirty" && <span className="text-amber-500">Non sauvegardé</span>}
        </span>
      )}
    </footer>
  );
}
