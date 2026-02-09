import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, MapPin, Box, Palette, BookOpen, Plus, Sparkles, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

type AssetType = "character" | "background" | "object";

interface Asset {
  id: string;
  name: string;
  asset_type: AssetType;
  prompt: string | null;
  image_url: string | null;
  created_at: string;
}

interface Chapter {
  id: string;
  title: string;
  synopsis: string | null;
  chapter_number: number;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  style_template: string | null;
}

const assetTabs: { type: AssetType; icon: typeof Users; label: string }[] = [
  { type: "character", icon: Users, label: "Personnages" },
  { type: "background", icon: MapPin, label: "Décors" },
  { type: "object", icon: Box, label: "Objets" },
];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [styleTemplate, setStyleTemplate] = useState("");
  const [savingStyle, setSavingStyle] = useState(false);

  // New asset dialog
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [newAssetType, setNewAssetType] = useState<AssetType>("character");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetPrompt, setNewAssetPrompt] = useState("");
  const [creatingAsset, setCreatingAsset] = useState(false);

  // New chapter dialog
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterSynopsis, setNewChapterSynopsis] = useState("");
  const [creatingChapter, setCreatingChapter] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("assets").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("chapters").select("*").eq("project_id", id).order("chapter_number"),
    ]).then(([pRes, aRes, cRes]) => {
      setProject(pRes.data);
      setStyleTemplate(pRes.data?.style_template || "");
      setAssets(aRes.data || []);
      setChapters(cRes.data || []);
      setLoading(false);
    });
  }, [user, id]);

  const saveStyle = async () => {
    if (!id) return;
    setSavingStyle(true);
    await supabase.from("projects").update({ style_template: styleTemplate }).eq("id", id);
    toast({ title: "Style sauvegardé !" });
    setSavingStyle(false);
  };

  const createAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setCreatingAsset(true);
    const { data, error } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        project_id: id,
        name: newAssetName.trim(),
        asset_type: newAssetType,
        prompt: newAssetPrompt.trim() || null,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else if (data) {
      setAssets((prev) => [data as Asset, ...prev]);
      setAssetDialogOpen(false);
      setNewAssetName("");
      setNewAssetPrompt("");
    }
    setCreatingAsset(false);
  };

  const createChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setCreatingChapter(true);
    const nextNum = chapters.length + 1;
    const { data, error } = await supabase
      .from("chapters")
      .insert({
        user_id: user.id,
        project_id: id,
        title: newChapterTitle.trim(),
        synopsis: newChapterSynopsis.trim() || null,
        chapter_number: nextNum,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else if (data) {
      setChapters((prev) => [...prev, data as Chapter]);
      setChapterDialogOpen(false);
      setNewChapterTitle("");
      setNewChapterSynopsis("");
    }
    setCreatingChapter(false);
  };

  const deleteAsset = async (assetId: string) => {
    await supabase.from("assets").delete().eq("id", assetId);
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-xl h-32 animate-pulse" />)}
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
            <Link to="/dashboard/projects">Retour</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/projects"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">{project.title}</h1>
            {project.description && <p className="text-muted-foreground text-sm">{project.description}</p>}
          </div>
        </div>

        <Tabs defaultValue="assets" className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="assets">🎨 Assets</TabsTrigger>
            <TabsTrigger value="style">🖌️ Style</TabsTrigger>
            <TabsTrigger value="chapters">📖 Chapitres</TabsTrigger>
          </TabsList>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">Bibliothèque d'assets</h2>
              <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-primary text-primary-foreground">
                    <Plus className="h-4 w-4 mr-1" /> Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass">
                  <DialogHeader>
                    <DialogTitle className="font-display">Nouvel asset</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={createAsset} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <div className="flex gap-2">
                        {assetTabs.map((t) => (
                          <Button
                            key={t.type}
                            type="button"
                            size="sm"
                            variant={newAssetType === t.type ? "default" : "outline"}
                            onClick={() => setNewAssetType(t.type)}
                            className={newAssetType === t.type ? "gradient-primary text-primary-foreground" : ""}
                          >
                            <t.icon className="h-4 w-4 mr-1" /> {t.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)} placeholder="Ex: Héros principal" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Description / Prompt</Label>
                      <Textarea value={newAssetPrompt} onChange={(e) => setNewAssetPrompt(e.target.value)} placeholder="Décrivez l'asset pour la génération IA..." rows={3} />
                    </div>
                    <Button type="submit" disabled={creatingAsset} className="w-full gradient-primary text-primary-foreground">
                      {creatingAsset ? "Création..." : "Créer l'asset"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="character">
              <TabsList className="glass">
                {assetTabs.map((t) => (
                  <TabsTrigger key={t.type} value={t.type}>
                    <t.icon className="h-4 w-4 mr-1" /> {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {assetTabs.map((t) => (
                <TabsContent key={t.type} value={t.type}>
                  {assets.filter((a) => a.asset_type === t.type).length === 0 ? (
                    <div className="glass rounded-xl p-8 text-center">
                      <t.icon className="h-8 w-8 mx-auto mb-3 text-primary opacity-40" />
                      <p className="text-muted-foreground text-sm">Aucun {t.label.toLowerCase()} pour l'instant</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {assets.filter((a) => a.asset_type === t.type).map((asset) => (
                        <motion.div
                          key={asset.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="glass rounded-xl p-4 group relative"
                        >
                          {asset.image_url ? (
                            <img src={asset.image_url} alt={asset.name} className="w-full aspect-[2/3] object-cover rounded-lg mb-3" />
                          ) : (
                            <div className="w-full aspect-[2/3] rounded-lg mb-3 gradient-dream flex items-center justify-center">
                              <Sparkles className="h-8 w-8 text-primary opacity-40" />
                            </div>
                          )}
                          <h4 className="font-display font-semibold text-sm">{asset.name}</h4>
                          {asset.prompt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{asset.prompt}</p>}
                          <button
                            onClick={() => deleteAsset(asset.id)}
                            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-4">
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-display font-semibold">Template de style</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Définissez un style visuel qui sera appliqué à toutes vos générations d'images pour garder un look cohérent.
              </p>
              <Textarea
                value={styleTemplate}
                onChange={(e) => setStyleTemplate(e.target.value)}
                placeholder="Ex: style manga shonen, couleurs vives, traits fins, ombres douces, palette pastel..."
                rows={4}
              />
              <Button onClick={saveStyle} disabled={savingStyle} className="gradient-primary text-primary-foreground">
                {savingStyle ? "Sauvegarde..." : "Sauvegarder le style"}
              </Button>
            </div>
          </TabsContent>

          {/* Chapters Tab */}
          <TabsContent value="chapters" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">Chapitres</h2>
              <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-primary text-primary-foreground">
                    <Plus className="h-4 w-4 mr-1" /> Nouveau chapitre
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass">
                  <DialogHeader>
                    <DialogTitle className="font-display">Nouveau chapitre</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={createChapter} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Titre</Label>
                      <Input value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="Chapitre 1: Le début" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Synopsis</Label>
                      <Textarea value={newChapterSynopsis} onChange={(e) => setNewChapterSynopsis(e.target.value)} placeholder="Résumez l'action de ce chapitre..." rows={4} />
                    </div>
                    <Button type="submit" disabled={creatingChapter} className="w-full gradient-primary text-primary-foreground">
                      {creatingChapter ? "Création..." : "Créer le chapitre"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {chapters.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-primary opacity-40" />
                <p className="text-muted-foreground">Aucun chapitre. Commencez à écrire votre histoire !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.map((ch, i) => (
                  <motion.div
                    key={ch.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={`/dashboard/projects/${id}/chapters/${ch.id}`}
                      className="block glass rounded-xl p-5 hover:shadow-dream transition-shadow group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
                          {ch.chapter_number}
                        </div>
                        <div>
                          <h3 className="font-display font-semibold group-hover:text-primary transition-colors">{ch.title}</h3>
                          {ch.synopsis && <p className="text-sm text-muted-foreground line-clamp-1">{ch.synopsis}</p>}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
