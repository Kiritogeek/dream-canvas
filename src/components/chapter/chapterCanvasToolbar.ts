import { cn } from "@/lib/utils";

/** Conteneur commun des barres flottantes (bulles, blocs) sur le canvas d’édition. */
export const CHAPTER_CANVAS_TOOLBAR_SURFACE =
  "inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl text-foreground shadow-[0_12px_40px_-14px_hsl(var(--lavender)/0.38),0_2px_8px_-2px_hsl(270_22%_14%/0.07)] ring-1 ring-foreground/[0.04]";

/** Séparateur vertical entre groupes d’actions (même hauteur que les boutons h-8). */
export const CHAPTER_CANVAS_TOOLBAR_SEP_CLASS =
  "w-px h-6 self-center bg-gradient-to-b from-transparent via-border to-transparent shrink-0 opacity-90";

const TOOLBAR_CONTROL_H = "h-8";

/** Champs texte / nombre dans la barre (hauteur alignée sur les boutons icône). */
export const CHAPTER_CANVAS_TOOLBAR_FIELD_CLASS = `${TOOLBAR_CONTROL_H} rounded-lg border border-border/80 bg-background/90 text-xs px-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50`;

/**
 * Bouton carré 32×32 (icône seule) — état actif / inactif, variante danger pour supprimer.
 */
export function chapterCanvasToolbarIconButtonClass(
  active: boolean,
  variant: "default" | "danger" = "default",
): string {
  if (variant === "danger") {
    return cn(
      "h-8 w-8 flex items-center justify-center rounded-lg border transition-all duration-150 shrink-0",
      "hover:shadow-sm active:scale-[0.97]",
      "border-destructive/30 bg-destructive/[0.06] text-destructive hover:bg-destructive/15 hover:border-destructive/50",
    );
  }
  return cn(
    "h-8 w-8 flex items-center justify-center rounded-lg border text-foreground/85 transition-all duration-150 shrink-0",
    "hover:bg-muted/70 hover:border-border hover:shadow-sm active:scale-[0.97]",
    active
      ? "border-primary/70 bg-primary/18 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] font-medium"
      : "border-border/80 bg-background/90 text-foreground/75 hover:text-foreground",
  );
}

/** Bouton d’action principal (ex. IA) : même hauteur que les icônes, texte + icône. */
export const CHAPTER_CANVAS_TOOLBAR_PRIMARY_ACTION_CLASS = `${TOOLBAR_CONTROL_H} px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold text-primary-foreground gradient-primary shadow-sm transition-all hover:opacity-95 active:scale-[0.98]`;

/**
 * Largeur des colonnes d’icônes (gauche / droite). Le panneau latéral overlay doit utiliser
 * `CHAPTER_EDITOR_RAIL_PANEL_RIGHT_CLASS` pour rester aligné avec le rail droit.
 * Taille intermédiaire : lisible sans empiéter trop sur le canvas.
 */
export const CHAPTER_EDITOR_RAIL_ASIDE_CLASS =
  "w-14 sm:w-16 md:w-[4.375rem] lg:w-[4.625rem] shrink-0";

/** Position `right` du flyout droit (scénario / cases) pour qu’il reste collé au rail. */
export const CHAPTER_EDITOR_RAIL_PANEL_RIGHT_CLASS =
  "right-14 sm:right-16 md:right-[4.375rem] lg:right-[4.625rem]";

/**
 * Boutons des rails : carrés 1:1 (taille = largeur utile du rail − padding).
 */
export const CHAPTER_EDITOR_RAIL_BTN_BASE =
  "w-full aspect-square min-h-9 min-w-0 rounded-lg border flex items-center justify-center transition-colors duration-150 touch-manipulation shrink-0";
export const CHAPTER_EDITOR_RAIL_BTN_ACTIVE =
  "border-primary/70 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/10";
export const CHAPTER_EDITOR_RAIL_BTN_IDLE =
  "border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50";

/** Pastille de compte sur une icône du rail — chiffres lisibles au touch et sur petit DPI. */
export const CHAPTER_EDITOR_RAIL_COUNT_BADGE_CLASS =
  "absolute -top-1 -right-1 z-10 flex h-6 min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--lavender))] px-1.5 font-bold tabular-nums leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.28)] ring-2 ring-background text-xs border border-white/25";
