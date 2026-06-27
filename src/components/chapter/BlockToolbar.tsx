import { useState, useEffect, useMemo } from "react";
import { Trash2, Loader2, Sparkles, Coins } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DreamWeaveColorPicker,
  type CanvasColorFillPickMeta,
} from "@/components/chapter/DreamWeaveColorPicker";
import { getDetectedAssets } from "@/components/project/ScenarioTextHighlighter";
import {
  CHAPTER_CANVAS_TOOLBAR_SURFACE,
  CHAPTER_CANVAS_TOOLBAR_SEP_CLASS,
  CHAPTER_CANVAS_TOOLBAR_FIELD_CLASS,
  CHAPTER_CANVAS_TOOLBAR_PRIMARY_ACTION_CLASS,
  chapterCanvasToolbarIconButtonClass,
} from "@/components/chapter/chapterCanvasToolbar";
import { cn } from "@/lib/utils";
import type { PanelBlock, ColorBlock, ColorBlockFill, Asset, PanelBlockShape } from "@/types";

function DreamWeaveLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" fill="white" stroke="white" strokeWidth="1.5" />
      <path d="M20 3v4" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      <path d="M22 5h-4" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      <path d="M4 17v2" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      <path d="M5 18H3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
    </svg>
  );
}

const ASSET_TYPE_ICON: Record<string, string> = {
  character: "👤",
  background: "🏞",
  object: "📦",
};

/** Plages d'offset par shape diagonale. */
const SHAPE_OFFSET_RANGE: Partial<Record<PanelBlockShape, { min: number; max: number; default: number; label: string }>> = {
  "taper-r":    { min: 30, max: 90, default: 65, label: "Angle bas-droit" },
  "taper-l":    { min: 10, max: 70, default: 35, label: "Angle haut-gauche" },
  "diagonal-r": { min: 60, max: 97, default: 87, label: "Angle bas-droit" },
  "diagonal-l": { min: 3,  max: 40, default: 13, label: "Angle haut-gauche" },
};

type ImageVariant = {
  type: "image";
  block: PanelBlock;
  blockKey: string;
  nameDraft: string;
  promptDraft: string;
  isGenerating: boolean;
  canSuggest: boolean;
  canGenerate: boolean;
  assets: Asset[];
  /** IDs des assets épinglés sur le bloc (asset_refs) — toujours envoyés en référence. */
  pinnedAssetIds: string[];
  onToggleAssetRef: (assetId: string) => void;
  onNameChange: (value: string) => void;
  onNameSave: () => void;
  onPromptChange: (value: string) => void;
  onSuggestPrompt: () => void;
  onGenerate: () => void;
  onDelete: () => void;
  onShapeOffsetChange?: (offset: number) => void;
};

type ColorVariant = {
  type: "color";
  colorBlock: ColorBlock;
  onColorChange: (fill: ColorBlockFill, meta?: CanvasColorFillPickMeta) => void;
  /** Fin du glissé sur nuancier ou teinte (relâcher le clic). */
  onLiveColorPickEnd?: () => void;
  onDelete: () => void;
};

type BlockToolbarProps = ImageVariant | ColorVariant;

const sep = <div className={CHAPTER_CANVAS_TOOLBAR_SEP_CLASS} />;

function ImageBlockToolbar(props: ImageVariant) {
  const {
    block,
    nameDraft,
    promptDraft,
    isGenerating,
    canSuggest,
    canGenerate,
    assets,
    pinnedAssetIds,
    onToggleAssetRef,
    onNameChange,
    onNameSave,
    onPromptChange,
    onSuggestPrompt,
    onGenerate,
    onDelete,
    onShapeOffsetChange,
  } = props;

  const [open, setOpen] = useState(false);

  const shapeRange = block.shape ? SHAPE_OFFSET_RANGE[block.shape] : undefined;

  const detectedAssets = useMemo(
    () => getDetectedAssets(promptDraft, assets),
    [promptDraft, assets],
  );
  const detectedIds = useMemo(() => new Set(detectedAssets.map((a) => a.id)), [detectedAssets]);
  const pinnedSet = useMemo(() => new Set(pinnedAssetIds), [pinnedAssetIds]);
  const effectiveRefCount = useMemo(() => {
    const ids = new Set(pinnedAssetIds);
    detectedAssets.forEach((a) => ids.add(a.id));
    return ids.size;
  }, [pinnedAssetIds, detectedAssets]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* PopoverAnchor = toute la toolbar → la popup se centre dessus */}
      <PopoverAnchor asChild>
        <div
          className={cn(CHAPTER_CANVAS_TOOLBAR_SURFACE, "z-50 gap-2")}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameSave}
            placeholder={block.name ?? "Nom de la case"}
            className={cn(CHAPTER_CANVAS_TOOLBAR_FIELD_CLASS, "w-28 bg-transparent")}
          />

          {sep}

          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                CHAPTER_CANVAS_TOOLBAR_PRIMARY_ACTION_CLASS,
                "shrink-0",
                open && "opacity-90 scale-[0.98]",
              )}
              title={block.image_url ? "Régénérer l'image" : "Générer l'image"}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <DreamWeaveLogo size={16} />}
              IA
            </button>
          </PopoverTrigger>

          {sep}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={chapterCanvasToolbarIconButtonClass(false, "danger")}
            title="Supprimer le bloc"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {shapeRange && onShapeOffsetChange && (
            <>
              {sep}
              <div
                className="flex items-center gap-2 px-1"
                title={shapeRange.label}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] text-muted-foreground font-medium shrink-0 leading-none">⟋</span>
                <input
                  type="range"
                  min={shapeRange.min}
                  max={shapeRange.max}
                  step={1}
                  value={block.shapeOffset ?? shapeRange.default}
                  onChange={(e) => onShapeOffsetChange(parseInt(e.target.value, 10))}
                  className="w-20 h-1.5 accent-primary cursor-pointer"
                  aria-label={shapeRange.label}
                />
              </div>
            </>
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
          side="bottom"
          align="center"
          sideOffset={8}
          className="w-[340px] p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-border/50">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <DreamWeaveLogo size={14} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">
                {block.image_url ? "Régénérer l'image" : "Générer l'image"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {block.image_url ? "Nouveau prompt pour ce bloc" : "Décris la scène à créer"}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 flex flex-col gap-3">
            <textarea
              placeholder="Ex. Personnage face caméra, fond urbain nocturne, style manga…"
              value={promptDraft}
              onChange={(e) => onPromptChange(e.target.value)}
              className="w-full resize-none text-sm bg-muted/40 rounded-xl border border-border/60 px-3 py-2.5 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50 leading-relaxed"
              rows={4}
            />

            {/* Sélecteur de références — assets envoyés à l'IA pour garder leur apparence.
                Épingler (📌) découple la référence du texte du prompt : un asset non écrit
                dans le prompt est quand même utilisé s'il est épinglé. */}
            {assets.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Références de la case
                  <span className="ml-1.5 text-primary normal-case font-medium tracking-normal">
                    · {effectiveRefCount} envoyée{effectiveRefCount > 1 ? "s" : ""} à l'IA
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[116px] overflow-y-auto pr-0.5">
                  {assets.map((asset) => {
                    const pinned = pinnedSet.has(asset.id);
                    const detected = detectedIds.has(asset.id);
                    const active = pinned || detected;
                    const thumb =
                      asset.image_url_sheet ??
                      asset.image_url ??
                      asset.image_url_profile_left ??
                      null;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => onToggleAssetRef(asset.id)}
                        title={pinned ? `Retirer "${asset.name}" des références` : `Épingler "${asset.name}" comme référence`}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-6 pl-1 pr-2 rounded-full text-[11px] font-medium border transition-all",
                          active
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted/70",
                        )}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={asset.name}
                            className="w-4 h-4 rounded-full object-cover shrink-0 border border-primary/20"
                          />
                        ) : (
                          <span className="text-[10px] leading-none shrink-0">
                            {ASSET_TYPE_ICON[asset.asset_type] ?? "◆"}
                          </span>
                        )}
                        <span className="truncate max-w-[80px]">{asset.name}</span>
                        {pinned ? (
                          <span className="ml-0.5 text-primary/70 text-[10px] leading-none" aria-hidden>📌</span>
                        ) : detected ? (
                          <span className="ml-0.5 text-[8px] uppercase tracking-wide opacity-60">auto</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-snug">
                  Style du projet appliqué automatiquement. Épingle (📌) les personnages et décors de cette case pour que l'IA réutilise leur apparence, même s'ils ne sont pas écrits dans le prompt.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canSuggest}
                onClick={() => { onSuggestPrompt(); }}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 transition-all flex-1 justify-center"
              >
                <Sparkles className="h-3 w-3" />
                Suggérer IA
              </button>
              <button
                type="button"
                disabled={!canGenerate || isGenerating}
                onClick={() => { onGenerate(); setOpen(false); }}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold gradient-primary text-white disabled:opacity-40 transition-all flex-1 justify-center shadow-sm"
              >
                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DreamWeaveLogo size={13} />}
                {isGenerating ? "Génération…" : (
                  <>
                    Générer
                    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                      <Coins className="h-2.5 w-2.5" />1
                    </span>
                  </>
                )}
              </button>
            </div>

            {!canGenerate && promptDraft.trim() && (
              <p className="text-[11px] text-amber-500/80 flex items-center gap-1">
                <span>⚠</span> Style template requis dans les paramètres du projet
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
  );
}

function ColorBlockToolbar(props: ColorVariant) {
  const { colorBlock, onColorChange, onLiveColorPickEnd, onDelete } = props;

  const currentColor =
    colorBlock.fill.type === "solid"
      ? colorBlock.fill.color
      : colorBlock.fill.from;

  const [pickerOpen, setPickerOpen] = useState(false);

  const [hexDraft, setHexDraft] = useState(currentColor);

  useEffect(() => {
    setHexDraft(currentColor);
  }, [currentColor]);

  const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

  const handleHexChange = (v: string) => {
    setHexDraft(v);
    if (isValidHex(v)) onColorChange({ type: "solid", color: v }, undefined);
  };

  const handleHexBlur = () => {
    if (!isValidHex(hexDraft)) setHexDraft(currentColor);
  };

  return (
    <div className="relative inline-block">
      <Popover
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open) onLiveColorPickEnd?.();
          setPickerOpen(open);
        }}
      >
        <PopoverAnchor asChild>
          <div
            className={cn(CHAPTER_CANVAS_TOOLBAR_SURFACE, "z-50 gap-2")}
            onClick={(e) => e.stopPropagation()}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative shrink-0 flex items-center justify-center h-8 w-8 rounded-lg border border-border/80 shadow-sm ring-1 ring-black/[0.04] hover:bg-muted/40 transition-colors"
                title="DreamWeave : choisir une couleur"
              >
                <div
                  className="w-5 h-5 rounded-md border border-border/50 shrink-0 pointer-events-none"
                  style={{
                    backgroundColor: currentColor,
                    boxShadow: currentColor.toLowerCase() === "#ffffff" ? "inset 0 0 0 1px #cbd5e1" : undefined,
                  }}
                />
              </button>
            </PopoverTrigger>

            {/* Input hex éditable */}
            <input
              type="text"
              value={hexDraft}
              onChange={(e) => handleHexChange(e.target.value)}
              onBlur={handleHexBlur}
              onClick={(e) => e.stopPropagation()}
              spellCheck={false}
              maxLength={7}
              className={cn(
                CHAPTER_CANVAS_TOOLBAR_FIELD_CLASS,
                "w-[78px] font-mono tabular-nums",
                isValidHex(hexDraft) ? "text-foreground" : "border-destructive/60 focus:ring-destructive/40 text-destructive",
              )}
            />

            {sep}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={chapterCanvasToolbarIconButtonClass(false, "danger")}
              title="Supprimer le bloc de couleur"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="center"
          side="bottom"
          sideOffset={8}
          className="w-auto p-3 border-border/70 bg-popover/95 backdrop-blur-md shadow-xl z-[80]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DreamWeaveColorPicker
            value={currentColor}
            onChange={(hex, meta) => onColorChange({ type: "solid", color: hex }, meta)}
            onLivePickEnd={onLiveColorPickEnd}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function BlockToolbar(props: BlockToolbarProps) {
  if (props.type === "image") return <ImageBlockToolbar {...props} />;
  return <ColorBlockToolbar {...props} />;
}
