import { Sparkles, Search, X, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompassProposal } from "@/types";

interface Props {
  proposals: CompassProposal[];
  loading: boolean;
  error: string | null;
  onAddToLore: (content: string, proposalId: string) => void;
  onDismiss: (proposalId: string) => void;
  onRefresh: () => void;
  isOpen: boolean;
}

export function CompassSuggestionsPanel({
  proposals,
  loading,
  error,
  onAddToLore,
  onDismiss,
  onRefresh,
  isOpen,
}: Props) {
  if (!isOpen) return null;

  const extracted = proposals.filter((p) => p.origin === "extracted");
  const generated = proposals.filter((p) => p.origin === "generated");

  return (
    <div className="mt-3 glass rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
        <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />
        <span className="text-sm font-medium text-foreground">Suggestions Ariane</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-auto text-muted-foreground hover:text-foreground"
          onClick={onRefresh}
          disabled={loading}
          title="Redemander 3 nouvelles directions"
        >
          <RefreshCw className={["h-3 w-3", loading ? "animate-spin" : ""].join(" ")} />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Ariane analyse tes chapitres…</span>
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-destructive py-2">{error}</p>
        )}

        {!loading && !error && proposals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune suggestion pour le moment. Écris quelques chapitres pour qu&apos;Ariane puisse t&apos;aider.
          </p>
        )}

        {extracted.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Search className="h-3 w-3" />
              <span>Tiré de ton histoire</span>
            </div>
            {extracted.map((p) => (
              <ProposalCard key={p.id} proposal={p} onAdd={onAddToLore} onDismiss={onDismiss} />
            ))}
          </div>
        )}

        {generated.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Sparkles className="h-3 w-3 text-violet-400" />
              <span>Proposé par Ariane</span>
            </div>
            {generated.map((p) => (
              <ProposalCard key={p.id} proposal={p} onAdd={onAddToLore} onDismiss={onDismiss} variant="generated" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  onAdd,
  onDismiss,
  variant = "extracted",
}: {
  proposal: CompassProposal;
  onAdd: (content: string, id: string) => void;
  onDismiss: (id: string) => void;
  variant?: "extracted" | "generated";
}) {
  return (
    <div
      className={[
        "rounded-lg p-3 space-y-2 border",
        variant === "generated"
          ? "bg-violet-500/5 border-violet-500/20"
          : "bg-white/[0.03] border-white/10",
      ].join(" ")}
    >
      <p className="text-sm text-foreground leading-relaxed">{proposal.content}</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs gap-1 hover:bg-white/10"
          onClick={() => onAdd(proposal.content, proposal.id)}
        >
          <Check className="h-3 w-3" />
          Ajouter au lore
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-white/10"
          onClick={() => onDismiss(proposal.id)}
        >
          <X className="h-3 w-3" />
          Ignorer
        </Button>
      </div>
    </div>
  );
}
