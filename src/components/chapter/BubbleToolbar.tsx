import { useState, useRef, useEffect } from "react";
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Copy, Trash2, FlipHorizontal2, Plus, Minus, Square, Blend, ChevronDown, ChevronLeft } from "lucide-react";
import type { SpeechBubble } from "@/types";
import { getSpeechBubbleFillStroke, SPEECH_BUBBLE_NO_TAIL_TYPES } from "@/types";

const FONTS = [
  { value: "inherit",                     label: "Défaut" },
  { value: "'Bangers', cursive",          label: "Bangers" },
  { value: "'Gochi Hand', cursive",       label: "Gochi Hand" },
  { value: "'Comic Neue', cursive",       label: "Comic Neue" },
  { value: "'Patrick Hand', cursive",     label: "Patrick Hand" },
  { value: "'Permanent Marker', cursive", label: "Marker" },
  { value: "'Special Elite', cursive",    label: "Special Elite" },
  { value: "'Roboto Mono', monospace",    label: "Mono" },
] as const;

const ALIGN_CYCLE = ["center", "left", "right"] as const;

interface BubbleToolbarProps {
  bubble: SpeechBubble;
  speechBubbles: SpeechBubble[];
  onUpdate: (next: SpeechBubble[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  tailContext?: boolean;
  onTailContextChange?: (v: boolean) => void;
}

export function BubbleToolbar({ bubble, speechBubbles, onUpdate, onDuplicate, onDelete, tailContext = false, onTailContextChange }: BubbleToolbarProps) {
  const [showBorderSlider, setShowBorderSlider] = useState(false);
  const [showTransparencySlider, setShowTransparencySlider] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [fontDropdownPos, setFontDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const fontDropdownRef = useRef<HTMLDivElement | null>(null);
  const fontBtnRef = useRef<HTMLButtonElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

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
      } catch { /* ignore */ }
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);

  useEffect(() => {
    if (!showFontDropdown) return;
    const handler = (e: MouseEvent) => {
      const inDropdown = fontDropdownRef.current?.contains(e.target as Node);
      const inButton = fontBtnRef.current?.contains(e.target as Node);
      if (!inDropdown && !inButton) setShowFontDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFontDropdown]);

  const patch = (changes: Partial<SpeechBubble>) =>
    onUpdate(speechBubbles.map((b) => (b.id === bubble.id ? { ...b, ...changes } : b)));

  const patchStyle = (changes: SpeechBubble["style"]) =>
    patch({ style: { ...bubble.style, ...changes } });

  const { fill: fillColor, stroke: strokeColor } = getSpeechBubbleFillStroke(bubble);
  const isText = bubble.type === "text";
  const hasNoTail = SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type);
  const textAlign = bubble.style?.textAlign ?? "center";
  const borderWidth = bubble.borderWidth ?? 2;
  const bgTransparency = bubble.bgTransparency ?? 0;
  const currentFont = bubble.style?.font ?? "inherit";
  const currentFontLabel = FONTS.find((f) => f.value === currentFont)?.label ?? "Défaut";

  const AlignIcon = textAlign === "left" ? AlignLeft : textAlign === "right" ? AlignRight : AlignCenter;
  const alignTitle = textAlign === "left" ? "Gauche" : textAlign === "right" ? "Droite" : "Centre";
  const cycleAlign = () => {
    const next = ALIGN_CYCLE[(ALIGN_CYCLE.indexOf(textAlign) + 1) % ALIGN_CYCLE.length];
    patchStyle({ textAlign: next });
  };

  const applyFmt = (e: React.MouseEvent, styleKey: "bold" | "italic" | "underline" | "strikethrough", cmd: string) => {
    e.preventDefault();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand(cmd, false, undefined);
    } else {
      patchStyle({ [styleKey]: !bubble.style?.[styleKey] });
    }
  };

  const hasBoldInHtml = /<b[\s/>]|<strong[\s/>]/i.test(bubble.text);
  const hasItalicInHtml = /<i[\s/>]|<em[\s/>]/i.test(bubble.text);
  const hasUnderlineInHtml = /<u[\s/>]/i.test(bubble.text);
  const hasStrikeInHtml = /<s[\s/>]|<strike[\s/>]|<del[\s/>]/i.test(bubble.text);

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

  // Toolbar container : rounded-xl (12px) — boutons : rounded-md (6px) → continuité visuelle
  const btnCls = (active: boolean) =>
    `h-7 w-7 flex items-center justify-center rounded-md border transition-colors shrink-0 ${active ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"}`;

  // ── Mode queue : toolbar dédiée ──────────────────────────────────────────
  if (tailContext && !hasNoTail) {
    const tailBaseWidth = bubble.tailBaseWidth ?? 28;
    const tailCurve = bubble.tailCurve ?? 0;
    return (
      <div className="relative inline-block">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-xl shadow-lg z-50">
          <button
            type="button"
            onClick={() => onTailContextChange?.(false)}
            className="h-7 flex items-center gap-1 px-2 rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted/50 transition-colors text-xs shrink-0"
            title="Retour aux options de la bulle"
          >
            <ChevronLeft className="h-3 w-3" />
            Bulle
          </button>
          {sep}
          <span className="text-xs text-muted-foreground shrink-0">Largeur</span>
          <input
            type="range" min={8} max={50} value={tailBaseWidth}
            onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patch({ tailBaseWidth: n }); }}
            className="w-24 accent-primary"
            title={`Largeur de base : ${tailBaseWidth}px`}
          />
          <span className="text-xs tabular-nums text-foreground w-8 text-right shrink-0">{tailBaseWidth}px</span>
          {sep}
          <span className="text-xs text-muted-foreground shrink-0">Courbure</span>
          <input
            type="range" min={-100} max={100} value={tailCurve}
            onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patch({ tailCurve: n }); }}
            className="w-24 accent-primary"
            title={`Courbure : ${tailCurve}`}
          />
          <span className="text-xs tabular-nums text-foreground w-8 text-right shrink-0">{tailCurve > 0 ? `+${tailCurve}` : tailCurve}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      {/* Dropdown police — fixed pour échapper au overflow-x-auto de la toolbar */}
      {showFontDropdown && fontDropdownPos && (
        <div
          ref={fontDropdownRef}
          className="fixed bg-background border border-border rounded-lg shadow-lg z-[200] w-[160px] py-1 overflow-hidden"
          style={{ top: fontDropdownPos.top, left: fontDropdownPos.left }}
        >
          {FONTS.map((f) => (
            <button
              key={f.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                patchStyle({ font: f.value });
                setShowFontDropdown(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${currentFont === f.value ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted/50"}`}
              style={{ fontFamily: f.value === "inherit" ? undefined : f.value }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar secondaire sliders */}
      {(showBorderSlider || showTransparencySlider) && !isText && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 flex items-center gap-3 px-3 py-2 bg-background border border-border rounded-xl shadow-lg z-50 whitespace-nowrap">
          {showBorderSlider && (
            <>
              <span className="text-xs text-muted-foreground shrink-0">Contour</span>
              <input type="range" min={0} max={12} value={borderWidth}
                onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patch({ borderWidth: n }); }}
                className="w-28 accent-primary" />
              <span className="text-xs tabular-nums text-foreground w-7 text-right">{borderWidth}px</span>
            </>
          )}
          {showTransparencySlider && (
            <>
              <span className="text-xs text-muted-foreground shrink-0">Transparence</span>
              <input type="range" min={0} max={100} value={bgTransparency}
                onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patch({ bgTransparency: n }); }}
                className="w-28 accent-primary" />
              <span className="text-xs tabular-nums text-foreground w-8 text-right">{bgTransparency}%</span>
            </>
          )}
        </div>
      )}

      <div className="inline-flex items-center gap-1 px-2 py-1.5 bg-background border border-border rounded-xl shadow-lg z-50 overflow-x-auto max-w-full">

        {/* Police — dropdown custom (fixed pour échapper à overflow-x-auto) */}
        <div className="relative shrink-0">
          <button
            ref={fontBtnRef}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              if (!showFontDropdown && fontBtnRef.current) {
                const r = fontBtnRef.current.getBoundingClientRect();
                setFontDropdownPos({ top: r.bottom + 6, left: r.left });
              }
              setShowFontDropdown((v) => !v);
            }}
            className="h-7 px-2 flex items-center gap-1 rounded-md border border-border/60 bg-background text-foreground hover:bg-muted/50 transition-colors"
            title="Police"
          >
            <span
              className="text-xs leading-none"
              style={{ fontFamily: currentFont === "inherit" ? undefined : currentFont, minWidth: 60 }}
            >
              {currentFontLabel}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </button>
        </div>

        {sep}

        {/* Taille : - [valeur] + */}
        <div className="flex items-center shrink-0">
          <button type="button"
            onMouseDown={(e) => { e.preventDefault(); patchStyle({ size: Math.max(8, (bubble.style?.size ?? 14) - 1) }); }}
            className="h-7 w-6 flex items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted/50 transition-colors"
            title="Réduire la taille">
            <Minus className="h-2.5 w-2.5" />
          </button>
          <input
            type="number" min={8} max={72} value={bubble.style?.size ?? 14}
            onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) patchStyle({ size: n }); }}
            className="h-7 w-10 border-y border-border/60 bg-background text-xs text-center tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            title="Taille de police"
          />
          <button type="button"
            onMouseDown={(e) => { e.preventDefault(); patchStyle({ size: Math.min(72, (bubble.style?.size ?? 14) + 1) }); }}
            className="h-7 w-6 flex items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted/50 transition-colors"
            title="Augmenter la taille">
            <Plus className="h-2.5 w-2.5" />
          </button>
        </div>

        {sep}

        {/* Gras */}
        <button type="button" title="Gras" onMouseDown={(e) => applyFmt(e, "bold", "bold")}
          className={btnCls((bubble.style?.bold ?? false) || hasBoldInHtml || fmtState.bold)}>
          <Bold className="h-3.5 w-3.5" />
        </button>

        {/* Italique */}
        <button type="button" title="Italique" onMouseDown={(e) => applyFmt(e, "italic", "italic")}
          className={btnCls((bubble.style?.italic ?? false) || hasItalicInHtml || fmtState.italic)}>
          <Italic className="h-3.5 w-3.5" />
        </button>

        {/* Souligné */}
        <button type="button" title="Souligné" onMouseDown={(e) => applyFmt(e, "underline", "underline")}
          className={btnCls((bubble.style?.underline ?? false) || hasUnderlineInHtml || fmtState.underline)}>
          <Underline className="h-3.5 w-3.5" />
        </button>

        {/* Barré */}
        <button type="button" title="Barré" onMouseDown={(e) => applyFmt(e, "strikethrough", "strikeThrough")}
          className={btnCls((bubble.style?.strikethrough ?? false) || hasStrikeInHtml || fmtState.strikeThrough)}>
          <Strikethrough className="h-3.5 w-3.5" />
        </button>

        {/* Couleur du texte */}
        <label className="relative cursor-pointer shrink-0" title="Couleur du texte" onMouseDown={saveRange}>
          <div className="w-7 h-7 rounded-md border border-border/60 bg-background hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-[2px]">
            <span className="text-[12px] font-bold leading-none text-foreground">A</span>
            <div className="w-4 h-[3px] rounded-full" style={{ background: bubble.style?.color ?? "#000000" }} />
          </div>
          <input type="color" value={bubble.style?.color ?? "#000000"}
            onChange={(e) => { restoreAndExec("foreColor", e.target.value); patchStyle({ color: e.target.value }); }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        </label>

        {sep}

        {/* Alignement — cycle centre → gauche → droite → centre */}
        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); cycleAlign(); }}
          className={btnCls(true)}
          title={`Alignement : ${alignTitle}`}>
          <AlignIcon className="h-3.5 w-3.5" />
        </button>

        {!isText && (
          <>
            {sep}

            {/* Couleur de fond */}
            <label className="relative cursor-pointer shrink-0" title="Couleur de fond">
              <div className="w-7 h-7 rounded-md border border-border/60" style={{ background: fillColor === "transparent" ? "#ffffff" : fillColor }} />
              <input type="color" value={fillColor === "transparent" ? "#ffffff" : fillColor}
                onChange={(e) => patch({ bgColor: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </label>

            {/* Couleur du contour */}
            <label className="relative cursor-pointer shrink-0" title="Couleur du contour">
              <div className="w-7 h-7 rounded-md border-2" style={{ background: strokeColor === "transparent" ? "#000000" : strokeColor, borderColor: strokeColor === "transparent" ? "hsl(var(--border))" : strokeColor, outline: "1px solid hsl(var(--border) / 0.6)", outlineOffset: "1px" }} />
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
