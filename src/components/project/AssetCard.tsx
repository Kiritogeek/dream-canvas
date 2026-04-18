import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Trash2, Pencil, Eye } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import type { Asset } from "@/types";

interface AssetCardProps {
  asset: Asset;
  isGenerating: boolean;
  typeBadge?: { bg: string; label: string };
  onRegenerate: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onClick?: () => void;
  canGenerate?: boolean;
  onImageClick?: () => void;
}

export function AssetCard({
  asset,
  isGenerating,
  typeBadge,
  onRegenerate,
  onDelete,
  onEdit,
  onClick,
  canGenerate,
  onImageClick,
}: AssetCardProps) {
  const isCharacter = asset.asset_type === "character";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-lg sm:rounded-xl p-3 sm:p-4 group relative flex flex-col h-full"
    >
      {isGenerating ? (
        <div className="w-full aspect-[2/3] rounded-lg mb-2 sm:mb-3 gradient-dream flex items-center justify-center relative">
          <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
          <span className="absolute bottom-2 text-xs text-muted-foreground">
            Génération…
          </span>
        </div>
      ) : (
        <div
          className={`w-full aspect-[2/3] mb-2 sm:mb-3 relative${onImageClick && asset.image_url && !isGenerating ? " cursor-pointer" : ""}`}
          onClick={onImageClick && asset.image_url && !isGenerating ? onImageClick : undefined}
        >
          <ImageWithFallback
            src={asset.image_url}
            alt={asset.name}
            className="w-full h-full object-cover rounded-lg"
            fallbackClassName="w-full h-full rounded-lg"
          />
          {/* Badge type */}
          {typeBadge && (
            <span
              className={`absolute bottom-1.5 left-1.5 ${typeBadge.bg} text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white`}
            >
              {typeBadge.label}
            </span>
          )}
        </div>
      )}

      <div className="mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1 min-h-[2.75rem] sm:min-h-[3.25rem] flex flex-col">
        <h4 className="font-display font-semibold text-xs sm:text-sm line-clamp-1">
          {asset.name}
        </h4>

        <p
          className={`text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2 ${
            asset.prompt ? "" : "invisible"
          }`}
        >
          {asset.prompt || "Placeholder"}
        </p>

        <p
          className={`text-xs text-primary hidden sm:block ${
            isCharacter ? "" : "invisible"
          }`}
        >
          Cliquer pour gérer les vues
        </p>
      </div>

      {/* Actions — toujours visibles sur mobile, au survol sur desktop */}
      <div
        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex gap-1 sm:gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {isCharacter && onClick && (
          <button
            onClick={onClick}
            disabled={isGenerating}
            className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-emerald-500/90 text-white shadow-md hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            title="Voir les différentes vues du personnage"
          >
            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        )}

        <button
          onClick={onEdit}
          disabled={isGenerating}
          className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-primary/90 text-primary-foreground shadow-md
            hover:bg-primary transition-colors disabled:opacity-50 disabled:pointer-events-none"
          title="Modifier le nom ou le prompt"
        >
          <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>

        {asset.prompt && (
          <button
            onClick={onRegenerate}
            disabled={isGenerating || canGenerate === false}
            className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-amber-500/90 text-white shadow-md
              hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            title="Régénérer l'image"
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        )}

        <button
          onClick={onDelete}
          disabled={isGenerating}
          className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-destructive/90 text-destructive-foreground shadow-md
            hover:bg-destructive transition-colors disabled:opacity-50 disabled:pointer-events-none"
          title="Supprimer cet asset"
        >
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </div>
    </motion.div>
  );
}
