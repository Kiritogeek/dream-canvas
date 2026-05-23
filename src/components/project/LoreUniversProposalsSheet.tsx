import { useState } from "react";
import { X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArianeOrbitIcon } from "@/components/ariane/ArianeOrbitIcon";
import type { CompassProposal, LoreNode } from "@/types";

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
  onAccept: (proposal: CompassProposal, onNodeCreated?: (node: LoreNode) => void) => void;
  onAcceptAll: () => void;
  onDismiss: (id: string) => void;
  isAccepting: boolean;
  onNodeCreated: (node: LoreNode) => void;
}

export function LoreUniversProposalsSheet({
  proposals,
  onAccept,
  onAcceptAll,
  onDismiss,
  isAccepting,
  onNodeCreated,
}: Props) {
  const [open, setOpen] = useState(false);

  if (proposals.length === 0) return null;

  const count = proposals.length;

  const handleAccept = (proposal: CompassProposal) => {
    onAccept(proposal, (node) => {
      onNodeCreated(node);
      setOpen(false);
    });
  };

  const handleAcceptAll = () => {
    onAcceptAll();
    setOpen(false);
  };

  return (
    <>
      {/* FAB — même design que Ariane Scénario */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          <svg
            width="84"
            height="84"
            viewBox="0 0 84 84"
            fill="none"
            className="absolute -top-[10px] -left-[10px] pointer-events-none overflow-visible"
            aria-hidden
          >
            <defs>
              <style>{`
                @keyframes ariane-univ-w1 {
                  0%,100% { d: path("M 8 42 C 21 28 28 28 42 42 C 56 56 63 56 76 42"); }
                  50%     { d: path("M 8 42 C 21 56 28 56 42 42 C 56 28 63 28 76 42"); }
                }
                @keyframes ariane-univ-w2 {
                  0%,100% { d: path("M 9 42 C 22 56 29 56 42 42 C 55 28 62 28 75 42"); }
                  50%     { d: path("M 9 42 C 22 28 29 28 42 42 C 55 56 62 56 75 42"); }
                }
                .ariane-univ-p1 { animation: ariane-univ-w1 2s ease-in-out infinite; }
                .ariane-univ-p2 { animation: ariane-univ-w2 2.8s ease-in-out infinite; }
              `}</style>
              <filter id="ariane-univ-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g>
              <animateTransform attributeName="transform" type="rotate"
                from="0 42 42" to="360 42 42" dur="4.5s" repeatCount="indefinite" />
              <path className="ariane-univ-p1"
                d="M 8 42 C 21 28 28 28 42 42 C 56 56 63 56 76 42"
                stroke="#FCD34D" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7" />
              <circle cx="76" cy="42" r="2.8" fill="#FCD34D" filter="url(#ariane-univ-glow)" />
            </g>
            <g>
              <animateTransform attributeName="transform" type="rotate"
                from="180 42 42" to="-180 42 42" dur="7s" repeatCount="indefinite" />
              <path className="ariane-univ-p2"
                d="M 9 42 C 22 56 29 56 42 42 C 55 28 62 28 75 42"
                stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
              <circle cx="75" cy="42" r="2.2" fill="#F59E0B" filter="url(#ariane-univ-glow)" />
            </g>
          </svg>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative h-16 w-16 rounded-full bg-background/95 backdrop-blur-xl border border-amber-500/40 shadow-[0_4px_24px_hsl(38_92%_50%/0.25)] flex items-center justify-center transition-[transform,box-shadow,border-color] duration-200 hover:scale-110 hover:border-amber-500/70 hover:shadow-[0_6px_32px_hsl(38_92%_50%/0.45)] active:scale-95"
            aria-label={`Fil d'Ariane — ${count} élément${count > 1 ? "s" : ""} à ajouter au Lore`}
          >
            <ArianeOrbitIcon size={30} />
            <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white tabular-nums ring-2 ring-background">
              {count > 99 ? "99+" : count}
            </span>
          </button>
        </div>
      </div>

      {/* Sheet propositions */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden border-l border-white/10"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-amber-500/5">
            <ArianeOrbitIcon size={24} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-200">Fil d'Ariane — Univers</p>
              <p className="text-xs text-white/50 mt-0.5">
                {count} élément{count > 1 ? "s" : ""} détecté{count > 1 ? "s" : ""} dans ton scénario
              </p>
            </div>
            {count > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAcceptAll}
                disabled={isAccepting}
                className="h-8 px-3 text-xs text-amber-300/70 hover:text-amber-200 hover:bg-amber-500/15 shrink-0"
              >
                Tout ajouter
              </Button>
            )}
          </div>

          {/* Description */}
          <div className="px-5 py-3 bg-amber-500/3 border-b border-white/5">
            <p className="text-xs text-white/45 leading-relaxed">
              Ces éléments apparaissent dans ton scénario mais ne sont pas encore dans l'Univers.
              Ajoute-les pour enrichir leur <span className="text-amber-300/70">lore</span>.
            </p>
          </div>

          {/* Liste */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col divide-y divide-white/5">
              {proposals.map((p) => {
                const prefill = p.prefill_data as unknown as LorePrefillData | null;
                const emoji = ASSET_EMOJI[prefill?.asset_type ?? ""] ?? "🔹";
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 group transition-colors">
                    <span className="text-xl leading-none shrink-0">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate">{p.title}</p>
                      {prefill?.chapter_number && (
                        <p className="text-[11px] text-white/35 mt-0.5">
                          Chapitre {prefill.chapter_number}
                        </p>
                      )}
                    </div>
                    {/* Actions — visibles au hover */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleAccept(p)}
                        disabled={isAccepting}
                        className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-medium text-green-300 bg-green-500/10 hover:bg-green-500/25 transition-colors"
                        title="Ajouter au Lore et ouvrir la fiche"
                      >
                        <BookOpen className="h-3 w-3" />
                        Ajouter
                      </button>
                      <button
                        onClick={() => onDismiss(p.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 hover:bg-white/10 transition-colors"
                        title="Ignorer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer hint */}
          <div className="px-5 py-3 border-t border-white/5">
            <p className="text-[10px] text-white/25 text-center">
              Les éléments ignorés ne seront plus proposés
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
