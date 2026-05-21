# NarraMind Compass — Spec
### Co-pilote créatif d'Ariane pour toute création dans DreamWeave
*Porté par Ariane · Lore-first · Ne pas coder avant validation*

---

## 0. Vision

NarraMind aujourd'hui est **réactif** : il lit le projet et détecte les incohérences.

NarraMind Compass est **proactif** : il utilise exactement les mêmes données (chapitres, lore, assets) pour assister *toute création* dans DreamWeave.

**Ariane devient le co-pilote créatif de chaque acte de création :**

| Zone | Ce qu'Ariane assiste |
|---|---|
| **Lore Monde** | Structure + suggestions d'enrichissement de l'univers |
| **Lore Asset** | Enrichissement des fiches personnages / objets / décors |
| **Scénario IA** | 3 propositions de direction narrative avant génération |
| **Création d'asset** | Pré-remplissage du formulaire depuis le LORE existant |

**Ordre d'implémentation :** Lore (monde + assets) → Scénario → Création d'asset.

**Règle invariante :** Ariane propose, l'utilisateur décide. Elle ne bloque jamais, ne génère jamais sans demande explicite.

---

## 1. La vectorisation — Rappel technique

Chaque texte du projet (chapitre, section lore, fiche asset) est converti en **vecteur numérique** (768 nombres) qui encode son sens. Deux textes parlant du même sujet ont des vecteurs proches. C'est la **recherche sémantique** : au lieu d'injecter tout le projet dans le LLM, on récupère les 5 éléments les plus pertinents pour le contexte courant.

Stocké dans **Supabase pgvector** — même base de données, même RLS, zéro infrastructure supplémentaire.

---

## 2. Parcours utilisateur — Lore Monde

### Contexte
L'utilisateur est dans l'onglet **Univers** de son projet. C'est ici qu'il définit les règles de son monde : magie, géographie, factions, chronologie.

### 2.1 Nouvelle structure de l'onglet Univers

**⚠️ L'UI de l'onglet Univers doit être restructurée.** Aujourd'hui c'est un bloc texte libre. Compass a besoin de sections séparées pour vectoriser précisément.

L'utilisateur voit une page divisée en **sections thématiques**, chacune avec son propre champ texte :

```
Univers — Mon Monde
─────────────────────────────────────────────
 🌀 Système de magie
 [ Zone de texte — l'utilisateur écrit les règles magiques ]
 [ ✦ Suggestions Ariane ]

 🗺️ Géographie & Lieux
 [ Zone de texte — régions, villes, lieux clés ]
 [ ✦ Suggestions Ariane ]

 ⚔️ Factions & Pouvoirs
 [ Zone de texte — groupes, hiérarchies, conflits ]
 [ ✦ Suggestions Ariane ]

 📜 Règles sociales & Culture
 [ Zone de texte — us, coutumes, interdits ]
 [ ✦ Suggestions Ariane ]

 🕰️ Chronologie
 [ Zone de texte — événements fondateurs, timeline ]
 [ ✦ Suggestions Ariane ]
```

Chaque section est sauvegardée et vectorisée indépendamment — cela permet une recherche sémantique précise (ex : trouver uniquement les règles de magie pertinentes pour un chapitre donné).

---

### 2.2 Parcours — L'utilisateur demande des suggestions Ariane

**Étape 1** — L'utilisateur a écrit quelques chapitres et revient dans l'onglet Univers. Il clique sur **"✦ Suggestions Ariane"** dans la section "Système de magie".

**Étape 2** — Un panneau s'ouvre à droite (ou en dessous, selon la disposition). En haut du panneau, une phrase d'Ariane en langage narratif :

> *"J'ai lu tes 4 chapitres. Voici ce que ton histoire révèle déjà sur la magie, et ce que tu pourrais ajouter."*

**Étape 3** — L'utilisateur voit deux groupes de suggestions, visuellement distincts :

**Groupe 🔍 "Tiré de ton histoire"** (fond neutre, gris clair) — ce qu'Ariane a *extrait* des chapitres existants, formalisé en règle :

> 🔍 *"La magie semble épuiser physiquement son utilisateur — mentionné dans les chapitres 2 et 4."*
> `[ Ajouter au lore ]` `[ Ignorer ]`

> 🔍 *"Seraph utilise un type de magie différent des autres — elle n'est jamais essoufflée."*
> `[ Ajouter au lore ]` `[ Ignorer ]`

**Groupe ✨ "Proposé par Ariane"** (fond violet/indigo subtil) — contenu *inventé* par Ariane, cohérent avec ce qui existe :

> ✨ *"Tu pourrais définir une règle d'origine : la magie vient du monde naturel — elle ne peut pas être utilisée dans un espace clos ou artificiel."*
> `[ Ajouter au lore ]` `[ Ignorer ]`

> ✨ *"Une limite narrative utile : chaque personnage a un 'seuil de rupture' — dépasser ce seuil une fois le marque durablement."*
> `[ Ajouter au lore ]` `[ Ignorer ]`

**Étape 4** — L'utilisateur clique **"Ajouter au lore"** sur une suggestion. Le texte s'insère automatiquement dans le champ texte de la section correspondante, en bas du contenu existant. Il peut l'éditer librement avant de sauvegarder.

**Étape 5** — Il clique **"Ignorer"** sur les suggestions non pertinentes. Elles disparaissent du panneau (statut `dismissed` en base).

**Étape 6** — Il sauvegarde la section. Le contenu est revectorisé — les futures suggestions d'Ariane tiendront compte de ce nouveau lore.

---

## 3. Parcours utilisateur — Lore Asset

### Contexte
L'utilisateur est dans l'onglet **Assets** de son projet, sur la fiche d'un personnage récurrent (ex : Maya, qui apparaît dans 5 chapitres). La fiche asset a déjà une section LORE, probablement peu remplie.

### 3.1 Ce que l'utilisateur voit sur la fiche

La fiche asset affiche, en dessous du champ LORE existant, un bandeau discret :

```
──────────────────────────────────────────────────
 ✦ Ariane a analysé 5 chapitres mentionnant Maya
                         [ Voir les suggestions ]
──────────────────────────────────────────────────
```

Le bandeau n'est présent que si au moins 2 chapitres mentionnent le nom de l'asset (seuil pour éviter les faux positifs).

---

### 3.2 Parcours — L'utilisateur consulte les suggestions

**Étape 1** — Il clique **"Voir les suggestions"**. Le bandeau s'étend (accordion) pour révéler les suggestions.

**Étape 2** — Il voit le même système 🔍 / ✨ :

**Groupe 🔍 "Tiré de tes chapitres"** :

> 🔍 *"Maya trahit le Conseil au chapitre 2 — cet événement n'est pas dans son LORE."*
> `[ Ajouter ]` `[ Ignorer ]`

> 🔍 *"Elle prend systématiquement des décisions seule, sans consulter le groupe — trait de personnalité récurrent."*
> `[ Ajouter ]` `[ Ignorer ]`

**Groupe ✨ "Proposé par Ariane"** :

> ✨ *"Sa relation avec Kael suggère un passé commun antérieur à l'histoire — tu pourrais l'expliciter dans son backstory."*
> `[ Ajouter ]` `[ Ignorer ]`

> ✨ *"Son rapport à la magie est ambigu — elle observe mais n'utilise jamais. Peut-être une interdiction ou une incapacité cachée ?"*
> `[ Ajouter ]` `[ Ignorer ]`

**Étape 3** — L'utilisateur clique **"Ajouter"**. Le texte s'ajoute dans le champ LORE de la fiche, qu'il peut éditer.

**Étape 4** — Il sauvegarde la fiche. Le LORE est revectorisé. À la prochaine création d'asset liée à Maya, Ariane injectera ce lore enrichi.

---

## 4. Parcours utilisateur — Scénario IA

### Contexte
L'utilisateur est dans l'éditeur de chapitre scénario. Il veut générer le chapitre 6. Aujourd'hui il écrit un prompt libre ou laisse l'IA générer sans direction. Avec Compass, il peut demander à Ariane de lui proposer 3 directions avant de lancer la génération.

### 4.1 Ce que l'utilisateur voit

Dans l'interface de génération du chapitre, un nouveau composant apparaît **au-dessus** du bouton "Générer" :

```
──────────────────────────────────────────────────────
  ✦ Proposition Ariane               [ Demander ↓ ]
──────────────────────────────────────────────────────
```

Discret par défaut — juste un bandeau avec un bouton. Ne s'impose pas.

---

### 4.2 Parcours — L'utilisateur demande les propositions

**Étape 1** — Il clique **"Demander"**. Le bandeau se charge (~2–3 secondes, spinner Ariane).

**Étape 2** — 3 cartes de direction apparaissent, chacune avec un titre court et un résumé :

```
┌─────────────────────────────────────────────────┐
│  A — La rupture de Seraph                       │
│  "L'arc de tension avec Kael atteint son point  │
│  de rupture. Une confrontation directe dans la  │
│  Salle des Miroirs — le secret de sa magie      │
│  est révélé."                    [ Utiliser ]   │
├─────────────────────────────────────────────────┤
│  B — L'inconnu du Sud                          │
│  "Un personnage extérieur arrive, lié à         │
│  l'origine de l'Épée de Verre. Il échappe       │
│  au contrôle du Conseil."        [ Utiliser ]   │
├─────────────────────────────────────────────────┤
│  C — Trois mois plus tard                       │
│  "Ellipse temporelle — les conséquences de la   │
│  décision de Maya au chapitre 5 ont transformé  │
│  l'équilibre des factions."      [ Utiliser ]   │
└─────────────────────────────────────────────────┘
  [ Redemander 3 nouvelles directions ]
```

**Étape 3** — L'utilisateur clique **"Utiliser"** sur la direction B. Le champ de prompt de génération est **pré-rempli** avec la direction choisie, modifiable.

**Étape 4** — Il peut ajuster le prompt, puis clique **"Générer le chapitre"**. La génération utilise ce prompt enrichi + le contexte NarraMind classique (entités, résumés, lore).

**Alternative** — Il clique **"Redemander"** pour obtenir 3 nouvelles directions. Ou il **ignore** le composant et écrit son prompt librement comme avant.

---

### 4.3 Ce qu'Ariane utilise pour générer les directions

Même pipeline que NarraMind : vectorisation → semantic search → top-K contexte :
- Les résumés des chapitres précédents les plus proches narrativement
- Les fiches LORE des assets mentionnés dans les derniers chapitres
- Le lore monde pertinent pour le contexte courant
- Le méga-résumé `narra_summary`

Total injecté : ~1 200 tokens → Gemini Flash → 3 directions en JSON structuré.

---

## 5. Parcours utilisateur — Création d'asset depuis le LORE

### Contexte
L'utilisateur est dans l'onglet Assets. Il clique "Créer un nouveau personnage". Aujourd'hui il arrive sur un formulaire vide. Avec Compass, Ariane a déjà préparé une suggestion basée sur le LORE.

### 5.1 Ce que l'utilisateur voit à l'ouverture du formulaire

Le formulaire de création s'ouvre avec deux états possibles :

**État A — LORE suffisant (projet avec au moins quelques chapitres / lore renseigné)**

En haut du formulaire, un bandeau Ariane :

```
┌────────────────────────────────────────────────────┐
│  ✦ Ariane a préparé une suggestion basée sur       │
│  ton univers. Tu peux la modifier librement.       │
│                      [ Voir la suggestion ] [ ✕ ]  │
└────────────────────────────────────────────────────┘
```

Si l'utilisateur clique **"Voir la suggestion"**, le formulaire est pré-rempli :

- **Nom** : "Le Général Arak" *(détecté dans le chapitre 5, pas encore d'asset)*
- **Type** : Personnage
- **Prompt de génération** : *"Général militaire imposant, uniforme sombre brodé aux armes du Conseil, cicatrice verticale sur l'œil gauche, regard froid et calculateur, port altier"*
- **LORE suggéré** : *"Bras armé du Conseil des Cendres dans le nord. Pragmatique, sans idéologie — il exécute les ordres pour maintenir l'ordre, pas par conviction."*

L'utilisateur modifie ce qu'il veut, supprime ce qui ne lui convient pas, puis génère.

**État B — LORE insuffisant (nouveau projet, pas encore de chapitres)**

Formulaire standard vide, sans bandeau Ariane. Un message discret en bas :

> *"Plus ton LORE et tes chapitres sont renseignés, plus Ariane pourra t'aider à créer des assets cohérents avec ton univers."*

---

## 6. Architecture technique

### 6.1 Nouvelle Edge Function — `narramind-compass`

```
[Déclencheurs]
  Univers → sauvegarde section lore     → indexation (vectorise la section)
  Assets  → sauvegarde fiche lore       → indexation (vectorise le lore asset)
  Univers → clic "✦ Suggestions Ariane" → appel proposals (mode lore_world)
  Assets  → clic "Voir les suggestions" → appel proposals (mode lore_asset)
  Scénario → clic "Demander"            → appel proposals (mode narrative_direction)
  Assets  → ouverture formulaire créer  → appel proposals (mode asset_prefill)

          ↓
[Edge Function : narramind-compass]
  ├── mode = "index"
  │     ├── Récupère le texte source (section lore, chapitre, fiche asset)
  │     ├── Appel Gemini text-embedding-004 → vecteur 768 dimensions
  │     └── Upsert project_embeddings
  │
  └── mode = "propose"
        ├── Récupère le texte courant (section active, chapitre, asset)
        ├── Génère son embedding
        ├── Semantic search pgvector → top-5 embeddings proches du projet
        ├── Récupère les textes correspondants
        ├── Appel Gemini Flash → JSON { proposals: [...] }
        └── Upsert compass_proposals (dédoublonnage dedupe_key)
```

### 6.2 Nouvelles tables BDD

**`project_embeddings`** — index vectoriel du projet
```sql
id              uuid primary key
project_id      uuid references projects
source_type     text  -- 'chapter' | 'lore_world_section' | 'asset_lore' | 'summary'
source_id       uuid  -- id de la source (chapter_id, asset_id...)
section_key     text  -- pour lore_world : 'magic' | 'geography' | 'factions' | 'culture' | 'timeline'
content         text  -- texte vectorisé (max 2 000 chars)
embedding       vector(768)
updated_at      timestamptz
```

**`compass_proposals`** — suggestions générées par Ariane
```sql
id              uuid primary key
project_id      uuid references projects
source_id       uuid  -- contexte source (chapitre ou asset déclencheur)
proposal_type   text  -- 'lore_world' | 'lore_asset' | 'narrative_direction' | 'asset_prefill'
origin          text  -- 'extracted' (🔍) | 'generated' (✨)
title           text  -- titre court affiché (langage auteur)
content         text  -- corps de la suggestion
prefill_data    jsonb -- données pré-remplissage formulaire (asset_prefill uniquement)
status          text  -- 'active' | 'accepted' | 'dismissed'
dedupe_key      text  -- évite doublons sur runs successifs
created_at      timestamptz
```

### 6.3 Modifications UI existantes

| Composant | Modification |
|---|---|
| `UniverseSection.tsx` | Restructuration en 5 sections thématiques + bouton "✦ Suggestions Ariane" par section |
| `AssetLibrary.tsx` | Bandeau "✦ Ariane a analysé N chapitres" sur fiches avec ≥ 2 mentions |
| `ScenarioChapterEditor.tsx` | Composant "Proposition Ariane" au-dessus du bouton Générer |
| `AssetCreationForm` (nouveau ou existant) | Bandeau pré-remplissage + états A/B selon LORE disponible |
| `ArianeContinuityPanel.tsx` | Nouveau tab "Suggestions" à côté de "Continuité" (point d'accès secondaire) |

### 6.4 Modèle d'embedding retenu

**Gemini text-embedding-004** — 768 dimensions, free tier (1 500 req/min), même clé API que Gemini Flash déjà en place.

---

## 7. Plan d'implémentation

| Phase | Périmètre | Priorité |
|---|---|---|
| **1 — Indexation** | `project_embeddings` + vectorisation auto sur save (chapitres, lore, assets) | P0 — base de tout |
| **2 — Lore Monde** | Restructuration UI Univers (5 sections) + suggestions Ariane (🔍 + ✨) | P0 |
| **3 — Lore Asset** | Bandeau suggestions sur fiches assets + accordion 🔍 / ✨ | P1 |
| **4 — Scénario** | Composant "Proposition Ariane" + 3 directions dans ScenarioChapterEditor | P1 |
| **5 — Création asset** | Pré-remplissage formulaire (états A/B) | P2 |
| **6 — Tab Suggestions** | Intégration dans ArianeContinuityPanel | P2 |

---

## 8. Tier gate

| Plan | Compass |
|---|---|
| **Libre** | Lore structuré disponible · 3 suggestions Ariane/mois |
| **Créateur** | Compass complet — toutes zones, illimité |
| **Studio** | Idem + priorité traitement (file dédiée) |

---

## 9. Règles de prompt Ariane — invariantes

Les suggestions générées (🔍 et ✨) respectent les mêmes contraintes que NarraMind :
- **Langage auteur** : noms de personnages, lieux, événements — jamais de jargon technique (`embedding`, `vector`, `source_id`...)
- **Jamais affirmatif sur un fait non établi** : les suggestions ✨ utilisent "tu pourrais", "une piste", "peut-être" — jamais présenté comme vrai
- **Toujours révisable** : chaque suggestion peut être modifiée par l'utilisateur avant ajout
- **Jamais bloquant** : ignorer toutes les suggestions ne change rien au fonctionnement de DreamWeave

---

## 10. Lien Projet Innovant WSF5

Cette spec constitue la base d'une **Itération 4** pour le dossier WSF5 :
- Défi technique nouveau : vectorisation sémantique (pgvector) + retrieval contextuel — distinct des 3 itérations déjà documentées
- Justifie l'introduction des embeddings que l'Itération 2 avait délibérément écartés : le volume et l'usage (propositions créatives ciblées) le rendent pertinent ici
- Démontre l'évolution de NarraMind : réactif (anomalies) → proactif (propositions)

---

*Spec v2 — 21 mai 2026. Réponses ouvertes intégrées. En attente de validation avant implémentation.*
