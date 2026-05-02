import React, { useState, useMemo } from "react";
import { LayoutPanelTop, Palette, MessageCircle, X, Download, Package, History } from "lucide-react";
import type { ChapterCanvasImageHistoryRow } from "@/services/chapterCanvasImageHistory";
import { ChapterImageHistoryList } from "@/components/chapter/ChapterImageHistoryList";
import { BubblePreview } from "@/components/chapter/SpeechBubbleShape";
import { BLOCK_PRESETS } from "@/services/panels";
import { SPEECH_BUBBLE_TYPE_LABELS } from "@/types";
import { getDetectedAssets } from "@/components/project/ScenarioTextHighlighter";
import type { Panel, ColorBlockFill, SpeechBubbleType, Asset } from "@/types";
import { cn } from "@/lib/utils";
import {
  CHAPTER_EDITOR_RAIL_ASIDE_CLASS,
  CHAPTER_EDITOR_RAIL_COUNT_BADGE_CLASS,
  CHAPTER_EDITOR_RAIL_BTN_ACTIVE,
  CHAPTER_EDITOR_RAIL_BTN_BASE,
  CHAPTER_EDITOR_RAIL_BTN_IDLE,
} from "@/components/chapter/chapterCanvasToolbar";

const COLOR_PRESETS_SIDEBAR = [
  { label: "Blanc",  color: "#ffffff" },
  { label: "Noir",   color: "#000000" },
  { label: "Rouge",  color: "#ef4444" },
  { label: "Bleu",   color: "#3b82f6" },
  { label: "Vert",   color: "#22c55e" },
  { label: "Jaune",  color: "#fbbf24" },
] as const;

export type SidebarTab = "blocs" | "couleurs" | "dialogue" | "assets" | "historique";

/** Bibliothèque (Cases, Couleurs, Dialogue, Assets) — chrome flyout lisible comme Couleurs/Assets ; historique gardé compact. */
function isLibraryContentSidebarTab(
  tab: SidebarTab | null,
): tab is Exclude<SidebarTab, "historique"> {
  return tab === "blocs" || tab === "couleurs" || tab === "dialogue" || tab === "assets";
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  character: "Personnage",
  background: "Décor",
  object: "Objet",
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  character: "hsl(var(--lavender) / 0.25)",
  background: "hsl(var(--mint) / 0.2)",
  object: "hsl(230 55% 88% / 0.25)",
};

const ASSET_TYPE_BORDER: Record<string, string> = {
  character: "hsl(var(--lavender) / 0.5)",
  background: "hsl(var(--mint) / 0.5)",
  object: "hsl(230 50% 55% / 0.4)",
};

function getAssetThumbnail(asset: Asset): string | null {
  if (asset.asset_type === "character") {
    return asset.image_url ?? asset.image_url_profile_left ?? asset.image_url_profile_right ?? null;
  }
  return asset.image_url ?? null;
}

interface EditorLeftSidebarProps {
  panel: Panel;
  activeSidebarTab: SidebarTab | null;
  onTabChange: (tab: SidebarTab | null) => void;
  assets: Asset[];
  scenarioContent?: string | null;
  project: { style_template?: string | null; title?: string | null } | undefined;
  isUpdating: boolean;
  newBlockDragGhostRef: React.RefObject<HTMLDivElement | null>;
  onSliceOpen: () => void;
  imageHistoryEntries: ChapterCanvasImageHistoryRow[];
  imageHistoryLoading?: boolean;
  restoringHistoryId: string | null;
  imageHistoryRestoredIds: ReadonlySet<string>;
  onRestoreImageHistory: (entry: ChapterCanvasImageHistoryRow) => void | Promise<void>;
  onAddBlock: (x?: number, y?: number, width?: number, height?: number) => void;
  /** Si x/y sont omis ou `undefined`, le parent positionne sous le centre visible du canvas. */
  onAddColorBlock: (x: number | undefined, y: number | undefined, width: number, height: number, fill?: ColorBlockFill) => void;
  onAddSpeechBubble: (type: SpeechBubbleType, x?: number, y?: number) => void;
}

export function EditorLeftSidebar({
  panel: _panel,
  activeSidebarTab,
  onTabChange,
  assets,
  scenarioContent,
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
}: EditorLeftSidebarProps) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  // Assets détectés dans le chapitre scénario lié (ou tous si pas de contenu)
  const detectedAssets = useMemo(() => {
    if (!scenarioContent?.trim()) return assets;
    const detected = getDetectedAssets(scenarioContent, assets);
    return detected.length > 0 ? detected : assets;
  }, [scenarioContent, assets]);

  const assetsByType = useMemo(() => {
    const groups: Record<string, Asset[]> = { character: [], background: [], object: [] };
    for (const a of detectedAssets) {
      const t = a.asset_type in groups ? a.asset_type : "object";
      groups[t].push(a);
    }
    return groups;
  }, [detectedAssets]);

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
            id: "assets" as const,
            icon: Package,
            label: "Assets",
            badge: detectedAssets.length > 0 ? detectedAssets.length : undefined,
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

      {/* Espace libre jusqu’au bas de la fenêtre */}
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
            {activeSidebarTab === "assets" && (
              <>
                Assets
                {detectedAssets.length > 0 && (
                  <span className="inline-flex items-center gap-2.5 rounded-lg border border-[hsl(var(--lavender)/0.38)] bg-[hsl(var(--lavender)/0.12)] px-3 py-1.5 shadow-sm dark:bg-[hsl(var(--lavender)/0.18)]">
                    <span className="text-xl font-bold tabular-nums leading-none text-[hsl(275,38%,35%)] dark:text-[hsl(280,42%,88%)]">
                      {detectedAssets.length}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground leading-tight">
                      référence{detectedAssets.length > 1 ? "s" : ""}
                    </span>
                  </span>
                )}
              </>
            )}
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
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-snug">
                Clic : sous la zone visible du canvas ; glisser : position précise au dépôt.
              </p>
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
          {activeSidebarTab === "assets" && (
            <div className="space-y-5">
              {detectedAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <Package className="h-9 w-9 text-muted-foreground/25" />
                  <p className="text-sm text-muted-foreground leading-relaxed px-2">
                    Aucun asset dans ce projet.
                  </p>
                </div>
              ) : (
                <>
                  {scenarioContent?.trim() && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Assets détectés dans le chapitre scénario lié
                    </p>
                  )}
                  {(["character", "background", "object"] as const).map((type) => {
                    const group = assetsByType[type];
                    if (!group || group.length === 0) return null;
                    const label = ASSET_TYPE_LABELS[type] ?? type;
                    return (
                      <div key={type} className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-0.5">
                          {label}
                          {group.length > 1 ? "s" : ""} ({group.length})
                        </p>
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
                                    <img
                                      src={thumb}
                                      alt={asset.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Package className="h-6 w-6 text-muted-foreground/30" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 py-0.5">
                                  <p className="text-sm font-semibold text-foreground truncate leading-snug">
                                    {asset.name}
                                  </p>
                                  {asset.prompt && (
                                    <p className="text-xs text-muted-foreground leading-snug line-clamp-3 mt-1">
                                      {asset.prompt.slice(0, 100)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
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
                {(Object.entries(SPEECH_BUBBLE_TYPE_LABELS) as [SpeechBubbleType, string][]).filter(([type]) => ["speech", "shout", "thought"].includes(type)).map(([type, label]) => (
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
