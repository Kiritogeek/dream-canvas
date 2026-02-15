// Écran d'édition d'un chapitre visuel — shell (Étape 1)
// Chaque panel = structure 720×5000 (blocs, bulles, effets). Pas encore de génération ni double visualisation.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, LayoutPanelTop, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import type { Chapter, Panel } from "@/types";

const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 5000;

export default function ChapterDetail() {
  const { id: projectId, chapterId } = useParams<{ id: string; chapterId: string }>();
  const { user } = useAuth();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !chapterId) return;
    Promise.all([
      supabase.from("chapters").select("*").eq("id", chapterId).maybeSingle(),
      supabase.from("panels").select("*").eq("chapter_id", chapterId).order("panel_number"),
    ]).then(([cRes, pRes]) => {
      setChapter(cRes.data as Chapter | null);
      setPanels((pRes.data as Panel[]) || []);
      setLoading(false);
    });
  }, [user, chapterId]);

  if (loading) {
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
            <Link to={`/dashboard/projects/${projectId}?tab=edition`}>Retour au projet</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/dashboard/projects/${projectId}?tab=edition`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold">
              Chapitre {chapter.chapter_number} : {chapter.title}
            </h1>
            {chapter.synopsis && (
              <p className="text-sm text-muted-foreground">{chapter.synopsis}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Chaque panel est une structure <strong>{PANEL_WIDTH}×{PANEL_HEIGHT}</strong> pixels
          (blocs, bulles, effets). Le découpage du chapitre textuel en panels et la
          génération d’images seront disponibles dans les prochaines étapes.
        </p>

        {panels.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 py-12 px-4 text-center">
            <LayoutPanelTop className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-base font-medium text-muted-foreground">
              Aucun panel
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              La liste des panels sera créée à partir du découpage du chapitre
              textuel (lien Scénario ↔ Édition de l’œuvre, à venir).
            </p>
            <Button disabled variant="outline" className="gap-1.5 mt-2 opacity-70">
              <Plus className="h-3.5 w-3.5" />
              Ajouter un panel (bientôt)
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-display font-semibold">
              Panels ({panels.length})
            </h2>
            <div className="space-y-4 max-w-[720px] mx-auto">
              {panels.map((panel) => (
                <div
                  key={panel.id}
                  className="glass rounded-xl overflow-hidden border border-border"
                >
                  <div
                    className="w-full bg-muted/30 flex items-center justify-center text-muted-foreground text-sm"
                    style={{
                      aspectRatio: `${PANEL_WIDTH} / ${PANEL_HEIGHT}`,
                      maxHeight: 280,
                    }}
                  >
                    <span>
                      Panel {panel.panel_number} — {PANEL_WIDTH}×{PANEL_HEIGHT}
                    </span>
                  </div>
                  {(panel.prompt || panel.image_url) && (
                    <div className="p-3 text-xs text-muted-foreground border-t border-border">
                      {panel.prompt && <p className="line-clamp-2">{panel.prompt}</p>}
                      {panel.image_url && (
                        <p className="mt-1">Image générée (prévisualisation à venir)</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
