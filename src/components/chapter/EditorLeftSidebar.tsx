import React, { useState, useMemo } from "react";
import { LayoutPanelTop, Palette, MessageCircle, X, Download, History, LayoutList, Layers, Zap } from "lucide-react";
import { CaseLayers } from "@/components/chapter/CaseLayers";
import { ScenarioCasesPanel, type ValidatedCase } from "@/components/chapter/ScenarioCasesPanel";
import { getPanelBlocks, getPanelColorBlocks, getPanelSpeechBubbles, getPanelSfxBlocks, getPanelSystemBlocks } from "@/services/panels";
import type { ChapterCanvasImageHistoryRow } from "@/services/chapterCanvasImageHistory";
import { ChapterImageHistoryList } from "@/components/chapter/ChapterImageHistoryList";
import { BubblePreview } from "@/components/chapter/SpeechBubbleShape";
import { BLOCK_PRESETS, WEBTOON_CASE_PRESETS, NARRATIVE_COLOR_PRESETS, SFX_PRESETS, BREATHING_PRESETS } from "@/services/panels";
import { buildSfxTextShadow, hexToRgba } from "@/components/chapter/sfxSystemStyle";
import { SPEECH_BUBBLE_TYPE_LABELS, SYSTEM_BLOCK_VARIANT_CONFIG } from "@/types";
import type { Panel, ColorBlockFill, SpeechBubbleType, PanelBlockShape, SystemBlockVariant } from "@/types";
import { cn } from "@/lib/utils";
import {
  CHAPTER_EDITOR_RAIL_ASIDE_CLASS,
  CHAPTER_EDITOR_RAIL_COUNT_BADGE_CLASS,
  CHAPTER_EDITOR_RAIL_BTN_ACTIVE,
  CHAPTER_EDITOR_RAIL_BTN_BASE,
  CHAPTER_EDITOR_RAIL_BTN_IDLE,
} from "@/components/chapter/chapterCanvasToolbar";

const DIAGONAL_BLOCK_PRESETS: Array<{
  label: string;
  description: string;
  shape: PanelBlockShape;
  width: number;
  height: number;
  clipPath: string;
}> = [
  { label: "Biseau haut",   description: "Panel haut — compo N",       shape: "taper-r",    width: 800, height: 900, clipPath: "polygon(0 0, 100% 0, 100% 65%, 0 100%)" },
  { label: "Biseau bas",    description: "Panel bas — compo N",        shape: "taper-l",    width: 800, height: 900, clipPath: "polygon(0 35%, 100% 0, 100% 100%, 0 100%)" },
  { label: "Diag. gauche",  description: "Panel gauche — compo I",     shape: "diagonal-r", width: 380, height: 900, clipPath: "polygon(0 0, 100% 0, 87% 100%, 0 100%)" },
  { label: "Diag. droite",  description: "Panel droite — compo I",     shape: "diagonal-l", width: 420, height: 900, clipPath: "polygon(13% 0, 100% 0, 100% 100%, 0 100%)" },
];

const COLOR_PRESETS_SIDEBAR = [
  { label: "Blanc",  color: "#ffffff" },
  { label: "Noir",   color: "#000000" },
  { label: "Rouge",  color: "#ef4444" },
  { label: "Bleu",   color: "#3b82f6" },
  { label: "Vert",   color: "#22c55e" },
  { label: "Jaune",  color: "#fbbf24" },
] as const;

export type SidebarTab = "cases-scenario" | "blocs" | "couleurs" | "dialogue" | "sfx" | "historique" | "calques";

/** Bibliothèque (Cases du scénario, Cases, Couleurs, Dialogue, SFX & Système, Calques) — chrome flyout lisible comme Couleurs ; historique gardé compact. */
function isLibraryContentSidebarTab(
  tab: SidebarTab | null,
): tab is Exclude<SidebarTab, "historique"> {
  return tab === "cases-scenario" || tab === "blocs" || tab === "couleurs" || tab === "dialogue" || tab === "sfx" || tab === "calques";
}

interface EditorLeftSidebarProps {
  panel: Panel;
  activeSidebarTab: SidebarTab | null;
  onTabChange: (tab: SidebarTab | null) => void;
  onScrollToY?: (logicalY: number) => void;
  isUpdating: boolean;
  newBlockDragGhostRef: React.RefObject<HTMLDivElement | null>;
  onSliceOpen: () => void;
  imageHistoryEntries: ChapterCanvasImageHistoryRow[];
  imageHistoryLoading?: boolean;
  restoringHistoryId: string | null;
  imageHistoryRestoredIds: ReadonlySet<string>;
  onRestoreImageHistory: (entry: ChapterCanvasImageHistoryRow) => void | Promise<void>;
  onAddBlock: (x?: number, y?: number, width?: number, height?: number, shape?: PanelBlockShape) => void;
  /** Si x/y sont omis ou `undefined`, le parent positionne sous le centre visible du canvas. */
  onAddColorBlock: (x: number | undefined, y: number | undefined, width: number, height: number, fill?: ColorBlockFill) => void;
  onAddSpeechBubble: (type: SpeechBubbleType, x?: number, y?: number) => void;
  onAddSfxBlock: (presetId?: string, x?: number, y?: number) => void;
  onAddSystemBlock: (variant: SystemBlockVariant, x?: number, y?: number) => void;
  onAddPageBackground: (color: string, y?: number) => void;
  onInsertBreathing: (gap: number, y?: number) => void;
  selectedBlockId: { panelId: string; blockId: string } | null;
  selectedColorBlockId: { panelId: string; colorBlockId: string } | null;
  selectedSpeechBubbleId: { panelId: string; bubbleId: string } | null;
  selectedSfxId: { panelId: string; sfxId: string } | null;
  selectedSystemBlockId: { panelId: string; systemBlockId: string } | null;
  onSelectBlock: (v: { panelId: string; blockId: string } | null) => void;
  onSelectColorBlock: (v: { panelId: string; colorBlockId: string } | null) => void;
  onSelectSpeechBubble: (v: { panelId: string; bubbleId: string } | null) => void;
  onSelectSfx: (v: { panelId: string; sfxId: string } | null) => void;
  onSelectSystemBlock: (v: { panelId: string; systemBlockId: string } | null) => void;
  // ── Cases du scénario (onglet en haut du rail) ──
  scenarioContent: string | null | undefined;
  loadingScenario: boolean;
  validatedCases: ValidatedCase[];
  existingBlockPrompts: string[];
  canUseCases: boolean;
  onNavigateToPlans: () => void;
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

export function EditorLeftSidebar({
  panel,
  activeSidebarTab,
  onTabChange,
  onScrollToY,
  isUpdating: _isUpdating,
  newBlockDragGhostRef,
  onSliceOpen,
  imageHistoryEntries,
  imageHistoryLoading,
  restoringHistoryId,
  imageHistoryRestoredIds,
  onRestoreImageHistory,
  onAddBlock,
  onAddColorBlock,
  onAddSpeechBubble,
  onAddSfxBlock,
  onAddSystemBlock,
  onAddPageBackground,
  onInsertBreathing,
  selectedBlockId,
  selectedColorBlockId,
  selectedSpeechBubbleId,
  selectedSfxId,
  selectedSystemBlockId,
  onSelectBlock,
  onSelectColorBlock,
  onSelectSpeechBubble,
  onSelectSfx,
  onSelectSystemBlock,
  scenarioContent,
  loadingScenario,
  validatedCases,
  existingBlockPrompts,
  canUseCases,
  onNavigateToPlans,
  onCompose,
  isComposing,
  hasOutlineToCompose,
  hasExistingComposition,
  showRecomposeActions,
  onAcceptRecompose,
  onRefuseRecompose,
  isRefusingRecompose,
  onGenerateAll,
  isGeneratingAll,
  generateAllProgress,
  blocksToGenerateCount,
}: EditorLeftSidebarProps) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const totalElements = useMemo(
    () =>
      getPanelBlocks(panel).length +
      getPanelColorBlocks(panel).length +
      getPanelSpeechBubbles(panel).length +
      getPanelSfxBlocks(panel).length +
      getPanelSystemBlocks(panel).length,
    [panel],
  );

  // Cases du découpage pas encore posées sur le canvas (badge du bouton).
  // Pas de useMemo : validatedCases et existingBlockPrompts sont réalloués à
  // chaque rendu par le parent, donc la mémoïsation ne cacherait jamais.
  const unaddedCasesCount = validatedCases.filter(
    (c) =>
      c.description?.trim() &&
      !existingBlockPrompts.some((p) => p.trim() === c.description?.trim()),
  ).length;

  return (
    <aside
      className={cn(
        "relative border-r border-border bg-background z-30 h-full min-h-0 self-stretch flex flex-col",
        CHAPTER_EDITOR_RAIL_ASIDE_CLASS,
      )}
    >
      {/* Onglets — en haut uniquement */}
      <div className="w-full flex flex-col items-stretch gap-1.5 px-1.5 pt-2 pb-2 sm:pt-2.5 sm:pb-2.5 shrink-0">
        {/* Cases du scénario — tout en haut du rail */}
        <button
          type="button"
          title={
            canUseCases
              ? unaddedCasesCount > 0
                ? `${unaddedCasesCount} case${unaddedCasesCount > 1 ? "s" : ""} à ajouter au canvas · ${validatedCases.length} validée${validatedCases.length > 1 ? "s" : ""} au total`
                : `Cases du scénario · ${validatedCases.length} validée${validatedCases.length > 1 ? "s" : ""}`
              : "Réservé au plan Créateur : cliquez pour vous abonner"
          }
          aria-pressed={activeSidebarTab === "cases-scenario"}
          onClick={() =>
            canUseCases
              ? onTabChange(activeSidebarTab === "cases-scenario" ? null : "cases-scenario")
              : onNavigateToPlans()
          }
          className={cn(
            "relative",
            CHAPTER_EDITOR_RAIL_BTN_BASE,
            activeSidebarTab === "cases-scenario"
              ? CHAPTER_EDITOR_RAIL_BTN_ACTIVE
              : CHAPTER_EDITOR_RAIL_BTN_IDLE,
          )}
        >
          <Layers className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" strokeWidth={1.75} />
          {canUseCases && unaddedCasesCount > 0 && (
            <span
              className={cn(
                CHAPTER_EDITOR_RAIL_COUNT_BADGE_CLASS,
                unaddedCasesCount > 99 && "min-w-7 px-1",
              )}
            >
              {unaddedCasesCount > 99 ? "99+" : unaddedCasesCount}
            </span>
          )}
          {!canUseCases && (
            <span className="absolute -top-0.5 -right-0.5 bg-amber-400/30 text-amber-600 dark:text-amber-400 border border-amber-400/40 text-[7px] font-bold rounded px-0.5 tracking-wide leading-tight">
              PRO
            </span>
          )}
        </button>

        {([
          { id: "blocs" as const, icon: LayoutPanelTop, label: "Cases" },
          { id: "couleurs" as const, icon: Palette, label: "Couleurs" },
          { id: "dialogue" as const, icon: MessageCircle, label: "Dialogue" },
          { id: "sfx" as const, icon: Zap, label: "SFX & Système" },
          {
            id: "calques" as const,
            icon: LayoutList,
            label: "Calques",
            badge: totalElements > 0 ? totalElements : undefined,
          },
        ] as const).map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => onTabChange(activeSidebarTab === id ? null : id)}
            className={cn(
              "relative",
              CHAPTER_EDITOR_RAIL_BTN_BASE,
              activeSidebarTab === id ? CHAPTER_EDITOR_RAIL_BTN_ACTIVE : CHAPTER_EDITOR_RAIL_BTN_IDLE,
            )}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" strokeWidth={1.75} />
            {badge !== undefined && (
              <span
                className={cn(
                  CHAPTER_EDITOR_RAIL_COUNT_BADGE_CLASS,
                  badge > 99 && "min-w-7 px-1",
                )}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Espace libre jusqu'au bas de la fenêtre */}
      <div className="flex-1 min-h-0" aria-hidden />

      {/* Historique (même pattern flyout que Cases / Dialogue) */}
      <div className="shrink-0 px-1.5 pt-1">
        <button
          type="button"
          title="Historique"
          aria-label="Historique"
          aria-pressed={activeSidebarTab === "historique"}
          onClick={() => onTabChange(activeSidebarTab === "historique" ? null : "historique")}
          className={cn(
            CHAPTER_EDITOR_RAIL_BTN_BASE,
            activeSidebarTab === "historique" ? CHAPTER_EDITOR_RAIL_BTN_ACTIVE : CHAPTER_EDITOR_RAIL_BTN_IDLE,
          )}
        >
          <History className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" strokeWidth={1.75} />
        </button>
      </div>

      {/* Téléchargement — pied du rail */}
      <div className="shrink-0 px-1.5 pb-2 pt-1 sm:pb-2.5 bg-background">
        <button
          type="button"
          title="Découper & télécharger"
          onClick={onSliceOpen}
          className={cn(CHAPTER_EDITOR_RAIL_BTN_BASE, CHAPTER_EDITOR_RAIL_BTN_IDLE)}
        >
          <Download className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" strokeWidth={1.75} />
        </button>
      </div>

      {/* Flyout bibliothèque / historique — même comportement */}
      <div
        className={cn(
          "absolute top-0 left-full h-full flex flex-col bg-background border-r border-border shadow-xl overflow-hidden transition-[width] duration-200 ease-in-out",
          activeSidebarTab ? "w-[340px]" : "w-0 pointer-events-none border-r-0",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between border-b border-border/50 shrink-0 gap-2",
            isLibraryContentSidebarTab(activeSidebarTab)
              ? "px-4 py-3 min-h-[3rem]"
              : "px-3 py-2 min-h-[2.5rem]",
          )}
        >
          <span
            className={cn(
              "font-semibold text-foreground inline-flex flex-wrap items-center min-w-0 text-left gap-2",
              isLibraryContentSidebarTab(activeSidebarTab)
                ? "text-sm"
                : "text-xs gap-1.5 leading-none",
            )}
          >
            {activeSidebarTab === "blocs" && (
              <>
                Cases{" "}
                <kbd className="text-[10px] font-mono bg-muted text-muted-foreground border border-border px-1.5 py-px rounded-md leading-none">B</kbd>
              </>
            )}
            {activeSidebarTab === "couleurs" && (
              <>
                Couleurs{" "}
                <kbd className="text-[10px] font-mono bg-muted text-muted-foreground border border-border px-1.5 py-px rounded-md leading-none">C</kbd>
              </>
            )}
            {activeSidebarTab === "dialogue" && (
              <>
                Dialogue{" "}
                <kbd className="text-[10px] font-mono bg-muted text-muted-foreground border border-border px-1.5 py-px rounded-md leading-none">D</kbd>
              </>
            )}
            {activeSidebarTab === "sfx" && <>SFX & Système</>}
            {activeSidebarTab === "cases-scenario" && <>Cases du scénario</>}
            {activeSidebarTab === "calques" && <>Calques</>}
            {activeSidebarTab === "historique" && <>Historique</>}
          </span>
          <button
            type="button"
            onClick={() => onTabChange(null)}
            className={cn(
              "rounded-md flex shrink-0 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
              isLibraryContentSidebarTab(activeSidebarTab) ? "h-8 w-8" : "h-6 w-6 rounded",
            )}
            aria-label="Fermer"
          >
            <X className={isLibraryContentSidebarTab(activeSidebarTab) ? "h-4 w-4" : "h-3.5 w-3.5"} />
          </button>
        </div>
        <div
          className={cn(
            "flex-1 overflow-y-auto min-h-0",
            isLibraryContentSidebarTab(activeSidebarTab) ? "p-5 space-y-4" : "p-4 space-y-3",
          )}
        >
          {activeSidebarTab === "cases-scenario" && (
            <ScenarioCasesPanel
              scenarioContent={scenarioContent}
              loadingScenario={loadingScenario}
              validatedCases={validatedCases}
              existingBlockPrompts={existingBlockPrompts}
              newBlockDragGhostRef={newBlockDragGhostRef}
              onCompose={onCompose}
              isComposing={isComposing}
              hasOutlineToCompose={hasOutlineToCompose}
              hasExistingComposition={hasExistingComposition}
              showRecomposeActions={showRecomposeActions}
              onAcceptRecompose={onAcceptRecompose}
              onRefuseRecompose={onRefuseRecompose}
              isRefusingRecompose={isRefusingRecompose}
              onGenerateAll={onGenerateAll}
              isGeneratingAll={isGeneratingAll}
              generateAllProgress={generateAllProgress}
              blocksToGenerateCount={blocksToGenerateCount}
            />
          )}
          {activeSidebarTab === "calques" && (
            <CaseLayers
              panel={panel}
              selectedBlockId={selectedBlockId}
              selectedColorBlockId={selectedColorBlockId}
              selectedSpeechBubbleId={selectedSpeechBubbleId}
              selectedSfxId={selectedSfxId}
              selectedSystemBlockId={selectedSystemBlockId}
              onSelectBlock={onSelectBlock}
              onSelectColorBlock={onSelectColorBlock}
              onSelectSpeechBubble={onSelectSpeechBubble}
              onSelectSfx={onSelectSfx}
              onSelectSystemBlock={onSelectSystemBlock}
              onScrollToY={onScrollToY}
            />
          )}
          {activeSidebarTab === "sfx" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground leading-snug">
                Clic : sous la zone visible ; glisser : position au dépôt. Onomatopées et fenêtres RPG, posables sur les cases comme sur le fond de page.
              </p>

              {/* Onomatopées */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Onomatopées (SFX)</p>
                <div className="grid grid-cols-2 gap-3">
                  {SFX_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        setDraggingKey(`sfx-${preset.id}`);
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "sfx-block", presetId: preset.id }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onDragEnd={() => setDraggingKey(null)}
                      onClick={() => onAddSfxBlock(preset.id)}
                      className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-card transition-all duration-150 flex flex-col items-center gap-1.5 px-2 pb-2.5 pt-3 overflow-hidden hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50 ${draggingKey === `sfx-${preset.id}` ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                    >
                      <div className="h-12 flex items-center justify-center overflow-visible rounded-lg w-full bg-muted/60">
                        <span
                          style={{
                            fontFamily: preset.fontFamily,
                            fontSize: 22,
                            color: preset.color,
                            textShadow: buildSfxTextShadow({ strokeColor: preset.strokeColor, strokeWidth: Math.min(3, preset.strokeWidth), glowColor: preset.glowColor, glowBlur: preset.glowBlur ? Math.min(8, preset.glowBlur) : undefined }),
                            transform: `rotate(${preset.rotation}deg)`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {preset.text}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground text-center leading-tight">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fenêtres système */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fenêtres système (RPG)</p>
                <div className="flex flex-col gap-2.5">
                  {(Object.entries(SYSTEM_BLOCK_VARIANT_CONFIG) as [SystemBlockVariant, { label: string; accent: string; defaultTitle: string }][]).map(([variant, cfg]) => (
                    <button
                      key={variant}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        setDraggingKey(`system-${variant}`);
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "system-block", variant }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onDragEnd={() => setDraggingKey(null)}
                      onClick={() => onAddSystemBlock(variant)}
                      className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-card px-4 py-3 transition-all duration-150 flex items-center gap-3.5 select-none hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50 ${draggingKey === `system-${variant}` ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                    >
                      <div
                        className="shrink-0 rounded-md flex items-center justify-center"
                        style={{
                          width: 72,
                          height: 40,
                          background: "linear-gradient(180deg, rgba(9,12,24,0.96), rgba(15,19,38,0.96))",
                          border: `1.5px solid ${cfg.accent}`,
                          boxShadow: `0 0 10px ${hexToRgba(cfg.accent, 0.45)}`,
                        }}
                      >
                        <span style={{ color: cfg.accent, fontFamily: "'Roboto Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: 1 }}>
                          {cfg.defaultTitle}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0 gap-0.5 text-left">
                        <span className="text-sm font-semibold text-foreground leading-snug">{cfg.label}</span>
                        <span className="text-xs text-muted-foreground leading-snug">Texte net éditable, sans IA</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeSidebarTab === "historique" && (
            <ChapterImageHistoryList
              entries={imageHistoryEntries}
              isLoading={imageHistoryLoading}
              restoringId={restoringHistoryId}
              restoredIds={imageHistoryRestoredIds}
              onRestore={onRestoreImageHistory}
            />
          )}
          {activeSidebarTab === "blocs" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground leading-snug">
                Clic : sous la zone visible du canvas ; glisser : position précise au dépôt.
              </p>

              {/* Blocs rectangulaires */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rectangulaires</p>
                <div className="flex flex-col gap-2.5">
                  {BLOCK_PRESETS.map((preset) => {
                    const MAX_W = 72,
                      MAX_H = 56;
                    const scale = Math.min(MAX_W / preset.width, MAX_H / preset.height);
                    const thumbW = Math.round(preset.width * scale);
                    const thumbH = Math.round(preset.height * scale);
                    const orientation = preset.width > preset.height ? "Paysage" : preset.width < preset.height ? "Portrait" : "Carré";
                    return (
                      <div
                        key={preset.label}
                        draggable
                        onDragStart={(e) => {
                          setDraggingKey(preset.label);
                          e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-block", width: preset.width, height: preset.height }));
                          e.dataTransfer.effectAllowed = "copy";
                          const ghost = newBlockDragGhostRef.current;
                          if (ghost) {
                            const MAX = 104;
                            const s = Math.min(MAX / preset.width, MAX / preset.height);
                            const gw = Math.max(56, Math.round(preset.width * s));
                            const gh = Math.max(40, Math.round(preset.height * s));
                            ghost.style.width = `${gw}px`;
                            ghost.style.height = `${gh}px`;
                            ghost.textContent = `${preset.width}×${preset.height}`;
                            e.dataTransfer.setDragImage(ghost, gw / 2, gh / 2);
                          }
                        }}
                        onDragEnd={() => setDraggingKey(null)}
                        onClick={() => onAddBlock(undefined, undefined, preset.width, preset.height)}
                        className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-card px-4 py-3 transition-all duration-150 flex items-center gap-3.5 select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border ${draggingKey === preset.label ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                      >
                        <div className="shrink-0 flex items-center justify-center" style={{ width: MAX_W, height: MAX_H }}>
                          <div
                            className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center"
                            style={{ width: thumbW, height: thumbH }}
                          >
                            <LayoutPanelTop className="opacity-25 shrink-0" style={{ width: Math.max(12, Math.min(18, thumbW * 0.28)), height: Math.max(12, Math.min(18, thumbW * 0.28)) }} />
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0 gap-1">
                          <span className="text-sm font-semibold text-foreground leading-snug">{preset.label}</span>
                          <span className="text-xs text-muted-foreground leading-snug">{orientation}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hauteurs webtoon — grille 400px, pleine largeur */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cases webtoon (pleine largeur)</p>
                <div className="flex flex-col gap-2.5">
                  {WEBTOON_CASE_PRESETS.map((preset) => {
                    const MAX_W = 72;
                    const thumbH = Math.max(8, Math.round((preset.height / 1600) * 56));
                    return (
                      <div
                        key={preset.label}
                        draggable
                        onDragStart={(e) => {
                          setDraggingKey(preset.label);
                          e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-block", width: preset.width, height: preset.height }));
                          e.dataTransfer.effectAllowed = "copy";
                          const ghost = newBlockDragGhostRef.current;
                          if (ghost) {
                            ghost.style.width = "104px";
                            ghost.style.height = `${Math.max(24, Math.round((preset.height / 1600) * 104))}px`;
                            ghost.textContent = `${preset.width}×${preset.height}`;
                            e.dataTransfer.setDragImage(ghost, 52, 20);
                          }
                        }}
                        onDragEnd={() => setDraggingKey(null)}
                        onClick={() => onAddBlock(undefined, undefined, preset.width, preset.height)}
                        className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-card px-4 py-3 transition-all duration-150 flex items-center gap-3.5 select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border ${draggingKey === preset.label ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                      >
                        <div className="shrink-0 flex items-center justify-center" style={{ width: MAX_W, height: 56 }}>
                          <div
                            className="rounded-sm border-2 border-dashed border-muted-foreground/25 bg-muted/50 w-full"
                            style={{ height: thumbH }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0 gap-1">
                          <span className="text-sm font-semibold text-foreground leading-snug">{preset.label}</span>
                          <span className="text-xs text-muted-foreground leading-snug">{preset.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Respirations — le vide vertical encode le temps narratif */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Respirations (rythme)</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Insère un espace vertical : tout ce qui suit est décalé vers le bas. Le vide avant une révélation, c'est le suspense.
                </p>
                <div className="flex flex-col gap-2.5">
                  {BREATHING_PRESETS.map((preset) => {
                    const key = `breath-${preset.gap}`;
                    const thumbH = Math.max(6, Math.round((preset.gap / 700) * 40));
                    return (
                      <div
                        key={key}
                        draggable
                        onDragStart={(e) => {
                          setDraggingKey(key);
                          e.dataTransfer.setData("application/json", JSON.stringify({ type: "breathing", gap: preset.gap }));
                          e.dataTransfer.effectAllowed = "copy";
                          const ghost = newBlockDragGhostRef.current;
                          if (ghost) {
                            ghost.style.width = "104px";
                            ghost.style.height = "28px";
                            ghost.textContent = `↕ ${preset.gap}px`;
                            e.dataTransfer.setDragImage(ghost, 52, 14);
                          }
                        }}
                        onDragEnd={() => setDraggingKey(null)}
                        onClick={() => onInsertBreathing(preset.gap)}
                        className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-card px-4 py-3 transition-all duration-150 flex items-center gap-3.5 select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border ${draggingKey === key ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                      >
                        <div className="shrink-0 flex flex-col items-center justify-center gap-0.5" style={{ width: 72, height: 56 }}>
                          <div className="w-10 rounded-sm bg-muted-foreground/25" style={{ height: 5 }} />
                          <div className="w-full flex items-center justify-center" style={{ height: thumbH }}>
                            <span className="text-[9px] font-mono text-primary/70 leading-none">↕ {preset.gap}</span>
                          </div>
                          <div className="w-10 rounded-sm bg-muted-foreground/25" style={{ height: 5 }} />
                        </div>
                        <div className="flex flex-col min-w-0 gap-1">
                          <span className="text-sm font-semibold text-foreground leading-snug">{preset.label}</span>
                          <span className="text-xs text-muted-foreground leading-snug">{preset.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Blocs diagonaux */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Formes diagonales</p>
                <div className="flex flex-col gap-2.5">
                  {DIAGONAL_BLOCK_PRESETS.map((preset) => {
                    const key = `shape-${preset.shape}`;
                    const THUMB_W = 52;
                    const THUMB_H = 44;
                    return (
                      <div
                        key={key}
                        draggable
                        onDragStart={(e) => {
                          setDraggingKey(key);
                          e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-block", width: preset.width, height: preset.height, shape: preset.shape }));
                          e.dataTransfer.effectAllowed = "copy";
                          const ghost = newBlockDragGhostRef.current;
                          if (ghost) {
                            ghost.style.width = "72px";
                            ghost.style.height = "56px";
                            ghost.textContent = preset.label;
                            e.dataTransfer.setDragImage(ghost, 36, 28);
                          }
                        }}
                        onDragEnd={() => setDraggingKey(null)}
                        onClick={() => onAddBlock(undefined, undefined, preset.width, preset.height, preset.shape)}
                        className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-card px-4 py-3 transition-all duration-150 flex items-center gap-3.5 select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border ${draggingKey === key ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                      >
                        <div className="shrink-0 flex items-center justify-center" style={{ width: 72, height: 56 }}>
                          <div
                            style={{
                              width: THUMB_W,
                              height: THUMB_H,
                              clipPath: preset.clipPath,
                              background: "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.1))",
                              border: "1.5px solid hsl(var(--primary)/0.35)",
                            }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0 gap-1">
                          <span className="text-sm font-semibold text-foreground leading-snug">{preset.label}</span>
                          <span className="text-xs text-muted-foreground leading-snug">{preset.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {activeSidebarTab === "couleurs" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-snug">
                Clic : sous la zone visible ; glisser : position au dépôt.
              </p>

              {/* Fonds narratifs — pleine largeur, placés SOUS les cases (fond de page) */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fonds de page narratifs</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  La couleur du fond encode la scène : pleine largeur, insérée sous toutes les cases.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {NARRATIVE_COLOR_PRESETS.map((preset) => (
                    <div
                      key={preset.label}
                      draggable
                      onDragStart={(e) => {
                        setDraggingKey(`bg-${preset.label}`);
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "page-background", color: preset.color }));
                        e.dataTransfer.effectAllowed = "copy";
                        const ghost = newBlockDragGhostRef.current;
                        if (ghost) {
                          ghost.style.width = "104px";
                          ghost.style.height = "56px";
                          ghost.style.background = preset.color;
                          ghost.style.border = preset.color === "#ffffff" ? "2px solid #cbd5e1" : "none";
                          ghost.textContent = preset.label;
                          ghost.style.color = ["#ffffff", "#e8d9c0"].includes(preset.color) ? "#0f172a" : "#ffffff";
                          e.dataTransfer.setDragImage(ghost, 52, 28);
                        }
                      }}
                      onDragEnd={() => {
                        setDraggingKey(null);
                        const ghost = newBlockDragGhostRef.current;
                        if (ghost) {
                          ghost.style.background = "";
                          ghost.style.border = "";
                          ghost.style.color = "";
                        }
                      }}
                      onClick={() => onAddPageBackground(preset.color)}
                      className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border transition-all duration-150 overflow-hidden select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border ${draggingKey === `bg-${preset.label}` ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                    >
                      <div
                        className="h-10 w-full"
                        style={{ backgroundColor: preset.color, boxShadow: preset.color === "#ffffff" ? "inset 0 0 0 1px #e2e8f0" : undefined }}
                      />
                      <div className="px-3 py-2 bg-card flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground leading-tight">{preset.label}</span>
                        <span className="text-xs text-muted-foreground leading-tight">{preset.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Blocs de couleur</p>
              <div className="grid grid-cols-2 gap-3">
                {COLOR_PRESETS_SIDEBAR.map((preset) => (
                  <div
                    key={preset.color}
                    draggable
                    onDragStart={(e) => {
                      setDraggingKey(preset.color);
                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-color-block", width: 300, height: 300, fill: { type: "solid", color: preset.color } }));
                      e.dataTransfer.effectAllowed = "copy";
                      const ghost = newBlockDragGhostRef.current;
                      if (ghost) {
                        ghost.style.width = "72px";
                        ghost.style.height = "72px";
                        ghost.style.background = preset.color;
                        ghost.style.border = preset.color === "#ffffff" ? "2px solid #cbd5e1" : "none";
                        ghost.textContent = preset.label;
                        ghost.style.color = preset.color === "#ffffff" ? "#0f172a" : "#ffffff";
                        e.dataTransfer.setDragImage(ghost, 36, 36);
                      }
                    }}
                    onDragEnd={() => {
                      setDraggingKey(null);
                      const ghost = newBlockDragGhostRef.current;
                      if (ghost) {
                        ghost.style.background = "";
                        ghost.style.border = "";
                        ghost.style.color = "";
                      }
                    }}
                    onClick={() => {
                      onAddColorBlock(undefined, undefined, 300, 300, { type: "solid", color: preset.color });
                    }}
                    className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border transition-all duration-150 overflow-hidden select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border ${draggingKey === preset.color ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                  >
                    <div
                      className="h-[5.25rem] w-full min-h-[5.25rem]"
                      style={{ backgroundColor: preset.color, boxShadow: preset.color === "#ffffff" ? "inset 0 0 0 1px #e2e8f0" : undefined }}
                    />
                    <div className="px-3 py-2.5 bg-card flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-semibold text-foreground leading-tight">{preset.label}</span>
                      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide shrink-0">
                        {preset.color}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSidebarTab === "dialogue" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-snug">
                Clic ou glisser : placement sous votre vue (ou précis au dépôt sur le canvas)
              </p>
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  setDraggingKey("text");
                  e.dataTransfer.setData("application/json", JSON.stringify({ type: "speech-bubble", bubbleType: "text" }));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onDragEnd={() => setDraggingKey(null)}
                onClick={() => onAddSpeechBubble("text")}
                className={`w-full cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-background transition-all duration-150 flex flex-col items-center gap-2 px-2 pb-3 pt-2 overflow-hidden hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50 hover:bg-muted/40 ${draggingKey === "text" ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
              >
                <BubblePreview type="text" />
                <span className="text-sm font-semibold text-muted-foreground text-center leading-snug px-1">
                  Texte libre / Onomatopée
                </span>
              </button>
              {/* Seuls les types validés dans bubble-proposals.html sont exposés.
                  Ajouter ici au fur et à mesure des validations. */}
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(SPEECH_BUBBLE_TYPE_LABELS) as [SpeechBubbleType, string][]).filter(([type]) => ["speech", "shout", "thought", "narration"].includes(type)).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      setDraggingKey(type);
                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "speech-bubble", bubbleType: type }));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onDragEnd={() => setDraggingKey(null)}
                    onClick={() => onAddSpeechBubble(type)}
                    className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-background transition-all duration-150 flex flex-col items-center gap-2 px-1.5 pb-3 pt-2 overflow-hidden hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50 hover:bg-muted/40 ${draggingKey === type ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                  >
                    <BubblePreview type={type} />
                    <span className="text-sm font-semibold text-muted-foreground text-center leading-tight px-0.5">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


    </aside>
  );
}
