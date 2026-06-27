# Analyse — Cohérence des images générées (27 juin 2026)

> Méthode : 6 investigateurs spécialisés (Opus 4.8) sur le code réel + vérification adversariale des causes racines (10 vérifiées, **10 confirmées, 0 réfutée**). 43 findings.
> Question de Louis : « les images générées sont parfois incohérentes avec les assets » + « vérifie que tous les éléments fournis par l'utilisateur sont bien pris en compte » + recos UX/UI.

---

## 1. Réponse directe : pourquoi les images sont incohérentes

Ce n'est **pas** (seulement) une limite de FLUX. Il y a **des bugs de transmission réels** : une partie de ce que l'utilisateur fournit **n'arrive jamais au modèle**. Les 6 causes racines, par impact :

### 🔴 C1 — Le personnage est envoyé à FLUX sous forme de **planche 4 angles**, pas de portrait
`ChapterDetail.tsx` (`getAssetReferenceImageUrl`) envoie en priorité `image_url_sheet` (le strip composite 2560×768 = 4 vues) comme référence d'identité d'un personnage dans une case. FLUX Edit reçoit donc **une grille de 4 poses** comme « le personnage » → il reproduit une mise en page de fiche / multi-pose au lieu d'intégrer **un** personnage cohérent. Pire : le negative prompt interdit « reference sheet / grid / collage » → on demande au modèle **une chose et son contraire**.
→ **Cause directe d'incohérence visage/costume. Correctif ~1 ligne** (envoyer `image_url`, la face nette, et garder la sheet en dernier recours).

### 🔴 C2 — La **sélection d'assets de l'utilisateur n'atteint pas le générateur**
Trois ruptures cumulées :
- **La curation faite dans le Scénario est ignorée par l'éditeur.** `ChapterDetail` ne lit jamais `chapter_assets` (added/removed/skipped). Il relance une **détection brute par nom** sur le texte du bloc. Un faux positif que tu as retiré part quand même ; un asset ajouté manuellement (présent dans la scène mais pas écrit dans le prompt) **n'est pas envoyé**.
- **Aucun sélecteur d'assets pour une case.** La référence dépend de l'écriture **exacte** du nom dans le prompt. Si tu écris « elle entre » au lieu de « Yuki entre » → **zéro référence envoyée** → personnage redessiné de zéro.
- **`block.asset_refs` (drag-drop) est ignoré à la génération.** La sélection visuelle que l'utilisateur fait n'est pas utilisée ; seul le matching texte compte.
→ **C'est LA cause n°1 du ressenti « mes assets ne sont pas respectés ».**

### 🟠 C3 — Les **images de style du projet ne sont jamais envoyées aux cases**
`generate-panel-image` ne lit que `style_template` (texte), **pas** `style_image_urls`. Les **assets** sont stylés à partir des images de référence ; les **cases**, seulement à partir du texte. → écart de trait/palette/ombrage entre la bibliothèque d'assets et les cases finales (incohérence de style à l'échelle de la page).

### 🟠 C4 — La **grammaire visuelle (scene_type + effects) est perdue à la régénération d'un bloc seul**
« Tout générer » passe `scene_type`/`effects` (cadrage, speed lines, lighting) ; **régénérer un bloc seul ne les passe pas** (`useGeneratePanels`/`handleGenerateBlock` ne les forwardent pas). → « je régénère une case et le style/cadrage change ». **Correctif ~6 lignes.**

### 🟠 C5 — L'asset créé depuis le scénario a pour prompt **juste son nom**
`handleCreateAssetFromText` génère avec `prompt = name` (ex. « Marcus »). Aucune description (apparence, âge, vêtements, couleurs) → visuel **arbitraire** qui ne correspond jamais au récit. L'asset est **incohérent dès sa naissance**, et toutes les cases qui le référencent héritent de l'incohérence.

### 🟠 C6 — Détails aggravants (confirmés)
- **Désalignement nom↔image** : les noms et les URLs de référence sont construits par deux `.map` séparés puis tronqués différemment → un nom peut être associé à la mauvaise image (« CORRESPONDANCE DES RÉFÉRENCES » fausse).
- **Blocs `reference_*` du style jetés** : le template contient des ancres de style détaillées (`reference_character/background/scene`) **parsées mais jamais injectées** ; le style est tronqué à ~520-900 caractères.
- **3 images contradictoires en un appel** : la face mélange identité (réf réelle) + 1-2 images de style dans le même `image_urls` de FLUX Edit → rôles ambigus.
- **Preset manga** : droppe silencieusement les images de référence **et le toast affirme le contraire** (l'UI ment).
- **Continuité** : décidée par une heuristique cachée (`hasVisualLink`, ≥2 mots communs) → continuité aléatoire (faux positifs = contamination de la case suivante) ; peut aussi **pousser le nb de réfs > 5 et tronquer les assets**.

---

## 2. Les éléments utilisateur sont-ils réellement pris en compte ?

| Élément fourni par l'utilisateur | Génération **Asset** | Génération **Case** |
|---|---|---|
| Style (texte) | ✅ (tronqué ~900) | ✅ (tronqué ~520) |
| Images de style du projet | ✅ *(sauf manga : ❌ silencieux)* | ❌ **jamais transmises** (C3) |
| Image de référence d'un asset | ✅ *(mais mélangée au style)* | n/a |
| Sheet 4 angles | ✅ générée | ⚠️ envoyée **en strip** au lieu de la face (C1) |
| Assets choisis pour la case | n/a | ❌ **seulement si le nom est écrit** ; curation & `asset_refs` ignorés (C2) |
| Ancres de style `reference_*` | ❌ jetées | ❌ jetées (C6) |
| scene_type / effects | n/a | ⚠️ batch oui, **régén seule non** (C4) |
| Image précédente (continuité) | n/a | ⚠️ heuristique cachée, peut tronquer les assets (C6) |

**Conclusion** : non, plusieurs éléments clés (images de style en case, sélection d'assets, ancres de style, sheet correcte) **ne sont pas ou mal pris en compte**.

---

## 3. Plan de correction — cohérence image (priorisé)

### P0 — Quick wins à très fort impact
1. **C1** — `getAssetReferenceImageUrl` : envoyer `image_url` (face) au lieu de `image_url_sheet` pour les personnages en case. *(~1 ligne, ChapterDetail — param d'entrée, hors comportement canvas).*
2. **C4** — Forwarder `scene_type`/`effects` dans la régénération de bloc unique. *(~6 lignes : `usePanels` + `handleGenerateBlock`).*
3. **C6 (alignement)** — Construire les références en paires `{name, url}` filtrées une seule fois (fin du désalignement nom↔image).

### P1 — Correctifs de fond (cohérence réelle)
4. **C2** — Faire de la sélection d'assets la source de vérité : lire `chapter_assets` (curation) + `block.asset_refs`, fusionner avec la détection, intersecter, et **ajouter un sélecteur d'assets** dans la popover de case. *(client ; touche `ChapterDetail` — params, pas le comportement canvas → ton accord + QA).*
5. **C3** — Passer `style_image_urls` à `generate-panel-image` (avec libellé « style uniquement », budget 5 réfs respecté, drop manga). *(EF → redeploy).*
6. **C6 (réfs blocs)** — Injecter les blocs `reference_*` du template dans le prompt (asset + case), élargir le budget style. *(EF → redeploy).*
7. **C5** — Création d'asset depuis le scénario : pré-remplir une **description IA** (Groq/Gemini déjà dispo) à valider avant de générer, OU ne pas auto-générer.

### P2 — Robustesse
8. **C6 (FLUX 1 rôle/appel)** — Isoler identité et style : face = réf réelle seule + style en texte ; sheet = face seule. *(EF → redeploy).*
9. **manga** — Aligner l'UI sur la réalité (ne plus afficher « N réfs utilisées ») + appliquer `MANGA_RENDER_LOCK` aussi aux cases (sinon cases en couleur alors que assets N&B).
10. **continuité** — Baser la continuité sur `lieu`/`personnages` du découpage plutôt que le matching lexical ; réserver le slot continuité avant de tronquer les réfs assets.
11. **seed** (optionnel) — Seed persisté + boutons « Régénérer à l'identique » / « Nouvelle variation ».

---

## 4. Recommandations UX/UI (donner le contrôle & la visibilité)

- **P0 — Sélecteur d'assets explicite** dans la popover de case (liste cliquable + vignettes de sheet), **découplé du texte**. La détection par nom devient un pré-cochage. *(levier n°1 contre l'incohérence perçue).*
- **P0 — Rendre visible la « recette »** : au-dessus du bouton Générer, un récap « Cette génération utilise : Style X · N images de réf (vignettes) · Continuité ✓ · scene_type ». Tout ce que le code envoie déjà doit être montré → fin de l'effet boîte noire.
- **P1 — Diagnostic post-génération** : stocker dans l'historique les références réellement envoyées + bouton « Voir ce qui a été envoyé » et « Régénérer en ajustant les références ».
- **P1 — Continuité explicite** : toggle « Enchaîner avec la case précédente » (auto/forcé/off) + aperçu de la vignette.
- **P1 — Uniformiser le feedback** : compteur de secondes + estimation sur l'overlay de case (comme les assets), toast de démarrage détaillé.
- **P2 — Affordance des chips** : un clic = aperçu (pas suppression !) ; suppression réservée à la croix. *(actuellement cliquer un chip retire l'asset → réf perdue involontairement).*
- **P2 — Régénérer la sheet sans refaire la face** (zone Sheet System, impact backend).
- **P2 — Indicateur de cohérence par chapitre** : « % d'assets cités ayant un visuel » + alerte « X cases référencent des assets sans image ».

---

## 5. Autres pistes produit (cohérence transverse)

- **Maillon faible d'activation = création d'asset depuis le scénario** (C5) : c'est le pivot de la valeur (« webtoon en quelques heures ») et il produit aujourd'hui des assets sous-spécifiés. Le fiabiliser = gros gain de valeur perçue + économie de crédits.
- **Curation contractuelle de bout en bout** : ce que l'utilisateur valide en Scénario doit être exactement ce qui sert en case. Aujourd'hui les deux écrans divergent.
- **Validation de chapitre** : `canValidate` exige une image pour **tous** les assets détectés, **faux positifs compris** → friction. Baser sur la liste curatée.
- **Onboarding fil conducteur** Style→Univers→Scénario→Assets→Éditeur→Export avec état de complétion : beaucoup d'incohérences viennent d'un **ordre non respecté** (cases générées avant que le style/les assets soient prêts).
- **Export** (non audité ici) : à vérifier — rendu client canvas jusqu'à 100 000px, fidélité aperçu↔export.

---

> 📝 **Impact Mémoire** : la cohérence visuelle est **le différenciateur cœur** de DreamWeave (Sheet System). Ces correctifs (surtout C1, C2, C3) renforcent directement la proposition de valeur ; à refléter dans la section « Fonctionnalités / Différenciation » du mémoire une fois livrés.
