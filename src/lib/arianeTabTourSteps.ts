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
    title: "Créer votre 1er chapitre",
    paragraphs: [
      "**Créez un chapitre** par vous-même ou utilisez l’**IA Scénario** pour vous en générer un automatiquement.",
      "Après cela, accédez à l’onglet **Assets**.",
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
    title: "Débloquer l’Univers",
    paragraphs: [
      "Dès qu’**au moins un asset possède une image**, l’onglet **Univers** s’ouvre.",
      "Vous pourrez y poser les règles de votre monde et enrichir vos fiches — c’est ce socle que je lirai pour veiller à la **cohérence de votre récit** au fil des chapitres.",
    ],
  },
];

const UNIVERSE: ArianeTabTourStep[] = [
  {
    title: "Votre monde, derrière vos assets",
    paragraphs: [
      "Vos assets ont maintenant une image. L’**Univers** va plus loin : il pose les règles de votre monde et les détails de chaque fiche — motivations, alliances, lois de la fiction.",
      "C’est ce contexte que je lis pour repérer les **incohérences** avant qu’elles ne se propagent dans vos chapitres.",
    ],
  },
  {
    title: "Deux espaces d’écriture",
    paragraphs: [
      "Complétez la **zone « Monde »** pour les règles globales de votre fiction. Ouvrez ensuite chaque **asset** pour y ajouter motivations, factions ou usages.",
      "Plus vous renseignez, plus je peux vous signaler tôt ce qui risque de **tirer votre récit dans des directions différentes**.",
    ],
  },
  {
    title: "Débloquer l’Édition",
    paragraphs: [
      "**Enregistrez au moins un bloc de lore** — monde ou fiche — pour déverrouiller l’onglet **Édition**.",
      "C’est là que tout ce travail prend vie : **style, scénario, assets et univers** réunis pour composer vos cases.",
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
      "Vous avez posé le **style**, créé vos **assets**, écrit le **scénario** et ancré l’**Univers**. Le reste s’écrit ici, case après case.",
      "Je reste disponible dans le fil **Ariane** pour signaler les incohérences au fil de votre récit.",
    ],
  },
];

export const ARIANE_TAB_TOUR_BY_STEP: Record<ProgressiveMenuStep, ArianeTabTourStep[]> = {
  scenario: SCENARIO,
  assets: ASSETS,
  universe: UNIVERSE,
  edition: EDITION,
};
