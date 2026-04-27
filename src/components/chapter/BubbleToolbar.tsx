import { useState, useRef, useEffect } from "react";
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
  const [showTransparencySlider, setShowTransparencySlider] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);

  // Active state pour les boutons de formatage (mis à jour à chaque changement de sélection)
  const [fmtState, setFmtState] = useState({ bold: false, italic: false, underline: false, strikeThrough: false });
  useEffect(() => {
    const update = () => {
      try {
        setFmtState({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
          strikeThrough: document.queryCommandState("strikeThrough"),
        });
      } catch { /* ignore si pas de contenteditable */ }
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);

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

  // Applique le format sur la sélection (execCommand) OU en CSS sur toute la bulle si pas de contenteditable actif
  const applyFmt = (e: React.MouseEvent, styleKey: "bold" | "italic" | "underline" | "strikethrough", cmd: string) => {
    e.preventDefault();
    const success = document.execCommand(cmd, false, undefined);
    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && !sel.isCollapsed;
    // Si execCommand échoue (pas de contenteditable actif) ou si pas de sélection → toggle CSS
    if (!success || !hasSelection) {
      patchStyle({ [styleKey]: !bubble.style?.[styleKey] });
    }
  };

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
    document.execCommand(cmd, false, value);
  };

  const sep = <div className="w-px h-5 bg-border/60 shrink-0 mx-0.5" />;

  // Classes bouton avec état actif/inactif
  const btnCls = (active: boolean) =>
    `h-7 w-7 flex items-center justify-center rounded-md border transition-colors shrink-0 ${active ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"}`;

  return (
    <div className="relative inline-block">
      {/* Toolbar secondaire — apparaît juste en dessous */}
      {(showBorderSlider || showTransparencySlider) && !isText && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 flex items-center gap-3 px-3 py-2 bg-background border border-border rounded-lg shadow-lg z-50 whitespace-nowrap">
          {showBorderSlider && (
            <>
              <span className="text-xs text-muted-foreground shrink-0">Contour</span>
              <input
                type="range" min={0} max={12} value={borderWidth}
                onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patch({ borderWidth: n }); }}
                className="w-28 accent-primary"
              />
              <span className="text-xs tabular-nums text-foreground w-7 text-right">{borderWidth}px</span>
            </>
          )}
          {showTransparencySlider && (
            <>
              <span className="text-xs text-muted-foreground shrink-0">Transparence</span>
              <input
                type="range" min={0} max={100} value={bgTransparency}
                onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patch({ bgTransparency: n }); }}
                className="w-28 accent-primary"
              />
              <span className="text-xs tabular-nums text-foreground w-8 text-right">{bgTransparency}%</span>
            </>
          )}
        </div>
      )}

    <div className="inline-flex items-center gap-1 px-2 py-1.5 bg-background border border-border rounded-lg shadow-lg z-50 overflow-x-auto max-w-full">

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

      {/* Gras */}
      <button type="button" title="Gras" onMouseDown={(e) => applyFmt(e, "bold", "bold")}
        className={btnCls(!!bubble.style?.bold || fmtState.bold)}>
        <Bold className="h-3.5 w-3.5" />
      </button>

      {/* Italique */}
      <button type="button" title="Italique" onMouseDown={(e) => applyFmt(e, "italic", "italic")}
        className={btnCls(!!bubble.style?.italic || fmtState.italic)}>
        <Italic className="h-3.5 w-3.5" />
      </button>

      {/* Souligné */}
      <button type="button" title="Souligné" onMouseDown={(e) => applyFmt(e, "underline", "underline")}
        className={btnCls(!!bubble.style?.underline || fmtState.underline)}>
        <Underline className="h-3.5 w-3.5" />
      </button>

      {/* Barré */}
      <button type="button" title="Barré" onMouseDown={(e) => applyFmt(e, "strikethrough", "strikeThrough")}
        className={btnCls(!!bubble.style?.strikethrough || fmtState.strikeThrough)}>
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      {/* Couleur du texte */}
      <label className="relative cursor-pointer shrink-0" title="Couleur du texte" onMouseDown={saveRange}>
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
            className={btnCls(textAlign === align)}
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
            <input type="color" value={fillColor === "transparent" ? "#ffffff" : fillColor}
              onChange={(e) => patch({ bgColor: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          </label>

          {/* Couleur du contour */}
          <label className="relative cursor-pointer shrink-0" title="Couleur du contour">
            <div className="w-6 h-6 rounded" style={{ background: strokeColor === "transparent" ? "#000000" : strokeColor, outline: "1px solid hsl(var(--border) / 0.6)", outlineOffset: "1px" }} />
            <input type="color" value={strokeColor === "transparent" ? "#000000" : strokeColor}
              onChange={(e) => patch({ borderColor: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          </label>

          {/* Épaisseur du contour */}
          <button type="button" onClick={() => { setShowBorderSlider((v) => !v); setShowTransparencySlider(false); }}
            className={btnCls(showBorderSlider)}
            title={`Épaisseur contour (${borderWidth}px)`}>
            <Square className="h-3.5 w-3.5" />
          </button>

          {/* Transparence du fond */}
          <button type="button" onClick={() => { setShowTransparencySlider((v) => !v); setShowBorderSlider(false); }}
            className={btnCls(showTransparencySlider || bgTransparency > 0)}
            title={`Transparence du fond (${bgTransparency}%)`}>
            <Blend className="h-3.5 w-3.5" />
          </button>

          {/* Retourner la queue */}
          {!hasNoTail && (
            <button type="button" onClick={() => patch({ tailFlip: !bubble.tailFlip })}
              className={btnCls(!!bubble.tailFlip)}
              title="Retourner la queue">
              <FlipHorizontal2 className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}

      <div className="flex-1 min-w-2" />

      {/* Dupliquer */}
      <button type="button" onClick={onDuplicate}
        className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted/50 transition-colors shrink-0"
        title="Dupliquer">
        <Copy className="h-3.5 w-3.5" />
      </button>

      {/* Supprimer */}
      <button type="button" onClick={onDelete}
        className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-background text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        title="Supprimer">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
    </div>
  );
}
