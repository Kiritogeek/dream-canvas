import { useState } from "react";
import { Sparkles, Check, X, ChevronsDown, ChevronsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompassProposal } from "@/types";

const ASSET_EMOJI: Record<string, string> = {
  character: "👤",
  background: "📍",
  object: "⚔️",
};

interface LorePrefillData {
  asset_id: string;
  asset_type: string;
  chapter_id: string | null;
  chapter_number: number | null;
}

interface Props {
  proposals: CompassProposal[];
  onAccept: (proposal: CompassProposal) => void;
  onAcceptAll: () => void;
  onDismiss: (id: string) => void;
  isAccepting: boolean;
}

export function LoreProposalsPanel({
  proposals,
  onAccept,
  onAcceptAll,
  onDismiss,
  isAccepting,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (proposals.length === 0) return null;

  const VISIBLE_LIMIT = 4;
  const visible = expanded ? proposals : proposals.slice(0, VISIBLE_LIMIT);
  const hiddenCount = proposals.length - VISIBLE_LIMIT;

  return (
    <div className="absolute top-16 left-4 z-10 max-w-sm glass rounded-xl border border-violet-500/20 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border-b border-violet-500/15">
        <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
        <span className="text-xs font-medium text-violet-200 flex-1">
          Ariane a détecté{" "}
          <span className="text-violet-300 font-semibold">{proposals.length}</span>{" "}
          élément{proposals.length > 1 ? "s" : ""} dans ton scénario
        </span>
        {proposals.length > 1 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAcceptAll}
            disabled={isAccepting}
            className="h-6 px-2 text-[10px] text-violet-300 hover:text-violet-100 hover:bg-violet-500/20"
          >
            Tout ajouter
          </Button>
        )}
      </div>

      {/* Proposal chips */}
      <div className="flex flex-col gap-0.5 px-2 py-2">
        {visible.map((p) => {
          const prefill = p.prefill_data as unknown as LorePrefillData | null;
          const emoji = ASSET_EMOJI[prefill?.asset_type ?? ""] ?? "🔹";
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 group"
            >
              <span className="text-sm leading-none">{emoji}</span>
              <span className="text-xs text-white/90 flex-1 truncate font-medium">
                {p.title}
              </span>
              {prefill?.chapter_number && (
                <span className="text-[10px] text-white/35 shrink-0">
                  ch.{prefill.chapter_number}
                </span>
              )}
              <button
                onClick={() => onAccept(p)}
                disabled={isAccepting}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded text-green-400 hover:text-green-300 hover:bg-green-500/20"
                title="Ajouter au Lore"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDismiss(p.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/10"
                title="Ignorer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Show more / less */}
      {proposals.length > VISIBLE_LIMIT && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-white/40 hover:text-white/70 hover:bg-white/5 border-t border-white/5 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronsUp className="h-3 w-3" />
              Réduire
            </>
          ) : (
            <>
              <ChevronsDown className="h-3 w-3" />
              +{hiddenCount} autre{hiddenCount > 1 ? "s" : ""}
            </>
          )}
        </button>
      )}
    </div>
  );
}
