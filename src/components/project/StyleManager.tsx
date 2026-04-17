import { useEffect, useMemo, useRef, useState } from "react";
import {
  Palette,
  ImagePlus,
  Trash2,
  ArrowLeft,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { getTemplateStyleImageUrl } from "@/services/styleTemplates";
import {
  extractStyleKeyFromTemplateText,
  extractStylePrincipalFromTemplateText,
  hasStyleSystemBlock,
} from "@/lib/styleTemplateMeta";
import { getReferencePromptsForStyle } from "@fn-shared/style-template-image-prompts.ts";
import { cn } from "@/lib/utils";
import type { Project, UserPlan } from "@/types";

interface StyleManagerProps {
  project: Project;
  styleTemplate: string;
  onStyleTemplateChange: (value: string) => void;
  /** Après sauvegarde réussie en BDD : réinitialiser le brouillon parent pour suivre le cache projet. */
  onStyleSaveSuccess?: () => void;
  onStyleValidated?: () => void;
  userPlan?: UserPlan;
}

export function StyleManager({
  project,
  styleTemplate,
  onStyleTemplateChange,
  onStyleSaveSuccess,
  onStyleValidated,
  userPlan = "free",
}: StyleManagerProps) {
  const STYLE_OPTIONS = [
    {
      key: "manga",
      label: "Manga",
      description:
        "Manga papier classique : NOIR ET BLANC uniquement (encre, trames / screentone, gris). Pas de couleur, pas de rendu webtoon numerique lisse ni peinture full-color. Ligne claire, contrastes nets, lecture editoriale.",
      images: {
        character: getTemplateStyleImageUrl("manga", "character"),
        background: getTemplateStyleImageUrl("manga", "background"),
        scene: getTemplateStyleImageUrl("manga", "scene"),
      },
    },
    {
      key: "webtoon-coreen",
      label: "Webtoon Coréen",
      description:
        "Palette coloree, rendu digital propre et verticalite pensee pour la lecture mobile. Tres efficace pour l'immersion.",
      images: {
        character: getTemplateStyleImageUrl("webtoon-coreen", "character"),
        background: getTemplateStyleImageUrl("webtoon-coreen", "background"),
        scene: getTemplateStyleImageUrl("webtoon-coreen", "scene"),
      },
    },
    {
      key: "manhwa-chinois",
      label: "Manhwa Chinois",
      description:
        "Mise en scene epique, contrastes marques et rythme visuel fort. Parfait pour action, fantasy et narration intense.",
      images: {
        character: getTemplateStyleImageUrl("manhwa-chinois", "character"),
        background: getTemplateStyleImageUrl("manhwa-chinois", "background"),
        scene: getTemplateStyleImageUrl("manhwa-chinois", "scene"),
      },
    },
    {
      key: "europeen",
      label: "Européen",
      description:
        "Trait lisible, compositions claires et couleurs maitrisees, avec une mise en scene narrative proche de la BD europeenne.",
      images: {
        character: getTemplateStyleImageUrl("europeen", "character"),
        background: getTemplateStyleImageUrl("europeen", "background"),
        scene: getTemplateStyleImageUrl("europeen", "scene"),
      },
    },
  ] as const;

  const STYLE_SYSTEM_HEADER = "STYLE_SYSTEM_V1";
  const STYLE_SYSTEM_END = "/STYLE_SYSTEM_V1";

  function applyTemplateFromString(template: string) {
    const headerIndex = template.indexOf(STYLE_SYSTEM_HEADER);
    const endIndex = template.indexOf(STYLE_SYSTEM_END);

    if (headerIndex >= 0 && endIndex > headerIndex) {
      const metadata = template.slice(headerIndex, endIndex);
      const styleKey = metadata.match(/style_key:\s*(\S+)/)?.[1]?.trim();
      const styleByKey = STYLE_OPTIONS.find((s) => s.key === styleKey);
      if (styleByKey) {
        setSelectedStyleKey(styleByKey.key);
        setSelectedStyleIndex(
          STYLE_OPTIONS.findIndex((s) => s.key === styleByKey.key)
        );
      } else {
        const principal = metadata
          .match(/style_principal:\s*(.+)/)?.[1]
          ?.trim();
        const fallback = STYLE_OPTIONS.find((s) => s.label === principal);
        if (fallback) {
          setSelectedStyleKey(fallback.key);
          setSelectedStyleIndex(
            STYLE_OPTIONS.findIndex((s) => s.key === fallback.key)
          );
        }
      }

      const afterMeta = template
        .slice(endIndex + STYLE_SYSTEM_END.length)
        .trimStart();
      const extraNotesMatch = afterMeta.match(
        /Contraintes additionnelles du projet:\s*([\s\S]*)$/i
      );
      if (extraNotesMatch?.[1]) {
        setStyleNotes(extraNotesMatch[1].trim());
      }
    } else if (template.trim()) {
      setStyleNotes(template.trim());
    }
  }

  const { toast } = useToast();
  const updateProject = useUpdateProject();
  const styleFileInputRef = useRef<HTMLInputElement>(null);
  const [styleImageUploading, setStyleImageUploading] = useState(false);
  const [selectedStyleImage, setSelectedStyleImage] = useState<string | null>(
    null
  );
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(0);
  const [selectedStyleKey, setSelectedStyleKey] = useState<string>(
    STYLE_OPTIONS[0].key
  );
  const [styleNotes, setStyleNotes] = useState("");
  const [styleInitialized, setStyleInitialized] = useState(false);

  const styleImageUrls = project.style_image_urls ?? [];
  const selectedStyle =
    STYLE_OPTIONS.find((style) => style.key === selectedStyleKey) ??
    STYLE_OPTIONS[selectedStyleIndex] ??
    STYLE_OPTIONS[0];

  const generatedStyleTemplate = useMemo(() => {
    const notes = styleNotes.trim();
    const ref = getReferencePromptsForStyle(selectedStyle.key);
    const base: string[] = [
      `${STYLE_SYSTEM_HEADER}`,
      `style_principal: ${selectedStyle.label}`,
      `style_key: ${selectedStyle.key}`,
      `description_style: ${selectedStyle.description}`,
      "reference_visual_prompts_version: 1",
      "style_source: carousel_template_prompts_identical_to_generate_style_template_images",
      "full_bleed_required: true",
      "forbidden_render_artifacts: white_margins, blank_borders, empty_padding, matte_frame, letterbox_bars",
      `${STYLE_SYSTEM_END}`,
      "",
      "=== PROMPTS_REFERENCE (identiques a la generation FAL des visuels du carousel) ===",
      "",
      "--- reference_character ---",
      ref?.character ?? "",
      "",
      "--- reference_background ---",
      ref?.background ?? "",
      "",
      "--- reference_scene ---",
      ref?.scene ?? "",
      "",
      "=== APPLICATION GENERALE (obligatoire pour tous les assets et tous les panels) ===",
      "Produire le meme langage visuel, la meme finition et les memes codes esthetiques que si le prompt utilisateur etait combine avec le prompt de reference adapte au type de plan : personnage / buste -> reference_character ; decor / environnement sans personnages -> reference_background ; scene avec plusieurs personnages ou mise en scene narrative -> reference_scene.",
      "Les trois blocs reference_* ci-dessus sont les prompts systeme (non modifiables par l'utilisateur) qui ont servi a generer les images d'exemple ; toute generation du projet doit rester dans cette famille de rendu.",
      "Ne pas deriver vers un autre medium (ex. preset manga : pas de webtoon coreen colore numerique ; respecter N&B, encrage, trames / screentone, contraste editorial).",
      "Full-bleed obligatoire : contenu visuel jusqu'aux quatre bords, sans marges blanches, bandes vides, letterbox ni cadre mat.",
    ];
    if (notes) {
      base.push("");
      base.push(`Contraintes additionnelles du projet: ${notes}`);
    }
    return base.join("\n");
  }, [selectedStyle.description, selectedStyle.key, selectedStyle.label, styleNotes]);

  useEffect(() => {
    if (!styleInitialized) return;
    onStyleTemplateChange(generatedStyleTemplate);
  }, [generatedStyleTemplate, onStyleTemplateChange, styleInitialized]);

  useEffect(() => {
    if (styleInitialized) return;

    applyTemplateFromString(styleTemplate ?? "");
    setStyleInitialized(true);
  }, [styleInitialized, styleTemplate]);

  const selectStyleByIndex = (index: number) => {
    const length = STYLE_OPTIONS.length;
    const normalized = (index + length) % length;
    const nextStyle = STYLE_OPTIONS[normalized];
    setSelectedStyleIndex(normalized);
    setSelectedStyleKey(nextStyle.key);
  };

  const savedKey = extractStyleKeyFromTemplateText(project.style_template);
  const savedPrincipal = extractStylePrincipalFromTemplateText(
    project.style_template
  );
  const savedStructured = hasStyleSystemBlock(project.style_template);

  const saveStyle = async () => {
    if (import.meta.env.DEV) {
      console.info("[DreamWeave][Style] Sauvegarde", {
        projectId: project.id,
        style_key: selectedStyle.key,
        style_label: selectedStyle.label,
      });
    }
    try {
      await updateProject.mutateAsync({
        id: project.id,
        updates: { style_template: generatedStyleTemplate },
      });
      toast({
        title: "Style sauvegarde !",
        description: `${selectedStyle.label} — prompts de reference du carousel enregistres pour la generation.`,
      });
      onStyleSaveSuccess?.();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const handleValidateAndContinue = async () => {
    const ok = await saveStyle();
    if (ok) {
      toast({
        title: "Style valide",
        description: "Passage a l'etape Assets.",
      });
      onStyleValidated?.();
    }
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
        description: `Vous pouvez ajouter au maximum ${MAX_STYLE_IMAGES} images de reference.`,
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
      toast({ title: "Image de reference ajoutee" });
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
    <div className="space-y-3 sm:space-y-4">
      <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Choisissez un preset : les visuels d&apos;exemple et le texte enregistre en base
          reprennent les memes prompts systeme (non editables), pour un rendu aligne avec le
          carousel.
        </p>

        <div className="relative rounded-2xl border border-border/70 bg-background/70 p-3 sm:p-4">
          <div className="relative mb-4">
            <button
              type="button"
              onClick={() => selectStyleByIndex(selectedStyleIndex - 1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border-2 border-primary/50 bg-background/95 text-foreground hover:bg-muted/80 hover:border-primary flex items-center justify-center shadow-sm"
              aria-label="Style precedent"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="text-center">
              <p className="text-base sm:text-lg font-semibold text-foreground">{selectedStyle.label}</p>
              <p className="text-sm text-muted-foreground">
                Style {selectedStyleIndex + 1} / {STYLE_OPTIONS.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectStyleByIndex(selectedStyleIndex + 1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border-2 border-primary/50 bg-background/95 text-foreground hover:bg-muted/80 hover:border-primary flex items-center justify-center shadow-sm"
              aria-label="Style suivant"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-xl overflow-hidden border border-border/70 bg-black/20">
                <div className="relative h-52 w-full overflow-hidden">
                  <img
                    src={selectedStyle.images.character}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-35 blur-md"
                  />
                  <ImageWithFallback
                    src={selectedStyle.images.character}
                    alt={`${selectedStyle.label} - personnage`}
                    className="relative z-10 h-52 w-full object-contain"
                    fallbackClassName="h-52 w-full flex items-center justify-center bg-muted"
                  />
                </div>
                <p className="px-2 py-1 text-[11px] text-muted-foreground">
                  Personnage
                </p>
              </div>
              <div className="rounded-xl overflow-hidden border border-border/70 bg-black/20">
                <div className="relative h-52 w-full overflow-hidden">
                  <img
                    src={selectedStyle.images.background}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-35 blur-md"
                  />
                  <ImageWithFallback
                    src={selectedStyle.images.background}
                    alt={`${selectedStyle.label} - decor`}
                    className="relative z-10 h-52 w-full scale-110 object-cover object-center"
                    fallbackClassName="h-52 w-full flex items-center justify-center bg-muted"
                  />
                </div>
                <p className="px-2 py-1 text-[11px] text-muted-foreground">
                  Decor
                </p>
              </div>
              <div className="rounded-xl overflow-hidden border border-border/70 bg-black/20">
                <div className="relative h-52 w-full overflow-hidden">
                  <img
                    src={selectedStyle.images.scene}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-35 blur-md"
                  />
                  <ImageWithFallback
                    src={selectedStyle.images.scene}
                    alt={`${selectedStyle.label} - scene`}
                    className="relative z-10 h-52 w-full object-contain"
                    fallbackClassName="h-52 w-full flex items-center justify-center bg-muted"
                  />
                </div>
                <p className="px-2 py-1 text-[11px] text-muted-foreground">
                  Scene
                </p>
              </div>
            </div>
            <p className="text-base text-foreground/90">
              {selectedStyle.description}{" "}
              <span className="block mt-1 text-sm text-muted-foreground">
                A l&apos;enregistrement, le template copie les prompts anglais utilises pour ces
                trois images.
              </span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-3">
            {STYLE_OPTIONS.map((style, idx) => (
              <button
                key={style.key}
                type="button"
                onClick={() => selectStyleByIndex(idx)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  selectedStyleIndex === idx
                    ? "w-5 bg-primary"
                    : "bg-muted-foreground/40 hover:bg-muted-foreground/70"
                )}
                aria-label={`Aller au style ${style.label}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Precisions du projet (optionnel)</p>
          </div>
          <Textarea
            value={styleNotes}
            onChange={(e) => setStyleNotes(e.target.value)}
            placeholder="Ex: traits plus fins, visages anguleux, eclairage neon, ombres dures, profondeur cinematique..."
            rows={4}
          />
        </div>

        <Button
          onClick={saveStyle}
          disabled={updateProject.isPending}
          className="gradient-primary text-primary-foreground"
        >
          {updateProject.isPending ? "Sauvegarde..." : "Sauvegarder le style"}
        </Button>
        <Button
          onClick={handleValidateAndContinue}
          disabled={updateProject.isPending}
          className="w-full"
          variant="secondary"
        >
          {updateProject.isPending ? "Validation..." : "Valider et passer aux assets"}
        </Button>

        <div className="rounded-lg border border-border/80 bg-background/60 px-3 py-2 text-sm space-y-1">
          <p className="font-medium text-foreground">Style enregistre sur le projet (serveur)</p>
          {savedStructured && savedKey ? (
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">{savedPrincipal ?? savedKey}</span>
              <span className="mx-1 text-muted-foreground">·</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{savedKey}</code>
            </p>
          ) : project.style_template?.trim() ? (
            <p className="text-xs text-muted-foreground">Template present sans bloc STYLE_SYSTEM (ancien format).</p>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Aucun style sauvegarde encore — enregistrez avant de generer des assets.
            </p>
          )}
          {userPlan === "pro" &&
            styleImageUrls.length > 0 &&
            savedKey === "manga" && (
              <p className="text-xs text-amber-700 dark:text-amber-300 pt-1">
                Preset Manga : les images de reference colorees peuvent tirer le rendu vers du webtoon. Pour du noir et blanc pur, retirez-les ou utilisez des refs monochrome.
              </p>
            )}
        </div>
      </div>

      <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-display font-semibold">
                Images de reference
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
                ? "2 images de reference pour renforcer la coherence visuelle du style selectionne"
                : "Les images de reference sont reservees au plan Pro. Le style texte sera utilise pour vos generations."}
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
                      alt="Image de reference de style"
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
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 py-8 px-4 text-center">
            <ImagePlus className="h-8 w-8 text-amber-500/50" />
            <p className="text-sm text-muted-foreground">
              Passez au plan <span className="font-semibold text-amber-600 dark:text-amber-400">Pro</span> pour ajouter des images de reference et ameliorer la coherence graphique de vos generations.
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={!!selectedStyleImage}
        onOpenChange={(open) => !open && setSelectedStyleImage(null)}
      >
        <DialogContent className="glass max-w-6xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Image de reference de style</DialogTitle>
          </DialogHeader>
          {selectedStyleImage && (
            <div className="relative bg-muted/20">
              <img
                src={selectedStyleImage}
                alt="Image de reference de style - vue complete"
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
