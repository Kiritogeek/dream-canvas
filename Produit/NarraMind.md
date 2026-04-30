# NarraMind — Système de Mémoire Narrative

> NarraMind est le cerveau mémoire de DreamWeave. Il analyse le texte en arrière-plan pendant l'écriture, extrait des fiches d'entités (personnages, décors, objets), génère des résumés compacts par chapitre, et détecte les incohérences avec le lore établi.

---

## 1. Concept et philosophique

### Problème résolu

Lorsqu'un scénariste écrit plusieurs chapitres, l'IA scénariste (Gemini) perd la mémoire des chapitres précédents. Passer tous les textes en contexte serait prohibitif (des milliers de tokens, latence, coût).

### Solution NarraMind

NarraMind maintient un **contexte narratif compressé** :
- Les chapitres passés sont réduits à des **résumés de 60-80 tokens** (`memory_summaries`)
- Les personnages, lieux et objets récurrents sont maintenus dans des **fiches entités** (`memory_entities`)
- Quand l'IA scénariste génère du contenu, elle reçoit ces fiches et résumés au lieu des textes bruts

Le résultat : une cohérence narrative sur toute la longueur de l'œuvre, à un coût token minimal.

---

## 2. Architecture technique

### Déclenchement automatique

NarraMind s'active **en arrière-plan** (fire-and-forget, sans bloquer l'utilisateur) :

| Source | Condition | Debounce |
|--------|-----------|----------|
| `ScenarioChapterEditor` | Auto-save réussi + ≥ 50 mots | 5 min entre deux appels |
| `UniverseSection` | Sauvegarde du lore projet | À chaque sauvegarde |

```ts
// src/services/scenarioAI.ts
triggerNarraMindUpdate(projectId, chapterId).catch(() => {});
```

### Edge Function `narramind-update`

**Secrets requis :**
- `GEMINI_API_KEY`
- `GROQ_API_KEY` (fallback)
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGIN`

**Modèles IA :**
| Priorité | Modèle | Condition |
|----------|--------|-----------|
| 1 (primaire) | Gemini 2.0 Flash | Appel standard |
| 2 (fallback) | Gemini 2.5 Flash | Si 429 ou 503 sur primaire |
| 3 (urgence) | Groq Llama 3.3 70B | Si les deux Gemini indisponibles |

### Flux de traitement

```
[Déclenchement]
      │
      ▼
1. Récupère chapitre + universe_lore
2. Récupère assets du projet (name, type, prompt, lore)
3. Récupère entités existantes (memory_entities)
      │
      ▼
4. Appel Gemini (avec fallbacks)
   Prompt : système NarraMind + lore + assets + entités + chapitre
   Réponse JSON :
     - entities_to_update[]
     - chapter_summary
     - anomalies[]
      │
      ▼
5. Upsert memory_entities (résolution par {project_id, name})
6. Insert memory_summaries (résumé du chapitre)
7. Insert narramind_metrics (métriques, fire-and-forget)
      │
      ▼
[Retour] { success, summary, entities_updated, anomalies, total_context_tokens, needs_compression }
```

---

## 3. Modèle de données

### `memory_entities`

Fiches d'entités narratives — une fiche par entité unique par projet.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Clé primaire |
| `project_id` | UUID | Projet parent |
| `user_id` | UUID | Propriétaire |
| `asset_id` | UUID? | Lien optionnel vers `assets` |
| `name` | TEXT | Nom de l'entité (unique par projet) |
| `entity_type` | TEXT | `character` / `background` / `object` |
| `traits` | JSONB `[]` | Liste de traits caractéristiques |
| `relations` | JSONB `[]` | `[{ with: string, type: string }]` |
| `lore_summary` | TEXT | Résumé narratif de l'entité |
| `last_seen_chapter` | INTEGER | Dernier chapitre mentionné |
| `first_seen_chapter` | INTEGER | Premier chapitre d'apparition |
| `token_estimate` | INTEGER | Estimation tokens (pour budget contexte) |
| `updated_at` | TIMESTAMPTZ | Dernière mise à jour |

**Contrainte :** `UNIQUE(project_id, name)` → upsert par `resolution=merge-duplicates`.

### `memory_summaries`

Résumés compacts par chapitre — utilisés comme contexte pour l'IA.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Clé primaire |
| `project_id` | UUID | Projet parent |
| `user_id` | UUID | Propriétaire |
| `chapter_id` | UUID? | Lien vers `scenario_chapters` |
| `chapter_number` | INTEGER | Numéro du chapitre |
| `summary` | TEXT | Résumé 60-80 tokens |
| `token_estimate` | INTEGER | Taille estimée du résumé |

### `narramind_metrics`

Métriques d'exécution pour monitoring et optimisation.

| Colonne | Type | Description |
|---------|------|-------------|
| `project_id` | UUID | Projet |
| `chapter_number` | INTEGER | Chapitre traité |
| `mode` | TEXT | `narramind_v1` |
| `context_tokens` | INTEGER | Total tokens contexte envoyés |
| `response_tokens` | INTEGER | Total tokens réponse reçue |
| `chapters_in_context` | INTEGER | Nombre de résumés en contexte |
| `duration_ms` | INTEGER | Temps d'exécution Gemini |

---

## 4. Sécurité (RLS)

| Table | Politique |
|-------|-----------|
| `memory_entities` | ALL pour `auth.uid() = user_id` |
| `memory_summaries` | ALL pour `auth.uid() = user_id` |
| `narramind_metrics` | SELECT + INSERT filtrés par `project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())` |

JWT vérifié dans l'Edge Function avant tout traitement.

---

## 5. Gestion du budget contexte

```
Budget total = Σ token_estimate (memory_summaries) + Σ token_estimate (memory_entities)
```

- Seuil d'alerte : `total_summary_tokens > 800` → `needs_compression: true`
- La compression automatique des anciens résumés **n'est pas encore implémentée**
- Actuellement : accumulation sans limite (pas de problème pratique avant ~30 chapitres)

---

## 6. État actuel et manques

### Fonctionnel ✅
- Tables BDD créées et sécurisées (migrations `20260423*`)
- Edge Function `narramind-update` opérationnelle (Gemini + fallbacks)
- Déclenchement auto depuis `ScenarioChapterEditor` (5 min + ≥ 50 mots)
- Déclenchement depuis `UniverseSection` (sauvegarde lore)
- Métriques loguées dans `narramind_metrics` (avec `duration_ms` depuis Phase 11)
- Service client `triggerNarraMindUpdate` dans `scenarioAI.ts`

### À faire 🔴

| Priorité | Fonctionnalité | Description |
|----------|----------------|-------------|
| P1 | **Types TS** | `memory_entities`, `memory_summaries`, `narramind_metrics` absents de `supabase/types.ts` — régénérer |
| P1 | **Frontend de visualisation** | Aucun composant pour voir les entités mémorisées (onglet Univers ou panneau dédié) |
| P2 | **Compression des résumés** | Quand `needs_compression: true`, fusionner les vieux résumés en un méga-résumé |
| P2 | **Lien assets ↔ entités** | Connecter `memory_entities.asset_id` aux assets correspondants |
| P3 | **Alertes anomalies** | Afficher les incohérences détectées à l'utilisateur dans l'éditeur scénario |
| P3 | **NarraMind dans prompts image** | Injecter les fiches entités dans les prompts de génération de panels pour cohérence visuelle |

---

## 7. Vision produit

### Interface utilisateur cible

Un onglet **"Mémoire"** (ou section dans "Univers") dans le détail projet, accessible depuis `ProjectDetail`, montrant :

```
┌─────────────────────────────────────────────────────┐
│  🧠 Mémoire NarraMind                               │
│                                                     │
│  PERSONNAGES (4)                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ Clara  Ch.1 → Ch.3  "enceinte, maladroite"  │   │
│  │ Marc   Ch.1 → Ch.3  "mari, distrait"        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  RÉSUMÉS (3 chapitres)                              │
│  Ch.1 : Clara chute dans les escaliers,             │
│         Marc appelle le 15...                       │
│                                                     │
│  ⚠️ 1 anomalie détectée (Ch.2)                      │
└─────────────────────────────────────────────────────┘
```

### Utilisation future dans la génération IA

Les fiches `memory_entities` servent de **contexte structuré persistant** pour :
1. La génération de nouveaux chapitres (personnages connus → cohérence narrative)
2. La génération de prompts d'images (traits et lore → cohérence visuelle entre panels)
3. La détection d'anomalies en temps réel pendant l'écriture

---

## 8. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `supabase/functions/narramind-update/index.ts` | Edge Function principale |
| `src/services/scenarioAI.ts` | Client `triggerNarraMindUpdate()` |
| `src/pages/ScenarioChapterEditor.tsx` | Déclenchement auto (5 min) |
| `src/components/project/UniverseSection.tsx` | Déclenchement sur lore save |
| `supabase/migrations/20260423120000_add_narramind_tables.sql` | Tables `memory_entities` + `memory_summaries` |
| `supabase/migrations/20260423100000_add_narramind_metrics.sql` | Table `narramind_metrics` |
| `supabase/migrations/20260423200000_fix_narramind_fk.sql` | Fix FK `user_id → auth.users` |

---

*Dernière mise à jour : 30 avril 2026*
