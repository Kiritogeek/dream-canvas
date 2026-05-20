# WSF5 — Projet Innovant : NarraMind
### Système de mémoire narrative & cohérence scénaristique pour DreamWeave

---

## 1. Projet

### 1.1 Présentation du projet

**NarraMind** est le moteur de mémoire narrative de DreamWeave. Son rôle : permettre à une IA scénariste de maintenir la cohérence d'un webtoon sur des dizaines de chapitres, sans jamais saturer la fenêtre de contexte d'un LLM.

Il s'insère dans DreamWeave comme une **couche invisible** : l'utilisateur n'interagit pas avec NarraMind directement — il écrit son scénario, et si une incohérence est détectée, le personnage-guide **Ariane** la lui signale dans un panneau dédié, en langage "histoire" (pas en jargon IA).

**NarraMind n'est pas une feature de génération. C'est une couche de mémoire et de cohérence.**

### 1.2 Objectifs du projet

| # | Objectif | Cible mesurable |
|---|----------|-----------------|
| O1 | Maintenir un contexte LLM **stable** quel que soit le nombre de chapitres | ≤ 1 400 tokens de contexte compressé au chapitre 20 |
| O2 | Détecter les incohérences narratives (personnage décédé qui réapparaît, lore contradictoire, etc.) | Anomalies détectées et persistées dans `narramind_alerts` |
| O3 | Présenter les alertes à l'auteur **sans l'interrompre** | Déclenchement invisible, panneau Continuité consulté sur demande |
| O4 | Conserver le lore de l'univers sur le long terme | `memory_entities`, `memory_summaries`, `narra_summary` cohérents à 50 chapitres |

### 1.3 Enjeux

**Enjeu technique — La fenêtre de contexte LLM**
Un LLM a une limite de tokens. Injecter brut l'intégralité des chapitres précédents croît linéairement (~850 tokens par chapitre ajouté). Dès 10 chapitres, la latence double et les coûts explosent. À 50 chapitres, l'approche naive est inutilisable. NarraMind résout ce problème par compression multi-niveaux.

**Enjeu UX — Ne jamais bloquer l'auteur**
NarraMind ne doit pas ralentir ni interrompre l'écriture. Déclenchement automatique, pas de bouton "Vérifier", pas d'écran de données brutes. L'auteur n'a conscience du système que quand Ariane a quelque chose d'utile à lui dire.

**Enjeu de cohérence — Lore vs histoire**
Les alertes doivent être rédigées en **langage auteur** (personnages, événements, lieux) — jamais en vocabulaire technique (`asset_id`, `memory_entity`, etc.). La confiance de l'auteur dans le système dépend de la qualité et de la pertinence des alertes.

---

## 2. Description fonctionnelle

### 2.1 Expérience utilisateur attendue

Du point de vue de l'auteur, NarraMind est **invisible par défaut** :

1. L'auteur ouvre l'éditeur de chapitre et écrit son texte.
2. À l'auto-save (≥ 80 mots), NarraMind s'exécute silencieusement en arrière-plan.
3. Si une incohérence est détectée, le bouton **Continuité** (icône Ariane) dans l'éditeur l'indique.
4. L'auteur ouvre le panneau Continuité : il voit une liste d'alertes (titre + explication en langage histoire + sévérité).
5. Il peut marquer chaque alerte **"Traitée"** ou **"Ignorer"** — la décision finale lui appartient toujours.
6. Aucun écran de "fiches entités" ni de "résumés techniques" n'est exposé.

NarraMind s'exécute aussi lors de la sauvegarde du **lore monde** dans l'onglet Univers — pour propager les nouvelles règles au dernier chapitre analysé.

### 2.2 Résultats attendus

| Résultat | Indicateur |
|----------|-----------|
| Contexte LLM compressé et stable | ≤ 1 400 tokens au chapitre 10, stable ensuite |
| Croissance sous-linéaire | ~50 tokens/chapitre (vs ~850 en baseline) |
| Alertes exploitables | Rédigées en langage histoire, titre + explication, sévérité low/medium/high |
| Persistance des alertes | Table `narramind_alerts` avec statuts active/dismissed/resolved |
| Mémoire longue fiable | `narra_summary` mis à jour par arc + compression batch des résumés anciens |

### 2.3 Ce que NarraMind ne fait pas

- Il ne bloque jamais l'écriture.
- Il ne génère pas le scénario (c'est `generate-scenario-ai`).
- Il n'expose pas les données brutes de mémoire à l'utilisateur.
- Il ne revendique pas la propriété de l'œuvre — le LORE est écrit par l'utilisateur.

---

## 3. Modélisation technique

### 3.1 Approche algorithmique — compression multi-niveaux

Le problème central : comment fournir à un LLM un contexte narratif **riche mais borné**, quel que soit le nombre de chapitres écrits ?

**Architecture à 3 niveaux :**

```
NIVEAU 1 — Fiches entités (memory_entities)
  → Upsert par nom : les entités sont mises à jour, jamais dupliquées
  → Croissance O(1) en tokens (50 personnages = ~300 tokens fixes)

NIVEAU 2 — Résumés glissants (memory_summaries)
  → ~80 tokens par chapitre
  → Compression batch : les 8 résumés les plus anciens sont fusionnés
    par le LLM quand le seuil de tokens est atteint

NIVEAU 3 — Méga-résumé projet (narra_summary)
  → Consolidation périodique des arcs passés
  → Stocké en BDD, tronqué au prompt si dépassement
```

**Prompt construit à chaque run de narramind-update :**

```
[Méga-résumé projet]         ~400 tokens
[Résumés récents chapitres]  ~300 tokens  (fenêtre bornée)
[Entités mémoire]            ~300 tokens  (budgetées, priorité : récentes + mentionnées)
[Universe lore]              tronqué si > 14k caractères
[Chapitre courant intégral]  toujours entier
─────────────────────────────────────────
Total cible                  ≤ 1 400 tokens (hors chapitre courant)
```

**Résultat LLM (JSON structuré) :**
```json
{
  "entities_to_update": [...],
  "chapter_summary": "...",
  "anomalies": [{ "title": "...", "explanation": "...", "severity": "..." }]
}
```

Les anomalies sont immédiatement **upsertées** dans `narramind_alerts` avec dédoublonnage (`dedupe_key`). Les alertes actives absentes du run courant passent en `resolved` automatiquement.

### 3.2 Déclenchement automatique avec garde-fous

```
ScenarioChapterEditor
  → auto-save réussi + ≥ 80 mots + throttle 12 min (même chapitre en session)
  → triggerNarraMindUpdate(projectId, chapterId)

UniverseSection
  → sauvegarde lore monde ou LORE asset
  → triggerNarraMindUpdate(projectId, dernierChapitre)
```

Pas de bouton "Vérifier" — uniquement déclenchement automatique.

### 3.3 Technologies employées et justifications

| Composant | Choix retenu | Alternatives | Justification |
|-----------|-------------|--------------|---------------|
| LLM principal | Google Gemini 2.0 Flash → 2.5 Flash | GPT-4o, Claude | Quotas généreux, faible coût/token, vitesse, qualité narrative |
| LLM fallback | Groq Llama 3.3 70B | Mistral | Fallback si Gemini 429/503 — même API OpenAI-compatible |
| Runtime EF | Deno (Supabase Edge Functions) | Node.js Lambda | Cold start rapide, isolation sécurisée, natif Supabase |
| Persistance mémoire | PostgreSQL + RLS | Redis, Pinecone | Fiabilité, transactions, isolation multi-tenant native |
| Cache client | TanStack React Query | SWR | Stale-while-revalidate + invalidation ciblée après mutation |
| Format mémoire | JSON structuré (JSONB) | Embeddings vectoriels | Pas de RAG nécessaire à ce volume — JSON suffisant et plus rapide |

**Pourquoi ne pas utiliser d'embeddings vectoriels ?**
Pour des projets de 10–50 chapitres (notre cible MVP), la compression par résumé LLM + fiches entités est plus précise, plus rapide et moins coûteuse qu'un pipeline RAG (pas d'index, pas de reranking, pas de latence d'embedding). Les embeddings seraient pertinents pour des projets > 200 chapitres, non ciblés en V1.

---

## 4. Méthodologie de prototypage du POC

> Les 3 itérations portent chacune sur un **défi technique distinct** : mesure du problème, résolution algorithmique, persistance et UX.

### Itération 1 — Baseline : LLM sans mémoire (23 avril 2026)

**Défi technique :** Mesurer concrètement la croissance du contexte LLM avec l'injection brute du scénario, et établir la baseline tokens/latence/cohérence.

**Implémentation :**
- Mode `baseline` dans `generate-scenario-ai` : injection brute de tous les chapitres en texte brut
- Table `narramind_metrics` créée pour logguer : `context_tokens`, `response_tokens`, `duration_ms`, `chapters_in_context`
- Migration : `20260423100000_add_narramind_metrics.sql`

**Mesures relevées :**

| Métrique | Chap. 6 (5 chap. contexte) | Chap. 7 (6 chap. contexte) |
|----------|---------------------------|---------------------------|
| `context_tokens` | 3 930 | 4 849 |
| `response_tokens` | 912 | 898 |
| `duration_ms` | 7 412 ms | 14 048 ms |
| Tokens ajoutés/chapitre | ~786 | +919 |

**Projections extrapolées (~850 tokens/chapitre) :**
- 10 chapitres → ~8 500 tokens, ~28 s estimé
- 20 chapitres → ~17 000 tokens, >60 s estimé
- 50 chapitres → ~42 500 tokens — usage dégradé

**Résultat et analyse ✅**

La croissance est **linéaire à ~850 tokens/chapitre** (hypothèse initiale : 700). L'effet le plus frappant est la **latence** : +1 chapitre a suffi à quasi-doubler le temps de réponse (7,4 s → 14 s), alors que la réponse générée est identique en taille. Le problème n'est pas seulement théorique (coût tokens) — il est **déjà ressenti par l'utilisateur dès 6 chapitres**.

**Correctif décidé :** NarraMind V1 cible un contexte stable à ~1 400 tokens, soit 10x plus compact à 10 chapitres, avec une latence indépendante du nombre de chapitres.

---

### Itération 2 — NarraMind V1 : Fiches entités + résumé glissant (23 avril 2026)

**Défi technique :** Remplacer le scénario brut par une mémoire structurée. Valider que la cohérence est au moins équivalente à 10x moins de tokens.

**Implémentation :**
- Edge Function `narramind-update` créée (Gemini Flash primaire + Groq fallback)
- Tables `memory_entities` et `memory_summaries` créées
- Colonne `assets.lore` ajoutée + champ LORE dans l'UI Assets
- Déclenchement automatique depuis `ScenarioChapterEditor` (auto-save, throttle 12 min, ≥ 80 mots)
- Déclenchement depuis `UniverseSection` (sauvegarde lore)
- Mode `narramind` dans `generate-scenario-ai` pour injecter la mémoire compressée
- Migrations : `20260423110000_add_lore_to_assets.sql`, `20260423120000_add_narramind_tables.sql`

**Mesures relevées :**

| Métrique | Itération 1 (baseline) | Itération 2 (NarraMind V1) |
|----------|------------------------|---------------------------|
| Tokens contexte chap. 1 | ~140 | **247** |
| Tokens contexte chap. 3 | ~2 520 | **441** |
| Tokens contexte chap. 5 | ~3 930 | **518** |
| Tokens contexte chap. 6 | ~4 849 | **557** |
| Croissance par chapitre | ~850 tokens | **~50 tokens** |
| Ratio d'efficacité au chap. 6 | — | **7× plus compact** |
| Anomalies LORE détectées | 0 (pas de système) | 0 (LORE non encore renseigné) |

**Résultat et analyse ✅**

La cible était 1 000–1 400 tokens stables. NarraMind V1 atteint **557 tokens au chapitre 6**, soit **7× plus compact**. La croissance est quasi-plate (~50 tokens/chapitre vs ~850) grâce à l'upsert des entités : les personnages/décors sont **mis à jour, pas dupliqués** à chaque chapitre.

**Correctif identifié :** La détection d'anomalies nécessite que le LORE soit renseigné sur les assets. Sans LORE, le LLM n'a pas de règles à vérifier. L'Itération 3 adresse la persistance des alertes et l'UI de présentation.

---

### Itération 3 — NarraMind V2 : Persistance des alertes + UI Ariane + Mémoire longue (mai 2026)

**Défi technique :** Persister les alertes de façon idempotente (pas de doublons, statuts gérés), les présenter via un personnage-guide en langage auteur, et assurer la mémoire longue sur les projets > 10 chapitres.

**Implémentation :**

*Persistance des alertes (narramind_alerts)*
- Table `narramind_alerts` créée avec `dedupe_key`, statuts `active / dismissed / resolved`, sévérité, ancrage texte
- Upsert depuis l'EF `narramind-update` : les alertes actives absentes du run courant passent en `resolved` automatiquement
- Service `narramindAlerts.ts` + hook `useNarraMindAlerts` (React Query)
- Migration : `20260430140000_narramind_alerts.sql`

*Mémoire longue (narra_summary + compression batch)*
- Colonne `projects.narra_summary` : méga-résumé projet mis à jour à chaque run
- Compression batch dans `narramind-update` : fusion des 8 résumés les plus anciens quand seuil tokens atteint
- Budgets tokens sur assets, entités, lore monde (logs `prompt budgets` dans l'EF)
- Migration : `20260430200000_projects_narra_summary.sql`

*UI Ariane — Panneau Continuité*
- Composant `ArianeContinuityPanel.tsx` : tiroir latéral dans l'éditeur de chapitre
- Liste des alertes actives avec filtres, actions "À relire / Traitée / Ignorer"
- Section "Assets manquants" : NarraMind détecte les personnages/éléments récurrents non encore créés comme assets
- Signature Ariane — langage auteur, pas de jargon technique
- Snapshot `scenario_chapters.narramind_anomalies` : vidé après chaque run (pas de persistance produit sur le chapitre — source de vérité = `narramind_alerts`)

**Mesures relevées :**

| Métrique | Itération 2 | Itération 3 |
|----------|-------------|-------------|
| Alertes persistées | ❌ (corps HTTP uniquement) | ✅ (`narramind_alerts`, dédoublonnage) |
| Mémoire longue | Résumés glissants seulement | ✅ `narra_summary` + compression batch |
| UI alertes | ❌ | ✅ Panneau Continuité (Ariane) |
| Budgets tokens | Non bornés | ✅ caps assets + entités + lore |
| Assets manquants | Non détectés | ✅ section dédiée dans le panneau |

**Résultat et analyse ✅**

Les 3 briques techniques complexes ont été validées : la persistance idempotente avec dédoublonnage fonctionne (alertes non dupliquées sur des runs successifs du même chapitre), la compression batch maintient le contexte borné sur les projets > 10 chapitres, et le panneau Continuité présente les alertes en langage auteur sans exposer les données techniques internes.

**Correctif apporté :** Le prompt LLM pour les alertes a été durci — interdiction d'utiliser les mots "asset", "entité", "fiche", noms de champs JSON dans les champs `title` et `explanation`. Les alertes doivent être rédigées comme si elles venaient d'un lecteur attentif, pas d'une base de données.

---

## 5. Documentation technique de mise en œuvre

### 5.1 Stack technique (post-stabilisation POC)

| Couche | Technologie | Version |
|--------|------------|---------|
| Edge Function | Deno (Supabase native) | natif |
| LLM principal | Google Gemini 2.0 Flash → 2.5 Flash | API OpenAI-compat |
| LLM fallback | Groq Llama 3.3 70B | API OpenAI-compat |
| BDD | Supabase PostgreSQL | Cloud |
| ORM client | Supabase JS SDK | v2 |
| Frontend | React 18.3 + TypeScript 5.8 | — |
| Cache serveur | TanStack React Query 5.83 | — |

### 5.2 Architecture technique

```
[ScenarioChapterEditor / UniverseSection]
          │ auto-save ≥ 80 mots + throttle 12 min
          │ ou sauvegarde lore
          ▼
[triggerNarraMindUpdate] ← src/services/scenarioAI.ts
          │ supabase.functions.invoke('narramind-update', { project_id, chapter_id })
          │ Authorization: Bearer <JWT utilisateur>
          ▼
[Edge Function: narramind-update]
          │
          ├── 1. Vérification propriété user/projet/chapitre
          ├── 2. Lecture : chapitre + universe_lore + assets.lore
          ├── 3. Lecture : memory_entities + memory_summaries (budget tokens)
          ├── 4. Lecture : narra_summary (méga-résumé)
          │
          ├── 5. Appel Gemini Flash → JSON { entities_to_update, chapter_summary, anomalies }
          │         ↳ Fallback Gemini 2.5 Flash (429/503)
          │         ↳ Fallback Groq Llama 3.3 70B
          │
          ├── 6. Upsert memory_entities (par project_id + name)
          ├── 7. Insert memory_summaries
          ├── 8. Compression batch si seuil tokens (8 résumés anciens → méga-résumé)
          ├── 9. Upsert narramind_alerts (dedupe_key, auto-resolve alertes absentes)
          ├── 10. PATCH scenario_chapters : narramind_checked_at, narramind_anomalies = []
          ├── 11. Insert narramind_metrics
          │
          └── Réponse HTTP { success, summary, entities_updated, anomalies }

[ArianeContinuityPanel]
          │ useNarraMindAlerts(projectId, { chapterId, statuses: ['active'] })
          └── Affiche alertes + actions (À relire / Traitée / Ignorer)
```

### 5.3 Fichiers clés

| Fichier | Rôle |
|---------|------|
| `supabase/functions/narramind-update/index.ts` | Edge Function principale |
| `src/services/scenarioAI.ts` | `triggerNarraMindUpdate` |
| `src/services/narramindAlerts.ts` | Lecture + résoudre / ignorer alertes |
| `src/hooks/useNarramindAlerts.ts` | React Query hook alertes |
| `src/hooks/useNarraMindDebounce.ts` | Throttle déclenchement client |
| `src/components/ariane/ArianeContinuityPanel.tsx` | Panneau Continuité |
| `src/pages/ScenarioChapterEditor.tsx` | Déclenchement auto-save |
| `src/components/project/UniverseSection.tsx` | Déclenchement sauvegarde lore |

### 5.4 Migrations BDD

| Migration | Contenu |
|-----------|---------|
| `20260423100000_add_narramind_metrics.sql` | Table `narramind_metrics` |
| `20260423110000_add_lore_to_assets.sql` | Colonne `assets.lore` |
| `20260423120000_add_narramind_tables.sql` | Tables `memory_entities`, `memory_summaries` |
| `20260423200000_fix_narramind_fk.sql` | Correctif FK |
| `20260423210000_add_universe_lore.sql` | Lore monde projet |
| `20260430120000_scenario_chapters_narramind_anomalies.sql` | Colonnes `narramind_anomalies`, `narramind_checked_at` |
| `20260430140000_narramind_alerts.sql` | Table `narramind_alerts` |
| `20260430200000_projects_narra_summary.sql` | Colonne `projects.narra_summary` |

### 5.5 Variables d'environnement (Edge Function)

| Variable | Rôle |
|----------|------|
| `GEMINI_API_KEY` | LLM principal |
| `GROQ_API_KEY` | LLM fallback |
| `SUPABASE_URL` | URL projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Accès service role (RLS bypass côté serveur) |
| `ALLOWED_ORIGIN` | CORS |

### 5.6 Sécurité

- JWT utilisateur vérifié dans l'EF avant tout accès BDD
- Vérification de propriété : le chapitre traité appartient bien à l'utilisateur authentifié
- Le service_role est utilisé **uniquement côté serveur** pour les upserts cross-table
- RLS activé sur toutes les tables NarraMind (`auth.uid() = user_id`)

---

## 6. Plan de release

| Phase | Période | Statut | NarraMind — fonctionnalités |
|-------|---------|--------|----------------------------|
| **Beta / MVP** | Jan–Mar 2026 | ✅ Livré | `narramind-update` v1 — entités + résumés + métriques. Déclenchement auto. |
| **V1 — Panels** | Avr–Mai 2026 | ✅ Livré | `narramind_alerts` persistées + UI Ariane Panneau Continuité + mémoire longue `narra_summary` + compression batch + budgets tokens |
| **V2 — Export** | Jul–Sep 2026 | 📅 Planifié | Quotas NarraMind par plan (Libre : 3 alertes max / Créateur : complet / Studio : mémoire longue prioritaire) + tests sur corpus long (20–50 chapitres) |
| **V3 — Scale** | Oct–Déc 2026 | 🔮 Futur | Récupération ciblée par entité (second appel léger sur chapitres anciens sélectionnés) + regroupement alertes par personnage/lieu + fine-tuning prompt sur corpus webtoon |

### Ce qui reste à faire (backlog NarraMind)

| # | Item | Phase |
|---|------|-------|
| 1 | Gate par plan (`profiles.plan` → quotas alertes) | V2 |
| 2 | Validation sur corpus 20–50 chapitres réels | V2 |
| 3 | Notifications proactives hors éditeur (pastille sidebar) | V2 |
| 4 | Pagination + regroupement alertes sur gros projets | V2 |
| 5 | Récupération ciblée par entité (RAG léger) | V3 |

---

### Note — Liberté vs contrainte

NarraMind ne bloque jamais l'utilisateur. Il **informe**. L'auteur peut écrire ce qu'il veut — NarraMind lui signale quand il s'écarte de son propre LORE. La décision finale reste à l'auteur : assumer l'incohérence ou corriger. C'est la distinction clé entre un outil **prescriptif** (bloquant) et un outil **contributif** (accompagnant).

### Note — Propriété intellectuelle

Le LORE est écrit par l'utilisateur. NarraMind ne génère que des *suggestions* issues du contexte de l'histoire, que l'utilisateur peut modifier ou rejeter. L'œuvre, le LORE et tous les assets appartiennent à l'utilisateur. DreamWeave est un outil — comme Photoshop ne revendique pas la propriété des images créées avec lui.

---

*Dernière mise à jour : 20 mai 2026 — restructuration complète selon plan type WSF5, Itération 3 documentée.*
