import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Settings, Check, X } from "lucide-react";
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
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border hover:bg-muted/60 transition-colors text-sm"
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
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-50 py-1 max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange("inherit"); setOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${value === "inherit" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"}`}
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
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${value === f.value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"}`}
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
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const portal = createPortal(
    <>
      {/* Bouton engrenage */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Préférences de l'éditeur"
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9000 }}
        className={`p-2.5 rounded-full border shadow-lg transition-all duration-200 group ${
          open
            ? "bg-primary border-primary/60 text-primary-foreground"
            : "bg-background border-border hover:border-[hsl(var(--lavender)/0.5)] hover:bg-muted"
        }`}
      >
        <Settings
          className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-90" : "group-hover:rotate-45"}`}
        />
      </button>

      {/* Panneau paramètres */}
      {open && (
        <div
          ref={panelRef}
          style={{ position: "fixed", bottom: 76, right: 24, zIndex: 9001 }}
          className="w-64 rounded-xl border border-border bg-background shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground">Préférences éditeur</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Appliqué à tous les chapitres
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Typo par défaut (bulles)
              </span>
              <FontPickerInline
                value={settings.defaultBubbleFont}
                onChange={(v) => onUpdateSettings({ defaultBubbleFont: v })}
              />
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );

  return portal;
}
