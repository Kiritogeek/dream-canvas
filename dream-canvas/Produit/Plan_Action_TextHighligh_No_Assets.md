# Plan d'action — TextHighlighter : bons Personnages / Décors / Objets sans tout lister

> Objectif : surligner les vrais noms (personnages, décors, objets) mentionnés dans le scénario et non encore créés comme assets, **sans maintenir une liste exhaustive de mots à exclure** dans le composant.

---

## 1. Contexte et problème actuel

### Ce qui existe
- **ScenarioTextHighlighter** détecte :
  1. **Dialogue** : `Nom (didascalie) : "..."` ou `NOM : "..."` → candidat fort (personnage).
  2. **Tout en majuscules** : `BLACKWOOD`, `OMBRES` (≥ 3 caractères).
  3. **Première lettre majuscule** : `Marcus`, `Attends`, `Ombre` (≥ 3 caractères).

- Les candidats sont **filtrés** par :
  - `STRUCTURAL` (lieu, scène, dialogue, chapitre, etc.)
  - **`STOP_WORDS`** : une grosse liste en dur dans le TSX (articles, pronoms, verbes courants, impératifs, noms communs type ombre/lumière, etc.).

### Problème
- On ne peut pas lister **tous** les mots possibles (verbes à l’impératif, noms communs, adverbes…) dans un fichier TSX.
- Chaque nouveau faux positif (ex. *Attends*, *Ombres*) oblige à ajouter un mot → liste qui grossit sans fin.
- On veut **réduire les faux positifs** et **garder les vrais noms** (Blackwood, Marcus, etc.) sans tout mettre dans une blacklist.

---

## 2. Objectif

- **Surligner** uniquement les personnages / décors / objets **vraisemblables** (noms propres, noms de lieux, noms d’objets importants).
- **Pour l’utilisateur, les assets ont du sens** lorsqu’il s’agit de **personnages récurrents**, **décors récurrents** ou **objets récurrents** : ce sont ceux qu’il a intérêt à créer en front (pour les illustrer, les réutiliser, garder la cohérence visuelle). La détection doit donc privilégier les éléments qui reviennent dans le scénario plutôt que les mentions ponctuelles ou les mots qui n’en sont pas.
- **Ne pas** proposer comme « à créer » : verbes (Attends, Donnez), noms communs (Ombre, Ombres, Lumière), mots de structure, etc.
- **Solution durable** : privilégier des **règles de détection** et des **heuristiques** (ex. répétition) plutôt qu’une liste infinie de stop-words.

---

## 3. Pistes de solution

### A. Renforcer les signaux (moins de candidats = moins de faux positifs)

| Idée | Description | Avantage / inconvénient |
|------|-------------|-------------------------|
| **Dialogue = source prioritaire** | Considérer comme **candidats “missing”** en priorité les tokens qui apparaissent en **position dialogue** (`Mot :` ou `Mot (`). C’est le signal le plus fiable pour un personnage. | Très peu de faux positifs pour les personnages. Décors/objets en majuscule dans le récit restent à gérer. |
| **ALL CAPS plus strict** | Exiger **≥ 4 ou 5 caractères** pour les mots tout en majuscules (ex. rejeter `OMBRE`, `OMBRES`, `ATTENDS`). Ou n’accepter ALL CAPS que lorsqu’ils apparaissent **dans une ligne de dialogue** (avant `:` ou `(`). | Réduit OMBRES, ATTENDS, etc. Peut éliminer des noms courts (ex. LEE, ROI) si on monte à 5. |
| **Capitalized : répétition** | Un mot avec **première lettre majuscule** n’est candidat que s’il apparaît **au moins 2 fois** dans le texte (répétition = plus probablement un nom propre). | Élimine beaucoup de “début de phrase” (Attends, Ombre, Soudain). Risque de rater un personnage mentionné une seule fois. |
| **Longueur minimale** | Exiger **≥ 4 caractères** pour les noms “Capitalized” seuls (hors dialogue). | Réduit des mots courts type “Pas”, “Fin”, “Rue” (déjà en stop ou structure). |

### B. Liste externe (maintenir une blacklist hors du TSX)

| Idée | Description | Avantage / inconvénient |
|------|-------------|-------------------------|
| **Fichier dédié** | Déplacer les stop-words dans un fichier **JSON** ou **TS** (ex. `src/data/scenarioHighlighterStopWords.ts` ou `stopWords.json`), importé par `ScenarioTextHighlighter`. | Liste maintenable sans toucher au composant ; possible d’enrichir par catégorie (verbes, noms communs). Reste une blacklist à alimenter. |
| **Liste par catégorie** | Séparer : `structural`, `grammatical`, `imperativeVerbs`, `commonNouns`. Facilite les ajouts ciblés et la revue. | Même idée que ci-dessus, meilleure maintenabilité. |

### C. Heuristiques “nom propre” (sans dictionnaire complet)

| Idée | Description | Avantage / inconvénient |
|------|-------------|-------------------------|
| **Typographie dialogue** | Seuls les candidats issus du **regex dialogue** (`^\s*Nom\s*(?:\(|:)`) sont considérés comme “haute confiance”. Les autres (ALL CAPS, Capitalized) passent par des règles plus strictes (longueur, répétition). | Aligne la détection sur l’usage réel des scénarios (format Lieu / Scène / Dialogue-Action). |
| **Pas de verbe en -er à l’impératif** | Liste **courte** des terminaisons / formes typiques : `-ez`, `-ons`, `-e`, `-ons` (donnez, arrêtez, attends, etc.). Risque de sur-filter si on généralise trop. | Mieux vaut une petite liste de verbes très fréquents qu’une liste de tous les verbes. |
| **Noms composés avec trait d’union** | Les noms avec trait d’union (ex. `Jean-Pierre`, `Bois-des-Nymphes`) sont souvent des noms propres. On peut les **garder** même avec des parties courtes. | Déjà partiellement géré par le regex ; à ne pas casser. |

### D. Ne pas distinguer type (Personnage / Décor / Objet) à la détection

- Aujourd’hui la détection ne **classe pas** un “missing” en Personnage vs Décor vs Objet : l’utilisateur choisit au moment de “Créer comme asset”.
- **Conserver** ce comportement : l’objectif du plan est de **réduire les faux positifs**, pas de deviner le type. Le type reste un choix utilisateur.

---

## 4. Plan d’action recommandé

### Phase 1 — Réduire les candidats par des règles (sans tout lister)

| # | Tâche | Détail |
|---|--------|--------|
| 1.1 | **Dialogue = seule source “sans filtre répétition”** | Les candidats issus du **regex dialogue** (`Nom (` ou `Nom :`) restent tels quels (avec la blacklist actuelle). Ce sont les plus fiables. |
| 1.2 | **ALL CAPS : longueur minimale 4** | Pour le regex “tout en majuscules”, exiger **length ≥ 4** (au lieu de 3). Évite OMBRE, OMBRES, ATTENDS, etc. Si des noms courts en CAPS sont nécessaires, on pourra faire une exception (ex. liste courte “noms courts connus” ou garder 3 seulement en position dialogue). |
| 1.3 | **Capitalized hors dialogue : répétition** | Pour les mots détectés uniquement par “Première lettre majuscule” (sans être dans une ligne dialogue), n’ajouter comme candidat que si le **même mot** apparaît **au moins 2 fois** dans le texte (même avec casse différente). Réduit Attends, Ombre, Soudain, etc. |
| 1.4 | **Capitalized : longueur minimale 4** | En plus de la répétition, exiger **≥ 4 caractères** pour les noms “Capitalized” hors dialogue. Optionnel si la répétition suffit. |

### Phase 2 — Liste externe (optionnel mais recommandé)

| # | Tâche | Détail |
|---|--------|--------|
| 2.1 | **Extraire les stop-words** | Créer `src/data/scenarioHighlighterStopWords.ts` (ou `.json`) avec des tableaux par catégorie : `structural`, `grammatical`, `imperativeVerbs`, `commonNouns`. Exporter une seule liste fusionnée pour le composant. |
| 2.2 | **Importer dans ScenarioTextHighlighter** | Remplacer le `STOP_WORDS` en dur par l’import depuis ce fichier. Garder une liste **raisonnable** (~100–150 mots) pour les cas évidents ; les heuristiques (répétition, longueur, dialogue) font le reste. |

### Phase 3 — Tests et réglages

| # | Tâche | Détail |
|---|--------|--------|
| 3.1 | **Cas de test** | Scénario d’exemple avec : vrais noms (Blackwood, Marcus), verbes (Attends, Donnez), noms communs (Ombres, Lumière). Vérifier que seuls les vrais noms apparaissent dans « Personnages / éléments mentionnés non créés ». |
| 3.2 | **Ajuster seuils** | Si trop de faux négatifs (noms ratés), assouplir (ex. répétition à 1 occurrence pour les noms très longs, ou ALL CAPS à 3 caractères uniquement en position dialogue). |

---

## 5. Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `src/components/project/ScenarioTextHighlighter.tsx` | Logique `detectMissingNames`, regex, `addCandidate` ; application des nouvelles règles (dialogue prioritaire, longueur, répétition). |
| `src/data/scenarioHighlighterStopWords.ts` (à créer) | Liste des stop-words par catégorie, export d’un Set ou tableau. |
| Tests manuels ou suite de tests | Scénarios avec liste attendue de “missing” pour non-régression. |

---

## 6. Résumé des choix

- **Utilité côté utilisateur** : les assets créés depuis le scénario ont le plus de valeur pour les **personnages récurrents**, **décors récurrents** et **objets récurrents** (illustration, réutilisation, cohérence). La détection peut s’appuyer sur la **répétition** pour privilégier ces cas en front.
- **Ne pas** viser une liste exhaustive de tous les mots à exclure dans le TSX.
- **Privilégier** :  
  - **Signal dialogue** (Nom : / Nom () comme source fiable.  
  - **Règles** : longueur (ALL CAPS ≥ 4), **répétition** (Capitalized hors dialogue ≥ 2 occurrences) — en phase avec l’idée « récurrent = pertinent pour un asset ».  
  - **Liste externe** limitée (stop-words évidents) pour la maintenabilité.
- **Garder** le choix du type (Personnage / Décor / Objet) côté utilisateur à la création d’asset.

---

*Dernière mise à jour : 14 février 2026*
