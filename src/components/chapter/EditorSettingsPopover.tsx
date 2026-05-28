import { useState, useRef, useEffect } from "react";
import { Settings, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
        <svg className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="fixed bottom-6 right-6 z-40 p-2.5 rounded-full glass border border-border shadow-dream hover:shadow-glow group transition-all duration-200"
          title="Préférences de l'éditeur"
        >
          <Settings className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors group-hover:rotate-45 duration-300" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={14}
        className="w-64 p-0 glass border border-border shadow-dream"
      >
        <div className="p-4 space-y-4">
          <div>
            <h3 className="font-display font-semibold text-sm text-foreground">Préférences éditeur</h3>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Ces réglages s'appliquent à tous les chapitres de l'édition.
            </p>
          </div>

          <div className="h-px bg-border/60" />

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
      </PopoverContent>
    </Popover>
  );
}
