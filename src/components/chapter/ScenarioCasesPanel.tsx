import React, { useState } from "react";
import { Loader2, GripVertical, CheckCircle2, Wand2, Zap, RefreshCw, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ValidatedCase = {
  panel_number: number;
  block_number?: number;
  description?: string;
  text_excerpt?: string;
  caseNumber: number;
};

export interface ScenarioCasesPanelProps {
  scenarioContent: string | null | undefined;
  loadingScenario: boolean;
  validatedCases: ValidatedCase[];
  existingBlockPrompts: string[];
  /** Ref partagée pour le ghost de drag (même que la sidebar). */
  newBlockDragGhostRef?: React.RefObject<HTMLDivElement | null>;
  /** Composition IA du canvas depuis le découpage scénario. */
  onCompose?: () => void;
  isComposing?: boolean;
  hasOutlineToCompose?: boolean;
  hasExistingComposition?: boolean;
  showRecomposeActions?: boolean;
  onAcceptRecompose?: () => void;
  onRefuseRecompose?: () => void;
  isRefusingRecompose?: boolean;
  onGenerateAll?: () => void;
  isGeneratingAll?: boolean;
  generateAllProgress?: { current: number; total: number } | null;
  blocksToGenerateCount?: number;
}

/**
 * Panneau « Cases du scénario » — liste des cases validées du découpage,
 * composition / recomposition IA du canvas, génération en batch, et drag d'une
 * case vers le canvas pour créer un bloc. Affiché dans le rail gauche de l'éditeur.
 */
export function ScenarioCasesPanel({
  scenarioContent,
  loadingScenario,
  validatedCases,
  existingBlockPrompts,
  newBlockDragGhostRef,
  onCompose,
  isComposing = false,
  hasOutlineToCompose = false,
  hasExistingComposition = false,
  showRecomposeActions = false,
  onAcceptRecompose,
  onRefuseRecompose,
  isRefusingRecompose = false,
  onGenerateAll,
  isGeneratingAll = false,
  generateAllProgress = null,
  blocksToGenerateCount = 0,
}: ScenarioCasesPanelProps) {
  const [draggingCaseNumber, setDraggingCaseNumber] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {validatedCases.length > 0 && (
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-1.5 shadow-sm dark:bg-emerald-500/15">
            <span className="text-xl font-bold tabular-nums leading-none text-emerald-900 dark:text-emerald-50">
              {validatedCases.length}
            </span>
            <span className="text-xs font-medium leading-tight text-emerald-800 dark:text-emerald-200">
              case{validatedCases.length > 1 ? "s" : ""} validée{validatedCases.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Accepter / Refuser après une recomposition */}
      {showRecomposeActions && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-muted-foreground text-center">
            Nouvelle composition — la garder ?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onAcceptRecompose}
              disabled={isRefusingRecompose}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Accepter
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 border-red-400/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={onRefuseRecompose}
              disabled={isRefusingRecompose}
            >
              {isRefusingRecompose ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Refuser
            </Button>
          </div>
        </div>
      )}

      {/* Bouton Composer / Recomposer */}
      {!showRecomposeActions && hasOutlineToCompose && onCompose && (
        <Button
          size="sm"
          className={
            hasExistingComposition
              ? "w-full gap-2 shrink-0 border border-primary/30 bg-transparent text-primary hover:bg-primary/5"
              : "w-full gap-2 shrink-0 gradient-primary text-white"
          }
          onClick={onCompose}
          disabled={isComposing || isGeneratingAll}
        >
          {isComposing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {hasExistingComposition ? "Recomposition en cours…" : "Composition en cours…"}
            </>
          ) : hasExistingComposition ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Recomposer
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5" />
              Composer le chapitre
            </>
          )}
        </Button>
      )}

      {/* Bouton Générer toutes les cases */}
      {blocksToGenerateCount > 0 && onGenerateAll && !hasExistingComposition && (
        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 shrink-0 border-amber-400/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            onClick={onGenerateAll}
            disabled={isGeneratingAll || isComposing}
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {generateAllProgress
                  ? `Génération ${generateAllProgress.current}/${generateAllProgress.total}…`
                  : "Génération en cours…"}
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                Générer toutes les cases ({blocksToGenerateCount})
              </>
            )}
          </Button>
          {isGeneratingAll && generateAllProgress && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${(generateAllProgress.current / generateAllProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {validatedCases.length > 0 && (
        <p className="text-[11px] text-muted-foreground -mt-1">
          Glissez une case sur le canvas pour créer un bloc
        </p>
      )}

      {!scenarioContent && !loadingScenario && (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
          <BookOpen className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Aucun chapitre scénario lié à ce chapitre.</p>
        </div>
      )}

      {loadingScenario && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
        </div>
      )}

      {scenarioContent && !loadingScenario && validatedCases.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
          <BookOpen className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Aucune case validée dans le scénario. Validez des cases dans l&apos;onglet Scénario.
          </p>
        </div>
      )}

      {validatedCases.length > 0 && (
        <div className="flex flex-col gap-2">
          {validatedCases.map((c) => {
            const alreadyAdded = existingBlockPrompts.some(
              (p) => p.trim() === c.description?.trim()
            );
            const isDragging = draggingCaseNumber === c.caseNumber;

            return (
              <div
                key={`case-${c.panel_number}-${c.block_number}`}
                draggable={!!c.description}
                onDragStart={(e) => {
                  if (!c.description) return;
                  setDraggingCaseNumber(c.caseNumber);
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({
                      type: "case-block",
                      description: c.description,
                      caseNumber: c.caseNumber,
                    })
                  );
                  e.dataTransfer.effectAllowed = "copy";

                  // Ghost partagé avec la sidebar
                  const ghost = newBlockDragGhostRef?.current;
                  if (ghost) {
                    ghost.style.width = "120px";
                    ghost.style.height = "44px";
                    ghost.textContent = `Case ${c.caseNumber}`;
                    e.dataTransfer.setDragImage(ghost, 60, 22);
                  }
                }}
                onDragEnd={() => setDraggingCaseNumber(null)}
                className={`rounded-xl border p-3 flex items-start gap-2 select-none transition-all duration-150 ${
                  c.description ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                } ${
                  isDragging
                    ? "opacity-50 scale-[0.98] border-primary/40 bg-primary/5"
                    : alreadyAdded
                    ? "border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/40"
                    : "border-border/60 bg-card/60 hover:border-[hsl(var(--lavender)/0.4)] hover:-translate-y-0.5 hover:shadow-sm"
                }`}
              >
                {/* Poignée drag */}
                <GripVertical className="shrink-0 h-3.5 w-3.5 text-muted-foreground/30 mt-0.5" />

                {/* Numéro */}
                <span
                  className={`shrink-0 text-[10px] font-bold font-mono w-5 h-5 rounded flex items-center justify-center mt-0.5 ${
                    alreadyAdded
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-[hsl(var(--lavender)/0.15)] text-[hsl(275,45%,55%)]"
                  }`}
                >
                  {c.caseNumber}
                </span>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed text-foreground line-clamp-3">
                    {c.description ?? "—"}
                  </p>
                  {c.text_excerpt && (
                    <p className="text-[10px] text-muted-foreground italic mt-1 line-clamp-2 border-l-2 border-border pl-2">
                      {c.text_excerpt}
                    </p>
                  )}
                </div>

                {/* Indicateur "déjà ajoutée" */}
                {alreadyAdded && (
                  <CheckCircle2 className="shrink-0 h-3.5 w-3.5 text-emerald-500 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
