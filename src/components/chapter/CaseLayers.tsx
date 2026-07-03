import React, { useState } from "react";
import { ImageIcon, Square, MessageSquare, ChevronDown, Zap, MonitorCheck } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getPanelBlocks,
  getPanelColorBlocks,
  getPanelSpeechBubbles,
  getPanelSfxBlocks,
  getPanelSystemBlocks,
} from "@/services/panels";
import { SPEECH_BUBBLE_TYPE_LABELS, SYSTEM_BLOCK_VARIANT_CONFIG } from "@/types";
import type { Panel, SpeechBubbleType } from "@/types";
import { cn } from "@/lib/utils";

interface CaseLayersProps {
  panel: Panel;
  selectedBlockId: { panelId: string; blockId: string } | null;
  selectedColorBlockId: { panelId: string; colorBlockId: string } | null;
  selectedSpeechBubbleId: { panelId: string; bubbleId: string } | null;
  selectedSfxId?: { panelId: string; sfxId: string } | null;
  selectedSystemBlockId?: { panelId: string; systemBlockId: string } | null;
  onSelectBlock: (v: { panelId: string; blockId: string } | null) => void;
  onSelectColorBlock: (v: { panelId: string; colorBlockId: string } | null) => void;
  onSelectSpeechBubble: (v: { panelId: string; bubbleId: string } | null) => void;
  onSelectSfx?: (v: { panelId: string; sfxId: string } | null) => void;
  onSelectSystemBlock?: (v: { panelId: string; systemBlockId: string } | null) => void;
  onScrollToY?: (logicalY: number) => void;
}

export function CaseLayers({
  panel,
  selectedBlockId,
  selectedColorBlockId,
  selectedSpeechBubbleId,
  selectedSfxId,
  selectedSystemBlockId,
  onSelectBlock,
  onSelectColorBlock,
  onSelectSpeechBubble,
  onSelectSfx,
  onSelectSystemBlock,
  onScrollToY,
}: CaseLayersProps) {
  const [imagesOpen, setImagesOpen] = useState(true);
  const [couleursOpen, setCouleursOpen] = useState(true);
  const [bullesOpen, setBullesOpen] = useState(true);
  const [sfxOpen, setSfxOpen] = useState(true);
  const [systemOpen, setSystemOpen] = useState(true);

  const blocks = [...getPanelBlocks(panel)].reverse();
  const colorBlocks = [...getPanelColorBlocks(panel)].reverse();
  const speechBubbles = [...getPanelSpeechBubbles(panel)].reverse();
  const sfxBlocks = [...getPanelSfxBlocks(panel)].reverse();
  const systemBlocks = [...getPanelSystemBlocks(panel)].reverse();

  const handleSelectSfx = (sfxId: string) => {
    if (!onSelectSfx) return;
    const sfx = getPanelSfxBlocks(panel).find((s) => s.id === sfxId);
    if (sfx) onScrollToY?.(sfx.y + sfx.height / 2);
    const isSelected = selectedSfxId?.panelId === panel.id && selectedSfxId.sfxId === sfxId;
    onSelectSfx(isSelected ? null : { panelId: panel.id, sfxId });
    onSelectBlock(null);
    onSelectColorBlock(null);
    onSelectSpeechBubble(null);
    onSelectSystemBlock?.(null);
  };

  const handleSelectSystemBlock = (systemBlockId: string) => {
    if (!onSelectSystemBlock) return;
    const sb = getPanelSystemBlocks(panel).find((s) => s.id === systemBlockId);
    if (sb) onScrollToY?.(sb.y + sb.height / 2);
    const isSelected = selectedSystemBlockId?.panelId === panel.id && selectedSystemBlockId.systemBlockId === systemBlockId;
    onSelectSystemBlock(isSelected ? null : { panelId: panel.id, systemBlockId });
    onSelectBlock(null);
    onSelectColorBlock(null);
    onSelectSpeechBubble(null);
    onSelectSfx?.(null);
  };

  const handleSelectBlock = (blockId: string) => {
    const block = getPanelBlocks(panel).find((b) => b.id === blockId);
    if (block) onScrollToY?.(block.y + block.height / 2);
    const isSelected = selectedBlockId?.panelId === panel.id && selectedBlockId.blockId === blockId;
    onSelectBlock(isSelected ? null : { panelId: panel.id, blockId });
    onSelectColorBlock(null);
    onSelectSpeechBubble(null);
    onSelectSfx?.(null);
    onSelectSystemBlock?.(null);
  };

  const handleSelectColorBlock = (colorBlockId: string) => {
    const cb = getPanelColorBlocks(panel).find((c) => c.id === colorBlockId);
    if (cb) onScrollToY?.(cb.y + cb.height / 2);
    const isSelected = selectedColorBlockId?.panelId === panel.id && selectedColorBlockId.colorBlockId === colorBlockId;
    onSelectColorBlock(isSelected ? null : { panelId: panel.id, colorBlockId });
    onSelectBlock(null);
    onSelectSpeechBubble(null);
    onSelectSfx?.(null);
    onSelectSystemBlock?.(null);
  };

  const handleSelectSpeechBubble = (bubbleId: string) => {
    const bubble = getPanelSpeechBubbles(panel).find((b) => b.id === bubbleId);
    if (bubble) onScrollToY?.(bubble.position.y + bubble.height / 2);
    const isSelected = selectedSpeechBubbleId?.panelId === panel.id && selectedSpeechBubbleId.bubbleId === bubbleId;
    onSelectSpeechBubble(isSelected ? null : { panelId: panel.id, bubbleId });
    onSelectBlock(null);
    onSelectColorBlock(null);
    onSelectSfx?.(null);
    onSelectSystemBlock?.(null);
  };

  return (
    <div className="space-y-3">
      {/* Couleurs */}
      <Collapsible open={couleursOpen} onOpenChange={setCouleursOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-0.5 hover:opacity-80 transition-opacity">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-500 dark:text-orange-400">
            Couleurs ({colorBlocks.length})
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-orange-500 dark:text-orange-400 transition-transform", couleursOpen ? "rotate-0" : "-rotate-90")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1">
          {colorBlocks.length === 0 ? (
            <span className="text-xs text-muted-foreground italic px-2 py-1 block">Aucun élément</span>
          ) : (
            colorBlocks.map((cb, idx) => {
              const isSelected = selectedColorBlockId?.panelId === panel.id && selectedColorBlockId.colorBlockId === cb.id;
              const solidColor = cb.fill.type === "solid" ? cb.fill.color : null;
              return (
                <button
                  key={cb.id}
                  type="button"
                  onClick={() => handleSelectColorBlock(cb.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
                    isSelected
                      ? "bg-primary/10 border border-primary/30 text-primary"
                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent",
                  )}
                >
                  <Square
                    className="h-3.5 w-3.5 shrink-0"
                    style={solidColor ? { color: solidColor, fill: solidColor } : undefined}
                  />
                  <span className="truncate">Bloc couleur {colorBlocks.length - idx}</span>
                </button>
              );
            })
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Images */}
      <Collapsible open={imagesOpen} onOpenChange={setImagesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-0.5 hover:opacity-80 transition-opacity">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400">
            Images ({blocks.length})
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-blue-500 dark:text-blue-400 transition-transform", imagesOpen ? "rotate-0" : "-rotate-90")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1">
          {blocks.length === 0 ? (
            <span className="text-xs text-muted-foreground italic px-2 py-1 block">Aucun élément</span>
          ) : (
            blocks.map((block) => {
              const isSelected = selectedBlockId?.panelId === panel.id && selectedBlockId.blockId === block.id;
              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => handleSelectBlock(block.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
                    isSelected
                      ? "bg-primary/10 border border-primary/30 text-primary"
                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent",
                  )}
                >
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{block.name || "Image sans nom"}</span>
                </button>
              );
            })
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Bulles */}
      <Collapsible open={bullesOpen} onOpenChange={setBullesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-0.5 hover:opacity-80 transition-opacity">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-500 dark:text-violet-400">
            Bulles ({speechBubbles.length})
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-violet-500 dark:text-violet-400 transition-transform", bullesOpen ? "rotate-0" : "-rotate-90")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1">
          {speechBubbles.length === 0 ? (
            <span className="text-xs text-muted-foreground italic px-2 py-1 block">Aucun élément</span>
          ) : (
            speechBubbles.map((bubble) => {
              const isSelected = selectedSpeechBubbleId?.panelId === panel.id && selectedSpeechBubbleId.bubbleId === bubble.id;
              const typeLabel = SPEECH_BUBBLE_TYPE_LABELS[bubble.type as SpeechBubbleType] ?? bubble.type;
              const textPreview = bubble.text?.trim() ? ` · ${bubble.text.slice(0, 20)}` : "";
              return (
                <button
                  key={bubble.id}
                  type="button"
                  onClick={() => handleSelectSpeechBubble(bubble.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
                    isSelected
                      ? "bg-primary/10 border border-primary/30 text-primary"
                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent",
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{typeLabel}{textPreview}</span>
                </button>
              );
            })
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* SFX */}
      <Collapsible open={sfxOpen} onOpenChange={setSfxOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-0.5 hover:opacity-80 transition-opacity">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">
            SFX ({sfxBlocks.length})
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-amber-500 dark:text-amber-400 transition-transform", sfxOpen ? "rotate-0" : "-rotate-90")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1">
          {sfxBlocks.length === 0 ? (
            <span className="text-xs text-muted-foreground italic px-2 py-1 block">Aucun élément</span>
          ) : (
            sfxBlocks.map((sfx) => {
              const isSelected = selectedSfxId?.panelId === panel.id && selectedSfxId.sfxId === sfx.id;
              return (
                <button
                  key={sfx.id}
                  type="button"
                  onClick={() => handleSelectSfx(sfx.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
                    isSelected
                      ? "bg-primary/10 border border-primary/30 text-primary"
                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent",
                  )}
                >
                  <Zap className="h-3.5 w-3.5 shrink-0" style={{ color: sfx.color }} />
                  <span className="truncate">{sfx.text.trim() || "SFX vide"}</span>
                </button>
              );
            })
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Fenêtres système */}
      <Collapsible open={systemOpen} onOpenChange={setSystemOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-0.5 hover:opacity-80 transition-opacity">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400">
            Système ({systemBlocks.length})
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400 transition-transform", systemOpen ? "rotate-0" : "-rotate-90")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1">
          {systemBlocks.length === 0 ? (
            <span className="text-xs text-muted-foreground italic px-2 py-1 block">Aucun élément</span>
          ) : (
            systemBlocks.map((sb) => {
              const isSelected = selectedSystemBlockId?.panelId === panel.id && selectedSystemBlockId.systemBlockId === sb.id;
              const variantLabel = SYSTEM_BLOCK_VARIANT_CONFIG[sb.variant]?.label ?? sb.variant;
              return (
                <button
                  key={sb.id}
                  type="button"
                  onClick={() => handleSelectSystemBlock(sb.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
                    isSelected
                      ? "bg-primary/10 border border-primary/30 text-primary"
                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent",
                  )}
                >
                  <MonitorCheck className="h-3.5 w-3.5 shrink-0" style={{ color: sb.accentColor }} />
                  <span className="truncate">{variantLabel} · {sb.title}</span>
                </button>
              );
            })
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
