import { useRef, useState, useCallback, useEffect } from "react";
import {
  BookOpen,
  Sparkles,
  Plus,
  FileUp,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  Loader2,
  Send,
  LayoutTemplate,
  Eye,
  PenLine,
  LayoutPanelTop,
  User,
  ImageIcon,
  Package,
  MousePointer2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  useScenarioChapters,
  useCreateScenarioChapter,
  useUpdateScenarioChapter,
  useDeleteScenarioChapter,
  useReorderScenarioChapters,
} from "@/hooks/useScenarioChapters";
import { useScenarioAI } from "@/hooks/useScenarioAI";
import { useAssets } from "@/hooks/useAssets";
import { TextDiff, TextDiffLegend } from "@/components/ui/TextDiff";
import {
  ScenarioTextHighlighter,
  MissingAssetsPanel,
} from "@/components/project/ScenarioTextHighlighter";
import type { Project, ScenarioChapter, Asset, AssetType } from "@/types";
import { estimatePanelCount, PANELS_REFERENCE_PER_CHAPTER } from "@/services/panels";

// ── Props ─────────────────────────────────────────────────────

interface ScenarioSectionProps {
  projectId: string;
  project: Project;
  /** Navigue vers l'onglet Assets avec le dialog de création pré-rempli */
  onNavigateToCreateAsset?: (name: string, type: AssetType) => void;
}

// Nombre de chapitres les plus récents envoyés à l'IA scénario (~2700 car/chapitre)
const SCENARIO_RECENT_CHAPTERS_FOR_IA = 5;

// ── Exemple « Chapitre Type » (en dur) ────────────────────────

const CHAPITRE_TYPE_EXEMPLE = `Lieu : Un petit appartement parisien au troisième étage, cuisine ouverte sur un salon encombré de livres et de plantes vertes. La lumière du matin filtre à travers des rideaux jaune pâle. Une cafetière italienne grésille sur la gazinière, diffusant une odeur de café torréfié dans tout l'espace.

Scène :
SAMI (28 ans), cheveux en bataille, t-shirt froissé, se tient debout devant le plan de travail. Il fixe son téléphone d'un air absent. Sur la table, un bol de céréales entamé et un journal ouvert à la page des petites annonces. Sa colocataire, NORA (26 ans), entre dans la cuisine en nouant ses cheveux, son sac déjà sur l'épaule.

Dialogue - Action :

    Nora (passant derrière lui, attrapant une tasse) : "T'as encore dormi sur le canapé ?"

    Sami (sans lever les yeux de son téléphone) : "Le canapé me comprend mieux que mon lit."

    Nora (versant le café, sourire en coin) : "Ton lit t'en veut pas personnellement, Sami. C'est toi qui refuses de dormir à des heures normales."

    Sami pose le téléphone et se frotte les yeux. Il remarque le journal ouvert et le referme d'un geste las.

    Sami : "J'ai encore raté l'entretien d'hier. Le type m'a dit que j'avais 'un profil intéressant mais pas assez corporate'."

    Nora (posant sa tasse, le regardant franchement) : "Tu veux un vrai conseil ? Arrête de porter tes converses à des entretiens en cabinet d'avocats."

    Sami (un demi-sourire) : "Elles sont propres."

    Nora attrape ses clés sur le comptoir, ajuste la bandoulière de son sac, et se dirige vers la porte.

    Nora (depuis l'entrée) : "Ce soir je ramène des pizzas. Essaie de pas déprimer d'ici là."

    La porte claque. Sami reste seul. Il fixe le journal fermé, puis le rouvre lentement à la même page.

---

Lieu : Une rue commerçante animée du 11ème arrondissement, en fin de matinée. Les terrasses des cafés commencent à se remplir. Un musicien de rue joue un air de guitare acoustique devant une boulangerie artisanale. Le soleil est haut, l'air tiède.

Scène :
SAMI marche sur le trottoir, un CV imprimé roulé dans la main comme un tube. Il porte un jean propre et — pour une fois — des chaussures de ville qui semblent le faire souffrir à chaque pas. Il s'arrête devant une petite librairie indépendante dont la vitrine affiche « RECHERCHE VENDEUR - SE PRÉSENTER ». Il hésite, regarde le reflet de son visage dans la vitre.

Dialogue - Action :

    Sami (murmurant pour lui-même) : "Allez, c'est juste une librairie. Tu sais lire. C'est déjà 80% du boulot."

    Il pousse la porte. Un carillon tinte. L'intérieur est chaleureux, des étagères en bois du sol au plafond, une odeur de papier ancien.

    MADELEINE (65 ans, lunettes rondes, gilet en laine bordeaux) lève les yeux de derrière le comptoir, un crayon coincé derrière l'oreille.

    Madeleine (l'observant de haut en bas) : "Vous cherchez quelque chose ou quelqu'un vous poursuit ?"

    Sami (surpris, dépliant maladroitement son CV) : "Euh… j'ai vu l'annonce. Pour le poste de vendeur."

    Madeleine (prenant le CV du bout des doigts, sans le regarder) : "Quel est le dernier livre que vous avez lu ? Et ne me dites pas un résumé Wikipedia."

    Sami (un silence, puis honnêtement) : "L'Étranger. Camus. Mais je l'ai lu trois fois, est-ce que ça compte triple ?"

    Madeleine le dévisage. Un long silence. Puis un sourire apparaît au coin de ses lèvres.

    Madeleine : "Vous commencez lundi. 9 heures. Ne soyez pas en retard."

    Sami reste figé, son CV encore en l'air. Madeleine est déjà retournée à ses livres.

---

Lieu : Le même petit appartement, le soir. La lumière chaude d'une lampe de salon éclaire la pièce. Deux boîtes de pizza ouvertes sur la table basse. La télé est allumée en fond sur un documentaire animalier, le son coupé.

Scène :
SAMI est assis par terre, adossé au canapé, une part de pizza à la main, le visage éclairé par un sourire qu'il essaie de contenir. NORA est assise en tailleur sur le canapé, pieds nus, et mange sa pizza en le dévisageant.

Dialogue - Action :

    Nora (mâchant, le pointant du doigt avec sa part) : "T'as une tête bizarre. Qu'est-ce qui s'est passé ?"

    Sami (haussant les épaules, trop nonchalant) : "Rien. Une journée normale."

    Nora (plissant les yeux) : "Sami. Ta 'journée normale' c'est traîner en caleçon jusqu'à midi et regarder des vidéos de chats. Là t'es habillé ET tu souris. Crache le morceau."

    Sami pose sa part de pizza, se tourne vers elle.

    Sami : "J'ai trouvé un job. Dans une librairie. Je commence lundi."

    Nora (un temps, bouche ouverte) : "Attends, pour de vrai ?"

    Sami (hochant la tête) : "La patronne m'a embauché en trente secondes. Elle m'a même pas regardé le CV."

    Nora pose sa pizza, se lève d'un bond, et le prend dans ses bras depuis le canapé dans une étreinte maladroite qui le fait basculer.

    Nora (riant, le serrant fort) : "Sami ! C'est génial ! Je savais que tes converses finiraient par ne plus être un problème !"

    Sami (étouffé, riant aussi) : "C'est parce que j'ai mis tes chaussures de ville. J'ai des ampoules partout."

    Nora (le relâchant, essuyant une larme de rire) : "On va fêter ça. Il reste une bière dans le frigo ?"

    Sami : "Il reste une bière tiède et du jus de pomme périmé."

    Nora (se levant) : "Parfait. C'est la fête."

    Ils trinquent avec une bière tiède et un verre de jus de pomme douteux, assis par terre, le documentaire muet continuant de défiler devant eux. Pour la première fois depuis des semaines, le silence entre eux n'est pas lourd — il est léger.`;

// Assets de démo pour l'exemple « Chapitre type » (personnages + décors + objets, surlignage réel)
const CHAPITRE_TYPE_DEMO_ASSETS: Asset[] = [
  { id: "demo-sami", name: "Sami", asset_type: "character", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
  { id: "demo-nora", name: "Nora", asset_type: "character", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
  { id: "demo-madeleine", name: "Madeleine", asset_type: "character", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
  { id: "demo-cuisine", name: "cuisine", asset_type: "background", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
  { id: "demo-salon", name: "salon", asset_type: "background", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
  { id: "demo-librairie", name: "librairie", asset_type: "background", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
  { id: "demo-telephone", name: "téléphone", asset_type: "object", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
  { id: "demo-journal", name: "journal", asset_type: "object", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
  { id: "demo-canape", name: "canapé", asset_type: "object", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
  { id: "demo-cafetiere", name: "cafetière", asset_type: "object", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
  { id: "demo-cv", name: "CV", asset_type: "object", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, metadata: null, prompt: null },
];

// ── Utilitaire : un prompt IA Scénario = un chapitre ───────────
// À l'acceptation, le texte généré devient le contenu d'un seul chapitre.

function createOneChapterFromAIResult(
  text: string,
  nextChapterNumber: number
): { number: number; title: string; content: string } {
  return {
    number: nextChapterNumber,
    title: `Chapitre ${nextChapterNumber}`,
    content: text.trim(),
  };
}

// ── Composant principal ───────────────────────────────────────

export function ScenarioSection({ projectId, project, onNavigateToCreateAsset }: ScenarioSectionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Données
  const { data: chapters = [], isLoading } = useScenarioChapters(projectId);
  const { data: assets = [] } = useAssets(projectId);
  const createChapter = useCreateScenarioChapter();
  const updateChapter = useUpdateScenarioChapter();
  const deleteChapterMutation = useDeleteScenarioChapter();
  const reorderChapters = useReorderScenarioChapters();
  const scenarioAI = useScenarioAI();

  // UI state
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScenarioChapter | null>(null);
  const [showChapitreType, setShowChapitreType] = useState(false);
  /** Noms exclus de la liste « éléments non créés » (après « Ne pas créer »).
   *  Persisté par projet dans localStorage pour ne pas reproposer les mêmes termes.
   */
  const [dismissedMissingNames, setDismissedMissingNames] = useState<Set<string>>(new Set());

  // Charger les noms ignorés depuis localStorage à l'initialisation du projet
  useEffect(() => {
    const key = `dreamweave:dismissed-missing:${projectId}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setDismissedMissingNames(new Set(parsed.map((n) => n.toLowerCase())));
      }
    } catch {
      // En cas d'erreur de parsing, on ignore simplement et on repart d'un set vide
    }
  }, [projectId]);

  // Persister les noms ignorés à chaque changement
  useEffect(() => {
    const key = `dreamweave:dismissed-missing:${projectId}`;
    try {
      const arr = Array.from(dismissedMissingNames);
      window.localStorage.setItem(key, JSON.stringify(arr));
    } catch {
      // localStorage indisponible (mode privé, quota...) → on ne fait rien
    }
  }, [projectId, dismissedMissingNames]);

  const handleDismissMissing = useCallback((name: string) => {
    setDismissedMissingNames((prev) => {
      const next = new Set(prev);
      next.add(name.toLowerCase());
      return next;
    });
  }, []);

  // IA Scénario state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);

  // ── Réordonner un chapitre (monter / descendre) ─────────────

  const handleMoveChapter = useCallback(
    (chapterId: string, direction: "up" | "down") => {
      const idx = chapters.findIndex((c) => c.id === chapterId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= chapters.length) return;

      const current = chapters[idx];
      const neighbor = chapters[swapIdx];

      reorderChapters.mutate(
        {
          projectId,
          chapters: [
            { id: current.id, chapter_number: neighbor.chapter_number },
            { id: neighbor.id, chapter_number: current.chapter_number },
          ],
        },
        {
          onError: (err) =>
            toast({
              title: "Erreur",
              description: err.message,
              variant: "destructive",
            }),
        }
      );
    },
    [chapters, projectId, reorderChapters, toast]
  );

  // ── Créer un chapitre ───────────────────────────────────────

  const handleCreateChapter = useCallback(
    (initialContent?: string) => {
      const nextNumber =
        chapters.length > 0
          ? Math.max(...chapters.map((c) => c.chapter_number)) + 1
          : 1;

      createChapter.mutate(
        {
          project_id: projectId,
          title: `Chapitre ${nextNumber}`,
          chapter_number: nextNumber,
          content: initialContent ?? null,
        },
        {
          onSuccess: (created) => {
            toast({ title: "Chapitre créé" });
            setOpenChapterId(created.id);
          },
          onError: (err) =>
            toast({
              title: "Erreur",
              description: err.message,
              variant: "destructive",
            }),
        }
      );
    },
    [chapters, createChapter, projectId, toast]
  );

  // ── Import .txt ─────────────────────────────────────────────

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
        toast({
          title: "Format non supporté",
          description: "Seuls les fichiers .txt sont acceptés pour le moment.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (!text.trim()) {
          toast({
            title: "Fichier vide",
            description: "Le fichier importé ne contient pas de texte.",
            variant: "destructive",
          });
          return;
        }
        handleCreateChapter(text.trim());
      };
      reader.onerror = () =>
        toast({
          title: "Erreur de lecture",
          description: "Impossible de lire le fichier.",
          variant: "destructive",
        });
      reader.readAsText(file, "UTF-8");
    },
    [handleCreateChapter, toast]
  );

  // ── Supprimer un chapitre ───────────────────────────────────

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteChapterMutation.mutate(
      { id: deleteTarget.id, projectId },
      {
        onSuccess: () => {
          toast({ title: "Chapitre supprimé" });
          if (openChapterId === deleteTarget.id) setOpenChapterId(null);
          setDeleteTarget(null);
        },
        onError: (err) =>
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  }, [deleteTarget, deleteChapterMutation, projectId, openChapterId, toast]);

  // ── Rendu ───────────────────────────────────────────────────

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ── Bloc IA Scénario (visible dès l'entrée) ──────────── */}
      <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-display font-semibold">
              IA Scénario
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
              Scénariste
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Importer .txt</span>
          </Button>
        </div>

        <p className="text-sm sm:text-base text-muted-foreground">
          Votre scénariste IA au service de <strong>votre vision</strong>. Il
          crée votre histoire <strong>chapitre par chapitre</strong> : chaque
          prompt génère <strong>un chapitre</strong>. Décrivez votre histoire
          (ou la suite que vous voulez) et laissez l'IA la créer ou la faire
          avancer.
        </p>

        {/* Prompt utilisateur */}
        <Textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Décrivez ce chapitre : lieu, personnages, situation, dialogues… Un prompt = un chapitre généré."
          rows={4}
          className="text-base"
        />

        {/* Bouton générer */}
        <Button
          onClick={() => {
            if (!aiPrompt.trim()) {
              toast({
                title: "Prompt requis",
                description:
                  "Décrivez votre histoire pour que l'IA puisse la créer.",
                variant: "destructive",
              });
              return;
            }
            // Contexte limité aux N derniers chapitres pour ne pas surcharger le prompt IA
            const recentChapters = chapters.slice(-SCENARIO_RECENT_CHAPTERS_FOR_IA);
            const existingContent =
              recentChapters.length > 0
                ? recentChapters
                    .map(
                      (c) =>
                        `### Chapitre ${c.chapter_number} : ${c.title}\n\n${c.content ?? "(vide)"}`
                    )
                    .join("\n\n")
                : undefined;

            scenarioAI.mutate(
              {
                mode: "scenario",
                prompt: aiPrompt.trim(),
                existing_content: existingContent,
                project_description: project.description ?? undefined,
              },
              {
                onSuccess: (data) => {
                  setAiResult(data.text);
                  toast({ title: "Scénario généré par l'IA" });
                },
                onError: (err) =>
                  toast({
                    title: "Erreur IA",
                    description: err.message,
                    variant: "destructive",
                  }),
              }
            );
          }}
          disabled={scenarioAI.isPending || !aiPrompt.trim()}
          className="gap-2 gradient-primary text-primary-foreground"
        >
          {scenarioAI.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {chapters.length > 0
                ? "Générer le prochain chapitre"
                : "Générer le premier chapitre"}
            </>
          )}
        </Button>

        {/* Résultat IA Scénario — texte proposé (pas de diff supprimé/ajouté) */}
        {aiResult && (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">
                Proposition de l'IA Scénario
              </h3>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg bg-background/80 p-4 border border-border/50 text-base leading-relaxed whitespace-pre-wrap">
              {aiResult}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  // Un prompt = un chapitre : le texte généré devient un seul chapitre
                  const ch = createOneChapterFromAIResult(
                    aiResult,
                    chapters.length + 1
                  );
                  createChapter.mutate(
                    {
                      project_id: projectId,
                      title: ch.title,
                      chapter_number: ch.number,
                      content: ch.content,
                    },
                    {
                      onSuccess: () => {
                        toast({ title: "Chapitre créé" });
                        setAiResult(null);
                        setAiPrompt("");
                      },
                      onError: (err) =>
                        toast({
                          title: "Erreur",
                          description: err.message,
                          variant: "destructive",
                        }),
                    }
                  );
                }}
                className="gap-1.5 gradient-primary text-primary-foreground"
              >
                <Check className="h-3.5 w-3.5" />
                Accepter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiResult(null)}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Rejeter
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Chapitres (= le scénario) ────────────────────────── */}
      <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-display font-semibold">
              Votre scénario
            </h2>
            {chapters.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {chapters.length} chapitre{chapters.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChapitreType(true)}
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              title="Voir la structure type d'un chapitre"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chapitre Type</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleCreateChapter()}
              disabled={createChapter.isPending}
              className="gap-1.5 gradient-primary text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nouveau chapitre</span>
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={handleFileImport}
        />

        <p className="text-sm sm:text-base text-muted-foreground">
          Chaque chapitre de scénario correspond à un chapitre webtoon.
          Écrivez, collez ou importez du texte dans chaque chapitre.
        </p>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-muted/20 h-16 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* État vide */}
        {!isLoading && chapters.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 py-10 px-4 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-base font-medium text-muted-foreground">
                Aucun chapitre pour le moment
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Créez votre premier chapitre ou utilisez l'IA Scénario (avec
                Importer .txt si besoin) pour commencer votre histoire.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={() => handleCreateChapter()}
                disabled={createChapter.isPending}
                className="gap-1.5 gradient-primary text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Créer un chapitre
              </Button>
            </div>
          </div>
        )}

        {/* Liste des chapitres */}
        {!isLoading && chapters.length > 0 && (
          <div className="space-y-2">
            {chapters.map((chapter, idx) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                projectId={projectId}
                panelsTarget={project.panels_target_per_chapter ?? undefined}
                isOpen={openChapterId === chapter.id}
                onToggle={() =>
                  setOpenChapterId(
                    openChapterId === chapter.id ? null : chapter.id
                  )
                }
                onRequestDelete={() => setDeleteTarget(chapter)}
                onMoveUp={
                  idx > 0
                    ? () => handleMoveChapter(chapter.id, "up")
                    : undefined
                }
                onMoveDown={
                  idx < chapters.length - 1
                    ? () => handleMoveChapter(chapter.id, "down")
                    : undefined
                }
                isReordering={reorderChapters.isPending}
                updateChapter={updateChapter}
                assets={assets}
                onCreateAsset={onNavigateToCreateAsset}
                dismissedMissingNames={dismissedMissingNames}
                onDismissMissing={handleDismissMissing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Astuce */}
      <p className="text-sm text-muted-foreground text-right">
        Astuce : utilisez l'IA Scénario pour générer une première ébauche, puis
        affinez chaque chapitre à votre guise.
      </p>

      {/* ── Dialog confirmation suppression ───────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce chapitre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le chapitre « {deleteTarget?.title} » et tout son contenu seront
              définitivement supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteChapterMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog « Chapitre Type » ───────────────────────────── */}
      <AlertDialog
        open={showChapitreType}
        onOpenChange={(open) => !open && setShowChapitreType(false)}
      >
        <AlertDialogContent className="glass max-w-3xl max-h-[85vh] flex flex-col overflow-hidden min-h-0">
          <AlertDialogHeader className="shrink-0">
            <AlertDialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              Structure type d'un chapitre
            </AlertDialogTitle>
            <AlertDialogDescription>
              Chaque chapitre est composé d'une ou plusieurs séquences suivant
              toujours le même schéma :{" "}
              <strong className="text-foreground">
                Lieu → Scène → Dialogue - Action
              </strong>
              . Ce schéma se répète autant de fois que nécessaire pour faire
              avancer l'histoire dans un même chapitre.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Structure visuelle */}
          <div className="flex items-center gap-2 px-1 py-2 shrink-0">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Lieu
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Scène
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Dialogue - Action
            </span>
            <span className="text-muted-foreground ml-1 text-xs italic">
              × répétable
            </span>
          </div>

          {/* Assets dans le chapitre — détection, couleurs par type, visuel */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3 shrink-0">
            <p className="text-xs font-medium text-foreground uppercase tracking-wide flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-primary" />
              Assets dans le chapitre
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Les <strong className="text-foreground">personnages</strong>,{" "}
              <strong className="text-foreground">décors</strong> et{" "}
              <strong className="text-foreground">objets</strong> créés dans
              l’onglet Assets sont détectés automatiquement dans le texte. Les
              mentions sont <strong className="text-foreground">surlignées</strong>
              ; au <strong className="text-foreground">survol</strong>, l’asset
              s’affiche (image + infos). Ils servent de référence et alimentent
              le <strong className="text-foreground">prompt de génération</strong>{" "}
              des images (panels / blocs).
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                Détection d’assets
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Le système cherche dans le texte les <strong className="text-foreground">noms exacts</strong> des
                assets du projet. Chaque mention trouvée est surlignée avec une{" "}
                <strong className="text-foreground">couleur selon le type</strong> (voir ci‑dessous).
                Au survol d’une mention, une infobulle affiche l’asset (image, type, nom).
              </p>
            </div>
            <p className="text-xs font-medium text-foreground">
              Couleurs par type (même code que dans l’aperçu)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-[hsl(var(--lavender)/0.2)] text-[hsl(var(--lavender))] dark:text-[hsl(var(--lavender))] border border-[hsl(var(--lavender)/0.5)]">
                <User className="h-3.5 w-3.5" />
                Personnages
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-[hsl(var(--mint)/0.25)] text-[hsl(170_40%_35%)] dark:text-[hsl(170_45%_75%)] border border-[hsl(var(--mint)/0.5)]">
                <ImageIcon className="h-3.5 w-3.5" />
                Décors
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                <Package className="h-3.5 w-3.5" />
                Objets
              </span>
              <span className="text-muted-foreground text-xs">→</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground border border-border/60">
                <MousePointer2 className="h-3 w-3" />
                dans le texte : surbrillance + hover
              </span>
              <span className="text-muted-foreground text-xs">→</span>
              <span className="text-xs text-muted-foreground italic">
                prompt de génération
              </span>
            </div>
          </div>

          {/* Exemple — zone scrollable pour tout le chapitre */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-lg bg-background/80 border border-border/50">
            <p className="text-xs text-muted-foreground px-4 pt-3 pb-1 uppercase tracking-wide font-medium shrink-0">
              Exemple complet — 3 séquences dans un seul chapitre
            </p>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 pt-0">
              <ScenarioTextHighlighter
                text={CHAPITRE_TYPE_EXEMPLE}
                assets={CHAPITRE_TYPE_DEMO_ASSETS}
                hideIndicator
                className="text-sm leading-relaxed whitespace-pre-wrap"
              />
            </div>
          </div>

          <AlertDialogFooter className="shrink-0">
            <AlertDialogCancel>Fermer</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Carte chapitre (collapsible) ──────────────────────────────

interface ChapterCardProps {
  chapter: ScenarioChapter;
  projectId: string;
  panelsTarget?: number | null;
  isOpen: boolean;
  onToggle: () => void;
  onRequestDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isReordering: boolean;
  updateChapter: ReturnType<typeof useUpdateScenarioChapter>;
  assets: Asset[];
  onCreateAsset?: (name: string, type: AssetType) => void;
  dismissedMissingNames?: Set<string>;
  onDismissMissing?: (name: string) => void;
}

function ChapterCard({
  chapter,
  projectId,
  panelsTarget,
  isOpen,
  onToggle,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
  isReordering,
  updateChapter,
  assets,
  onCreateAsset,
  dismissedMissingNames,
  onDismissMissing,
}: ChapterCardProps) {
  const { toast } = useToast();
  const chapterAI = useScenarioAI();

  // Local editing state
  const [content, setContent] = useState(chapter.content ?? "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chapter.title);

  // IA Chapitre state
  const [chapterAIPrompt, setChapterAIPrompt] = useState("");
  const [chapterAIResult, setChapterAIResult] = useState<string | null>(null);

  // Mode Aperçu (surlignage assets) vs Édition
  const [previewMode, setPreviewMode] = useState(false);

  // Sync if data changes externally
  useEffect(() => {
    setContent(chapter.content ?? "");
  }, [chapter.content]);

  useEffect(() => {
    if (!editingTitle) setTitleDraft(chapter.title);
  }, [chapter.title, editingTitle]);

  const isDirty = content !== (chapter.content ?? "");

  // ── Save content ────────────────────────────────────────────

  const saveContent = useCallback(() => {
    updateChapter.mutate(
      { id: chapter.id, projectId, updates: { content } },
      {
        onSuccess: () => toast({ title: "Chapitre sauvegardé" }),
        onError: (err) =>
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  }, [chapter.id, content, projectId, updateChapter, toast]);

  // ── Save title ──────────────────────────────────────────────

  const saveTitle = useCallback(() => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(chapter.title);
      setEditingTitle(false);
      return;
    }
    if (trimmed === chapter.title) {
      setEditingTitle(false);
      return;
    }
    updateChapter.mutate(
      { id: chapter.id, projectId, updates: { title: trimmed } },
      {
        onSuccess: () => {
          toast({ title: "Titre mis à jour" });
          setEditingTitle(false);
        },
        onError: (err) =>
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  }, [chapter.id, chapter.title, titleDraft, projectId, updateChapter, toast]);

  // ── Keyboard shortcut (Ctrl+S) ─────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty) saveContent();
      }
    },
    [isDirty, saveContent]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="rounded-xl border border-border bg-card/50 overflow-hidden transition-colors hover:bg-card/80">
        {/* Header */}
        <div className="flex items-center w-full gap-1 px-4 py-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center flex-1 min-w-0 gap-3 text-left"
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
              <span className="text-sm text-muted-foreground font-mono w-6 shrink-0">
                {String(chapter.chapter_number).padStart(2, "0")}
              </span>
              <span className="flex-1 font-medium text-base truncate">
                {chapter.title}
              </span>
              {chapter.content && (
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {chapter.content.length.toLocaleString()} car.
                </span>
              )}
            </button>
          </CollapsibleTrigger>

          {/* Boutons réordonnancement */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              disabled={!onMoveUp || isReordering}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Monter"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!onMoveDown || isReordering}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Descendre"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expanded content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
            {/* Title editing */}
            <div className="flex items-center gap-2">
              {editingTitle ? (
                <>
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitle();
                      if (e.key === "Escape") {
                        setTitleDraft(chapter.title);
                        setEditingTitle(false);
                      }
                    }}
                    className="h-9 text-base flex-1"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={saveTitle}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTitleDraft(chapter.title);
                      setEditingTitle(false);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold flex-1">
                    {chapter.title}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTitle(true);
                    }}
                    className="h-8 w-8 p-0"
                    title="Renommer"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </>
              )}
            </div>

            {/* Estimation panels (contrôle longueur) */}
            {chapter.content && (
              <p className="text-xs text-muted-foreground">
                Estimation : <strong>{estimatePanelCount(chapter.content)}</strong> panels
                {" · "}
                Cible : <strong>{panelsTarget ?? PANELS_REFERENCE_PER_CHAPTER}</strong> panels
              </p>
            )}

            {/* ── IA Chapitre (visible dès l'ouverture) ──────── */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-sm font-medium">
                  IA Chapitre
                </span>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                  Éditeur · pour le lecteur
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Améliorez ce chapitre pour le <strong>lecteur</strong> : rythme,
                dialogues, tension, fluidité. L'IA ne touche qu'à ce chapitre.
              </p>
              <div className="flex gap-2">
                <Input
                  value={chapterAIPrompt}
                  onChange={(e) => setChapterAIPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (chapterAIPrompt.trim() && content.trim()) {
                        chapterAI.mutate(
                          {
                            mode: "chapter",
                            prompt: chapterAIPrompt.trim(),
                            chapter_title: chapter.title,
                            chapter_content: content,
                            chapter_number: chapter.chapter_number,
                          },
                          {
                            onSuccess: (data) => {
                              setChapterAIResult(data.text);
                              toast({ title: "Chapitre révisé par l'IA" });
                            },
                            onError: (err) =>
                              toast({
                                title: "Erreur IA",
                                description: err.message,
                                variant: "destructive",
                              }),
                          }
                        );
                      }
                    }
                  }}
                  placeholder="Ex : « Allonger la scène du duel, plus de dialogues »"
                  className="h-9 text-sm flex-1"
                  disabled={chapterAI.isPending}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 shrink-0"
                  disabled={
                    chapterAI.isPending ||
                    !chapterAIPrompt.trim() ||
                    !content.trim()
                  }
                  onClick={() => {
                    chapterAI.mutate(
                      {
                        mode: "chapter",
                        prompt: chapterAIPrompt.trim(),
                        chapter_title: chapter.title,
                        chapter_content: content,
                        chapter_number: chapter.chapter_number,
                      },
                      {
                        onSuccess: (data) => {
                          setChapterAIResult(data.text);
                          toast({ title: "Chapitre révisé par l'IA" });
                        },
                        onError: (err) =>
                          toast({
                            title: "Erreur IA",
                            description: err.message,
                            variant: "destructive",
                          }),
                      }
                    );
                  }}
                >
                  {chapterAI.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              {!content.trim() && (
                <p className="text-sm text-amber-500">
                  Écrivez d'abord du contenu dans le chapitre pour utiliser l'IA.
                </p>
              )}

              {/* Résultat IA Chapitre — diff visuel & accepter / rejeter */}
              {chapterAIResult && (
                <div className="space-y-2 rounded-lg border border-primary/20 bg-background/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      Version proposée par l'IA :
                    </p>
                    <TextDiffLegend />
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded bg-muted/30 p-3 border border-border/30">
                    <TextDiff
                      oldText={content}
                      newText={chapterAIResult}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 gradient-primary text-primary-foreground"
                      onClick={() => {
                        setContent(chapterAIResult);
                        setChapterAIResult(null);
                        setChapterAIPrompt("");
                        toast({
                          title: "Version acceptée",
                          description:
                            "N'oubliez pas de sauvegarder le chapitre.",
                        });
                      }}
                    >
                      <Check className="h-3 w-3" />
                      Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setChapterAIResult(null)}
                    >
                      <X className="h-3 w-3" />
                      Rejeter
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Panneau éléments non créés (entre IA et édition) */}
            {content.trim() && (
              <MissingAssetsPanel
                text={content}
                assets={assets}
                onCreateAsset={onCreateAsset}
                dismissedMissingNames={dismissedMissingNames}
                onDismiss={onDismissMissing}
              />
            )}

            {/* Toggle Édition / Aperçu */}
            <div className="flex items-center gap-2">
              <Button
                variant={previewMode ? "outline" : "default"}
                size="sm"
                onClick={() => setPreviewMode(false)}
                className={`gap-1.5 h-8 ${!previewMode ? "gradient-primary text-primary-foreground" : ""}`}
              >
                <PenLine className="h-3.5 w-3.5" />
                Édition
              </Button>
              <Button
                variant={previewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(true)}
                className={`gap-1.5 h-8 ${previewMode ? "gradient-primary text-primary-foreground" : ""}`}
              >
                <Eye className="h-3.5 w-3.5" />
                Aperçu
              </Button>
              {previewMode && assets.length === 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  Aucun asset dans ce projet — créez-en dans l'onglet Assets
                </span>
              )}
            </div>

            {/* Content : Textarea (édition) ou Highlighter (aperçu) */}
            {previewMode ? (
              <div className="rounded-lg border border-border bg-background/80 p-4 min-h-[200px]">
                {content.trim() ? (
                  <ScenarioTextHighlighter
                    text={content}
                    assets={assets}
                    onCreateAsset={onCreateAsset}
                    dismissedMissingNames={dismissedMissingNames}
                    onDismissMissing={onDismissMissing}
                  />
                ) : (
                  <p className="text-muted-foreground italic">
                    Aucun contenu à afficher. Passez en mode Édition pour écrire.
                  </p>
                )}
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez le contenu de ce chapitre ici… Vous pouvez aussi coller du texte (Ctrl+V)."
                rows={12}
                className="resize-y min-h-[200px] text-base leading-relaxed"
              />
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRequestDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>

              <div className="flex items-center gap-2">
                {isDirty && (
                  <span className="text-sm text-amber-500">
                    Modifications non sauvegardées
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={saveContent}
                  disabled={!isDirty || updateChapter.isPending}
                  className="gap-1.5 gradient-primary text-primary-foreground"
                >
                  <Save className="h-3.5 w-3.5" />
                  {updateChapter.isPending ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {previewMode
                ? "Passez en mode Édition pour modifier le texte."
                : "Raccourci : Ctrl+S pour sauvegarder rapidement."}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
