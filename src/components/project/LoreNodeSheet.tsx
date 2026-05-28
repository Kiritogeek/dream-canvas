import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Trash2, Sparkles, AlertTriangle, Unlink } from "lucide-react";
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
import { useScenarioChapters } from "@/hooks/useScenarioChapters";
import { useCompassProposals } from "@/hooks/useCompassProposals";
import { CompassSuggestionsPanel } from "./CompassSuggestionsPanel";
import type { LoreNode, LoreEdge, LoreNodeType, Asset } from "@/types";
import { LORE_NODE_TYPE_CONFIG } from "@/types";

// ── Mapping type lore → type asset ────────────────────────────────────────
const NODE_TYPE_TO_ASSET_TYPE: Partial<Record<LoreNodeType, Asset["asset_type"]>> = {
  character: "character",
  location:  "background",
  object:    "object",
  // event : pas de type asset correspondant
};

// ── Sections prédéfinies par type ─────────────────────────────────────────
const LORE_CHIPS: Record<LoreNodeType, string[]> = {
  character: ["Apparence", "Personnalité", "Histoire", "Motivations", "Capacités"],
  location:  ["Description", "Atmosphère", "Histoire", "Habitants", "Règles"],
  object:    ["Apparence", "Origine", "Propriétés", "Propriétaires", "Symbolique"],
  event:     ["Époque", "Participants", "Déclencheur", "Déroulement", "Conséquences"],
};

// ── Placeholders contextuels ──────────────────────────────────────────────
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

// ── Helpers sections ↔ markdown ───────────────────────────────────────────
function parseToSections(desc: string, predefined: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  predefined.forEach((n) => (result[n] = ""));
  const parts = desc.split(/^### (.+)$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].trim();
    const content = (parts[i + 1] ?? "").trim();
    result[key] = content;
  }
  return result;
}

function buildDescription(sections: Record<string, string>, predefined: string[]): string {
  const allKeys = [
    ...predefined,
    ...Object.keys(sections).filter((k) => !predefined.includes(k)),
  ];
  return allKeys
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
  onNodeUpdated?: (node: LoreNode) => void;
}

const TYPE_COLORS: Record<LoreNodeType, string> = {
  character: "border-violet-500 bg-violet-500/80 text-white",
  location:  "border-blue-500   bg-blue-500/80   text-white",
  object:    "border-amber-500  bg-amber-500/80  text-white",
  event:     "border-green-500  bg-green-500/80  text-white",
};


export function LoreNodeSheet({ node, nodes, edges, assets, projectId, userId, open, onOpenChange, onEdgeCreated, onNodeUpdated }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const updateNode = useUpdateLoreNode();
  const deleteNode = useDeleteLoreNode();
  const createEdge = useCreateLoreEdge();
  const deleteEdge = useDeleteLoreEdge();
  const { data: chapters = [] } = useScenarioChapters(projectId);
  const sortedChapters = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);
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
  const [activePills, setActivePills] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");
  const [showPicker, setShowPicker] = useState(false);
  const [newCustomName, setNewCustomName] = useState("");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [newEdgeTargetId, setNewEdgeTargetId] = useState<string>("");
  const [newEdgeLabel, setNewEdgeLabel] = useState("");
  const [addingEdge, setAddingEdge] = useState(false);
  const [arianeOpen, setArianeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"lore" | "connexions">("lore");
  const [chapterId, setChapterId] = useState<string | null>(null);

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const typePickerRef = useRef<HTMLDivElement>(null);
  const prevNodeIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setNewCustomName("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  useEffect(() => {
    if (!showTypePicker) return;
    const handler = (e: MouseEvent) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) {
        setShowTypePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTypePicker]);

  useEffect(() => {
    if (!node) return;
    const isNewNode = node.id !== prevNodeIdRef.current;
    prevNodeIdRef.current = node.id;

    const predefined = LORE_CHIPS[node.type];
    const parsed = parseToSections(node.description ?? "", predefined);
    const customKeys = Object.keys(parsed).filter(
      (k) => !predefined.includes(k) && !!parsed[k]?.trim()
    );

    if (isNewNode) {
      // Ouverture d'un nœud différent — reset complet de l'UI
      setName(node.name);
      setType(node.type);
      setSections(parsed);
      setActivePills([...predefined.slice(0, 2), ...customKeys]);
      setActiveSection(predefined[0]);
      setArianeOpen(false);
      setChapterId(node.chapter_id ?? null);
      setActiveTab("lore");
      setShowPicker(false);
      setNewCustomName("");
      setShowTypePicker(false);
      resetAriane();
    } else {
      // Mise à jour du même nœud (ex: retour après sauvegarde auto) — ne pas toucher à l'UI
      setName(node.name);
      setChapterId(node.chapter_id ?? null);
    }
  }, [node, resetAriane]);

  // ── Assets filtrés : type correspondant + non déjà liés à un autre nœud ──
  const assetTypeForType = NODE_TYPE_TO_ASSET_TYPE[type];
  const filteredAssets = assetTypeForType
    ? assets.filter((a) => {
        if (a.asset_type !== assetTypeForType) return false;
        return !nodes.some((n) => n.id !== node?.id && n.asset_id === a.id);
      })
    : [];

  const availablePredefined = LORE_CHIPS[type].filter((s) => !activePills.includes(s));
  const availableCustom = Object.keys(sections).filter(
    (k) => !LORE_CHIPS[type].includes(k) && !activePills.includes(k) && k.trim() !== ""
  );

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
    const loreDescription = buildDescription(sections, LORE_CHIPS[type]);
    try {
      const result = await updateNode.mutateAsync({
        id: node.id,
        projectId,
        updates: { name, type, description: loreDescription || null, chapter_id: chapterId },
      });
      onNodeUpdated?.(result);
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    }
  }, [node, projectId, name, type, sections, chapterId, updateNode, onNodeUpdated, toast]);

  const triggerAutoSave = useCallback(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => { handleSave(); }, 1000);
  }, [handleSave]);

  // ── Changer le type ───────────────────────────────────────────────────────
  const handleTypeChange = useCallback((newType: LoreNodeType) => {
    if (newType === type) return;
    setType(newType);
    setActivePills(LORE_CHIPS[newType].slice(0, 2));
    setActiveSection(LORE_CHIPS[newType][0]);
    // Mise à jour visuelle immédiate de la card (avant sauvegarde explicite)
    if (node) onNodeUpdated?.({ ...node, type: newType });
  }, [type, node, onNodeUpdated]);

  // ── Dissocier le visuel ───────────────────────────────────────────────────
  const handleDissociate = useCallback(async () => {
    if (!node) return;
    try {
      const result = await updateNode.mutateAsync({
        id: node.id,
        projectId,
        updates: { asset_id: null, image_url: null },
      });
      onNodeUpdated?.(result);
    } catch {
      toast({ title: "Erreur", description: "Impossible de dissocier.", variant: "destructive" });
    }
  }, [node, projectId, updateNode, onNodeUpdated, toast]);

  // ── Créer un asset depuis Assets ─────────────────────────────────────────
  const handleCreateAsset = useCallback(() => {
    if (!node || !assetTypeForType) return;
    navigate(
      `/dashboard/projects/${projectId}?tab=assets&pendingName=${encodeURIComponent(node.name)}&pendingType=${assetTypeForType}`
    );
  }, [navigate, projectId, node, assetTypeForType]);

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
    setSections((prev) => ({
      ...prev,
      [activeSection]: prev[activeSection]?.trim()
        ? `${prev[activeSection].trim()}\n\n${content}`
        : content,
    }));
    await acceptProposal(proposalId);
    triggerAutoSave();
  }, [activeSection, acceptProposal, triggerAutoSave]);

  const handleRefreshAriane = useCallback(() => {
    if (!node) return;
    const loreDescription = buildDescription(sections, LORE_CHIPS[type]);
    fetchProposals(loreDescription.trim() || name, "lore_asset", node.id);
  }, [sections, type, name, node, fetchProposals]);

  const addPill = useCallback((sectionName: string) => {
    setActivePills((prev) => [...prev, sectionName]);
    setActiveSection(sectionName);
    setShowPicker(false);
    setNewCustomName("");
  }, []);

  const removePill = useCallback((sectionName: string) => {
    setActivePills((prev) => {
      const next = prev.filter((s) => s !== sectionName);
      setActiveSection((cur) => cur === sectionName ? (next[0] ?? "") : cur);
      return next;
    });
    triggerAutoSave();
  }, [triggerAutoSave]);

  const createCustomSection = useCallback(() => {
    const trimmed = newCustomName.trim();
    if (!trimmed || activePills.includes(trimmed)) return;
    setSections((prev) => ({ ...prev, [trimmed]: "" }));
    setActivePills((prev) => [...prev, trimmed]);
    setActiveSection(trimmed);
    setShowPicker(false);
    setNewCustomName("");
  }, [newCustomName, activePills]);

  const linkedAsset = node?.asset_id ? assets.find((a) => a.id === node.asset_id) : null;
  const imageUrl = linkedAsset?.image_url ?? node?.image_url ?? null;

  if (!node) return null;

  const TYPE_PLACEHOLDER_BG: Record<LoreNodeType, string> = {
    character: "bg-violet-950/90",
    location:  "bg-blue-950/90",
    object:    "bg-amber-950/90",
    event:     "bg-green-950/90",
  };

  const isCustomSection = !LORE_CHIPS[type].includes(activeSection);
  const placeholder = isCustomSection
    ? "Contenu libre…"
    : (SECTION_PLACEHOLDERS[type]?.[activeSection] ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-white/10 sm:max-w-[780px] p-0 overflow-hidden">
        <div className="flex max-h-[88vh]">

          {/* ── Colonne gauche : image pleine hauteur ── */}
          <div className={[
            "w-[260px] shrink-0 relative flex items-center justify-center min-h-[460px]",
            !imageUrl ? (TYPE_PLACEHOLDER_BG[type] ?? "bg-white/5") : "bg-black",
          ].join(" ")}>
            {imageUrl ? (
              <>
                <img src={imageUrl} alt={name} className="absolute inset-0 w-full h-full object-cover object-top" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                {/* Bouton Dissocier — coin supérieur droit */}
                <button
                  type="button"
                  onClick={handleDissociate}
                  title="Dissocier l'asset"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-500/70 text-white/50 hover:text-white transition-all duration-150 backdrop-blur-sm"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-4 relative z-10 w-full pb-14">
                <span className="text-8xl opacity-20">{LORE_NODE_TYPE_CONFIG[type].emoji}</span>

                {filteredAssets.length > 0 ? (
                  /* Picker filtré par type + non déjà liés */
                  <Select value="" onValueChange={async (assetId) => {
                    const a = assets.find((x) => x.id === assetId);
                    if (!a) return;
                    const result = await updateNode.mutateAsync({
                      id: node.id,
                      projectId,
                      updates: { asset_id: a.id, image_url: a.image_url },
                    });
                    onNodeUpdated?.(result);
                  }}>
                    <SelectTrigger className="h-8 text-xs border-white/20 bg-white/10 text-white/70 hover:text-white w-44 gap-1">
                      <SelectValue placeholder="🖼 Associer un asset" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10">
                      {filteredAssets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center gap-2">
                            {a.image_url && <img src={a.image_url} alt={a.name} className="w-5 h-5 rounded object-cover" />}
                            <span>{a.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : assetTypeForType ? (
                  /* Aucun asset du bon type disponible → créer */
                  <button
                    type="button"
                    onClick={handleCreateAsset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/8 text-white/70 hover:text-white hover:bg-white/15 hover:border-white/30 text-xs font-medium transition-all duration-150"
                  >
                    <Plus className="h-3 w-3" />
                    Créer l'asset
                  </button>
                ) : type === "event" ? (
                  /* Événements : sélecteur de chapitre source */
                  <div className="w-full px-3 space-y-1.5">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest text-center">Chapitre source</p>
                    <Select value={chapterId ?? "none"} onValueChange={(v) => { setChapterId(v === "none" ? null : v); triggerAutoSave(); }}>
                      <SelectTrigger className="h-8 text-xs border-white/20 bg-white/10 text-white/70 hover:text-white w-full gap-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-white/10">
                        <SelectItem value="none">Avant l'histoire</SelectItem>
                        {sortedChapters.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            Chap. {ch.chapter_number} — {ch.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            )}

            {/* Badge type — toujours visible en bas gauche, cliquable pour changer le type */}
            <div className="absolute bottom-4 left-4 z-10" ref={typePickerRef}>
              <button
                type="button"
                onClick={() => setShowTypePicker((v) => !v)}
                className={[
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all duration-150 hover:brightness-125",
                  TYPE_COLORS[type],
                ].join(" ")}
              >
                {LORE_NODE_TYPE_CONFIG[type].emoji} {LORE_NODE_TYPE_CONFIG[type].label}
              </button>

              {showTypePicker && (
                <div className="absolute bottom-full mb-2 left-0 w-44 bg-popover border border-white/15 rounded-xl shadow-2xl py-1 z-50">
                  {(Object.entries(LORE_NODE_TYPE_CONFIG) as [LoreNodeType, { label: string; emoji: string }][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { handleTypeChange(key); setShowTypePicker(false); }}
                      className={[
                        "w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2",
                        type === key
                          ? "text-foreground bg-white/8"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/8",
                      ].join(" ")}
                    >
                      <span>{cfg.emoji}</span>
                      <span>{cfg.label}</span>
                      {type === key && <span className="ml-auto text-violet-400 text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Colonne droite ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* Header : nom */}
            <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
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

              {/* ── Onglet Lore ── */}
              {activeTab === "lore" && (
                <div className="space-y-3">

                  {/* Avertissement : pas d'asset lié */}
                  {!node.asset_id && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                      <span>
                        {assets.length > 0
                          ? "Cet élément n'est pas lié à un asset — associe-en un (colonne gauche) pour ancrer son Lore dans un visuel."
                          : "Cet élément n'est pas lié à un asset. Crée d'abord un asset dans la section Assets de ton projet."}
                      </span>
                    </div>
                  )}

                  {/* Pills + bouton "+" */}
                  <div className="flex items-start gap-1.5" ref={pickerRef}>
                    {/* Pills wrappables */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                      {activePills.map((sectionName) => {
                        const filled = !!(sections[sectionName]?.trim());
                        const active = activeSection === sectionName;
                        const isCustom = !LORE_CHIPS[type].includes(sectionName);
                        return (
                          <div key={sectionName} className="group relative">
                            <button
                              type="button"
                              onClick={() => setActiveSection(sectionName)}
                              className={[
                                "inline-flex items-center gap-1.5 pl-3 pr-5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150",
                                active
                                  ? "bg-violet-500/20 border-violet-500/40 text-violet-200"
                                  : filled
                                    ? "bg-white/8 border-white/20 text-foreground hover:bg-white/12"
                                    : "bg-transparent border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground",
                              ].join(" ")}
                            >
                              {filled && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />}
                              {isCustom && !filled && <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />}
                              {sectionName}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removePill(sectionName); }}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center justify-center w-3 h-3 rounded-full hover:bg-white/25 transition-all duration-100"
                              aria-label={`Supprimer la section ${sectionName}`}
                            >
                              <X className="h-2 w-2 text-white/70" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bouton "+" — toujours ancré à droite, hors du wrap */}
                    <div className="relative shrink-0 mt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowPicker((v) => !v)}
                        className={[
                          "w-6 h-6 rounded-full border text-xs flex items-center justify-center transition-all duration-150",
                          showPicker
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                            : "bg-white/5 border-white/15 text-muted-foreground hover:bg-white/10 hover:border-white/25 hover:text-foreground",
                        ].join(" ")}
                      >
                        <Plus className="h-3 w-3" />
                      </button>

                      {showPicker && (
                        <div className="absolute top-8 right-0 z-50 w-52 bg-popover border border-white/15 rounded-xl shadow-2xl overflow-hidden py-1">
                          {availablePredefined.map((s) => (
                            <button key={s} type="button" onClick={() => addPill(s)}
                              className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-white/10 transition-colors">
                              {s}
                            </button>
                          ))}
                          {availableCustom.map((s) => (
                            <button key={s} type="button" onClick={() => addPill(s)}
                              className="w-full text-left px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-500/10 transition-colors flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                              {s}
                            </button>
                          ))}
                          <div className="border-t border-white/10 my-1" />
                          <div className="px-3 py-2 flex items-center gap-2">
                            <Input
                              value={newCustomName}
                              onChange={(e) => setNewCustomName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") createCustomSection(); }}
                              placeholder="Nouvelle section…"
                              className="h-6 text-xs bg-white/5 border-white/10 flex-1 px-2 py-0"
                              autoFocus
                            />
                            <button type="button" onClick={createCustomSection}
                              disabled={!newCustomName.trim()}
                              className="text-violet-400 hover:text-violet-300 disabled:opacity-30 disabled:cursor-default transition-colors">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Textarea section active */}
                  <div className="space-y-1">
                    <Textarea
                      key={activeSection}
                      value={sections[activeSection] ?? ""}
                      onChange={(e) => {
                        setSections((prev) => ({ ...prev, [activeSection]: e.target.value }));
                        triggerAutoSave();
                      }}
                      placeholder={placeholder}
                      className="min-h-[150px] resize-none text-sm bg-white/5 border-white/10 leading-relaxed"
                      maxLength={300}
                    />
                    <span className="text-[10px] text-muted-foreground/40 text-right block">
                      {(sections[activeSection] ?? "").length}/300
                    </span>
                  </div>

                  {/* Chapitre d'apparition */}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">Chap. d'apparition</span>
                    <Select
                      value={chapterId ?? "none"}
                      onValueChange={(v) => { setChapterId(v === "none" ? null : v); triggerAutoSave(); }}
                    >
                      <SelectTrigger className="h-7 text-xs border-white/15 bg-white/5 text-white/70 hover:text-white flex-1 gap-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-white/10">
                        <SelectItem value="none">Non défini</SelectItem>
                        {sortedChapters.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            Chap. {ch.chapter_number} — {ch.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ariane */}
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleArianeToggle}
                      className={[
                        "flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-all duration-150",
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
                            <button type="button" onClick={() => handleDeleteEdge(edge.id)}
                              className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
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
                        <SelectContent className="bg-popover border-white/10">
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
                      <Button size="sm" variant="ghost" onClick={handleAddEdge}
                        disabled={!newEdgeTargetId || addingEdge}
                        className="h-8 px-2 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-white/10 shrink-0">
              <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleteNode.isPending}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
