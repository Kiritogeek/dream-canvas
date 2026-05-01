# Ariane — règles de mise en page (référence onboarding)

Ce document décrit **comment les éléments sont agencés** pour les écrans plein viewport de type **Ariane**, en prenant pour référence l’onboarding **`ArianeOnboardingCard`** et l’onboarding Style **`ArianeStyleOnboardingCard`**. Le **contenu textuel** (titres, paragraphes, libellé du bouton) est volontairement **hors scope** : il peut changer d’un écran à l’autre ; les **positions, empilements, contraintes de taille et comportements** ci-dessous restent la charte de layout.

**Implémentations de référence :**

- `src/components/ariane/ArianeOnboardingCard.tsx` (tableau de bord)
- `src/components/ariane/ArianeStyleOnboardingCard.tsx` (premier projet → Style)

**Forme de bulle (onboarding uniquement) :** ellipse de type **dialogue** **sans queue** — `SpeechBubbleShape` avec `type="speech"` et **`tailOn={false}`**, `viewBox` **`SPEECH_BUBBLE_VIEWBOX_NARRATION`** (`0 0 100 100`). Géométrie associée : **`layoutSpeechBubbleNoTailTextRect`** dans `src/components/chapter/speechBubbleTextAreaLayout.ts`.

> L’éditeur de cases conserve des bulles **avec queue** (`layoutSpeechBubbleWithTailTextRect`, `SPEECH_BUBBLE_VIEWBOX_WITH_TAIL`) ; ce fichier ne couvre que les overlays Ariane.

---

## 1. Conteneur global

- **Portail** sur `document.body`, overlay **`fixed inset-0`**, **`z-[200]`**.
- **`role="dialog"`**, **`aria-modal="true"`**, titre accessible via **`aria-labelledby`** (id sur le titre principal *dans* la bulle).
- **Flex principal**
  - **Mobile :** `flex-col-reverse` (ordre visuel : zone bulle au-dessus, bande personnage en bas ; le détail exact dépend de l’enfant `flex-1`).
  - **`md+` :** `flex-row`, `items-stretch`, hauteur viewport côté personnage **`md:h-[100dvh]`**.
- **Scroll body** désactivé le temps de l’affichage ; **focus** initial sur le bouton d’action principal après un court délai.
- **Échap** : `preventDefault` (ne ferme pas par défaut sans spec produit).

---

## 2. Calques (z-index)

Du fond vers l’avant :

| Élément | Position | z-index | Interactions |
|--------|----------|---------|----------------|
| Fond flou | `absolute inset-0` | sous les colonnes | `aria-hidden`, aucun clic |
| Colonnes contenu (personnage, bulle) | `relative` | `z-10` | normales |
| Bloc signature « Ariane » + baseline | `fixed` coin haut gauche | `z-[210]` | `pointer-events-none` |
| Bulle : SVG | `absolute` dans la boîte bulle | sous le texte | `pointer-events-none` |
| Bulle : zone scroll + contenu | `relative z-10` | au-dessus du SVG | clavier, scroll, boutons |

---

## 3. Fond (backdrop)

- Couche **`absolute inset-0`** sous tout le flex : **`background`** semi-transparent + **`backdrop-blur`**, variante un peu plus présente en **dark**.
- Ne capte pas les événements (les couches utiles sont au-dessus).

---

## 4. Bloc signature (nom + accroche)

- **Coin écran :** `fixed left-0 top-0`, **aligné à gauche**, **non cliquable**.
- **Marges :** `pl` avec **safe-area gauche**, `pr-4`, `pt` avec **safe-area haut**, puis `md:pt-6` / `lg:pt-8`.
- **Contenu typographique (structure, pas le wording figé) :**
  - Ligne 1 : **display** + **dégradé type `text-gradient`** + légers **drop-shadow** (lisibilité sur fond flou).
  - Ligne 2 : **sous-titre** plus petit, couleur **lavender** / ombre légère.
- **Largeur max** du bloc texte : ~`22rem` mobile, ~`26rem` `md+`.

Ce bloc est **indépendant** de la bulle : il reste ancré au viewport pour la reconnaissance de marque.

---

## 5. Colonne personnage

- **Mobile :** `flex-1`, **`justify-end`** pour pousser le visuel **vers le bas** de l’écran ; partage vertical avec la colonne bulle selon le flex.
- **`md+` :** colonne **largeur bornée** (`min(46vw, 520px)` puis `lg: min(42vw, 560px)`), **pleine hauteur** viewport, **`flex-none`** pour ne pas être écrasée.
- **Marges latérales / offsets** : `px-3` mobile, translations **négatives** sur `md+` pour chevauchement contrôlé avec la bulle (`-ml-*`, puis `-translate-x-*` sur le wrapper image).
- **Image (ou glyphe secours)** :
  - **Ancrage bas** : `object-bottom object-left`, **`justify-end`** sur le flex parent.
  - **Taille** : `h-auto` + **`max-h`** en `dvh` avec plafonds en px ; mobile `max-w` bornée, desktop image plus haute possible.
  - **Léger `translate-y`** vers le bas pour **manger l’espace** sous les pieds sans changer l’axe horizontal.
  - **Ombre** portée pour détacher du fond.

---

## 6. Colonne bulle

- **Flex `flex-1`**, **centrage** du bloc bulle : `items-center justify-center`.
- **Gouttière page :** `px-4 pb-8 pt-3`, puis **`md:px-6 md:py-8`**, **`lg:px-8`**.

### 6.1 Boîte bulle (ref géométrie)

- **`relative`**, **`mx-auto`**, **`w-full`**, **`max-w-[min(100%, 63rem)]`** (plafond largeur **enveloppe** ; le texte peut rester plus étroit, voir §7).
- **Décalage vers la droite** : `translate-x-3` → `md:translate-x-7` → `lg:translate-x-10` pour séparer visuellement du personnage.
- **`overflow-visible`** pour ne pas couper le **trait** du pourtour de l’ellipse.

### 6.2 SVG bulle (sans queue)

- **Une seule instance** SVG (plus de variante mobile/desktop pour une queue).
- **`absolute left-0 w-full`**, position verticale et hauteur via **`layoutSpeechBubbleNoTailTextRect`** (voir §8).
- **`viewBox`** : **`SPEECH_BUBBLE_VIEWBOX_NARRATION`** (`0 0 100 100`).
- **`preserveAspectRatio="none"`**, **`overflow="visible"`**.
- **`SpeechBubbleShape`** : `type="speech"`, **`tailOn={false}`** — rendu **ellipse** uniquement, alignée sur le même modèle corps qu’en éditeur mais **sans queue**.

### 6.3 Zone scroll interne (hauteur bulle « au contenu »)

- **`flex`**, **`items-center justify-center`** pour **centrer** le bloc de contenu quand il est plus petit que l’enveloppe.
- **Bornes** (à ajuster ensemble si la spec bulle change) :
  - **`min-h`** : `min(25.5rem, 51dvh)` pour l’onboarding dashboard ; variante plus haute possible pour Style si le média / copy est plus dense.
  - **`max-h`** : plafond avant **scroll vertical interne** (valeur selon composant).
- **Padding égal** sur les quatre côtés : **`p-10`** puis **`md:p-12`** (marges intérieures symétriques pour **centrage visuel** du corps).
- **`overflow-x` hidden**, **`overflow-y` auto**, **`overscroll-contain`**.

---

## 7. Emplacement contenu dans la bulle (slot)

*Le copy change ; la grille typographique ci-dessous est la référence.*

- **Conteneur principal** : **`flex flex-col`**, **`items-center`**, **`text-center`**, **`gap-5`** (`md:gap-6`).
- **Largeur du bloc texte (colonne de lecture)** : **`max-w-2xl`** (~42rem), **`w-full`**, **`min-w-0`** pour éviter les débordements flex — **indépendant** de la **`max-w`** de l’enveloppe (63rem) : la bulle peut être large, la **colonne de texte reste resserrée et centrée**.
- **Titre** : `font-display`, tailles **`text-lg` / `md:text-xl`**, **centré**, `id` unique pour **`aria-labelledby`**.
- **Corps** : taille **`text-sm` / `md:text-[0.9375rem]`**, **`leading`** ~1.45, **`text-pretty`**, **`text-muted-foreground`**. Phrases en **blocs** (`display block`) + **`space-y`** pour sauts de ligne lisibles si besoin.
- **Actions** : rangée **`justify-center`**, bouton principal **`gradient-primary`**, **`ref`** pour le focus ; **`pb`** minimal pour **safe-area bas** uniquement sur la rangée bouton.

---

## 8. Géométrie dynamique (ResizeObserver)

- **`bubbleBoxRef`** enveloppe **SVG + zone scroll** ; sa **taille mesurée** alimente **`bubbleGeom`**.
- **`layoutSpeechBubbleNoTailTextRect({ width, height })`** recalcule :
  - **`svgTopOffset`**, **`svgH`** (hauteur SVG **sans** coefficient 1,2 réservé à la queue éditeur),
  - dimensions de zone texte dérivées des mêmes **fractions** que la bulle *avec queue*, réexprimées pour un **`viewBox`** en **100** unités de haut.
- En onboarding, le texte est en **flux** dans la zone scroll, pas en position absolue figée sur ces hauteurs.
- **Repli avant mesure** : largeur / hauteur par défaut (ex. **810 × 630** ou **810 × 720** selon l’écran) pour un premier rendu cohérent.

---

## 9. Résumé des invariants produit / design

- **Trois piliers visuels** : backdrop → **personnage bas gauche/bande gauche** → **bulle centrée / décalée droite** + **signature Ariane haut gauche**.
- **Bulle onboarding** : **ellipse type dialogue, sans queue** ; **sans clip-path** qui tronque les boutons ; **padding égal** ; **contenu centré** ; **enveloppe** et **colonne texte** découplées (`max-w` bulle vs `max-w-2xl` contenu).
- **Tokens** et **français** dans l’UI ; accessibilité **dialog** + **focus** sur l’action principale.

---

## 10. Évolution

Pour un **nouvel écran Ariane** (autre onboarding, tutoriel, etc.) :

- Réutiliser cette **structure de calques** et les **bornes** bulle / personnage sauf décision produit contraire.
- Remplacer uniquement le **slot contenu** (titres, textes, CTA, éventuellement plusieurs boutons) en gardant **`max-w-2xl`** et le centrage si la densité de lecture doit rester identique à l’onboarding de référence.
- Conserver **sans queue** pour les overlays plein écran Ariane, sauf décision contraire.

---

*Ancien nom de fichier : `ArianeRules.md`.*
