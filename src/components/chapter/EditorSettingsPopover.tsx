import { useState, useRef, useEffect } from "react";
import { Settings, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FONT_CATEGORIES, FONTS } from "./bubbleFonts";
import type { EditorSettings } from "@/hooks/useEditorSettings";

interface EditorSettingsPopoverProps {
  settings: EditorSettings;
  onUpdateSettings: (updates: Partial<EditorSettings>) => void;
}

function FontPickerInline({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentLabel = FONTS.find((f) => f.value === value)?.label ?? "Défaut";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-border hover:bg-muted/60 transition-colors text-sm"
        style={{ fontFamily: value === "inherit" ? undefined : value }}
      >
        <span className="truncate">{currentLabel}</span>
        <svg
          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-background border border-border rounded-lg shadow-xl z-[200] py-1 max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange("inherit"); setOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${value === "inherit" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"}`}
          >
            Défaut
            {value === "inherit" && <Check className="h-3 w-3 shrink-0" />}
          </button>
          {FONT_CATEGORIES.map(({ category, fonts }) => (
            <div key={category}>
              <div className="px-3 py-1 mt-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 border-t border-border/50">
                {category}
              </div>
              {fonts.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => { onChange(f.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${value === f.value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"}`}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                  {value === f.value && <Check className="h-3 w-3 shrink-0" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditorSettingsPopover({ settings, onUpdateSettings }: EditorSettingsPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bouton engrenage — design distinct du rail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Préférences de l'éditeur"
        className="w-full aspect-square min-h-9 rounded-lg flex items-center justify-center transition-all duration-200 bg-[hsl(var(--lavender)/0.18)] hover:bg-[hsl(var(--lavender)/0.30)] border border-[hsl(var(--lavender)/0.35)] hover:border-[hsl(var(--lavender)/0.55)] text-[hsl(var(--lavender))] hover:shadow-[0_0_12px_hsl(var(--lavender)/0.25)]"
      >
        <Settings className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" strokeWidth={1.75} />
      </button>

      {/* Popup modale centrée */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border border-border shadow-dream max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-semibold text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-[hsl(var(--lavender))]" strokeWidth={1.75} />
              Préférences éditeur
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-1 pb-1">
            Ces réglages s'appliquent à tous les chapitres de l'édition.
          </p>

          <div className="h-px bg-border/60" />

          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Typo par défaut (bulles)
            </span>
            <FontPickerInline
              value={settings.defaultBubbleFont}
              onChange={(v) => onUpdateSettings({ defaultBubbleFont: v })}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
