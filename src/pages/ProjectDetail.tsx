import { useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import { useAssets } from "@/hooks/useAssets";
import { useAssetGeneration } from "@/hooks/useAssetGeneration";
import { useUserPlan } from "@/hooks/useUserPlan";
import DashboardLayout from "@/components/DashboardLayout";
import { AssetLibrary } from "@/components/project/AssetLibrary";
import { StyleManager } from "@/components/project/StyleManager";
import { ScenarioSection } from "@/components/project/ScenarioSection";
import { EditionSection } from "@/components/project/EditionSection";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: project, isLoading: loadingProject } = useProject(id);
  const { data: assets = [], isLoading: loadingAssets } = useAssets(id);
  const updateProject = useUpdateProject();
  const { plan: userPlan } = useUserPlan();

  /**
   * Brouillon édité dans l'onglet Style. `undefined` = utiliser le template serveur du projet.
   * Évite la course au1er rendu : un state initial "" puis un effet qui copiait la BDD
   * écrasait la synchro du StyleManager (carrousel resté sur Manga alors que le texte
   * envoyé à la génération était encore Webtoon).
   */
  const [styleDraft, setStyleDraft] = useState<string | undefined>(undefined);

  useEffect(() => {
    setStyleDraft(undefined);
  }, [project?.id]);

  const styleTemplate =
    styleDraft ?? project?.style_template ?? "";

  // Hook de génération d'images
  const { generatingAssetId, generatingView, canGenerate, generate } =
    useAssetGeneration({ project: project ?? null, userPlan });

  // Onglet actif (contrôlé) — initialiser depuis l'URL si ?tab=edition
  const [searchParams] = useSearchParams();
  const resolveTabFromUrl = useCallback(() => {
    const tab = searchParams.get("tab");
    if (tab === "style" || tab === "assets" || tab === "scenario" || tab === "edition") {
      return tab;
    }
    return "style";
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState(resolveTabFromUrl);
  const projectSteps = [
    { key: "style", label: "Style" },
    { key: "assets", label: "Assets" },
    { key: "scenario", label: "Scénario" },
    { key: "edition", label: "Édition de l'œuvre" },
  ] as const;
  const stepNavigationCard = (
    <div className="glass rounded-xl p-3 sm:p-4 space-y-2">
      <Button asChild variant="outline" className="w-full justify-start">
        <Link to="/dashboard">
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Tableau de bord
        </Link>
      </Button>
      <div className="pt-2">
        <p className="text-sm font-semibold text-foreground mb-2">Étapes du projet</p>
        <div className="space-y-1.5">
          {projectSteps.map((step) => {
            const isActive = activeTab === step.key;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setActiveTab(step.key)}
                className={`w-full text-left rounded-xl px-4 py-3 text-base font-semibold transition-colors border-2 ${
                  isActive
                    ? "border-primary bg-primary/15 text-foreground shadow-dream"
                    : "border-border/70 bg-background/40 hover:bg-muted/60 text-foreground"
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    setActiveTab(resolveTabFromUrl());
  }, [resolveTabFromUrl]);

  // Pré-remplissage création d'asset depuis le scénario
  const [pendingAssetName, setPendingAssetName] = useState("");
  const [pendingAssetType, setPendingAssetType] = useState<"character" | "background" | "object">("character");

  const handleNavigateToCreateAsset = useCallback(
    (name: string, type: "character" | "background" | "object") => {
      setPendingAssetName(name);
      setPendingAssetType(type);
      setActiveTab("assets");
    },
    []
  );

  // Dialog édition de projet
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPanelsTarget, setEditPanelsTarget] = useState("");

  const openEditDialog = () => {
    if (!project) return;
    setEditTitle(project.title);
    setEditDescription(project.description || "");
    setEditPanelsTarget(project.panels_target_per_chapter != null ? String(project.panels_target_per_chapter) : "");
    setEditDialogOpen(true);
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editTitle.trim()) return;
    const panelsTarget = editPanelsTarget.trim();
    const panelsTargetNum = panelsTarget === "" ? null : Math.max(1, Math.min(99, parseInt(panelsTarget, 10) || 10));
    updateProject.mutate(
      {
        id,
        updates: {
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          panels_target_per_chapter: panelsTargetNum,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Projet mis à jour !" });
          setEditDialogOpen(false);
        },
        onError: (err) =>
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  };

  const loading = loadingProject || loadingAssets;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-muted-foreground">Projet introuvable.</p>
          <Button asChild variant="ghost" className="mt-4">
            <Link to="/dashboard/projects">Retour aux projets</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start sm:items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" asChild className="shrink-0 mt-1 sm:mt-0">
            <Link to="/dashboard/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-display font-bold truncate">
                {project.title}
              </h1>
              <button
                onClick={openEditDialog}
                className="p-1 rounded-md text-muted-foreground hover:text-primary transition-colors shrink-0"
                title="Modifier le projet"
              >
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
            {project.description && (
              <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <aside className="hidden lg:block fixed left-4 top-24 w-[260px] z-40 h-fit">
            {stepNavigationCard}
          </aside>
          <aside className="mb-6 lg:hidden">{stepNavigationCard}</aside>

          <div className="min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Style Tab */}
              <TabsContent value="style">
                <StyleManager
                  project={project}
                  styleTemplate={styleTemplate}
                  onStyleTemplateChange={setStyleDraft}
                  onStyleSaveSuccess={() => setStyleDraft(undefined)}
                  onStyleValidated={() => setActiveTab("assets")}
                  userPlan={userPlan}
                />
              </TabsContent>

          {/* Assets Tab */}
              <TabsContent value="assets">
                <AssetLibrary
                  projectId={project.id}
                  project={project}
                  assets={assets}
                  generatingAssetId={generatingAssetId}
                  generatingView={generatingView}
                  onCanGenerate={canGenerate}
                  onGenerate={(asset, opts) => generate(asset, opts)}
                  pendingAssetName={pendingAssetName}
                  pendingAssetType={pendingAssetType}
                  onPendingAssetConsumed={() => setPendingAssetName("")}
                />
              </TabsContent>

          {/* Scénario Tab */}
              <TabsContent value="scenario">
                <ScenarioSection
                  projectId={project.id}
                  project={project}
                  onNavigateToCreateAsset={handleNavigateToCreateAsset}
                />
              </TabsContent>

          {/* Édition de l'œuvre Tab */}
              <TabsContent value="edition">
                <EditionSection projectId={project.id} project={project} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialog édition projet */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">
              Modifier le projet
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="De quoi parle votre histoire ?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Panels cible par chapitre (optionnel)</Label>
              <Input
                type="number"
                min={1}
                max={99}
                value={editPanelsTarget}
                onChange={(e) => setEditPanelsTarget(e.target.value)}
                placeholder="ex. 10"
              />
              <p className="text-xs text-muted-foreground">
                Référence pour comparer à l’estimation du découpage (indicatif).
              </p>
            </div>
            <Button
              type="submit"
              disabled={updateProject.isPending}
              className="w-full gradient-primary text-primary-foreground"
            >
              {updateProject.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
