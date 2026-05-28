import React, { useMemo, useState } from "react";
import { BookOpen, Loader2, Layers, GripVertical, CheckCircle2, Package, ChevronDown, Wand2, Zap, RefreshCw, X } from "lucide-react";
import { EditorSettingsPopover } from "@/components/chapter/EditorSettingsPopover";
import type { EditorSettings } from "@/hooks/useEditorSettings";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScenarioFormattedPreview } from "@/components/project/ScenarioFormattedPreview";
import type { Asset } from "@/types";
import { planDisplayName } from "@/types";
import { cn } from "@/lib/utils";
import {
  CHAPTER_EDITOR_RAIL_ASIDE_CLASS,
  CHAPTER_EDITOR_RAIL_COUNT_BADGE_CLASS,
  CHAPTER_EDITOR_RAIL_PANEL_RIGHT_CLASS,
  CHAPTER_EDITOR_RAIL_BTN_ACTIVE,
  CHAPTER_EDITOR_RAIL_BTN_BASE,
  CHAPTER_EDITOR_RAIL_BTN_DISABLED,
  CHAPTER_EDITOR_RAIL_BTN_IDLE,
} from "@/components/chapter/chapterCanvasToolbar";

type ValidatedCase = {
  panel_number: number;
  block_number?: number;
  description?: string;
  text_excerpt?: string;
  caseNumber: number;
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  character: "Personnage",
  background: "Décor",
  object: "Objet",
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  character: "hsl(var(--lavender) / 0.25)",
  background: "hsl(220 80% 60% / 0.15)",
  object: "hsl(38 90% 55% / 0.15)",
};

const ASSET_TYPE_BORDER: Record<string, string> = {
  character: "hsl(var(--lavender) / 0.5)",
  background: "hsl(220 80% 60% / 0.4)",
  object: "hsl(38 90% 55% / 0.4)",
};

const ASSET_TYPE_TRIGGER_CLASS: Record<string, string> = {
  character: "text-violet-500 dark:text-violet-400",
  background: "text-blue-500 dark:text-blue-400",
  object: "text-amber-500 dark:text-amber-400",
};

function getAssetThumbnail(asset: Asset): string | null {
  if (asset.asset_type === "character") {
    return asset.image_url ?? asset.image_url_profile_left ?? asset.image_url_profile_right ?? null;
  }
  return asset.image_url ?? null;
}

interface EditorRightPanelProps {
  activeTool: "chapter-text" | "assets" | "cases" | null;
  onToolChange: (tool: "chapter-text" | "assets" | "cases" | null) => void;
  loadingScenario: boolean;
  scenarioContent: string | null | undefined;
  assets: Asset[];
  validatedCases: ValidatedCase[];
  existingBlockPrompts: string[];
  isUpdating: boolean;
  isPro: boolean;
  /** Ref partagée pour le ghost de drag (même que la sidebar gauche) */
  newBlockDragGhostRef?: React.RefObject<HTMLDivElement | null>;
  onNavigateToPlans: () => void;
  /** Composition IA du canvas depuis le découpage scénario */
  onCompose?: () => void;
  isComposing?: boolean;
  hasOutlineToCompose?: boolean;
  /** Recompose : canvas déjà composé — le bouton devient "Recomposer" */
  hasExistingComposition?: boolean;
  /** Accepter / Refuser après une recomposition */
  showRecomposeActions?: boolean;
  onAcceptRecompose?: () => void;
  onRefuseRecompose?: () => void;
  isRefusingRecompose?: boolean;
  /** Génération en batch de toutes les cases du canvas */
  onGenerateAll?: () => void;
  isGeneratingAll?: boolean;
  generateAllProgress?: { current: number; total: number } | null;
  blocksToGenerateCount?: number;
  /** Préférences éditeur (typo, etc.) */
  settings: EditorSettings;
  onUpdateSettings: (updates: Partial<EditorSettings>) => void;
}

export function EditorRightPanel({
  activeTool,
  onToolChange,
  loadingScenario,
  scenarioContent,
  assets,
  validatedCases,
  existingBlockPrompts,
  isUpdating: _isUpdating,
  isPro,
  newBlockDragGhostRef,
  onNavigateToPlans,
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
  settings,
  onUpdateSettings,
}: EditorRightPanelProps) {
  const [draggingCaseNumber, setDraggingCaseNumber] = useState<number | null>(null);
  const [openAssetGroups, setOpenAssetGroups] = useState<Record<string, boolean>>({
    character: true,
    background: true,
    object: true,
  });

  // Nombre de cases pas encore sur le canvas
  const unaddedCount = validatedCases.filter(
    (c) => c.description?.trim() && !existingBlockPrompts.some((p) => p.trim() === c.description?.trim())
  ).length;

  const assetsByType = useMemo(() => {
    const groups: Record<string, Asset[]> = { character: [], background: [], object: [] };
    for (const a of assets) {
      const t = a.asset_type in groups ? a.asset_type : "object";
      groups[t].push(a);
    }
    return groups;
  }, [assets]);

  return (
    <>
      {/* Droite : panel contenu en overlay absolu — ne pousse pas le canvas */}
      <aside
        className={cn(
          "absolute top-0 bottom-0 flex flex-col border-l border-border bg-background z-20 transition-[width] duration-200 ease-in-out overflow-hidden",
          CHAPTER_EDITOR_RAIL_PANEL_RIGHT_CLASS,
          activeTool ? "w-[min(340px,calc(100vw-9rem))] sm:w-[340px]" : "w-0 pointer-events-none border-l-0",
        )}
      >
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
                <ScenarioFormattedPreview text={scenarioContent} className="text-sm" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-2">Aucun chapitre scénario lié.</p>
            )}
          </div>
        )}

        {activeTool === "assets" && (
          <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assets du projet</span>
            {assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <Package className="h-9 w-9 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground leading-relaxed px-2">Aucun asset dans ce projet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(["character", "background", "object"] as const).map((type) => {
                  const group = assetsByType[type];
                  if (!group || group.length === 0) return null;
                  const label = ASSET_TYPE_LABELS[type] ?? type;
                  const triggerClass = ASSET_TYPE_TRIGGER_CLASS[type] ?? "text-muted-foreground";
                  const isOpen = openAssetGroups[type] ?? true;
                  return (
                    <Collapsible
                      key={type}
                      open={isOpen}
                      onOpenChange={(v) => setOpenAssetGroups((prev) => ({ ...prev, [type]: v }))}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-0.5 hover:opacity-80 transition-opacity">
                        <span className={cn("text-xs font-bold uppercase tracking-wider", triggerClass)}>
                          {label}{group.length > 1 ? "s" : ""} ({group.length})
                        </span>
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", triggerClass, isOpen ? "rotate-0" : "-rotate-90")} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1">
                        <div className="flex flex-col gap-2">
                          {group.map((asset) => {
                            const thumb = getAssetThumbnail(asset);
                            const bg = ASSET_TYPE_COLORS[type] ?? "hsl(var(--muted)/0.3)";
                            const border = ASSET_TYPE_BORDER[type] ?? "hsl(var(--border))";
                            return (
                              <div
                                key={asset.id}
                                className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/35"
                                style={{ borderColor: border, backgroundColor: bg }}
                              >
                                <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted/50 border border-border/40 flex items-center justify-center">
                                  {thumb ? (
                                    <img src={thumb} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
                                  ) : (
                                    <Package className="h-6 w-6 text-muted-foreground/30" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 py-0.5">
                                  <p className="text-sm font-semibold text-foreground truncate leading-snug">{asset.name}</p>
                                  {asset.prompt && (
                                    <p className="text-xs text-muted-foreground leading-snug line-clamp-3 mt-1">{asset.prompt.slice(0, 100)}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTool === "cases" && (
          <div className="p-4 space-y-3 flex-1 min-h-0 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cases du scénario
              </span>
              {validatedCases.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-1.5 shadow-sm dark:bg-emerald-500/15">
                  <span className="text-xl font-bold tabular-nums leading-none text-emerald-900 dark:text-emerald-50">
                    {validatedCases.length}
                  </span>
                  <span className="text-xs font-medium leading-tight text-emerald-800 dark:text-emerald-200">
                    case{validatedCases.length > 1 ? "s" : ""} validée{validatedCases.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

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
                className={cn(
                  "w-full gap-2 shrink-0",
                  hasExistingComposition
                    ? "border border-primary/30 bg-transparent text-primary hover:bg-primary/5"
                    : "gradient-primary text-white"
                )}
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
            {blocksToGenerateCount > 0 && onGenerateAll && (
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

                        // Ghost partagé avec la sidebar gauche
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
        )}
      </aside>

      {/* Barre d'icônes droite */}
      <aside
        className={cn(
          "relative border-l border-border bg-muted/20 px-1.5 py-2 sm:py-2.5 flex flex-col items-stretch gap-1.5 z-30 overflow-visible",
          CHAPTER_EDITOR_RAIL_ASIDE_CLASS,
        )}
      >
        <button
          type="button"
          onClick={() => onToolChange(activeTool === "chapter-text" ? null : "chapter-text")}
          className={cn(
            CHAPTER_EDITOR_RAIL_BTN_BASE,
            activeTool === "chapter-text" ? CHAPTER_EDITOR_RAIL_BTN_ACTIVE : CHAPTER_EDITOR_RAIL_BTN_IDLE,
          )}
          title="Scénario"
        >
          <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={() => onToolChange(activeTool === "assets" ? null : "assets")}
          className={cn(
            "relative",
            CHAPTER_EDITOR_RAIL_BTN_BASE,
            activeTool === "assets" ? CHAPTER_EDITOR_RAIL_BTN_ACTIVE : CHAPTER_EDITOR_RAIL_BTN_IDLE,
          )}
          title="Assets du projet"
        >
          <Package className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" strokeWidth={1.75} />
          {assets.length > 0 && (
            <span className={cn(CHAPTER_EDITOR_RAIL_COUNT_BADGE_CLASS, assets.length > 99 && "min-w-7 px-1")}>
              {assets.length > 99 ? "99+" : assets.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={isPro ? () => onToolChange(activeTool === "cases" ? null : "cases") : onNavigateToPlans}
          className={cn(
            "relative",
            CHAPTER_EDITOR_RAIL_BTN_BASE,
            isPro
              ? activeTool === "cases"
                ? CHAPTER_EDITOR_RAIL_BTN_ACTIVE
                : CHAPTER_EDITOR_RAIL_BTN_IDLE
              : CHAPTER_EDITOR_RAIL_BTN_DISABLED,
          )}
          title={
            isPro
              ? unaddedCount > 0
                ? `${unaddedCount} case${unaddedCount > 1 ? "s" : ""} à ajouter au canvas · ${validatedCases.length} validée${validatedCases.length > 1 ? "s" : ""} au total`
                : `Cases · ${validatedCases.length} validée${validatedCases.length > 1 ? "s" : ""}`
              : `Réservé au plan ${planDisplayName("createur")} — cliquez pour vous abonner`
          }
        >
          <Layers className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" strokeWidth={1.75} />

          {/* Badge : nombre de cases pas encore sur le canvas */}
          {isPro && unaddedCount > 0 && (
            <span
              className={cn(
                CHAPTER_EDITOR_RAIL_COUNT_BADGE_CLASS,
                unaddedCount > 99 && "min-w-7 px-1",
              )}
            >
              {unaddedCount > 99 ? "99+" : unaddedCount}
            </span>
          )}

          {/* Badge PRO pour les non-pro */}
          {!isPro && (
            <span className="absolute -top-0.5 -right-0.5 bg-amber-400/30 text-amber-600 dark:text-amber-400 border border-amber-400/40 text-[7px] font-bold rounded px-0.5 tracking-wide leading-tight">
              PRO
            </span>
          )}
        </button>

        {/* Paramètres éditeur — en bas du rail */}
        <div className="mt-auto">
          <EditorSettingsPopover settings={settings} onUpdateSettings={onUpdateSettings} />
        </div>

      </aside>
    </>
  );
}
