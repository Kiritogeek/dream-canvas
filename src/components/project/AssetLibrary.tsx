import { useState, useEffect, useMemo } from "react";
import { Users, MapPin, Box, Plus, Save, RefreshCw, Search, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateAsset, useDeleteAsset, useUpdateAsset } from "@/hooks/useAssets";
import { useUpdateScenarioChapter } from "@/hooks/useScenarioChapters";
import { useUserPlan } from "@/hooks/useUserPlan";
import * as scenarioService from "@/services/scenarioChapters";
import { AssetCard } from "./AssetCard";
import { CharacterViewDialog } from "./CharacterViewDialog";
import type { Asset, AssetType, AssetTabConfig, Project, ScenarioChapter } from "@/types";

type AssetWithLore = Asset & { lore?: string | null };

const assetTabs: AssetTabConfig[] = [
  { type: "character", icon: Users, label: "Personnages" },
  { type: "background", icon: MapPin, label: "Décors" },
  { type: "object", icon: Box, label: "Objets" },
];
const assetFilters = [
  { value: "all", label: "Tous" },
  { value: "character", label: "Personnages" },
  { value: "background", label: "Décors" },
  { value: "object", label: "Objets" },
] as const;

const TYPE_BADGE: Record<AssetType, { bg: string; label: string }> = {
  character: { bg: "bg-primary/70", label: "Perso" },
  background: { bg: "bg-mint/70", label: "Décor" },
  object: { bg: "bg-peach/70", label: "Objet" },
};

const ADD_BUTTON_LABEL: Record<(typeof assetFilters)[number]["value"], string> = {
  all: "Ajouter",
  character: "Ajouter un personnage",
  background: "Ajouter un décor",
  object: "Ajouter un objet",
};

interface AssetLibraryProps {
  projectId: string;
  project: Project;
  assets: Asset[];
  generatingAssetId: string | null;
  onCanGenerate: () => boolean;
  onGenerate: (asset: Asset) => void;
  /** Nom pré-rempli venant du scénario */
  pendingAssetName?: string;
  /** Type pré-rempli venant du scénario */
  pendingAssetType?: AssetType;
  /** Callback une fois le pending consommé */
  onPendingAssetConsumed?: () => void;
}

export function AssetLibrary({
  projectId,
  project: _project,
  assets,
  generatingAssetId,
  onCanGenerate,
  onGenerate,
  pendingAssetName,
  pendingAssetType,
  onPendingAssetConsumed,
}: AssetLibraryProps) {
  const { toast } = useToast();
  const createAssetMutation = useCreateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const updateAssetMutation = useUpdateAsset();
  const updateChapterMutation = useUpdateScenarioChapter();
  const { usageInfo } = useUserPlan();

  const [showAssetEducation, setShowAssetEducation] = useState(false);

  // Dialog nouvel asset
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [newAssetType, setNewAssetType] = useState<AssetType>("character");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetPrompt, setNewAssetPrompt] = useState("");
  const [newAssetLore, setNewAssetLore] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof assetFilters)[number]["value"]>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Ouvrir le dialog de création si un asset est demandé depuis le scénario
  useEffect(() => {
    if (pendingAssetName) {
      setNewAssetName(pendingAssetName);
      setNewAssetType(pendingAssetType || "character");
      setNewAssetPrompt("");
      setAssetDialogOpen(true);
      onPendingAssetConsumed?.();
    }
  }, [pendingAssetName, pendingAssetType, onPendingAssetConsumed]);

  // Dialog vues personnage
  const [characterViewDialogOpen, setCharacterViewDialogOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Asset | null>(null);

  // Dialog confirmation suppression
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  // Dialog confirmation régénération
  const [regenerateTarget, setRegenerateTarget] = useState<Asset | null>(null);

  // Lightbox preview image
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  // Dialog édition asset
  const [editTarget, setEditTarget] = useState<AssetWithLore | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editLore, setEditLore] = useState("");

  // Après renommage d'asset : proposer de mettre à jour le texte des chapitres
  const [renameChaptersState, setRenameChaptersState] = useState<{
    oldName: string;
    newName: string;
    chapters: ScenarioChapter[];
  } | null>(null);
  const [isUpdatingChapters, setIsUpdatingChapters] = useState(false);

  // Pré-remplir le dialog d'édition quand on sélectionne un asset
  useEffect(() => {
    if (editTarget) {
      setEditName(editTarget.name);
      setEditPrompt(editTarget.prompt ?? "");
      setEditLore(editTarget.lore ?? "");
    }
  }, [editTarget]);

  // Détecter ce qui a changé
  const nameChanged = editTarget ? editName.trim() !== editTarget.name : false;
  const promptChanged = editTarget ? editPrompt.trim() !== (editTarget.prompt ?? "") : false;
  const loreChanged = editTarget ? editLore.trim() !== (editTarget.lore ?? "") : false;
  const hasChanges = nameChanged || promptChanged || loreChanged;

  const canCreateAsset =
    newAssetName.trim().length > 0 && newAssetPrompt.trim().length > 0;

  // Type par défaut dans le dialog : si filtre actif, utiliser ce type
  const defaultNewAssetType: AssetType =
    activeFilter === "all" ? "character" : (activeFilter as AssetType);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const newAsset = await createAssetMutation.mutateAsync({
        project_id: projectId,
        name: nameTrim,
        asset_type: newAssetType,
        prompt: promptText,
        ...(loreText ? { lore: loreText } as Record<string, unknown> : {}),
      } as Parameters<typeof createAssetMutation.mutateAsync>[0]);

      setAssetDialogOpen(false);
      setNewAssetName("");
      setNewAssetPrompt("");
      setNewAssetLore("");

      // Lancer la génération automatiquement si prompt défini
      if (promptText) {
        onGenerate(newAsset);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteAsset = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAssetMutation.mutateAsync(deleteTarget);
      toast({ title: "Asset supprimé" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  /** Sauvegarder uniquement le nom (pas de régénération) */
  const handleSaveNameOnly = async () => {
    if (!editTarget) return;
    const oldName = editTarget.name.trim();
    const newName = editName.trim();
    const otherWithSameName = assets.some(
      (a) => a.id !== editTarget.id && (a.name ?? "").trim().toLowerCase() === newName.toLowerCase()
    );
    if (otherWithSameName) {
      toast({
        title: "Nom déjà utilisé",
        description: "Un autre asset porte déjà ce nom. Choisissez un nom unique pour chaque asset.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateAssetMutation.mutateAsync({
        id: editTarget.id,
        projectId,
        updates: {
          name: newName,
          ...(promptChanged ? { prompt: editPrompt.trim() || null } : {}),
          ...(loreChanged ? { lore: editLore.trim() || null } as Record<string, unknown> : {}),
        },
      });
      toast({ title: "Asset mis à jour", description: "Les modifications ont été sauvegardées." });
      setEditTarget(null);

      if (oldName !== newName) {
        const chapters = await scenarioService.fetchScenarioChapters(projectId);
        const affected = chapters.filter((ch) =>
          scenarioService.contentContainsAssetName(ch.content ?? "", oldName)
        );
        if (affected.length > 0) {
          setRenameChaptersState({ oldName, newName, chapters: affected });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  /** Sauvegarder le prompt et générer une nouvelle image (remplace l'existante) */
  const handleSaveAndRegenerate = async () => {
    if (!editTarget) return;
    const oldName = editTarget.name.trim();
    const newName = editName.trim();
    const otherWithSameName = assets.some(
      (a) => a.id !== editTarget.id && (a.name ?? "").trim().toLowerCase() === newName.toLowerCase()
    );
    if (otherWithSameName) {
      toast({
        title: "Nom déjà utilisé",
        description: "Un autre asset porte déjà ce nom. Choisissez un nom unique pour chaque asset.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateAssetMutation.mutateAsync({
        id: editTarget.id,
        projectId,
        updates: {
          name: newName,
          prompt: editPrompt.trim() || null,
          ...(loreChanged ? { lore: editLore.trim() || null } as Record<string, unknown> : {}),
        },
      });

      const updatedAsset: Asset = {
        ...editTarget,
        name: newName,
        prompt: editPrompt.trim() || null,
      };

      toast({
        title: "Prompt mis à jour",
        description: "Régénération de l'image en cours…",
      });
      setEditTarget(null);
      onGenerate(updatedAsset);

      if (oldName !== newName) {
        const chapters = await scenarioService.fetchScenarioChapters(projectId);
        const affected = chapters.filter((ch) =>
          scenarioService.contentContainsAssetName(ch.content ?? "", oldName)
        );
        if (affected.length > 0) {
          setRenameChaptersState({ oldName, newName, chapters: affected });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      const typeMatch = activeFilter === "all" ? true : asset.asset_type === activeFilter;
      const textMatch = q
        ? `${asset.name} ${asset.prompt ?? ""}`.toLowerCase().includes(q)
        : true;
      return typeMatch && textMatch;
    });
  }, [assets, activeFilter, searchQuery]);

  // Pill quota couleur
  const remaining = usageInfo.limit - usageInfo.count;
  const quotaColorClass =
    remaining === 0
      ? "text-destructive"
      : remaining < 5
        ? "text-amber-500"
        : "text-muted-foreground";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        {/* Compteur de quota */}
        <span className={`text-xs font-medium ${quotaColorClass}`}>
          {usageInfo.count} / {usageInfo.limit} générations ce mois
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAssetEducation(true)}
            className="gap-1.5 border-[hsl(var(--lavender)/0.3)] text-[hsl(var(--lavender))] hover:bg-[hsl(var(--lavender)/0.08)]"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Qu'est-ce qu'un asset ?</span>
          </Button>
          <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
            <Button
              size="sm"
              type="button"
              className="gradient-primary text-primary-foreground"
              onClick={() => {
                if (!onCanGenerate()) return;
                setNewAssetType(defaultNewAssetType);
                setAssetDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> {ADD_BUTTON_LABEL[activeFilter]}
            </Button>
          <DialogContent className="glass">
            <DialogHeader>
              <DialogTitle className="font-display">Nouvel asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
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
                <Label>
                  Description / Prompt{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={newAssetPrompt}
                  onChange={(e) => setNewAssetPrompt(e.target.value)}
                  placeholder="Décrivez l'asset pour la génération IA..."
                  rows={3}
                />
                {!newAssetPrompt.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Le prompt est requis pour générer l'image.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  LORE
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                    NarraMind
                  </span>
                </Label>
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
                  : newAssetType === "character"
                    ? "Créer le personnage"
                    : newAssetType === "background"
                      ? "Créer le décor"
                      : "Créer l'objet"}
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass rounded-xl p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un asset par nom ou prompt..."
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {assetFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                activeFilter === filter.value
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-background/40 text-foreground hover:bg-muted/60"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty states */}
      {assets.length === 0 ? (
        <div className="glass rounded-lg sm:rounded-xl p-6 sm:p-8 text-center space-y-3">
          <Plus className="h-7 w-7 sm:h-8 sm:w-8 mx-auto text-primary opacity-40" />
          <p className="text-muted-foreground text-xs sm:text-sm">
            Aucun asset créé pour ce projet.
          </p>
          <Button
            size="sm"
            className="gradient-primary text-primary-foreground"
            onClick={() => {
              if (!onCanGenerate()) return;
              setNewAssetType(defaultNewAssetType);
              setAssetDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Créer mon premier asset
          </Button>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="glass rounded-lg sm:rounded-xl p-6 sm:p-8 text-center">
          <Search className="h-7 w-7 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-primary opacity-40" />
          <p className="text-muted-foreground text-xs sm:text-sm">
            Aucun résultat pour cette recherche.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
          {filteredAssets.map((asset) => {
            const assetWithLore = asset as AssetWithLore;
            return (
              <div key={asset.id} className="relative">
                <AssetCard
                  asset={asset}
                  isGenerating={generatingAssetId === asset.id}
                  typeBadge={TYPE_BADGE[asset.asset_type]}
                  canGenerate={remaining > 0}
                  onRegenerate={() => setRegenerateTarget(asset)}
                  onDelete={() => setDeleteTarget(asset)}
                  onEdit={() => setEditTarget(assetWithLore)}
                  onImageClick={() => setPreviewAsset(asset)}
                  onClick={
                    asset.asset_type === "character"
                      ? () => {
                          setSelectedCharacter(asset);
                          setCharacterViewDialogOpen(true);
                        }
                      : undefined
                  }
                />
                {assetWithLore.lore && (
                  <span
                    className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 pointer-events-none"
                    title="Cet asset a un LORE NarraMind"
                  >
                    LORE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox preview image */}
      <Dialog open={!!previewAsset} onOpenChange={(open) => !open && setPreviewAsset(null)}>
        <DialogContent className="glass max-w-lg p-4">
          <DialogHeader>
            <DialogTitle className="font-display text-sm">{previewAsset?.name}</DialogTitle>
          </DialogHeader>
          {previewAsset?.image_url && (
            <img
              src={previewAsset.image_url}
              alt={previewAsset.name}
              className="w-full rounded-lg object-contain max-h-[70vh]"
              loading="lazy"
              decoding="async"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog vues personnage */}
      <CharacterViewDialog
        open={characterViewDialogOpen}
        onOpenChange={(open) => {
          setCharacterViewDialogOpen(open);
          if (!open) setSelectedCharacter(null);
        }}
        character={selectedCharacter}
      />

      {/* Confirmation suppression */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Supprimer l'asset
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{" "}
              <strong>{deleteTarget?.name}</strong> ? Cette action est
              irréversible et supprimera également les images associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAsset}
              disabled={deleteAssetMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAssetMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation régénération */}
      <AlertDialog
        open={!!regenerateTarget}
        onOpenChange={(open) => !open && setRegenerateTarget(null)}
      >
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Régénérer l'image
            </AlertDialogTitle>
            <AlertDialogDescription>
              L'image actuelle de <strong>{regenerateTarget?.name}</strong> sera
              remplacée par une nouvelle génération. Cette action consomme{" "}
              <strong>1 génération</strong> de votre quota mensuel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (regenerateTarget) onGenerate(regenerateTarget);
                setRegenerateTarget(null);
              }}
              className="gradient-primary text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Régénérer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog édition asset */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="glass sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              Modifier l'asset
            </DialogTitle>
            <DialogDescription>
              Modifiez le nom ou le prompt de <strong>{editTarget?.name}</strong>.
              Si le prompt change, vous pourrez choisir de régénérer l'image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto max-h-[55vh]">
            {/* Preview image actuelle */}
            {editTarget?.image_url && (
              <div className="flex gap-4 items-start">
                <img
                  src={editTarget.image_url}
                  alt={editTarget.name}
                  className="w-24 h-32 object-cover rounded-lg flex-shrink-0"
                  loading="lazy"
                  decoding="async"
                />
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nom</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nom de l'asset"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-prompt">Prompt / Description</Label>
                    <Textarea
                      id="edit-prompt"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Décrivez l'asset pour la génération IA..."
                      rows={3}
                    />
                    {promptChanged && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Le prompt a été modifié — vous pourrez choisir de régénérer l'image ou sauvegarder sans régénérer.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pas d'image existante — layout simple */}
            {!editTarget?.image_url && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nom</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nom de l'asset"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-prompt">Prompt / Description</Label>
                  <Textarea
                    id="edit-prompt"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Décrivez l'asset pour la génération IA..."
                    rows={4}
                  />
                  {promptChanged && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Le prompt a été modifié — vous pourrez choisir de régénérer l'image ou sauvegarder sans régénérer.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Champ LORE — commun aux deux layouts */}
            <div className="space-y-2">
              <Label htmlFor="edit-lore" className="flex items-center gap-2">
                LORE
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                  NarraMind
                </span>
              </Label>
              <Textarea
                id="edit-lore"
                value={editLore}
                onChange={(e) => setEditLore(e.target.value)}
                placeholder="Histoire, règles, pouvoirs ou limites de cet élément…"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            {!promptChanged && (
              <Button
                onClick={handleSaveNameOnly}
                disabled={!hasChanges || !editName.trim() || updateAssetMutation.isPending}
                className="gradient-primary text-primary-foreground w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {updateAssetMutation.isPending ? "Sauvegarde…" : "Sauvegarder"}
              </Button>
            )}

            {promptChanged && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveNameOnly}
                  disabled={!editName.trim() || updateAssetMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  Sauvegarder sans régénérer
                </Button>
                <Button
                  onClick={handleSaveAndRegenerate}
                  disabled={!editName.trim() || !editPrompt.trim() || updateAssetMutation.isPending}
                  className="gradient-primary text-primary-foreground w-full sm:w-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Sauvegarder et régénérer
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssetEducation} onOpenChange={setShowAssetEducation}>
        <DialogContent className="glass max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <HelpCircle className="h-5 w-5 text-[hsl(var(--lavender))]" />
              Qu'est-ce qu'un asset ?
            </DialogTitle>
            <DialogDescription>
              Comprendre le rôle des assets pour créer un webtoon cohérent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-foreground">
            <div className="rounded-xl border border-[hsl(var(--lavender)/0.2)] bg-[hsl(var(--lavender)/0.06)] p-4 space-y-2">
              <p className="font-semibold text-[hsl(var(--lavender))]">Un asset = une référence visuelle</p>
              <p className="text-muted-foreground leading-relaxed">
                Un asset est un élément visuel de votre histoire — personnage, décor ou objet.
                Il sert de <strong className="text-foreground">référence exacte</strong> à l'IA lors de la génération
                de vos panels : sans asset, l'IA invente librement. Avec un asset, elle reproduit
                fidèlement l'élément d'une image à l'autre.
              </p>
            </div>

            <div className="space-y-3">
              <p className="font-semibold">Bonnes pratiques</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-[hsl(var(--lavender)/0.2)] flex items-center justify-center text-[10px] font-bold text-[hsl(var(--lavender))]">1</span>
                  <span>Créez un asset pour <strong className="text-foreground">chaque élément récurrent</strong> de votre histoire (héros, antagoniste, lieu principal, objet-clé).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-[hsl(var(--lavender)/0.2)] flex items-center justify-center text-[10px] font-bold text-[hsl(var(--lavender))]">2</span>
                  <span>Mentionnez le <strong className="text-foreground">nom exact</strong> de chaque asset dans votre scénario. L'IA le détecte automatiquement et l'utilise comme référence lors de la génération.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-[hsl(var(--lavender)/0.2)] flex items-center justify-center text-[10px] font-bold text-[hsl(var(--lavender))]">3</span>
                  <span>Un asset mentionné dans le scénario est <strong className="text-foreground">surligné</strong> dans l'éditeur — c'est votre indicateur que l'IA le prendra en compte.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-[hsl(var(--peach)/0.3)] bg-[hsl(var(--peach)/0.06)] p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Exemple :</strong> Si vous créez un asset « Yuki » (personnage) et écrivez « Yuki entre dans la pièce » dans votre scénario, l'IA utilisera automatiquement la référence visuelle de Yuki lors de la génération du panel correspondant.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Après renommage : proposer de mettre à jour le scénario */}
      <AlertDialog
        open={!!renameChaptersState}
        onOpenChange={(open) => !open && setRenameChaptersState(null)}
      >
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Mettre à jour le scénario ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;ancien nom <strong>« {renameChaptersState?.oldName} »</strong> apparaît dans{" "}
              {renameChaptersState?.chapters.length} chapitre(s). Souhaitez-vous le remplacer par{" "}
              <strong>« {renameChaptersState?.newName} »</strong> dans le texte de ces chapitres ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRenameChaptersState(null)}>
              Plus tard
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdatingChapters}
              onClick={async () => {
                if (!renameChaptersState) return;
                const { oldName, newName, chapters } = renameChaptersState;
                setIsUpdatingChapters(true);
                try {
                  for (const ch of chapters) {
                    const newContent = scenarioService.replaceAssetNameInContent(
                      ch.content ?? "",
                      oldName,
                      newName
                    );
                    await updateChapterMutation.mutateAsync({
                      id: ch.id,
                      projectId,
                      updates: { content: newContent },
                    });
                  }
                  toast({
                    title: "Scénario mis à jour",
                    description: `« ${oldName} » remplacé par « ${newName} » dans ${chapters.length} chapitre(s).`,
                  });
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "Erreur";
                  toast({ title: "Erreur", description: msg, variant: "destructive" });
                } finally {
                  setIsUpdatingChapters(false);
                  setRenameChaptersState(null);
                }
              }}
            >
              {isUpdatingChapters ? "Mise à jour…" : "Appliquer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
