import { useCallback, useContext, useEffect, useRef, useState, createContext } from "react";
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  EdgeLabelRenderer,
  getBezierPath,
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
import { useLoreNodes, useCreateLoreNode, useUpdateLoreNode, useBatchUpdateLoreNodePositions } from "@/hooks/useLoreNodes";
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
  _highlight?: boolean;
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
  const highlighted = !!data._highlight;
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
      className="relative"
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
          "w-[150px] rounded-xl overflow-hidden border cursor-pointer select-none transition-all duration-300",
          TYPE_BORDER[loreNode.type] ?? "border-white/20",
          selected    ? "ring-2 ring-amber-400/60 shadow-[0_0_14px_rgba(245,158,11,0.45)]" : "",
          highlighted ? "ring-2 ring-amber-400    shadow-[0_0_22px_rgba(245,158,11,0.85)] scale-105" : "",
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

      {/* Anneau ping doré — pulsation 2× pendant 1.5s après navigation */}
      {highlighted && (
        <div
          className="absolute inset-[-6px] rounded-[20px] border-2 border-amber-400/70 pointer-events-none animate-ping"
          style={{ animationDuration: "0.75s" }}
        />
      )}
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

// ── Contexte loreEdges — accessible dans GoldenConnectionLine ────
// GoldenConnectionLine est défini hors du composant (pour éviter la recréation)
// mais doit connaître les arêtes existantes pour colorier en rouge les doublons.
const LoreEdgesCtx = createContext<import("@/types").LoreEdge[]>([]);

// ── boxEdgePoint ─────────────────────────────────────────────────
// Calcule le point exact où le rayon partant du centre (cx, cy) dans la
// direction (dx, dy) intersecte le bord du bounding-box (W × H centré).
// Retourne aussi la Position (face touchée) pour orienter la courbe bezier.
function boxEdgePoint(
  cx: number, cy: number,
  W: number,  H: number,
  dx: number, dy: number,
): { x: number; y: number; pos: Position } {
  const hw = W / 2;
  const hh = H / 2;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: cx, y: cy + hh, pos: Position.Bottom };
  }
  let bestT = Infinity;
  let bestPos: Position = Position.Bottom;
  // Face droite
  if (dx > 0.001) {
    const t = hw / dx; const iy = cy + t * dy;
    if (iy >= cy - hh && iy <= cy + hh && t < bestT) { bestT = t; bestPos = Position.Right; }
  }
  // Face gauche
  if (dx < -0.001) {
    const t = -hw / dx; const iy = cy + t * dy;
    if (iy >= cy - hh && iy <= cy + hh && t < bestT) { bestT = t; bestPos = Position.Left; }
  }
  // Face bas
  if (dy > 0.001) {
    const t = hh / dy; const ix = cx + t * dx;
    if (ix >= cx - hw && ix <= cx + hw && t < bestT) { bestT = t; bestPos = Position.Bottom; }
  }
  // Face haut
  if (dy < -0.001) {
    const t = -hh / dy; const ix = cx + t * dx;
    if (ix >= cx - hw && ix <= cx + hw && t < bestT) { bestT = t; bestPos = Position.Top; }
  }
  return { x: cx + bestT * dx, y: cy + bestT * dy, pos: bestPos };
}

// ── FloatingEdge — fil doré, hover = intensification dorée ──────────

function FloatingEdge({ source, target, label, selected, data }: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const srcNode = useInternalNode(source);
  const tgtNode = useInternalNode(target);
  const laneOffset = (data?.laneOffset as number) ?? 0;

  if (!srcNode?.internals?.positionAbsolute || !tgtNode?.internals?.positionAbsolute) return null;

  const sx0 = srcNode.internals.positionAbsolute.x;
  const sy0 = srcNode.internals.positionAbsolute.y;
  const tx0 = tgtNode.internals.positionAbsolute.x;
  const ty0 = tgtNode.internals.positionAbsolute.y;

  // Centres des deux nœuds
  const scx = sx0 + NODE_CARD_W / 2;
  const scy = sy0 + NODE_CARD_H / 2;
  const tcx = tx0 + NODE_CARD_W / 2;
  const tcy = ty0 + NODE_CARD_H / 2;

  // Point exact sur la surface du bounding-box de chaque nœud (pas centre du côté)
  const srcPt = boxEdgePoint(scx, scy, NODE_CARD_W, NODE_CARD_H, tcx - scx, tcy - scy);
  const tgtPt = boxEdgePoint(tcx, tcy, NODE_CARD_W, NODE_CARD_H, scx - tcx, scy - tcy);

  const sc = { x: srcPt.x, y: srcPt.y };
  const tc = { x: tgtPt.x, y: tgtPt.y };

  // Offset perpendiculaire (sépare les fils parallèles dans le même couloir)
  if (laneOffset !== 0) {
    const edx = tc.x - sc.x;
    const edy = tc.y - sc.y;
    const len = Math.sqrt(edx * edx + edy * edy) || 1;
    const px = (-edy / len) * laneOffset;
    const py = (edx / len) * laneOffset;
    sc.x += px; sc.y += py;
    tc.x += px; tc.y += py;
  }

  // getBezierPath : courbe douce alignée avec la physique (déviation max ~25% distance)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sc.x, sourceY: sc.y, sourcePosition: srcPt.pos,
    targetX: tc.x, targetY: tc.y, targetPosition: tgtPt.pos,
    curvature: 0.25,
  });

  const finalLabelX = labelX;
  const finalLabelY = labelY;

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

      {/* Étiquette de relation — positionnée à finalLabelX/Y (décalée du centre pour éviter les clusters) */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${finalLabelX}px, ${finalLabelY}px)`,
              background: "rgba(0,0,0,0.85)",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              color: "#F59E0B",
              border: `1px solid ${isActive ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.25)"}`,
              pointerEvents: "none",
              transition: "border-color 200ms ease",
              filter: "none",
              whiteSpace: "nowrap",
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

function GoldenConnectionLine({ fromX, fromY, toX, toY, fromNode, toNode }: ConnectionLineComponentProps) {
  const loreEdges = useContext(LoreEdgesCtx);

  // Fil rouge si une connexion existe déjà entre source et cible survolée
  const isDuplicate = toNode != null && loreEdges.some(
    (e) =>
      (e.from_node_id === fromNode.id && e.to_node_id === toNode.id) ||
      (e.from_node_id === toNode.id  && e.to_node_id === fromNode.id)
  );

  const color     = isDuplicate ? "#EF4444" : "#F59E0B";
  const glowColor = isDuplicate ? "rgba(239,68,68,0.75)" : "rgba(245,158,11,0.75)";

  // fromX/fromY ≈ handle bottom-center. On recalcule le centre du nœud
  // puis on utilise boxEdgePoint pour un point de sortie exact sur la surface.
  const nodeCenterX = fromX;
  const nodeCenterY = fromY - NODE_CARD_H / 2;

  const dx = toX - nodeCenterX;
  const dy = toY - nodeCenterY;

  const { x: actualFromX, y: actualFromY, pos: srcPos } = boxEdgePoint(
    nodeCenterX, nodeCenterY, NODE_CARD_W, NODE_CARD_H, dx, dy
  );

  const tgtPos =
    srcPos === Position.Right  ? Position.Left  :
    srcPos === Position.Left   ? Position.Right :
    srcPos === Position.Bottom ? Position.Top   : Position.Bottom;

  const [edgePath] = getBezierPath({
    sourceX: actualFromX, sourceY: actualFromY, sourcePosition: srcPos,
    targetX: toX,         targetY: toY,         targetPosition: tgtPos,
    curvature: 0.25,
  });

  return (
    <g style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}>
      <path d={edgePath} stroke={color} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeDasharray="6 4" />
      <circle cx={toX} cy={toY} r={4} fill={color} fillOpacity={0.85} />
    </g>
  );
}

// ── NavigateController — navigation vers un nœud (doit être enfant de ReactFlow) ─
// useReactFlow() n'est accessible qu'à l'intérieur du provider de ReactFlow.
// On expose la fonction de navigation via un ref mutable pour que le parent puisse l'appeler.

const ZOOM_THRESHOLD = 0.4;  // en-dessous → zoom forcé
const ZOOM_TARGET    = 0.85; // valeur fixe appliquée si zoom trop faible

function NavigateController({
  rfNodesRef,
  navigateRef,
  onHighlight,
}: {
  rfNodesRef: React.MutableRefObject<Node<LoreNodeData>[]>;
  navigateRef: React.MutableRefObject<((node: LoreNode) => void) | null>;
  onHighlight: (nodeId: string) => void;
}) {
  const { setCenter, getViewport } = useReactFlow();

  useEffect(() => {
    navigateRef.current = (node: LoreNode) => {
      const rfNode = rfNodesRef.current.find((n) => n.id === node.id);
      if (!rfNode) return;
      const cx = rfNode.position.x + NODE_CARD_W / 2;
      const cy = rfNode.position.y + NODE_CARD_H / 2;
      const { zoom } = getViewport();
      setCenter(cx, cy, { zoom: zoom < ZOOM_THRESHOLD ? ZOOM_TARGET : zoom, duration: 450 });
      onHighlight(node.id);
    };
  }, [setCenter, getViewport, rfNodesRef, navigateRef, onHighlight]);

  return null;
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
  const batchUpdatePositions = useBatchUpdateLoreNodePositions();
  const createEdge = useCreateLoreEdge();

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<LoreNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const initialOverlapDoneRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const batchUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBatchRef = useRef<{ id: string; pos_x: number; pos_y: number }[]>([]);
  // Ref pour accéder aux positions visuelles actuelles sans les mettre dans les deps de useCallback
  const rfNodesRef = useRef(rfNodes);
  useEffect(() => { rfNodesRef.current = rfNodes; }, [rfNodes]);


  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const navigateRef = useRef<((node: LoreNode) => void) | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHighlightNode = useCallback((nodeId: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setRfNodes((prev) => prev.map((n) => ({ ...n, data: { ...n.data, _highlight: n.id === nodeId } })));
    highlightTimerRef.current = setTimeout(() => {
      setRfNodes((prev) => prev.map((n) => n.data._highlight ? { ...n, data: { ...n.data, _highlight: false } } : n));
    }, 1500);
  }, [setRfNodes]);
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
  // Règle : on ne touche JAMAIS à la position d'un nœud déjà présent dans rfNodes.
  // La position visuelle (rfNodes) est la source de vérité — la DB peut arriver
  // en retard (race condition post-runAutoLayout). On utilise pos_x/pos_y de la
  // DB uniquement pour les nœuds qui n'existent pas encore dans rfNodes (nouveaux).
  useEffect(() => {
    setRfNodes((prev) => {
      const prevPos = new Map(prev.map((rn) => [rn.id, rn.position]));
      return loreNodes.map((n) => ({
        id: n.id,
        position: prevPos.get(n.id) ?? { x: n.pos_x, y: n.pos_y },
        data: { label: n.name, loreNode: { ...n, image_url: resolveNodeImage(n) } },
        type: "loreNode",
      }));
    });
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

  // Clé de position quantifiée à 50px — change seulement après un layout/drag significatif,
  // pas à chaque frame. Permet de re-déclencher le sync edge sans dépendre de la BDD.
  const rfNodesPosKey = rfNodes
    .map((n) => `${n.id}:${Math.round(n.position.x / 50)}:${Math.round(n.position.y / 50)}`)
    .sort()
    .join("|");

  // Sync edges BDD → React Flow — offset par couloir physique.
  // Utilise rfNodes (positions visuelles actuelles) pour calculer les couloirs,
  // ce qui garantit que les offsets sont corrects immédiatement après runAutoLayout
  // sans attendre le round-trip BDD.
   
  useEffect(() => {
    const LANE = 22;

    // rfNodes = positions visuelles temps réel (pas la BDD)
    const nodeCenter = new Map(
      rfNodes.map((n) => [n.id, {
        cx: n.position.x + NODE_CARD_W / 2,
        cy: n.position.y + NODE_CARD_H / 2,
      }])
    );

    const corridorGroups = new Map<string, string[]>();
    loreEdges.forEach((e) => {
      const src = nodeCenter.get(e.from_node_id);
      const tgt = nodeCenter.get(e.to_node_id);
      if (!src || !tgt) return;
      const adx = Math.abs(tgt.cx - src.cx);
      const ady = Math.abs(tgt.cy - src.cy);
      const corridorKey = adx >= ady
        ? `h:${Math.round(src.cy / 50)}`
        : `v:${Math.round(src.cx / 50)}`;
      if (!corridorGroups.has(corridorKey)) corridorGroups.set(corridorKey, []);
      corridorGroups.get(corridorKey)!.push(e.id);
    });

    const laneOffsets = new Map<string, number>();
    corridorGroups.forEach((ids) => {
      ids.forEach((id, idx) => {
        laneOffsets.set(id, (idx - (ids.length - 1) / 2) * LANE);
      });
    });

    setRfEdges(
      loreEdges.map((e) => ({
        id: e.id,
        source: e.from_node_id,
        target: e.to_node_id,
        type: "floating",
        label: e.label ?? undefined,
        data: { laneOffset: laneOffsets.get(e.id) ?? 0 },
      }))
    );
  // rfNodesPosKey change quand les positions bougent de ≥50px → recompute corridors
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loreEdges, rfNodesPosKey, setRfEdges]);

  // Résultats de recherche — alimentent le dropdown
  const searchQuery = search.trim().toLowerCase();
  const searchResults = searchQuery
    ? loreNodes
        .filter((n) => n.name.toLowerCase().includes(searchQuery))
        .slice(0, 8)
    : [];
  const showSearchDropdown = searchFocused && searchResults.length > 0;

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

    // Persistance BDD — batch debounced (1 requête upsert au lieu de N mutations parallèles)
    const movedNodes = nodes.filter((n) => {
      const p = pos.get(n.id)!;
      return Math.abs(p.x - n.pos_x) > 0.5 || Math.abs(p.y - n.pos_y) > 0.5;
    }).map((n) => {
      const p = pos.get(n.id)!;
      return { id: n.id, pos_x: Math.round(p.x), pos_y: Math.round(p.y) };
    });

    if (movedNodes.length > 0) {
      if (batchUpdateTimerRef.current) clearTimeout(batchUpdateTimerRef.current);
      pendingBatchRef.current = movedNodes;
      batchUpdateTimerRef.current = setTimeout(() => {
        batchUpdatePositions.mutate({ projectId: project.id, nodes: pendingBatchRef.current });
      }, 80);
    }
  }, [project.id, batchUpdatePositions, setRfNodes]);

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

  // ── Layout Force-Directed ─────────────────────────────────────────────────────
  // Les nœuds s'organisent selon leur topologie : hubs centraux, feuilles en orbite.
  // Animation 600ms ease-out-cubic pour l'effet visuel.
  const runAutoLayout = useCallback(() => {
    if (loreNodes.length === 0) return;

    const N = loreNodes.length;
    const ids = loreNodes.map((n) => n.id);

    // ── Paramètres ────────────────────────────────────────────────────
    const IDEAL        = 420;   // px — longueur idéale d'un fil (plus d'espace = moins de crossings)
    const K_SPRING     = 0.05;  // rigidité du ressort
    const K_REPEL      = 55000; // répulsion Coulomb (px²)
    const K_GRAV       = 0.006; // gravité vers le centre (réduite, TYPE_GRAV prend le relais)
    const K_TYPE       = 0.007; // gravité vers le centre du type (Lieu/Perso/Objet/Événement)
    const K_EDGE_REP   = 20000; // répulsion nœud-arête
    const EDGE_REP_DIST = 230;  // seuil de répulsion nœud-arête (px)
    const DAMPING      = 0.82;
    const MAX_VEL      = 90;
    const ITERS        = 300;
    const COOL         = 0.979;

    // Quadrants par type (Événements haut-gauche, Lieux haut-droite,
    //                     Personnages bas-gauche, Objets bas-droite)
    const TYPE_QUAD: Record<string, { x: number; y: number }> = {
      event:     { x: -280, y: -260 },
      location:  { x:  280, y: -260 },
      character: { x: -280, y:  260 },
      object:    { x:  280, y:  260 },
    };

    // ── Initialisation dans les quadrants par type ────────────────────
    type Vec = { x: number; y: number; vx: number; vy: number };
    const sim = new Map<string, Vec>();
    const typeGroups: Record<string, LoreNode[]> = { event: [], location: [], character: [], object: [] };
    for (const n of loreNodes) (typeGroups[n.type] ?? typeGroups.character).push(n);

    for (const [type, grp] of Object.entries(typeGroups)) {
      const center = TYPE_QUAD[type] ?? { x: 0, y: 0 };
      grp.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / Math.max(grp.length, 1) + (type === "location" ? 0.5 : 0);
        const r     = 55 + i * 18;
        sim.set(n.id, { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r, vx: 0, vy: 0 });
      });
    }

    // ── Simulation ───────────────────────────────────────────────────
    let temp = 1.0;
    for (let iter = 0; iter < ITERS; iter++) {
      // Répulsion : tous les pairs se repoussent
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = sim.get(ids[i])!;
          const b = sim.get(ids[j])!;
          let ddx = b.x - a.x;
          let ddy = b.y - a.y;
          let dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < 1) { ddx = (Math.random() - 0.5) * 2; ddy = (Math.random() - 0.5) * 2; dist = 1; }
          const f = K_REPEL / (dist * dist);
          const fx = (ddx / dist) * f;
          const fy = (ddy / dist) * f;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }

      // Ressort : nœuds connectés s'attirent vers IDEAL px
      for (const e of loreEdges) {
        const a = sim.get(e.from_node_id);
        const b = sim.get(e.to_node_id);
        if (!a || !b) continue;
        const ddx  = b.x - a.x;
        const ddy  = b.y - a.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        const disp = dist - IDEAL;
        const f    = K_SPRING * disp;
        const fx   = (ddx / dist) * f;
        const fy   = (ddy / dist) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Répulsion nœud-arête : pousse les nœuds hors du tracé des connexions.
      // Utilise les 4 coins + centre de chaque carte pour mesurer la distance
      // minimale réelle entre le bounding-box du nœud et le segment d'arête —
      // bien plus précis que le seul centre (qui peut être à 70px d'une arête
      // qui traverse le bord supérieur de la carte).
      for (const e of loreEdges) {
        const ea = sim.get(e.from_node_id);
        const eb = sim.get(e.to_node_id);
        if (!ea || !eb) continue;
        const ex1  = ea.x + NODE_CARD_W / 2;
        const ey1  = ea.y + NODE_CARD_H / 2;
        const ex2  = eb.x + NODE_CARD_W / 2;
        const ey2  = eb.y + NODE_CARD_H / 2;
        const edx  = ex2 - ex1;
        const edy  = ey2 - ey1;
        const elen2 = edx * edx + edy * edy;
        if (elen2 < 1) continue;
        for (const n of loreNodes) {
          if (n.id === e.from_node_id || n.id === e.to_node_id) continue;
          const p = sim.get(n.id)!;
          // 4 coins + centre — on garde le point le plus proche du segment
          const hw = NODE_CARD_W / 2;
          const hh = NODE_CARD_H / 2;
          const cx = p.x + hw;
          const cy = p.y + hh;
          const samples = [
            { sx: p.x,            sy: p.y            },
            { sx: p.x + NODE_CARD_W, sy: p.y            },
            { sx: p.x,            sy: p.y + NODE_CARD_H },
            { sx: p.x + NODE_CARD_W, sy: p.y + NODE_CARD_H },
            { sx: cx,             sy: cy             },
          ];
          let minDist = Infinity;
          let minRx = 0, minRy = 0;
          for (const { sx, sy } of samples) {
            const t  = Math.max(0, Math.min(1, ((sx - ex1) * edx + (sy - ey1) * edy) / elen2));
            const qx = ex1 + t * edx;
            const qy = ey1 + t * edy;
            const rx = sx - qx;
            const ry = sy - qy;
            const d  = Math.sqrt(rx * rx + ry * ry);
            if (d < minDist) { minDist = d; minRx = rx; minRy = ry; }
          }
          if (minDist > 1 && minDist < EDGE_REP_DIST) {
            const f = K_EDGE_REP / (minDist * minDist);
            p.vx += (minRx / minDist) * f;
            p.vy += (minRy / minDist) * f;
          }
        }
      }

      // Gravité vers le centre (évite la dispersion)
      // + Gravité vers le quadrant du type (regroupe Perso avec Perso, etc.)
      for (const n of loreNodes) {
        const p    = sim.get(n.id)!;
        const quad = TYPE_QUAD[n.type] ?? { x: 0, y: 0 };
        p.vx -= p.x * K_GRAV;
        p.vy -= p.y * K_GRAV;
        p.vx += (quad.x - p.x) * K_TYPE;
        p.vy += (quad.y - p.y) * K_TYPE;
      }

      // Appliquer vitesse + amortissement + cap
      for (const id of ids) {
        const p    = sim.get(id)!;
        p.vx      *= DAMPING;
        p.vy      *= DAMPING;
        const spd  = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const cap  = MAX_VEL * temp;
        if (spd > cap) { p.vx = (p.vx / spd) * cap; p.vy = (p.vy / spd) * cap; }
        p.x += p.vx;
        p.y += p.vy;
      }

      temp *= COOL;
    }

    // ── Résolution des chevauchements post-simulation ─────────────────
    let hasOverlap = true;
    let oi = 0;
    while (hasOverlap && oi < 40) {
      hasOverlap = false; oi++;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = sim.get(ids[i])!;
          const b = sim.get(ids[j])!;
          const ox = (NODE_CARD_W + MIN_NODE_GAP) - Math.abs(b.x - a.x);
          const oy = (NODE_CARD_H + MIN_NODE_GAP) - Math.abs(b.y - a.y);
          if (ox > 0 && oy > 0) {
            hasOverlap = true;
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

    // ── Déconfliction nœud-arête ─────────────────────────────────────
    // Le cooling de la simulation peut empêcher un nœud de s'écarter d'une arête
    // en fin de simulation. Cette passe corrige les positions DIRECTEMENT (sans
    // vitesse ni cooling) pour garantir qu'aucune arête ne traverse un nœud.
    {
      const DC_MARGIN = 40; // px de marge autour du bounding-box
      // Distance minimale requise : demi-diagonale + marge
      const DC_REQUIRED = Math.sqrt((NODE_CARD_W / 2) ** 2 + (NODE_CARD_H / 2) ** 2) + DC_MARGIN;
      const DC_ITERS = 120;

      for (let di = 0; di < DC_ITERS; di++) {
        let moved = false;
        for (const e of loreEdges) {
          const ea = sim.get(e.from_node_id);
          const eb = sim.get(e.to_node_id);
          if (!ea || !eb) continue;
          // Centres des nœuds source et cible
          const ex1 = ea.x + NODE_CARD_W / 2;
          const ey1 = ea.y + NODE_CARD_H / 2;
          const ex2 = eb.x + NODE_CARD_W / 2;
          const ey2 = eb.y + NODE_CARD_H / 2;
          const edx = ex2 - ex1;
          const edy = ey2 - ey1;
          const elen2 = edx * edx + edy * edy;
          if (elen2 < 1) continue;

          for (const n of loreNodes) {
            if (n.id === e.from_node_id || n.id === e.to_node_id) continue;
            const p = sim.get(n.id)!;
            const cnx = p.x + NODE_CARD_W / 2;
            const cny = p.y + NODE_CARD_H / 2;
            // Projection du centre sur le segment (paramètre t ∈ [0,1])
            const t = Math.max(0, Math.min(1, ((cnx - ex1) * edx + (cny - ey1) * edy) / elen2));
            const qx = ex1 + t * edx;
            const qy = ey1 + t * edy;
            const rx = cnx - qx;
            const ry = cny - qy;
            const dist = Math.sqrt(rx * rx + ry * ry);
            if (dist < DC_REQUIRED) {
              moved = true;
              const push = DC_REQUIRED - dist + 2; // +2 anti-oscillation
              const nx = dist > 0.5 ? rx / dist : (Math.random() < 0.5 ? 1 : -1);
              const ny = dist > 0.5 ? ry / dist : (Math.random() < 0.5 ? 1 : -1);
              p.x += nx * push;
              p.y += ny * push;
            }
          }
        }
        if (!moved) break;
      }
    }

    // ── Centrage ─────────────────────────────────────────────────────
    const allV = Array.from(sim.values());
    const cx = allV.reduce((s, p) => s + p.x + NODE_CARD_W / 2, 0) / N;
    const cy = allV.reduce((s, p) => s + p.y + NODE_CARD_H / 2, 0) / N;
    for (const p of allV) { p.x = Math.round(p.x - cx); p.y = Math.round(p.y - cy); }

    // Positions cibles finales
    const targets = new Map(ids.map((id) => {
      const p = sim.get(id)!;
      return [id, { x: p.x, y: p.y }] as [string, { x: number; y: number }];
    }));

    // ── Animation 600ms ease-out-cubic ────────────────────────────────
    const startPos = new Map(rfNodesRef.current.map((n) => [n.id, { ...n.position }]));
    const DURATION = 600;
    const t0 = performance.now();

    const step = (now: number) => {
      const raw    = Math.min((now - t0) / DURATION, 1);
      const eased  = 1 - Math.pow(1 - raw, 3); // ease-out cubic

      setRfNodes((prev) => prev.map((rn) => {
        const from = startPos.get(rn.id);
        const to   = targets.get(rn.id);
        if (!from || !to) return rn;
        return { ...rn, position: {
          x: Math.round(from.x + (to.x - from.x) * eased),
          y: Math.round(from.y + (to.y - from.y) * eased),
        }};
      }));

      if (raw < 1) {
        requestAnimationFrame(step);
      } else {
        // Persistance BDD en batch quand l'animation est terminée
        batchUpdatePositions.mutate({
          projectId: project.id,
          nodes: ids.map((id) => { const t = targets.get(id)!; return { id, pos_x: t.x, pos_y: t.y }; }),
        });
      }
    };
    requestAnimationFrame(step);
  }, [loreNodes, loreEdges, project.id, setRfNodes, batchUpdatePositions]);

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

      <LoreEdgesCtx.Provider value={loreEdges}>
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
          <NavigateController rfNodesRef={rfNodesRef} navigateRef={navigateRef} onHighlight={handleHighlightNode} />
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.05)" />
        </ReactFlow>
      </LoreEdgesCtx.Provider>

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
          {/* Barre de recherche + dropdown résultats */}
          <div className="relative" ref={searchContainerRef}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); setSearchFocused(false); } }}
              placeholder="Rechercher…"
              className="pl-8 h-8 w-44 bg-white/5 border-white/10 text-xs focus-visible:ring-amber-500/40"
            />
            {showSearchDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-56 glass border border-white/15 rounded-xl shadow-2xl overflow-hidden py-1 z-50">
                {searchResults.map((n) => {
                  const cfg = LORE_NODE_TYPE_CONFIG[n.type];
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearch("");
                        setSearchFocused(false);
                        navigateRef.current?.(n);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/10 transition-colors text-left"
                    >
                      <span className="text-base leading-none">{cfg.emoji}</span>
                      <span className="flex-1 truncate font-medium">{n.name}</span>
                      <span className="text-muted-foreground/50 text-[10px] shrink-0">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
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
        onEdgeCreated={() => resolveOverlaps(loreNodes)}
      />
    </div>
  );
}
