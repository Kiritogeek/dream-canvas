import { useRef, useState } from "react";
import { GripVertical, Eye, EyeOff, Image2, Palette, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LayerItem, LayerElementType } from "@/types";

interface PanelLayersPanelProps {
  layers: LayerItem[];
  selectedId: string | null;
  selectedType: LayerElementType | null;
  onSelect: (id: string, type: LayerElementType) => void;
  onReorder: (reordered: LayerItem[]) => void;
  onToggleVisibility: (id: string, type: LayerElementType) => void;
}

function LayerTypeIcon({ type }: { type: LayerElementType }) {
  if (type === "block") return <Image2 className="h-3.5 w-3.5 shrink-0 text-violet-400" strokeWidth={1.75} />;
  if (type === "colorBlock") return <Palette className="h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={1.75} />;
  return <MessageCircle className="h-3.5 w-3.5 shrink-0 text-blue-400" strokeWidth={1.75} />;
}

export function PanelLayersPanel({
  layers,
  selectedId,
  selectedType,
  onSelect,
  onReorder,
  onToggleVisibility,
}: PanelLayersPanelProps) {
  const dragIndexRef = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = dragIndexRef.current;
    if (sourceIndex === null || sourceIndex === targetIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      dragIndexRef.current = null;
      return;
    }
    const reordered = [...layers];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorder(reordered);
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="p-3 flex flex-col gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Couches ({layers.length})
      </span>

      {layers.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-center">
          <p className="text-xs text-muted-foreground">Aucun élément dans ce panel</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {layers.map((item, index) => {
            const isSelected = selectedId === item.id && selectedType === item.type;
            const isDragging = draggingIndex === index;
            const isDragOver = dragOverIndex === index && draggingIndex !== index;
            const truncatedName = item.name.length > 20 ? item.name.slice(0, 20) + "…" : item.name;

            return (
              <div
                key={`${item.type}-${item.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelect(item.id, item.type)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer select-none transition-all duration-100",
                  "border",
                  isSelected
                    ? "ring-1 ring-primary/50 bg-primary/8 border-primary/30"
                    : "border-transparent hover:bg-muted/40",
                  isDragging && "opacity-40",
                  isDragOver && "border-primary/50 bg-primary/5",
                  item.hidden && "opacity-50",
                )}
              >
                {/* Poignée drag */}
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 cursor-grab" strokeWidth={1.75} />

                {/* Icône type */}
                <LayerTypeIcon type={item.type} />

                {/* Nom */}
                <span className="flex-1 min-w-0 text-xs text-foreground truncate" title={item.name}>
                  {truncatedName}
                </span>

                {/* Bouton visibilité */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(item.id, item.type);
                  }}
                  className="shrink-0 h-5 w-5 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
                  title={item.hidden ? "Afficher" : "Masquer"}
                >
                  {item.hidden
                    ? <EyeOff className="h-3 w-3" strokeWidth={1.75} />
                    : <Eye className="h-3 w-3" strokeWidth={1.75} />
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
