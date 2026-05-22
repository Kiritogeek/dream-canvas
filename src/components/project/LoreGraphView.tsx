import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useInternalNode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionMode,
  BackgroundVariant,
  type Node,
  type Edge,
  type EdgeProps,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type ConnectionLineComponentProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Globe, Plus, Search, Save, Loader2, Trash2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLoreNodes, useCreateLoreNode, useUpdateLoreNode } from "@/hooks/useLoreNodes";
import { useLoreEdges, useCreateLoreEdge, useUpdateLoreEdge, useDeleteLoreEdge } from "@/hooks/useLoreEdges";
import { useUpdateProject } from "@/hooks/useProjects";
import { LoreNodeSheet } from "./LoreNodeSheet";
import type { Project, Asset, LoreNode, LoreEdge, LoreNodeType } from "@/types";
import { LORE_NODE_TYPE_CONFIG } from "@/types";

// ── Custom Node ───────────────────────────────────────────────────

const TYPE_BORDER: Record<string, string> = {
  character: "border-violet-500/70",
  location:  "border-blue-500/70",
  object:    "border-amber-500/70",
  event:     "border-green-500/70",
};

const TYPE_BAND: Record<string, string> = {
  character: "bg-violet-700",
  location:  "bg-blue-700",
  object:    "bg-amber-700",
  event:     "bg-green-700",
};

const TYPE_PLACEHOLDER_BG: Record<string, string> = {
  character: "bg-violet-950/90",
  location:  "bg-blue-950/90",
  object:    "bg-amber-950/90",
  event:     "bg-green-950/90",
};

interface LoreNodeData {
  label: string;
  loreNode: LoreNode;
  [key: string]: unknown;
}

const IMG_POSITION: Record<string, string> = {
  character: "object-top",
  location:  "object-center",
  object:    "object-center",
  event:     "object-center",
};

function LoreNodeCard({ data, selected }: { data: LoreNodeData; selected?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const { loreNode } = data;
  const cfg = LORE_NODE_TYPE_CONFIG[loreNode.type];

  const handleStyle: React.CSSProperties = {
    width: 11,
    height: 11,
    background: "#F59E0B",
    border: "2px solid rgba(245,158,11,0.8)",
    boxShadow: "0 0 6px rgba(245,158,11,0.6)",
    opacity: hovered ? 1 : 0,
    transition: "opacity 120ms ease",
    cursor: "crosshair",
    zIndex: 10,
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Point doré visible — bas (initie les connexions) */}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      {/* Handles fantômes — reçoivent les connexions sur chaque côté (snap magnétique) */}
      <Handle type="source" position={Position.Top}   style={{ width: 10, height: 10, opacity: 0, border: "none", background: "transparent" }} />
      <Handle type="source" position={Position.Left}  style={{ width: 10, height: 10, opacity: 0, border: "none", background: "transparent" }} />
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, opacity: 0, border: "none", background: "transparent" }} />

      <div
        className={[
          "w-[150px] rounded-xl overflow-hidden border cursor-pointer select-none backdrop-blur-sm transition-all duration-150",
          TYPE_BORDER[loreNode.type] ?? "border-white/20",
          selected ? "ring-2 ring-amber-400/60 shadow-[0_0_14px_rgba(245,158,11,0.45)]" : "",
        ].join(" ")}
      >
        {/* Zone image — domine la carte */}
        <div className={["relative w-full h-[110px]", TYPE_PLACEHOLDER_BG[loreNode.type] ?? "bg-black/60"].join(" ")}>
          {loreNode.image_url ? (
            <img
              src={loreNode.image_url}
              alt={loreNode.name}
              className={["w-full h-full object-cover", IMG_POSITION[loreNode.type] ?? "object-center"].join(" ")}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-50">{cfg.emoji}</span>
            </div>
          )}
        </div>

        {/* Bandeau coloré — nom + type */}
        <div className={["px-2.5 py-1.5", TYPE_BAND[loreNode.type] ?? "bg-white/10"].join(" ")}>
          <p className="text-[11px] font-semibold truncate text-white leading-tight">{loreNode.name}</p>
          <p className="text-[9px] text-white/60 mt-0.5">{cfg.emoji} {cfg.label}</p>
        </div>
      </div>
    </div>
  );
}

const NODE_TYPES: NodeTypes = { loreNode: LoreNodeCard };

// ── WorldRulesDialog ──────────────────────────────────────────────

function WorldRulesDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
}) {
  const { toast } = useToast();
  const updateProject = useUpdateProject();
  const [value, setValue] = useState(project.world_rules ?? "");
  const [saving, setSaving] = useState(false);

  const isDirty = value !== (project.world_rules ?? "");

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateProject.mutateAsync({ id: project.id, updates: { world_rules: value } });
      toast({ title: "Règles du monde sauvegardées" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [value, project.id, updateProject, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gradient flex items-center gap-2">
            🌐 Règles du Monde
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Décris les lois physiques, magiques, sociales de ton univers — ce cadre guide la cohérence de toutes tes histoires.
          </p>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Magie, règles du monde, sociétés, géographie globale…"
            className="min-h-[160px] resize-none text-sm bg-white/5 border-white/10"
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{value.length}/2000</span>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saving}
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

// ── AddNodeDialog ─────────────────────────────────────────────────

const NODE_TYPE_TO_ASSET_TYPE: Partial<Record<LoreNodeType, Asset["asset_type"]>> = {
  character: "character",
  location:  "background",
  object:    "object",
};

function AddNodeDialog({
  open,
  onOpenChange,
  projectId,
  userId,
  assets,
  existingNodes,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  userId: string;
  assets: Asset[];
  existingNodes: LoreNode[];
  onCreated: (node: LoreNode) => void;
}) {
  const createNode = useCreateLoreNode();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<LoreNodeType>("character");
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) { setName(""); setSelectedType("character"); }
  }, [open]);

  // Assets disponibles pour le type sélectionné
  const assetType = NODE_TYPE_TO_ASSET_TYPE[selectedType];
  const availableAssets = assetType
    ? assets.filter((a) => a.asset_type === assetType && !existingNodes.some((n) => n.asset_id === a.id))
    : [];

  const doCreate = useCallback(async (opts: { fromAsset?: Asset; freeName?: string }) => {
    const nodeType = opts.fromAsset
      ? (opts.fromAsset.asset_type === "character" ? "character"
        : opts.fromAsset.asset_type === "background" ? "location" : "object") as LoreNodeType
      : selectedType;
    const nodeName = opts.fromAsset?.name ?? opts.freeName ?? "";
    if (!nodeName.trim()) return;
    try {
      const node = await createNode.mutateAsync({
        project_id: projectId,
        user_id: userId,
        type: nodeType,
        name: nodeName.trim(),
        description: null,
        image_url: opts.fromAsset?.image_url ?? null,
        asset_id: opts.fromAsset?.id ?? null,
        pos_x: Math.round(Math.random() * 600),
        pos_y: Math.round(Math.random() * 400),
      });
      onOpenChange(false);
      onCreated(node);
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer l'élément.", variant: "destructive" });
    }
  }, [selectedType, projectId, userId, createNode, onOpenChange, onCreated, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gradient">Ajouter un élément</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Sélecteur de type */}
          <div className="flex flex-wrap gap-2">
            {(Object.entries(LORE_NODE_TYPE_CONFIG) as [LoreNodeType, { label: string; emoji: string }][]).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedType(key)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150",
                  selectedType === key
                    ? "border-amber-500/60 bg-amber-500/20 text-amber-300"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10",
                ].join(" ")}
              >
                <span>{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </button>
            ))}
          </div>

          {/* Assets disponibles */}
          {availableAssets.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Depuis tes assets</p>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {availableAssets.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    disabled={createNode.isPending}
                    onClick={() => doCreate({ fromAsset: a })}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors duration-150 disabled:opacity-50"
                  >
                    {a.image_url ? (
                      <img src={a.image_url} alt={a.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <span className="text-base shrink-0">{LORE_NODE_TYPE_CONFIG[selectedType].emoji}</span>
                    )}
                    <span className="text-sm font-medium truncate flex-1">{a.name}</span>
                    <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] text-muted-foreground">ou</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}

          {/* Création libre */}
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doCreate({ freeName: name })}
              placeholder={`Nom du ${LORE_NODE_TYPE_CONFIG[selectedType].label.toLowerCase()}…`}
              className="bg-white/5 border-white/10 text-sm"
              autoFocus={availableAssets.length === 0}
            />
            <Button
              size="sm"
              onClick={() => doCreate({ freeName: name })}
              disabled={!name.trim() || createNode.isPending}
              className="gradient-primary text-primary-foreground shrink-0"
            >
              {createNode.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Dimensions nœud (pour anti-overlap + floating edge) ──────────

const NODE_CARD_W = 150;
const NODE_CARD_H = 140; // 110 image + 30 band
const MIN_NODE_GAP = 60; // zone invisible autour de chaque carte

// ── FloatingEdge — fil doré, hover = intensification dorée ──────────

function FloatingEdge({ source, target, label, selected }: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const srcNode = useInternalNode(source);
  const tgtNode = useInternalNode(target);

  if (!srcNode?.internals?.positionAbsolute || !tgtNode?.internals?.positionAbsolute) return null;

  const sx0 = srcNode.internals.positionAbsolute.x;
  const sy0 = srcNode.internals.positionAbsolute.y;
  const tx0 = tgtNode.internals.positionAbsolute.x;
  const ty0 = tgtNode.internals.positionAbsolute.y;

  // Côté le plus proche : compare les centres pour choisir la direction dominante
  const dx = (tx0 + NODE_CARD_W / 2) - (sx0 + NODE_CARD_W / 2);
  const dy = (ty0 + NODE_CARD_H / 2) - (sy0 + NODE_CARD_H / 2);

  let sp: Position, tp: Position;
  if (Math.abs(dx) >= Math.abs(dy)) {
    sp = dx >= 0 ? Position.Right : Position.Left;
    tp = dx >= 0 ? Position.Left  : Position.Right;
  } else {
    sp = dy >= 0 ? Position.Bottom : Position.Top;
    tp = dy >= 0 ? Position.Top    : Position.Bottom;
  }

  const pt = (x: number, y: number, pos: Position) => {
    if (pos === Position.Right)  return { x: x + NODE_CARD_W,     y: y + NODE_CARD_H / 2 };
    if (pos === Position.Left)   return { x,                       y: y + NODE_CARD_H / 2 };
    if (pos === Position.Bottom) return { x: x + NODE_CARD_W / 2, y: y + NODE_CARD_H     };
    return                              { x: x + NODE_CARD_W / 2, y                       };
  };

  const sc = pt(sx0, sy0, sp);
  const tc = pt(tx0, ty0, tp);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: sc.x, sourceY: sc.y, sourcePosition: sp,
    targetX: tc.x, targetY: tc.y, targetPosition: tp,
    borderRadius: 20,
  });

  const isActive = hovered || (selected ?? false);

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        filter: isActive
          ? "drop-shadow(0 0 5px rgba(245,158,11,0.9)) drop-shadow(0 0 14px rgba(245,158,11,0.45))"
          : "drop-shadow(0 0 2px rgba(245,158,11,0.6))",
        transition: "filter 200ms ease",
      }}
    >
      {/* Zone d'interaction invisible */}
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        strokeWidth={20}
        stroke="transparent"
        fill="none"
        style={{ cursor: "pointer" }}
      />

      {/* Halo élargi — visible uniquement au hover */}
      {isActive && (
        <path
          d={edgePath}
          style={{ stroke: "#F59E0B", strokeWidth: 5, strokeOpacity: 0.18, fill: "none" }}
        />
      )}

      {/* Fil principal doré — style inline pour passer au-dessus de .react-flow__edge-path { stroke: #b1b1b7 } */}
      <path
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: "#F59E0B",
          strokeWidth: isActive ? 1.8 : 1.4,
          fill: "none",
          strokeLinecap: "round",
          transition: "stroke-width 200ms ease",
        }}
      />

      {/* Étiquette de relation */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: "rgba(0,0,0,0.8)",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              color: "#F59E0B",
              border: `1px solid ${isActive ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.25)"}`,
              pointerEvents: "none",
              transition: "border-color 200ms ease",
              filter: "none",
            }}
            className="nodrag nopan"
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}

const EDGE_TYPES: EdgeTypes = { floating: FloatingEdge };

// ── GoldenConnectionLine — fil de prévisualisation lors du tracé d'une connexion ──

function GoldenConnectionLine({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) {
  // fromX/fromY = position du handle bottom-center du nœud source.
  // On recalcule le centre du nœud pour choisir le côté de sortie optimal
  // (même logique que FloatingEdge — sans ça, fromY est toujours en bas → biais Bottom).
  const nodeCenterX = fromX;
  const nodeCenterY = fromY - NODE_CARD_H / 2;

  const dx = toX - nodeCenterX;
  const dy = toY - nodeCenterY;

  let srcPos: Position;
  let actualFromX: number;
  let actualFromY: number;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      srcPos = Position.Right;
      actualFromX = nodeCenterX + NODE_CARD_W / 2;
      actualFromY = nodeCenterY;
    } else {
      srcPos = Position.Left;
      actualFromX = nodeCenterX - NODE_CARD_W / 2;
      actualFromY = nodeCenterY;
    }
  } else {
    if (dy >= 0) {
      srcPos = Position.Bottom;
      actualFromX = nodeCenterX;
      actualFromY = fromY;
    } else {
      srcPos = Position.Top;
      actualFromX = nodeCenterX;
      actualFromY = nodeCenterY - NODE_CARD_H / 2;
    }
  }

  const tgtPos =
    srcPos === Position.Right  ? Position.Left  :
    srcPos === Position.Left   ? Position.Right :
    srcPos === Position.Bottom ? Position.Top   : Position.Bottom;

  const [edgePath] = getSmoothStepPath({
    sourceX: actualFromX, sourceY: actualFromY, sourcePosition: srcPos,
    targetX: toX,         targetY: toY,         targetPosition: tgtPos,
    borderRadius: 20,
  });

  return (
    <g style={{ filter: "drop-shadow(0 0 4px rgba(245,158,11,0.75))" }}>
      <path d={edgePath} stroke="#F59E0B" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeDasharray="6 4" />
      <circle cx={toX} cy={toY} r={4} fill="#F59E0B" fillOpacity={0.85} />
    </g>
  );
}

// ── ZoomController — zoom rapide (capture phase, avant React Flow) ─

function ZoomController({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { setViewport, getViewport } = useReactFlow();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const { x, y, zoom } = getViewport();
      // 8 % de zoom par cran
      const direction = e.deltaY < 0 ? 1 : -1;
      const newZoom = Math.min(Math.max(zoom * (1 + direction * 0.08), 0.15), 2);

      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // Zoom centré sur le curseur
      const newX = cx - (cx - x) * (newZoom / zoom);
      const newY = cy - (cy - y) * (newZoom / zoom);

      setViewport({ x: newX, y: newY, zoom: newZoom }, { duration: 0 });
    };

    // capture: true — s'exécute avant le handler bubble de React Flow, stopPropagation
    // empêche React Flow de recevoir l'événement → pas de double-zoom
    el.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, [containerRef, getViewport, setViewport]);

  return null;
}

// ── EdgeEditDialog — édition d'une connexion ─────────────────────

function EdgeEditDialog({
  edge,
  open,
  onOpenChange,
  projectId,
}: {
  edge: LoreEdge | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
}) {
  const { toast } = useToast();
  const updateEdge = useUpdateLoreEdge();
  const deleteEdge = useDeleteLoreEdge();
  const [label, setLabel] = useState(edge?.label ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edge) setLabel(edge.label ?? "");
  }, [edge]);

  const handleSave = useCallback(async () => {
    if (!edge) return;
    setSaving(true);
    try {
      await updateEdge.mutateAsync({ id: edge.id, projectId, updates: { label: label.trim() || null } });
      toast({ title: "Connexion mise à jour" });
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [edge, projectId, label, updateEdge, toast, onOpenChange]);

  const handleDelete = useCallback(async () => {
    if (!edge) return;
    try {
      await deleteEdge.mutateAsync({ id: edge.id, projectId });
      onOpenChange(false);
      toast({ title: "Connexion supprimée" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  }, [edge, projectId, deleteEdge, toast, onOpenChange]);

  if (!edge) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 sm:max-w-sm">
        <DialogHeader className="pb-3 border-b border-white/10">
          <DialogTitle className="text-gradient text-base">Modifier la connexion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Relation</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="ex : ami de, protège, possède…"
              className="bg-white/5 border-white/10 text-sm"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground/50">Laisse vide pour supprimer l'étiquette</p>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteEdge.isPending}
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

// ── LoreGraphView — composant principal ───────────────────────────

interface Props {
  project: Project;
  assets: Asset[];
}

export function LoreGraphView({ project, assets }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? "";


  const { data: loreNodes = [], isLoading } = useLoreNodes(project.id);
  const { data: loreEdges = [] } = useLoreEdges(project.id);
  const updateNode = useUpdateLoreNode();
  const createEdge = useCreateLoreEdge();

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<LoreNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const initialOverlapDoneRef = useRef(false);
  // Mémorise la position avant le drag pour le snap-back si dépôt invalide
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);


  const [search, setSearch] = useState("");
  const [pendingConn, setPendingConn] = useState<Connection | null>(null);
  const [connLabel, setConnLabel] = useState("");
  const connInputRef = useRef<HTMLInputElement>(null);

  const [selectedNode, setSelectedNode] = useState<LoreNode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [worldRulesOpen, setWorldRulesOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingEdge, setEditingEdge] = useState<LoreEdge | null>(null);
  const [edgeEditOpen, setEdgeEditOpen] = useState(false);

  // Résout l'image d'un nœud : lore_node.image_url → asset.image_url → asset.image_url_sheet
  const resolveNodeImage = useCallback(
    (n: LoreNode): string | null => {
      if (n.image_url) return n.image_url;
      if (!n.asset_id) return null;
      const asset = assets.find((a) => a.id === n.asset_id);
      if (!asset) return null;
      return (asset as Record<string, unknown>).image_url as string | null
        ?? (asset as Record<string, unknown>).image_url_sheet as string | null
        ?? null;
    },
    [assets]
  );

  // Sync nodes BDD → React Flow
  useEffect(() => {
    setRfNodes(
      loreNodes.map((n) => ({
        id: n.id,
        position: { x: n.pos_x, y: n.pos_y },
        data: { label: n.name, loreNode: { ...n, image_url: resolveNodeImage(n) } },
        type: "loreNode",
      }))
    );
  }, [loreNodes, assets, setRfNodes, resolveNodeImage]);

  // Auto-heal : si un nœud a asset_id mais image_url null en BDD, on le corrige une fois
  useEffect(() => {
    loreNodes.forEach((n) => {
      if (n.image_url || !n.asset_id) return;
      const resolved = resolveNodeImage(n);
      if (resolved) {
        updateNode.mutate({ id: n.id, projectId: project.id, updates: { image_url: resolved } });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loreNodes.map((n) => n.id).join(","), assets.map((a) => a.id).join(",")]);

  // Sync edges BDD → React Flow — pas de style inline, FloatingEdge gère tout
  useEffect(() => {
    setRfEdges(
      loreEdges.map((e) => ({
        id: e.id,
        source: e.from_node_id,
        target: e.to_node_id,
        type: "floating",
        label: e.label ?? undefined,
      }))
    );
  }, [loreEdges, setRfEdges]);

  // Filtre de recherche — atténue les nœuds non correspondants
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setRfNodes((prev) => prev.map((rn) => ({ ...rn, style: undefined })));
      return;
    }
    setRfNodes((prev) =>
      prev.map((rn) => {
        const matches = (rn.data as LoreNodeData).loreNode.name.toLowerCase().includes(q);
        return { ...rn, style: matches ? undefined : { opacity: 0.15 } };
      })
    );
  }, [search, setRfNodes]);

  // Résout les chevauchements entre nœuds par repulsion itérative
  const resolveOverlaps = useCallback((nodes: LoreNode[]) => {
    if (nodes.length < 2) return;
    const pos = new Map(nodes.map((n) => [n.id, { x: n.pos_x, y: n.pos_y }]));
    const ids = nodes.map((n) => n.id);

    let changed = true;
    let iter = 0;
    while (changed && iter < 30) {
      changed = false;
      iter++;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = pos.get(ids[i])!;
          const b = pos.get(ids[j])!;
          const ox = (NODE_CARD_W + MIN_NODE_GAP) - Math.abs(b.x - a.x);
          const oy = (NODE_CARD_H + MIN_NODE_GAP) - Math.abs(b.y - a.y);
          if (ox > 0 && oy > 0) {
            changed = true;
            const push = (ox <= oy ? ox : oy) / 2 + 1;
            if (ox <= oy) {
              if (b.x >= a.x) { a.x -= push; b.x += push; } else { a.x += push; b.x -= push; }
            } else {
              if (b.y >= a.y) { a.y -= push; b.y += push; } else { a.y += push; b.y -= push; }
            }
          }
        }
      }
    }

    // Mise à jour visuelle immédiate
    setRfNodes((prev) => prev.map((rn) => {
      const p = pos.get(rn.id);
      return p ? { ...rn, position: { x: p.x, y: p.y } } : rn;
    }));

    // Persistance BDD (fire-and-forget)
    for (const node of nodes) {
      const p = pos.get(node.id)!;
      if (Math.abs(p.x - node.pos_x) > 0.5 || Math.abs(p.y - node.pos_y) > 0.5) {
        updateNode.mutate({ id: node.id, projectId: project.id, updates: { pos_x: Math.round(p.x), pos_y: Math.round(p.y) } });
      }
    }
  }, [project.id, updateNode, setRfNodes]);

  // Résolution automatique des chevauchements au premier chargement
  useEffect(() => {
    if (initialOverlapDoneRef.current || loreNodes.length < 2) return;
    initialOverlapDoneRef.current = true;
    resolveOverlaps(loreNodes);
  }, [loreNodes, resolveOverlaps]);

  // Bloque les connexions dupliquées au niveau React Flow (empêche même le tracé)
  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false;
    if (connection.source === connection.target) return false;
    return !loreEdges.some(
      (e) =>
        (e.from_node_id === connection.source && e.to_node_id === connection.target) ||
        (e.from_node_id === connection.target && e.to_node_id === connection.source)
    );
  }, [loreEdges]);

  const handleConnect = useCallback((connection: Connection) => {
    setPendingConn(connection);
    setConnLabel("");
    setTimeout(() => connInputRef.current?.focus(), 50);
  }, []);

  const confirmConnection = useCallback(async () => {
    if (!pendingConn?.source || !pendingConn.target) return;
    setPendingConn(null);
    setConnLabel("");
    try {
      await createEdge.mutateAsync({
        project_id: project.id,
        user_id: userId,
        from_node_id: pendingConn.source,
        to_node_id: pendingConn.target,
        label: connLabel.trim() || null,
      });
      resolveOverlaps(loreNodes);
    } catch {
      // silencieux
    }
  }, [pendingConn, connLabel, project.id, userId, createEdge, resolveOverlaps, loreNodes]);

  const handleNodeDragStart = useCallback(
    (_: React.MouseEvent, node: Node) => {
      dragStartPosRef.current = { x: node.position.x, y: node.position.y };
    },
    []
  );

  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const newX = Math.round(node.position.x);
      const newY = Math.round(node.position.y);

      // Vérifie si la position de dépôt chevauche un autre nœud
      const overlaps = rfNodes.some((rn) => {
        if (rn.id === node.id) return false;
        return (
          Math.abs(newX - rn.position.x) < NODE_CARD_W + MIN_NODE_GAP &&
          Math.abs(newY - rn.position.y) < NODE_CARD_H + MIN_NODE_GAP
        );
      });

      if (overlaps && dragStartPosRef.current) {
        // Snap-back vers la position de départ
        const origin = dragStartPosRef.current;
        setRfNodes((prev) =>
          prev.map((rn) =>
            rn.id === node.id ? { ...rn, position: { x: origin.x, y: origin.y } } : rn
          )
        );
        dragStartPosRef.current = null;
        return;
      }

      dragStartPosRef.current = null;
      updateNode.mutate({
        id: node.id,
        projectId: project.id,
        updates: { pos_x: newX, pos_y: newY },
      });
    },
    [project.id, updateNode, rfNodes, setRfNodes]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const found = loreNodes.find((n) => n.id === node.id);
      if (found) { setSelectedNode(found); setSheetOpen(true); }
    },
    [loreNodes]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const found = loreEdges.find((e) => e.id === edge.id);
      if (found) { setEditingEdge(found); setEdgeEditOpen(true); }
    },
    [loreEdges]
  );

  const handleNodeCreated = useCallback((node: LoreNode) => {
    setSelectedNode(node);
    setSheetOpen(true);
    resolveOverlaps([...loreNodes, node]);
  }, [loreNodes, resolveOverlaps]);

  // Layout ordonné par type : Événement → Lieux → Personnages → Objets (haut→bas)
  // Les nœuds connectés sont alignés horizontalement pour éviter que les fils traversent des cartes.
  const runAutoLayout = useCallback(() => {
    if (loreNodes.length === 0) return;

    const TYPE_ORDER: LoreNodeType[] = ["event", "location", "character", "object"];
    // Espacement vertical entre rangs : 140px carte + 160px passage = 300px
    const ROW_Y: Record<string, number> = { event: 0, location: 300, character: 600, object: 900 };
    const H_SPACING = 210; // espacement horizontal entre centres de cartes
    const MIN_H_GAP = NODE_CARD_W + MIN_NODE_GAP; // 150 + 60 = 210

    const groups: Record<string, LoreNode[]> = { event: [], location: [], character: [], object: [] };
    for (const n of loreNodes) {
      (groups[n.type] ?? groups.character).push(n);
    }

    type Pos = { x: number; y: number };
    const pos = new Map<string, Pos>();

    // Placement initial : espacement uniforme centré sur x=0
    for (const type of TYPE_ORDER) {
      const grp = groups[type];
      grp.forEach((n, i) => {
        const totalW = Math.max(grp.length - 1, 0) * H_SPACING;
        pos.set(n.id, { x: i * H_SPACING - totalW / 2, y: ROW_Y[type] });
      });
    }

    // Tri barycentriques : ordonne les nœuds de chaque rang selon la position moyenne
    // de leurs voisins dans les autres rangs → minimise les croisements de fils
    for (const type of TYPE_ORDER) {
      const grp = groups[type];
      if (grp.length < 2) continue;
      const bary = new Map<string, number>();
      for (const n of grp) {
        const neighbors = loreEdges
          .filter((e) => e.from_node_id === n.id || e.to_node_id === n.id)
          .map((e) => (e.from_node_id === n.id ? e.to_node_id : e.from_node_id))
          .filter((nid) => !grp.some((g) => g.id === nid));
        if (neighbors.length === 0) { bary.set(n.id, pos.get(n.id)!.x); continue; }
        const avg = neighbors.reduce((s, nid) => s + (pos.get(nid)?.x ?? 0), 0) / neighbors.length;
        bary.set(n.id, avg);
      }
      const sorted = grp.slice().sort((a, b) => (bary.get(a.id) ?? 0) - (bary.get(b.id) ?? 0));
      const totalW = Math.max(sorted.length - 1, 0) * H_SPACING;
      sorted.forEach((n, i) => { pos.get(n.id)!.x = i * H_SPACING - totalW / 2; });
    }

    // Ressort horizontal fort entre nœuds connectés → les aligne verticalement
    // (quand deux nœuds connectés ont le même X, le fil va tout droit sans traverser d'autres cartes)
    const SPRING = 0.28;
    const ITERATIONS = 120;
    for (let iter = 0; iter < ITERATIONS; iter++) {
      const dx = new Map<string, number>(loreNodes.map((n) => [n.id, 0]));
      for (const edge of loreEdges) {
        const a = pos.get(edge.from_node_id);
        const b = pos.get(edge.to_node_id);
        if (!a || !b) continue;
        const diff = b.x - a.x;
        dx.set(edge.from_node_id, (dx.get(edge.from_node_id) ?? 0) + diff * SPRING);
        dx.set(edge.to_node_id,   (dx.get(edge.to_node_id)   ?? 0) - diff * SPRING);
      }
      for (const n of loreNodes) { pos.get(n.id)!.x += dx.get(n.id) ?? 0; }

      // Anti-chevauchement horizontal dans chaque rang
      for (const type of TYPE_ORDER) {
        const sorted = groups[type].slice().sort((a, b) => (pos.get(a.id)?.x ?? 0) - (pos.get(b.id)?.x ?? 0));
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = pos.get(sorted[i].id)!;
          const b = pos.get(sorted[i + 1].id)!;
          if (b.x - a.x < MIN_H_GAP) {
            const mid = (a.x + b.x) / 2;
            a.x = mid - MIN_H_GAP / 2;
            b.x = mid + MIN_H_GAP / 2;
          }
        }
      }
    }

    // Post-processing : déplace les nœuds intermédiaires qui bloquent les connexions cross-row.
    // Un fil de A (rang r1) vers B (rang r3) passe horizontalement dans la zone du rang r2 :
    // tout nœud C en r2 aligné avec le couloir [min(Ax,Bx) ; max(Ax,Bx)] doit être écarté.
    const CLEAR = 28; // marge de dégagement (px) autour du couloir horizontal du fil
    for (let pass = 0; pass < 5; pass++) {
      for (const edge of loreEdges) {
        const aN = loreNodes.find((n) => n.id === edge.from_node_id);
        const bN = loreNodes.find((n) => n.id === edge.to_node_id);
        if (!aN || !bN) continue;
        const aRow = TYPE_ORDER.indexOf(aN.type);
        const bRow = TYPE_ORDER.indexOf(bN.type);
        if (Math.abs(aRow - bRow) < 2) continue; // connexion adjacente → pas de problème

        const pA = pos.get(aN.id)!;
        const pB = pos.get(bN.id)!;
        // Centre horizontal de chaque nœud (le fil passe par leurs centres)
        const axc = pA.x + NODE_CARD_W / 2;
        const bxc = pB.x + NODE_CARD_W / 2;
        const corrL   = Math.min(axc, bxc) - CLEAR;
        const corrR   = Math.max(axc, bxc) + CLEAR;
        const corrMid = (axc + bxc) / 2;

        const minRow = Math.min(aRow, bRow);
        const maxRow = Math.max(aRow, bRow);
        for (let r = minRow + 1; r < maxRow; r++) {
          for (const cn of groups[TYPE_ORDER[r]]) {
            const pC = pos.get(cn.id)!;
            // C est-il dans le couloir horizontal ?
            if (pC.x + NODE_CARD_W + CLEAR <= corrL || pC.x - CLEAR >= corrR) continue;
            // Pousse C vers le bord le plus proche
            if (pC.x + NODE_CARD_W / 2 <= corrMid) {
              pC.x = corrL - NODE_CARD_W - CLEAR;
            } else {
              pC.x = corrR + CLEAR;
            }
          }
        }
      }

      // Ré-applique l'anti-chevauchement horizontal après chaque passe de dégagement
      for (const type of TYPE_ORDER) {
        const sorted = groups[type].slice().sort((a, b) => (pos.get(a.id)?.x ?? 0) - (pos.get(b.id)?.x ?? 0));
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = pos.get(sorted[i].id)!;
          const b = pos.get(sorted[i + 1].id)!;
          if (b.x - a.x < MIN_H_GAP) {
            const mid = (a.x + b.x) / 2;
            a.x = mid - MIN_H_GAP / 2;
            b.x = mid + MIN_H_GAP / 2;
          }
        }
      }
    }

    // Centre le layout
    const allPos = Array.from(pos.values());
    const avgX = allPos.reduce((s, p) => s + p.x, 0) / allPos.length;
    const avgY = allPos.reduce((s, p) => s + p.y, 0) / allPos.length;
    for (const p of allPos) { p.x -= avgX; p.y -= avgY; }

    setRfNodes((prev) =>
      prev.map((rn) => {
        const p = pos.get(rn.id);
        return p ? { ...rn, position: { x: Math.round(p.x), y: Math.round(p.y) } } : rn;
      })
    );

    for (const node of loreNodes) {
      const p = pos.get(node.id)!;
      updateNode.mutate({ id: node.id, projectId: project.id, updates: { pos_x: Math.round(p.x), pos_y: Math.round(p.y) } });
    }
  }, [loreNodes, loreEdges, project.id, setRfNodes, updateNode]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ height: "calc(100vh - 4rem)", minHeight: 520 }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 backdrop-blur-sm">
          <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
        </div>
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={80}
        isValidConnection={isValidConnection}
        connectionLineComponent={GoldenConnectionLine}
        fitView
        fitViewOptions={{ padding: 0.35, maxZoom: 0.65 }}
        minZoom={0.15}
        maxZoom={2}
        className="bg-transparent"
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <ZoomController containerRef={containerRef} />
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.05)" />
      </ReactFlow>

      {/* État vide */}
      {!isLoading && loreNodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <p className="text-muted-foreground/60 text-sm">Ton univers est vide</p>
          <p className="text-muted-foreground/40 text-xs">Clique sur + pour ajouter ton premier élément</p>
        </div>
      )}

      {/* Toolbar haut */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        <div className="flex items-center gap-2 px-3 py-2 glass rounded-2xl border border-white/10 backdrop-blur-md shadow-dream">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="pl-8 h-8 w-40 bg-white/5 border-white/10 text-xs focus-visible:ring-amber-500/40"
            />
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Bouton + Ajouter */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAddDialogOpen(true)}
            className="h-8 px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>

          <div className="w-px h-5 bg-white/10" />

          {/* Bouton Réorganiser */}
          <Button
            size="sm"
            variant="ghost"
            onClick={runAutoLayout}
            disabled={loreNodes.length < 2}
            className="h-8 px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10"
            title="Réorganiser automatiquement les éléments"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Réorganiser
          </Button>
        </div>

        {/* Légende fil doré */}
        <div className="flex items-center gap-1.5 px-3 py-2 glass rounded-2xl border border-white/10 backdrop-blur-md text-[10px] text-muted-foreground/60">
          <span className="inline-block w-5 h-px" style={{ background: "#F59E0B", boxShadow: "0 0 4px rgba(245,158,11,0.6)" }} />
          Connexion
        </div>
      </div>

      {/* Bouton Monde — bas droite */}
      <div className="absolute bottom-5 right-5 z-10">
        <button
          type="button"
          onClick={() => setWorldRulesOpen(true)}
          className="flex items-center justify-center w-14 h-14 glass rounded-full border border-amber-500/30 text-amber-400 hover:bg-amber-500/15 hover:text-amber-300 transition-colors backdrop-blur-sm shadow-dream"
          title="Règles du Monde"
        >
          <Globe className="h-6 w-6" />
        </button>
      </div>

      {/* Overlay connexion en attente */}
      {pendingConn && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
          <div className="glass rounded-2xl p-5 space-y-3 w-72 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <p className="text-sm font-medium flex items-center gap-2">
              <span className="text-amber-400">⚡</span> Nommer la connexion
            </p>
            <p className="text-xs text-muted-foreground">Optionnel — ex : "ami de", "possède", "protège"</p>
            <Input
              ref={connInputRef}
              value={connLabel}
              onChange={(e) => setConnLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmConnection()}
              placeholder="Relation…"
              className="bg-white/5 border-amber-500/20 text-sm focus-visible:ring-amber-500/40"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setPendingConn(null)} className="text-muted-foreground">
                Annuler
              </Button>
              <Button size="sm" onClick={confirmConnection} className="gradient-primary text-primary-foreground">
                Créer le lien
              </Button>
            </div>
          </div>
        </div>
      )}


      <EdgeEditDialog
        edge={editingEdge}
        open={edgeEditOpen}
        onOpenChange={setEdgeEditOpen}
        projectId={project.id}
      />

      <WorldRulesDialog
        open={worldRulesOpen}
        onOpenChange={setWorldRulesOpen}
        project={project}
      />

      <AddNodeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={project.id}
        userId={userId}
        assets={assets}
        existingNodes={loreNodes}
        onCreated={handleNodeCreated}
      />

      <LoreNodeSheet
        node={selectedNode}
        nodes={loreNodes}
        edges={loreEdges}
        assets={assets}
        projectId={project.id}
        userId={userId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
