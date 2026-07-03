import { useEffect, useRef, useState } from "react";
import { Trash2, Copy, Settings2, Plus, Minus } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DreamWeaveColorPicker } from "@/components/chapter/DreamWeaveColorPicker";
import {
  CHAPTER_CANVAS_TOOLBAR_SURFACE,
  CHAPTER_CANVAS_TOOLBAR_SEP_CLASS,
  CHAPTER_CANVAS_TOOLBAR_FIELD_CLASS,
  chapterCanvasToolbarIconButtonClass,
} from "@/components/chapter/chapterCanvasToolbar";
import { FONT_CATEGORIES } from "@/components/chapter/bubbleFonts";
import { cn } from "@/lib/utils";
import type { SfxBlock } from "@/types";

interface SfxToolbarProps {
  sfx: SfxBlock;
  sfxBlocks: SfxBlock[];
  onUpdate: (next: SfxBlock[]) => void;
  /** Aperçu pendant un geste continu (slider, picker) — cache seul, pas d'écriture BDD. */
  onLiveUpdate?: (next: SfxBlock[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const sep = <div className={CHAPTER_CANVAS_TOOLBAR_SEP_CLASS} />;

function ColorSwatchButton({ color, title, onPick, onPickLive, onPickEnd }: {
  color: string;
  title: string;
  onPick: (hex: string) => void;
  /** Ticks du drag nuancier/teinte (meta.live) — aperçu sans écriture. */
  onPickLive?: (hex: string) => void;
  /** Fin du geste live (relâcher) — commit. */
  onPickEnd?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) onPickEnd?.(); setOpen(o); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative shrink-0 flex items-center justify-center h-8 w-8 rounded-lg border border-border/80 shadow-sm hover:bg-muted/40 transition-colors"
          title={title}
        >
          <div
            className="w-5 h-5 rounded-md border border-border/50 shrink-0 pointer-events-none"
            style={{ backgroundColor: color, boxShadow: color.toLowerCase() === "#ffffff" ? "inset 0 0 0 1px #cbd5e1" : undefined }}
          />
        </button>
      </PopoverTrigger>
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
          value={color}
          onChange={(hex, meta) => {
            if (meta?.live && onPickLive) onPickLive(hex);
            else onPick(hex);
          }}
          onLivePickEnd={onPickEnd}
        />
      </PopoverContent>
    </Popover>
  );
}

export function SfxToolbar({ sfx, sfxBlocks, onUpdate, onLiveUpdate, onDuplicate, onDelete }: SfxToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const patch = (changes: Partial<SfxBlock>) =>
    onUpdate(sfxBlocks.map((s) => (s.id === sfx.id ? { ...s, ...changes } : s)));

  // Gestes continus : aperçu via onLiveUpdate (cache seul), commit unique au relâchement.
  const lastLiveNextRef = useRef<SfxBlock[] | null>(null);
  const patchLive = (changes: Partial<SfxBlock>) => {
    const next = sfxBlocks.map((s) => (s.id === sfx.id ? { ...s, ...changes } : s));
    if (onLiveUpdate) {
      lastLiveNextRef.current = next;
      onLiveUpdate(next);
    } else {
      onUpdate(next);
    }
  };
  const commitGesture = () => {
    if (lastLiveNextRef.current) {
      onUpdate(lastLiveNextRef.current);
      lastLiveNextRef.current = null;
    }
  };

  // Draft local : une écriture BDD par frappe saturerait mutation + pile d'undo.
  // Commit au blur / Entrée, comme le champ nom de case (blockNameDrafts).
  const [textDraft, setTextDraft] = useState(sfx.text);
  useEffect(() => {
    setTextDraft(sfx.text);
  }, [sfx.id, sfx.text]);
  const commitText = () => {
    if (textDraft !== sfx.text) patch({ text: textDraft });
  };

  const glowOn = !!sfx.glowColor && (sfx.glowBlur ?? 0) > 0;

  return (
    <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(CHAPTER_CANVAS_TOOLBAR_SURFACE, "z-50 gap-2")}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitText(); } }}
            placeholder="BOOM !"
            className={cn(CHAPTER_CANVAS_TOOLBAR_FIELD_CLASS, "w-32")}
            style={{ fontFamily: sfx.fontFamily }}
          />

          <select
            value={sfx.fontFamily}
            onChange={(e) => patch({ fontFamily: e.target.value })}
            className={cn(CHAPTER_CANVAS_TOOLBAR_FIELD_CLASS, "w-32 cursor-pointer")}
            title="Police du SFX"
            style={{ fontFamily: sfx.fontFamily }}
          >
            {FONT_CATEGORIES.map((cat) => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.fonts.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {sep}

          <button
            type="button"
            onClick={() => patch({ fontSize: Math.max(12, sfx.fontSize - 6) })}
            className={chapterCanvasToolbarIconButtonClass(false)}
            title="Réduire la taille"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-semibold tabular-nums w-9 text-center shrink-0" title="Taille du texte">
            {sfx.fontSize}
          </span>
          <button
            type="button"
            onClick={() => patch({ fontSize: Math.min(600, sfx.fontSize + 6) })}
            className={chapterCanvasToolbarIconButtonClass(false)}
            title="Agrandir la taille"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {sep}

          <ColorSwatchButton color={sfx.color} title="Couleur du texte" onPick={(hex) => patch({ color: hex })} onPickLive={(hex) => patchLive({ color: hex })} onPickEnd={commitGesture} />
          <ColorSwatchButton color={sfx.strokeColor} title="Couleur du contour" onPick={(hex) => patch({ strokeColor: hex })} onPickLive={(hex) => patchLive({ strokeColor: hex })} onPickEnd={commitGesture} />

          {sep}

          <PopoverTrigger asChild>
            <button
              type="button"
              className={chapterCanvasToolbarIconButtonClass(settingsOpen)}
              title="Réglages avancés (contour, lueur, rotation, opacité)"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </PopoverTrigger>

          {sep}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className={chapterCanvasToolbarIconButtonClass(false)}
            title="Dupliquer le SFX"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={chapterCanvasToolbarIconButtonClass(false, "danger")}
            title="Supprimer le SFX"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </PopoverAnchor>

      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        className="w-[300px] p-4 rounded-2xl border border-border/80 shadow-2xl space-y-4"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contour</span>
            <span className="text-xs tabular-nums text-foreground">{sfx.strokeWidth}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={sfx.strokeWidth}
            onChange={(e) => patchLive({ strokeWidth: parseInt(e.target.value, 10) })}
            onPointerUp={commitGesture}
            onKeyUp={commitGesture}
            className="w-full h-1.5 accent-primary cursor-pointer"
            aria-label="Épaisseur du contour"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lueur</span>
            <button
              type="button"
              onClick={() => patch(glowOn ? { glowColor: undefined, glowBlur: undefined } : { glowColor: "#f97316", glowBlur: 14 })}
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-md border transition-colors",
                glowOn ? "border-primary/60 bg-primary/15 text-primary" : "border-border/70 text-muted-foreground hover:text-foreground",
              )}
            >
              {glowOn ? "Activée" : "Désactivée"}
            </button>
          </div>
          {glowOn && (
            <div className="flex items-center gap-2 pt-1">
              <ColorSwatchButton color={sfx.glowColor ?? "#f97316"} title="Couleur de la lueur" onPick={(hex) => patch({ glowColor: hex })} onPickLive={(hex) => patchLive({ glowColor: hex })} onPickEnd={commitGesture} />
              <input
                type="range"
                min={2}
                max={40}
                step={1}
                value={sfx.glowBlur ?? 14}
                onChange={(e) => patchLive({ glowBlur: parseInt(e.target.value, 10) })}
                onPointerUp={commitGesture}
                onKeyUp={commitGesture}
                className="flex-1 h-1.5 accent-primary cursor-pointer"
                aria-label="Rayon de la lueur"
              />
              <span className="text-xs tabular-nums w-8 text-right">{sfx.glowBlur ?? 14}px</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rotation</span>
            <span className="text-xs tabular-nums text-foreground">{Math.round(sfx.rotation)}°</span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={Math.round(sfx.rotation)}
            onChange={(e) => patchLive({ rotation: parseInt(e.target.value, 10) })}
            onPointerUp={commitGesture}
            onKeyUp={commitGesture}
            className="w-full h-1.5 accent-primary cursor-pointer"
            aria-label="Rotation"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opacité</span>
            <span className="text-xs tabular-nums text-foreground">{Math.round((sfx.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={Math.round((sfx.opacity ?? 1) * 100)}
            onChange={(e) => patchLive({ opacity: parseInt(e.target.value, 10) / 100 })}
            onPointerUp={commitGesture}
            onKeyUp={commitGesture}
            className="w-full h-1.5 accent-primary cursor-pointer"
            aria-label="Opacité"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Espacement lettres</span>
            <span className="text-xs tabular-nums text-foreground">{sfx.letterSpacing ?? 0}px</span>
          </div>
          <input
            type="range"
            min={-4}
            max={24}
            step={1}
            value={sfx.letterSpacing ?? 0}
            onChange={(e) => patchLive({ letterSpacing: parseInt(e.target.value, 10) })}
            onPointerUp={commitGesture}
            onKeyUp={commitGesture}
            className="w-full h-1.5 accent-primary cursor-pointer"
            aria-label="Espacement des lettres"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
