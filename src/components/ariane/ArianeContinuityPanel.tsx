import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useNarraMindAlerts, useSetNarraMindAlertStatus } from "@/hooks/useNarramindAlerts";
import { useNarramindMissingAssets, useDismissNarramindMissingAsset } from "@/hooks/useNarramindMissingAssets";
import { scrollChapterEditorToExcerpt } from "@/lib/arianeScroll";
import { cn } from "@/lib/utils";
import type { Asset, NarrativeAlertSeverity, NarraMindAlertView } from "@/types";
import type { NarramindMissingAsset } from "@/types";
import { AlertTriangle, Check, Eye, Info, Loader2, Package, Plus, ShieldAlert, Sparkles, X } from "lucide-react";
import { ARIANE_DISPLAY_NAME } from "@/constants/ariane";
import { Link } from "react-router-dom";
import { ArianeOrbitIcon } from "./ArianeOrbitIcon";

interface SeverityConfig {
  label: string;
  icon: React.ReactNode;
  dotClass: string;
  labelClass: string;
  borderClass: string;
  badgeClass: string;
  fallbackClass: string;
}

const SEVERITY_CONFIG: Record<NarrativeAlertSeverity, SeverityConfig> = {
  critical: {
    label: "Important",
    icon: <ShieldAlert className="h-3 w-3" />,
    dotClass: "bg-red-400",
    labelClass: "text-red-300",
    borderClass: "border-l-red-500/60",
    badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    fallbackClass: "bg-gradient-to-br from-red-900/20 to-transparent",
  },
  warning: {
    label: "Attention",
    icon: <AlertTriangle className="h-3 w-3" />,
    dotClass: "bg-orange-400",
    labelClass: "text-orange-300",
    borderClass: "border-l-orange-500/60",
    badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    fallbackClass: "bg-gradient-to-br from-orange-900/20 to-transparent",
  },
  info: {
    label: "Info",
    icon: <Info className="h-3 w-3" />,
    dotClass: "bg-sky-400",
    labelClass: "text-sky-300",
    borderClass: "border-l-sky-500/60",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    fallbackClass: "bg-gradient-to-br from-sky-900/20 to-transparent",
  },
};

const SEVERITY_ORDER: NarrativeAlertSeverity[] = ["critical", "warning", "info"];

const ASSET_TYPE_COLORS: Record<string, { border: string; fallback: string }> = {
  character: { border: "border-l-violet-500/60", fallback: "bg-gradient-to-br from-violet-900/30 to-transparent" },
  background: { border: "border-l-blue-500/60",  fallback: "bg-gradient-to-br from-blue-900/30 to-transparent"  },
  object:     { border: "border-l-amber-500/60", fallback: "bg-gradient-to-br from-amber-900/30 to-transparent" },
};

const SUGGESTED_TYPE_BADGE: Record<NonNullable<NarramindMissingAsset["suggestedType"]>, { label: string; cls: string }> = {
  character: { label: "Personnage", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
  background: { label: "Décor",     cls: "bg-blue-500/15  text-blue-700  dark:text-blue-300  border-blue-500/30"  },
  object:     { label: "Objet",     cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
};

type ArianeContinuityPanelProps = {
  projectId: string;
  chapters?: Array<{ id: string; chapter_number: number; title: string | null }>;
  onNavigateToChapter?: (chapterId: string, anchor?: string) => void;
  chapterId?: string;
  chapterContent?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  onCreateMissingAsset?: (name: string) => void;
  filArianeLimit?: number | null;
  assets?: Asset[];
};

export function ArianeContinuityPanel({
  projectId,
  chapters,
  onNavigateToChapter,
  chapterId,
  chapterContent,
  textareaRef,
  scrollContainerRef,
  onCreateMissingAsset,
  filArianeLimit,
  assets,
}: ArianeContinuityPanelProps) {
  const isScoped = !!chapterId;

  const { data: alerts = [], isLoading, isError, refetch } = useNarraMindAlerts(
    projectId,
    isScoped
      ? { chapterId, statuses: ["active"] }
      : { statuses: ["active"] }
  );
  const setStatus = useSetNarraMindAlertStatus();

  const { data: missingAssets = [], isLoading: isLoadingMissing } = useNarramindMissingAssets(projectId);
  const dismiss = useDismissNarramindMissingAsset();

  const isAlertsCapped = filArianeLimit != null && alerts.length > filArianeLimit;

  const grouped = useMemo(() => {
    const limited = filArianeLimit != null ? alerts.slice(0, filArianeLimit) : alerts;
    return SEVERITY_ORDER.reduce<Record<NarrativeAlertSeverity, NarraMindAlertView[]>>(
      (acc, sev) => {
        acc[sev] = limited.filter((a) => a.severity === sev);
        return acc;
      },
      { critical: [], warning: [], info: [] }
    );
  }, [alerts, filArianeLimit]);

  const activeSeverities = SEVERITY_ORDER.filter((s) => grouped[s].length > 0);

  const anyLoading = (isLoading && alerts.length === 0) || (isLoadingMissing && missingAssets.length === 0);
  const hasContent = activeSeverities.length > 0 || missingAssets.length > 0;

  return (
    <>
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
              Points d'attention
            </SheetTitle>
            <SheetDescription className="text-left text-xs sm:text-sm">
              {ARIANE_DISPLAY_NAME} repère les écarts dans la continuité de votre récit.
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="py-3 flex-1 min-h-0 flex flex-col">
        {anyLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 space-y-2">
              <p>Impossible de charger les alertes.</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          </div>
        )}

        {!anyLoading && !isError && !hasContent && (
          <p className="text-sm text-muted-foreground py-6 text-center px-2">
            Aucun point d'attention pour l'instant. Continuez à écrire — une vérification se fait en arrière-plan après sauvegarde.
          </p>
        )}

        {!anyLoading && !isError && hasContent && (
          <ScrollArea className="flex-1 min-h-[50vh] pr-2">
            <div className="space-y-5 pb-4">

              {/* Sections par sévérité */}
              {activeSeverities.map((sev, idx) => {
                const cfg = SEVERITY_CONFIG[sev];
                const items = grouped[sev];
                return (
                  <div key={sev}>
                    {idx > 0 && <div className="border-t border-border/40 mb-5" />}

                    <div className="flex items-center gap-2 mb-2.5 px-0.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotClass)} />
                      <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest", cfg.labelClass)}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                        {items.length}
                      </span>
                    </div>

                    <ul className="space-y-2" role="list">
                      {items.map((a) => (
                        <ContinuityAlertCard
                          key={a.id}
                          alert={a}
                          cfg={cfg}
                          disabled={setStatus.isPending}
                          assets={assets}
                          chapterLabel={
                            !isScoped && chapters
                              ? (() => {
                                  const ch = chapters.find((c) => c.id === a.chapterId);
                                  if (!ch) return undefined;
                                  const base = `Chapitre ${ch.chapter_number}`;
                                  const extra = ch.title && ch.title.trim() !== base ? ` - ${ch.title}` : "";
                                  return `${base}${extra}`;
                                })()
                              : undefined
                          }
                          onRelire={
                            isScoped
                              ? () => {
                                  const ok = scrollChapterEditorToExcerpt(
                                    textareaRef?.current ?? null,
                                    scrollContainerRef?.current ?? null,
                                    chapterContent ?? "",
                                    a.anchor?.type === "excerpt" ? a.anchor.text : a.title
                                  );
                                  if (!ok && a.anchor?.type === "excerpt") {
                                    scrollChapterEditorToExcerpt(
                                      textareaRef?.current ?? null,
                                      scrollContainerRef?.current ?? null,
                                      chapterContent ?? "",
                                      a.explanation
                                    );
                                  }
                                }
                              : onNavigateToChapter
                                ? () => onNavigateToChapter(a.chapterId, a.anchor?.type === "excerpt" ? a.anchor.text : undefined)
                                : null
                          }
                          onResolu={() => setStatus.mutate({ rowId: a.id, status: "resolved" })}
                          onIgnorer={() => setStatus.mutate({ rowId: a.id, status: "dismissed" })}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}

              {/* Section Assets manquants */}
              {missingAssets.length > 0 && (
                <div>
                  {activeSeverities.length > 0 && <div className="border-t border-border/40 mb-5" />}

                  <div className="flex items-center gap-2 mb-2.5 px-0.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400" />
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-300">
                      <Package className="h-3 w-3" />
                      Assets manquants
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {missingAssets.length}
                    </span>
                  </div>

                  <ul className="space-y-2" role="list">
                    {missingAssets.map((asset) => (
                      <MissingAssetCard
                        key={asset.id}
                        asset={asset}
                        assets={assets}
                        onCreateMissingAsset={onCreateMissingAsset}
                        onDismiss={() => dismiss.mutate(asset.id)}
                        dismissPending={dismiss.isPending}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* Bannière plan limité */}
              {isAlertsCapped && (
                <div className="mx-1 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 space-y-2">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                    {alerts.length - filArianeLimit!} alerte{alerts.length - filArianeLimit! > 1 ? "s" : ""} masquée{alerts.length - filArianeLimit! > 1 ? "s" : ""} — plan Libre limité à {filArianeLimit} alertes.
                  </p>
                  <Link
                    to="/dashboard/plans"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <Sparkles className="h-3 w-3" />
                    Passer au plan Créateur
                  </Link>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </>
  );
}

function ContinuityAlertCard({
  alert,
  cfg,
  disabled,
  chapterLabel,
  onRelire,
  onResolu,
  onIgnorer,
  assets,
}: {
  alert: NarraMindAlertView;
  cfg: SeverityConfig;
  disabled: boolean;
  chapterLabel?: string;
  onRelire: (() => void) | null;
  onResolu: () => void;
  onIgnorer: () => void;
  assets?: Asset[];
}) {
  const matchedAsset = assets?.find(
    (a) =>
      alert.title.toLowerCase().includes(a.name.toLowerCase()) ||
      (alert.explanation ?? "").toLowerCase().includes(a.name.toLowerCase())
  );
  const imageUrl = matchedAsset?.image_url;

  return (
    <li>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/50 shadow-sm border-l-2",
          cfg.borderClass
        )}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none select-none absolute inset-0 h-full w-full object-cover scale-105"
              style={{ filter: "blur(2px)" }}
            />
            <div className="absolute inset-0 bg-black/45" />
          </>
        ) : (
          <div className={cn("absolute inset-0", cfg.fallbackClass)} />
        )}

        <div className="relative z-10 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border",
                cfg.badgeClass
              )}
            >
              {cfg.label}
            </span>
            {chapterLabel && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {chapterLabel}
              </span>
            )}
          </div>

          <h3 className="font-medium text-sm leading-snug">{alert.title}</h3>

          {alert.explanation ? (
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {alert.explanation}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-0.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={onRelire ?? undefined}
              disabled={onRelire === null}
              aria-label={`À relire dans le texte : ${alert.title}`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden />
              À relire
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-[hsl(var(--mint)/0.45)] text-[hsl(var(--mint))]"
              onClick={onResolu}
              disabled={disabled}
              aria-label={`Marquer comme traité : ${alert.title}`}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Traitée
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-white hover:bg-destructive"
              onClick={onIgnorer}
              disabled={disabled}
              aria-label={`Ignorer cette alerte : ${alert.title}`}
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

function MissingAssetCard({
  asset,
  assets,
  onCreateMissingAsset,
  onDismiss,
  dismissPending,
}: {
  asset: NarramindMissingAsset;
  assets?: Asset[];
  onCreateMissingAsset?: (name: string) => void;
  onDismiss: () => void;
  dismissPending: boolean;
}) {
  const matchedAsset = assets?.find(
    (a) => a.name.toLowerCase() === asset.name.toLowerCase()
  );
  const imageUrl = matchedAsset?.image_url;
  const typeColors = asset.suggestedType ? ASSET_TYPE_COLORS[asset.suggestedType] : undefined;
  const typeBadge = asset.suggestedType ? SUGGESTED_TYPE_BADGE[asset.suggestedType] : undefined;

  return (
    <li>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/50 shadow-sm border-l-2",
          typeColors ? typeColors.border : "border-l-muted-foreground/30"
        )}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none select-none absolute inset-0 h-full w-full object-cover scale-105"
              style={{ filter: "blur(2px)" }}
            />
            <div className="absolute inset-0 bg-black/45" />
          </>
        ) : (
          <div className={cn("absolute inset-0", typeColors ? typeColors.fallback : "bg-muted/40")} />
        )}

        <div className="relative z-10 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-sm">{asset.name}</span>
            {typeBadge && (
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                  typeBadge.cls
                )}
              >
                {typeBadge.label}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Chapitre {asset.chapterNumber} · mentionné {asset.mentionCount} fois
          </p>

          <div className="flex flex-wrap gap-2 pt-0.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-[hsl(var(--mint)/0.45)] text-[hsl(var(--mint))]"
              onClick={() => onCreateMissingAsset?.(asset.name)}
              aria-label={`Créer l'asset : ${asset.name}`}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Créer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-white hover:bg-destructive"
              onClick={onDismiss}
              disabled={dismissPending}
              aria-label={`Ignorer cet asset manquant : ${asset.name}`}
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
