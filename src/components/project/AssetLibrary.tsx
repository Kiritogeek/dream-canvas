import { useState, useEffect } from "react";
import { Users, MapPin, Box, Plus, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import * as scenarioService from "@/services/scenarioChapters";
import { AssetCard } from "./AssetCard";
import { CharacterViewDialog } from "./CharacterViewDialog";
import type { Asset, AssetType, AssetTabConfig, Project, ScenarioChapter } from "@/types";

const assetTabs: AssetTabConfig[] = [
  { type: "character", icon: Users, label: "Personnages" },
  { type: "background", icon: MapPin, label: "Décors" },
  { type: "object", icon: Box, label: "Objets" },
];

interface AssetLibraryProps {
  projectId: string;
  project: Project;
  assets: Asset[];
  generatingAssetId: string | null;
  generatingView: "profile_left" | "profile_right" | "back" | null;
  onCanGenerate: () => boolean;
  onGenerate: (asset: Asset, options?: { view?: "profile_left" | "profile_right" | "back" }) => void;
  /** Nom pré-rempli venant du scénario */
  pendingAssetName?: string;
  /** Type pré-rempli venant du scénario */
  pendingAssetType?: AssetType;
  /** Callback une fois le pending consommé */
  onPendingAssetConsumed?: () => void;
}

export function AssetLibrary({
  projectId,
  project,
  assets,
  generatingAssetId,
  generatingView,
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

  // Dialog nouvel asset
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [newAssetType, setNewAssetType] = useState<AssetType>("character");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetPrompt, setNewAssetPrompt] = useState("");
  const [activeAssetTab, setActiveAssetTab] = useState<AssetType>("character");

  // Ouvrir le dialog de création si un asset est demandé depuis le scénario
  useEffect(() => {
    if (pendingAssetName) {
      setNewAssetName(pendingAssetName);
      setNewAssetType(pendingAssetType || "character");
      setActiveAssetTab(pendingAssetType || "character");
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

  // Dialog édition asset
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrompt, setEditPrompt] = useState("");

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
    }
  }, [editTarget]);

  // Détecter ce qui a changé
  const nameChanged = editTarget ? editName.trim() !== editTarget.name : false;
  const promptChanged = editTarget ? editPrompt.trim() !== (editTarget.prompt ?? "") : false;
  const hasChanges = nameChanged || promptChanged;

  const canCreateAsset =
    newAssetName.trim().length > 0 && newAssetPrompt.trim().length > 0;

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
      const newAsset = await createAssetMutation.mutateAsync({
        project_id: projectId,
        name: nameTrim,
        asset_type: newAssetType,
        prompt: promptText,
      });

      setAssetDialogOpen(false);
      setNewAssetName("");
      setNewAssetPrompt("");

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

  const currentTabLabel = assetTabs.find((t) => t.type === activeAssetTab)?.label ?? "Assets";
  const libraryTitle =
    activeAssetTab === "object"
      ? "Bibliothèque d'objets"
      : `Bibliothèque de ${currentTabLabel.toLowerCase()}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-display font-semibold">
            {libraryTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Utile surtout pour les éléments récurrents de votre scénario.
          </p>
        </div>
        <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
          <Button
            size="sm"
            type="button"
            className="gradient-primary text-primary-foreground"
            onClick={() => {
              if (!onCanGenerate()) return;
              setNewAssetType(activeAssetTab);
              setAssetDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Ajouter
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
                <Label>Description / Prompt</Label>
                <Textarea
                  value={newAssetPrompt}
                  onChange={(e) => setNewAssetPrompt(e.target.value)}
                  placeholder="Décrivez l'asset pour la génération IA..."
                  rows={3}
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

      {/* Onglets par type */}
      <Tabs
        value={activeAssetTab}
        onValueChange={(value) => setActiveAssetTab(value as AssetType)}
      >
        <TabsList className="glass w-full sm:w-auto">
          {assetTabs.map((t) => (
            <TabsTrigger key={t.type} value={t.type} className="flex-1 sm:flex-none text-xs sm:text-sm">
              <t.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {assetTabs.map((t) => {
          const filtered = assets.filter((a) => a.asset_type === t.type);
          return (
            <TabsContent key={t.type} value={t.type}>
              {filtered.length === 0 ? (
                <div className="glass rounded-lg sm:rounded-xl p-6 sm:p-8 text-center">
                  <t.icon className="h-7 w-7 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-primary opacity-40" />
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Aucun {t.label.toLowerCase()} pour l'instant
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                  {filtered.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      isGenerating={generatingAssetId === asset.id}
                      onRegenerate={() => setRegenerateTarget(asset)}
                      onDelete={() => setDeleteTarget(asset)}
                      onEdit={() => setEditTarget(asset)}
                      onClick={
                        t.type === "character"
                          ? () => {
                              setSelectedCharacter(asset);
                              setCharacterViewDialogOpen(true);
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Dialog vues personnage */}
      <CharacterViewDialog
        open={characterViewDialogOpen}
        onOpenChange={(open) => {
          setCharacterViewDialogOpen(open);
          if (!open) setSelectedCharacter(null);
        }}
        character={selectedCharacter}
        generatingView={generatingView}
        onGenerateView={(asset, view) => onGenerate(asset, { view })}
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
              className="bg-amber-500 text-white hover:bg-amber-600"
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

          <div className="space-y-4 py-2">
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
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            {/* Cas 1 : Seul le nom a changé → un seul bouton "Sauvegarder" */}
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

            {/* Cas 2 : Le prompt a changé → deux boutons */}
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

      {/* Après renommage : proposer de mettre à jour le scénario */}
      <AlertDialog
        open={!!renameChaptersState}
        onOpenChange={(open) => !open && setRenameChaptersState(null)}
      >
        <AlertDialogContent>
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
