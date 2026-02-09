import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

interface Panel {
  id: string;
  panel_number: number;
  prompt: string | null;
  image_url: string | null;
  dialogue: string | null;
  narration: string | null;
}

interface Chapter {
  id: string;
  title: string;
  synopsis: string | null;
  chapter_number: number;
  project_id: string;
}

export default function ChapterDetail() {
  const { id: projectId, chapterId } = useParams<{ id: string; chapterId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  useEffect(() => {
    if (!user || !chapterId) return;
    Promise.all([
      supabase.from("chapters").select("*").eq("id", chapterId).maybeSingle(),
      supabase.from("panels").select("*").eq("chapter_id", chapterId).order("panel_number"),
    ]).then(([cRes, pRes]) => {
      setChapter(cRes.data);
      setPanels(pRes.data || []);
      setLoading(false);
    });
  }, [user, chapterId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-xl h-48 animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  if (!chapter) {
    return (
      <DashboardLayout>
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-muted-foreground">Chapitre introuvable.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/dashboard/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold">
              Chapitre {chapter.chapter_number}: {chapter.title}
            </h1>
            {chapter.synopsis && <p className="text-sm text-muted-foreground">{chapter.synopsis}</p>}
          </div>
        </div>

        {/* Info banner */}
        <div className="glass rounded-xl p-6 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
          <h3 className="font-display font-semibold mb-2">Génération de panels</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            La génération IA de panels sera bientôt disponible. Vous pourrez générer 10 à 20 panels verticaux (800×1200px) à partir de votre synopsis.
          </p>
          <Button disabled className="gradient-primary text-primary-foreground opacity-70">
            <Sparkles className="h-4 w-4 mr-2" />
            Générer les panels (bientôt)
          </Button>
        </div>

        {/* Panels reader */}
        {panels.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-display font-semibold">Prévisualisation</h2>
            <div className="max-w-[800px] mx-auto space-y-2">
              {panels.map((panel) => (
                <motion.div
                  key={panel.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="cursor-pointer group relative"
                  onClick={() => {
                    setSelectedPanel(panel);
                    setEditPrompt(panel.prompt || "");
                  }}
                >
                  {panel.image_url ? (
                    <img
                      src={panel.image_url}
                      alt={`Panel ${panel.panel_number}`}
                      className="w-full rounded-lg"
                      style={{ aspectRatio: "800/1200" }}
                    />
                  ) : (
                    <div
                      className="w-full rounded-lg gradient-dream flex items-center justify-center"
                      style={{ aspectRatio: "800/1200" }}
                    >
                      <span className="text-muted-foreground font-display">Panel {panel.panel_number}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-lg bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <RefreshCw className="h-8 w-8 text-primary-foreground drop-shadow-lg" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Edit panel dialog */}
        <Dialog open={!!selectedPanel} onOpenChange={() => setSelectedPanel(null)}>
          <DialogContent className="glass">
            <DialogHeader>
              <DialogTitle className="font-display">
                Modifier le panel {selectedPanel?.panel_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Nouveau prompt pour régénérer ce panel..."
                rows={4}
              />
              <Button disabled className="w-full gradient-primary text-primary-foreground opacity-70">
                <RefreshCw className="h-4 w-4 mr-2" />
                Régénérer (bientôt)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
