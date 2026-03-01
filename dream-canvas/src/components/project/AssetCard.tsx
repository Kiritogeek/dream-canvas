import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Trash2, Pencil } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import type { Asset } from "@/types";

interface AssetCardProps {
  asset: Asset;
  isGenerating: boolean;
  onRegenerate: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onClick?: () => void;
}

export function AssetCard({
  asset,
  isGenerating,
  onRegenerate,
  onDelete,
  onEdit,
  onClick,
}: AssetCardProps) {
  const isCharacter = asset.asset_type === "character";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass rounded-lg sm:rounded-xl p-3 sm:p-4 group relative ${isCharacter ? "cursor-pointer" : ""}`}
      onClick={isCharacter ? onClick : undefined}
      role={isCharacter ? "button" : undefined}
    >
      {isGenerating ? (
        <div className="w-full aspect-[2/3] rounded-lg mb-2 sm:mb-3 gradient-dream flex items-center justify-center relative">
          <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
          <span className="absolute bottom-2 text-xs text-muted-foreground">
            Génération…
          </span>
        </div>
      ) : (
        <ImageWithFallback
          src={asset.image_url}
          alt={asset.name}
          className="w-full aspect-[2/3] object-cover rounded-lg mb-2 sm:mb-3"
          fallbackClassName="w-full aspect-[2/3] rounded-lg mb-2 sm:mb-3"
        />
      )}

      <h4 className="font-display font-semibold text-xs sm:text-sm">{asset.name}</h4>
      {asset.prompt && (
        <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-2">
          {asset.prompt}
        </p>
      )}
      {isCharacter && (
        <p className="text-xs text-primary mt-0.5 sm:mt-1 hidden sm:block">
          Cliquer pour gérer les vues
        </p>
      )}

      {/* Actions — toujours visibles sur mobile, au survol sur desktop */}
      <div
        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex gap-1 sm:gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
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
            disabled={isGenerating}
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
