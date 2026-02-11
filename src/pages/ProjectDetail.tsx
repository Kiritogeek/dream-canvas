import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, MapPin, Box, Palette, BookOpen, Plus, Sparkles, ArrowLeft, Trash2, ImagePlus, RefreshCw } from "lucide-react";
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
  image_url_profile_left?: string | null;
  image_url_profile_right?: string | null;
  image_url_back?: string | null;
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
  style_image_urls: string[];
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
  const [styleImageUploading, setStyleImageUploading] = useState(false);
  const styleFileInputRef = useRef<HTMLInputElement>(null);

  // New asset dialog
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [newAssetType, setNewAssetType] = useState<AssetType>("character");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetPrompt, setNewAssetPrompt] = useState("");
  const [creatingAsset, setCreatingAsset] = useState(false);
  const canCreateAsset = newAssetName.trim().length > 0 && newAssetPrompt.trim().length > 0;
  const [generatingAssetId, setGeneratingAssetId] = useState<string | null>(null);

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
    if (project) setProject({ ...project, style_template: styleTemplate });
    toast({ title: "Style sauvegardé !" });
    setSavingStyle(false);
  };

  const styleImageUrls = project?.style_image_urls ?? [];

  const addStyleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/") || !user || !id || !project) return;
    e.target.value = "";
    setStyleImageUploading(true);
    const path = `${user.id}/projects/${id}/style/${crypto.randomUUID()}.${file.name.split(".").pop() || "png"}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("dreamweave")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) {
      toast({ title: "Erreur", description: uploadError.message, variant: "destructive" });
      setStyleImageUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("dreamweave").getPublicUrl(uploadData.path);
    const newUrls = [...styleImageUrls, urlData.publicUrl];
    const { error: updateError } = await supabase.from("projects").update({ style_image_urls: newUrls }).eq("id", id);
    if (updateError) {
      toast({ title: "Erreur", description: updateError.message, variant: "destructive" });
    } else {
      setProject({ ...project, style_image_urls: newUrls });
      toast({ title: "Image de référence ajoutée" });
    }
    setStyleImageUploading(false);
  };

  const removeStyleImage = async (url: string) => {
    if (!id || !project) return;
    const newUrls = styleImageUrls.filter((u) => u !== url);
    const { error } = await supabase.from("projects").update({ style_image_urls: newUrls }).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setProject({ ...project, style_image_urls: newUrls });
    }
  };

  const createAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setCreatingAsset(true);
    const promptText = newAssetPrompt.trim() || null;
    const { data, error } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        project_id: id,
        name: newAssetName.trim(),
        asset_type: newAssetType,
        prompt: promptText,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setCreatingAsset(false);
      return;
    }
    const newAsset = data as Asset;
    setAssets((prev) => [newAsset, ...prev]);
    setAssetDialogOpen(false);
    setNewAssetName("");
    setNewAssetPrompt("");
    setCreatingAsset(false);

    if (promptText) {
      const currentStyleText = styleTemplate?.trim() || project?.style_template?.trim();
      const hasStyleText = !!currentStyleText;
      const hasStyleImages = Array.isArray(project?.style_image_urls) && project.style_image_urls.length > 0;
      if (!hasStyleText && !hasStyleImages) {
        toast({
          title: "Style requis",
          description: "Définissez un style dans l’onglet Style du projet (texte et/ou images de référence) avant de générer.",
          variant: "destructive",
        });
        return;
      }

      setGeneratingAssetId(newAsset.id);
      toast({ title: "Génération en cours…", description: "L'image est créée par l'IA." });
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-asset-image`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
        },
        body: JSON.stringify({
          asset_id: newAsset.id,
          prompt: promptText,
          style_template: currentStyleText || undefined,
          style_image_urls: (project?.style_image_urls?.length ? project.style_image_urls : undefined),
          asset_type: newAssetType,
        }),
      });
      const resBody = await res.json().catch(() => ({}));
      setGeneratingAssetId(null);
      if (!res.ok) {
        const msg = resBody?.details ?? resBody?.error ?? res.statusText;
        toast({
          title: "Génération échouée",
          description: typeof msg === "string" ? msg : JSON.stringify(msg),
          variant: "destructive",
        });
        return;
      }
      const imageUrl = resBody?.image_url;
      const updateField = resBody?.update_field ?? "image_url";
      if (imageUrl) {
        setAssets((prev) =>
          prev.map((a) => (a.id === newAsset.id ? { ...a, [updateField]: imageUrl } : a))
        );
        toast({ title: "Image générée !" });
      }
    }
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

  const regenerateAssetImage = async (asset: Asset) => {
    const promptText = asset.prompt?.trim();
    if (!promptText) {
      toast({ title: "Impossible", description: "Cet asset n’a pas de prompt.", variant: "destructive" });
      return;
    }
    const currentStyleText = styleTemplate?.trim() || project?.style_template?.trim();
    const hasStyleText = !!currentStyleText;
    const hasStyleImages = Array.isArray(project?.style_image_urls) && (project?.style_image_urls?.length > 0);
    if (!hasStyleText && !hasStyleImages) {
      toast({
        title: "Style requis",
        description: "Définissez un style dans l’onglet Style (texte et/ou images) avant de régénérer.",
        variant: "destructive",
      });
      return;
    }
    setGeneratingAssetId(asset.id);
    toast({ title: "Régénération…", description: "L’image est recréée avec le style du projet." });
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-asset-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      },
      body: JSON.stringify({
        asset_id: asset.id,
        prompt: promptText,
        style_template: currentStyleText || undefined,
        style_image_urls: (project?.style_image_urls?.length ? project.style_image_urls : undefined),
        asset_type: asset.asset_type,
      }),
    });
    const resBody = await res.json().catch(() => ({}));
    setGeneratingAssetId(null);
    if (!res.ok) {
      const msg = resBody?.details ?? resBody?.error ?? res.statusText;
      toast({
        title: "Régénération échouée",
        description: typeof msg === "string" ? msg : JSON.stringify(msg),
        variant: "destructive",
      });
      return;
    }
    const imageUrl = resBody?.image_url;
    const updateField = resBody?.update_field ?? "image_url";
    if (imageUrl) {
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, [updateField]: imageUrl } : a))
      );
      toast({ title: "Image régénérée avec le style du projet !" });
    }
  };

  const [characterViewDialogOpen, setCharacterViewDialogOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Asset | null>(null);
  const [generatingView, setGeneratingView] = useState<"profile_left" | "profile_right" | "back" | null>(null);

  const generateCharacterView = async (asset: Asset, view: "profile_left" | "profile_right" | "back") => {
    const promptText = asset.prompt?.trim();
    if (!promptText) {
      toast({ title: "Impossible", description: "Cet asset n’a pas de prompt.", variant: "destructive" });
      return;
    }
    const currentStyleText = styleTemplate?.trim() || project?.style_template?.trim();
    const hasStyleText = !!currentStyleText;
    const hasStyleImages = Array.isArray(project?.style_image_urls) && (project?.style_image_urls?.length > 0);
    if (!hasStyleText && !hasStyleImages) {
      toast({
        title: "Style requis",
        description: "Définissez un style dans l’onglet Style avant de générer une vue.",
        variant: "destructive",
      });
      return;
    }
    setGeneratingView(view);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-asset-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      },
      body: JSON.stringify({
        asset_id: asset.id,
        prompt: promptText,
        style_template: currentStyleText || undefined,
        style_image_urls: (project?.style_image_urls?.length ? project.style_image_urls : undefined),
        asset_type: "character",
        image_view: view,
      }),
    });
    const resBody = await res.json().catch(() => ({}));
    setGeneratingView(null);
    if (!res.ok) {
      const msg = resBody?.details ?? resBody?.error ?? res.statusText;
      toast({
        title: "Génération échouée",
        description: typeof msg === "string" ? msg : JSON.stringify(msg),
        variant: "destructive",
      });
      return;
    }
    const imageUrl = resBody?.image_url;
    const updateField = resBody?.update_field ?? `image_url_${view}`;
    if (imageUrl) {
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, [updateField]: imageUrl } : a))
      );
      setSelectedCharacter((prev) => (prev?.id === asset.id ? { ...prev!, [updateField]: imageUrl } : prev));
      toast({ title: "Vue générée !" });
    }
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
                <Button
                  size="sm"
                  type="button"
                  className="gradient-primary text-primary-foreground"
                  onClick={() => {
                    const currentStyleText = styleTemplate?.trim() || project?.style_template?.trim();
                    const hasStyleText = !!currentStyleText;
                    const hasStyleImages = Array.isArray(project?.style_image_urls) && (project?.style_image_urls?.length > 0);
                    if (!hasStyleText && !hasStyleImages) {
                      toast({
                        title: "Style requis",
                        description: "Définissez un style dans l’onglet Style du projet (texte et/ou images de référence) avant d’ajouter un asset.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setAssetDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
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
                      <Textarea
                        value={newAssetPrompt}
                        onChange={(e) => setNewAssetPrompt(e.target.value)}
                        placeholder="Décrivez l'asset pour la génération IA..."
                        rows={3}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={creatingAsset || !canCreateAsset}
                      className={`w-full text-primary-foreground ${
                        canCreateAsset ? "gradient-primary" : "bg-muted/60 cursor-not-allowed"
                      }`}
                    >
                      {creatingAsset
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
                          className={`glass rounded-xl p-4 group relative ${t.type === "character" ? "cursor-pointer" : ""}`}
                          onClick={t.type === "character" ? () => { setSelectedCharacter(asset); setCharacterViewDialogOpen(true); } : undefined}
                          role={t.type === "character" ? "button" : undefined}
                        >
                          {asset.image_url ? (
                            <img src={asset.image_url} alt={asset.name} className="w-full aspect-[2/3] object-cover rounded-lg mb-3" />
                          ) : (
                            <div className="w-full aspect-[2/3] rounded-lg mb-3 gradient-dream flex items-center justify-center relative">
                              {generatingAssetId === asset.id ? (
                                <>
                                  <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                                  <span className="absolute bottom-2 text-xs text-muted-foreground">Génération…</span>
                                </>
                              ) : (
                                <Sparkles className="h-8 w-8 text-primary opacity-40" />
                              )}
                            </div>
                          )}
                          <h4 className="font-display font-semibold text-sm">{asset.name}</h4>
                          {asset.prompt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{asset.prompt}</p>}
                          {t.type === "character" && <p className="text-xs text-primary mt-1">Cliquer pour gérer les vues (profil, dos)</p>}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            {asset.prompt && (
                              <button
                                onClick={() => regenerateAssetImage(asset)}
                                disabled={generatingAssetId === asset.id}
                                className="p-1 rounded-full bg-background/80 text-muted-foreground hover:text-primary disabled:opacity-50"
                                title="Régénérer l’image avec le style du projet"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteAsset(asset.id)}
                              className="p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            {/* Dialog Vues du personnage (profil gauche/droite, dos) */}
            <Dialog open={characterViewDialogOpen} onOpenChange={(open) => { setCharacterViewDialogOpen(open); if (!open) setSelectedCharacter(null); }}>
              <DialogContent className="glass max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display">Vues du personnage — {selectedCharacter?.name ?? ""}</DialogTitle>
                </DialogHeader>
                {selectedCharacter && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Vue de face (principale). Générez les vues profil et dos pour utiliser le personnage sous tous les angles.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Face</p>
                        {selectedCharacter.image_url ? (
                          <img src={selectedCharacter.image_url} alt="Face" className="w-full aspect-[2/3] object-cover rounded-lg border" />
                        ) : (
                          <div className="w-full aspect-[2/3] rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">Vue principale</div>
                        )}
                      </div>
                      {(["profile_left", "profile_right", "back"] as const).map((view) => {
                        const url = selectedCharacter[view === "profile_left" ? "image_url_profile_left" : view === "profile_right" ? "image_url_profile_right" : "image_url_back"];
                        const label = view === "profile_left" ? "Profil gauche" : view === "profile_right" ? "Profil droite" : "Dos";
                                return (
                                  <div key={view} className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                    {url ? (
                                      <>
                                        <img src={url} alt={label} className="w-full aspect-[2/3] object-cover rounded-lg border" />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="w-full text-xs"
                                          disabled={generatingView === view}
                                          onClick={() => generateCharacterView(selectedCharacter, view)}
                                        >
                                          {generatingView === view ? "Génération…" : "Régénérer"}
                                        </Button>
                                      </>
                                    ) : (
                                      <div className="w-full aspect-[2/3] rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 p-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={generatingView === view}
                                          onClick={() => generateCharacterView(selectedCharacter, view)}
                                          className="text-xs"
                                        >
                                          {generatingView === view ? "Génération…" : "Générer"}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                      })}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-4">
            {/* Template de style (texte) */}
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-display font-semibold">Template de style</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Définissez un style visuel texte qui sera appliqué à toutes vos générations. Combinez-le avec des images pour un rendu encore plus précis.
              </p>
              <Textarea
                value={styleTemplate}
                onChange={(e) => setStyleTemplate(e.target.value)}
                placeholder="Ex: style webtoon sombre, ambiance urbaine nocturne, lumières néon, détails réalistes, palette violets / bleus..."
                rows={6}
              />
              <Button
                onClick={saveStyle}
                disabled={savingStyle}
                className="gradient-primary text-primary-foreground"
              >
                {savingStyle ? "Sauvegarde..." : "Sauvegarder le style texte"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Astuce : décrivez le niveau de détail, l’ambiance, les couleurs et le type de traits pour aider l’IA.
              </p>
            </div>

            {/* Images de référence (en dessous du texte) */}
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <h2 className="text-lg font-display font-semibold">Images de référence</h2>
                  <p className="text-xs text-muted-foreground">
                    Ajoutez plusieurs images pour que l’IA comprenne le style exact (design des personnages, couleurs, ambiance, etc.).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {styleImageUrls.map((url) => (
                  <div key={url} className="relative group">
                    <img
                      src={url}
                      alt="Style"
                      className="h-64 w-full object-cover rounded-2xl border border-border shadow-dream"
                    />
                    <button
                      type="button"
                      onClick={() => removeStyleImage(url)}
                      className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      title="Supprimer cette image"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => styleFileInputRef.current?.click()}
                  disabled={styleImageUploading}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 hover:bg-muted/70 transition-colors text-muted-foreground py-6 px-3 text-center text-xs sm:text-sm disabled:opacity-50"
                >
                  <ImagePlus className="h-7 w-7" />
                  <span>{styleImageUploading ? "Import en cours..." : "Ajouter des images de référence"}</span>
                </button>
              </div>

              <input
                ref={styleFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={addStyleImage}
              />

              <p className="text-xs text-muted-foreground">
                Conseil : utilisez des visuels au format portrait ou webtoon pour mieux prévisualiser le rendu final.
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-right">
              Au moins un champ (texte ou images de référence) est requis pour lancer les générations.
            </p>
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
