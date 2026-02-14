# Plan d'action de développement — Section Scénario

**Objectif** : Ajouter la section « Scénario » comme **3ᵉ onglet** dans la page détail projet (après Style, Assets), puis implémenter les fonctionnalités décrites en Phase 2.1 de la roadmap.

**Références** : `07_Roadmap_Produit.md` (Phase 2.1), `11_Rapport_Chapitres_Flux_Blocs_Scenario.md`, `08_Modele_de_Donnees.md`.

---

## 1. Emplacement de l’onglet Scénario

**Fichier** : `src/pages/ProjectDetail.tsx`

**Composant** : le bloc d’onglets actuel est un `Tabs` (Radix) avec `TabsList` et `TabsTrigger` / `TabsContent`.

- **Ordre des onglets** : 1) Style — 2) Assets — **3) Scénario**.
- **Modifications** :
  - Ajouter un `<TabsTrigger value="scenario">Scénario</TabsTrigger>` après celui des Assets (ligne ~144).
  - Ajouter un `<TabsContent value="scenario">` qui rend le nouveau composant de la section Scénario (voir ci‑dessous).

**Aucun changement** sur les onglets Style et Assets ; seul un 3ᵉ onglet et son contenu sont ajoutés.

---

## 2. Vue d’ensemble des phases de développement

Le développement est découpé en **phases incrémentales** pour pouvoir livrer et tester au fur et à mesure. Chaque phase peut être validée avant de passer à la suivante.

| Phase | Contenu | Livrable |
|-------|--------|----------|
| **A** | Onglet + shell UI | Onglet « Scénario » visible, contenu minimal (titre + zone vide ou message « À venir »). |
| **B** | BDD — Scénario & chapitres de scénario | Tables/colonnes pour scénario et chapitres de scénario ; persistance des versions approuvées. |
| **C** | Écriture / import du scénario | Zone d’édition texte + import .txt / copier-coller ; sauvegarde liée au projet. |
| **D** | Chapitres (structure) + découpage Chapitre → Panels | Chapitres **correspondant** aux chapitres webtoon (1 = 1). Découpage **Chapitre → Panels** (liste + descriptions) dans la section Scénario ; règles de gestion à définir plus tard. |
| **E** | IA LLM — Scénario & Chapitre | IA Scénario (génération complète, nombre de chapitres), IA Chapitre (par chapitre), flux accepter/rejeter. |
| **F** | BDD — Versions & accepter/rejeter | Persistance ancienne vs nouvelle version pour comparaison et boutons Accepter / Rejeter. |
| **G** | Détection assets & éléments non créés | Surbrillance des assets mentionnés (hover = image) ; signalement des éléments « à créer ». |

Les phases **E** et **F** peuvent être partiellement entrelacées (ex. flux accepter/rejeter côté UI en E, persistance des versions en F). Les phases **G** (détection) peuvent venir après une première version utilisable de E/F.

---

## 3. Détail par phase

### Phase A — Onglet + shell (sans BDD, sans IA)

**But** : Afficher l’onglet « Scénario » et un contenu minimal.

**Fichiers à créer / modifier** :

1. **`src/pages/ProjectDetail.tsx`**
   - Dans le `TabsList` : ajouter après le `TabsTrigger` « Assets » :
     - `<TabsTrigger value="scenario" className="flex-1 sm:flex-none">Scénario</TabsTrigger>`
   - Après le `TabsContent` « assets », ajouter :
     - `<TabsContent value="scenario"><ScenarioSection projectId={project.id} project={project} /></TabsContent>`
   - Importer le composant : `import { ScenarioSection } from "@/components/project/ScenarioSection";`

2. **`src/components/project/ScenarioSection.tsx`** (nouveau)
   - Composant fonctionnel qui reçoit au minimum `projectId` et `project`.
   - Pour l’instant : titre « Scénario », sous-titre ou message du type « Écrivez ou importez votre histoire ici. » (pas encore de BDD ni d’IA).
   - **Prévoir dès maintenant la place** pour l’IA Scénario (zone visible dès l’entrée dans l’onglet) et, plus tard, pour la liste des chapitres de scénario (chaque chapitre ouvrable avec IA Chapitre visible à l’entrée). Ex. : bloc « Aide IA » ou « Générer avec l’IA » en haut ou en side panel, et zone « Chapitres » en dessous.
   - Structure de mise en page cohérente avec `StyleManager` / `AssetLibrary` (ex. carte `glass`, espacements).

**Critère de validation** : En cliquant sur l’onglet « Scénario », la section s’affiche sans erreur ; pas de régression sur Style et Assets.

---

### Phase B — BDD (scénario & chapitres de scénario, versions)

**But** : Pouvoir stocker le scénario et les chapitres de scénario, ainsi que les versions pour le flux accepter/rejeter.

**Décisions à trancher** (alignées avec `08_Modele_de_Donnees.md` et rapport 11) :

- **Scénario au niveau projet** : une ou plusieurs colonnes sur `projects` (ex. `scenario_text` TEXT, `scenario_chapters` JSONB pour titres + ordre / plages), **ou** une table dédiée `scenario_chapters` (project_id, chapter_number, title, content, …).
- **Versions approuvées** : soit une table `scenario_versions` (project_id, created_at, content snapshot, approved), soit un champ `projects.scenario_approved_at` + stockage de l’ancienne version en JSONB ou table d’historique.

**Tâches** :

1. Rédiger les migrations Supabase (création / altération des tables ou colonnes).
2. Mettre à jour les types TypeScript (ex. `database.types` ou types manuels) pour projet et scénario / chapitres / versions.
3. Exposer les données via des hooks (ex. `useProjectScenario(projectId)`, `useUpdateScenario`, `useScenarioVersions`) et, si besoin, des Edge Functions ou des appels Supabase directs depuis le client (avec RLS).
4. RLS : mêmes règles que pour le reste du projet (lecture/écriture selon `auth.uid() = user_id` ou `project_id` → `user_id`).

**Critère de validation** : Les champs/tables existent, les hooks permettent de lire/écrire le scénario (et chapitres/versions) pour un projet ; pas encore d’UI riche (peut rester un champ texte simple en Phase C).

---

### Phase C — Écriture / import du scénario

**But** : Zone d’édition du scénario + import par fichier .txt ou copier-coller.

**Fichiers principalement concernés** : `ScenarioSection.tsx`, éventuellement sous-composants (éditeur, zone d’import).

**Tâches** :

1. **Zone d’édition** : Textarea ou éditeur riche (ex. textarea avec sauvegarde auto ou bouton « Sauvegarder »), reliée au scénario du projet (lecture/écriture via les hooks de la Phase B).
2. **Import fichier** : bouton « Importer un fichier » → input `type="file"` acceptant `.txt` (et éventuellement autres formats plus tard). Lecture du fichier (FileReader ou équivalent), puis injection du texte dans la zone d’édition et sauvegarde (même endpoint/update que l’édition manuelle).
3. **Copier-coller** : le texte collé dans la zone d’édition est déjà géré par l’éditeur ; s’assurer que la sauvegarde persiste bien ce contenu.

**Critère de validation** : L’utilisateur peut écrire du texte, importer un .txt, coller du texte ; le contenu est persisté et rechargé à la réouverture du projet.

---

### Phase D — Chapitres de scénario (création / découpage, titres)

**But** : Structurer le scénario en **chapitres** correspondant aux chapitres webtoon (1 chapitre écrit = 1 chapitre webtoon), puis **découpage Chapitre → Panels** (liste + descriptions par panel) directement dans la section Scénario. Règles de gestion du découpage à définir plus tard.

**Tâches** :

1. **Modèle** : si pas encore fait en Phase B, finaliser le stockage des chapitres de scénario (table `scenario_chapters` ou structure JSONB sur `projects`).
2. **UI** :
   - Liste ou accordéon des « Chapitres de scénario » (titres, ordre).
   - Création d’un chapitre (titre), édition du titre, suppression, réordonnancement (drag & drop ou boutons monter/descendre).
3. **Lien avec le texte** : soit chaque chapitre a un bloc de texte (content) stocké, soit le scénario est un seul bloc et les chapitres ne sont que des marqueurs (titres + positions). Décision produit à respecter (voir rapport 11).

**Critère de validation** : L’utilisateur peut créer, renommer, réordonner et supprimer des chapitres de scénario ; la structure est persistée et réaffichée.

---

### Phase E — IA LLM (IA Scénario, IA Chapitre, accepter/rejeter)

**But** : Intégrer les deux agents LLM (IA Scénario pour l’histoire entière, IA Chapitre pour un chapitre) et le flux accepter/rejeter.

**Tâches** :

1. **Backend / API** :
   - Choisir le fournisseur (Groq, OpenRouter, Mistral, Google AI Studio, etc.) et le modèle (ex. Llama 3.3 70B).
   - Créer au moins une Edge Function Supabase (ou route API) pour :
     - **IA Scénario** : entrées = nombre de chapitres souhaité + prompt utilisateur ; sortie = texte de l’histoire (génération chapitre par chapitre ou en un bloc selon spec).
     - **IA Chapitre** : entrées = contenu actuel du chapitre + prompt de modification ; sortie = nouveau texte du chapitre.
   - Définir les **system prompts** pour chaque agent (rôle scénariste, contraintes, format de réponse).

2. **Frontend** :
   - **IA Scénario — visible dès l’entrée dans l’onglet Scénario** : bloc (zone ou panneau) visible **dès l’affichage** de la section Scénario, sans clic supplémentaire. Contenu : champ « Nombre de chapitres » + zone prompt + bouton « Générer l’histoire » (ou « Modifier avec l’IA ») → appel IA Scénario → affichage du résultat (nouveau texte). Modification par prompt (scénario entier) → affichage **côte à côte ou diff** ancienne vs nouvelle → Accepter / Rejeter.
   - **IA Chapitre — visible dès l’entrée dans un chapitre créé** : lorsqu’il ouvre un chapitre de scénario, l’utilisateur voit **immédiatement** un bouton ou panneau « Modifier avec l’IA » (IA Chapitre). Prompt de modification → réécriture du chapitre → affichage ancienne vs nouvelle → Accepter / Rejeter.
   - **Boutons Accepter / Rejeter** : Accepter = remplacer l’ancienne version par la nouvelle et persister ; Rejeter = revenir à l’ancienne. La persistance des versions (Phase F) doit être en place pour que Rejeter ait un sens.

**Critère de validation** : (1) À l’entrée dans l’onglet Scénario, l’IA Scénario est visible et utilisable. (2) À l’ouverture d’un chapitre de scénario, l’IA Chapitre est visible et utilisable. (3) Génération / modification, comparaison et Accepter/Rejeter fonctionnent une fois la BDD versions prête (Phase F).

---

### Phase F — BDD versions & flux accepter/rejeter

**But** : Persister les versions (ancienne / nouvelle) pour permettre comparaison et boutons Accepter / Rejeter.

**Tâches** :

1. Stocker côté backend la « version en cours d’édition » (nouvelle) et la « dernière version approuvée » (ancienne). Lors d’un Rejeter, réaffichage de l’ancienne et abandon de la nouvelle ; lors d’un Accepter, la nouvelle devient la version approuvée et est persistée (table ou champs dédiés, voir Phase B).
2. Adapter l’UI pour que la comparaison (ancienne vs nouvelle) utilise bien ces données et que Accepter/Rejeter mettent à jour l’état et la BDD.

**Critère de validation** : Après une modification par IA, Accepter enregistre la nouvelle version ; Rejeter restaure l’ancienne ; le rechargement de la page affiche la dernière version approuvée.

---

### Phase G — Détection des assets & éléments non créés

**But** : Dans l’éditeur de scénario, surligner les mentions d’assets existants (avec hover = image) et signaler les éléments mentionnés mais non créés comme assets.

**Tâches** :

1. **Détection des assets existants** : parcourir les noms (et éventuellement alias) des assets du projet ; repérer les occurrences dans le texte du scénario ; appliquer une surbrillance (style par type : personnage / décor / objet). Au survol d’une occurrence, afficher l’image de l’asset (tooltip / popover).
2. **Éléments non créés** : détection par règles (mots du texte non couverts par les assets) et/ou par un appel LLM léger (« quels personnages, décors, objets sont mentionnés dans ce passage ? »). Afficher une surbrillance « à créer » ou une liste « Éléments mentionnés non créés » avec lien vers la création d’assets.

**Critère de validation** : Les noms d’assets présents dans le scénario sont surlignés ; au hover, l’image s’affiche ; les éléments détectés comme manquants sont signalés.

---

## 4. Ordre recommandé et dépendances

```
Phase A (onglet + shell)
    ↓
Phase B (BDD scénario + chapitres + versions)
    ↓
Phase C (édition + import)  ← peut démarrer dès B en place
    ↓
Phase D (chapitres de scénario, structure)
    ↓
Phase E (IA Scénario / Chapitre)  ← nécessite B pour persister
Phase F (versions & accepter/rejeter)  ← peut être faite en parallèle ou juste avant E
    ↓
Phase G (détection assets + non créés)
```

- **A** doit être faite en premier (onglet visible).
- **B** est nécessaire pour C, D, E, F.
- **C** et **D** peuvent être développées après B, dans l’ordre ou en parallèle selon la priorité.
- **E** et **F** : F (persistance des versions) peut précéder ou accompagner E (appels IA + UI accepter/rejeter).
- **G** peut venir après une première version stable de E/F.

---

## 5. Récapitulatif des fichiers principaux

| Fichier | Rôle |
|---------|------|
| `src/pages/ProjectDetail.tsx` | Ajout du 3ᵉ onglet « Scénario » et du `TabsContent` vers `ScenarioSection`. |
| `src/components/project/ScenarioSection.tsx` | Nouveau composant principal de la section Scénario (éditeur, import, chapitres, IA, détection). |
| Supabase migrations | Nouvelles tables / colonnes pour scénario, chapitres de scénario, versions. |
| Hooks (ex. `useProjectScenario`, `useScenarioChapters`, `useScenarioVersions`) | Lecture/écriture scénario et versions (à placer dans `src/hooks/` ou équivalent). |
| Edge Functions (ex. `generate-scenario`, `rewrite-chapter`) | Appels LLM pour IA Scénario et IA Chapitre. |

---

## 6. Visibilité de l’IA Scénario et de l’IA Chapitre (exigence produit)

Pour rester cohérent avec le **Product** (01_Product_Market_Fit.md), la **Roadmap** (07_Roadmap_Produit.md) et le **Rapport** (11_Rapport_Chapitres_Flux_Blocs_Scenario.md) :

- **IA Scénario** : doit être **visible et accessible dès que l’utilisateur entre dans l’onglet Scénario**. Pas de sous-écran ni d’étape supplémentaire : la zone ou le bloc d’action « Générer / Modifier avec l’IA » (prompt + nombre de chapitres, etc.) est **présent dès l’affichage** de la section Scénario (ex. en haut de la colonne ou en panneau latéral toujours visible).
- **IA Chapitre** : doit être **visible et accessible dès que l’utilisateur ouvre un chapitre de scénario créé**. Dans la vue « détail d’un chapitre de scénario », le bouton ou le panneau « Modifier avec l’IA » (IA Chapitre) est **visible immédiatement** (ex. en en-tête du chapitre ou à côté du contenu).

**Implication pour le développement** : en **Phase A**, prévoir la **place** dans le layout pour ces blocs (emplacements réservés ou libellés si l’IA n’est pas encore branchée). En **Phase E**, brancher l’IA en s’assurant que ces emplacements sont bien ceux utilisés à l’entrée dans la section Scénario et à l’entrée dans un chapitre.

---

## 6.1 Édition de l’œuvre — ouverture du chapitre texte pour s’aider

Lors de l’**édition de l’œuvre** (chapitre visuel, panels/blocs), l’utilisateur doit pouvoir **voir le chapitre de scénario (texte)** correspondant pour s’aider. Le fonctionnement détaillé est décrit dans **11_Rapport_Chapitres_Flux_Blocs_Scenario.md** § **3.4.1 (Projection)**. Résumé :

- **Panneau « Scénario »** dans l’écran d’édition du chapitre visuel : affiche le **texte** d’un chapitre de scénario (celui **lié** au chapitre visuel, ou choisi via un **sélecteur**).
- **Lien optionnel** en BDD : champ `linked_scenario_chapter_id` sur le chapitre visuel pour associer un chapitre de scénario ; à l’entrée dans le chapitre visuel, le texte lié s’affiche **automatiquement**.
- **Sans lien** : sélecteur (liste des chapitres de scénario) pour choisir quel chapitre afficher ; possibilité d’enregistrer ce choix comme lien pour les prochaines fois.
- Pas d’« ouverture » type fichier : le chapitre texte est **affiché dès l’entrée** dans l’édition du chapitre visuel (panneau ouvert par défaut, repliable si besoin).

Cette partie relève du développement **Édition de l’œuvre** (Phase 2.2 de la roadmap) ; les données chapitres de scénario viennent des phases B/D du présent plan.

---

## 7. Comparaison de cohérence (Product / Roadmap / Rapport)

Vérification croisée entre **01_Product_Market_Fit.md** (§ 8.4), **07_Roadmap_Produit.md** (Phase 2.1) et **11_Rapport_Chapitres_Flux_Blocs_Scenario.md** (§ 3).

| Thème | Product (01) | Roadmap (07) | Rapport (11) | Cohérence |
|-------|--------------|--------------|--------------|-----------|
| **Deux types d’IA** (Scénario / Chapitre) | ✅ Deux types : IA Scénario, IA Chapitre | ✅ IA Scénario (histoire entière), IA Chapitre (par chapitre) | ✅ § 3.5 détaille les deux + IA Panel | ✅ Aligné |
| **Visibilité à l’entrée** | ✅ IA visible dès l’entrée Scénario / dès l’ouverture d’un chapitre | ✅ Visibilité UX décrite (entrée section, entrée chapitre) | ✅ Visibilité dans l’interface précisée | ✅ Aligné |
| **Choix nombre de chapitres + génération complète** | ✅ (dans § 8.4) | ✅ Tâche dédiée | ✅ § 3.5 IA Scénario | ✅ Aligné |
| **Accepter / Rejeter** | ✅ Comparaison ancienne/nouvelle, accepter/rejeter | ✅ Tâches modification par prompt, accepter/rejeter | ✅ § 3.5 pour les deux IA | ✅ Aligné |
| **BDD scénarios approuvés** | ✅ Persistés en BDD | ✅ Tâche BDD versions | ✅ § 3.2 BDD scénarios approuvés | ✅ Aligné |
| **Chapitres écrits = webtoon** | ✅ Chapitres (scénario) correspondent aux chapitres webtoon (1 = 1) | ✅ Idem + découpage Chapitre → Panels (Édition de l’œuvre) | ✅ § 3.1 définitions | ✅ Aligné |
| **Scénario jamais dans le prompt d’image** | ✅ Jamais injecté tel quel | ✅ Règle rappelée (notes, 2.2) | ✅ Prompts d’image = assets + description | ✅ Aligné |
| **Détection assets + éléments non créés** | ✅ Mention en § 8.4 (surlignage, hover, « à créer ») | ✅ Tâches dédiées (surbrillance, hover, « à créer ») | ✅ § 3.2 détaille les deux détections | ✅ Aligné |
| **Import scénario** | ✅ Écrit ou importe (.txt, copier-coller) | ✅ Écrire / importer | ✅ Saisie ou import | ✅ Aligné |
| **IA Panel (Édition de l’œuvre)** | ✅ Réflexion rôle étendu (prompts panels) | ✅ 2.2.1 IA Panel | ✅ § 3.5 IA Panel | ✅ Aligné |

**Synthèse** : Les trois documents sont **alignés** sur les deux types d’IA, la visibilité à l’entrée, le flux accepter/rejeter, la BDD, la dissociation scénario / œuvre et la détection (assets + éléments non créés).

---

## 8. Prochaine étape

Quand tu voudras passer au développement concret, indique par quelle phase commencer (recommandation : **Phase A**, puis **B** puis **C**). On pourra alors détailler les diffs fichier par fichier (ProjectDetail, création de `ScenarioSection`, migrations, hooks, etc.).
