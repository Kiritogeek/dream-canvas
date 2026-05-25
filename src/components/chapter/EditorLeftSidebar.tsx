import React, { useState, useMemo } from "react";
import { LayoutPanelTop, Palette, MessageCircle, X, Download, History, LayoutList } from "lucide-react";
import { CaseLayers } from "@/components/chapter/CaseLayers";
import { getPanelBlocks, getPanelColorBlocks, getPanelSpeechBubbles } from "@/services/panels";
import type { ChapterCanvasImageHistoryRow } from "@/services/chapterCanvasImageHistory";
import { ChapterImageHistoryList } from "@/components/chapter/ChapterImageHistoryList";
import { BubblePreview } from "@/components/chapter/SpeechBubbleShape";
import { BLOCK_PRESETS } from "@/services/panels";
import { SPEECH_BUBBLE_TYPE_LABELS } from "@/types";
import type { Panel, ColorBlockFill, SpeechBubbleType, PanelBlockShape } from "@/types";
import { cn } from "@/lib/utils";
import {
  CHAPTER_EDITOR_RAIL_ASIDE_CLASS,
  CHAPTER_EDITOR_RAIL_COUNT_BADGE_CLASS,
  CHAPTER_EDITOR_RAIL_BTN_ACTIVE,
  CHAPTER_EDITOR_RAIL_BTN_BASE,
  CHAPTER_EDITOR_RAIL_BTN_IDLE,
} from "@/components/chapter/chapterCanvasToolbar";

/** Deux compositions diagonales affichées en paire avec aperçu visuel. */
const DIAGONAL_COMPOSITION_PAIRS = [
  {
    id: "vertical",
    label: "Diagonale Verticale",
    tag: "N",
    description: "Action empilée — panel haut attaque, bas contre",
    topShape:    { label: "Haut",   shape: "taper-r" as PanelBlockShape, width: 800, height: 900, clipPath: "polygon(0 0, 100% 0, 100% 65%, 0 100%)" },
    bottomShape: { label: "Bas",    shape: "taper-l" as PanelBlockShape, width: 800, height: 900, clipPath: "polygon(0 35%, 100% 0, 100% 100%, 0 100%)" },
    orientation: "vertical" as const,
  },
  {
    id: "lateral",
    label: "Diagonale Latérale",
    tag: "I",
    description: "Collision côte à côte — deux forces opposées",
    topShape:    { label: "Gauche", shape: "diagonal-r" as PanelBlockShape, width: 380, height: 900, clipPath: "polygon(0 0, 100% 0, 87% 100%, 0 100%)" },
    bottomShape: { label: "Droite", shape: "diagonal-l" as PanelBlockShape, width: 420, height: 900, clipPath: "polygon(13% 0, 100% 0, 100% 100%, 0 100%)" },
    orientation: "horizontal" as const,
  },
] as const;

const COLOR_PRESETS_SIDEBAR = [
  { label: "Blanc",  color: "#ffffff" },
  { label: "Noir",   color: "#000000" },
  { label: "Rouge",  color: "#ef4444" },
  { label: "Bleu",   color: "#3b82f6" },
  { label: "Vert",   color: "#22c55e" },
  { label: "Jaune",  color: "#fbbf24" },
] as const;

export type SidebarTab = "blocs" | "couleurs" | "dialogue" | "historique" | "calques";

/** Bibliothèque (Cases, Couleurs, Dialogue, Calques) — chrome flyout lisible comme Couleurs ; historique gardé compact. */
function isLibraryContentSidebarTab(
  tab: SidebarTab | null,
): tab is Exclude<SidebarTab, "historique"> {
  return tab === "blocs" || tab === "couleurs" || tab === "dialogue" || tab === "calques";
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
  selectedBlockId: { panelId: string; blockId: string } | null;
  selectedColorBlockId: { panelId: string; colorBlockId: string } | null;
  selectedSpeechBubbleId: { panelId: string; bubbleId: string } | null;
  onSelectBlock: (v: { panelId: string; blockId: string } | null) => void;
  onSelectColorBlock: (v: { panelId: string; colorBlockId: string } | null) => void;
  onSelectSpeechBubble: (v: { panelId: string; bubbleId: string } | null) => void;
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
  selectedBlockId,
  selectedColorBlockId,
  selectedSpeechBubbleId,
  onSelectBlock,
  onSelectColorBlock,
  onSelectSpeechBubble,
}: EditorLeftSidebarProps) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const totalElements = useMemo(
    () =>
      getPanelBlocks(panel).length +
      getPanelColorBlocks(panel).length +
      getPanelSpeechBubbles(panel).length,
    [panel],
  );

  return (
    <aside
      className={cn(
        "relative border-r border-border bg-background z-30 h-full min-h-0 self-stretch flex flex-col",
        CHAPTER_EDITOR_RAIL_ASIDE_CLASS,
      )}
    >
      {/* Onglets — en haut uniquement */}
      <div className="w-full flex flex-col items-stretch gap-1.5 px-1.5 pt-2 pb-2 sm:pt-2.5 sm:pb-2.5 shrink-0">
        {([
          { id: "blocs" as const, icon: LayoutPanelTop, label: "Cases" },
          { id: "couleurs" as const, icon: Palette, label: "Couleurs" },
          { id: "dialogue" as const, icon: MessageCircle, label: "Dialogue" },
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
          {activeSidebarTab === "calques" && (
            <CaseLayers
              panel={panel}
              selectedBlockId={selectedBlockId}
              selectedColorBlockId={selectedColorBlockId}
              selectedSpeechBubbleId={selectedSpeechBubbleId}
              onSelectBlock={onSelectBlock}
              onSelectColorBlock={onSelectColorBlock}
              onSelectSpeechBubble={onSelectSpeechBubble}
              onScrollToY={onScrollToY}
            />
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

              {/* Compositions diagonales — paires */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Formes diagonales</p>
                <div className="flex flex-col gap-3">
                  {DIAGONAL_COMPOSITION_PAIRS.map((pair) => {
                    const isVertical = pair.orientation === "vertical";
                    return (
                      <div
                        key={pair.id}
                        className="rounded-xl border border-border/60 bg-card overflow-hidden"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-foreground leading-none">{pair.label}</span>
                              <span className="text-[10px] font-bold text-primary/70 bg-primary/10 border border-primary/20 px-1 py-px rounded leading-none">{pair.tag}</span>
                            </div>
                            <span className="text-xs text-muted-foreground leading-snug">{pair.description}</span>
                          </div>
                        </div>

                        {/* Aperçu visuel de la paire */}
                        <div className="flex items-center justify-center px-3 py-2">
                          <div
                            className="relative bg-background rounded-lg overflow-hidden border border-border/40"
                            style={{ width: 80, height: isVertical ? 64 : 48 }}
                          >
                            {isVertical ? (
                              <>
                                {/* Panel haut (taper-r) */}
                                <div
                                  className="absolute"
                                  style={{
                                    left: 2, top: 2, width: 76, height: 32,
                                    clipPath: pair.topShape.clipPath,
                                    background: "linear-gradient(135deg, hsl(var(--primary)/0.45), hsl(var(--primary)/0.2))",
                                  }}
                                />
                                {/* Panel bas (taper-l) */}
                                <div
                                  className="absolute"
                                  style={{
                                    left: 2, top: 30, width: 76, height: 32,
                                    clipPath: pair.bottomShape.clipPath,
                                    background: "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--primary)/0.4))",
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                {/* Panel gauche (diagonal-r) */}
                                <div
                                  className="absolute"
                                  style={{
                                    left: 2, top: 2, width: 36, height: 44,
                                    clipPath: pair.topShape.clipPath,
                                    background: "linear-gradient(135deg, hsl(var(--primary)/0.45), hsl(var(--primary)/0.2))",
                                  }}
                                />
                                {/* Panel droit (diagonal-l) */}
                                <div
                                  className="absolute"
                                  style={{
                                    left: 42, top: 2, width: 36, height: 44,
                                    clipPath: pair.bottomShape.clipPath,
                                    background: "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--primary)/0.4))",
                                  }}
                                />
                              </>
                            )}
                          </div>
                        </div>

                        {/* Boutons d'ajout */}
                        <div className="flex gap-2 px-3 pb-3">
                          {[pair.topShape, pair.bottomShape].map((s) => (
                            <button
                              key={s.shape}
                              type="button"
                              draggable
                              onDragStart={(e) => {
                                const key = `shape-${s.shape}`;
                                setDraggingKey(key);
                                e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-block", width: s.width, height: s.height, shape: s.shape }));
                                e.dataTransfer.effectAllowed = "copy";
                                const ghost = newBlockDragGhostRef.current;
                                if (ghost) {
                                  ghost.style.width = "72px";
                                  ghost.style.height = "56px";
                                  ghost.textContent = s.label;
                                  e.dataTransfer.setDragImage(ghost, 36, 28);
                                }
                              }}
                              onDragEnd={() => setDraggingKey(null)}
                              onClick={() => onAddBlock(undefined, undefined, s.width, s.height, s.shape)}
                              className={`flex-1 cursor-grab active:cursor-grabbing active:scale-[0.98] text-xs font-semibold h-7 rounded-lg border transition-all duration-150 select-none hover:bg-primary/10 hover:border-primary/40 hover:text-primary ${draggingKey === `shape-${s.shape}` ? "opacity-50 border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-muted/30 text-muted-foreground"}`}
                            >
                              + {s.label}
                            </button>
                          ))}
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
