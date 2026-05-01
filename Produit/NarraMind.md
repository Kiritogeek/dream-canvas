# NarraMind — Système de mémoire narrative

> NarraMind est le moteur de cohérence narrative de DreamWeave. Il analyse le texte **en arrière-plan** pendant l’écriture, extrait des fiches d’entités (personnages, décors, objets), génère des résumés compacts par chapitre, et calcule des **anomalies** (incohérences vs lore). Les alertes **affichables** sont persistées dans la table **`narramind_alerts`** (statuts actif / ignoré / résolu). La colonne `scenario_chapters.narramind_anomalies` sert de **snapshot JSON** du dernier run (compat utilitaires), pas de source unique produit — voir §3.

**Principe produit (validé avril 2026, mis à jour nom interface)** : entités, résumés et métriques restent **non exposés** comme écrans de données brutes. Les **incohérences utilisateur** passent par **`narramind_alerts`** et, en **interface**, par le personnage **Ariane** (jalons §7–§10). Pas de bouton « Vérifier / Revérifier ce chapitre » — uniquement un **déclenchement automatique** avec **garde-fous tokens**. Le libellé **NarraMind** reste **documentation / code / métriques**, pas titre d’écran grand public.

---

## 1. Concept

### Problème résolu

Lorsqu’un scénariste enchaîne les chapitres, le contexte IA complet serait trop lourd (tokens, latence, coût).

### Solution

NarraMind maintient un **contexte narratif compressé** :

- Chapitres passés → **résumés courts** (`memory_summaries`)
- Entités récurrentes → **fiches** (`memory_entities`)
- **Anomalies** : produites par le LLM ; persistées dans **`narramind_alerts`**, renvoyées dans le **corps HTTP** de l’EF et comptées dans `narramind_metrics.anomalies_detected`

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
7. Upsert **narramind_alerts** (clé `dedupe_key` ; les alertes actives absentes du run courant passent en `resolved`)
8. PATCH scenario_chapters : narramind_anomalies = snapshot, narramind_checked_at = now
9. Insert narramind_metrics (dont anomalies_detected = length(anomalies))
      │
      ▼
[Réponse HTTP] { success, summary, entities_updated, anomalies, … }
```

### Branche Git **feat/narramind-persist-alertes**

Branche **dédiée au chantier NarraMind — phase 1 (persistance des alertes)** : migration `narramind_alerts`, écriture depuis l’EF `narramind-update`, types Supabase, service + hook React Query. Sert à **isoler la revue et le merge** de cette brique sans embarquer d’autres évolutions produit ; base avant l’**UI Ariane** (liste / résoudre / ignorer) qui consommera `narramind_alerts`.

---

## 3. Modèle de données

### Tables mémoire (invisibles côté UI)

Voir migrations `20260423120000_add_narramind_tables.sql`, `20260423100000_add_narramind_metrics.sql`.

Résumé : `memory_entities`, `memory_summaries`, `narramind_metrics` — RLS par utilisateur / projet.

### Table **`narramind_alerts`** (alertes cohérence)

Persistance des incohérences pour l’UI future (Ariane) : `project_id`, `chapter_id`, `severity`, `title`, `explanation`, `anchor` (JSONB), `status` (`active` \| `dismissed` \| `resolved`), `dedupe_key`, horodatages. Migration : `20260430140000_narramind_alerts.sql`. Lecture / mise à jour statut côté client : `src/services/narramindAlerts.ts`, hook `useNarramindAlerts`.

### Projet — **`narra_summary`** (mémoire longue)

Texte consolidé (append par chapitre + blocs « arc comprimé »), alimenté uniquement par l’EF `narramind-update`. Colonnes `narra_summary`, `narra_summary_updated_at` — migration `20260430200000_projects_narra_summary.sql`. Pas d’édition obligatoire côté UI pour la phase 3.

### `scenario_chapters` — champs NarraMind

| Colonne | Type | Rôle (état actuel) |
|---------|------|---------------------|
| `narramind_anomalies` | JSONB | **Snapshot** du dernier run (objets normalisés : titre, explication, sévérité, ancre) — **pas** la source de vérité pour l’UI produit |
| `narramind_checked_at` | TIMESTAMPTZ | Horodatage du dernier run (technique) |

---

## 4. Sécurité (RLS)

JWT vérifié dans l’Edge Function ; tables mémoire avec politiques classiques `auth.uid() = user_id` (ou via projet). Le PATCH chapitre est effectué côté serveur après validation du propriétaire du chapitre.

---

## 5. UI actuelle

- **Éditeur chapitre scénario** : panneau **Continuité** (tiroir latéral) — points d’attention, filtres, actions « À relire » / « Traitée » / « Ignorer », signature **Ariane** (`src/components/ariane/`, `ScenarioChapterEditor`).
- **Dashboard** : carte d’onboarding **Ariane** (première visite, refermable).
- **Univers / Assets** : copy orientée « cohérence » / « lore » ; pas d’étiquette technique « NarraMind » pour l’utilisateur.
- **Navigation** : pas de pastille « anomalies » sur l’entrée Scénario (données non exposées sur les chapitres).
- **Décision produit** : l’assistance (et l’**onboarding**) seront portées par le personnage **Ariane** — voir [`NarraMind-Guide-Personnage.md`](./NarraMind-Guide-Personnage.md). L’implémentation onboarding / panneau continuité suit les jalons §8–§10.

---

## 6. Anomalies : format côté LLM (évolution / futur affichage)

Le JSON renvoyé par le modèle peut inclure des objets `anomalies` avec `title`, `explanation`, `severity`, `anchor` (ex. extrait). La normalisation côté serveur reste compatible avec des chaînes simples.

Les **explications affichables plus tard** devront rester en **langage histoire** (cf. §2 prompt).

---

## 7. Vision UX — **Ariane** (guide + onboarding)

> **Nom interface retenu : Ariane** — même personnage pour (1) l’**onboarding** du site et (2) l’**assistance continuité** (moteur interne NarraMind). Fil d’Ariane comme métaphore du **fil du récit**.

### Continuité / alertes

- Le bouton **Continuité** dans l’éditeur de chapitre ouvre toujours le tiroir ; la **liste** peut être vide si aucune alerte active n’a été détectée pour ce chapitre.
- Les alertes **persistées** proviennent de la table `narramind_alerts` (cf. §3).

### Onboarding — ton et portée

- **Ariane** peut accompagner **dès la première visite** — indépendant des anomalies.
- Ton **accueil** et **pédagogique produit** (vouvoiement), sans jargon NarraMind.

### Onboarding Ariane — **pages et contenus implémentés**

- **Accueil plein écran** : `ArianeOnboardingCard` monté dans **`DashboardLayout`** (toutes les routes dashboard : tableau de bord, fiche projet, liste projets, profil, plans). Dismiss `localStorage` `dw.ariane_onboarding_v1_dismissed`; replay admin : événement `dw:ariane-welcome-replay`.
- **Style (première validation)** : `ArianeStyleOnboardingCard` sur l’onglet Style du projet lorsque `sessionStorage` `dw.style_onboarding_pending_project_id` correspond au projet.
- **Fin de parcours** : `ArianeJourneyCompleteCard` sur l’onglet **Édition** lorsque toutes les étapes progressives sont débloquées et que l’utilisateur n’a pas encore fermé la carte finale (`dw.ariane_journey_final_v1_*`).
- **Menus progressifs** : masquage des onglets non débloqués (premier projet ou recette simulation) — voir `UX.md` §2.2bis et wiki Obsidian `Parcours-Premier-Projet.md`.

#### Page : **Tableau de bord** (actions recette admin)

Email `kiritogeek@gmail.com` : boutons *Relancer l’onboarding Ariane* ; *Simuler première connexion (menus)* (`resetProgressiveOnboardingSimulation`).

#### Pages **sans** la même bulle d’accueil

- **Landing / auth** : pas d’`ArianeOnboardingCard`.
- **Éditeur de chapitre (cases)** : pas d’overlay d’accueil ; tiroir **Continuité** (alertes) = contexte distinct.

**Microcopy et pictogramme** : [`NarraMind-Guide-Personnage.md`](./NarraMind-Guide-Personnage.md).

---

## 8. État d’avancement

| Élément | Statut |
|---------|--------|
| Tables `memory_*`, métriques, EF `narramind-update` | ✅ |
| Contexte résumés chapitres précédents (budget tokens) | ✅ |
| Persistance alertes (`narramind_alerts` + EF upsert) | ✅ (branche `feat/narramind-persist-alertes`) |
| Snapshot `narramind_anomalies` sur le chapitre (technique / utilitaires) | ✅ |
| Pas de persistance « produit » uniquement via JSON chapitre | ✅ |
| Déclenchement auto uniquement + throttle 12 min / 80 mots (éditeur) | ✅ |
| UI alertes / **Continuité** + onboarding Ariane (layout, Style, fin parcours, menus progressifs) | ✅ |
| Mémoire longue : `narra_summary` + fusion batch `memory_summaries` | ✅ (phase 3) |
| Plafonds prompt assets + entités + lore monde (`narramind-update`) | ✅ (phase 2 — budgets + logs) |

---

## 9. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `supabase/functions/narramind-update/index.ts` | Edge Function |
| `supabase/migrations/20260430120000_scenario_chapters_narramind_anomalies.sql` | Colonnes `narramind_*` sur chapitres |
| `supabase/migrations/20260430200000_projects_narra_summary.sql` | Méga-résumé projet (`narra_summary`) |
| `src/services/narramindAlerts.ts` | Lecture + résoudre / ignorer |
| `src/hooks/useNarramindAlerts.ts` | React Query |
| `src/services/scenarioAI.ts` | `triggerNarraMindUpdate` |
| `src/services/scenarioChapters.ts` | `parseNarrativeCoherenceAlerts` (utilitaire si réintroduction d’affichage) |
| `src/pages/ScenarioChapterEditor.tsx` | Déclenchement auto-save |
| `src/components/ariane/*` | Ariane : pictogramme, bulle, panneau continuité, onboarding |

---

## 10. Suite priorisée — Q2 2026

1. ~~**Persistance des alertes**~~ : livré sur branche `feat/narramind-persist-alertes` (`narramind_alerts`, EF, service, hook).
2. ~~**Garde-fous prompt**~~ : caps assets / entités / `universe_lore` + logs `prompt budgets (phase2)` dans l’EF — voir `Plan-NarraMind-Implementation.md` **Phase 2 / 7** ✅.
3. ~~**Mémoire longue**~~ : `projects.narra_summary` + compression batch `memory_summaries` quand seuil tokens — **Phase 3 / 7** ✅ (migration `20260430200000_projects_narra_summary.sql`).
4. ~~**UI Ariane**~~ : panneau Continuité + onboarding — **Phase 4 / 7** ✅.
5. **Quotas** texte par plan — **Phase 5 / 7**.

---

## 11. Complétude du système — petits vs grands projets

### Déjà en place (MVP technique)

- Déclenchement auto + throttle, EF sécurisée, upsert **entités** + **résumés** par chapitre, métriques, retour **anomalies** dans le corps HTTP.
- Contexte prompt : lore monde (**tronqué** au-delà de 14k caractères, suffixe), **méga-résumé** `narra_summary` (troncature prompt + stockage élargi), **assets** et **`memory_entities`** soumis à **budgets tokens**, **texte intégral du chapitre courant**, fenêtre de **résumés** chapitres précédents (budget borné), **fusion périodique** des plus vieux résumés chapitre si seuil tokens.

### Manques pour être « complet et utilisable »

| # | Manque | Impact petit projet | Impact gros projet |
|---|--------|---------------------|-------------------|
| 1 | **Persistance des alertes** (table dédiée + upsert EF) | Même sans gros volume, sinon **aucune trace** exploitable côté app après le run. | Idem + besoin d’**idempotence** et pagination liste. |
| 2 | **UI Ariane** (personnage + bulle + liste / filtres / acquitter) | Carte onboarding + panneau Continuité par chapitre. | Beaucoup d’alertes : UX à affiner (pagination, regroupement). |
| 3 | **Mémoire longue fiable** (voir proposition §11.1) | Partiellement couvert (`narra_summary` + compression). | **Mitigé** (phase 3) : anciens faits dans le méga-résumé ; valider sur corpus long. |
| 4 | **Budgets / troncature assets & entités** dans l’EF | Risque limité. | **Mitigé** (phase 2) : caps + logs ; chapitre courant toujours en entier. |
| 5 | **Compression résumés** (ou fusion niveaux) quand `needs_compression` | MVP présent via l’EF. | **Mitigé** (phase 3) : batch 8 + LLM ; ajuster seuils si besoin. |
| 6 | **Qualité contrôlée** (optionnel avancé) | Nice-to-have. | Regroupement d’alertes, **gravité** cohérente, dédoublonnage, tests sur corpus long. |
| 7 | **Coûts / quotas** texte NarraMind par plan | Faible volume. | À verrouiller pour **gros manuscrits** (fréquence, taille contexte). |

### 11.1 Proposition — mémoire longue (réponse au point « gros projets »)

**Objectif** : réduire les faux négatifs sans envoyer tout le roman à chaque appel.

1. **Résumé à deux niveaux (recommandé)**  
   - Niveau **chapitre** (déjà là).  
   - Niveau **arc / projet** : méga-résumé (ex. 400–800 tokens) mis à jour **périodiquement** (tous les N chapitres ou quand `needs_compression`) — *faits stables, personnages, règles du monde, twists déjà révélés*.  
   - Le prompt NarraMind inclut : **méga-résumé** + fenêtre récente des résumés chapitre + chapitre courant.

2. **Pass de compression explicite**  
   Quand `needs_compression` : job (même EF ou fonction dédiée) qui **fusionne / compresse** les plus vieux `memory_summaries` en conservant une trace « faits non négociables » pour la cohérence (liste courte de **invariants** extraits par LLM ou règles).

3. **Récupération ciblée (phase ultérieure)**  
   Si une alerte est borderline : second appel **léger** avec extraits de **chapitres complets** sélectionnés (IDs dérivés des entités / mots-clés) — hors MVP mais pour **très** gros textes.

4. **Plafonds techniques**  
   Limite de caractères ou de tokens pour le bloc **ASSETS** et **FICHES ENTITÉS** (priorité : entités les plus **récentes** + celles **mentionnées** dans le chapitre courant si détection simple côté serveur).

Ordre d’implémentation suggéré : **1 (persistance alertes) ✅ → 4 (plafonds) ✅ → 11.1 partiel (méga-résumé + compression) ✅ → 2 (UI Ariane) → 7 (quotas)**.

**Checklist de code** : [`Plan-NarraMind-Implementation.md`](./Plan-NarraMind-Implementation.md).

---

*Dernière mise à jour : 30 avril 2026 — §7 onboarding (layout + progressif), alignement Gemini scénario.*
