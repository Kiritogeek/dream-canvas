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
import { scrollChapterEditorToExcerpt } from "@/lib/arianeScroll";
import { cn } from "@/lib/utils";
import type { NarrativeAlertSeverity, NarraMindAlertView } from "@/types";
import { AlertTriangle, Check, Eye, Loader2, X } from "lucide-react";
import { ARIANE_DISPLAY_NAME } from "@/constants/ariane";
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

type FilterSeverity = "all" | NarrativeAlertSeverity;

type ArianeContinuityPanelProps = {
  projectId: string;
  chapters?: Array<{ id: string; chapter_number: number; title: string | null }>;
  onNavigateToChapter?: (chapterId: string) => void;
  chapterId?: string;
  chapterContent?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
};

export function ArianeContinuityPanel({
  projectId,
  chapters,
  onNavigateToChapter,
  chapterId,
  chapterContent,
  textareaRef,
  scrollContainerRef,
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

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

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
          <ArianeOrbitIcon size={36} className="mt-0.5 shrink-0" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-left text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
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
              {filtered.map((a) => (
                <ContinuityAlertCard
                  key={a.id}
                  alert={a}
                  disabled={setStatus.isPending}
                  chapterLabel={
                    !isScoped && chapters
                      ? (() => {
                          const ch = chapters.find((c) => c.id === a.chapterId);
                          return ch
                            ? `Chapitre ${ch.chapter_number}${ch.title ? ` — ${ch.title}` : ""}`
                            : undefined;
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
                        ? () => onNavigateToChapter(a.chapterId)
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
          </ScrollArea>
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
}: {
  alert: NarraMindAlertView;
  disabled: boolean;
  chapterLabel?: string;
  onRelire: (() => void) | null;
  onResolu: () => void;
  onIgnorer: () => void;
}) {
  const sev = alert.severity ?? "warning";
  return (
    <li>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/8 dark:border-amber-500/25 p-3 space-y-2 shadow-sm">
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
    </li>
  );
}
