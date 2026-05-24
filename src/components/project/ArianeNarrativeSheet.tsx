import { Sparkles, Loader2, Star, AlertTriangle, Map, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { NarrativeDirection } from "@/services/scenarioAI";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directions: NarrativeDirection[];
  isGenerating: boolean;
  error: string | null;
  pendingProposalsCount: number;
  loreStats: { total: number; withDescription: number };
  generate: () => void;
  reset: () => void;
  onSelectDirection?: (prompt: string) => void;
}

export function ArianeNarrativeSheet({
  open,
  onOpenChange,
  directions,
  isGenerating,
  error,
  pendingProposalsCount,
  loreStats,
  generate,
  reset,
  onSelectDirection,
}: Props) {
  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSelect = (body: string) => {
    onSelectDirection?.(body);
    onOpenChange(false);
  };

  const handleNoSelect = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass border-white/10 sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-white/10">
          <DialogTitle className="text-gradient flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Propositions Ariane
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
                    plus le Lore est détaillé, plus les propositions sont précises
                  </p>
                </div>
              </div>

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
                      Ariane les inclut dans l'analyse. Les intégrer à l'Univers affinera les propositions.
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground px-1">
                Ariane analyse ton Lore, les éléments détectés dans le scénario et tes derniers
                chapitres pour suggérer 3 pistes narratives pour la suite.
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {directions.slice(0, 3).map((d, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-3 px-4 py-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-colors duration-150"
                  >
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-sm font-semibold leading-snug">{d.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">{d.body}</p>
                    <Button
                      size="sm"
                      onClick={() => handleSelect(d.body)}
                      className="w-full gap-1.5 gradient-primary text-primary-foreground mt-auto"
                    >
                      Sélectionner
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {error && <p className="text-xs text-red-400 px-1">{error}</p>}

              <Button
                onClick={handleNoSelect}
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Ne pas sélectionner
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
