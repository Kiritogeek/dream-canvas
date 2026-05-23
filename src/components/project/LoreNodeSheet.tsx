import { useState, useCallback, useEffect, useRef } from "react";
import { X, Plus, Trash2, Save, Loader2, Sparkles } from "lucide-react";
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

// ── Noms de sections par type ──────────────────────────────────────────────
const LORE_CHIPS: Record<LoreNodeType, string[]> = {
  character: ["Apparence", "Personnalité", "Histoire", "Motivations", "Capacités"],
  location:  ["Description", "Atmosphère", "Histoire", "Habitants", "Règles"],
  object:    ["Apparence", "Origine", "Propriétés", "Propriétaires", "Symbolique"],
  event:     ["Époque", "Participants", "Déclencheur", "Déroulement", "Conséquences"],
};

// ── Placeholders contextuels par section ──────────────────────────────────
const SECTION_PLACEHOLDERS: Record<LoreNodeType, Record<string, string>> = {
  character: {
    Apparence:    "Taille, couleur des yeux, cicatrices, tenue habituelle…",
    Personnalité: "Traits dominants, manies, peurs, valeurs…",
    Histoire:     "Origines, événements fondateurs, traumatismes…",
    Motivations:  "Ce qu'il veut vraiment, ses objectifs cachés…",
    Capacités:    "Pouvoirs, compétences, armes de prédilection…",
  },
  location: {
    Description:  "Architecture, taille, matériaux, couleurs dominantes…",
    Atmosphère:   "Odeurs, sons, lumière, ressenti général…",
    Histoire:     "Fondation, événements marquants, ruines…",
    Habitants:    "Qui y vit, factions présentes, dangers…",
    Règles:       "Lois locales, tabous, accès restreint…",
  },
  object: {
    Apparence:    "Forme, couleur, matière, taille, ornements…",
    Origine:      "Qui l'a fabriqué, quand, comment…",
    Propriétés:   "Pouvoirs, effets, limitations, conditions d'activation…",
    Propriétaires: "Qui l'a possédé, comment il a changé de mains…",
    Symbolique:   "Ce qu'il représente, mythes associés, valeur émotionnelle…",
  },
  event: {
    Époque:       "Date, durée, contexte historique…",
    Participants: "Personnages impliqués, factions, victimes…",
    Déclencheur:  "Cause directe, tensions sous-jacentes…",
    Déroulement:  "Chronologie, moments clés, retournements…",
    Conséquences: "Impact immédiat, séquelles à long terme…",
  },
};

// ── Conversion sections ↔ description markdown ────────────────────────────
function parseToSections(desc: string, sectionNames: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  sectionNames.forEach((n) => (result[n] = ""));
  const parts = desc.split(/^### (.+)$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].trim();
    const content = (parts[i + 1] ?? "").trim();
    if (key in result) result[key] = content;
  }
  return result;
}

function buildDescription(sections: Record<string, string>, sectionNames: string[]): string {
  return sectionNames
    .filter((n) => sections[n]?.trim())
    .map((n) => `### ${n}\n${sections[n].trim()}`)
    .join("\n\n");
}

interface Props {
  node: LoreNode | null;
  nodes: LoreNode[];
  edges: LoreEdge[];
  assets: Asset[];
  projectId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdgeCreated?: () => void;
}

const TYPE_COLORS: Record<LoreNodeType, string> = {
  character: "border-violet-500 bg-violet-500/20 text-violet-300",
  location:  "border-blue-500 bg-blue-500/20 text-blue-300",
  object:    "border-amber-500 bg-amber-500/20 text-amber-300",
  event:     "border-green-500 bg-green-500/20 text-green-300",
};

export function LoreNodeSheet({ node, nodes, edges, assets, projectId, userId, open, onOpenChange, onEdgeCreated }: Props) {
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
  const [sections, setSections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [newEdgeTargetId, setNewEdgeTargetId] = useState<string>("");
  const [newEdgeLabel, setNewEdgeLabel] = useState("");
  const [addingEdge, setAddingEdge] = useState(false);
  const [arianeOpen, setArianeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"lore" | "connexions">("lore");
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (node) {
      setName(node.name);
      setType(node.type);
      setSections(parseToSections(node.description ?? "", LORE_CHIPS[node.type]));
      setArianeOpen(false);
      setActiveTab("lore");
      resetAriane();
    }
  }, [node, resetAriane]);

  const connectedEdges = node
    ? edges.filter((e) => e.from_node_id === node.id || e.to_node_id === node.id)
    : [];

  const otherNodes = nodes.filter((n) => n.id !== node?.id);

  const connectedNodeIds = new Set(
    connectedEdges.map((e) => (e.from_node_id === node?.id ? e.to_node_id : e.from_node_id))
  );
  const availableNodes = otherNodes.filter((n) => !connectedNodeIds.has(n.id));

  const handleSave = useCallback(async () => {
    if (!node) return;
    setSaving(true);
    const loreDescription = buildDescription(sections, LORE_CHIPS[type]);
    try {
      await updateNode.mutateAsync({
        id: node.id,
        projectId,
        updates: { name, type, description: loreDescription || null },
      });
      toast({ title: "Sauvegardé", description: name });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [node, projectId, name, type, sections, updateNode, toast]);

  const triggerAutoSave = useCallback(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => { handleSave(); }, 1000);
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
      onEdgeCreated?.();
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter la connexion.", variant: "destructive" });
    } finally {
      setAddingEdge(false);
    }
  }, [node, projectId, userId, newEdgeTargetId, newEdgeLabel, createEdge, toast, onEdgeCreated]);

  const handleArianeToggle = useCallback(() => {
    const loreDescription = buildDescription(sections, LORE_CHIPS[type]);
    if (!arianeOpen && node) {
      fetchProposals(loreDescription.trim() || name, "lore_asset", node.id);
    } else {
      resetAriane();
    }
    setArianeOpen((v) => !v);
  }, [arianeOpen, sections, type, name, node, fetchProposals, resetAriane]);

  const handleAddToLore = useCallback(async (content: string, proposalId: string) => {
    const sectionNames = LORE_CHIPS[type];
    const emptySection = sectionNames.find((s) => !sections[s]?.trim());
    const targetSection = emptySection ?? sectionNames[sectionNames.length - 1];
    setSections((prev) => ({
      ...prev,
      [targetSection]: prev[targetSection]?.trim()
        ? `${prev[targetSection].trim()}\n\n${content}`
        : content,
    }));
    await acceptProposal(proposalId);
    triggerAutoSave();
  }, [type, sections, acceptProposal, triggerAutoSave]);

  const handleRefreshAriane = useCallback(() => {
    if (!node) return;
    const loreDescription = buildDescription(sections, LORE_CHIPS[type]);
    fetchProposals(loreDescription.trim() || name, "lore_asset", node.id);
  }, [sections, type, name, node, fetchProposals]);

  const linkedAsset = node?.asset_id ? assets.find((a) => a.id === node.asset_id) : null;
  const imageUrl = linkedAsset?.image_url ?? node?.image_url ?? null;

  if (!node) return null;

  const TYPE_PLACEHOLDER_BG: Record<LoreNodeType, string> = {
    character: "bg-violet-950/90",
    location:  "bg-blue-950/90",
    object:    "bg-amber-950/90",
    event:     "bg-green-950/90",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 sm:max-w-[780px] p-0 overflow-hidden">
        <div className="flex max-h-[88vh]">

          {/* ── Colonne gauche : image pleine hauteur ── */}
          <div className={[
            "w-[260px] shrink-0 relative flex items-center justify-center min-h-[460px]",
            !imageUrl ? (TYPE_PLACEHOLDER_BG[type] ?? "bg-white/5") : "bg-black",
          ].join(" ")}>
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className={[
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold",
                    TYPE_COLORS[type],
                  ].join(" ")}>
                    {LORE_NODE_TYPE_CONFIG[type].emoji} {LORE_NODE_TYPE_CONFIG[type].label}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 px-4 relative z-10">
                <span className="text-8xl opacity-20">{LORE_NODE_TYPE_CONFIG[type].emoji}</span>
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
                    <SelectTrigger className="h-8 text-xs border-white/20 bg-white/10 text-white/70 hover:text-white w-44 gap-1">
                      <SelectValue placeholder="🖼 Associer un asset" />
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
            )}
          </div>

          {/* ── Colonne droite : onglets ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* Header + nom du nœud */}
            <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
              <DialogTitle className="text-gradient text-base">{node.name}</DialogTitle>
            </DialogHeader>

            {/* Onglets */}
            <div className="flex gap-0 px-5 border-b border-white/10 shrink-0">
              {(["lore", "connexions"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    "px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors duration-150",
                    activeTab === tab
                      ? "border-violet-400 text-violet-300"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {tab === "connexions" ? `Connexions (${connectedEdges.length})` : "Lore"}
                </button>
              ))}
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4">

              {/* ── Onglet Lore : sous-sections structurées ── */}
              {activeTab === "lore" && (
                <div className="space-y-4">
                  {LORE_CHIPS[type].map((sectionName) => (
                    <div key={sectionName} className="space-y-1">
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                        {sectionName}
                      </label>
                      <Textarea
                        value={sections[sectionName] ?? ""}
                        onChange={(e) => {
                          setSections((prev) => ({ ...prev, [sectionName]: e.target.value }));
                          triggerAutoSave();
                        }}
                        placeholder={SECTION_PLACEHOLDERS[type]?.[sectionName] ?? ""}
                        className="min-h-[64px] resize-none text-sm bg-white/5 border-white/10 leading-relaxed"
                        maxLength={300}
                      />
                    </div>
                  ))}

                  {/* Bouton Ariane aligné à droite */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleArianeToggle}
                      className={[
                        "flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-all duration-150",
                        arianeOpen
                          ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                          : "text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10",
                      ].join(" ")}
                    >
                      <Sparkles className="h-3 w-3" />
                      Ariane
                    </button>
                  </div>

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
              )}

              {/* ── Onglet Connexions ── */}
              {activeTab === "connexions" && (
                <div className="space-y-3">
                  {connectedEdges.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic">Aucune connexion</p>
                  ) : (
                    <div className="space-y-1.5">
                      {connectedEdges.map((edge) => {
                        const otherId = edge.from_node_id === node.id ? edge.to_node_id : edge.from_node_id;
                        const otherNode = nodes.find((n) => n.id === otherId);
                        return (
                          <div key={edge.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-xs">
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

                  <div className="pt-2 space-y-2 border-t border-white/10">
                    <p className="text-xs text-muted-foreground font-medium">+ Ajouter une connexion</p>
                    <div className="flex gap-2">
                      <Select value={newEdgeTargetId} onValueChange={setNewEdgeTargetId}>
                        <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-xs h-8">
                          <SelectValue placeholder="Sélectionner un nœud…" />
                        </SelectTrigger>
                        <SelectContent className="glass border-white/10">
                          {availableNodes.map((n) => (
                            <SelectItem key={n.id} value={n.id}>
                              {LORE_NODE_TYPE_CONFIG[n.type].emoji} {n.name}
                            </SelectItem>
                          ))}
                          {availableNodes.length === 0 && (
                            <SelectItem value="__none__" disabled>
                              {otherNodes.length === 0 ? "Aucun autre nœud" : "Tous déjà connectés"}
                            </SelectItem>
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
              )}

            </div>

            {/* Footer sticky */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-white/10 shrink-0">
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
              {activeTab === "lore" && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="gradient-primary text-primary-foreground gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Sauvegarder
                </Button>
              )}
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
