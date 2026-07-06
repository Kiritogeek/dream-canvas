import { useEffect, useState } from "react";
import { Users, MapPin, Box, Coins, ImagePlus, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCreateAsset } from "@/hooks/useAssets";
import { uploadReferenceImage } from "@/services/assets";
import { callSuggestAssetPrompt } from "@/services/scenarioAI";
import type { Asset, AssetType, AssetTabConfig } from "@/types";

const assetTabs: AssetTabConfig[] = [
  { type: "character", icon: Users, label: "Personnages" },
  { type: "background", icon: MapPin, label: "Décors" },
  { type: "object", icon: Box, label: "Objets" },
];

interface CreateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Tous les assets du projet — sert au contrôle d'unicité du nom. */
  assets: Asset[];
  /** Lance la génération de l'image après création (si un prompt est défini). */
  onGenerate: (asset: Asset) => void;
  /** Type pré-sélectionné à l'ouverture (ex : filtre actif). */
  defaultType?: AssetType;
  /** Nom pré-rempli à l'ouverture (ex : depuis le scénario). */
  initialName?: string;
  /** Type pré-rempli à l'ouverture (ex : depuis le scénario). */
  initialType?: AssetType | null;
  /** Style visuel du projet (project.style_template) — nourrit l'aide IA à la description. */
  projectStyle?: string;
  /** Appelé après création réussie (ex : lier l'asset au chapitre courant). */
  onCreated?: (asset: Asset) => void;
}

/**
 * Pop-up de création d'asset, partagée entre la bibliothèque d'assets et
 * l'éditeur de scénario. Contrôlée via `open` / `onOpenChange`.
 */
export function CreateAssetDialog({
  open,
  onOpenChange,
  projectId,
  assets,
  onGenerate,
  defaultType = "character",
  initialName,
  initialType,
  projectStyle,
  onCreated,
}: CreateAssetDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const createAssetMutation = useCreateAsset();

  const [newAssetType, setNewAssetType] = useState<AssetType | null>("character");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetPrompt, setNewAssetPrompt] = useState("");
  const [newAssetLore, setNewAssetLore] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [newAssetRefFile, setNewAssetRefFile] = useState<File | null>(null);
  const [newAssetRefPreview, setNewAssetRefPreview] = useState<string | null>(null);
  const [newAssetRefDragging, setNewAssetRefDragging] = useState(false);

  // Seed des champs à l'ouverture (nom/type venant du scénario ou du filtre actif).
  useEffect(() => {
    if (!open) return;
    setNewAssetType(initialType ?? defaultType);
    setNewAssetName(initialName ?? "");
    setNewAssetPrompt("");
    setNewAssetLore("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clearRef = () => {
    if (newAssetRefPreview) URL.revokeObjectURL(newAssetRefPreview);
    setNewAssetRefFile(null);
    setNewAssetRefPreview(null);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) clearRef();
    onOpenChange(o);
  };

  const canSuggest = !!newAssetType && newAssetName.trim().length > 0 && !isSuggesting;

  const handleSuggestDescription = async () => {
    if (!newAssetType || !newAssetName.trim()) return;
    setIsSuggesting(true);
    try {
      const { text } = await callSuggestAssetPrompt({
        mode: "suggest_asset_prompt",
        asset_name: newAssetName.trim(),
        asset_type: newAssetType,
        style_description: projectStyle?.trim() || undefined,
        context_excerpt: newAssetLore.trim() || undefined,
        current_description: newAssetPrompt.trim() || undefined,
      });
      const suggestion = text?.trim();
      if (suggestion) {
        setNewAssetPrompt(suggestion);
      } else {
        toast({
          title: "Aucune suggestion",
          description: "L'IA n'a rien renvoyé. Réessayez.",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast({ title: "Échec de la suggestion", description: msg, variant: "destructive" });
    } finally {
      setIsSuggesting(false);
    }
  };

  const canCreateAsset =
    !!newAssetType && newAssetName.trim().length > 0 && newAssetPrompt.trim().length > 0;

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetType) return;
    const nameTrim = newAssetName.trim();
    const promptText = newAssetPrompt.trim() || null;

    const nameLower = nameTrim.toLowerCase();
    if (assets.some((a) => (a.name ?? "").trim().toLowerCase() === nameLower)) {
      toast({
        title: "Nom déjà utilisé",
        description: "Un asset porte déjà ce nom. Choisissez un nom unique pour chaque asset.",
        variant: "destructive",
      });
      return;
    }

    try {
      const loreText = newAssetLore.trim() || null;

      let referenceImageUrl: string | null = null;
      if (newAssetRefFile && user?.id) {
        try {
          referenceImageUrl = await uploadReferenceImage(newAssetRefFile, user.id);
        } catch {
          toast({ title: "Erreur upload référence", description: "L'image de référence n'a pas pu être uploadée.", variant: "destructive" });
          return;
        }
      }

      const newAsset = await createAssetMutation.mutateAsync({
        project_id: projectId,
        name: nameTrim,
        asset_type: newAssetType,
        prompt: promptText,
        ...(loreText ? { lore: loreText } as Record<string, unknown> : {}),
        ...(referenceImageUrl ? { reference_image_url: referenceImageUrl } as Record<string, unknown> : {}),
      } as Parameters<typeof createAssetMutation.mutateAsync>[0]);

      clearRef();
      onOpenChange(false);
      onCreated?.(newAsset);

      // Lancer la génération automatiquement si prompt défini.
      if (promptText) {
        onGenerate(newAsset);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass">
        <DialogHeader>
          <DialogTitle className="font-display">Nouvel asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div className="space-y-2">
            <Label>
              Type{" "}
              {newAssetType === null && (
                <span className="text-destructive text-xs font-normal">(choisissez un type)</span>
              )}
            </Label>
            <div className="flex flex-wrap gap-2">
              {assetTabs.map((t) => (
                <Button
                  key={t.type}
                  type="button"
                  size="sm"
                  variant={newAssetType === t.type ? "default" : "outline"}
                  onClick={() => setNewAssetType(t.type)}
                  className={`text-xs sm:text-sm ${
                    newAssetType === t.type
                      ? "gradient-primary text-primary-foreground"
                      : ""
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              placeholder="Ex: Héros principal"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>
                Description / Prompt <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!canSuggest}
                onClick={handleSuggestDescription}
                title={
                  newAssetName.trim()
                    ? "Laisse l'IA rédiger une description à partir du nom et du style"
                    : "Renseigne d'abord un nom"
                }
                className="h-7 px-2 text-xs text-[hsl(var(--lavender))] hover:bg-[hsl(var(--lavender)/0.1)] disabled:opacity-40"
              >
                {isSuggesting ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                {isSuggesting ? "Rédaction…" : "Aide-moi à décrire"}
              </Button>
            </div>
            <Textarea
              value={newAssetPrompt}
              onChange={(e) => setNewAssetPrompt(e.target.value)}
              placeholder="Décrivez l'asset pour la génération IA..."
              rows={3}
            />
            {!newAssetPrompt.trim() && (
              <p className="text-xs text-muted-foreground">
                Le prompt est requis pour générer l'image. Astuce : « Aide-moi à décrire » le rédige
                pour vous, sans crédit.
              </p>
            )}
          </div>
          {/* Image de référence */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ImagePlus className="h-3.5 w-3.5" />
              Image de référence <span className="text-muted-foreground/50">(optionnel)</span>
            </Label>
            {newAssetRefPreview ? (
              <div className="relative w-full h-28 rounded-lg overflow-hidden border border-[hsl(var(--lavender)/0.3)] bg-black/20">
                <img src={newAssetRefPreview} alt="Référence" className="w-full h-full object-contain" />
                <button
                  type="button"
                  className="absolute top-1.5 right-1.5 bg-black/70 rounded-full p-1 hover:bg-black/90 transition-colors"
                  onClick={clearRef}
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center gap-1.5 cursor-pointer py-4 rounded-lg border border-dashed transition-colors ${
                  newAssetRefDragging
                    ? "border-[hsl(var(--lavender)/0.7)] bg-[hsl(var(--lavender)/0.12)]"
                    : "border-[hsl(var(--lavender)/0.3)] bg-[hsl(var(--lavender)/0.04)] hover:bg-[hsl(var(--lavender)/0.08)]"
                }`}
                onDragOver={(e) => { e.preventDefault(); }}
                onDragEnter={(e) => { e.preventDefault(); setNewAssetRefDragging(true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setNewAssetRefDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setNewAssetRefDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (!f?.type.startsWith("image/")) return;
                  if (newAssetRefPreview) URL.revokeObjectURL(newAssetRefPreview);
                  setNewAssetRefFile(f);
                  setNewAssetRefPreview(URL.createObjectURL(f));
                }}
              >
                <ImagePlus className="h-5 w-5 text-[hsl(var(--lavender)/0.6)]" />
                <span className="text-xs text-muted-foreground">
                  {newAssetRefDragging ? "Déposer ici" : "Glisser ou cliquer pour ajouter"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (newAssetRefPreview) URL.revokeObjectURL(newAssetRefPreview);
                    setNewAssetRefFile(f);
                    setNewAssetRefPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
            )}
            <p className="text-[10px] text-muted-foreground/50">
              Guide l'IA sur la forme et les proportions de l'asset.
            </p>
          </div>
          <div className="space-y-2">
            <Label>LORE</Label>
            <Textarea
              value={newAssetLore}
              onChange={(e) => setNewAssetLore(e.target.value)}
              placeholder="Histoire, règles, pouvoirs ou limites de cet élément…"
              rows={2}
            />
          </div>
          <Button
            type="submit"
            disabled={createAssetMutation.isPending || !canCreateAsset}
            className={`w-full text-primary-foreground ${
              canCreateAsset
                ? "gradient-primary"
                : "bg-muted/60 cursor-not-allowed"
            }`}
          >
            {createAssetMutation.isPending
              ? "Création..."
              : !newAssetType
                ? "Choisir un type"
                : <>
                    {newAssetType === "character"
                      ? "Créer le personnage"
                      : newAssetType === "background"
                        ? "Créer le décor"
                        : "Créer l'objet"}
                    <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                      <Coins className="h-2.5 w-2.5" />1
                    </span>
                  </>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
