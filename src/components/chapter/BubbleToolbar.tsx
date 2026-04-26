import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Copy, Trash2, FlipHorizontal2 } from "lucide-react";
import type { SpeechBubble } from "@/types";
import { getSpeechBubbleFillStroke, SPEECH_BUBBLE_NO_TAIL_TYPES } from "@/types";

interface BubbleToolbarProps {
  bubble: SpeechBubble;
  speechBubbles: SpeechBubble[];
  onUpdate: (next: SpeechBubble[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const FONTS = [
  { value: "inherit", label: "Défaut" },
  { value: "'Comic Neue', cursive", label: "Comic Neue" },
  { value: "'Bangers', cursive", label: "Bangers" },
  { value: "'Patrick Hand', cursive", label: "Patrick Hand" },
  { value: "'Permanent Marker', cursive", label: "Permanent Marker" },
  { value: "'Special Elite', serif", label: "Special Elite" },
  { value: "'Roboto Mono', monospace", label: "Roboto Mono" },
  { value: "'Gochi Hand', cursive", label: "Gochi Hand" },
  { value: "sans-serif", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
];

export function BubbleToolbar({ bubble, speechBubbles, onUpdate, onDuplicate, onDelete }: BubbleToolbarProps) {
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

  const sep = <div className="w-px h-5 bg-border/60 shrink-0 mx-0.5" />;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1.5 bg-background border border-border rounded-lg shadow-lg z-50 overflow-x-auto max-w-full">
      {/* Font */}
      <select
        value={bubble.style?.font ?? "inherit"}
        onChange={(e) => patchStyle({ font: e.target.value || undefined })}
        className="h-7 rounded-md border border-border/60 bg-background px-1.5 text-xs max-w-[110px] shrink-0"
      >
        {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      {/* Size */}
      <input
        type="number" min={8} max={72} value={size}
        onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patchStyle({ size: n }); }}
        className="h-7 w-12 rounded-md border border-border/60 bg-background text-xs text-center tabular-nums focus:outline-none shrink-0"
        title="Taille de police (px)"
      />

      {/* Bold / Italic */}
      <button
        type="button"
        onClick={() => patchStyle({ bold: !bubble.style?.bold })}
        className={`h-7 w-7 flex items-center justify-center rounded-md border font-bold transition-colors shrink-0 ${bubble.style?.bold ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"}`}
        title="Gras"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => patchStyle({ italic: !bubble.style?.italic })}
        className={`h-7 w-7 flex items-center justify-center rounded-md border italic font-medium transition-colors shrink-0 ${bubble.style?.italic ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"}`}
        title="Italique"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>

      {/* Text color */}
      <label className="relative cursor-pointer shrink-0" title="Couleur du texte">
        <div className="w-6 h-6 rounded border border-border/80 bg-background flex flex-col items-center justify-center gap-px">
          <span className="text-[11px] font-bold leading-none" style={{ color: bubble.style?.color ?? "#000000" }}>A</span>
          <div className="w-4 h-[3px] rounded-sm" style={{ background: bubble.style?.color ?? "#000000" }} />
        </div>
        <input
          type="color"
          value={bubble.style?.color ?? "#000000"}
          onChange={(e) => patchStyle({ color: e.target.value })}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>

      {sep}

      {/* Text alignment */}
      {(["left", "center", "right"] as const).map((align) => {
        const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
        return (
          <button
            key={align}
            type="button"
            onClick={() => patchStyle({ textAlign: align })}
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

          {/* Background color */}
          <label className="relative cursor-pointer shrink-0" title="Couleur de fond">
            <div className="w-6 h-6 rounded border border-border/80 shadow-inner" style={{ background: fillColor === "transparent" ? "#ffffff" : fillColor }} />
            <input
              type="color"
              value={fillColor === "transparent" ? "#ffffff" : fillColor}
              onChange={(e) => patch({ bgColor: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          {/* Border color */}
          <label className="relative cursor-pointer shrink-0" title="Couleur du contour">
            <div className="w-6 h-6 rounded" style={{ background: strokeColor === "transparent" ? "#000000" : strokeColor, outline: "1px solid hsl(var(--border) / 0.6)", outlineOffset: "1px" }} />
            <input
              type="color"
              value={strokeColor === "transparent" ? "#000000" : strokeColor}
              onChange={(e) => patch({ borderColor: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          {/* Border width */}
          <input
            type="number" min={0} max={12} value={borderWidth}
            onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patch({ borderWidth: n }); }}
            className="w-10 h-7 rounded-md border border-border/60 bg-background text-xs text-center tabular-nums shrink-0"
            title="Épaisseur du contour (px)"
          />

          {/* Tail flip */}
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

      {/* Duplicate */}
      <button
        type="button"
        onClick={onDuplicate}
        className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted/50 transition-colors shrink-0"
        title="Dupliquer"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>

      {/* Delete */}
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
