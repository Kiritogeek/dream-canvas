import { useState, useRef } from "react";
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Copy, Trash2, FlipHorizontal2, Plus, Minus, Square, Blend } from "lucide-react";
import type { SpeechBubble } from "@/types";
import { getSpeechBubbleFillStroke, SPEECH_BUBBLE_NO_TAIL_TYPES } from "@/types";

interface BubbleToolbarProps {
  bubble: SpeechBubble;
  speechBubbles: SpeechBubble[];
  onUpdate: (next: SpeechBubble[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BubbleToolbar({ bubble, speechBubbles, onUpdate, onDuplicate, onDelete }: BubbleToolbarProps) {
  const [showBorderSlider, setShowBorderSlider] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);

  const patch = (changes: Partial<SpeechBubble>) =>
    onUpdate(speechBubbles.map((b) => (b.id === bubble.id ? { ...b, ...changes } : b)));

  const patchStyle = (changes: SpeechBubble["style"]) =>
    patch({ style: { ...bubble.style, ...changes } });

  const { fill: fillColor, stroke: strokeColor } = getSpeechBubbleFillStroke(bubble);
  const isText = bubble.type === "text";
  const hasNoTail = SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type);
  const size = bubble.style?.size ?? 14;
  const textAlign = bubble.style?.textAlign ?? "center";
  const borderWidth = bubble.borderWidth ?? 2;
  const bgTransparency = bubble.bgTransparency ?? 0;

  const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value);

  const saveRange = () => {
    const sel = window.getSelection();
    savedRangeRef.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
  };

  const restoreAndExec = (cmd: string, value?: string) => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRangeRef.current);
    }
    exec(cmd, value);
  };

  const fmtBtn = (title: string, Icon: React.ElementType, cmd: string, value?: string) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); exec(cmd, value); }}
      className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted/50 transition-colors shrink-0"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  const sep = <div className="w-px h-5 bg-border/60 shrink-0 mx-0.5" />;

  return (
    <div className="relative inline-flex items-center gap-1 px-2 py-1.5 bg-background border border-border rounded-lg shadow-lg z-50 overflow-x-auto max-w-full">

      {/* Border slider — apparaît inline quand actif */}
      {showBorderSlider && !isText && (
        <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 rounded px-2 py-0.5">
          <span className="text-[10px] text-muted-foreground">0</span>
          <input
            type="range" min={0} max={12} value={borderWidth}
            onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patch({ borderWidth: n }); }}
            className="w-20 accent-primary"
          />
          <span className="text-[10px] text-muted-foreground">12</span>
          <span className="text-xs tabular-nums font-mono text-foreground w-5">{borderWidth}</span>
        </div>
      )}

      {/* Taille : + [valeur] - */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); patchStyle({ size: Math.min(72, size + 1) }); }}
          className="h-7 w-6 flex items-center justify-center rounded-l-md border border-border/60 bg-background text-muted-foreground hover:bg-muted/50 transition-colors"
          title="Augmenter la taille"
        >
          <Plus className="h-2.5 w-2.5" />
        </button>
        <input
          type="number" min={8} max={72} value={size}
          onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patchStyle({ size: n }); }}
          className="h-7 w-10 border-y border-border/60 bg-background text-xs text-center tabular-nums focus:outline-none"
          title="Taille de police"
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); patchStyle({ size: Math.max(8, size - 1) }); }}
          className="h-7 w-6 flex items-center justify-center rounded-r-md border border-border/60 bg-background text-muted-foreground hover:bg-muted/50 transition-colors"
          title="Réduire la taille"
        >
          <Minus className="h-2.5 w-2.5" />
        </button>
      </div>

      {sep}

      {/* Formatage sélection (execCommand) */}
      {fmtBtn("Gras", Bold, "bold")}
      {fmtBtn("Italique", Italic, "italic")}
      {fmtBtn("Souligné", Underline, "underline")}
      {fmtBtn("Barré", Strikethrough, "strikeThrough")}

      {/* Couleur du texte — sauvegarde la sélection avant ouverture du picker */}
      <label
        className="relative cursor-pointer shrink-0"
        title="Couleur du texte"
        onMouseDown={saveRange}
      >
        <div className="w-6 h-6 rounded border border-border/80 bg-background flex flex-col items-center justify-center gap-px">
          <span className="text-[11px] font-bold leading-none" style={{ color: bubble.style?.color ?? "#000000" }}>A</span>
          <div className="w-4 h-[3px] rounded-sm" style={{ background: bubble.style?.color ?? "#000000" }} />
        </div>
        <input
          type="color"
          value={bubble.style?.color ?? "#000000"}
          onChange={(e) => {
            restoreAndExec("foreColor", e.target.value);
            patchStyle({ color: e.target.value });
          }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>

      {sep}

      {/* Alignement */}
      {(["left", "center", "right"] as const).map((align) => {
        const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
        return (
          <button
            key={align}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); patchStyle({ textAlign: align }); }}
            className={`h-7 w-7 flex items-center justify-center rounded-md border transition-colors shrink-0 ${textAlign === align ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"}`}
            title={align === "left" ? "Gauche" : align === "center" ? "Centre" : "Droite"}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}

      {!isText && (
        <>
          {sep}

          {/* Couleur de fond */}
          <label className="relative cursor-pointer shrink-0" title="Couleur de fond">
            <div className="w-6 h-6 rounded border border-border/80 shadow-inner" style={{ background: fillColor === "transparent" ? "#ffffff" : fillColor }} />
            <input
              type="color"
              value={fillColor === "transparent" ? "#ffffff" : fillColor}
              onChange={(e) => patch({ bgColor: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          {/* Couleur du contour */}
          <label className="relative cursor-pointer shrink-0" title="Couleur du contour">
            <div className="w-6 h-6 rounded" style={{ background: strokeColor === "transparent" ? "#000000" : strokeColor, outline: "1px solid hsl(var(--border) / 0.6)", outlineOffset: "1px" }} />
            <input
              type="color"
              value={strokeColor === "transparent" ? "#000000" : strokeColor}
              onChange={(e) => patch({ borderColor: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          {/* Épaisseur du contour */}
          <button
            type="button"
            onClick={() => setShowBorderSlider((v) => !v)}
            className={`h-7 w-7 flex items-center justify-center rounded-md border transition-colors shrink-0 ${showBorderSlider ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"}`}
            title={`Épaisseur contour (${borderWidth}px)`}
          >
            <Square className="h-3.5 w-3.5" />
          </button>

          {/* Transparence du fond */}
          <div className="flex items-center gap-1 shrink-0" title="Transparence du fond (%)">
            <Blend className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="range" min={0} max={100} value={bgTransparency}
              onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patch({ bgTransparency: n }); }}
              className="w-16 accent-primary"
            />
            <span className="text-[10px] tabular-nums text-muted-foreground w-7">{bgTransparency}%</span>
          </div>

          {/* Retourner la queue */}
          {!hasNoTail && (
            <button
              type="button"
              onClick={() => patch({ tailFlip: !bubble.tailFlip })}
              className={`h-7 w-7 flex items-center justify-center rounded-md border transition-colors shrink-0 ${bubble.tailFlip ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"}`}
              title="Retourner la queue"
            >
              <FlipHorizontal2 className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}

      <div className="flex-1 min-w-2" />

      {/* Dupliquer */}
      <button
        type="button"
        onClick={onDuplicate}
        className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted/50 transition-colors shrink-0"
        title="Dupliquer"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>

      {/* Supprimer */}
      <button
        type="button"
        onClick={onDelete}
        className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-background text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        title="Supprimer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
