import { useState } from "react";
import { Check, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ArianeOrbitIcon } from "@/components/ariane/ArianeOrbitIcon";
import { cn } from "@/lib/utils";
import type { CompassProposal, LoreNode } from "@/types";

const ASSET_TYPE_BADGE: Record<string, string> = {
  character: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  background: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  object:    "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
};

const ASSET_TYPE_LABEL: Record<string, string> = {
  character: "Personnage",
  background: "Lieu",
  object: "Objet",
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

      {/* Sheet — même design que ArianeContinuityPanel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg flex flex-col gap-0 p-4 sm:p-6 overflow-hidden"
        >
          <SheetHeader className="space-y-2 pb-3 border-b border-border/60">
            <div className="flex items-start gap-3">
              <ArianeOrbitIcon size={36} className="mt-0.5 shrink-0" />
              <div className="min-w-0 space-y-0.5">
                <p className="text-left text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  Fil d'Ariane
                </p>
                <SheetTitle className="text-left font-display text-lg">
                  Éléments de l'Univers
                </SheetTitle>
                <SheetDescription className="text-left text-xs sm:text-sm">
                  Ariane a détecté {count} élément{count > 1 ? "s" : ""} dans ton scénario qui n'ont pas encore de lore.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="py-3 space-y-3 flex-1 min-h-0 flex flex-col">
            {/* Toolbar — Tout ajouter */}
            {count > 1 && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAcceptAll}
                  disabled={isAccepting}
                  className="h-8 text-xs gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Tout ajouter
                </Button>
              </div>
            )}

            <ScrollArea className="flex-1 min-h-[50vh] pr-2">
              <ul className="space-y-3 pb-4" role="list">
                {proposals.map((p) => (
                  <LoreProposalCard
                    key={p.id}
                    proposal={p}
                    disabled={isAccepting}
                    onAjouter={() => handleAccept(p)}
                    onIgnorer={() => onDismiss(p.id)}
                  />
                ))}
              </ul>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function LoreProposalCard({
  proposal,
  disabled,
  onAjouter,
  onIgnorer,
}: {
  proposal: CompassProposal;
  disabled: boolean;
  onAjouter: () => void;
  onIgnorer: () => void;
}) {
  const prefill = proposal.prefill_data as unknown as LorePrefillData | null;
  const assetType = prefill?.asset_type ?? "";
  const badgeCls = ASSET_TYPE_BADGE[assetType] ?? "bg-muted text-muted-foreground border-border";
  const typeLabel = ASSET_TYPE_LABEL[assetType] ?? assetType;

  return (
    <li>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/8 dark:border-amber-500/25 p-3 space-y-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border",
            badgeCls
          )}>
            {typeLabel}
          </span>
          {prefill?.chapter_number && (
            <span className="text-[10px] text-muted-foreground font-medium">
              Chapitre {prefill.chapter_number}
            </span>
          )}
        </div>
        <h3 className="font-medium text-sm leading-snug">{proposal.title}</h3>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1 border-[hsl(var(--mint)/0.45)] text-[hsl(var(--mint))]"
            onClick={onAjouter}
            disabled={disabled}
            aria-label={`Ajouter ${proposal.title} au Lore`}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            Ajouter au Lore
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs gap-1 text-muted-foreground"
            onClick={onIgnorer}
            disabled={disabled}
            aria-label={`Ignorer ${proposal.title}`}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Ignorer
          </Button>
        </div>
      </div>
    </li>
  );
}
