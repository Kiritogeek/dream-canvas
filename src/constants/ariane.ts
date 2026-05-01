/** Nom interface : assistance mémoire (NarraMind) + personnage d’onboarding — Produit/NarraMind-Guide-Personnage.md */
export const ARIANE_DISPLAY_NAME = "Ariane" as const;

/** Compte autorisé à relancer l’onboarding depuis le tableau de bord (recette / démo). Contrôle purement client. */
export const ARIANE_ONBOARDING_ADMIN_EMAIL = "kiritogeek@gmail.com" as const;

export const ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY =
  "dw.style_onboarding_pending_project_id" as const;

export const ARIANE_STYLE_ONBOARDING_STORAGE_KEY = "dw.ariane_style_onboarding_v1_dismissed" as const;

/** Après reset recette admin : le prochain projet créé déclenchera l’onboarding Style (session). */
export const ARIANE_STYLE_ONBOARDING_NEXT_CREATE_SESSION_KEY =
  "dw.pending_style_onboarding_next_project_v1" as const;

export const ARIANE_WELCOME_REPLAY_EVENT = "dw:ariane-welcome-replay";

/** Recette : après « Simuler première connexion », vaut `pending` puis l’id du projet créé — même compte avec plusieurs projets. */
export const ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY =
  "dw.forced_progressive_project_id" as const;

export const ARIANE_FORCED_PROGRESSIVE_PENDING = "pending" as const;
