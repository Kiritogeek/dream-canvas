# Rapport — Chapitres : flux Structuré / Automatique, blocs et place du scénario

> Deux flux (Automatique / Structuré), images pleines dans des blocs, place du scénario et découpage Chapitre → Panels.

---

## 1. Synthèse des décisions

| Décision | Choix |
|----------|--------|
| **Flux** | Deux modes : **Automatique** (découpage IA → panels, génération **panel par panel**) et **Structuré** (chapitre vide → blocs → texte + assets → génération). |
| **Images** | Chaque image générée est une **illustration pleine** (pas de “cases” ou blocs dessinés dans l’image). Les blocs sont des **zones de mise en page** dans l’app : on y affiche une image par bloc. |
| **Blocs** | En mode Structuré : l’utilisateur définit des blocs (position, taille, forme rectangle en v1). Chaque bloc a un contenu texte (prompt) et des refs assets. À la génération : **1 image par bloc** → l’image est ensuite affichée **dans** ce bloc. |
| **Scénario** | **Section à part entière** : écrire son histoire. **IA Scénario** : **un prompt = un chapitre** généré ; l'utilisateur construit son histoire chapitre par chapitre, accepter crée le chapitre. **IA Chapitre** : par chapitre existant, IA qui n'intervient que sur ce chapitre ; même flux accepter/rejeter. Détection assets (surbrillance + hover) et éléments non créés. Jamais le scénario dans le prompt d'image. Voir section 3. |
| **Prompts d'image** | Uniquement **assets sélectionnés** + éventuellement **courte description par panel** (issue du découpage ou saisie). Le scénario/synopsis **n'est pas** injecté dans le prompt. |
| **Génération panel par panel** | Mode Automatique : génération **au minimum panel par panel**. Impossible de générer un chapitre entier sans erreurs ou limites (quota, timeouts, API). |
| **Assets — impératif (les 2 flux)** | **La génération doit impérativement s'appuyer sur les assets que l'utilisateur sélectionne.** Ces assets cadrent la scène et permettent à l'IA de comprendre quels éléments (personnages, décors, objets) doivent figurer dans le chapitre. Sans sélection d'assets par l'utilisateur, la génération n'est pas cadrée et la cohérence narrative n'est pas garantie. |

---

## 2. Les deux flux de création

### 2.1 Flux Automatique (rapide)

1. L’utilisateur crée un chapitre avec **titre** et **synopsis** (et optionnellement **scénario** plus détaillé).
2. **Scénario (section dédiée)** : l'utilisateur a écrit son histoire. L'IA a pu découper le scénario en chapitres, puis le chapitre en **panels** (liste avec courte description par panel). Ce découpage **ne sert pas** au prompt d'image.
3. **Sélection des assets du chapitre (impératif)** : l'utilisateur sélectionne les assets (personnages, décors, objets) pour ce chapitre.
4. **Génération panel par panel (minimum)** : la génération se fait **un panel à la fois**. Impossible de générer un chapitre entier d’un coup (erreurs, limites quota/timeouts/API). L’utilisateur lance la génération pour le panel 1, puis le panel 2, etc.
5. Pour **chaque** panel : le **prompt d'image** = **style** + **assets sélectionnés** (noms, prompts, refs) + éventuellement **courte description de ce panel**. **Le scénario/synopsis n'est pas injecté dans le prompt d'image.**
6. Chaque image est stockée comme un **panel**. Ensuite : bulles de dialogue / narration en overlay.

**Caractéristique** : génération **panel par panel** ; prompts d'image = **assets + courte description panel**, pas le scénario.

### 2.2 Flux Structuré (contrôle créatif)

1. L’utilisateur crée un chapitre **vide** (titre, optionnellement synopsis/scénario pour référence).
2. Il définit la **structure** du chapitre : création de **panels**, puis pour chaque panel, création de **blocs** (rectangles : position x,y, largeur, hauteur). Aucune image n’est générée à ce stade.
3. Pour chaque bloc, il **rédige** une description (ce qui doit apparaître dans ce bloc) et **sélectionne les assets** (personnages, décors, objets) à utiliser pour ce bloc. **Cette sélection est primordiale** : elle cadre la génération et permet à l'IA de savoir quels éléments inclure. Les refs assets sont injectées dans le prompt à la génération.
4. Une fois la structure et les textes (avec assets) prêts, il lance la **génération** : **1 image par bloc**. Chaque image est une illustration pleine (pas de sous-blocs dessinés dedans), produite à partir du prompt du bloc et des assets sélectionnés pour ce bloc.
5. Les images générées sont **affichées dans** les blocs (chaque bloc affiche une image). En lecture, on affiche les panels avec leurs blocs (layout) ; les blocs contiennent les images.
6. Optionnel : bulles de dialogue / narration en overlay sur les panels (comme en mode Automatique).

**Caractéristique** : les blocs sont uniquement des **conteneurs de mise en page** ; le rendu final = images pleines placées dans ces conteneurs. **La sélection d'assets par bloc est impérative** pour que l'IA comprenne les éléments à mettre dans chaque image.

### 2.3 Règle impérative : sélection des assets par l'utilisateur

**La génération de panels / chapitre doit impérativement utiliser les assets que l'utilisateur sélectionne.** C'est primordial pour :

- **Cadrer la scène** : l'IA sait quels personnages, décors et objets doivent apparaître.
- **Comprendre les éléments à mettre dans le chapitre** : noms, descriptions (prompts) et, selon le plan, images de référence des assets sont injectés dans les prompts de génération.
- **Garantir la cohérence narrative** : sans cette sélection, la génération ne repose que sur le texte (synopsis/scénario ou description de bloc) et ne s'ancre pas dans la bibliothèque d'assets du projet.

En **mode Automatique** : l'utilisateur sélectionne les assets du chapitre avant de lancer la génération (au niveau chapitre).  
En **mode Structuré** : l'utilisateur sélectionne les assets **par bloc**.  
Dans les deux cas, l'UI doit imposer ou fortement encourager cette sélection avant de permettre la génération.

---

## 3. Scénario — section dédiée, chapitres = webtoon, découpage Chapitre → Panels

### 3.1 Définitions

| Terme | Définition | Usage |
|-------|------------|--------|
| **Scénario** | **Section à part entière** du produit : l'utilisateur y **écrit** son histoire ou **importe** un scénario (format texte : fichier .txt ou copier-coller). Texte narratif : actions, lieux, personnages, dialogues. | Découpage en **chapitres** (correspondant aux chapitres webtoon), puis **Chapitre → Panels** (liste + descriptions) dans la section Scénario. **Jamais** le texte brut injecté dans le prompt de génération d'image. |
| **Chapitres (section Scénario)** | Chapitres **écrits** dans la section Scénario. Ils **correspondent** aux chapitres du webtoon : **un chapitre écrit = un chapitre webtoon**. Titres, ordre, contenu texte. | Permettent de générer panel par panel l'histoire : chaque chapitre (texte) peut être découpé en panels (liste + descriptions) dans la section Scénario ; ce découpage alimente l'Édition de l'œuvre. |
| **Découpage Chapitre → Panels** | Au sein de la section Scénario, pour **chaque chapitre** (texte), découpage en **panels** : liste de panels avec courte description par panel. | Structure utilisée pour la génération panel par panel en mode Automatique. **Règles de gestion** de ce découpage (automatique, manuel, critères) à **définir plus tard**. |
| **Édition de l'œuvre** | Partie **visuelle** du produit : chapitres webtoon (alignés sur les chapitres écrits) et panels. C'est là que l'utilisateur construit le webtoon à partir du scénario et des assets. | Lors de l'édition d'un panel : double visualisation (chapitre texte correspondant + assets). Voir 3.4. |
| **Synopsis** | Résumé court du chapitre (quelques phrases). Présent en BDD (`chapters.synopsis`). | Référence auteur ; peut servir d'entrée au découpage IA. **Pas** utilisé dans le prompt d'image. |

### 3.2 Contenu de la section Scénario

- **Saisie** : l'utilisateur écrit son scénario dans la section « Scénario » **ou** importe un scénario (fichier texte .txt ou copier-coller).
- **Chapitres = chapitres webtoon** : les chapitres créés dans la section Scénario **correspondent** aux chapitres du webtoon (un chapitre écrit = un chapitre webtoon). L'utilisateur crée et structure ces chapitres (titres, ordre, contenu texte) ; cette structure sert directement à l'Édition de l'œuvre et à la génération panel par panel.
- **Découpage Chapitre → Panels (dans la section Scénario)** : pour chaque chapitre (texte), un **découpage en panels** est réalisé **directement dans la section Scénario** : liste de panels avec courte description par panel. Ce découpage alimente la génération panel par panel en Édition de l'œuvre. Les **règles de gestion** de ce découpage (qui découpe : utilisateur, IA, les deux ; critères ; édition manuelle, etc.) sont à **définir plus tard**.
- **Détection des assets déjà créés dans le scénario** : le texte du scénario est analysé pour repérer les **mentions d'assets existants** (personnages, décors, objets) de la bibliothèque du projet. Exemple : « Jean est dans la ville principale avec une épée » → **Jean** (asset personnage), **ville principale** (asset décor), **épée** (asset objet) sont détectés s'ils existent. Ces mentions sont **mises en surbrillance** dans l'éditeur de scénario (style distinct selon le type : personnage / décor / objet). **Au survol (hover)** sur une mention, l'**image de l'asset** correspondant s'affiche (tooltip ou popover) pour rappel visuel.
- **Détection par l'IA des éléments non encore créés** : une **IA** (règles de correspondance noms d'assets + LLM si besoin) détecte dans le scénario les **éléments** (personnages, décors, objets) qui sont **mentionnés mais pas encore créés** comme assets dans la bibliothèque. Ces éléments sont **signalés** dans le scénario (surbrillance distincte, ex. « à créer » ou liste dédiée « Éléments mentionnés non créés ») pour que l'utilisateur puisse créer les assets manquants et garder la cohérence narrative.
- **IA LLM — Scénariste (agent)** : une **IA LLM** est intégrée pour aider l'utilisateur à **construire son histoire**, avec un **system prompt** dédié au rôle de scénariste (agent « scénariste IA »). Voir roadmap Phase 2.
- **BDD — Scénarios approuvés** : tout ce qui a été **approuvé** par l'utilisateur (scénarios, chapitres de scénario) est **persisté en BDD** ; modèle et historique/versions à définir en roadmap.
- **Réflexion — Rôle étendu** : il y a matière à réflexion sur l’extension du rôle de cette IA : elle pourrait aussi servir à la **rédaction des prompts pour les panels** (suggestions de descriptions à partir du scénario + assets), sans remettre en cause la règle « prompt d'image = style + assets + description » (jamais le scénario brut).
- **Place dans le modèle** : à préciser (scénario au niveau projet avec chapitres de scénario en entité dédiée ou champs structurés ; table/colonnes pour versions approuvées). Voir section 6 « Points à clarifier ».

### 3.3 Rôle par flux

- **Mode Automatique** : le scénario (section dédiée) peut servir à produire la **liste des panels** (découpage IA). La **génération d'image** pour chaque panel utilise **uniquement** : style + **assets sélectionnés** + **courte description du panel**. Génération **panel par panel**.
- **Mode Structuré** : scénario / chapitres de scénario = **référence** pour l'auteur qui remplit les blocs à la main. Pas utilisé dans les prompts d'image (chaque bloc = prompt + refs assets).

### 3.4 Interface d'édition des panels (Édition de l'œuvre)

Lors de l'édition d'un chapitre visuel, l'utilisateur dispose d'**une aide visuelle** : le **chapitre texte** (scénario) affiché à gauche, avec la **même visualisation Aperçu** que dans la section Scénario.

| Zone | Contenu | Objectif |
|------|---------|----------|
| **Gauche — Chapitre texte** | Texte du **chapitre de scénario** lié, affiché en **Aperçu** : surbrillance des assets (personnages, décors, objets) dans le texte ; **hover** pour afficher l'asset (image + infos). | Garder le contexte narratif ; voir directement dans le texte quels assets sont concernés, sans panneau Assets séparé. |
| **Droite — Panels** | Liste et édition des panels du chapitre visuel. | Saisie des descriptions, génération, blocs, bulles. |

Il n'y a **pas de panneau « Assets » dédié** dans cet écran : les assets sont visibles **dans le texte** via l'Aperçu (détection + surbrillance + hover), comme dans la section Scénario (Chapitre → Aperçu). Un lien optionnel entre chapitre visuel et chapitre de scénario (`linked_scenario_chapter_id`) permet d'afficher le bon chapitre texte. Voir section 6 « Points à clarifier ».

#### 3.4.1 Projection : comment fonctionne l’ouverture du chapitre texte lors de l’édition de l’œuvre

**Contexte** : l’utilisateur est dans **Édition de l’œuvre** (chapitre visuel ouvert, en train d’éditer un panel ou un bloc). Il a besoin de **voir le texte du scénario** (chapitre de scénario) correspondant pour s’aider à rédiger la description du panel ou à cadrer la scène.

**Fonctionnement prévu** :

1. **Où s’affiche le chapitre texte**
   - Dans l’écran d’édition du chapitre visuel, le **chapitre texte** (scénario) s’affiche **à gauche** dans un panneau « Chapitre texte » (repliable). Le contenu est affiché en **Aperçu** : même rendu que dans la section Scénario (surlignage des assets, hover pour voir l’asset). **À droite** : les panels du chapitre visuel. Pas de panneau Assets séparé — les assets sont visibles dans le texte via l’Aperçu.

2. **Quel chapitre texte afficher**
   - **Si un lien existe** : au moment de créer ou d’éditer le **chapitre visuel**, l’utilisateur peut **associer** ce chapitre à un **chapitre de scénario** (ex. « Ce chapitre visuel adapte le chapitre de scénario #3 »). En BDD : un champ optionnel sur le chapitre visuel, ex. `linked_scenario_chapter_id` (FK vers la table des chapitres de scénario).
   - **Comportement** : dès que l’utilisateur ouvre ce chapitre visuel pour éditer les panels, le système **affiche automatiquement** le texte du chapitre de scénario lié dans le panneau Scénario. L’utilisateur n’a rien à « ouvrir » de plus : le chapitre texte est **déjà visible** à l’entrée dans l’édition du chapitre visuel.
   - **Si aucun lien n’est défini** : le panneau Scénario peut rester vide avec un message du type « Aucun chapitre de scénario associé » et un **sélecteur** (liste déroulante ou liste des chapitres de scénario du projet) permettant à l’utilisateur de **choisir quel chapitre texte afficher**. Une fois choisi, le texte s’affiche dans le panneau ; optionnellement, l’utilisateur peut **enregistrer** ce choix comme association (lien) pour ce chapitre visuel, afin que ce soit réaffiché aux prochaines visites.
   - **Implémentation (livrée)** : lorsqu’il change de chapitre dans le sélecteur, une **popup de confirmation** (« Changer de chapitre texte ? ») s’affiche ; au clic sur « Changer », le lien est **enregistré en base** pour ce chapitre visuel, ce qui garantit que le chapitre texte affiché est **persistant** (quitter / revenir sur la page conserve le choix).

3. **Ouverture / affichage**
   - **Pas d’« ouverture » séparée** au sens « clic pour ouvrir un fichier » : le chapitre texte est **affiché directement** dans le panneau Scénario dès que l’utilisateur est dans l’édition du chapitre visuel (et que un chapitre de scénario est lié ou sélectionné).
   - Le panneau peut être **repliable** (accordéon ou bouton « Masquer / Afficher le scénario ») pour gagner de la place, mais par défaut il est **ouvert** pour que l’aide soit immédiate.
   - Si le projet n’a **aucun chapitre de scénario** : le panneau peut afficher un lien court vers la section Scénario (« Créer votre scénario ») ou le scénario global (texte brut) s’il existe au niveau projet.

4. **Résumé du flux**
   - Utilisateur **entre dans Édition de l’œuvre** → ouvre un **chapitre visuel** (liste des chapitres du webtoon).
   - L’écran d’édition s’affiche avec **chapitre texte à gauche** (Aperçu : surlignage assets + hover) et **panels à droite**.
   - Le système charge et affiche le texte du chapitre de scénario **lié** (lien en BDD), sinon propose un **sélecteur** pour choisir un chapitre à afficher ; l’utilisateur peut **enregistrer** ce choix comme lien.
   - L’utilisateur **lit le texte** (avec les assets visibles dans l’Aperçu) tout en travaillant sur les panels ; il peut **replier** le panneau Chapitre texte pour gagner de la place.

5. **Données nécessaires**
   - **Chapitres** (`chapters` ou équivalent) : ajout d’un champ optionnel **`linked_scenario_chapter_id`** (chapitres écrits = chapitres webtoon ; même table ou deux tables liées par ordre). l’ordre.
   - **Chapitres (texte)** : table ou structure avec `id`, `project_id`, `title`, `content`, ordre. **Découpage Chapitre → Panels** : stockage liste panels (descriptions) par chapitre ; règles de gestion à définir plus tard.

Cette projection peut être implémentée progressivement : d’abord panneau Scénario avec **sélecteur manuel** (sans lien persisté), puis ajout du **lien optionnel** et affichage automatique du chapitre lié à l’entrée dans le chapitre visuel.

#### 3.4.2 Création d’un chapitre visuel — association au chapitre textuel

- **Suggestion par numéro** : à la création d’un chapitre visuel (ex. Chapitre 1), le système **pré-sélectionne** le chapitre de scénario de même numéro (Chapitre 1 textuel) s’il existe. L’utilisateur confirme, en choisit un autre ou laisse « Aucun » (associer plus tard).
- **Aucun chapitre textuel** : si le projet n’a aucun chapitre de scénario, une **notification** informe que l’utilisateur peut en créer dans l’onglet Scénario et associer ce chapitre visuel plus tard. La création du chapitre visuel reste possible.

#### 3.4.3 Longueur chapitre texte vs panels — guidance, estimation, répartition

- **Guidance** : si le découpage du chapitre textuel en panels est trop court ou trop long pour un chapitre webtoon, indiquer à l’utilisateur qu’il peut **retourner dans l’onglet Scénario** pour modifier le texte.
- **Estimation du nombre de panels** : disponible **en section Scénario** (pour chaque chapitre texte) et **en Édition de l'œuvre** (chapitre visuel). Estime le nombre de panels à partir du contenu texte et 720×5000. **Uniquement indicatif et visuel** : l'utilisateur n'est pas tenu de respecter cette estimation ; il peut créer plus ou moins de panels (images) qu'estimé. Permet de pré-visualiser si la longueur convient.
- **Répartition N / N+1** : sans perdre d’éléments. Prérequis : **chapitre actuel (N) et chapitre suivant (N+1)**. **Trop court** : prendre des éléments du chapitre textuel N+1 et les ajouter au N (proposition + acceptation/refus). **Trop long** : céder des éléments du N vers N+1 (même principe). Les éléments acceptés sont retirés d’un chapitre et ajoutés à l’autre.

#### 3.4.4 Contrôle de la longueur — référence, nombre de panels cible, comparaison

*Objectif* : l'utilisateur a un **contrôle sur la longueur** de ses chapitres (en nombre de panels).

- **Référence panels / chapitre** : afficher une référence (ex. « En moyenne, un chapitre fait environ **10 panels** »). *Évolution* : afficher un **vrai chapitre webtoon** (fourni plus tard) avec son **nombre de panels** → l'utilisateur juge combien de panels il veut pour ses chapitres.
- **Nombre de panels cible** : l'utilisateur peut **choisir un nombre de panels cible** pour le chapitre (ou cible par défaut au niveau projet). Ex. 8, 10, 12 panels.
- **Comparaison estimation vs cible** : confronter l'estimation (panels prévus) au **nombre de panels cible** (ex. « Estimation : 7 · Cible : 10 → chapitre un peu court »). L'utilisateur adapte le texte ou utilise la répartition N/N+1.

*Usage intuitif* : en Scénario, à la création ou édition d'un chapitre, afficher référence + estimation ; permettre de définir une cible ; afficher la comparaison estimation vs cible. Même logique en Édition de l'œuvre.

*Principe* : l'estimation et toute visualisation du découpage chapitre → panels sont **purement indicatives et visuelles**. L'utilisateur reste libre d'avoir plus ou moins d'images que l'estimation ; pas de contrainte à appliquer strictement un panel « détecté » comme panel visuel.

### 3.5 Assistance IA : deux types (Scénario / Chapitre), réécriture directe et accepter-rejeter

**Même modèle LLM, system prompts différents** : le produit utilise **deux rôles IA** (et optionnellement un troisième pour les panels), avec le **même fournisseur LLM** mais des **system prompts** distincts : (1) **IA Scénario** — écrit toute l'histoire, intervient sur le scénario global ; (2) **IA Chapitre** — intervient **uniquement sur le chapitre de scénario** en cours ; (3) **IA Panel** (Édition de l'œuvre) — suggère ou réécrit les descriptions de panels. Voir ci-dessous.

**Visibilité dans l'interface** : l'**IA Scénario** est **visible et utilisable dès que l'utilisateur entre dans la section Scénario** (onglet Scénario) ; l'**IA Chapitre** est **visible et utilisable dès que l'utilisateur entre dans un chapitre de scénario créé** (ouverture du chapitre). L'utilisateur n'a pas à chercher ni à cliquer ailleurs pour accéder à ces aides.

#### IA Scénario (niveau histoire entière)

- L'utilisateur **saisit un prompt** décrivant son histoire (ex. « Une fantasy où un forgeron découvre une épée maudite »).
- Le système **demande en combien de chapitres** il veut son histoire (ex. 50 chapitres).
- L'**IA Scénario** génère **toute l'histoire** chapitre par chapitre, **directement sur le site** (le texte apparaît dans l'éditeur de scénario, chapitre par chapitre).
- **Modification par prompt** : l'utilisateur peut ensuite saisir un **nouveau prompt** pour modifier des aspects (ex. « Rendre le ton plus sombre, ajouter un second personnage »). L'IA **réécrit** le scénario (ou les parties concernées) **directement sur le site**.
- **Comparaison et choix** : l'utilisateur peut **lire** l'ancienne version et la **nouvelle version** (affichage côte à côte ou bascule). Il **choisit** : **garder la nouvelle** (accepter) ou **revenir à l'ancienne** (rejeter). Les versions sont conservées tant que l'utilisateur n'a pas accepté définitivement.

#### IA Chapitre (niveau un chapitre de scénario)

- Sur **chaque chapitre de scénario**, une **IA dédiée** qui **n'intervient que sur ce chapitre** (system prompt « assistant chapitre »).
- L'utilisateur ouvre un chapitre, saisit un **prompt de modification** (ex. « Allonger la scène du duel, plus de dialogues »). L'IA **réécrit le chapitre** directement sur le site.
- **Même flux accepter-rejeter** : l'utilisateur voit l'ancienne vs la nouvelle version et **accepte** (garder la nouvelle) ou **rejette** (revenir à l'ancienne).

#### IA Panel (Édition de l'œuvre)

- Lors de l'édition d'un **panel** (description / prompt du panel), l'utilisateur peut demander à l'**IA Panel** de **suggérer ou réécrire** la description du panel (à partir du contexte scénario + assets). La réécriture s'affiche **directement** dans le champ ; l'utilisateur peut **accepter** ou **rejeter** (revenir à l'ancienne description).

#### Options d'IA LLM gratuites (recommandations)

Pour un usage **gratuit** ou à coût maîtrisé, des options courantes en 2024–2025 sont : **Groq** (tier gratuit : Llama 3.3 70B, Mixtral 8x7B, nombreuses requêtes/jour) ; **OpenRouter** (accès gratuit avec limites, modèles Llama, Mistral, Gemma) ; **Mistral** (API gratuite via La Plateforme) ; **Google AI Studio** (Gemini avec quota gratuit). Le choix dépend des quotas, de la latence et de la langue ; un même backend peut appeler l’un de ces fournisseurs avec des system prompts différents pour Scénario / Chapitre / Panel.

---

## 4. Proposition de mise en place

### 4.1 Modèle de données (évolution)

- **chapters**  
  - Conserver : `title`, `synopsis`, `chapter_number`.  
  - Ajouter : `scenario` (TEXT, NULL), `creation_mode` (TEXT, NULL ou enum : `'automatic'` | `'structured'`).  
  - Optionnel : `panel_count` ou déduire du nombre de panels.

- **panels**  
  - Conserver : `id`, `chapter_id`, `panel_number`, `prompt`, `image_url`, `dialogue`, `narration`, `speech_bubbles`.  
  - En mode **Automatique** : 1 panel = 1 image pleine (comportement actuel).  
  - En mode **Structuré** : 1 panel = **conteneur de blocs** (layout). Le panel n’a pas d’`image_url` directe ; les images sont sur les blocs.  
  - Ajouter : `layout` (JSONB, NULL) pour décrire les blocs du panel (position, taille, ordre). Structure proposée :

```json
{
  "blocks": [
    {
      "id": "block_uuid",
      "x": 0,
      "y": 0,
      "width": 400,
      "height": 600,
      "prompt": "Luna entre dans la cafétéria...",
      "asset_refs": ["asset_id_1", "asset_id_2"],
      "image_url": "https://..."
    }
  ]
}
```

Alternative : table **panel_blocks** (id, panel_id, block_index, x, y, width, height, prompt, asset_refs JSONB, image_url). Les deux sont possibles ; JSONB sur `panels.layout` réduit les jointures pour un premier jet.

- **Génération**  
  - En mode Structuré : 1 appel IA par **bloc** (prompt = style + prompt du bloc + refs assets). L’image générée est une **image pleine** ; on stocke son URL dans le bloc et on l’affiche dans le rectangle du bloc.

### 4.2 Parcours utilisateur (résumé)

- **Choix du mode** à la création du chapitre (ou par défaut « Structuré » / « Automatique » selon produit).
- **Automatique** : section Scénario (découpage IA en chapitres puis panels) ; sélection assets chapitre ; **génération panel par panel** (pas tout le chapitre d'un coup). Prompt d'image = assets + courte description panel (pas le scénario). Édition possible (prompt, régénération, ordre).
- **Structuré** : formulaire chapitre (titre, synopsis/scénario optionnel) → page détail chapitre vide → ajout de panels → pour chaque panel, ajout de blocs (rectangles) → remplissage prompt + refs assets par bloc → « Générer les images » (par bloc ou par panel) → affichage des images dans les blocs → optionnel : bulles/narration.

### 4.3 Phasage proposé

| Phase | Contenu | Livrable |
|-------|--------|----------|
| **2a** | Modèle : `chapters.scenario`, `chapters.creation_mode` ; `panels.layout` (blocs) ou table `panel_blocks`. Migration + RLS. | BDD prête pour les deux flux. |
| **2b** | Mode **Automatique** : découpage scénario → N panels (IA) ; **génération panel par panel** (assets + courte description, pas le scénario dans le prompt) ; affichage en lecture verticale. | Flux rapide opérationnel. |
| **2c** | Mode **Structuré** : UI édition chapitre vide, création panels + blocs (rectangles), champs prompt + refs assets par bloc. Génération 1 image par bloc, stockage URL dans le bloc, affichage dans les blocs. | Flux structuré opérationnel. |
| **2d** | Commun : bulles de dialogue et narration (overlay sur les images), lecteur vertical amélioré. | Expérience lecture complète. |

### 4.4 Points techniques à trancher

- **Format d’image par bloc** : ratio fixe (ex. 800×1200) ou ratio du bloc ? Si ratio bloc variable, soit on génère en 1024×1024 puis recadrage/crop, soit on passe les dimensions au modèle (si l’API le permet). Recommandation v1 : ratio fixe par bloc (ex. hauteur/largeur du bloc en proportion 3:2 ou 2:3) pour simplifier.
- **Edge Function** : réutiliser `generate-asset-image` avec un type « panel » ou « block » (prompt + refs assets) pour générer une image pleine ; ou une nouvelle fonction dédiée `generate-panel-image` pour garder la sémantique claire.
- **Stockage** : même bucket `dreamweave`, chemin du type `{user_id}/projects/{project_id}/panels/{panel_id}_{block_id}.png` pour les images de blocs.

---

## 5. Résumé pour les .md

- **Product.md** : décrire la section « Scénario » (écrire l'histoire, découpage IA en chapitres/panels, **jamais** dans les prompts d'image) ; les deux flux avec génération **panel par panel** en mode Auto ; images pleines ; assets impératifs dans les 2 flux.
- **08_Modele_de_Donnees** : ajouter `chapters.scenario`, `chapters.creation_mode` ; étendre `panels` avec `layout` (blocs) ou documenter la table `panel_blocks` ; préciser que `image_url` sur un bloc = image pleine pour ce bloc.
- **07_Roadmap** : Phase 2 scinder en 2a–2d ci-dessus ; mentionner mode Structuré (blocs) et mode Automatique (synopsis/scénario).
- **04_User_Stories** : ajouter des user stories pour le mode Structuré (créer blocs, remplir blocs, référencer assets, générer images dans les blocs) et pour le scénario (saisie, import, chapitres de scénario ; double visualisation en édition de panel).

---

## 6. Points à clarifier / incohérences possibles

Ces points découlent de la **correspondance chapitres écrits = chapitres webtoon**, du **découpage Chapitre → Panels** dans la section Scénario et de la double visualisation en édition. À trancher en produit / technique.

| Point | Évocation | Question / risque d'incohérence |
|-------|-----------|----------------------------------|
| **Correspondance chapitres écrits ↔ webtoon** | Les chapitres (section Scénario) **correspondent** aux chapitres webtoon (1 = 1). | **Modèle** : une seule table `chapters` avec type (scénario / visuel) ou deux tables (scénario vs visuel) liées par ordre). ou FK ? Gestion de la création : créer le chapitre visuel automatiquement à la création du chapitre écrit, ou l'utilisateur crée les deux côtés ? |
| **Découpage Chapitre → Panels (section Scénario)** | Dans chaque chapitre (texte), découpage en panels (liste + descriptions) directement dans la section Scénario. | **Règles de gestion** à définir plus tard : qui découpe (utilisateur, IA, les deux) ? Critères du découpage ? Édition manuelle des descriptions de panels ? Stockage : table `scenario_panels` (chapter_id, panel_number, description) ou JSONB sur le chapitre ? |
| **Modèle de données chapitres (texte)** | Chapitres écrits = chapitres webtoon ; contenu texte + découpage panels. | **Où stocker** : table dédiée (ex. `scenario_chapters` avec `content`, `panels` JSONB ou table `scenario_panels`) ou réutilisation de `chapters` avec champs scénario (content, panels) ? Impact sur l'UI. |
| **Import scénario** | Import d'un scénario (format texte). | **Format** : .txt uniquement ou aussi .md / docx ? **Chapitres après import** : l'utilisateur doit-il recréer les chapitres de scénario après import, ou l'import peut-il détecter des marqueurs (ex. "## Chapitre 1") pour pré-remplir les chapitres ? |
| **Ordre des onglets / zones** | « Côté scénario » et « côté assets » pendant l'édition. | **Layout** : deux colonnes (scénario à gauche, assets à droite), panneaux repliables, ou onglets ? À définir en UX. |

---

## 7. Avis impartial sur cette vision

**Points forts**

- **Génération panel par panel** : Réaliste techniquement (limites API, timeouts, quotas). Réduit les échecs « tout ou rien » et permet de reprendre après une erreur. L'utilisateur garde le contrôle (lancer la génération panel par panel).
- **Scénario hors prompts d'image** : Le scénario reste un outil de **structure** (découpage en chapitres/panels). Ne pas l'injecter dans le prompt évite des prompts trop longs, du bruit pour le modèle et des dérives par rapport aux assets. Les **assets + courte description** cadrent mieux la génération et la cohérence visuelle.
- **Section « Scénario » dédiée** : Clarifie le parcours : écrire l'histoire → découpage IA → structure → génération à partir des assets. Séparation nette entre « écriture narrative » et « génération d'images ».

**Points de vigilance**

- **UX en mode Automatique** : Générer panel par panel peut sembler plus lent qu'un « tout en un clic ». Il faudra une UI claire (ex. bouton « Générer ce panel », progression, possibilité de lancer plusieurs panels à la suite sans réinjecter le scénario).
- **Courte description par panel** : Elle doit être suffisante pour que l'IA produise une image pertinente. Le découpage IA doit donc produire des descriptions courtes mais exploitables ; sinon, l'utilisateur devra les compléter (déjà prévu).

**Conclusion** : La vision (scénario = structure ; **chapitres écrits = chapitres webtoon** ; **découpage Chapitre → Panels** dans la section Scénario, règles à définir ; génération panel par panel ; assets impératifs ; double visualisation en édition) est cohérente. Les points de la section 6 restent à trancher pour l'implémentation (modèle chapitres, règles de gestion du découpage, import, layout). Les .md ont été alignés en conséquence.

Ce rapport sert de référence pour la mise à jour des .md et pour l’implémentation.

---

*Dernière mise à jour : 14 février 2026*
