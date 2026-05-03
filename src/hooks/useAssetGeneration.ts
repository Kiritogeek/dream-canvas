// Hook — Logique de génération d'images d'assets
// Depuis la refonte "Sheet System" (avril 2026), une génération de personnage
// produit en 1 appel : la vue de face (affichée) + la sheet 4 angles
// (référence cohérence panels). Pas de vues séparées, pas d'options de vue.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { logGenerationFailure } from "@/lib/generationLogger";
import { extractStyleKeyFromTemplateText } from "@/lib/styleTemplateMeta";
import { generateAssetImage } from "@/services/assets";
import type { Asset, Project, UserPlan, UsageInfo } from "@/types";

interface StyleInfo {
  project: Project | null;
  userPlan?: UserPlan;
  usageInfo?: UsageInfo;
}

function checkStyleDefined(
  { project }: StyleInfo,
  toast: ReturnType<typeof useToast>["toast"]
): { hasStyleText: boolean; hasStyleImages: boolean; currentStyleText: string } | null {
  const currentStyleText = (project?.style_template?.trim() ?? "").trim();
  const hasStyleText = currentStyleText.length > 0;
  const hasStyleImages =
    Array.isArray(project?.style_image_urls) &&
    project!.style_image_urls.length > 0;

  if (!hasStyleText && !hasStyleImages) {
    toast({
      title: "Style requis",
      description:
        "Enregistrez un style sur le projet (template et/ou images de référence) avant de générer — seul le style sauvegardé est utilisé.",
      variant: "destructive",
    });
    return null;
  }

  return { hasStyleText, hasStyleImages, currentStyleText };
}

function summarizeGenerationError(message: string): string {
  const normalized = message.trim();
  if (!normalized) return "Raison inconnue";
  if (normalized.includes("Contenu bloqué par la politique FAL")) {
    return "contenu refusé par la politique de sécurité";
  }
  if (normalized.includes("Session expirée") || normalized.includes("JWT")) {
    return "session expirée, reconnectez-vous";
  }
  if (normalized.includes("timeout")) {
    return "délai dépassé, réessayez";
  }
  const compact = normalized.replace(/\s+/g, " ");
  return compact.length > 140 ? `${compact.slice(0, 140)}…` : compact;
}

export function useAssetGeneration(styleInfo: StyleInfo) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [generatingAssetId, setGeneratingAssetId] = useState<string | null>(null);

  const canGenerate = (): boolean => {
    if (styleInfo.usageInfo && styleInfo.usageInfo.count >= styleInfo.usageInfo.limit) {
      toast({
        title: "Quota atteint",
        description: `Vous avez utilisé ${styleInfo.usageInfo.count}/${styleInfo.usageInfo.limit} générations ce mois-ci.`,
        variant: "destructive",
      });
      return false;
    }
    return checkStyleDefined(styleInfo, toast) !== null;
  };

  const generate = async (asset: Asset): Promise<void> => {
    const promptText = asset.prompt?.trim();
    if (!promptText) {
      toast({
        title: "Impossible",
        description: "Cet asset n'a pas de prompt.",
        variant: "destructive",
      });
      return;
    }

    const styleCheck = checkStyleDefined(styleInfo, toast);
    if (!styleCheck) return;

    const { hasStyleText, hasStyleImages, currentStyleText } = styleCheck;

    setGeneratingAssetId(asset.id);

    const modelLabel = "FLUX.2 Pro (haute qualité)";
    const presetKey = hasStyleText
      ? extractStyleKeyFromTemplateText(currentStyleText)
      : null;

    if (import.meta.env.DEV) {
      console.info("[DreamWeave][Generate asset]", {
        assetId: asset.id,
        asset_type: asset.asset_type,
        style_key: presetKey,
        style_text_chars: currentStyleText.length,
        reference_images_on_project: styleInfo.project?.style_image_urls?.length ?? 0,
      });
    }

    const isCharacter = asset.asset_type === "character";
    toast({
      title: "Génération en cours…",
      description: [
        hasStyleImages
          ? `${modelLabel} — ${styleInfo.project!.style_image_urls!.length} image${styleInfo.project!.style_image_urls!.length > 1 ? "s" : ""} de référence (projet)`
          : `Modèle : ${modelLabel}`,
        isCharacter
          ? "Vue de face + sheet 4 angles (cohérence panels)"
          : null,
        isCharacter ? "Temps estimé : 30 à 90 secondes" : "Temps estimé : 15 à 45 secondes",
        presetKey ? `Preset : ${presetKey}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });

    try {
      const result = await generateAssetImage({
        asset_id: asset.id,
        prompt: promptText,
        asset_type: asset.asset_type,
      });

      if (result.image_url) {
        qc.invalidateQueries({ queryKey: ["assets", asset.project_id] });
        qc.invalidateQueries({ queryKey: ["monthlyUsage"] });
        toast({ title: "Image générée !" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error(`[DreamWeave][asset-image:ui-catch][reason] ${message}`);
      const reason = summarizeGenerationError(message);
      logGenerationFailure(
        "asset-image:ui-catch",
        {
          asset_id: asset.id,
          asset_type: asset.asset_type,
          project_id: asset.project_id,
        },
        err
      );
      toast({
        title: "Échec de la génération",
        description: `Raison : ${reason}`,
        variant: "destructive",
      });
    } finally {
      setGeneratingAssetId(null);
    }
  };

  return {
    generatingAssetId,
    canGenerate,
    generate,
  };
}
