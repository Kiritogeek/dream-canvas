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
    title: "À quoi sert cet onglet",
    paragraphs: [
      "Ici vous **écrivez et structurez votre histoire** : titres, scènes et dialogues. C’est ce texte qui guidera le découpage en cases et vos choix dans l’éditeur.",
    ],
  },
  {
    title: "Chapitres et rythme",
    paragraphs: [
      "Organisez le récit en **chapitres de scénario**. Pas besoin du texte définitif : un synopsis ou des repères suffisent tant que vous **sauvegardez vos idées**. Vous détaillerez plus tard, avec ou sans aide IA.",
    ],
  },
  {
    title: "Action concrète",
    paragraphs: [
      "**Créez un premier chapitre** avec un titre et un bloc de texte (même court). C’est ce qui permet de passer aux étapes visuelles du parcours.",
    ],
  },
  {
    title: "La suite dans le projet",
    paragraphs: [
      "Une fois **au moins un chapitre de scénario enregistré**, l’onglet **Assets** s’ouvre : vous pourrez générer personnages, décors et objets dans votre **style déjà validé**.",
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
