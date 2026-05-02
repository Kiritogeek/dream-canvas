import React, { useState, useMemo } from "react";
import { LayoutPanelTop, Palette, MessageCircle, X, Download, Package } from "lucide-react";
import { BubblePreview } from "@/components/chapter/SpeechBubbleShape";
import { BLOCK_PRESETS, getPanelHeight } from "@/services/panels";
import { SPEECH_BUBBLE_TYPE_LABELS, DEFAULT_SPEECH_BUBBLE_WIDTH, DEFAULT_SPEECH_BUBBLE_HEIGHT } from "@/types";
import { getDetectedAssets } from "@/components/project/ScenarioTextHighlighter";
import type { Panel, ColorBlockFill, SpeechBubbleType, Asset } from "@/types";
import { cn } from "@/lib/utils";
import {
  CHAPTER_EDITOR_RAIL_BTN_ACTIVE,
  CHAPTER_EDITOR_RAIL_BTN_BASE,
  CHAPTER_EDITOR_RAIL_BTN_IDLE,
} from "@/components/chapter/chapterCanvasToolbar";

const PANEL_WIDTH = 800;

const COLOR_PRESETS_SIDEBAR = [
  { label: "Blanc",  color: "#ffffff" },
  { label: "Noir",   color: "#000000" },
  { label: "Rouge",  color: "#ef4444" },
  { label: "Bleu",   color: "#3b82f6" },
  { label: "Vert",   color: "#22c55e" },
  { label: "Jaune",  color: "#fbbf24" },
] as const;

export type SidebarTab = "blocs" | "couleurs" | "dialogue" | "assets";

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
  onAddBlock: (x?: number, y?: number, width?: number, height?: number) => void;
  onAddColorBlock: (x: number, y: number, width: number, height: number, fill?: ColorBlockFill) => void;
  onAddSpeechBubble: (type: SpeechBubbleType, x: number, y: number) => void;
}

export function EditorLeftSidebar({
  panel,
  activeSidebarTab,
  onTabChange,
  assets,
  scenarioContent,
  isUpdating: _isUpdating,
  newBlockDragGhostRef,
  onSliceOpen,
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
    <aside className="relative w-[76px] shrink-0 border-r border-border bg-background z-30">

      {/* Barre d'icônes (76px, fixe) */}
      <div className="w-[76px] flex flex-col items-center gap-2 px-2 py-4">
        {([
          { id: "blocs" as const, icon: LayoutPanelTop, label: "Blocs" },
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
            <Icon className="h-4 w-4" />
            {"badge" in { badge } && badge !== undefined && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[hsl(var(--lavender))] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {badge}
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          title="Découper & télécharger"
          onClick={onSliceOpen}
          className="w-full h-12 rounded-xl border border-border/70 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>

      {/* Flyout bibliothèque */}
      <div className={`absolute top-0 left-full h-full flex flex-col bg-background border-r border-border shadow-xl overflow-hidden transition-[width] duration-200 ease-in-out ${activeSidebarTab ? "w-[340px]" : "w-0 pointer-events-none border-r-0"}`}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            {activeSidebarTab === "blocs" && <><span>Blocs image</span> <kbd className="text-[9px] font-mono bg-muted text-muted-foreground border border-border px-1 rounded">B</kbd></>}
            {activeSidebarTab === "couleurs" && <><span>Couleurs</span> <kbd className="text-[9px] font-mono bg-muted text-muted-foreground border border-border px-1 rounded">C</kbd></>}
            {activeSidebarTab === "dialogue" && <><span>Dialogue</span> <kbd className="text-[9px] font-mono bg-muted text-muted-foreground border border-border px-1 rounded">D</kbd></>}
            {activeSidebarTab === "assets" && (
              <span className="flex items-center gap-1.5">
                Assets
                {detectedAssets.length > 0 && (
                  <span className="text-[10px] bg-[hsl(var(--lavender)/0.15)] text-[hsl(275,45%,55%)] border border-[hsl(var(--lavender)/0.3)] px-1.5 py-0.5 rounded-full font-medium">
                    {detectedAssets.length}
                  </span>
                )}
              </span>
            )}
          </span>
          <button type="button" onClick={() => onTabChange(null)} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label="Fermer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {activeSidebarTab === "blocs" && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">Clic ou glisser sur le canvas</p>
              <div className="flex flex-col gap-1.5">
                {BLOCK_PRESETS.map((preset) => {
                  const MAX_W = 56, MAX_H = 44;
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
                          const MAX = 90;
                          const s = Math.min(MAX / preset.width, MAX / preset.height);
                          const gw = Math.max(52, Math.round(preset.width * s));
                          const gh = Math.max(36, Math.round(preset.height * s));
                          ghost.style.width = `${gw}px`;
                          ghost.style.height = `${gh}px`;
                          ghost.textContent = `${preset.width}×${preset.height}`;
                          e.dataTransfer.setDragImage(ghost, gw / 2, gh / 2);
                        }
                      }}
                      onDragEnd={() => setDraggingKey(null)}
                      onClick={() => onAddBlock(undefined, undefined, preset.width, preset.height)}
                      className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-card px-3 py-2.5 transition-all duration-150 flex items-center gap-3 select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border ${draggingKey === preset.label ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                    >
                      <div className="shrink-0 flex items-center justify-center" style={{ width: MAX_W, height: MAX_H }}>
                        <div
                          className="rounded border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center"
                          style={{ width: thumbW, height: thumbH }}
                        >
                          <LayoutPanelTop className="opacity-25" style={{ width: Math.max(9, Math.min(14, thumbW * 0.28)), height: Math.max(9, Math.min(14, thumbW * 0.28)) }} />
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-foreground">{preset.label}</span>
                        <span className="text-[10px] text-muted-foreground">{orientation}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeSidebarTab === "couleurs" && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">Clic ou glisser sur le canvas</p>
              <div className="grid grid-cols-2 gap-2">
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
                      const ph = getPanelHeight(panel);
                      const x = Math.round((PANEL_WIDTH - 300) / 2);
                      const y = Math.round((ph - 300) / 2);
                      onAddColorBlock(x, y, 300, 300, { type: "solid", color: preset.color });
                    }}
                    className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border transition-all duration-150 overflow-hidden select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border ${draggingKey === preset.color ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                  >
                    <div
                      className="h-14 w-full"
                      style={{ backgroundColor: preset.color, boxShadow: preset.color === "#ffffff" ? "inset 0 0 0 1px #e2e8f0" : undefined }}
                    />
                    <div className="px-2 py-1.5 bg-card flex items-center justify-between gap-1">
                      <span className="text-[10px] font-medium text-foreground">{preset.label}</span>
                      <span className="text-[9px] text-muted-foreground font-mono uppercase">{preset.color}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeSidebarTab === "assets" && (
            <div className="space-y-3">
              {detectedAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                  <Package className="h-7 w-7 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">Aucun asset dans ce projet.</p>
                </div>
              ) : (
                <>
                  {scenarioContent?.trim() && (
                    <p className="text-[11px] text-muted-foreground">
                      Assets détectés dans le chapitre scénario lié
                    </p>
                  )}
                  {(["character", "background", "object"] as const).map((type) => {
                    const group = assetsByType[type];
                    if (!group || group.length === 0) return null;
                    const label = ASSET_TYPE_LABELS[type] ?? type;
                    return (
                      <div key={type} className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
                          {label}{group.length > 1 ? "s" : ""} ({group.length})
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {group.map((asset) => {
                            const thumb = getAssetThumbnail(asset);
                            const bg = ASSET_TYPE_COLORS[type] ?? "hsl(var(--muted)/0.3)";
                            const border = ASSET_TYPE_BORDER[type] ?? "hsl(var(--border))";
                            return (
                              <div
                                key={asset.id}
                                className="flex items-center gap-2.5 rounded-xl border p-2 transition-colors hover:bg-muted/30"
                                style={{ borderColor: border, backgroundColor: bg }}
                              >
                                <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-muted/50 border border-border/40 flex items-center justify-center">
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt={asset.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Package className="h-4 w-4 text-muted-foreground/30" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate leading-tight">
                                    {asset.name}
                                  </p>
                                  {asset.prompt && (
                                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
                                      {asset.prompt.slice(0, 60)}
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
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">Clic pour ajouter au centre du canvas</p>
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  setDraggingKey("text");
                  e.dataTransfer.setData("application/json", JSON.stringify({ type: "speech-bubble", bubbleType: "text" }));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onDragEnd={() => setDraggingKey(null)}
                onClick={() => {
                  const ph = getPanelHeight(panel);
                  const cx = Math.round((PANEL_WIDTH - DEFAULT_SPEECH_BUBBLE_WIDTH) / 2);
                  const cy = Math.round((ph - DEFAULT_SPEECH_BUBBLE_HEIGHT) / 2);
                  onAddSpeechBubble("text", cx, cy);
                }}
                className={`w-full cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-background transition-all duration-150 flex flex-col items-center pb-1.5 overflow-hidden hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50 hover:bg-muted/40 ${draggingKey === "text" ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
              >
                <BubblePreview type="text" />
                <span className="text-[10px] font-medium text-muted-foreground">Texte libre / Onomatopée</span>
              </button>
              {/* Seuls les types validés dans bubble-proposals.html sont exposés.
                  Ajouter ici au fur et à mesure des validations. */}
              <div className="grid grid-cols-2 gap-2">
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
                    onClick={() => {
                      const ph = getPanelHeight(panel);
                      const cx = Math.round((PANEL_WIDTH - DEFAULT_SPEECH_BUBBLE_WIDTH) / 2);
                      const cy = Math.round((ph - DEFAULT_SPEECH_BUBBLE_HEIGHT) / 2);
                      onAddSpeechBubble(type, cx, cy);
                    }}
                    className={`cursor-grab active:cursor-grabbing active:scale-[0.98] rounded-xl border bg-background transition-all duration-150 flex flex-col items-center pb-1.5 overflow-hidden hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50 hover:bg-muted/40 ${draggingKey === type ? "opacity-50 scale-[0.98] border-border" : "border-border/60"}`}
                  >
                    <BubblePreview type={type} />
                    <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
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
