import { useState, useCallback, useEffect, useRef } from "react";
import { X, Link2, Plus, Trash2, Save, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUpdateLoreNode, useDeleteLoreNode } from "@/hooks/useLoreNodes";
import { useCreateLoreEdge, useDeleteLoreEdge } from "@/hooks/useLoreEdges";
import { useCompassProposals } from "@/hooks/useCompassProposals";
import { CompassSuggestionsPanel } from "./CompassSuggestionsPanel";
import type { LoreNode, LoreEdge, LoreNodeType, Asset } from "@/types";
import { LORE_NODE_TYPE_CONFIG } from "@/types";

interface Props {
  node: LoreNode | null;
  nodes: LoreNode[];
  edges: LoreEdge[];
  assets: Asset[];
  projectId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_COLORS: Record<LoreNodeType, string> = {
  character: "border-violet-500 bg-violet-500/20 text-violet-300",
  location:  "border-blue-500 bg-blue-500/20 text-blue-300",
  object:    "border-amber-500 bg-amber-500/20 text-amber-300",
  event:     "border-green-500 bg-green-500/20 text-green-300",
};

export function LoreNodeSheet({ node, nodes, edges, assets, projectId, userId, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const updateNode = useUpdateLoreNode();
  const deleteNode = useDeleteLoreNode();
  const createEdge = useCreateLoreEdge();
  const deleteEdge = useDeleteLoreEdge();
  const {
    proposals,
    loading: arianeLoading,
    error: arianeError,
    fetchProposals,
    acceptProposal,
    dismissProposal,
    reset: resetAriane,
  } = useCompassProposals(projectId);

  const [name, setName] = useState("");
  const [type, setType] = useState<LoreNodeType>("character");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [newEdgeTargetId, setNewEdgeTargetId] = useState<string>("");
  const [newEdgeLabel, setNewEdgeLabel] = useState("");
  const [addingEdge, setAddingEdge] = useState(false);
  const [arianeOpen, setArianeOpen] = useState(false);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (node) {
      setName(node.name);
      setType(node.type);
      setDescription(node.description ?? "");
      setArianeOpen(false);
      resetAriane();
    }
  }, [node, resetAriane]);

  const connectedEdges = node
    ? edges.filter((e) => e.from_node_id === node.id || e.to_node_id === node.id)
    : [];

  const otherNodes = nodes.filter((n) => n.id !== node?.id);

  const handleSave = useCallback(async () => {
    if (!node) return;
    setSaving(true);
    try {
      await updateNode.mutateAsync({
        id: node.id,
        projectId,
        updates: { name, type, description: description || null },
      });
      toast({ title: "Sauvegardé", description: name });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [node, projectId, name, type, description, updateNode, toast]);

  const triggerAutoSave = useCallback(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      handleSave();
    }, 1000);
  }, [handleSave]);

  const handleDelete = useCallback(async () => {
    if (!node) return;
    try {
      await deleteNode.mutateAsync({ id: node.id, projectId });
      onOpenChange(false);
      toast({ title: "Nœud supprimé" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  }, [node, projectId, deleteNode, onOpenChange, toast]);

  const handleDeleteEdge = useCallback(async (edgeId: string) => {
    await deleteEdge.mutateAsync({ id: edgeId, projectId });
  }, [projectId, deleteEdge]);

  const handleAddEdge = useCallback(async () => {
    if (!node || !newEdgeTargetId) return;
    setAddingEdge(true);
    try {
      await createEdge.mutateAsync({
        project_id: projectId,
        user_id: userId,
        from_node_id: node.id,
        to_node_id: newEdgeTargetId,
        label: newEdgeLabel.trim() || null,
      });
      setNewEdgeTargetId("");
      setNewEdgeLabel("");
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter la connexion.", variant: "destructive" });
    } finally {
      setAddingEdge(false);
    }
  }, [node, projectId, userId, newEdgeTargetId, newEdgeLabel, createEdge, toast]);

  const handleArianeToggle = useCallback(() => {
    if (!arianeOpen && node) {
      fetchProposals(description.trim() || name, "lore_asset", node.id);
    } else {
      resetAriane();
    }
    setArianeOpen((v) => !v);
  }, [arianeOpen, description, name, node, fetchProposals, resetAriane]);

  const handleAddToLore = useCallback(async (content: string, proposalId: string) => {
    const newDesc = description.trim() ? `${description.trim()}\n\n${content}` : content;
    setDescription(newDesc);
    await acceptProposal(proposalId);
    triggerAutoSave();
  }, [description, acceptProposal, triggerAutoSave]);

  const handleRefreshAriane = useCallback(() => {
    if (!node) return;
    fetchProposals(description.trim() || name, "lore_asset", node.id);
  }, [description, name, node, fetchProposals]);

  const linkedAsset = node?.asset_id ? assets.find((a) => a.id === node.asset_id) : null;
  const imageUrl = linkedAsset?.image_url ?? node?.image_url ?? null;

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-white/10">
          <DialogTitle className="text-gradient text-lg">Détail du nœud</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Nom</label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); triggerAutoSave(); }}
              className="bg-white/5 border-white/10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(LORE_NODE_TYPE_CONFIG) as [LoreNodeType, { label: string; emoji: string }][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setType(key); triggerAutoSave(); }}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150",
                    type === key
                      ? TYPE_COLORS[key]
                      : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10",
                  ].join(" ")}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Image</label>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full max-h-40 object-cover rounded-xl border border-white/10"
              />
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                  {LORE_NODE_TYPE_CONFIG[type].emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Aucune image associée</p>
                  {assets.length > 0 && (
                    <Select
                      value=""
                      onValueChange={async (assetId) => {
                        const a = assets.find((x) => x.id === assetId);
                        if (!a) return;
                        await updateNode.mutateAsync({
                          id: node.id,
                          projectId,
                          updates: { asset_id: a.id, image_url: a.image_url },
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs border-0 bg-transparent text-violet-400 hover:text-violet-300 w-auto px-0 gap-1 mt-1 focus:ring-0">
                        <SelectValue placeholder="Associer un asset" />
                      </SelectTrigger>
                      <SelectContent className="glass border-white/10">
                        {assets.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            <div className="flex items-center gap-2">
                              {a.image_url && (
                                <img src={a.image_url} alt={a.name} className="w-5 h-5 rounded object-cover" />
                              )}
                              <span>{a.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Description</label>
              <button
                type="button"
                onClick={handleArianeToggle}
                className={[
                  "flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-all duration-150",
                  arianeOpen
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                    : "text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10",
                ].join(" ")}
              >
                <Sparkles className="h-3 w-3" />
                Ariane
              </button>
            </div>
            <Textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); triggerAutoSave(); }}
              placeholder="Décris ce nœud — rôle, histoire, apparence…"
              className="min-h-[100px] resize-none text-sm bg-white/5 border-white/10"
              maxLength={800}
            />
            <span className="text-xs text-muted-foreground">{description.length}/800</span>

            <CompassSuggestionsPanel
              proposals={proposals}
              loading={arianeLoading}
              error={arianeError}
              onAddToLore={handleAddToLore}
              onDismiss={dismissProposal}
              onRefresh={handleRefreshAriane}
              isOpen={arianeOpen}
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-2">
              <Link2 className="h-3 w-3" />
              Connexions ({connectedEdges.length})
            </label>
            {connectedEdges.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">Aucune connexion</p>
            ) : (
              <div className="space-y-1.5">
                {connectedEdges.map((edge) => {
                  const otherId = edge.from_node_id === node.id ? edge.to_node_id : edge.from_node_id;
                  const otherNode = nodes.find((n) => n.id === otherId);
                  const direction = edge.from_node_id === node.id ? "→" : "←";
                  return (
                    <div key={edge.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-xs">
                      <span className="text-muted-foreground">{direction}</span>
                      <span className="font-medium truncate flex-1">
                        {LORE_NODE_TYPE_CONFIG[otherNode?.type ?? "character"].emoji} {otherNode?.name ?? "…"}
                      </span>
                      {edge.label && (
                        <span className="text-muted-foreground italic truncate max-w-[100px]">{edge.label}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteEdge(edge.id)}
                        className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-1 space-y-2">
              <p className="text-xs text-muted-foreground">+ Ajouter une connexion</p>
              <div className="flex gap-2">
                <Select value={newEdgeTargetId} onValueChange={setNewEdgeTargetId}>
                  <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-xs h-8">
                    <SelectValue placeholder="Sélectionner un nœud…" />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10">
                    {otherNodes.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {LORE_NODE_TYPE_CONFIG[n.type].emoji} {n.name}
                      </SelectItem>
                    ))}
                    {otherNodes.length === 0 && (
                      <SelectItem value="__none__" disabled>Aucun autre nœud</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  value={newEdgeLabel}
                  onChange={(e) => setNewEdgeLabel(e.target.value)}
                  placeholder="Relation…"
                  className="w-28 bg-white/5 border-white/10 text-xs h-8"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddEdge}
                  disabled={!newEdgeTargetId || addingEdge}
                  className="h-8 px-2 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteNode.isPending}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gradient-primary text-primary-foreground gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Sauvegarder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
