import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ImagePlus,
  Trash2,
  X,
  ArrowRight,
  BookOpen,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useToast } from "@/hooks/use-toast";
import { useUpdateProject } from "@/hooks/useProjects";
import { useAssets } from "@/hooks/useAssets";
import { uploadStyleImage } from "@/services/storage";
import { getTemplateStyleImageUrl } from "@/services/styleTemplates";
import {
  extractStyleKeyFromTemplateText,
  extractStylePrincipalFromTemplateText,
  hasStyleSystemBlock,
} from "@/lib/styleTemplateMeta";
import { getReferencePromptsForStyle } from "@fn-shared/style-template-image-prompts.ts";
import { cn } from "@/lib/utils";
import { type Project, type UserPlan, planDisplayName } from "@/types";

interface StyleManagerProps {
  project: Project;
  styleTemplate: string;
  onStyleTemplateChange: (value: string) => void;
  onStyleSaveSuccess?: () => void;
  userPlan?: UserPlan;
}

export function StyleManager({
  project,
  styleTemplate,
  onStyleTemplateChange,
  onStyleSaveSuccess,
  userPlan = "libre",
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
      label: "Bande dessinée",
      description:
        "Style BD franco-belge : trait encre lisible et gras, aplats de couleur francs (pas de gradient photoréaliste), compositions narratives claires. INTERDIT : rendu photoréaliste, textures hyperréalistes, rendu 3D, esthétique photographique. Illustration stylisée non-réaliste uniquement.",
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
  const [selectedStyleImage, setSelectedStyleImage] = useState<string | null>(null);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(0);
  const [selectedStyleKey, setSelectedStyleKey] = useState<string>(STYLE_OPTIONS[0].key);
  const [styleNotes, setStyleNotes] = useState("");
  const [styleInitialized, setStyleInitialized] = useState(false);
  const [styleChangeWarningOpen, setStyleChangeWarningOpen] = useState(false);
  const [isDraggingStyle, setIsDraggingStyle] = useState(false);
  const STYLE_NEXT_STEP_LINK_GUARD_MS = 750;
  const [nextStepLinksSuppressed, setNextStepLinksSuppressed] = useState(false);
  const linkGuardTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const suppressNextStepLinksBriefly = useCallback(() => {
    if (linkGuardTimerRef.current != null) window.clearTimeout(linkGuardTimerRef.current);
    setNextStepLinksSuppressed(true);
    linkGuardTimerRef.current = window.setTimeout(() => {
      setNextStepLinksSuppressed(false);
      linkGuardTimerRef.current = null;
    }, STYLE_NEXT_STEP_LINK_GUARD_MS);
  }, []);

  useEffect(
    () => () => {
      if (linkGuardTimerRef.current != null) window.clearTimeout(linkGuardTimerRef.current);
    },
    []
  );

  const { data: assets = [] } = useAssets(project.id);
  const hasGeneratedAssets = assets.some((a) => !!a.image_url);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleInitialized, styleTemplate]);

  const selectStyleByIndex = (index: number) => {
    const length = STYLE_OPTIONS.length;
    const normalized = (index + length) % length;
    const nextStyle = STYLE_OPTIONS[normalized];
    setSelectedStyleIndex(normalized);
    setSelectedStyleKey(nextStyle.key);
  };

  const savedKey = extractStyleKeyFromTemplateText(project.style_template);
  const savedPrincipal = extractStylePrincipalFromTemplateText(project.style_template);
  const savedStructured = hasStyleSystemBlock(project.style_template);
  const isFirstTime = !savedStructured || !savedKey;

  const generatedAssetCount = assets.filter((a) => !!a.image_url).length;

  const actualSave = async (): Promise<boolean> => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        updates: { style_template: generatedStyleTemplate },
      });
      toast({
        title: "Style sauvegardé !",
        description: `${selectedStyle.label} enregistré pour le projet.`,
      });
      onStyleSaveSuccess?.();
      suppressNextStepLinksBriefly();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast({ title: "Erreur", description: message, variant: "destructive" });
      return false;
    }
  };

  const saveStyle = async (): Promise<boolean> => {
    if (!isFirstTime && savedKey && selectedStyleKey !== savedKey && hasGeneratedAssets) {
      setStyleChangeWarningOpen(true);
      return false;
    }
    return actualSave();
  };

  const MAX_STYLE_IMAGES = 2;
  const canAddMore = styleImageUrls.length < MAX_STYLE_IMAGES;

  const uploadStyleFile = async (file: File) => {
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
      const publicUrl = await uploadStyleImage(project.user_id, project.id, file);
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

  const addStyleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    e.target.value = "";
    uploadStyleFile(file);
  };

  const removeStyleImage = async (url: string) => {
    const newUrls = styleImageUrls.filter((u) => u !== url);
    updateProject.mutate(
      { id: project.id, updates: { style_image_urls: newUrls } },
      {
        onError: (err) =>
          toast({ title: "Erreur", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">

      {/* Carte principale */}
      <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-4">
        {/* En-tête contextuel */}
        {isFirstTime ? (
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              Choisissez le style visuel de votre œuvre
            </p>
            <p className="text-sm text-muted-foreground">
              Il sera appliqué à chaque asset et panel que vous générerez. Vous pourrez le modifier à tout moment.
            </p>
          </div>
        ) : null}

        {/* Grille 2×2 de sélection */}
        <div className="grid grid-cols-2 gap-3">
          {STYLE_OPTIONS.map((style, idx) => {
            const isSelected = selectedStyleKey === style.key;
            const isLocked  = isSelected && (isFirstTime ? false : style.key === savedKey);
            const isPending = isSelected && !isLocked;
            const isSavedIdle = !isSelected && !isFirstTime && style.key === savedKey;

            return (
              <button
                key={style.key}
                type="button"
                onClick={() => selectStyleByIndex(idx)}
                className={cn(
                  "relative rounded-xl overflow-hidden border-2 text-left transition-all duration-200 group",
                  isLocked   ? "border-primary ring-2 ring-primary/20" :
                  isPending  ? "border-mint ring-2 ring-mint/20" :
                  isSavedIdle? "border-primary/40" :
                               "border-border/40 hover:border-primary/30"
                )}
              >
                <div className="relative aspect-video overflow-hidden bg-black/20">
                  <img
                    src={style.images.scene}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-sm"
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    src={style.images.scene}
                    alt={style.label}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  {isLocked && (
                    <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full gradient-primary flex items-center justify-center shadow-md">
                      <Check className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
                    </div>
                  )}
                  {isPending && (
                    <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center">
                      <Check className="h-4 w-4 text-mint" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <div className={cn(
                  "px-3 py-2 text-sm transition-colors duration-200",
                  isLocked   ? "font-bold text-primary bg-primary/15" :
                  isPending  ? "font-bold text-foreground bg-mint/40" :
                               "font-semibold text-foreground"
                )}>
                  {style.label}
                </div>
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5 transition-colors duration-200",
                  isLocked  ? "bg-primary" :
                  isPending ? "bg-mint" :
                              "opacity-0"
                )} />
              </button>
            );
          })}
        </div>

        {/* Détail du style sélectionné */}
        <div className={cn(
          "rounded-xl border p-3 space-y-3 transition-colors duration-200",
          selectedStyleKey === savedKey && !isFirstTime
            ? "border-primary/25 bg-primary/5"
            : "border-mint/25 bg-mint/5"
        )}>
          <div className="grid grid-cols-3 gap-2">
            {[selectedStyle.images.character, selectedStyle.images.background, selectedStyle.images.scene].map((src, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-border/50 bg-black/20">
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-sm"
                    loading="lazy"
                    decoding="async"
                  />
                  <ImageWithFallback
                    src={src}
                    alt={selectedStyle.label}
                    className="relative z-10 h-40 w-full object-cover"
                    fallbackClassName="h-40 w-full flex items-center justify-center bg-muted"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-foreground/80">{selectedStyle.description}</p>
        </div>

        {/* CTA contextuel */}
        {isFirstTime ? (
          <Button
            type="button"
            onClick={saveStyle}
            disabled={updateProject.isPending}
            className="w-full gradient-primary text-primary-foreground"
          >
            {updateProject.isPending ? "Validation..." : "Valider ce style"}
          </Button>
        ) : selectedStyleKey !== savedKey ? (
          <Button
            type="button"
            onClick={saveStyle}
            disabled={updateProject.isPending}
            className="w-full bg-mint hover:bg-mint/90 text-white gap-2"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
            {updateProject.isPending ? "Application..." : `Appliquer — ${selectedStyle.label}`}
          </Button>
        ) : null}
      </div>

      {/* Images de référence — plan Artiste */}
      <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-display font-semibold">
                Images de référence
              </h2>
              {userPlan !== "libre" && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {styleImageUrls.length}/{MAX_STYLE_IMAGES}
                </span>
              )}
              {userPlan === "libre" && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                  {planDisplayName("createur")}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {userPlan !== "libre"
                ? "2 images de référence pour renforcer la cohérence visuelle du style sélectionné"
                : `Les images de référence sont disponibles dès le plan ${planDisplayName("createur")}. Le style texte sera utilisé pour vos générations.`}
            </p>
          </div>
        </div>

        {userPlan !== "libre" ? (
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
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDraggingStyle(true); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingStyle(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingStyle(false);
                    const file = e.dataTransfer.files?.[0];
                    if (!file?.type.startsWith("image/")) return;
                    uploadStyleFile(file);
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed transition-colors text-muted-foreground py-6 px-3 text-center text-xs sm:text-sm disabled:opacity-50 h-64 ${
                    isDraggingStyle
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/40 hover:bg-muted/70"
                  }`}
                >
                  <ImagePlus className="h-7 w-7" />
                  <span>
                    {styleImageUploading
                      ? "Import en cours..."
                      : isDraggingStyle
                        ? "Déposer ici"
                        : `Glisser ou cliquer (${styleImageUrls.length}/${MAX_STYLE_IMAGES})`}
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
              Passez au plan{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {planDisplayName("createur")}
              </span>{" "}
              pour ajouter des images de référence et améliorer la cohérence graphique de vos générations.
            </p>
          </div>
        )}

        {userPlan !== "libre" && styleImageUrls.length > 0 && savedKey === "manga" && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Preset Manga : les images de référence colorées peuvent tirer le rendu vers du webtoon. Pour du noir et blanc pur, retirez-les ou utilisez des refs monochrome.
          </p>
        )}
      </div>

      {/* Prochaines étapes — sous les refs pour éviter clic fantôme au premier Valider */}
      {!isFirstTime && (
        <div
          className={cn(
            "space-y-3 transition-opacity duration-150",
            nextStepLinksSuppressed && "pointer-events-none select-none opacity-95"
          )}
        >
          <p className="text-sm font-semibold text-foreground px-0.5">Prochaines étapes</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to={`/dashboard/projects/${project.id}?tab=scenario`}
              className="glass rounded-xl p-4 hover:shadow-dream transition-shadow group block"
            >
              <BookOpen className="h-4 w-4 text-primary mb-2.5" />
              <p className="font-display font-semibold text-sm">Scénario</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Écrivez votre histoire, chapitres et dialogues
              </p>
              <span className="text-xs text-primary mt-2.5 inline-flex items-center gap-1 group-hover:gap-1.5 transition-[gap] duration-150">
                Commencer <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
            <Link
              to={`/dashboard/projects/${project.id}?tab=assets`}
              className="glass rounded-xl p-4 hover:shadow-dream transition-shadow group block"
            >
              <ImageIcon className="h-4 w-4 text-primary mb-2.5" />
              <p className="font-display font-semibold text-sm">Assets visuels</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Créez personnages, décors et objets avec l'IA
              </p>
              <span className="text-xs text-primary mt-2.5 inline-flex items-center gap-1 group-hover:gap-1.5 transition-[gap] duration-150">
                Créer <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Dialog aperçu image */}
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
                loading="lazy"
                decoding="async"
              />
              <button
                onClick={() => setSelectedStyleImage(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-background/95 backdrop-blur-sm text-foreground hover:bg-background shadow-lg transition-colors hover:scale-110 z-10"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warning changement de style avec assets existants */}
      <AlertDialog open={styleChangeWarningOpen} onOpenChange={setStyleChangeWarningOpen}>
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Changer de style ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez{" "}
              <strong className="text-foreground">
                {generatedAssetCount} asset{generatedAssetCount > 1 ? "s" : ""}
              </strong>{" "}
              déjà générés avec le style{" "}
              <strong className="text-foreground">{savedPrincipal ?? savedKey}</strong>.
              Passer à{" "}
              <strong className="text-foreground">{selectedStyle.label}</strong> ne
              régénèrera pas vos visuels existants — il y aura une incohérence visuelle
              entre anciens et nouveaux assets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setStyleChangeWarningOpen(false);
                actualSave();
              }}
            >
              Changer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
