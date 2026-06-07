# Spec — Validation de chapitre en 3 étapes (Scénario IA)

> Décidée avec Louis le 2026-05-31. Remplace le toggle « Assets ON/OFF » opaque par un flux linéaire verrouillant : **Texte → Assets → Découpage**.
> Cible : `src/pages/ScenarioChapterEditor.tsx` + couche données.
> **Hors scope (zone gelée) :** `detect_blocks`, canvas (`ImageBlockLayer`, bulles, blocs couleur). Le découpage reste identique — on ne fait que le précéder d'un gate assets.

---

## 1. Problème résolu

Aujourd'hui :
- Les assets d'un chapitre sont **calculés à la volée** (regex sur les noms dans le texte) — rien n'est persisté (`assetsInChapter`, `ScenarioChapterEditor.tsx:585`).
- L'exigence « tous les assets générés » est **cachée** dans l'état désactivé du bouton `Valider le chapitre` (`canValidate`, ligne 595) + un toggle « Assets ON/OFF » que l'utilisateur ne comprend pas.

Conséquence : l'utilisateur ne sait pas pourquoi il ne peut pas valider, ni qu'il « impose » des assets par défaut.

---

## 2. Machine à états (3 étapes)

Dérivée de **2 marqueurs** sur `scenario_chapters` :
- `validated` (booléen, **existant**) → étape 1 franchie (texte verrouillé).
- `chapter_assets.validated` (dans le **nouveau** JSONB) → étape 2 franchie (assets verrouillés).

| Étape | Condition | Texte | Assets | FAB (bas-droite, on fait évoluer l'existant) |
|-------|-----------|-------|--------|----------------------------------------------|
| **EDIT** | `validated = false` | modifiable | — | `IA Chapitre` · `Valider le texte` |
| **ASSETS** | `validated = true` ET `chapter_assets.validated = false` | lecture seule (surligné) | **panneau curation** | `Déverrouiller le texte` · `Valider les assets` |
| **CUT** | `validated = true` ET `chapter_assets.validated = true` | lecture seule | lecture seule | `Modifier les assets` (→ retour ASSETS) · `Découper en cases` → `Créer & éditer` |

- `Valider le texte` = mutation `useValidateChapter` existante (`validated = true`).
- `Déverrouiller le texte` = `useUnvalidateChapter` existante (revient à EDIT, et remet `chapter_assets.validated = false`).
- `Modifier les assets` = remet `chapter_assets.validated = false` (revient à ASSETS).

---

## 3. Données — colonne JSONB `chapter_assets`

Migration (Louis applique manuellement) :
```sql
ALTER TABLE scenario_chapters
  ADD COLUMN chapter_assets JSONB NOT NULL DEFAULT '{"validated":false,"items":[]}'::jsonb;
```
RLS inchangée (déjà `auth.uid() = user_id` via le projet). Pas de nouvelle policy.

Forme :
```ts
type ChapterAssetStatus = "auto" | "added" | "removed" | "skipped";

interface ChapterAssetItem {
  asset_id: string;
  status: ChapterAssetStatus;
  linked_alias?: string; // mention textuelle liée manuellement à cet asset
}

interface ChapterAssetsState {
  validated: boolean;
  items: ChapterAssetItem[];
}
```

Sémantique des statuts :
- `auto` : détecté par matching nom, inclus par défaut.
- `removed` : faux positif retiré par l'utilisateur → exclu de la liste effective.
- `added` : ajouté manuellement depuis la bibliothèque (pas détecté dans le texte).
- `skipped` : détecté mais l'utilisateur choisit de **ne pas le générer** → ne compte plus comme « manquant », n'apparaît pas dans le découpage comme requis.

**Liste effective des assets du chapitre** (étape 2) =
`(assets auto-détectés par regex, sauf ceux marqués removed) ∪ (assets added)`.
Le `chapter_assets.items` ne stocke que les **décisions** de l'utilisateur (overrides) ; la détection auto reste calculée à la volée et fusionnée au chargement.

---

## 4. Étape 2 — Panneau de curation des assets

Layout proposé (à confirmer par Interface Architect) : **texte en lecture seule au centre (mentions surlignées via le `ScenarioTextHighlighter` existant) + panneau latéral droit « Assets du chapitre »**.

Chaque ligne d'asset affiche : vignette, nom, badge d'état (✓ généré · ⚠ manquant · ⊘ ignoré), et actions :
- **Générer** : génère l'image (réutiliser `useAssetGeneration` — vérifier `canGenerate()` avant FAL.ai, `refreshSession()` avant Edge Function).
- **Lier** : associer une mention textuelle non résolue à un asset existant → persiste `linked_alias`.
- **Ne pas générer** (skip) : `status = "skipped"`.
- **Retirer** : `status = "removed"` (faux positif).
- **Ajouter** : sélecteur depuis la bibliothèque d'assets du projet → `status = "added"`.

Avertissement (pas de blocage dur) : à `Valider les assets` ET à `Découper`, si des items sont « manquants » (ni générés ni skipped), afficher un avertissement (« X assets sans visuel — le découpage utilisera un placeholder ») mais **autoriser le passage**.

---

## 5. Suppression du toggle « Assets ON/OFF »

Retirer le bouton toggle Assets de la toolbar (`ScenarioChapterEditor.tsx` ~1162) et la logique `showAssets`. La curation d'assets passe exclusivement par l'étape 2.

---

## 6. Couches à implémenter (bas → haut)

1. **Migration** : `supabase/migrations/<ts>_chapter_assets.sql` (ci-dessus).
2. **`src/types/index.ts`** : `ChapterAssetStatus`, `ChapterAssetItem`, `ChapterAssetsState`.
3. **`src/integrations/supabase/types.ts`** : ajout du champ `chapter_assets` sur `scenario_chapters` (Row/Insert/Update).
4. **Hooks** :
   - `useChapterAssets(chapterId)` — lit/écrit `chapter_assets` (React Query, `onSuccess` invalide).
   - `useValidateChapterAssets` / `useUnvalidateChapterAssets` — bascule `chapter_assets.validated`.
   - réutiliser `useValidateChapter` / `useUnvalidateChapter` pour le texte.
5. **`ScenarioChapterEditor.tsx`** : machine à 3 états (remplace le booléen unique `isValidated`), évolution des FAB, suppression du toggle, rendu du panneau étape 2.
6. **`ChapterAssetCurationPanel.tsx`** (nouveau, Interface Architect) : panneau latéral de l'étape 2.

`canValidate` actuel → devient `canValidateText` (texte non vide uniquement). L'exigence « tous générés » quitte l'étape 1.

---

## 6bis. Itération 2026-05-31 (retours capture #3) — Ariane + collision UI

### A. Timing Ariane — validation bloquante
Aujourd'hui (`ScenarioChapterEditor.tsx:402-436`) : valider le texte → passage immédiat à l'étape 2, puis un **timer arbitraire de 10s** ouvre `ArianeAnalysisModal` *pendant* l'étape 2. Bug.

Nouveau comportement :
- `Valider le texte` ouvre **immédiatement** `ArianeAnalysisModal` en mode bloquant (loading réel), **avant** de marquer le chapitre validé.
- La modale lance `triggerCompassIndex` + `triggerCompassPropose` (déjà le cas) et signale la fin via un nouveau callback `onComplete`.
- À `onComplete` → `validateChapter.mutate` (passe `validated = true`) → l'étape passe à `assets`. La modale se ferme.
- Supprimer le timer 10s et le `useEffect` de transition. Supprimer les `console.log` Ariane.
- Erreur d'analyse → ne pas bloquer : proposer « Continuer quand même » qui valide et passe à l'étape 2 (les propositions existantes restent exploitables).
- Reformuler la modale : à la fin, « Analyse terminée, passons aux assets » (plus de renvoi vers le menu Univers).

### B. Étape 2 — section « À créer » dans le panneau
Le panneau de curation affiche désormais **deux sections** :
1. **Assets du chapitre** (existant) : assets détectés/ajoutés → générer / ignorer / retirer / lier.
2. **À créer** (nouveau) : éléments mentionnés mais sans asset. Source = **fusion** de :
   - noms des en-têtes de scène `> Personnages :` et `> Lieu :` sans asset correspondant (type déduit : Personnages→character, Lieu→location), dédupliqués ;
   - propositions Ariane `compass_proposals` (`proposal_type = 'lore_asset'`, `status = 'active'`) du projet.
   Fusion + dédup par nom (insensible casse/accents).

Action **« Créer l'asset »** (un clic) :
- crée l'asset dans la bibliothèque (`useAssets` create) avec nom + type déduit,
- puis lance **immédiatement** la génération FAL.ai (`useAssetGeneration`), après `canGenerate()` (sinon stop + toast quota) et `refreshSession()` avant l'Edge Function,
- à la création, l'asset bascule dans la section « Assets du chapitre » (`status = "added"`).

### C. Collision UI (flèche rouge)
Les FAB flottants (`fixed bottom-12 right-6`) chevauchent les boutons du panneau. Correctif (Interface Architect) :
- En étapes ASSETS et CUT, les **actions principales sont ancrées dans un footer du panneau** (sticky en bas du panneau), pas en FAB flottant.
- Les actions internes du panneau (Ajouter / Lier) vivent dans le corps/entête du panneau, plus dans la zone des FAB.
- Garder les FAB flottants uniquement en étape EDIT (où il n'y a pas de panneau).

---

## 6ter. Itération 2026-05-31 (retours capture #4-6) — Étape 2 « tout dans le texte »

Décision Louis : **supprimer le panneau latéral d'assets**. L'étape 2 garde la vue texte épurée (identique à la vue Écriture) ; la curation se fait **au survol des éléments surlignés** dans le texte. `ScenarioTextHighlighter` fait déjà 90% du travail (hover asset = image, ambre = non créé avec « Créer comme asset » / « Lier »).

### A. Layout étape 2
- Rendre le texte (lecture seule) via `ScenarioTextHighlighter`, plein écran, comme la vue Écriture. **Plus de `ChapterAssetCurationPanel`** (composant retiré de l'usage).
- Actions en **FAB flottants bas-droite** : `Valider les assets` + `Déverrouiller le texte`. **Pas de `IA Chapitre`** à l'étape 2. (Plus de panneau → plus de collision.)

### B. Deux états de surlignage (au lieu de la couleur par type)
- **Asset généré** (`image_url` présent) → surlignage normal (couleur par type actuelle) ; hover = image (déjà le cas).
- **Pas de visuel** (asset existant sans `image_url`, OU mention sans asset) → surlignage **ambre** ; hover affiche la bonne action :
  - asset existant non généré → bouton **`Générer`** (nouveau, via `useAssetGeneration`, `canGenerate()` avant FAL.ai) ;
  - mention sans asset → **`Créer l'asset`** (création + génération en un clic, déjà câblé via `onCreateAsset`).
- Le `ScenarioTextHighlighter` doit donc distinguer asset généré / non généré (nouveau type de fragment ou flag) et exposer un callback `onGenerateAsset(asset)`.

### C. Source « à créer » = en-têtes de scène ∪ Ariane (rappel 6bis.B)
Les noms d'en-têtes `> Personnages`/`> Lieu` sans asset + les `compass_proposals` lore_asset actives sont **ajoutés à l'ensemble ambre « à créer »** du surligneur (via une nouvelle prop, ex. `extraCreatableNames: string[]`), pour être surlignés même si le seuil de répétition de `detectMissingNames` ne les attrape pas. Les propositions Ariane sans correspondance dans le texte restent dans le menu Univers (non forcées ici).

### D. Header / footer (capture #6)
- À l'étape ASSETS, badge header = **`🔒 Texte`** (au lieu de `Assets`).
- Footer bas = **`Texte validé`** (au lieu de `Chapitre validé`).

### E. Données
- `chapter_assets.validated` reste le verrou de l'étape 2 (gate). Les décisions skip/lier réutilisent les mécanismes existants du surligneur (`dismissedMissingNames`, `wordMappings`/`onAssignWord`) — ne pas réinventer de couche. Persistance dans `chapter_assets.items` si direct, sinon conserver le comportement actuel.

---

## 7. Definition of Done

- `npx tsc --noEmit` 0 erreur · `npm test` 0 régression.
- RLS respectée · `canGenerate()` avant FAL.ai · `refreshSession()` avant Edge Function.
- Interface en français · tokens HSL / `.glass` (pas de couleur hardcodée) · pas d'em-dash UI.
- Zone canvas gelée non touchée.
- Migration NON appliquée automatiquement (Louis l'applique).
