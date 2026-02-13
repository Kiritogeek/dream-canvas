import { useRef, useState } from "react";
import { Palette, ImagePlus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useToast } from "@/hooks/use-toast";
import { useUpdateProject } from "@/hooks/useProjects";
import { uploadStyleImage } from "@/services/storage";
import type { Project, UserPlan } from "@/types";

interface StyleManagerProps {
  project: Project;
  styleTemplate: string;
  onStyleTemplateChange: (value: string) => void;
  userPlan?: UserPlan;
}

export function StyleManager({
  project,
  styleTemplate,
  onStyleTemplateChange,
  userPlan = "free",
}: StyleManagerProps) {
  const { toast } = useToast();
  const updateProject = useUpdateProject();
  const styleFileInputRef = useRef<HTMLInputElement>(null);
  const [styleImageUploading, setStyleImageUploading] = useState(false);
  const [selectedStyleImage, setSelectedStyleImage] = useState<string | null>(
    null
  );

  const styleImageUrls = project.style_image_urls ?? [];

  const saveStyle = async () => {
    updateProject.mutate(
      { id: project.id, updates: { style_template: styleTemplate } },
      {
        onSuccess: () => toast({ title: "Style sauvegardé !" }),
        onError: (err) =>
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  };

  const MAX_STYLE_IMAGES = 2;
  const canAddMore = styleImageUrls.length < MAX_STYLE_IMAGES;

  const addStyleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    e.target.value = "";

    if (!canAddMore) {
      toast({
        title: "Limite atteinte",
        description: `Vous pouvez ajouter au maximum ${MAX_STYLE_IMAGES} images de référence.`,
        variant: "destructive",
      });
      return;
    }

    setStyleImageUploading(true);

    try {
      const publicUrl = await uploadStyleImage(
        project.user_id,
        project.id,
        file
      );
      const newUrls = [...styleImageUrls, publicUrl];
      await updateProject.mutateAsync({
        id: project.id,
        updates: { style_image_urls: newUrls },
      });
      toast({ title: "Image de référence ajoutée" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setStyleImageUploading(false);
    }
  };

  const removeStyleImage = async (url: string) => {
    const newUrls = styleImageUrls.filter((u) => u !== url);
    updateProject.mutate(
      { id: project.id, updates: { style_image_urls: newUrls } },
      {
        onError: (err) =>
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Template de style (texte) */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">
            Template de style
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Définissez un style visuel texte qui sera appliqué à toutes vos
          générations. Combinez-le avec des images pour un rendu encore plus
          précis.
        </p>
        <Textarea
          value={styleTemplate}
          onChange={(e) => onStyleTemplateChange(e.target.value)}
          placeholder="Ex: style webtoon sombre, ambiance urbaine nocturne, lumières néon, détails réalistes, palette violets / bleus..."
          rows={6}
        />
        <Button
          onClick={saveStyle}
          disabled={updateProject.isPending}
          className="gradient-primary text-primary-foreground"
        >
          {updateProject.isPending
            ? "Sauvegarde..."
            : "Sauvegarder le style texte"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Astuce : décrivez le niveau de détail, l'ambiance, les couleurs et le
          type de traits pour aider l'IA.
        </p>
      </div>

      {/* Images de référence */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-display font-semibold">
                Images de référence
              </h2>
              {userPlan === "pro" && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {styleImageUrls.length}/{MAX_STYLE_IMAGES}
                </span>
              )}
              {userPlan === "free" && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                  Pro
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {userPlan === "pro"
                ? "2 images de référence pour la cohérence graphique de votre projet"
                : "Les images de référence sont réservées au plan Pro. Le style texte sera utilisé pour vos générations."}
            </p>
          </div>
        </div>

        {userPlan === "pro" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {styleImageUrls.map((url) => (
                <div
                  key={url}
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedStyleImage(url)}
                >
                  <div className="relative overflow-hidden rounded-2xl border border-border shadow-dream bg-muted/20">
                    <ImageWithFallback
                      src={url}
                      alt="Image de référence de style"
                      className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      fallbackClassName="h-64 w-full flex items-center justify-center"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium px-3 py-1.5 bg-black/50 rounded-lg backdrop-blur-sm">
                        Cliquer pour voir en grand
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStyleImage(url);
                    }}
                    className="absolute -top-1 -right-1 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-destructive/90 z-10"
                    title="Supprimer cette image"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {canAddMore && (
                <button
                  type="button"
                  onClick={() => styleFileInputRef.current?.click()}
                  disabled={styleImageUploading}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 hover:bg-muted/70 transition-colors text-muted-foreground py-6 px-3 text-center text-xs sm:text-sm disabled:opacity-50 h-64"
                >
                  <ImagePlus className="h-7 w-7" />
                  <span>
                    {styleImageUploading
                      ? "Import en cours..."
                      : `Ajouter une image (${styleImageUrls.length}/${MAX_STYLE_IMAGES})`}
                  </span>
                </button>
              )}
            </div>

            <input
              ref={styleFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={addStyleImage}
            />

            <p className="text-xs text-muted-foreground">
              Conseil : utilisez des visuels au format portrait ou webtoon pour
              mieux prévisualiser le rendu final.
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 py-8 px-4 text-center">
            <ImagePlus className="h-8 w-8 text-amber-500/50" />
            <p className="text-sm text-muted-foreground">
              Passez au plan <span className="font-semibold text-amber-600 dark:text-amber-400">Pro</span> pour ajouter des images de référence et améliorer la cohérence graphique de vos générations.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-right">
        Au moins un champ (texte ou images de référence) est requis pour lancer
        les générations.
      </p>

      {/* Dialog vue en grand */}
      <Dialog
        open={!!selectedStyleImage}
        onOpenChange={(open) => !open && setSelectedStyleImage(null)}
      >
        <DialogContent className="glass max-w-6xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Image de référence de style</DialogTitle>
          </DialogHeader>
          {selectedStyleImage && (
            <div className="relative bg-muted/20">
              <img
                src={selectedStyleImage}
                alt="Image de référence de style - vue complète"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
              <button
                onClick={() => setSelectedStyleImage(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-background/95 backdrop-blur-sm text-foreground hover:bg-background shadow-lg transition-all hover:scale-110 z-10"
                title="Fermer"
              >
                <ArrowLeft className="h-5 w-5 rotate-90" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
