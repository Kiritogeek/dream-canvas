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
    title: "Bibliothèque visuelle",
    paragraphs: [
      "Chaque fiche (**personnage, décor ou objet**) nourrit vos futures scènes. L’IA s’aligne sur le **style enregistré** pour garder une image cohérente avec le projet.",
    ],
  },
  {
    title: "Générer une première image",
    paragraphs: [
      "**Créez un asset**, décrivez le sujet puis lancez une génération. **Une image enregistrée sur la carte** sert de repère lorsque vous composerez les cases.",
    ],
  },
  {
    title: "Prochain jalons",
    paragraphs: [
      "Dès qu’**au moins un asset dispose d’une image**, l’onglet **Univers** se débloque pour lier votre intrigue à une **mémoire de monde ou de personnages**.",
    ],
  },
];

const UNIVERSE: ArianeTabTourStep[] = [
  {
    title: "Pourquoi remplir l’Univers",
    paragraphs: [
      "Le lore du **monde du projet** et les précisions sur vos fiches donnent un **socle commun** lorsque vos chapitres grossissent. **Je suis là, moi Ariane, pour vous épauler dans la cohérence de toute l’histoire** : alliances, règles du monde et détails qui doivent rester alignés tout au long du récit.",
    ],
  },
  {
    title: "Où écrire",
    paragraphs: [
      "Complétez la **zone « monde » du projet**, ou ouvrez un **asset déjà créé** pour détailler motivations, factions ou usages. **Je m’appuie sur ces écrits** pour vous aider à garder une **ligne droite avec le Scénario** — et repérer tôt ce qui pourrait tirer votre récit dans des directions différentes.",
    ],
  },
  {
    title: "Débloquer l’Édition",
    paragraphs: [
      "**Enregistrez** au minimum un bloc de lore : monde **ou** fiche. C’est cette **sauvegarde** qui déverrouille l’onglet **Édition** pour la mise en page des cases.",
    ],
  },
];

const EDITION: ArianeTabTourStep[] = [
  {
    title: "Votre atelier final",
    paragraphs: [
      "Construisez chaque **chapitre à publier** : **cases**, **images**, **bulles**. C’est là que votre webtoon devient lisible bloc par bloc.",
    ],
  },
  {
    title: "Réutiliser le travail déjà fait",
    paragraphs: [
      "Les **réglages réalisés jusqu’ici** (**style, Scénario, assets, lore**) gardent vos choix cohérents quand vous ajustez **chaque bloc** sous la main.",
    ],
  },
  {
    title: "Fin du tour guidé",
    paragraphs: [
      "**Vous êtes prêt à utiliser DreamWeave**, à vous y habituer et à prendre vos repères comme bon vous semble — **navigation**, mise en page, créativité progressive. Adaptez-vous au fil du projet et **exprimez votre personnalité** tout en vous appropriant les outils, à votre rythme, à travers **DREAMWEAVE**.",
    ],
  },
];

export const ARIANE_TAB_TOUR_BY_STEP: Record<ProgressiveMenuStep, ArianeTabTourStep[]> = {
  scenario: SCENARIO,
  assets: ASSETS,
  universe: UNIVERSE,
  edition: EDITION,
};
