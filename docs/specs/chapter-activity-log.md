# Spécification — Journal d’activité canvas (historique chapitre)

## Objectif produit

Offrir aux auteurs une **trace persistante des images générées** sur un chapitre visuel, ainsi que des **points de sauvegarde lorsqu’une case avec image est supprimée**, avec possibilité de **restaurer** l’image sur le canvas.

## État implémenté

Table Postgres **`chapter_canvas_image_history`** (voir migration dédiée) avec RLS `auth.uid() = user_id`. Le flyout **Historique** du rail gauche :

| `event_kind` | Quand |
|--------------|-------|
| `image_generated` | Après mise à jour du layout avec succès suite à une génération d’image (prompt + URL + géométrie du bloc conservés). |
| `case_removed_with_image` | Quand une case comportant encore une **`image_url`** est supprimée après confirmation — même prompt, même image, géométrie avant suppression. |

**Restauration** : depuis l’historique, un bouton rajoute une **nouvelle** case avec l’URL, le prompt et de préférence la géométrie enregistrée (sinon centrée avec tailles par défaut).

**Persistance** : données **entre sessions**, via TanStack Query + Supabase après application de la migration.

## Vision cible — historique pérenne

### Cas d’usage clés

- **Lister toutes les images générées** pour ce chapitre, **y compris** celles dont la case n’existe plus ou dont l’URL courante sur le bloc a été remplacée.
- Filtrer par **panel**, par **case** (`block_id`), ou par **mot-clé dans le prompt**.
- Prévisualisation miniature + lien **ouvre dans un nouvel onglet** (comme dans le MVP).
- Option : « **Restaurer cette version** » si l’éditeur le permet politiquement (coûts stockage).

### Modèle de données recommandé (Supabase / Postgres)

Une table **`chapter_canvas_events`** (ou `visual_chapter_audit_log`) :

| Colonne | Type | Notes |
|---------|------|--------|
| `id` | `uuid`, PK | |
| `user_id` | `uuid`, FK profiles | Qui a agi |
| `chapter_id` | `uuid`, FK chapters | Périmètre chapitre visuel |
| `panel_canvas_id` | `uuid`, nullable FK | `chapter_canvases.id` au moment de l’event |
| `event_type` | `text` ou enum | `case_added`, `image_generated`, `color_added`, `bubble_added`, `case_removed`, … |
| `payload` | `jsonb` | Champs métier : `{ block_id, prompt, image_url?, fill?, bubble_type?, source?, dimensions? }` |
| `created_at` | `timestamptz` | Horodatage serveur |

**Recommandations** :

1. **`image_generated`** : systématiquement insérer une ligne avec `prompt` **normalisé** (trim) et `image_url` retournée par le fournisseur, **après succès HTTP** mais **avant** ou **après** la mise à jour du layout (deux transactions ou une transaction unique si Edge Function orchestrée).
2. **Régénération** : chaque nouveau rendu ajoute une **nouvelle** ligne ; la case référencée par `payload.block_id` garde uniquement **la version courante** dans `chapter_canvases.layout`, mais l’historique conserve **toutes** les URLs.
3. **`case_removed`** : soit un event dédié avec copie finale du dernier état pertinent dans `payload`, soit garder uniquement les `image_generated` antérieurs (souvent suffisant). Combiner les deux aide le storytelling « pourquoi j’ai perdu cette variante ».
4. **RLS** : même règle que pour `chapter_canvases` (lecture/écriture limitée au propriétaire OU politique projet partagée future).

### Intégration applicative

- **Insertion** : depuis le **succès des mutations centralisées** (hooks `useGeneratePanelImage`, `useUpdatePanel`) ou mieux : **fonction Postgres / Edge Function** commune pour garantir qu’aucun client ne saute le log.
- **Lecture** : infinite query TanStack avec `chapter_id`, tri `created_at desc`, pagination curseur (`id`/`created_at`).
- **Vue UI** : `ChapterImageHistoryList` dans le même flyout que la bibliothèque, données via `useChapterCanvasImageHistory(chapterId)`.

### Stockage média

Les URLs peuvent être des liens tiers **avec TTL** : sans copie objet, une trace « perdue » existe après expiration.

**Options** :

- **Référence seulement** : léger ; lien peut casser.
- **Copie Blob** DreamWeave (bucket) à chaque génération avec `stored_path` dans `payload` — recommandé si la promesse produit inclut « retrouver toutes les images ».

### Respect vie privée / volume

- Limiter taille JSON `prompt` au même plafond qu’API (éviter payloads énormes).
- Purge optionnelle après N jours (plan gratuit) vs illimitée (plan pro).

### Tests QA

1. Ajout case puis vérifier event en base avec `payload.block_id`.
2. Génération x2 même case → deux lignes `image_generated` avec URLs différentes.
3. Suppression case → présence soit d’un event `case_removed`, soit anciennes lignes `image_generated` toujours listables.
4. Accès tiers / RLS refus hors utilisateur propriétaire.

## Synthèse

Le bouton **Historique** livre déjà une **première valeur** pendant la session. Pour la promesse complète (« existants ou supprimés, toute la trace du chapitre »), la **source de vérité doit être serveur**, avec évènements **`image_generated` immutables** et optionnel **stockage fichier** prolongeant la durée de vie des visuels.
