# NarraMind — Système de mémoire narrative

> NarraMind est le moteur de cohérence narrative de DreamWeave. Il analyse le texte **en arrière-plan** pendant l’écriture, extrait des fiches d’entités (personnages, décors, objets), génère des résumés compacts par chapitre, et calcule des **anomalies** (incohérences vs lore) pour usage **interne** (réponse HTTP, métriques). **Aucune liste d’incohérences n’est conservée pour l’affichage utilisateur** sur `scenario_chapters` : la colonne `narramind_anomalies` est **vidée** (`[]`) après chaque passage pour ne pas en faire le support produit.

**Principe produit (validé avril 2026)** : tout ce que NarraMind **enregistre** en base (entités, résumés, métriques, horodatages) reste **invisible** pour l’utilisateur. **L’endroit où afficher les incohérences** est **à définir** ; pas de bouton « Vérifier / Revérifier ce chapitre » — uniquement un **déclenchement automatique** avec **garde-fous tokens** (intervalle minimum entre deux appels, seuil de mots). Pas de marque « NarraMind » dans l’UI grand public tant que la couche « personnage guide » n’est pas livrée.

---

## 1. Concept

### Problème résolu

Lorsqu’un scénariste enchaîne les chapitres, le contexte IA complet serait trop lourd (tokens, latence, coût).

### Solution

NarraMind maintient un **contexte narratif compressé** :

- Chapitres passés → **résumés courts** (`memory_summaries`)
- Entités récurrentes → **fiches** (`memory_entities`)
- **Anomalies** : produites par le LLM, renvoyées dans le **corps de la réponse** de l’Edge Function et comptabilisées dans `narramind_metrics.anomalies_detected` ; **pas** stockées comme liste utilisateur sur le chapitre scénario

---

## 2. Architecture technique

### Déclenchement automatique (pas d’action manuelle)

NarraMind s’exécute **sans bloquer** l’utilisateur (pas de toast de succès). En cas d’erreur technique, le client peut afficher un toast d’erreur.

| Source | Condition | Fréquence |
|--------|-----------|-----------|
| `ScenarioChapterEditor` | Auto-save réussi + **≥ 80 mots** | **≥ 12 min** entre deux appels **pour ce flux** (même chapitre en session) |
| `UniverseSection` | Sauvegarde du lore monde ou LORE asset | Après sauvegarde (chapitre le plus récent du projet) — événement peu fréquent |

```ts
// src/services/scenarioAI.ts
triggerNarraMindUpdate(projectId, chapterId)
```

### Edge Function `narramind-update`

**Secrets** : `GEMINI_API_KEY`, `GROQ_API_KEY` (fallback), Supabase service role, `ALLOWED_ORIGIN`.

**Modèles** : Gemini 2.0 Flash → 2.5 Flash (429/503) → Groq Llama 3.3 70B.

**Prompt — texte « anomalies »** : `title` et `explanation` sont rédigés **comme pour un auteur**, uniquement en termes **d’histoire** (personnages, lieux, faits établis). **Interdit** dans ces champs : mots « asset », « entité », « fiche », noms de champs JSON (`first_seen_chapter`, etc.) ou tout artefact « code / base de données ».

### Flux de traitement

```
[Déclenchement]
      │
      ▼
1. Chapitre + universe_lore (+ vérif propriété user / project)
2. Résumés chapitres précédents (fenêtre bornée en tokens)
3. Assets (nom, type, prompt, lore)
4. Entités existantes (memory_entities)
      │
      ▼
5. Appel LLM → JSON { entities_to_update[], chapter_summary, anomalies[] }
      │
      ▼
6. Upsert memory_entities, insert memory_summaries
7. PATCH scenario_chapters : narramind_anomalies = [], narramind_checked_at = now
8. Insert narramind_metrics (dont anomalies_detected = length(anomalies))
      │
      ▼
[Réponse HTTP] { success, summary, entities_updated, anomalies, … }
```

---

## 3. Modèle de données

### Tables mémoire (invisibles côté UI)

Voir migrations `20260423120000_add_narramind_tables.sql`, `20260423100000_add_narramind_metrics.sql`.

Résumé : `memory_entities`, `memory_summaries`, `narramind_metrics` — RLS par utilisateur / projet.

### `scenario_chapters` — champs NarraMind

| Colonne | Type | Rôle (état actuel) |
|---------|------|---------------------|
| `narramind_anomalies` | JSONB | Toujours **réinitialisée à `[]`** après un run réussi — **pas** le support des incohérences utilisateur |
| `narramind_checked_at` | TIMESTAMPTZ | Horodatage du dernier run (technique) |

---

## 4. Sécurité (RLS)

JWT vérifié dans l’Edge Function ; tables mémoire avec politiques classiques `auth.uid() = user_id` (ou via projet). Le PATCH chapitre est effectué côté serveur après validation du propriétaire du chapitre.

---

## 5. UI actuelle

- **Pas** de bandeau d’alertes dans l’éditeur scénario, **pas** de bouton de vérification manuelle.
- **Univers / Assets** : copy orientée « cohérence » / « lore », sans badge « NarraMind ».
- **Navigation** : pas de pastille « anomalies » sur l’entrée Scénario (données non exposées sur les chapitres).

---

## 6. Anomalies : format côté LLM (évolution / futur affichage)

Le JSON renvoyé par le modèle peut inclure des objets `anomalies` avec `title`, `explanation`, `severity`, `anchor` (ex. extrait). La normalisation côté serveur reste compatible avec des chaînes simples.

Les **explications affichables plus tard** devront rester en **langage histoire** (cf. §2 prompt).

---

## 7. Vision UX — guide NarraMind (personnage + fil d’Ariane)

> Idée produit validée par Louis : lorsqu’une incohérence sera **utile** à traiter dans l’UI, un **personnage guide** pourra accompagner la navigation jusqu’au passage concerné.

Prérequis : **persistance ou source de vérité** des alertes **hors** `scenario_chapters.narramind_anomalies` (ex. table dédiée, ou autre), à trancher lors du jalon d’affichage.

### Principes (inchangés à haut niveau)

- Le guide n’apparaît **que** lorsqu’il existe au moins une **anomalie active** pertinente.
- Le parcours **réutilise la navigation existante**.

---

## 8. État d’avancement

| Élément | Statut |
|---------|--------|
| Tables `memory_*`, métriques, EF `narramind-update` | ✅ |
| Contexte résumés chapitres précédents (budget tokens) | ✅ |
| Pas de persistance anomalies sur chapitre pour l’UI | ✅ (liste vidée à chaque run) |
| Déclenchement auto uniquement + throttle 12 min / 80 mots (éditeur) | ✅ |
| UI alertes / guide personnage | 🔜 (affichage à définir) |
| Compression résumés si `needs_compression` | 🔜 |

---

## 9. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `supabase/functions/narramind-update/index.ts` | Edge Function |
| `supabase/migrations/20260430120000_scenario_chapters_narramind_anomalies.sql` | Colonnes `narramind_*` sur chapitres |
| `src/services/scenarioAI.ts` | `triggerNarraMindUpdate` |
| `src/services/scenarioChapters.ts` | `parseNarrativeCoherenceAlerts` (utilitaire si réintroduction d’affichage) |
| `src/pages/ScenarioChapterEditor.tsx` | Déclenchement auto-save |
| `src/components/project/UniverseSection.tsx` | Déclenchement lore |

---

## 10. Prochaine phase (priorisée — Q2 2026)

1. **Persistance des alertes** : table dédiée (ex. `narramind_alerts` ou équivalent) — `project_id`, `chapter_id` optionnel, `severity`, `title`, `explanation`, `anchor`, statut (active / acquittée / ignorée), `created_at`. Ne pas réutiliser `scenario_chapters.narramind_anomalies` comme support produit.
2. **EF** : après analyse, upsert des lignes d’alerte (idempotence par hash ou par clé `(chapter_id, titre_normalisé)` selon choix produit) au lieu de s’appuyer sur la réponse HTTP seule.
3. **UI** : bandeau ou panneau dans l’éditeur scénario — liste filtrable par sévérité ; actions « Marquer comme traité » / « Ignorer » ; pas de marque « NarraMind » grand public tant que le personnage guide n’est pas prêt (cf. §7).
4. **Ensuite** : compression résumés si `needs_compression` ; personnage guide pointant vers les passages (prérequis = alertes persistées).

---

*Dernière mise à jour : 30 avril 2026 — §10 prochaine phase ; retrait affichage/stockage anomalies sur chapitres, pas de bouton manuel, throttle auto, consignes langage « histoire » pour les explications, docs alignées.*
