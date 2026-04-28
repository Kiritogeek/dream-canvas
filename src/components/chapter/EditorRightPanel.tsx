import { BookOpen, Loader2, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScenarioTextHighlighter } from "@/components/project/ScenarioTextHighlighter";
import type { Asset } from "@/types";

type ValidatedCase = {
  panel_number: number;
  block_number?: number;
  description?: string;
  text_excerpt?: string;
  caseNumber: number;
};

interface EditorRightPanelProps {
  activeTool: "chapter-text" | "cases" | null;
  onToolChange: (tool: "chapter-text" | "cases" | null) => void;
  loadingScenario: boolean;
  scenarioContent: string | null | undefined;
  assets: Asset[];
  validatedCases: ValidatedCase[];
  existingBlockPrompts: string[];
  isUpdating: boolean;
  isPro: boolean;
  onAddBlockFromCase: (description: string) => void;
  onNavigateToPlans: () => void;
}

export function EditorRightPanel({
  activeTool,
  onToolChange,
  loadingScenario,
  scenarioContent,
  assets,
  validatedCases,
  existingBlockPrompts,
  isUpdating,
  isPro,
  onAddBlockFromCase,
  onNavigateToPlans,
}: EditorRightPanelProps) {
  return (
    <>
      {/* Droite : panel contenu en overlay absolu — ne pousse pas le canvas */}
      <aside className={`absolute right-[76px] top-0 bottom-0 flex flex-col border-l border-border bg-background z-20 transition-[width] duration-200 ease-in-out overflow-hidden ${activeTool ? "w-[340px]" : "w-0 pointer-events-none border-l-0"}`}>
        {activeTool === "chapter-text" && (
          <div className="p-4 space-y-2 flex-1 min-h-0 flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Scénario</span>
            {loadingScenario ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : scenarioContent ? (
              <div className="rounded-md border border-border bg-muted/30 p-3 min-h-[80px] flex-1 overflow-y-auto">
                <ScenarioTextHighlighter text={scenarioContent} assets={assets} className="text-sm" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-2">Aucun chapitre scénario lié.</p>
            )}
          </div>
        )}

        {activeTool === "cases" && (
          <div className="p-4 space-y-3 flex-1 min-h-0 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cases du scénario</span>
              {validatedCases.length > 0 && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-semibold">
                  {validatedCases.length} validée{validatedCases.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

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
                <p className="text-xs text-muted-foreground">Aucune case validée dans le scénario. Validez des cases dans l'onglet Scénario.</p>
              </div>
            )}

            {validatedCases.length > 0 && (
              <div className="flex flex-col gap-2">
                {validatedCases.map((c) => {
                  const alreadyAdded = existingBlockPrompts.some(
                    (p) => p.trim() === c.description?.trim()
                  );
                  return (
                    <div
                      key={`case-${c.panel_number}-${c.block_number}`}
                      className="rounded-xl border border-border/60 bg-card/60 p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 text-[10px] font-bold font-mono w-5 h-5 rounded bg-[hsl(var(--lavender)/0.15)] text-[hsl(275,45%,55%)] flex items-center justify-center mt-0.5">
                          {c.caseNumber}
                        </span>
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
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyAdded ? "outline" : "default"}
                        className={`w-full h-7 text-xs gap-1.5 ${alreadyAdded ? "opacity-60" : "gradient-primary text-primary-foreground"}`}
                        disabled={!c.description || isUpdating}
                        onClick={() => !alreadyAdded && onAddBlockFromCase(c.description!)}
                      >
                        {alreadyAdded ? (
                          <>✓ Déjà ajouté</>
                        ) : (
                          <><Plus className="h-3 w-3" /> Créer un bloc</>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </aside>
      <aside className="relative w-[76px] shrink-0 border-l border-border bg-muted/20 px-2 py-4 flex flex-col items-center gap-2 z-30">
        <button
          type="button"
          onClick={() => onToolChange(activeTool === "chapter-text" ? null : "chapter-text")}
          className={`w-full h-12 rounded-xl border flex items-center justify-center transition-colors duration-150 ${
            activeTool === "chapter-text"
              ? "border-primary/70 bg-primary/15 text-primary shadow-sm"
              : "border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
          title="Scénario"
        >
          <BookOpen className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={isPro ? () => onToolChange(activeTool === "cases" ? null : "cases") : onNavigateToPlans}
          className={`w-full h-12 rounded-xl border flex items-center justify-center transition-colors duration-150 relative ${
            isPro
              ? activeTool === "cases"
                ? "border-primary/70 bg-primary/15 text-primary shadow-sm"
                : "border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
              : "border-border/70 bg-background text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
          }`}
          title={isPro ? "Cases" : "Fonctionnalité Pro — Cliquez pour mettre à niveau"}
        >
          <Layers className="h-5 w-5" />
          {!isPro && (
            <span className="absolute -top-1 -right-1 bg-amber-400/30 text-amber-600 dark:text-amber-400 border border-amber-400/40 text-[8px] font-bold rounded px-1 tracking-wide">
              PRO
            </span>
          )}
        </button>
      </aside>
    </>
  );
}
