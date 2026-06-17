import { useMemo, useState } from "react";
import { BookOpen, Loader2, Package, ChevronDown } from "lucide-react";
import { EditorSettingsPopover } from "@/components/chapter/EditorSettingsPopover";
import type { EditorSettings } from "@/hooks/useEditorSettings";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScenarioFormattedPreview } from "@/components/project/ScenarioFormattedPreview";
import type { Asset } from "@/types";
import { cn } from "@/lib/utils";
import {
  CHAPTER_EDITOR_RAIL_ASIDE_CLASS,
  CHAPTER_EDITOR_RAIL_COUNT_BADGE_CLASS,
  CHAPTER_EDITOR_RAIL_PANEL_RIGHT_CLASS,
  CHAPTER_EDITOR_RAIL_BTN_ACTIVE,
  CHAPTER_EDITOR_RAIL_BTN_BASE,
  CHAPTER_EDITOR_RAIL_BTN_IDLE,
} from "@/components/chapter/chapterCanvasToolbar";

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
  activeTool: "chapter-text" | "assets" | null;
  onToolChange: (tool: "chapter-text" | "assets" | null) => void;
  loadingScenario: boolean;
  scenarioContent: string | null | undefined;
  assets: Asset[];
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
  settings,
  onUpdateSettings,
}: EditorRightPanelProps) {
  const [openAssetGroups, setOpenAssetGroups] = useState<Record<string, boolean>>({
    character: true,
    background: true,
    object: true,
  });

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

        {/* Paramètres éditeur — en bas du rail */}
        <div className="mt-auto">
          <EditorSettingsPopover settings={settings} onUpdateSettings={onUpdateSettings} />
        </div>
      </aside>
    </>
  );
}
