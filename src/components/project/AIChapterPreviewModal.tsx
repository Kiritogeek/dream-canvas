import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ── Props ─────────────────────────────────────────────────────

interface AIChapterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  chapterNumber: number;
  projectId: string;
  onAccept: (content: string) => void;
  isAccepting?: boolean;
}

// ── Rendu Format C avec prefixes transparents (alignement textarea) ──

function renderHighlight(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  text.split("\n").forEach((line, i) => {
    const scenePrefix = line.match(/^(###\s)/)?.[1];
    const bqPrefix = line.match(/^(>\s*)/)?.[1];
    let span: React.ReactNode;

    if (scenePrefix) {
      span = (
        <span key={`h-${i}`}>
          <span style={{ fontSize: 0 }}>{scenePrefix}</span>
          <span style={{ color: "hsl(275, 45%, 60%)", fontWeight: 700 }}>{line.slice(scenePrefix.length)}</span>
        </span>
      );
    } else if (bqPrefix) {
      const rest = line.slice(bqPrefix.length);
      const color = /^Personnages\s*:/i.test(rest)
        ? "hsl(275, 38%, 55%)"
        : "hsl(170, 40%, 55%)";
      span = (
        <span key={`h-${i}`}>
          <span style={{ fontSize: 0 }}>{bqPrefix}</span>
          <span style={{ color }}>{rest}</span>
        </span>
      );
    } else if (/^-{3,}\s*$/.test(line)) {
      span = <span key={`h-${i}`} style={{ color: "hsl(0, 0%, 58%)" }}>{line}</span>;
    } else if (/«/.test(line)) {
      span = (
        <span key={`h-${i}`} style={{ fontStyle: "italic", color: "hsl(275, 22%, 52%)" }}>
          {line}
        </span>
      );
    } else {
      span = (
        <span key={`h-${i}`} style={{ color: "hsl(var(--foreground))" }}>{line}</span>
      );
    }

    nodes.push(span);
    if (i < text.split("\n").length - 1) nodes.push("\n");
  });
  return nodes;
}

// ── Éditeur avec overlay de couleurs (même technique que l'éditeur principal) ──

const SHARED_STYLE: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "1rem",
  lineHeight: "1.8",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "break-word",
  padding: 0,
  margin: 0,
};

function InlineFormatCEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="relative">
      {/* Highlight — in-flow, drives height */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{ ...SHARED_STYLE, minHeight: 300 }}
      >
        {value ? renderHighlight(value) : (
          <span style={{ color: "transparent" }}>{" "}</span>
        )}
      </div>
      {/* Textarea transparente par-dessus */}
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full resize-none border-0 focus:ring-0 focus:outline-none bg-transparent overflow-hidden"
        style={{
          ...SHARED_STYLE,
          color: "transparent",
          caretColor: "hsl(var(--foreground))",
          height: "100%",
        }}
      />
    </div>
  );
}

// ── Nettoyage des marqueurs [TYPE] legacy ─────────────────────

function stripTypeMarkers(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\[[^\]]+\])\s*/);
      let cleaned = m ? line.slice(m[0].length) : line;
      cleaned = cleaned.replace(/\*([^*\n]+)\*/g, "$1");
      return cleaned;
    })
    .join("\n");
}

// ── Composant ────────────────────────────────────────────────

export function AIChapterPreviewModal({
  isOpen,
  onClose,
  content,
  chapterNumber,
  onAccept,
  isAccepting = false,
}: AIChapterPreviewModalProps) {
  const [editedContent, setEditedContent] = useState(() => stripTypeMarkers(content));

  useEffect(() => {
    if (isOpen) setEditedContent(stripTypeMarkers(content));
  }, [isOpen, content]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass max-w-3xl w-full max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ─────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-[hsl(var(--lavender)/0.15)]">
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span className="font-display text-xl font-semibold leading-tight">
              Chapitre {chapterNumber} — Proposition IA
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--lavender)/0.15)] text-[hsl(275_40%_45%)] dark:text-[hsl(var(--lavender))] border border-[hsl(var(--lavender)/0.3)]">
              <Sparkles className="h-3 w-3" />
              Généré par l'IA
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* ── Corps scrollable — toujours éditable ────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <InlineFormatCEditor value={editedContent} onChange={setEditedContent} />
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <DialogFooter className="shrink-0 px-6 py-4 border-t border-[hsl(var(--lavender)/0.15)] flex flex-row items-center justify-end gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isAccepting}
            className="gap-1.5 rounded-lg border-destructive/40 text-destructive hover:bg-destructive/8"
          >
            <X className="h-3.5 w-3.5" />
            Rejeter
          </Button>
          <Button
            size="sm"
            onClick={() => onAccept(editedContent)}
            disabled={isAccepting}
            className="gap-2 gradient-primary text-primary-foreground rounded-lg px-5 font-semibold shadow-dream hover:shadow-glow transition-shadow"
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Création…
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Accepter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
