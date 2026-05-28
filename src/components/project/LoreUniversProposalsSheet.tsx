import { useState } from "react";
import { X, BookOpen, Link2, BookMarked, Sparkles, Tag, Zap } from "lucide-react";
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
import type { Asset, CompassProposal, LoreNode } from "@/types";

const ASSET_TYPE_BADGE: Record<string, string> = {
  character: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  background: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  object:    "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
};

const ASSET_TYPE_COLORS: Record<string, { border: string; tint: string; fallback: string; contentBg: string }> = {
  character: { border: "border-l-violet-500/60", tint: "bg-violet-900", fallback: "bg-gradient-to-br from-violet-900/30 to-transparent", contentBg: "bg-violet-950/85 border border-violet-500/25" },
  background: { border: "border-l-amber-500/60", tint: "bg-amber-900", fallback: "bg-gradient-to-br from-amber-900/30 to-transparent", contentBg: "bg-amber-950/85 border border-amber-500/25" },
  object:     { border: "border-l-cyan-500/60",  tint: "bg-cyan-900",  fallback: "bg-gradient-to-br from-cyan-900/30 to-transparent", contentBg: "bg-cyan-950/85 border border-cyan-500/25" },
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

interface LoreChapterUpdatePrefillLocal {
  node_id: string;
  chapter_id: string;
  chapter_number: number;
  current_chapter_id: string | null;
}

interface LoreEventPrefillLocal {
  event_name: string;
  chapter_number: number;
  chapter_id: string;
}

interface LoreConnectionPrefillLocal {
  from_node_id: string;
  to_node_id: string;
  from_name: string;
  to_name: string;
  chapter_number: number;
  context_excerpt?: string;
  proposed_label?: string;
}

type ForcedReason = "already_exists" | "ignored";

interface Props {
  proposals: CompassProposal[];
  forcedInfo?: Record<string, ForcedReason>;
  onAccept: (proposal: CompassProposal, onNodeCreated?: (node: LoreNode) => void, connectionLabel?: string) => void;
  onDismiss: (id: string) => void;
  isAccepting: boolean;
  onNodeCreated: (node: LoreNode) => void;
  assets?: Asset[];
}

interface SectionConfig {
  label: string;
  icon: React.ReactNode;
  dotClass: string;
  labelClass: string;
  borderClass: string;
}

const SECTION_CONFIG: Record<string, SectionConfig> = {
  lore_asset: {
    label: "Nouveaux éléments",
    icon: <Sparkles className="h-3 w-3" />,
    dotClass: "bg-violet-400",
    labelClass: "text-violet-300",
    borderClass: "border-l-violet-500/50",
  },
  lore_connection: {
    label: "Connexions",
    icon: <Link2 className="h-3 w-3" />,
    dotClass: "bg-emerald-400",
    labelClass: "text-emerald-300",
    borderClass: "border-l-emerald-500/50",
  },
  lore_chapter_update: {
    label: "Liaisons chapitres",
    icon: <BookMarked className="h-3 w-3" />,
    dotClass: "bg-sky-400",
    labelClass: "text-sky-300",
    borderClass: "border-l-sky-500/50",
  },
  lore_event: {
    label: "Événements",
    icon: <Zap className="h-3 w-3" />,
    dotClass: "bg-green-400",
    labelClass: "text-green-300",
    borderClass: "border-l-green-500/50",
  },
};

const SECTION_ORDER = ["lore_asset", "lore_event", "lore_connection", "lore_chapter_update"] as const;

export function LoreUniversProposalsSheet({
  proposals,
  forcedInfo,
  onAccept,
  onDismiss,
  isAccepting,
  onNodeCreated,
  assets,
}: Props) {
  const [open, setOpen] = useState(false);

  if (proposals.length === 0) return null;

  const count = proposals.length;

  const handleAccept = (proposal: CompassProposal, connectionLabel?: string) => {
    if (proposal.proposal_type === "lore_asset" || proposal.proposal_type === "lore_event") {
      onAccept(proposal, (node) => {
        onNodeCreated(node);
        setOpen(false);
      });
    } else {
      onAccept(proposal, undefined, connectionLabel);
      setOpen(false);
    }
  };


  const grouped = SECTION_ORDER.reduce<Record<string, CompassProposal[]>>((acc, type) => {
    acc[type] = proposals.filter((p) => p.proposal_type === type);
    return acc;
  }, {});

  const activeSections = SECTION_ORDER.filter((t) => grouped[t].length > 0);

  return (
    <>
      {/* FAB */}
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
            aria-label={`Fil d'Ariane — ${count} élément${count > 1 ? "s" : ""} à ajouter à l'Univers`}
          >
            <ArianeOrbitIcon size={30} />
            <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white tabular-nums ring-2 ring-background">
              {count > 99 ? "99+" : count}
            </span>
          </button>
        </div>
      </div>

      {/* Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg flex flex-col gap-0 p-4 sm:p-6 overflow-hidden"
        >
          <SheetHeader className="space-y-2 pb-3 border-b border-border/60">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0 mt-0.5">
                <div className="absolute inset-0 rounded-full bg-amber-500/25 blur-lg scale-[2]" />
                <ArianeOrbitIcon size={52} />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-left text-[11px] font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  Fil d'Ariane
                </p>
                <SheetTitle className="text-left font-display text-lg">
                  Éléments de l'Univers
                </SheetTitle>
                <SheetDescription className="text-left text-xs sm:text-sm">
                  Ariane a détecté {count} proposition{count > 1 ? "s" : ""} pour enrichir ton Univers.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="py-3 space-y-3 flex-1 min-h-0 flex flex-col">
            <ScrollArea className="flex-1 min-h-[50vh] pr-2">
              <div className="space-y-5 pb-4">
                {activeSections.map((type, sectionIndex) => {
                  const cfg = SECTION_CONFIG[type];
                  const sectionProposals = grouped[type];
                  return (
                    <div key={type}>
                      {/* Séparateur entre sections */}
                      {sectionIndex > 0 && (
                        <div className="border-t border-border/40 mb-5" />
                      )}

                      {/* Header de section */}
                      <div className="flex items-center gap-2 mb-2.5 px-0.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotClass)} />
                        <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest", cfg.labelClass)}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                          {sectionProposals.length}
                        </span>
                      </div>

                      {/* Cards de la section */}
                      <ul className="space-y-2" role="list">
                        {sectionProposals.map((p) => (
                          <LoreProposalCard
                            key={p.id}
                            proposal={p}
                            sectionBorderClass={cfg.borderClass}
                            forcedReason={
                              (p.prefill_data as { _ariane_reason?: ForcedReason } | null)?._ariane_reason
                              ?? forcedInfo?.[p.id]
                            }
                            disabled={isAccepting}
                            onAjouter={(label) => handleAccept(p, label)}
                            onIgnorer={() => onDismiss(p.id)}
                            assets={assets}
                          />
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function LoreProposalCard({
  proposal,
  sectionBorderClass,
  forcedReason,
  disabled,
  onAjouter,
  onIgnorer,
  assets,
}: {
  proposal: CompassProposal;
  sectionBorderClass: string;
  forcedReason?: ForcedReason;
  disabled: boolean;
  onAjouter: (connectionLabel?: string) => void;
  onIgnorer: () => void;
  assets?: Asset[];
}) {
  const isAsset = proposal.proposal_type === "lore_asset";
  const isChapterUpdate = proposal.proposal_type === "lore_chapter_update";
  const isConnection = proposal.proposal_type === "lore_connection";
  const isEvent = proposal.proposal_type === "lore_event";

  const assetPrefill = isAsset ? (proposal.prefill_data as unknown as LorePrefillData) : null;
  const chapterUpdatePrefill = isChapterUpdate
    ? (proposal.prefill_data as unknown as LoreChapterUpdatePrefillLocal)
    : null;
  const connectionPrefill = isConnection
    ? (proposal.prefill_data as unknown as LoreConnectionPrefillLocal)
    : null;
  const eventPrefill = isEvent ? (proposal.prefill_data as unknown as LoreEventPrefillLocal) : null;

  const [connectionLabel, setConnectionLabel] = useState(connectionPrefill?.proposed_label ?? "");

  const assetType = assetPrefill?.asset_type ?? "";
  const badgeCls = ASSET_TYPE_BADGE[assetType] ?? "bg-muted text-muted-foreground border-border";
  const typeLabel = ASSET_TYPE_LABEL[assetType] ?? assetType;

  const assetTypeColors = ASSET_TYPE_COLORS[assetType];
  const imageUrl = isAsset
    ? assets?.find((a) => a.id === assetPrefill?.asset_id)?.image_url
    : undefined;
  const effectiveBorderClass = isAsset && assetTypeColors
    ? assetTypeColors.border
    : sectionBorderClass;
  const fallbackBgClass = isAsset && assetTypeColors
    ? assetTypeColors.fallback
    : "bg-card/60";

  const actionLabel = isConnection
    ? "Connecter"
    : isChapterUpdate
      ? `Lier Chap. ${chapterUpdatePrefill?.chapter_number}`
      : "Ajouter à l'Univers";

  const ariaLabel = isConnection
    ? `Connecter ${connectionPrefill?.from_name} et ${connectionPrefill?.to_name}`
    : isChapterUpdate
      ? `Lier ${proposal.title} au chapitre ${chapterUpdatePrefill?.chapter_number}`
      : `Ajouter ${proposal.title} à l'Univers`;

  return (
    <li>
      <div className={cn(
        "relative overflow-hidden rounded-xl border border-border/50 shadow-sm border-l-2",
        effectiveBorderClass,
        forcedReason && "opacity-75",
      )}>
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none select-none absolute inset-0 h-full w-full object-cover scale-105"
              style={{ filter: "blur(6px)" }}
            />
            <div className="absolute inset-0 bg-black/25" />
          </>
        ) : (
          <div className={cn("absolute inset-0", fallbackBgClass)} />
        )}
        <div className={cn(
          "relative z-10 m-2 rounded-lg p-2.5 space-y-2",
          imageUrl ? (assetTypeColors?.contentBg ?? "bg-black/70") : ""
        )}>
        {/* Méta-infos */}
        <div className="flex flex-wrap items-center gap-1.5">
          {forcedReason === "already_exists" && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
              <span aria-hidden>✓</span> Existe déjà
            </span>
          )}
          {forcedReason === "ignored" && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border bg-orange-500/15 text-orange-400 border-orange-500/30 flex items-center gap-1">
              <span aria-hidden>🚫</span> Ignoré
            </span>
          )}
          {isAsset && assetType && (
            <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border", badgeCls)}>
              {typeLabel}
            </span>
          )}
          {isAsset && assetPrefill?.chapter_number && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
              Chap. {assetPrefill.chapter_number}
            </span>
          )}
          {isEvent && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
              Événement
            </span>
          )}
          {isEvent && eventPrefill?.chapter_number && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
              Chap. {eventPrefill.chapter_number}
            </span>
          )}
          {isConnection && connectionPrefill?.chapter_number && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
              Chap. {connectionPrefill.chapter_number}
            </span>
          )}
          {isChapterUpdate && chapterUpdatePrefill?.chapter_number && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-400">
              → Chap. {chapterUpdatePrefill.chapter_number}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm leading-snug flex-1 min-w-0">{proposal.title}</h3>
          {isConnection && (
            <div className="relative flex-1 min-w-0 max-w-[172px]">
              <Tag className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 pointer-events-none" aria-hidden />
              <input
                type="text"
                value={connectionLabel}
                onChange={(e) => setConnectionLabel(e.target.value)}
                placeholder="Nommer la liaison…"
                className="h-7 w-full rounded-md border border-border/40 bg-background/30 pl-6 pr-6 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
              {connectionPrefill?.proposed_label && connectionLabel === connectionPrefill.proposed_label && (
                <span
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-amber-400/70 pointer-events-none select-none"
                  title="Proposé par Ariane"
                  aria-label="Proposé par Ariane"
                >✨</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-0.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-[hsl(var(--mint)/0.45)] text-[hsl(var(--mint))]"
            onClick={() => onAjouter(isConnection ? connectionLabel : undefined)}
            disabled={disabled}
            aria-label={ariaLabel}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {actionLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={onIgnorer}
            disabled={disabled}
            aria-label={`Ignorer ${proposal.title}`}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Ignorer
          </Button>
        </div>
        </div>
      </div>
    </li>
  );
}
