import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { AlertTriangle, Check, Eye, Loader2, Plus, Sparkles, X } from "lucide-react";
import { ARIANE_DISPLAY_NAME } from "@/constants/ariane";
import { Link } from "react-router-dom";
import { ArianeOrbitIcon } from "./ArianeOrbitIcon";

const SEVERITY_LABEL: Record<NarrativeAlertSeverity, string> = {
  info: "Info",
  warning: "Attention",
  critical: "Important",
};

const SEVERITY_BADGE: Record<NarrativeAlertSeverity, string> = {
  info: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/35",
  warning: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/35",
  critical: "bg-destructive/15 text-destructive border-destructive/35",
};

const SUGGESTED_TYPE_BADGE: Record<NonNullable<NarramindMissingAsset["suggestedType"]>, { label: string; cls: string }> = {
  character: { label: "Personnage", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
  background: { label: "Décor", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  object: { label: "Objet", cls: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
};

const ASSET_TYPE_COLORS: Record<string, { border: string; tint: string; fallback: string; contentBg: string }> = {
  character: { border: "border-l-violet-500/60", tint: "bg-violet-900", fallback: "bg-gradient-to-br from-violet-900/30 to-transparent", contentBg: "bg-violet-950/85 border border-violet-500/25" },
  background: { border: "border-l-amber-500/60", tint: "bg-amber-900", fallback: "bg-gradient-to-br from-amber-900/30 to-transparent", contentBg: "bg-amber-950/85 border border-amber-500/25" },
  object:     { border: "border-l-cyan-500/60",  tint: "bg-cyan-900",  fallback: "bg-gradient-to-br from-cyan-900/30 to-transparent", contentBg: "bg-cyan-950/85 border border-cyan-500/25" },
};

type FilterSeverity = "all" | NarrativeAlertSeverity;

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
  const [filter, setFilter] = useState<FilterSeverity>("all");
  const [activeSection, setActiveSection] = useState<"anomalies" | "assets">("anomalies");

  const { data: missingAssets = [], isLoading: isLoadingMissing } = useNarramindMissingAssets(projectId);
  const dismiss = useDismissNarramindMissingAsset();

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  const limitedFiltered = filArianeLimit != null ? filtered.slice(0, filArianeLimit) : filtered;
  const isAlertsCapped = filArianeLimit != null && filtered.length > filArianeLimit;

  const filters: Array<{ id: FilterSeverity; label: string }> = [
    { id: "all", label: "Tout" },
    { id: "info", label: "Info" },
    { id: "warning", label: "Attention" },
    { id: "critical", label: "Important" },
  ];

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

      <div className="py-3 space-y-3 flex-1 min-h-0 flex flex-col">
        {/* Switcher onglets */}
        <div className="flex rounded-lg bg-muted/40 p-0.5 gap-0.5">
          <button
            type="button"
            className={cn(
              "flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
              activeSection === "anomalies"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveSection("anomalies")}
          >
            Anomalies
            {alerts.length > 0 && (
              <span className="ml-1.5 text-[10px] font-mono">{alerts.length}</span>
            )}
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
              activeSection === "assets"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveSection("assets")}
          >
            Assets manquants
            {missingAssets.length > 0 && (
              <span className="ml-1.5 text-[10px] font-mono">{missingAssets.length}</span>
            )}
          </button>
        </div>

        {/* Section Anomalies */}
        {activeSection === "anomalies" && (
          <>
            <div
              role="toolbar"
              aria-label="Filtrer par gravité"
              className="flex flex-wrap gap-1.5"
            >
              {filters.map((f) => {
                const count =
                  f.id === "all"
                    ? alerts.length
                    : alerts.filter((a) => a.severity === f.id).length;
                const pressed = filter === f.id;
                return (
                  <Button
                    key={f.id}
                    type="button"
                    size="sm"
                    variant={pressed ? "secondary" : "outline"}
                    className={cn(
                      "h-8 text-xs gap-1.5",
                      pressed && "ring-2 ring-ring ring-offset-1 ring-offset-background"
                    )}
                    aria-pressed={pressed}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>

            {isLoading && (
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

            {!isLoading && !isError && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center px-2">
                {alerts.length === 0
                  ? "Aucun point d'attention pour l'instant. Continuez à écrire — une vérification se fait en arrière-plan après sauvegarde."
                  : "Aucune alerte ne correspond à ce filtre."}
              </p>
            )}

            {!isLoading && !isError && filtered.length > 0 && (
              <ScrollArea className="flex-1 min-h-[50vh] pr-2">
                <ul className="space-y-3 pb-4" role="list">
                  {limitedFiltered.map((a) => (
                    <ContinuityAlertCard
                      key={a.id}
                      alert={a}
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
                      onResolu={() =>
                        setStatus.mutate({ rowId: a.id, status: "resolved" })
                      }
                      onIgnorer={() =>
                        setStatus.mutate({ rowId: a.id, status: "dismissed" })
                      }
                    />
                  ))}
                </ul>
                {isAlertsCapped && (
                  <div className="mx-1 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 space-y-2">
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                      {filtered.length - filArianeLimit!} alerte{filtered.length - filArianeLimit! > 1 ? "s" : ""} masquée{filtered.length - filArianeLimit! > 1 ? "s" : ""} — plan Libre limité à {filArianeLimit} alertes.
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
              </ScrollArea>
            )}
          </>
        )}

        {/* Section Assets manquants */}
        {activeSection === "assets" && (
          <>
            {isLoadingMissing && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoadingMissing && missingAssets.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center px-2">
                NarraMind n'a pas détecté d'assets manquants pour l'instant.
              </p>
            )}

            {!isLoadingMissing && missingAssets.length > 0 && (
              <ScrollArea className="flex-1 min-h-[50vh] pr-2">
                <ul className="space-y-2 pb-4" role="list">
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
              </ScrollArea>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ContinuityAlertCard({
  alert,
  disabled,
  chapterLabel,
  onRelire,
  onResolu,
  onIgnorer,
  assets,
}: {
  alert: NarraMindAlertView;
  disabled: boolean;
  chapterLabel?: string;
  onRelire: (() => void) | null;
  onResolu: () => void;
  onIgnorer: () => void;
  assets?: Asset[];
}) {
  const sev = alert.severity ?? "warning";

  const matchedAsset = assets?.find((a) =>
    alert.title.toLowerCase().includes(a.name.toLowerCase()) ||
    (alert.explanation ?? "").toLowerCase().includes(a.name.toLowerCase())
  );
  const imageUrl = matchedAsset?.image_url;
  const assetTypeColors = matchedAsset?.asset_type
    ? ASSET_TYPE_COLORS[matchedAsset.asset_type]
    : undefined;

  return (
    <li>
      <div className={cn(
        "relative overflow-hidden rounded-xl border shadow-sm",
        imageUrl ? "border-border/50" : "border-amber-500/20 dark:border-amber-500/25"
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
          <div className="absolute inset-0 bg-amber-500/5 dark:bg-amber-500/8" />
        )}
        <div className={cn(
          "relative z-10 m-2 rounded-lg p-2.5 space-y-2",
          imageUrl ? (assetTypeColors?.contentBg ?? "bg-black/70") : ""
        )}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border",
                SEVERITY_BADGE[sev]
              )}
            >
              {SEVERITY_LABEL[sev]}
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
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
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
              className="h-8 text-xs gap-1 border-[hsl(var(--mint)/0.45)] text-[hsl(var(--mint))]"
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
              className="h-8 text-xs gap-1 text-muted-foreground"
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
  const assetTypeColors = asset.suggestedType
    ? ASSET_TYPE_COLORS[asset.suggestedType]
    : undefined;

  return (
    <li>
      <div className={cn(
        "relative overflow-hidden rounded-xl border shadow-sm",
        assetTypeColors ? `border-border/50 border-l-2 ${assetTypeColors.border}` : "border-border/60"
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
          <div className={cn("absolute inset-0", assetTypeColors ? assetTypeColors.fallback : "bg-muted/40")} />
        )}
        <div className={cn(
          "relative z-10 m-2 rounded-lg p-2.5 space-y-2",
          imageUrl ? (assetTypeColors?.contentBg ?? "bg-black/70") : ""
        )}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">{asset.name}</span>
            {asset.suggestedType && (
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                  SUGGESTED_TYPE_BADGE[asset.suggestedType].cls
                )}
              >
                {SUGGESTED_TYPE_BADGE[asset.suggestedType].label}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Chapitre {asset.chapterNumber} · mentionné {asset.mentionCount} fois
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
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
              className="h-8 text-xs gap-1 text-muted-foreground"
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
