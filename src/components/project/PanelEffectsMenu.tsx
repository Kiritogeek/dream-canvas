// ═══════════════════════════════════════════════════════════════
// PanelEffectsMenu — Couleurs (blocs) + Bulles de dialogue (drag & drop)
// ═══════════════════════════════════════════════════════════════

import { Palette, MessageSquare, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { Panel, PanelBackgroundStyle, SpeechBubble } from "@/types";

/** Blocs de couleurs prédéfinis pour le fond du panel */
const COLOR_BLOCKS = [
  { label: "Blanc", color: "#ffffff" },
  { label: "Noir", color: "#1a1a1a" },
  { label: "Gris clair", color: "#e5e5e5" },
  { label: "Gris foncé", color: "#404040" },
  { label: "Crème", color: "#f5f0e6" },
  { label: "Bleu nuit", color: "#1e3a5f" },
  { label: "Lavande", color: "#e6e6fa" },
  { label: "Menthe", color: "#e8f5e9" },
  { label: "Pêche", color: "#ffdab9" },
  { label: "Ambre", color: "#ffbf00" },
  { label: "Rouge doux", color: "#ffebee" },
  { label: "Transparent", color: "transparent" },
] as const;

interface PanelEffectsMenuProps {
  panel: Panel;
  onUpdate: (updates: {
    background_style?: PanelBackgroundStyle | null;
    speech_bubbles?: SpeechBubble[];
  }) => void;
}

export function PanelEffectsMenu({ panel, onUpdate }: PanelEffectsMenuProps) {
  const backgroundStyle = (panel.background_style as PanelBackgroundStyle | null | undefined) ?? null;
  const speechBubbles = (panel.speech_bubbles as SpeechBubble[] | null) ?? [];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground mb-3">Menu Effets</h4>

      {/* Section Couleurs — blocs de couleurs */}
      <Collapsible defaultOpen className="border border-border/60 rounded-lg">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-3 hover:bg-muted/30 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Couleurs</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground data-[state=open]:rotate-180 transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3 border-t border-border/60">
            <p className="text-xs text-muted-foreground/80">Choisir une couleur de fond pour le panel</p>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_BLOCKS.map(({ label, color }) => {
                const isSelected = (backgroundStyle?.color ?? "") === color;
                return (
                  <button
                    key={color}
                    type="button"
                    title={label}
                    onClick={() => onUpdate({ background_style: { color: color === "transparent" ? undefined : color } })}
                    className={`rounded-lg border-2 h-9 transition-all ${
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-border/60 hover:border-primary/50"
                    }`}
                    style={{
                      backgroundColor: color === "transparent" ? "hsl(var(--muted))" : color,
                      boxShadow: color === "transparent" ? "inset 0 0 0 1px hsl(var(--border))" : undefined,
                    }}
                    aria-label={label}
                  />
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section Bulles — drag & drop */}
      <Collapsible defaultOpen className="border border-border/60 rounded-lg">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-3 hover:bg-muted/30 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Bulles de dialogue</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground data-[state=open]:rotate-180 transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3 border-t border-border/60">
            <p className="text-xs text-muted-foreground/80">Glisser-déposer sur le panel</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "speech", label: "Parole", icon: "💬" },
                { type: "thought", label: "Pensée", icon: "💭" },
                { type: "shout", label: "Cri", icon: "📢" },
                { type: "whisper", label: "Chuchotement", icon: "🔇" },
                { type: "narration", label: "Narration", icon: "📝" },
              ].map((bubble) => (
                <div
                  key={bubble.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify({ type: "speech-bubble", bubbleType: bubble.type })
                    );
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="cursor-grab active:cursor-grabbing rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-2 justify-center"
                >
                  <span>{bubble.icon}</span>
                  <span className="text-xs">{bubble.label}</span>
                </div>
              ))}
            </div>
            {speechBubbles.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-2">Aucune bulle — déposez-en sur le panel</p>
            ) : (
              <div className="space-y-2">
                {speechBubbles.map((bubble) => (
                  <div key={bubble.id} className="rounded-lg border border-border/60 bg-muted/20 p-2 flex items-center justify-between gap-2">
                    <span className="text-xs truncate">{bubble.text || bubble.type}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => {
                        onUpdate({
                          speech_bubbles: speechBubbles.filter((b) => b.id !== bubble.id),
                        });
                      }}
                      aria-label="Supprimer la bulle"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
