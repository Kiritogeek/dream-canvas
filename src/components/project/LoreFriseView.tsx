import { useMemo, useState } from "react";
import { Loader2, CalendarDays } from "lucide-react";
import { useLoreNodes } from "@/hooks/useLoreNodes";
import { useLoreEdges } from "@/hooks/useLoreEdges";
import { useChapters } from "@/hooks/useChapters";
import { useAuth } from "@/hooks/useAuth";
import { LoreNodeSheet } from "./LoreNodeSheet";
import { cn } from "@/lib/utils";
import type { Project, LoreNode, Asset } from "@/types";
import { LORE_NODE_TYPE_CONFIG } from "@/types";

// ── Layout constants ─────────────────────────────────────────────────────────
const LABEL_W       = 176;
const LORE_W        = 160;
const COL_W         = 150;
const ROW_H         = 52;
const HDR_H         = 52;
const DOT_R         = 5;
const EVENT_ZONE_H  = 120;
const EVENT_ZONE_PAD = 16;

// ── Couleurs par type ────────────────────────────────────────────────────────
const NODE_COLORS: Record<string, { dot: string; line: string; label: string }> = {
  character: { dot: "#a78bfa", line: "#7c3aed", label: "text-violet-300" },
  location:  { dot: "#60a5fa", line: "#2563eb", label: "text-blue-300"   },
  object:    { dot: "#fbbf24", line: "#d97706", label: "text-amber-300"  },
  event:     { dot: "#34d399", line: "#059669", label: "text-green-300"  },
};

// ── Bordures de pills pour la colonne Lore établi ────────────────────────────
const FLOATING_PILL_STYLE: Record<string, string> = {
  character: "border-violet-500/40 bg-violet-950/60 text-violet-200",
  location:  "border-blue-500/40   bg-blue-950/60   text-blue-200",
  object:    "border-amber-500/40  bg-amber-950/60  text-amber-200",
  event:     "border-green-500/40  bg-green-950/60  text-green-200",
};

// ── Helpers position ─────────────────────────────────────────────────────────
function xForChapter(chapterNumber: number): number {
  return LORE_W + (chapterNumber - 1) * COL_W + COL_W / 2;
}

function yForRow(rowIdx: number): number {
  return rowIdx * ROW_H + ROW_H / 2;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  project: Project;
  assets: Asset[];
}

export function LoreFriseView({ project, assets }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: chapters  = [], isLoading: chapLoading  } = useChapters(project.id);
  const { data: loreNodes = [], isLoading: nodesLoading } = useLoreNodes(project.id);
  const { data: loreEdges = [] }                          = useLoreEdges(project.id);

  const [selectedNode, setSelectedNode] = useState<LoreNode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const isLoading = chapLoading || nodesLoading;

  // Chapitres triés
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_number - b.chapter_number),
    [chapters]
  );

  // Map chapter.id → chapter_number
  const chapterNumById = useMemo(
    () => new Map(chapters.map((c) => [c.id, c.chapter_number])),
    [chapters]
  );

  function getChapterNumber(chapterId: string | null): number | null {
    if (!chapterId) return null;
    return chapterNumById.get(chapterId) ?? null;
  }

  // Entités non-event sans chapter_id → colonne Lore établi
  const floatingNodes = useMemo(
    () => loreNodes.filter((n) => n.type !== "event" && !n.chapter_id),
    [loreNodes]
  );

  // Entités non-event avec chapter_id → swimlanes
  const swimlaneEntities = useMemo(
    () => loreNodes.filter((n) => n.type !== "event" && !!n.chapter_id),
    [loreNodes]
  );

  // Événements
  const eventNodes = useMemo(
    () => loreNodes.filter((n) => n.type === "event"),
    [loreNodes]
  );

  // Pour chaque événement : entités non-event connectées
  const connectedByEvent = useMemo(() => {
    const map = new Map<string, LoreNode[]>();
    for (const ev of eventNodes) {
      const ids = loreEdges
        .filter((e) => e.from_node_id === ev.id || e.to_node_id === ev.id)
        .map((e) => (e.from_node_id === ev.id ? e.to_node_id : e.from_node_id));
      map.set(ev.id, loreNodes.filter((n) => ids.includes(n.id) && n.type !== "event"));
    }
    return map;
  }, [eventNodes, loreEdges, loreNodes]);

  // Pour chaque entité swimlane : dernier chapitre via événements connectés
  const entityLastChapter = useMemo(() => {
    const map = new Map<string, number>();
    for (const entity of swimlaneEntities) {
      let max: number | null = null;
      for (const [evId, entities] of connectedByEvent.entries()) {
        if (!entities.some((n) => n.id === entity.id)) continue;
        const ev = loreNodes.find((n) => n.id === evId);
        if (!ev) continue;
        const chNum = getChapterNumber(ev.chapter_id);
        if (chNum !== null && (max === null || chNum > max)) max = chNum;
      }
      if (max !== null) map.set(entity.id, max);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swimlaneEntities, connectedByEvent, loreNodes, chapterNumById]);

  // ── États de chargement / vide ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <CalendarDays className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-muted-foreground/70 text-sm font-medium">Aucun chapitre créé pour le moment</p>
          <p className="text-muted-foreground/40 text-xs mt-1 max-w-xs">
            La frise s'activera dès que tu auras ajouté des chapitres dans la section Édition.
          </p>
        </div>
      </div>
    );
  }

  const svgW = LORE_W + sortedChapters.length * COL_W;
  const svgH = swimlaneEntities.length * ROW_H + EVENT_ZONE_H;

  return (
    <div className="h-full overflow-auto">
      <div
        style={{
          minWidth: LABEL_W + LORE_W + sortedChapters.length * COL_W,
          position: "relative",
        }}
      >
        {/* ── Header — sticky top ──────────────────────────────────────────── */}
        <div
          style={{ position: "sticky", top: 0, display: "flex", height: HDR_H, zIndex: 10 }}
          className="bg-background border-b border-white/10"
        >
          {/* Coin */}
          <div
            style={{ position: "sticky", left: 0, width: LABEL_W, zIndex: 15 }}
            className="flex items-center px-4 bg-background border-r border-white/10 shrink-0"
          >
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Entités</span>
          </div>

          {/* Colonne Lore établi */}
          <div
            style={{ width: LORE_W }}
            className="flex flex-col items-center justify-center border-r border-white/10 shrink-0"
          >
            <span className="text-[11px] font-semibold text-white/60">📚</span>
            <span className="text-[10px] text-white/40 font-medium">Lore établi</span>
          </div>

          {/* En-têtes chapitres */}
          {sortedChapters.map((ch) => (
            <div
              key={ch.id}
              style={{ width: COL_W }}
              className="flex flex-col items-center justify-center border-r border-white/10 shrink-0"
            >
              <span className="text-xs font-bold text-amber-300">Ch. {ch.chapter_number}</span>
              {ch.title && (
                <span className="text-[10px] text-white/30 truncate max-w-[120px] px-1">{ch.title}</span>
              )}
            </div>
          ))}
        </div>

        {/* ── Swimlane rows ────────────────────────────────────────────────── */}
        {swimlaneEntities.map((node) => (
          <div
            key={node.id}
            style={{ display: "flex", height: ROW_H, position: "relative" }}
            className="border-b border-white/5 group"
          >
            {/* Label — sticky left */}
            <button
              onClick={() => { setSelectedNode(node); setSheetOpen(true); }}
              style={{ position: "sticky", left: 0, width: LABEL_W, zIndex: 5 }}
              className="flex items-center gap-2.5 px-3 border-r border-white/10 bg-background/95 hover:bg-white/5 transition-colors text-left"
            >
              <span className="text-base leading-none shrink-0">
                {LORE_NODE_TYPE_CONFIG[node.type].emoji}
              </span>
              <span className={cn("text-sm font-medium truncate", NODE_COLORS[node.type]?.label ?? "text-white/70")}>
                {node.name}
              </span>
            </button>

            {/* Zone timeline — le SVG overlay dessine ici */}
            <div style={{ width: LORE_W + sortedChapters.length * COL_W }} className="group-hover:bg-white/[0.02] transition-colors" />
          </div>
        ))}

        {/* ── Ligne vide si aucune entité swimlane ─────────────────────────── */}
        {swimlaneEntities.length === 0 && (
          <div
            style={{ display: "flex", height: ROW_H * 2, position: "relative" }}
            className="border-b border-white/5"
          >
            <div
              style={{ position: "sticky", left: 0, width: LABEL_W, zIndex: 5 }}
              className="flex items-center px-4 border-r border-white/10 bg-background/95"
            >
              <span className="text-[10px] text-white/20 italic">Aucune entité avec chapitre</span>
            </div>
            <div style={{ width: svgW }} />
          </div>
        )}

        {/* ── Zone événements ──────────────────────────────────────────────── */}
        <div
          style={{ height: EVENT_ZONE_H, position: "relative" }}
          className="border-t border-white/10 bg-white/[0.02]"
        >
          <p
            style={{ position: "sticky", left: LABEL_W + 8 }}
            className="text-[10px] text-white/30 uppercase tracking-widest pt-3 pb-1"
          >
            Événements
          </p>

          {eventNodes.map((event) => {
            const chNum = getChapterNumber(event.chapter_id);
            if (!chNum) return null;
            const x = LABEL_W + xForChapter(chNum);
            const linked = connectedByEvent.get(event.id) ?? [];
            return (
              <button
                key={event.id}
                onClick={() => { setSelectedNode(event); setSheetOpen(true); }}
                style={{
                  position: "absolute",
                  left: x - 60,
                  top: EVENT_ZONE_PAD + 20,
                  width: 120,
                }}
                className="rounded-lg border border-green-500/30 bg-green-950/60 px-2 py-1.5 text-center hover:bg-green-950/80 transition-colors"
              >
                <p className="text-[10px] text-green-300 font-medium truncate">📜 {event.name}</p>
                {linked.length > 0 && (
                  <p className="text-[9px] text-white/30 mt-0.5 truncate">
                    {linked.map((n) => n.name).join(", ")}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Pills Lore établi — positionnées absolument dans la colonne gauche ── */}
        {floatingNodes.map((node, i) => (
          <button
            key={node.id}
            onClick={() => { setSelectedNode(node); setSheetOpen(true); }}
            style={{
              position: "absolute",
              top: HDR_H + i * 32 + 8,
              left: LABEL_W + 8,
              width: LORE_W - 16,
              zIndex: 4,
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium hover:bg-white/10 transition-colors",
              FLOATING_PILL_STYLE[node.type] ?? "border-white/20 bg-white/5 text-white/70"
            )}
          >
            <span className="leading-none shrink-0">{LORE_NODE_TYPE_CONFIG[node.type].emoji}</span>
            <span className="truncate">{node.name}</span>
          </button>
        ))}

        {/* ── SVG overlay — lignes swimlanes + dots + connecteurs événements ── */}
        <svg
          style={{
            position: "absolute",
            top: HDR_H,
            left: LABEL_W,
            pointerEvents: "none",
            width: svgW,
            height: svgH,
            overflow: "visible",
          }}
        >
          {/* Lignes de grille verticales */}
          {sortedChapters.map((ch, i) => (
            <line
              key={ch.id}
              x1={LORE_W + i * COL_W}
              y1={0}
              x2={LORE_W + i * COL_W}
              y2={swimlaneEntities.length * ROW_H}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          ))}

          {/* Séparateur colonne Lore établi */}
          <line
            x1={LORE_W}
            y1={0}
            x2={LORE_W}
            y2={swimlaneEntities.length * ROW_H}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />

          {/* Swimlane lines + dots par entité */}
          {swimlaneEntities.map((node, rowIdx) => {
            const chNum = getChapterNumber(node.chapter_id);
            if (chNum === null) return null;
            const x1 = xForChapter(chNum);
            const x2 = xForChapter(entityLastChapter.get(node.id) ?? chNum);
            const y  = yForRow(rowIdx);
            const color = NODE_COLORS[node.type];
            if (!color) return null;
            return (
              <g key={node.id}>
                {x2 > x1 && (
                  <line
                    x1={x1} y1={y} x2={x2} y2={y}
                    stroke={color.line}
                    strokeWidth={2}
                    strokeOpacity={0.6}
                  />
                )}
                {/* Dot première apparition */}
                <circle cx={x1} cy={y} r={DOT_R} fill={color.dot} />
                {/* Dot dernier événement */}
                {x2 > x1 && (
                  <circle
                    cx={x2} cy={y} r={DOT_R - 1}
                    fill={color.dot}
                    fillOpacity={0.6}
                    stroke={color.line}
                    strokeWidth={1.5}
                  />
                )}
              </g>
            );
          })}

          {/* Connecteurs pointillés événements → swimlanes */}
          {eventNodes.map((event) => {
            const chNum = getChapterNumber(event.chapter_id);
            if (!chNum) return null;
            const ex = xForChapter(chNum);
            const connected = connectedByEvent.get(event.id) ?? [];
            const eventY = swimlaneEntities.length * ROW_H + EVENT_ZONE_PAD + 20 + 6;
            return connected.map((entity) => {
              const rowIdx = swimlaneEntities.findIndex((n) => n.id === entity.id);
              if (rowIdx < 0) return null;
              const ey = yForRow(rowIdx);
              return (
                <line
                  key={`${event.id}-${entity.id}`}
                  x1={ex} y1={ey} x2={ex} y2={eventY}
                  stroke="#34d399"
                  strokeWidth={1}
                  strokeOpacity={0.3}
                  strokeDasharray="4 3"
                />
              );
            });
          })}
        </svg>

        {/* ── LoreNodeSheet ─────────────────────────────────────────────────── */}
        <LoreNodeSheet
          node={selectedNode}
          nodes={loreNodes}
          edges={loreEdges}
          assets={assets}
          projectId={project.id}
          userId={userId}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onEdgeCreated={() => {}}
          onNodeUpdated={() => {}}
        />
      </div>
    </div>
  );
}
