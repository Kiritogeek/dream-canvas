import React from "react";
import { LayoutPanelTop, Palette, MessageCircle, X, Square, Download, Sparkles, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BubblePreview } from "@/components/chapter/SpeechBubbleShape";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { getDetectedAssets } from "@/components/project/ScenarioTextHighlighter";
import { BLOCK_PRESETS, getPanelHeight } from "@/services/panels";
import { SPEECH_BUBBLE_TYPE_LABELS, DEFAULT_SPEECH_BUBBLE_WIDTH, DEFAULT_SPEECH_BUBBLE_HEIGHT } from "@/types";
import type { Panel, PanelBlock, ColorBlock, ColorBlockFill, SpeechBubbleType, Asset } from "@/types";

const PANEL_WIDTH = 800;

function getAssetReferenceImageUrl(asset: Asset): string | null {
  if (asset.asset_type === "character") {
    return (
      asset.image_url_sheet ??
      asset.image_url ??
      asset.image_url_profile_left ??
      asset.image_url_profile_right ??
      asset.image_url_back ??
      null
    );
  }
  return asset.image_url ?? asset.image_url_sheet ?? null;
}

function getAssetReferencePromptLabel(asset: Asset): string {
  const name = asset.name?.trim() || asset.id.slice(0, 8);
  if (asset.asset_type === "character") return `character named "${name}"`;
  if (asset.asset_type === "background") return `background: "${name}"`;
  return `object: "${name}"`;
}

interface EditorLeftSidebarProps {
  panel: Panel;
  activeSidebarTab: "blocs" | "couleurs" | "dialogue" | null;
  onTabChange: (tab: "blocs" | "couleurs" | "dialogue" | null) => void;
  selectedBlock: PanelBlock | null;
  selectedColorBlock: ColorBlock | null;
  onSelectBlock: (id: string | null) => void;
  onSelectColorBlock: (id: string | null) => void;
  assets: Asset[];
  project: { style_template?: string | null; title?: string | null } | undefined;
  blockNameDrafts: Record<string, string>;
  onBlockNameChange: (key: string, value: string) => void;
  blockPromptDrafts: Record<string, string>;
  onBlockPromptChange: (key: string, value: string, silent?: boolean) => void;
  suggestingBlockKeys: Set<string>;
  scenarioChapter: { content?: string | null } | undefined;
  isUpdating: boolean;
  isGenerating: boolean;
  newBlockDragGhostRef: React.RefObject<HTMLDivElement | null>;
  onSliceOpen: () => void;
  onAddBlock: (x?: number, y?: number, width?: number, height?: number) => void;
  onAddColorBlock: (x: number, y: number, width: number, height: number, fill?: ColorBlockFill) => void;
  onAddSpeechBubble: (type: SpeechBubbleType, x: number, y: number) => void;
  onDeleteBlock: (block: PanelBlock) => void;
  onDeleteColorBlock: (block: ColorBlock) => void;
  onSaveBlockName: (block: PanelBlock, name: string) => void;
  onSuggestBlockPrompt: (block: PanelBlock) => void;
  onGenerateBlock: (block: PanelBlock) => void;
  onColorBlockFillChange: (block: ColorBlock, fill: ColorBlock["fill"]) => void;
}

export function EditorLeftSidebar({
  panel,
  activeSidebarTab,
  onTabChange,
  selectedBlock,
  selectedColorBlock,
  onSelectBlock,
  onSelectColorBlock,
  assets,
  project,
  blockNameDrafts,
  onBlockNameChange,
  blockPromptDrafts,
  onBlockPromptChange,
  suggestingBlockKeys,
  scenarioChapter,
  isUpdating,
  isGenerating,
  newBlockDragGhostRef,
  onSliceOpen,
  onAddBlock,
  onAddColorBlock,
  onAddSpeechBubble,
  onDeleteBlock,
  onDeleteColorBlock,
  onSaveBlockName,
  onSuggestBlockPrompt,
  onGenerateBlock,
  onColorBlockFillChange,
}: EditorLeftSidebarProps) {
  return (
    <aside className="relative w-[76px] shrink-0 border-r border-border bg-background z-30">

      {/* Barre d'icônes (76px, fixe) */}
      <div className="w-[76px] flex flex-col items-center gap-2 px-2 py-4">
        {([
          { id: "blocs" as const, icon: LayoutPanelTop, label: "Blocs" },
          { id: "couleurs" as const, icon: Palette, label: "Couleurs" },
          { id: "dialogue" as const, icon: MessageCircle, label: "Dialogue" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => onTabChange(activeSidebarTab === id ? null : id)}
            className={`w-full h-12 rounded-xl border flex items-center justify-center transition-colors ${activeSidebarTab === id ? "border-primary/70 bg-primary/15 text-primary shadow-sm" : "border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
          >
            <Icon className="h-5 w-5" />
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

      {/* Flyout bibliothèque — overlay absolu, masqué quand un bloc/couleur est sélectionné */}
      <div className={`absolute top-0 left-full h-full flex flex-col bg-background border-r border-border shadow-xl overflow-hidden transition-[width] duration-200 ease-in-out ${activeSidebarTab && !selectedBlock && !selectedColorBlock ? "w-[340px]" : "w-0 pointer-events-none border-r-0"}`}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            {activeSidebarTab === "blocs" && <><span>Blocs image</span> <kbd className="text-[9px] font-mono bg-muted text-muted-foreground border border-border px-1 rounded">B</kbd></>}
            {activeSidebarTab === "couleurs" && <><span>Couleurs</span> <kbd className="text-[9px] font-mono bg-muted text-muted-foreground border border-border px-1 rounded">C</kbd></>}
            {activeSidebarTab === "dialogue" && <><span>Dialogue</span> <kbd className="text-[9px] font-mono bg-muted text-muted-foreground border border-border px-1 rounded">D</kbd></>}
          </span>
          <button type="button" onClick={() => onTabChange(null)} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label="Fermer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {activeSidebarTab === "blocs" && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">Clic ou glisser sur le canvas</p>
              <div className="flex flex-col gap-1.5">
                {BLOCK_PRESETS.map((preset) => (
                  <div
                    key={preset.label}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-block", width: preset.width, height: preset.height }));
                      e.dataTransfer.effectAllowed = "copy";
                      const ghost = newBlockDragGhostRef.current;
                      if (ghost) e.dataTransfer.setDragImage(ghost, Math.min(250, preset.width / 2), Math.min(250, preset.height / 2));
                    }}
                    onClick={() => onAddBlock(undefined, undefined, preset.width, preset.height)}
                    className="cursor-grab active:cursor-grabbing rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <span>{preset.label}</span>
                    <LayoutPanelTop className="h-3 w-3 opacity-40" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeSidebarTab === "couleurs" && (
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-color-block", width: 300, height: 300, fill: { type: "solid", color: "#ffffff" } }));
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => {
                const ph = getPanelHeight(panel);
                const x = Math.round((PANEL_WIDTH - 300) / 2);
                const y = Math.round((ph - 300) / 2);
                onAddColorBlock(x, y, 300, 300);
              }}
              className="cursor-grab active:cursor-grabbing rounded-lg border border-border/80 bg-white shadow-sm px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Square className="h-4 w-4 shrink-0" />
              <span>Bloc de couleur</span>
            </div>
          )}
          {activeSidebarTab === "dialogue" && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">Clic pour ajouter au centre du canvas</p>
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/json", JSON.stringify({ type: "speech-bubble", bubbleType: "text" }));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => {
                  const ph = getPanelHeight(panel);
                  const cx = Math.round((PANEL_WIDTH - DEFAULT_SPEECH_BUBBLE_WIDTH) / 2);
                  const cy = Math.round((ph - DEFAULT_SPEECH_BUBBLE_HEIGHT) / 2);
                  onAddSpeechBubble("text", cx, cy);
                }}
                className="w-full cursor-pointer rounded-lg border border-border/60 bg-background hover:border-primary/50 hover:bg-muted/40 transition-colors flex flex-col items-center pb-1.5 overflow-hidden"
              >
                <BubblePreview type="text" />
                <span className="text-[10px] font-medium text-muted-foreground">Texte libre / Onomatopée</span>
              </button>
              {/* Seuls les types validés dans bubble-proposals.html sont exposés.
                  Ajouter ici au fur et à mesure des validations. */}
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(SPEECH_BUBBLE_TYPE_LABELS) as [SpeechBubbleType, string][]).filter(([type]) => ["speech", "shout"].includes(type)).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "speech-bubble", bubbleType: type }));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => {
                      const ph = getPanelHeight(panel);
                      const cx = Math.round((PANEL_WIDTH - DEFAULT_SPEECH_BUBBLE_WIDTH) / 2);
                      const cy = Math.round((ph - DEFAULT_SPEECH_BUBBLE_HEIGHT) / 2);
                      onAddSpeechBubble(type, cx, cy);
                    }}
                    className="cursor-pointer rounded-lg border border-border/60 bg-background hover:border-primary/50 hover:bg-muted/40 transition-colors flex flex-col items-center pb-1.5 overflow-hidden"
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

      {/* Panneau propriétés — overlay absolu, uniquement pour blocs/couleurs (bulle : toolbar inline) */}
      <div className={`absolute top-0 left-full h-full flex flex-col bg-background border-r border-border shadow-xl overflow-hidden transition-[width] duration-200 ease-in-out ${selectedBlock || selectedColorBlock ? "w-[340px]" : "w-0 pointer-events-none border-r-0"}`}>
        <div className="flex-1 overflow-y-auto min-h-0">
          {selectedBlock ? (() => {
            const block = selectedBlock;
            const blockKey = `${panel.id}-${block.id}`;
            const nameDraft = blockNameDrafts[blockKey] ?? block.name ?? "";
            const promptDraft = blockPromptDrafts[blockKey] ?? block.prompt ?? "";
            return (
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Bloc image</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => onSelectBlock(null)} aria-label="Désélectionner"><X className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Nom</label>
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => onBlockNameChange(blockKey, e.target.value)}
                    onBlur={() => { if (nameDraft.trim() !== (block.name ?? "")) onSaveBlockName(block, nameDraft); }}
                    placeholder="Ex. Bloc 1"
                    className="w-full h-8 rounded-lg border border-border/60 bg-background px-3 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Prompt visuel</label>
                  <Textarea
                    value={promptDraft}
                    onChange={(e) => onBlockPromptChange(blockKey, e.target.value, true)}
                    placeholder="Description visuelle de ce bloc…"
                    className="min-h-[70px] text-sm resize-y"
                  />
                  {!block.image_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-7 text-xs w-full"
                      disabled={suggestingBlockKeys.has(blockKey) || !scenarioChapter?.content?.trim()}
                      onClick={() => onSuggestBlockPrompt(block)}
                    >
                      {suggestingBlockKeys.has(blockKey) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Suggérer un prompt IA
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">{block.width} × {Math.round(block.height)} px</div>
                {(() => {
                  const promptText = (promptDraft.trim() || (block.prompt ?? "").trim()) || "";
                  const detected = getDetectedAssets(promptText, assets);
                  if (detected.length === 0) return null;
                  return (
                    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-2">
                      {detected.map((asset) => (
                        <div key={asset.id} className="flex items-center gap-2">
                          <div className="w-8 h-8 shrink-0 rounded overflow-hidden border border-border/60 bg-muted">
                            {getAssetReferenceImageUrl(asset) ? (
                              <ImageWithFallback src={getAssetReferenceImageUrl(asset) ?? ""} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                            )}
                          </div>
                          <span className="flex-1 min-w-0 truncate text-xs font-medium">{asset.name ?? asset.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{getAssetReferencePromptLabel(asset).split(":")[0]}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {project && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    disabled={!selectedBlock.prompt?.trim() || !project.style_template?.trim() || isGenerating}
                    onClick={() => onGenerateBlock(block)}
                  >
                    {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {block.image_url ? "Régénérer" : "Générer l'image"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isUpdating}
                  onClick={() => onDeleteBlock(block)}
                >
                  <Trash2 className="h-3 w-3" /> Supprimer le bloc
                </Button>
              </div>
            );
          })() : selectedColorBlock ? (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Bloc couleur</span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => onSelectColorBlock(null)} aria-label="Désélectionner"><X className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">{selectedColorBlock.width} × {Math.round(selectedColorBlock.height)} px</div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                Couleur
                <input
                  type="color"
                  value={selectedColorBlock.fill.type === "solid" ? selectedColorBlock.fill.color : selectedColorBlock.fill.from}
                  onChange={(e) => onColorBlockFillChange(selectedColorBlock, { type: "solid", color: e.target.value })}
                  className="h-7 w-12 rounded border border-border/60 cursor-pointer bg-background"
                />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {selectedColorBlock.fill.type === "solid" ? selectedColorBlock.fill.color : selectedColorBlock.fill.from}
                </span>
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isUpdating}
                onClick={() => onDeleteColorBlock(selectedColorBlock)}
              >
                <Trash2 className="h-3 w-3" /> Supprimer
              </Button>
            </div>
          ) : null}
        </div>
      </div>

    </aside>
  );
}
