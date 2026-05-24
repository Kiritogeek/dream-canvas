import type { ProgressiveMenuStep } from "@/lib/progressiveOnboardingStorage";
import { PROJECT_MENU_LABEL } from "@/lib/projectMenuLabels";

/** Titre bulle = entrée menu (sidebar) courante. */
export const ARIANE_TAB_TOUR_MENU_HEADING: Record<ProgressiveMenuStep, string> = {
  scenario: PROJECT_MENU_LABEL.scenario,
  assets: PROJECT_MENU_LABEL.assets,
  universe: PROJECT_MENU_LABEL.universe,
  edition: PROJECT_MENU_LABEL.edition,
};

export type ArianeTabTourStep = {
  title: string;
  /** Phrases enrichies avec **segments en gras** (voir onboardingBoldText). */
  paragraphs: readonly string[];
};

const SCENARIO: ArianeTabTourStep[] = [
  {
    title: "À quoi sert cet onglet ?",
    paragraphs: [
      "Il est important lors de la création d’une histoire d’avoir un **scénario** auquel se rattacher lorsqu’on crée une Œuvre, c’est exactement à quoi va servir cet onglet.",
    ],
  },
  {
    title: "Cadrer votre histoire",
    paragraphs: [
      "En créant des **chapitres scénaristiques**, cela vous permettra de cadrer votre Œuvre, la cohérence de votre histoire ainsi que la création des **éléments récurrents** de votre histoire qui seront utilisés lors de l’Édition de celui-ci.",
    ],
  },
  {
    title: "La détection des Assets",
    paragraphs: [
      "Un **asset** est un élément détecté comme récurrent dans votre histoire. Il est important que tous les assets détectés dans votre scénario soient soit **créés** soit **non créés**.",
      "Ainsi, vous disposerez d’éléments fixes réutilisables lors de la génération de vos futures cases dans l’**Édition**.",
    ],
  },
  {
    title: "Découper votre scénario",
    paragraphs: [
      "Si vous passez au **plan Créateur**, vous aurez la possibilité de **découper votre scénario en blocs**. Vous pouvez les valider pour qu’ils apparaissent dans l’Édition — ils vous faciliteront la tâche lors de la construction de vos chapitres.",
    ],
  },
  {
    title: "L’Univers guide l’IA",
    paragraphs: [
      "L’**IA Scénario** connaît déjà votre Univers : personnages, lieux, objets que vous y avez ajoutés sont injectés automatiquement dans sa mémoire.",
      "**Générez votre Chapitre 1** — l’IA s’appuiera sur ces fondations pour rester cohérente.",
    ],
  },
  {
    title: "Créer votre 1er chapitre",
    paragraphs: [
      "**Créez un chapitre** par vous-même ou utilisez l’**IA Scénario** pour vous en générer un automatiquement.",
      "Dès qu’un chapitre existe, je lierai automatiquement chaque élément de votre Univers au chapitre où il **apparaît pour la première fois**.",
    ],
  },
];

const ASSETS: ArianeTabTourStep[] = [
  {
    title: "Donner un visage à votre scénario",
    paragraphs: [
      "Dans le **Scénario**, vous avez identifié les éléments récurrents de votre histoire — personnages, décors, objets.",
      "C’est ici que vous leur donnez une **image cohérente avec le style de votre projet**, pour qu’ils restent reconnaissables case après case.",
    ],
  },
  {
    title: "Créer une fiche, lancer une génération",
    paragraphs: [
      "**Créez un asset**, choisissez son type (personnage, décor, objet) et décrivez-le.",
      "Lancez ensuite une **génération** — l’IA produit une image alignée sur votre style. Cette image devient votre **repère visuel** réutilisable lors de la composition des cases dans l’**Édition**.",
    ],
  },
  {
    title: "Débloquer l’Édition",
    paragraphs: [
      "Dès qu’**au moins un asset possède une image**, l’onglet **Édition** s’ouvre.",
      "C’est là que style, univers, scénario et assets se réunissent pour composer vos cases, une par une.",
    ],
  },
];

const UNIVERSE: ArianeTabTourStep[] = [
  {
    title: "Votre Univers, depuis votre synopsis",
    paragraphs: [
      "J’ai analysé le **synopsis** que vous avez écrit à la création du projet. Je vous propose les **personnages, lieux et objets** que j’y ai détectés — acceptez-les pour les ajouter à votre Univers en un clic.",
      "Plus votre synopsis est détaillé, plus mes propositions sont précises.",
    ],
  },
  {
    title: "Enrichir chaque fiche",
    paragraphs: [
      "Chaque élément de l’Univers dispose d’une **fiche Lore** : décrivez l’apparence, les motivations, les relations.",
      "Ces descriptions sont injectées directement dans l’**IA de génération de scénario** — vos personnages resteront cohérents chapitre après chapitre.",
    ],
  },
  {
    title: "Le lien avec vos chapitres",
    paragraphs: [
      "Quand vous écrirez votre scénario, je détecterai **à quel chapitre chaque élément apparaît pour la première fois** et mettrai à jour sa fiche automatiquement.",
      "**Enrichissez votre Univers maintenant** pour déverrouiller l’onglet **Scénario**.",
    ],
  },
];

const EDITION: ArianeTabTourStep[] = [
  {
    title: "Construire chapitre par chapitre",
    paragraphs: [
      "C’est ici que votre webtoon prend forme. Pour chaque **chapitre**, vous composez des **cases** : ajoutez des **blocs image**, des **blocs couleur** et des **bulles de dialogue**.",
      "Si vous avez découpé votre scénario en blocs, ils apparaissent directement dans l’éditeur pour vous guider case par case.",
    ],
  },
  {
    title: "Tout ce que vous avez construit, ici",
    paragraphs: [
      "Lors de la génération d’un bloc image, l’IA s’appuie sur votre **style** et vos **assets** pour produire des visuels cohérents avec tout ce que vous avez défini.",
      "Chaque case peut être générée, ajustée ou remplacée à tout moment — la composition reste **entièrement entre vos mains**.",
    ],
  },
  {
    title: "L’histoire est entre vos mains",
    paragraphs: [
      "Vous avez posé le **style**, ancré votre **Univers**, créé vos **assets** et écrit le **scénario**. Le reste s’écrit ici, case après case.",
      "Je reste disponible dans le fil **Ariane** pour signaler les incohérences au fil de votre récit.",
    ],
  },
];

export const ARIANE_TAB_TOUR_BY_STEP: Record<ProgressiveMenuStep, ArianeTabTourStep[]> = {
  universe: UNIVERSE,
  scenario: SCENARIO,
  assets: ASSETS,
  edition: EDITION,
};
