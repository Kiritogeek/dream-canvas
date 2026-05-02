import { ChevronDown, Loader2 } from "lucide-react";
import type { ChapterCanvasImageHistoryRow } from "@/services/chapterCanvasImageHistory";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function formatCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface ChapterImageHistoryListProps {
  entries: ChapterCanvasImageHistoryRow[];
  isLoading?: boolean;
  restoringId: string | null;
  restoredIds: ReadonlySet<string>;
  onRestore: (entry: ChapterCanvasImageHistoryRow) => void | Promise<void>;
}

export function ChapterImageHistoryList({
  entries,
  isLoading,
  restoringId,
  restoredIds,
  onRestore,
}: ChapterImageHistoryListProps) {
  if (isLoading && entries.length === 0) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Les images générées et les suppressions de cases ayant encore une image enregistrée apparaîtront ici, sur tous vos
          appareils après synchronisation avec le serveur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => {
        const isRemoval = e.event_kind === "case_removed_with_image";
        const showRestore = isRemoval && !restoredIds.has(e.id);
        const promptText = e.prompt?.trim() ?? "";

        return (
          <article
            key={e.id}
            className={cn(
              "rounded-xl border border-border/70 bg-muted/25 overflow-hidden border-l-[5px]",
              isRemoval ? "border-l-destructive/50" : "border-l-[hsl(var(--lavender))]",
            )}
          >
            {/* Ligne principale : visuel à gauche, statut / nom / date à droite */}
            <div className="flex gap-3 p-3 pb-2">
              <div className="shrink-0 w-[96px] h-[96px] rounded-xl border border-border/60 bg-background overflow-hidden shadow-sm">
                <img src={e.image_url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                      isRemoval
                        ? "bg-destructive/15 text-destructive"
                        : "bg-[hsl(var(--lavender)/0.22)] text-[hsl(275,42%,52%)]",
                    )}
                  >
                    {isRemoval ? "Suppression" : "Génération"}
                  </span>
                  <time
                    dateTime={e.created_at}
                    className="text-[11px] text-muted-foreground tabular-nums shrink-0"
                    title={formatCreatedAt(e.created_at)}
                  >
                    {formatCreatedAt(e.created_at)}
                  </time>
                </div>
                <p className="text-sm font-semibold text-foreground leading-snug truncate" title={e.block_name ?? undefined}>
                  {e.block_name?.trim() || "Case sans titre"}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">
                  {isRemoval ? "Une case avec cette image a été retirée du canvas." : "Image enregistrée sur le canvas."}
                </p>
              </div>
            </div>

            {/* Prompt repliable pour ne pas encombrer la liste */}
            <div className="px-3">
              <details className="group rounded-lg border border-border/55 bg-background/50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden hover:bg-muted/40 rounded-lg transition-colors">
                  Prompt
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="max-h-[220px] overflow-y-auto border-t border-border/50 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
                  {promptText ? promptText : <span className="italic">Aucun prompt enregistré pour cette entrée.</span>}
                </div>
              </details>
            </div>

            {/* Restaurer : uniquement suppressions avec image ; masqué après restauration ; jamais pour une simple génération */}
            {showRestore ? (
              <div className="px-3 pb-3 pt-2 mt-2 border-t border-border/50">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  disabled={!!restoringId}
                  onClick={() => onRestore(e)}
                >
                  {restoringId === e.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 shrink-0" />
                      Restauration…
                    </>
                  ) : (
                    "Restaurer sur le canvas"
                  )}
                </Button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
