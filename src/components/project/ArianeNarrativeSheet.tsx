import { Sparkles, Loader2, RefreshCw, Star, AlertTriangle, Map } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNarrativeDirections } from "@/hooks/useNarrativeDirections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ArianeNarrativeSheet({ open, onOpenChange, projectId }: Props) {
  const { directions, isGenerating, error, pendingProposalsCount, loreStats, generate, reset } =
    useNarrativeDirections(projectId);

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass border-white/10 sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-white/10">
          <DialogTitle className="text-gradient flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Directions narratives — Ariane
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {directions.length === 0 && !isGenerating ? (
            <>
              {/* Lore stats */}
              <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <Map className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {loreStats.total} élément{loreStats.total !== 1 ? "s" : ""} dans ton Univers
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {loreStats.withDescription} avec description ·{" "}
                    {loreStats.total - loreStats.withDescription} sans —{" "}
                    plus le Lore est détaillé, plus les directions sont précises
                  </p>
                </div>
              </div>

              {/* Pending proposals warning */}
              {pendingProposalsCount > 0 && (
                <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">
                      {pendingProposalsCount} élément
                      {pendingProposalsCount !== 1 ? "s" : ""} détecté
                      {pendingProposalsCount !== 1 ? "s" : ""} non encore dans l'Univers
                    </p>
                    <p className="text-xs text-amber-400/70 mt-0.5">
                      Ariane les inclut dans l'analyse. Les intégrer à l'Univers (onglet Univers → FAB
                      Ariane) affinera les directions.
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground px-1">
                Ariane analyse ton Lore, les éléments détectés dans le scénario et tes derniers
                chapitres pour suggérer 4 pistes narratives pour la suite.
              </p>

              {error && <p className="text-xs text-red-400 px-1">{error}</p>}

              <Button
                onClick={generate}
                className="w-full gradient-primary text-primary-foreground gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Générer avec Ariane
              </Button>
            </>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
              <p className="text-sm text-muted-foreground">Ariane analyse ton univers…</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {directions.map((d, i) => (
                  <div
                    key={i}
                    className="px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-colors duration-150"
                  >
                    <div className="flex items-start gap-2.5">
                      <Star className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{d.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-xs text-red-400 px-1">{error}</p>}

              <Button
                onClick={() => { reset(); generate(); }}
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regénérer
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
