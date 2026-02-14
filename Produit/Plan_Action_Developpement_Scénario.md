# Plan d'action — Section Scénario

> Récapitulatif du développement de la section Scénario (onglet Scénario) et des évolutions à prévoir.

---

## 1. Ce qui a été réalisé (février 2026)

### Phase A — Onglet et shell UI
- Onglet **Scénario** dans la page détail projet (à côté Style et Assets).
- Interface de base : zone pour l’IA Scénario, liste des chapitres, ouverture/fermeture des chapitres.

### Phase B — Modèles de données
- Table **`scenario_chapters`** : `id`, `project_id`, `user_id`, `chapter_number`, `title`, `content`, `created_at`, `updated_at`.
- Table **`scenario_versions`** : stockage des versions (ancienne / nouvelle) pour le flux accepter-rejeter de l’IA.
- RLS et index. Migration : `supabase/migrations/20260214200000_add_scenario_chapters.sql`.

### Phase C — Écriture / import du scénario
- Contenu des chapitres éditable directement (textarea par chapitre).
- Pas de « scénario monolithique » : **le scénario est la collection des chapitres**.

### Phase D — Structuration des chapitres
- Création, réorganisation (drag & drop), suppression de chapitres.
- Titres et numéros de chapitres.

### Phase E — IA Scénario et IA Chapitre
- **IA Scénario** : prompt utilisateur → génération de l’histoire chapitre par chapitre (sans champ « nombre de chapitres » ; structure Lieu / Scène / Dialogue-Action dans les system prompts).
- **IA Chapitre** : sur chaque chapitre, prompt → réécriture du chapitre uniquement.
- Edge Function `generate-scenario-ai` (Groq / Llama 3.3 70B), system prompts dédiés (`scenario.ts`, `chapter.ts`).
- Gestion de session (refresh token) et erreurs 401 côté client.

### Phase F — Diff visuel (accepter / rejeter)
- Comparaison **ancienne vs nouvelle** version (mot à mot) : texte supprimé (fond rouge), texte ajouté (fond vert), selon la charte graphique.
- Composant `TextDiff` + `TextDiffLegend`. Appliqué aux résultats IA Scénario et IA Chapitre.

### Phase G — Détection d’assets et création depuis le scénario
- **Assets détectés** : surbrillance des noms d’assets présents dans le texte (par type : personnage / décor / objet). **Hover** : image de l’asset (HoverCard, image responsive, ne débordant pas). **Clic** : popup (Dialog) avec les mêmes infos en grand pour une meilleure visualisation.
- **Éléments non créés** : détection des noms mentionnés (dialogues, majuscules) qui ne correspondent à aucun asset ; panneau d’avertissement « Personnages / éléments mentionnés non créés » au-dessus du toggle Édition / Aperçu ; surbrillance ambre dans l’aperçu.
- **Création d’asset depuis le scénario** : au survol d’un élément non créé (ou dans le panneau), choix du type (Personnage / Décor / Objet) → **navigation vers l’onglet Assets** avec ouverture du **dialog de création** pré-rempli (nom + type), sans création directe.
- **Sélection de texte** : en mode Aperçu, sélection d’un mot ou groupe de mots → menu flottant « Créer comme asset » (Personnage, Décor, Objet) → même navigation vers Assets avec nom pré-rempli.
- Précision de détection : frontières de mots (pas « ile » dans « silencieux », pas « Jean » dans « Jean-Pierre »), liste de stop-words pour éviter les faux positifs (Acte, Merci, Quand, Soudain, etc.).
- Composants : `ScenarioTextHighlighter`, `MissingAssetsPanel`, `CreateAssetHover`, `TextSelectionMenu`. Intégration dans `ScenarioSection`, `ProjectDetail` (onglets contrôlés, `pendingAssetName` / `pendingAssetType` vers `AssetLibrary`).

### Fichiers principaux
- **Frontend** : `src/pages/ProjectDetail.tsx`, `src/components/project/ScenarioSection.tsx`, `src/components/project/ScenarioTextHighlighter.tsx`, `src/components/ui/TextDiff.tsx`.
- **Services / hooks** : `src/services/scenarioAI.ts`, `src/hooks/useScenarioChapters.ts`, `src/hooks/useScenarioAI.ts`, `src/hooks/useAssets.ts`.
- **Backend** : `supabase/functions/generate-scenario-ai/` (index, system-prompts scenario.ts, chapter.ts), migrations `scenario_chapters` et `scenario_versions`.

---

## 2. À prévoir — Renommage d’assets et répercussion dans les chapitres

### Contexte
Lorsqu’un utilisateur **renomme un asset** (dans l’onglet Assets), l’ancien nom peut encore apparaître dans le **contenu texte des chapitres** de scénario. Sans mise à jour, la détection d’assets (surbrillance, hover, liste « éléments non créés ») ne reconnaîtra plus l’asset sous son nouveau nom et pourra afficher l’ancien nom comme « non créé ».

### Objectif
- **Détecter** toutes les occurrences de l’**ancien nom** de l’asset dans les chapitres du projet (champ `content` des `scenario_chapters`).
- **Proposer** (ou **appliquer**) le **remplacement** de l’ancien nom par le nouveau nom dans chaque chapitre concerné, pour garder la cohérence scénario ↔ assets.

### Tâches à prévoir

| Tâche | Description | Priorité |
|-------|-------------|----------|
| **Détection des chapitres impactés** | Lors du renommage d’un asset (ou avant validation), interroger les chapitres du projet et repérer ceux dont le `content` contient l’ancien nom (matching avec les mêmes règles que la détection actuelle : frontières de mots, casse). | P0 |
| **UI de confirmation** | Afficher une modale ou un panneau listant les chapitres concernés et le nombre d’occurrences. Proposer : « Remplacer [ancien nom] par [nouveau nom] dans ces chapitres » avec bouton **Appliquer** ou **Annuler**. | P0 |
| **Application du remplacement** | Mettre à jour le champ `content` des chapitres concernés (remplacement global ou ciblé selon le choix produit). Utiliser les mêmes règles de frontière que la détection pour éviter de remplacer au milieu d’un mot. | P0 |
| **Option « Toujours proposer »** | Paramètre (profil ou préférence projet) : lors d’un renommage d’asset, toujours ouvrir la proposition de mise à jour des chapitres si des occurrences sont trouvées. | P1 |

### Points techniques
- **Où déclencher** : dans le flux d’édition d’asset (AssetLibrary / AssetCard), après sauvegarde du nouveau nom ; ou en amont, avant validation, avec un écran « Ce renommage affecte N chapitre(s). Mettre à jour le texte ? ».
- **API** : soit une Edge Function « find & replace scenario by asset rename », soit côté client : récupérer les chapitres du projet, filtrer ceux contenant l’ancien nom, puis appeler `updateScenarioChapter` pour chaque chapitre modifié.
- **Performance** : pour les projets avec beaucoup de chapitres, préférer une recherche côté serveur (requête SQL avec `content ILIKE '%ancien_nom%'` ou full-text) pour ne pas charger tout le contenu en client.

---

*Dernière mise à jour : 14 février 2026*
