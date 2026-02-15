// Écran d'édition d'un chapitre visuel — double visualisation (Étape 2)
// Gauche : chapitre texte (scénario) avec Aperçu = surbrillance assets + hover. Droite : panels.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  LayoutPanelTop,
  Plus,
  ChevronDown,
  BookOpen,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScenarioTextHighlighter } from "@/components/project/ScenarioTextHighlighter";
import { useChapter, useUpdateChapter } from "@/hooks/useChapters";
import { useScenarioChapters, useScenarioChapter } from "@/hooks/useScenarioChapters";
import { useAssets } from "@/hooks/useAssets";
import type { Chapter, Panel } from "@/types";

const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 5000;

export default function ChapterDetail() {
  const { id: projectId, chapterId } = useParams<{ id: string; chapterId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: chapter, isLoading: loadingChapter } = useChapter(chapterId);
  const { data: scenarioChapters = [] } = useScenarioChapters(projectId);
  const updateChapter = useUpdateChapter(projectId ?? "");
  const { data: assets = [] } = useAssets(projectId);

  const [panels, setPanels] = useState<Panel[]>([]);
  const [loadingPanels, setLoadingPanels] = useState(true);
  const [selectedScenarioChapterId, setSelectedScenarioChapterId] = useState<
    string | null
  >(null);

  const displayedScenarioChapterId =
    chapter?.linked_scenario_chapter_id ?? selectedScenarioChapterId;

  const { data: scenarioChapter, isLoading: loadingScenario } = useScenarioChapter(
    displayedScenarioChapterId ?? undefined
  );

  useEffect(() => {
    if (!chapterId) return;
    supabase
      .from("panels")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("panel_number")
      .then(({ data }) => {
        setPanels((data as Panel[]) || []);
        setLoadingPanels(false);
      });
  }, [chapterId]);

  const handleSaveScenarioLink = () => {
    const idToSave = chapter?.linked_scenario_chapter_id ?? selectedScenarioChapterId;
    if (!chapterId || !idToSave) return;
    updateChapter.mutate(
      { id: chapterId, updates: { linked_scenario_chapter_id: idToSave } },
      {
        onSuccess: () => {
          toast({ title: "Lien enregistré" });
          setSelectedScenarioChapterId(null);
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

  const loading = loadingChapter || loadingPanels;
  const canSaveLink =
    (displayedScenarioChapterId &&
      displayedScenarioChapterId !== chapter?.linked_scenario_chapter_id) ||
    (selectedScenarioChapterId && !chapter?.linked_scenario_chapter_id);

  if (loading && !chapter) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!chapter) {
    return (
      <DashboardLayout>
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-muted-foreground">Chapitre introuvable.</p>
          <Button asChild variant="ghost" className="mt-4">
            <Link to={`/dashboard/projects/${projectId}?tab=edition`}>
              Retour au projet
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/dashboard/projects/${projectId}?tab=edition`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-display font-bold truncate">
              Chapitre {chapter.chapter_number} : {chapter.title}
            </h1>
            {chapter.synopsis && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {chapter.synopsis}
              </p>
            )}
          </div>
        </div>

        {/* Layout : Chapitre texte à gauche, Panels à droite */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Gauche : Panneau Scénario (chapitre texte avec Aperçu = surbrillance + hover assets) */}
          <div className="lg:w-[min(420px,45%)] lg:shrink-0">
            <Collapsible defaultOpen className="glass rounded-xl border border-border">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-4 text-left font-display font-semibold hover:bg-muted/50 rounded-t-xl transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Chapitre texte
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 data-[state=open]:rotate-180 transition-transform" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-3">
                  {scenarioChapters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun chapitre de scénario. Créez-en dans l'onglet{" "}
                      <strong>Scénario</strong> du projet.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Chapitre de scénario à afficher
                        </label>
                        <Select
                          value={displayedScenarioChapterId ?? ""}
                          onValueChange={(v) =>
                            setSelectedScenarioChapterId(v || null)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choisir un chapitre..." />
                          </SelectTrigger>
                          <SelectContent>
                            {scenarioChapters.map((sc) => (
                              <SelectItem key={sc.id} value={sc.id}>
                                Chapitre {sc.chapter_number} : {sc.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {displayedScenarioChapterId && (
                        <>
                          {loadingScenario ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Chargement...
                            </div>
                          ) : scenarioChapter?.content ? (
                            <div className="rounded-lg border border-border bg-background/80 p-4 min-h-[200px] max-h-[60vh] overflow-y-auto">
                              <ScenarioTextHighlighter
                                text={scenarioChapter.content}
                                assets={assets}
                              />
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic py-4">
                              Ce chapitre n'a pas encore de contenu.
                            </p>
                          )}
                          {canSaveLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-2"
                              onClick={handleSaveScenarioLink}
                              disabled={updateChapter.isPending}
                            >
                              {updateChapter.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Enregistrer ce lien
                            </Button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Droite : Panels */}
          <div className="flex-1 min-w-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              Chaque panel est une structure{" "}
              <strong>
                {PANEL_WIDTH}×{PANEL_HEIGHT}
              </strong>{" "}
              pixels (blocs, bulles, effets).
            </p>

            {scenarioChapter?.content && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">
                  Longueur du chapitre texte vs panels
                </p>
                <p>
                  Si, une fois découpé en panels, votre chapitre textuel est trop
                  court ou trop long pour un chapitre webtoon, vous pouvez
                  retourner dans l'onglet <strong>Scénario</strong> pour
                  allonger ou raccourcir le texte. À venir : estimation du nombre
                  de panels et répartition du contenu avec le chapitre suivant
                  (prendre des éléments du chapitre +1 ou lui en céder).
                </p>
              </div>
            )}

            {panels.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 py-12 px-4 text-center">
                <LayoutPanelTop className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-base font-medium text-muted-foreground">
                  Aucun panel
                </p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  La liste des panels sera créée à partir du découpage du chapitre
                  textuel (à venir).
                </p>
                <Button
                  disabled
                  variant="outline"
                  className="gap-1.5 mt-2 opacity-70"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un panel (bientôt)
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-display font-semibold">
                  Panels ({panels.length})
                </h2>
                <div className="space-y-4">
                  {panels.map((panel) => (
                    <div
                      key={panel.id}
                      className="glass rounded-xl overflow-hidden border border-border max-w-[720px]"
                    >
                      <div
                        className="w-full bg-muted/30 flex items-center justify-center text-muted-foreground text-sm"
                        style={{
                          aspectRatio: `${PANEL_WIDTH} / ${PANEL_HEIGHT}`,
                          maxHeight: 280,
                        }}
                      >
                        <span>
                          Panel {panel.panel_number} — {PANEL_WIDTH}×
                          {PANEL_HEIGHT}
                        </span>
                      </div>
                      {(panel.prompt || panel.image_url) && (
                        <div className="p-3 text-xs text-muted-foreground border-t border-border">
                          {panel.prompt && (
                            <p className="line-clamp-2">{panel.prompt}</p>
                          )}
                          {panel.image_url && (
                            <p className="mt-1">
                              Image générée (prévisualisation à venir)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
