// Hook — Logique de génération d'images d'assets (élimine la duplication)
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { generateAssetImage } from "@/services/assets";
import type { Asset, AssetType, CharacterView, Project, UserPlan } from "@/types";

interface StyleInfo {
  styleTemplate: string;
  project: Project | null;
  userPlan?: UserPlan;
}

/** Vérifie si un style (texte et/ou images) est défini. Retourne true si OK. */
function checkStyleDefined(
  { styleTemplate, project }: StyleInfo,
  toast: ReturnType<typeof useToast>["toast"]
): { hasStyleText: boolean; hasStyleImages: boolean; currentStyleText: string } | null {
  const currentStyleText = (
    styleTemplate?.trim() ||
    project?.style_template?.trim() ||
    ""
  ).trim();
  const hasStyleText = currentStyleText.length > 0;
  const hasStyleImages =
    Array.isArray(project?.style_image_urls) &&
    project!.style_image_urls.length > 0;

  if (!hasStyleText && !hasStyleImages) {
    toast({
      title: "Style requis",
      description:
        "Définissez un style dans l'onglet Style du projet (texte et/ou images de référence) avant de générer.",
      variant: "destructive",
    });
    return null;
  }

  return { hasStyleText, hasStyleImages, currentStyleText };
}

export function useAssetGeneration(styleInfo: StyleInfo) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [generatingAssetId, setGeneratingAssetId] = useState<string | null>(null);
  const [generatingView, setGeneratingView] = useState<CharacterView | null>(null);

  /** Vérifie le style avant d'ouvrir la modale de création */
  const canGenerate = (): boolean => {
    return checkStyleDefined(styleInfo, toast) !== null;
  };

  /** Génère l'image d'un asset (après création ou régénération) */
  const generate = async (
    asset: Asset,
    options?: { view?: CharacterView }
  ): Promise<void> => {
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
    const view = options?.view;

    if (view) {
      setGeneratingView(view);
    } else {
      setGeneratingAssetId(asset.id);
    }

    const styleImageUrls =
      styleInfo.project?.style_image_urls?.length
        ? styleInfo.project.style_image_urls
        : undefined;

    const isFree = styleInfo.userPlan === "free" || !styleInfo.userPlan;
    const modelLabel = isFree ? "Schnell (rapide)" : "FLUX.2 Pro (haute qualité)";

    toast({
      title: view ? "Génération de la vue…" : "Génération en cours…",
      description: isFree
        ? `Modèle : ${modelLabel}`
        : styleImageUrls
          ? `${modelLabel} — ${styleImageUrls.length} image${styleImageUrls.length > 1 ? "s" : ""} de référence`
          : `Modèle : ${modelLabel}`,
    });

    try {
      const result = await generateAssetImage({
        asset_id: asset.id,
        prompt: promptText,
        style_template: hasStyleText ? currentStyleText : undefined,
        style_image_urls: styleImageUrls,
        asset_type: asset.asset_type,
        image_view: view ?? "front",
      });

      if (result.image_url) {
        // Invalider le cache pour forcer le rechargement
        qc.invalidateQueries({ queryKey: ["assets", asset.project_id] });
        // Rafraîchir le compteur d'usage mensuel
        qc.invalidateQueries({ queryKey: ["monthlyUsage"] });
        toast({ title: view ? "Vue générée !" : "Image générée !" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast({
        title: view ? "Génération de vue échouée" : "Génération échouée",
        description: message,
        variant: "destructive",
      });
    } finally {
      setGeneratingAssetId(null);
      setGeneratingView(null);
    }
  };

  return {
    generatingAssetId,
    generatingView,
    canGenerate,
    generate,
  };
}
