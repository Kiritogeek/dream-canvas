import type { ProgressiveMenuStep } from "@/lib/progressiveOnboardingStorage";
import { PROJECT_MENU_LABEL } from "@/lib/projectMenuLabels";

/** Titre bulle = entrée menu (sidebar) courante. */
export const ARIANE_TAB_TOUR_MENU_HEADING: Record<ProgressiveMenuStep, string> = {
  assets: PROJECT_MENU_LABEL.assets,
  universe: PROJECT_MENU_LABEL.universe,
  scenario: PROJECT_MENU_LABEL.scenario,
  edition: PROJECT_MENU_LABEL.edition,
};

export type ArianeTabTourStep = {
  title: string;
  /** Phrases enrichies avec **segments en gras** (voir onboardingBoldText). */
  paragraphs: readonly string[];
};

const ASSETS: ArianeTabTourStep[] = [
  {
    title: "Donner un visage à votre histoire",
    paragraphs: [
      "Vous avez défini votre **style**. C'est maintenant que vous créez les **assets** — les éléments visuels récurrents de votre histoire : personnages, décors, objets.",
      "Chaque asset génère une image **alignée sur votre style**, pour rester reconnaissable case après case.",
    ],
  },
  {
    title: "Créer une fiche, lancer une génération",
    paragraphs: [
      "**Créez un asset**, choisissez son type (personnage, décor, objet) et décrivez-le.",
      "Lancez ensuite une **génération** — l'IA produit une image cohérente avec votre style. Cette image devient votre **repère visuel** réutilisable dans l'**Édition**.",
    ],
  },
  {
    title: "Débloquer l'Univers et le Scénario",
    paragraphs: [
      "Dès qu'**au moins un asset possède une image**, les onglets **Univers** et **Scénario** s'ouvrent.",
      "L'Univers vous permet d'enrichir les fiches de vos éléments. Le Scénario, d'écrire votre histoire avec ces fondations.",
    ],
  },
];

const UNIVERSE: ArianeTabTourStep[] = [
  {
    title: "Ancrer vos assets dans l'histoire",
    paragraphs: [
      "Vos assets ont un visage. C'est ici que vous leur donnez une **profondeur narrative** : décrivez l'apparence, les motivations, les relations de chaque élément dans sa **fiche Lore**.",
      "J'ai aussi analysé votre synopsis — je vous propose les éléments que j'y ai détectés, acceptez-les en un clic.",
    ],
  },
  {
    title: "L'Univers guide l'IA Scénario",
    paragraphs: [
      "Chaque description que vous écrivez dans une fiche Lore est **injectée automatiquement** dans l'IA de génération de scénario.",
      "Plus votre Univers est détaillé, plus vos personnages resteront cohérents **chapitre après chapitre**.",
    ],
  },
  {
    title: "Le lien avec vos chapitres",
    paragraphs: [
      "Quand vous écrirez votre scénario, je détecterai **à quel chapitre chaque élément apparaît pour la première fois** et mettrai à jour sa fiche automatiquement.",
      "**Enrichissez votre Univers maintenant** — l'IA Scénario s'en souviendra dès le Chapitre 1.",
    ],
  },
];

const SCENARIO: ArianeTabTourStep[] = [
  {
    title: "L'Univers guide l'IA",
    paragraphs: [
      "L'**IA Scénario** connaît déjà vos assets et votre Univers : personnages, lieux, objets que vous y avez ajoutés sont injectés automatiquement dans sa mémoire.",
      "**Générez votre Chapitre 1** — l'IA s'appuiera sur ces fondations pour rester cohérente.",
    ],
  },
  {
    title: "Cadrer votre histoire",
    paragraphs: [
      "En créant des **chapitres scénaristiques**, vous cadrez votre Œuvre et la cohérence de votre histoire.",
      "Chaque chapitre devient ensuite la source de vérité pour générer les cases dans l'**Édition**.",
    ],
  },
  {
    title: "Découper votre scénario",
    paragraphs: [
      "Si vous passez au **plan Créateur**, vous aurez la possibilité de **découper votre scénario en blocs**. Vous pouvez les valider pour qu'ils apparaissent dans l'Édition — ils vous faciliteront la tâche lors de la construction de vos chapitres.",
    ],
  },
  {
    title: "Créer votre 1er chapitre",
    paragraphs: [
      "**Créez un chapitre** par vous-même ou utilisez l'**IA Scénario** pour vous en générer un automatiquement.",
      "Dès qu'un chapitre existe, je lierai automatiquement chaque élément de votre Univers au chapitre où il **apparaît pour la première fois**.",
    ],
  },
];

const EDITION: ArianeTabTourStep[] = [
  {
    title: "Construire chapitre par chapitre",
    paragraphs: [
      "C'est ici que votre webtoon prend forme. Pour chaque **chapitre**, vous composez des **cases** : ajoutez des **blocs image**, des **blocs couleur** et des **bulles de dialogue**.",
      "Si vous avez découpé votre scénario en blocs, ils apparaissent directement dans l'éditeur pour vous guider case par case.",
    ],
  },
  {
    title: "Tout ce que vous avez construit, ici",
    paragraphs: [
      "Lors de la génération d'un bloc image, l'IA s'appuie sur votre **style** et vos **assets** pour produire des visuels cohérents avec tout ce que vous avez défini.",
      "Chaque case peut être générée, ajustée ou remplacée à tout moment — la composition reste **entièrement entre vos mains**.",
    ],
  },
  {
    title: "L'histoire est entre vos mains",
    paragraphs: [
      "Vous avez posé le **style**, créé vos **assets**, ancré votre **Univers** et écrit le **scénario**. Le reste s'écrit ici, case après case.",
      "Je reste disponible dans le fil **Ariane** pour signaler les incohérences au fil de votre récit.",
    ],
  },
];

export const ARIANE_TAB_TOUR_BY_STEP: Record<ProgressiveMenuStep, ArianeTabTourStep[]> = {
  assets: ASSETS,
  universe: UNIVERSE,
  scenario: SCENARIO,
  edition: EDITION,
};
