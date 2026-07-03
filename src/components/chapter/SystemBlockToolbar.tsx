import { useEffect, useRef, useState } from "react";
import { Trash2, Copy, TextCursorInput } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DreamWeaveColorPicker } from "@/components/chapter/DreamWeaveColorPicker";
import {
  CHAPTER_CANVAS_TOOLBAR_SURFACE,
  CHAPTER_CANVAS_TOOLBAR_SEP_CLASS,
  CHAPTER_CANVAS_TOOLBAR_FIELD_CLASS,
  chapterCanvasToolbarIconButtonClass,
} from "@/components/chapter/chapterCanvasToolbar";
import { cn } from "@/lib/utils";
import type { SystemBlock, SystemBlockVariant } from "@/types";
import { SYSTEM_BLOCK_VARIANT_CONFIG } from "@/types";

interface SystemBlockToolbarProps {
  block: SystemBlock;
  systemBlocks: SystemBlock[];
  onUpdate: (next: SystemBlock[]) => void;
  /** Aperçu pendant un geste continu (picker) — cache seul, pas d'écriture BDD. */
  onLiveUpdate?: (next: SystemBlock[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const sep = <div className={CHAPTER_CANVAS_TOOLBAR_SEP_CLASS} />;

export function SystemBlockToolbar({ block, systemBlocks, onUpdate, onLiveUpdate, onDuplicate, onDelete }: SystemBlockToolbarProps) {
  const [bodyOpen, setBodyOpen] = useState(false);
  const [accentOpen, setAccentOpen] = useState(false);

  const patch = (changes: Partial<SystemBlock>) =>
    onUpdate(systemBlocks.map((s) => (s.id === block.id ? { ...s, ...changes } : s)));

  // Geste continu du picker d'accent : aperçu cache seul, commit unique au relâchement.
  const lastLiveNextRef = useRef<SystemBlock[] | null>(null);
  const patchLive = (changes: Partial<SystemBlock>) => {
    const next = systemBlocks.map((s) => (s.id === block.id ? { ...s, ...changes } : s));
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

  // Drafts locaux : une écriture BDD par frappe saturerait mutation + pile d'undo.
  // Commit au blur (titre : aussi sur Entrée), comme le champ nom de case.
  const [titleDraft, setTitleDraft] = useState(block.title);
  const [bodyDraft, setBodyDraft] = useState(block.body);
  useEffect(() => {
    setTitleDraft(block.title);
    setBodyDraft(block.body);
  }, [block.id, block.title, block.body]);
  const commitTitle = () => {
    if (titleDraft !== block.title) patch({ title: titleDraft });
  };
  const commitBody = () => {
    if (bodyDraft !== block.body) patch({ body: bodyDraft });
  };

  return (
    <Popover open={bodyOpen} onOpenChange={setBodyOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(CHAPTER_CANVAS_TOOLBAR_SURFACE, "z-50 gap-2")}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <select
            value={block.variant}
            onChange={(e) => {
              const variant = e.target.value as SystemBlockVariant;
              patch({ variant, accentColor: SYSTEM_BLOCK_VARIANT_CONFIG[variant].accent });
            }}
            className={cn(CHAPTER_CANVAS_TOOLBAR_FIELD_CLASS, "w-32 cursor-pointer")}
            title="Variante de la fenêtre système"
          >
            {(Object.entries(SYSTEM_BLOCK_VARIANT_CONFIG) as [SystemBlockVariant, { label: string }][]).map(([variant, cfg]) => (
              <option key={variant} value={variant}>{cfg.label}</option>
            ))}
          </select>

          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTitle(); } }}
            placeholder="TITRE"
            className={cn(CHAPTER_CANVAS_TOOLBAR_FIELD_CLASS, "w-36 font-mono uppercase")}
          />

          <PopoverTrigger asChild>
            <button
              type="button"
              className={chapterCanvasToolbarIconButtonClass(bodyOpen)}
              title="Éditer le corps du message"
            >
              <TextCursorInput className="h-4 w-4" />
            </button>
          </PopoverTrigger>

          {sep}

          <Popover open={accentOpen} onOpenChange={(o) => { if (!o) commitGesture(); setAccentOpen(o); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative shrink-0 flex items-center justify-center h-8 w-8 rounded-lg border border-border/80 shadow-sm hover:bg-muted/40 transition-colors"
                title="Couleur d'accent"
              >
                <div
                  className="w-5 h-5 rounded-md border border-border/50 shrink-0 pointer-events-none"
                  style={{ backgroundColor: block.accentColor }}
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
                value={block.accentColor}
                onChange={(hex, meta) => {
                  if (meta?.live) patchLive({ accentColor: hex });
                  else patch({ accentColor: hex });
                }}
                onLivePickEnd={commitGesture}
              />
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={() => patch({ showIcon: block.showIcon === false ? true : false })}
            className={chapterCanvasToolbarIconButtonClass(block.showIcon !== false)}
            title="Icône [!] dans l'en-tête"
          >
            <span className="text-xs font-bold leading-none">!</span>
          </button>
          <button
            type="button"
            onClick={() => patch({ showClose: !block.showClose })}
            className={chapterCanvasToolbarIconButtonClass(!!block.showClose)}
            title="Bouton ✕ (style RPG)"
          >
            <span className="text-xs font-bold leading-none">✕</span>
          </button>

          {sep}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className={chapterCanvasToolbarIconButtonClass(false)}
            title="Dupliquer la fenêtre"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={chapterCanvasToolbarIconButtonClass(false, "danger")}
            title="Supprimer la fenêtre"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </PopoverAnchor>

      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        className="w-[340px] p-4 rounded-2xl border border-border/80 shadow-2xl space-y-2"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Corps du message</p>
        <textarea
          value={bodyDraft}
          onChange={(e) => setBodyDraft(e.target.value)}
          onBlur={commitBody}
          placeholder={"Une ligne par retour à la ligne.\nLaisser vide = bandeau une ligne."}
          className="w-full resize-none text-sm bg-muted/40 rounded-xl border border-border/60 px-3 py-2.5 min-h-[110px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50 leading-relaxed font-mono"
          rows={5}
        />
        <p className="text-[11px] text-muted-foreground/70 leading-snug">
          Astuce : un corps vide transforme la fenêtre en bandeau de notification une ligne (pleine largeur, style Solo Leveling).
        </p>
      </PopoverContent>
    </Popover>
  );
}
