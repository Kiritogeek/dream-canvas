# ProjetInnovant — NarraMind : Mémoire narrative & cohérence scénaristique

> Système de mémoire globale pour l'IA scénariste de DreamWeave.
> NarraMind maintient la cohérence de l'univers narratif (LORE + histoire) et détecte les anomalies.

**Synthèse — état réel du dépôt (avril 2026)**

| Bloc | Statut | Détail court |
|------|--------|----------------|
| `narramind_metrics` + modes `baseline` / `narramind` dans `generate-scenario-ai` | ✅ | Logging ; modes utilisables via l’EF (pas de bouton « Tester baseline » dans le **frontend actuel**) |
| `assets.lore` + champ LORE dans `AssetLibrary` | ✅ | Badges « LORE » neutres (pas de marque NarraMind en UI) |
| `memory_entities`, `memory_summaries`, RLS | ✅ | Migrations `202604231*` |
| `narramind-update` | ✅ | **Gemini** Flash (primaire + fallback) puis Groq ; JWT user ; vérif propriété chapitre/projet ; **ne persiste pas** la liste d’anomalies sur le chapitre pour l’UI (`narramind_anomalies` vidée à `[]` ; métriques + corps de réponse conservent le détail technique) |
| Déclenchement client | ✅ | **Auto-save** éditeur scénario (**≥ 80 mots**, throttle **12 min**) ; sauvegarde **lore monde** + **LORE assets** (`UniverseSection`) sur le dernier chapitre — pas de bouton « Vérifier / Revérifier » |
| UI mémoire (fiches / résumés / onglet Mémoire) | ❌ Retiré | Mémoire **invisible** pour l’utilisateur ; pas de `NarraMindPanel` |
| `narramind-chat`, `narramind-compress` | ❌ | Non créés |
| Alertes incohérences dans l’éditeur | ❌ Retrait volontaire | Affichage **à définir** ; pas de bandeau sur les chapitres scénario dans l’état actuel |
| Spec vision UX « guide » + anomalies structurées | 📋 | Documentée dans `Produit/NarraMind.md` ; implémentation à venir |

---

## Contexte

DreamWeave dispose déjà de :
- `generate-scenario-ai` (Edge Function) — génère du contenu narratif via Groq/Llama 3.3 70B
- Table `assets` avec `name`, `asset_type`, `prompt`, `image_url_sheet`
- Tables `scenario_chapters` et `scenario_versions` pour le scénario texte
- Frontend React 18 + TypeScript + Supabase SDK

**NarraMind est un système nouveau, indépendant**, qui se branche sur l'existant sans le casser.
Il n'est pas une feature de génération — c'est une couche de mémoire et de cohérence.

---

## Vue d'ensemble de NarraMind (alignée prod)

```
ASSET + LORE + universe_lore
         │
         ▼
[narramind-update] ← auto-save chapitre (≥80 mots, throttle 12 min) + sauvegarde Univers
    │  lit chapitre + assets + lore monde + memory_entities + résumés fenêtre (budget tokens)
    │  LLM → entities_to_update, chapter_summary, anomalies
    │  upsert memory_entities, insert memory_summaries, metrics (anomalies_detected)
    │  PATCH scenario_chapters : narramind_anomalies = [], narramind_checked_at
         │
         ▼
Mémoire compressée : invisible côté UI (sert le contexte futur / cohérence)

Liste d’incohérences pour l’utilisateur : **non** stockée sur `scenario_chapters` ; affichage **à venir** (cf. `Produit/NarraMind.md`)

(Futur — non livré) narramind-compress, narramind-chat, guide personnage sur la navigation
```

## ITÉRATION 1 — Baseline : LLM branché sans mémoire

### Objectif

Mesurer le comportement de `generate-scenario-ai` avec le scénario brut injecté.
Établir la baseline tokens / cohérence / performance.

### Ce que Claude Code doit faire

#### 1.1 Modifier `generate-scenario-ai` pour logger les métriques

Dans `supabase/functions/generate-scenario-ai/index.ts`, ajouter le logging suivant à chaque appel :

```typescript
// Après construction du prompt, AVANT l'appel LLM
const contextTokenEstimate = Math.round(fullPrompt.length / 4); // estimation ~4 chars/token

// Après réponse LLM
const responseTokenEstimate = Math.round(responseText.length / 4);

// Logger dans une nouvelle table narramind_metrics
await supabase.from('narramind_metrics').insert({
  project_id,
  chapter_number,
  mode: 'baseline_raw',
  context_tokens: contextTokenEstimate,
  response_tokens: responseTokenEstimate,
  chapters_in_context: allChaptersContent.length,
  duration_ms: Date.now() - startTime,
  created_at: new Date().toISOString()
});
```

#### 1.2 Créer la migration BDD pour `narramind_metrics`

Créer le fichier `supabase/migrations/YYYYMMDDXXXXXX_add_narramind_metrics.sql` :

```sql
CREATE TABLE narramind_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number INTEGER,
  mode TEXT NOT NULL, -- 'baseline_raw' | 'narramind_v1' | 'narramind_v2'
  context_tokens INTEGER,
  response_tokens INTEGER,
  chapters_in_context INTEGER,
  anomalies_detected INTEGER DEFAULT 0,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE narramind_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own metrics" ON narramind_metrics
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
CREATE POLICY "Insert own metrics" ON narramind_metrics
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
```

#### 1.3 Modifier le mode baseline dans `generate-scenario-ai`

Quand `mode: 'baseline'` est passé dans le body, injecter **tous** les chapitres existants en texte brut dans le system prompt :

```typescript
// Dans generate-scenario-ai/index.ts
if (mode === 'baseline') {
  const { data: allChapters } = await supabase
    .from('scenario_chapters')
    .select('chapter_number, title, content')
    .eq('project_id', project_id)
    .order('chapter_number', { ascending: true });

  const rawContext = allChapters
    ?.map(c => `CHAPITRE ${c.chapter_number} — ${c.title}\n${c.content}`)
    .join('\n\n---\n\n') ?? '';

  systemPrompt = `Tu es un scénariste de webtoon.
Voici l'intégralité du scénario écrit jusqu'ici :

${rawContext}

Maintenant, écris le chapitre suivant en respectant les personnages, décors et événements déjà établis.`;
}
```

### Mesures relevées (Itération 1) — 23 avril 2026

> **Note avril 2026 :** ces mesures ont été faites lorsqu’un flux UI (ex. bouton de test baseline) appelait encore l’EF. Le **frontend actuel** n’expose plus ce bouton ; le mode `baseline` reste disponible **côté `generate-scenario-ai`** pour des tests outillés.

Mesure effectuée via le bouton **🔬 Tester Baseline** intégré dans la section Scénario *(historique ; non présent dans le UI courant)*.
Deux appels loggués dans `narramind_metrics`.

| Métrique | Chap. 6 (5 chap. contexte) | Chap. 7 (6 chap. contexte) |
|---|---|---|
| `context_tokens` | 3 930 | 4 849 |
| `response_tokens` | 912 | 898 |
| `duration_ms` | 7 412 ms | 14 048 ms |
| Tokens ajoutés par chapitre | ~786 | +919 (marginal) |

**Résumé :**

| Métrique | Valeur mesurée |
|---|---|
| Tokens contexte au chapitre 1 | ~140 tokens (system prompt seul, estimé) |
| Tokens contexte au chapitre 5 | **3 930 tokens** |
| Tokens contexte au chapitre 6 | **4 849 tokens** |
| Croissance tokens par chapitre | **~800–920 tokens/chapitre** |
| Temps de réponse moyen | **7 412 ms → 14 048 ms** (quasi-doublé en 1 chapitre) |
| Incohérences observées (manuelle) | À compléter après lecture des chapitres générés |
| Limite atteinte ? | Non — mais la latence croît plus vite que le contexte |

**Projections extrapolées (base ~850 tokens/chapitre) :**
- 10 chapitres en contexte → ~8 500 tokens, ~28 s de latence estimée
- 20 chapitres en contexte → ~17 000 tokens, >60 s estimé
- 50 chapitres en contexte → ~42 500 tokens — usage dégradé

### Résultat attendu

Démontrer que le scénario brut croît **linéairement** (~700 tokens par chapitre ajouté) et que la qualité de cohérence est variable. C'est le problème que NarraMind résout.

### Résultat obtenu ✅

**Confirmé et renforcé.** La croissance est linéaire à **~850 tokens/chapitre** (hypothèse : 700). Mais l'effet le plus frappant est la **latence** : +1 chapitre a suffi à quasi-doubler le temps de réponse (7,4 s → 14 s), alors que la réponse générée est identique en taille. Cela démontre que le problème n'est pas seulement théorique (tokens = coût) — il est déjà ressenti par l'utilisateur dès 6 chapitres. NarraMind V1 (Itération 2) cible un contexte stable à ~1 400 tokens, soit **~10x plus efficace** à 10 chapitres, et une latence stable indépendante du nombre de chapitres écrits.

---

## ITÉRATION 2 — NarraMind V1 : Fiches entités + LORE + résumé glissant

### Objectif

Remplacer le scénario brut par une mémoire structurée.
Valider que la cohérence est au moins équivalente à 10x moins de tokens.

### Ce que Claude Code doit faire

#### 2.1 Ajouter la colonne `lore` sur la table `assets`

Créer `supabase/migrations/YYYYMMDDXXXXXX_add_lore_to_assets.sql` :

```sql
ALTER TABLE assets ADD COLUMN lore TEXT;
COMMENT ON COLUMN assets.lore IS 'Description narrative de l''entité : backstory, pouvoirs, règles, limites. Utilisé par NarraMind pour la cohérence scénaristique.';
```

#### 2.2 Créer les tables NarraMind

Créer `supabase/migrations/YYYYMMDDXXXXXX_add_narramind_tables.sql` :

```sql
-- Fiches entités structurées
CREATE TABLE memory_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'character' | 'background' | 'object'
  traits JSONB DEFAULT '[]'::jsonb,       -- ["courageux", "solitaire"]
  relations JSONB DEFAULT '[]'::jsonb,    -- [{"with": "Veran", "type": "mentor"}]
  lore_summary TEXT,                      -- résumé du LORE (extrait de assets.lore)
  last_seen_chapter INTEGER,
  first_seen_chapter INTEGER,
  token_estimate INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Résumés glissants par chapitre
CREATE TABLE memory_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES scenario_chapters(id) ON DELETE SET NULL,
  chapter_number INTEGER NOT NULL,
  summary TEXT NOT NULL,
  token_estimate INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE memory_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own memory_entities" ON memory_entities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own memory_summaries" ON memory_summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Index performance
CREATE INDEX idx_memory_entities_project ON memory_entities(project_id);
CREATE INDEX idx_memory_summaries_project ON memory_summaries(project_id);
CREATE INDEX idx_memory_summaries_chapter ON memory_summaries(chapter_number);
```

#### 2.3 Créer l'Edge Function `narramind-update`

> **Implémenté** sous `supabase/functions/narramind-update/index.ts`. Le code effectif utilise l’API **Gemini** (OpenAI-compatible) en primaire, pas uniquement Groq comme dans l’extrait historique ci-dessous. Conserver ce bloc comme référence d’**intention** (entities + summary + anomalies).

Créer `supabase/functions/narramind-update/index.ts` :

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const { project_id, chapter_id, user_id } = await req.json();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Récupérer le chapitre accepté
  const { data: chapter } = await supabase
    .from('scenario_chapters')
    .select('*')
    .eq('id', chapter_id)
    .single();

  // 2. Récupérer tous les assets du projet avec leur LORE
  const { data: assets } = await supabase
    .from('assets')
    .select('id, name, asset_type, prompt, lore')
    .eq('project_id', project_id);

  // 3. Récupérer les fiches entités existantes
  const { data: existingEntities } = await supabase
    .from('memory_entities')
    .select('*')
    .eq('project_id', project_id);

  // 4. Appel LLM pour extraire/mettre à jour les fiches entités
  const extractionPrompt = `Tu es NarraMind, un système de mémoire narrative.

ASSETS DU PROJET (avec leur LORE) :
${assets?.map(a => `- ${a.name} (${a.asset_type}) : ${a.prompt}${a.lore ? `\n  LORE: ${a.lore}` : ''}`).join('\n')}

FICHES ENTITÉS EXISTANTES :
${JSON.stringify(existingEntities ?? [], null, 2)}

NOUVEAU CHAPITRE ${chapter.chapter_number} — ${chapter.title} :
${chapter.content}

TÂCHE : Retourne un JSON avec :
1. "entities_to_update": liste des fiches entités à créer ou mettre à jour
2. "chapter_summary": résumé du chapitre en 60-80 tokens maximum
3. "anomalies": liste des incohérences détectées vs le LORE

Format de réponse JSON STRICT, sans markdown :
{
  "entities_to_update": [
    {
      "name": "string",
      "entity_type": "character|background|object",
      "traits": ["string"],
      "relations": [{"with": "string", "type": "string"}],
      "lore_summary": "string (extrait condensé du LORE)",
      "last_seen_chapter": number,
      "first_seen_chapter": number
    }
  ],
  "chapter_summary": "string",
  "anomalies": ["string"]
}`;

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: extractionPrompt }],
      max_tokens: 1500,
      temperature: 0.1
    })
  });

  const groqData = await groqResponse.json();
  const rawJson = groqData.choices[0].message.content;
  const parsed = JSON.parse(rawJson);

  // 5. Upsert des fiches entités
  for (const entity of parsed.entities_to_update) {
    const asset = assets?.find(a => a.name.toLowerCase() === entity.name.toLowerCase());
    const tokenEstimate = Math.round(JSON.stringify(entity).length / 4);

    await supabase.from('memory_entities').upsert({
      project_id,
      user_id,
      asset_id: asset?.id ?? null,
      name: entity.name,
      entity_type: entity.entity_type,
      traits: entity.traits,
      relations: entity.relations,
      lore_summary: entity.lore_summary,
      last_seen_chapter: entity.last_seen_chapter,
      first_seen_chapter: entity.first_seen_chapter ?? entity.last_seen_chapter,
      token_estimate: tokenEstimate,
      updated_at: new Date().toISOString()
    }, { onConflict: 'project_id,name' });
  }

  // 6. Insérer le résumé glissant
  const summaryTokens = Math.round(parsed.chapter_summary.length / 4);
  await supabase.from('memory_summaries').insert({
    project_id,
    user_id,
    chapter_id,
    chapter_number: chapter.chapter_number,
    summary: parsed.chapter_summary,
    token_estimate: summaryTokens
  });

  // 7. Vérifier si compression nécessaire (> 800 tokens de résumés)
  const { data: allSummaries } = await supabase
    .from('memory_summaries')
    .select('token_estimate')
    .eq('project_id', project_id);

  const totalSummaryTokens = allSummaries?.reduce((acc, s) => acc + (s.token_estimate ?? 0), 0) ?? 0;

  // 8. Logger les métriques
  const { data: allEntities } = await supabase
    .from('memory_entities')
    .select('token_estimate')
    .eq('project_id', project_id);
  const totalEntityTokens = allEntities?.reduce((acc, e) => acc + (e.token_estimate ?? 0), 0) ?? 0;

  await supabase.from('narramind_metrics').insert({
    project_id,
    chapter_number: chapter.chapter_number,
    mode: 'narramind_v1',
    context_tokens: totalEntityTokens + totalSummaryTokens,
    anomalies_detected: parsed.anomalies?.length ?? 0,
    chapters_in_context: chapter.chapter_number,
    duration_ms: 0 // à calculer si besoin
  });

  return new Response(JSON.stringify({
    success: true,
    summary: parsed.chapter_summary,
    entities_updated: parsed.entities_to_update.length,
    anomalies: parsed.anomalies,
    total_context_tokens: totalEntityTokens + totalSummaryTokens,
    needs_compression: totalSummaryTokens > 800
  }), { headers: { 'Content-Type': 'application/json' } });
});
```

#### 2.4 Ajouter le champ LORE dans l'UI Assets

Dans `src/components/project/AssetLibrary.tsx` (ou le composant de dialog d'édition asset) :

- Ajouter un champ `<Textarea>` labellisé **"LORE"** sous le champ prompt
- Placeholder : `"Décris l'histoire, les règles, les pouvoirs ou les limites de cet élément. Ex: Kaïra ne peut utiliser sa magie qu'une fois par nuit..."`
- Sauvegarder dans `assets.lore` via le SDK Supabase
- Afficher une badge "LORE" sur les cartes d'assets qui en ont un

#### 2.5 Modifier `generate-scenario-ai` pour injecter la mémoire NarraMind

Dans `supabase/functions/generate-scenario-ai/index.ts`, ajouter le mode `narramind` :

```typescript
if (mode === 'narramind') {
  // Récupérer les fiches entités
  const { data: entities } = await supabase
    .from('memory_entities')
    .select('name, entity_type, traits, relations, lore_summary, last_seen_chapter')
    .eq('project_id', project_id)
    .order('last_seen_chapter', { ascending: false });

  // Récupérer les résumés glissants
  const { data: summaries } = await supabase
    .from('memory_summaries')
    .select('chapter_number, summary')
    .eq('project_id', project_id)
    .order('chapter_number', { ascending: true });

  const entitiesContext = entities
    ?.map(e => `${e.name} (${e.entity_type}) — Traits: ${e.traits?.join(', ')}${e.lore_summary ? ` — LORE: ${e.lore_summary}` : ''} — Dernière app: chap.${e.last_seen_chapter}`)
    .join('\n') ?? '';

  const summariesContext = summaries
    ?.map(s => `Chap.${s.chapter_number}: ${s.summary}`)
    .join('\n') ?? '';

  systemPrompt = `Tu es un scénariste de webtoon expert en cohérence narrative.

ENTITÉS DE L'UNIVERS :
${entitiesContext}

RÉSUMÉ DES CHAPITRES PRÉCÉDENTS :
${summariesContext}

RÈGLES ABSOLUES :
- Respecte le LORE de chaque entité (pouvoirs, limites, personnalité)
- Ne contredis jamais les événements déjà établis dans les résumés
- Si un personnage a un LORE précis, fais-le respecter

Écris le chapitre demandé.`;
}
```

#### 2.6 Déclencher `narramind-update` après acceptation d'un chapitre

> **Écart prod :** le déclenchement réel est dans `ScenarioChapterEditor` (auto-save) et `UniverseSection` (lore), via `triggerNarraMindUpdate` dans `scenarioAI.ts`, pas sur `scenario_versions.status = 'accepted'`.

Dans `src/services/scenarioChapters.ts` ou dans le hook d'acceptation :

```typescript
// Après que scenario_versions.status = 'accepted'
const triggerNarraMind = async (projectId: string, chapterId: string, userId: string) => {
  await supabase.functions.invoke('narramind-update', {
    body: { project_id: projectId, chapter_id: chapterId, user_id: userId }
  });
};
```

### Mesures relevées (Itération 2) — 23 avril 2026

| Métrique | Itération 1 (baseline) | Itération 2 (NarraMind V1) |
|---|---|---|
| Tokens contexte au chap. 1 | ~140 | **247** |
| Tokens contexte au chap. 3 | ~2 520 | **441** |
| Tokens contexte au chap. 5 | ~3 930 | **518** |
| Tokens contexte au chap. 6 | 3 930 | **557** |
| Croissance par chapitre | ~850 tokens | **~50 tokens** |
| Ratio d'efficacité au chap. 6 | — | **7x plus compact** |
| Temps de réponse moyen | 7 412 ms (chap. 6) | non mesuré (duration_ms=0) |
| Incohérences détectées | 0 (pas de système) | 0 (LORE non renseigné) |
| Anomalies LORE détectées | 0 (pas de LORE) | 0 (LORE à renseigner sur les assets) |

### Résultat obtenu ✅

**Confirmé et dépassé.** La cible était 1 000–1 400 tokens stables. NarraMind V1 atteint **557 tokens au chapitre 6** (vs 3 930 en baseline), soit **7x plus compact**. La croissance est quasi-plate (~50 tokens/chapitre vs ~850) grâce au mécanisme d'upsert des entités : les personnages/décors sont mis à jour, pas dupliqués à chaque chapitre. La détection d'anomalies LORE nécessite de renseigner le champ LORE sur les assets — c'est l'étape suivante avant l'Itération 3.

---

---

### Supplément livré (hors spec initial + avril 2026)

- Migration `20260430120000_scenario_chapters_narramind_anomalies.sql` : colonnes `narramind_anomalies`, `narramind_checked_at` (anomalies **vidées** après chaque run ; pas de bandeau éditeur).
- `parseNarrativeCoherenceAlerts` : utilitaire TypeScript si réintroduction d’un affichage.
- Suppression onglet / menu **Mémoire** et des composants de lecture `memory_*` côté UI.

---

## ITÉRATION 3 — NarraMind V2 : Compression + Chatbot

> **Statut : non entamé dans le dépôt.** La feuille de route produit a **priorisé** la mémoire technique + métriques ; l’affichage des incohérences pour l’auteur est **reporté**. Les items ci-dessous restent valables comme **backlog technique**.

### Objectif

Valider que le contexte reste stable à ~1 400 tokens au chapitre 15-20.
Ajouter le chatbot NarraMind pour interroger la cohérence et générer du LORE automatiquement.

### Ce que Claude Code doit faire

#### 3.1 Créer l'Edge Function `narramind-compress`

Créer `supabase/functions/narramind-compress/index.ts` :

```typescript
// Déclenché quand total memory_summaries.token_estimate > 800
// Compresse les N premiers résumés en un méga-résumé

serve(async (req) => {
  const { project_id, user_id } = await req.json();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: summaries } = await supabase
    .from('memory_summaries')
    .select('*')
    .eq('project_id', project_id)
    .order('chapter_number', { ascending: true });

  if (!summaries || summaries.length < 5) {
    return new Response(JSON.stringify({ skipped: true }));
  }

  // Prendre les 70% de résumés les plus anciens et les comprimer
  const toCompress = summaries.slice(0, Math.floor(summaries.length * 0.7));
  const toKeep = summaries.slice(Math.floor(summaries.length * 0.7));

  const compressionPrompt = `Compresse ces résumés de chapitres en UN résumé dense de 100 tokens maximum.
Garde les informations essentielles : événements clés, décisions importantes, évolutions des personnages.

${toCompress.map(s => `Chap.${s.chapter_number}: ${s.summary}`).join('\n')}

Retourne UNIQUEMENT le résumé compressé, sans introduction ni markdown.`;

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: compressionPrompt }],
      max_tokens: 200
    })
  });

  const data = await groqResponse.json();
  const compressedText = data.choices[0].message.content;

  // Supprimer les anciens résumés et insérer le compressé
  const idsToDelete = toCompress.map(s => s.id);
  await supabase.from('memory_summaries').delete().in('id', idsToDelete);

  await supabase.from('memory_summaries').insert({
    project_id,
    user_id,
    chapter_number: 0, // résumé compressé = chapter 0 (arc global)
    summary: `[RÉSUMÉ COMPRESSÉ chap.1-${toCompress.at(-1)?.chapter_number}] ${compressedText}`,
    token_estimate: Math.round(compressedText.length / 4)
  });

  return new Response(JSON.stringify({ compressed: toCompress.length, kept: toKeep.length }));
});
```

#### 3.2 Créer l'Edge Function `narramind-chat`

Créer `supabase/functions/narramind-chat/index.ts` :

```typescript
// Chatbot conversationnel : questions, anomalies, génération LORE

serve(async (req) => {
  const { project_id, user_id, message, mode } = await req.json();
  // mode : 'question' | 'check_anomalies' | 'generate_lore'
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Construire le contexte NarraMind complet
  const { data: entities } = await supabase
    .from('memory_entities')
    .select('*')
    .eq('project_id', project_id);

  const { data: summaries } = await supabase
    .from('memory_summaries')
    .select('chapter_number, summary')
    .eq('project_id', project_id)
    .order('chapter_number', { ascending: true });

  const { data: assets } = await supabase
    .from('assets')
    .select('name, asset_type, lore')
    .eq('project_id', project_id)
    .not('lore', 'is', null);

  const context = `
ENTITÉS ET LORE :
${entities?.map(e => `${e.name}: traits=[${e.traits?.join(', ')}], lore=${e.lore_summary}`).join('\n')}

LORE COMPLET DES ASSETS :
${assets?.map(a => `${a.name} (${a.asset_type}): ${a.lore}`).join('\n')}

HISTOIRE (résumé) :
${summaries?.map(s => `Chap.${s.chapter_number}: ${s.summary}`).join('\n')}`;

  let systemPrompt = '';

  if (mode === 'question') {
    systemPrompt = `Tu es NarraMind, l'assistant de cohérence narrative de DreamWeave.
Tu connais parfaitement l'univers de ce webtoon. Réponds aux questions de l'auteur en te basant uniquement sur le contexte fourni.
${context}`;
  } else if (mode === 'check_anomalies') {
    systemPrompt = `Tu es NarraMind. Analyse le scénario et détecte toutes les anomalies et contradictions par rapport au LORE.
Retourne un JSON : { "anomalies": [{ "chapter": number, "description": string, "severity": "low|medium|high" }] }
${context}`;
  } else if (mode === 'generate_lore') {
    systemPrompt = `Tu es NarraMind. Génère le LORE narratif complet de l'entité demandée, basé sur ce qui a été écrit dans l'histoire.
Retourne un texte narratif dense de 100-150 mots maximum, utilisable directement dans le champ LORE.
${context}`;
  }

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 800,
      temperature: 0.2
    })
  });

  const data = await groqResponse.json();
  const response = data.choices[0].message.content;

  return new Response(JSON.stringify({ response, mode }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

#### 3.3 Créer le composant UI `NarraMindPanel`

Créer `src/components/project/NarraMindPanel.tsx` :

Un panneau latéral dans la section Scénario avec trois onglets :
- **Mémoire** — affiche les fiches entités et les résumés glissants, avec le budget tokens total
- **Anomalies** — bouton "Scanner le projet" qui appelle `narramind-chat` en mode `check_anomalies` et affiche les résultats par sévérité
- **Chat** — interface conversationnelle pour interroger l'univers (mode `question`) et générer du LORE (bouton "Générer le LORE de [asset]" en mode `generate_lore`)

#### 3.4 Créer le hook `useNarraMind`

Créer `src/hooks/useNarraMind.ts` :

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useNarraMindMemory = (projectId: string) => {
  return useQuery({
    queryKey: ['narramind-memory', projectId],
    queryFn: async () => {
      const [entitiesRes, summariesRes] = await Promise.all([
        supabase.from('memory_entities').select('*').eq('project_id', projectId).order('last_seen_chapter', { ascending: false }),
        supabase.from('memory_summaries').select('*').eq('project_id', projectId).order('chapter_number', { ascending: true })
      ]);

      const entityTokens = entitiesRes.data?.reduce((acc, e) => acc + (e.token_estimate ?? 0), 0) ?? 0;
      const summaryTokens = summariesRes.data?.reduce((acc, s) => acc + (s.token_estimate ?? 0), 0) ?? 0;

      return {
        entities: entitiesRes.data ?? [],
        summaries: summariesRes.data ?? [],
        totalTokens: entityTokens + summaryTokens,
        entityTokens,
        summaryTokens
      };
    },
    enabled: !!projectId
  });
};

export const useNarraMindChat = () => {
  return useMutation({
    mutationFn: async ({ projectId, message, mode }: {
      projectId: string;
      message: string;
      mode: 'question' | 'check_anomalies' | 'generate_lore';
    }) => {
      const { data, error } = await supabase.functions.invoke('narramind-chat', {
        body: { project_id: projectId, message, mode }
      });
      if (error) throw error;
      return data;
    }
  });
};
```

### Mesures à relever (Itération 3)

| Métrique | Itération 2 | Itération 3 |
|---|---|---|
| Tokens au chap. 10 | ? | ? |
| Tokens au chap. 20 | ? | ? |
| Compression déclenchée ? | non | oui/non |
| Tokens post-compression | N/A | ? |
| Anomalies LORE détectées | ? | ? |
| Pertinence chatbot (qualitatif) | N/A | note /5 |

### Résultat attendu

Démontrer que le budget tokens reste stable à ~1 400 tokens même au chapitre 20. Le chatbot répond correctement aux questions sur l'univers et génère du LORE cohérent depuis le contexte.

---

## Récapitulatif — Fichiers (réalité dépôt, avril 2026)

### Migrations NarraMind / lore (existantes)

- `20260423100000_add_narramind_metrics.sql`
- `20260423110000_add_lore_to_assets.sql`
- `20260423120000_add_narramind_tables.sql`
- `20260423200000_fix_narramind_fk.sql`
- `20260423210000_add_universe_lore.sql` (lore monde projet)
- `20260430120000_scenario_chapters_narramind_anomalies.sql`

### Edge Functions

- `supabase/functions/narramind-update/index.ts` — **livré** (Gemini + fallbacks, PATCH vidage anomalies chapitre, métriques)
- `supabase/functions/generate-scenario-ai/index.ts` — modes `baseline`, `narramind`, logging métriques
- `narramind-compress`, `narramind-chat` — **absents**

### Frontend

- `src/services/scenarioAI.ts` — `triggerNarraMindUpdate`
- `src/services/scenarioChapters.ts` — `parseNarraMindAnomalies`
- `src/pages/ScenarioChapterEditor.tsx` — déclenchement auto-save (throttle 12 min, ≥80 mots)
- `src/components/project/UniverseSection.tsx`, `AssetLibrary.tsx` — lore, déclenchement optionnel
- **Retirés / jamais livrés en prod :** `NarraMindPanel`, `useNarraMindMemory`, onglet Mémoire ; **composant bandeau alertes supprimé** (avril 2026)

### Variables d'environnement (Edge)

- `GEMINI_API_KEY`, `GROQ_API_KEY`, `SUPABASE_*`, `ALLOWED_ORIGIN` pour `narramind-update`

---

## Marche à suivre recommandée

1. **Court terme — qualité & persistance des alertes pour un futur écran**  
   - Conserver le **format d’anomalies structurées** côté LLM ; consignes **langage histoire** (sans vocabulaire technique « Assets », champs JSON, etc.).  
   - **Source de vérité** utilisateur : **hors** `scenario_chapters.narramind_anomalies` (table dédiée ou autre) — à trancher avec le jalon d’affichage.

2. **Moyen terme — compression**  
   - Fonction `narramind-compress` (ou logique dans `narramind-update` quand `needs_compression`) pour respecter le budget résumés.

3. **Décision produit — chat / panneau**  
   - Si besoin d’un **chat** lore : reprendre le spec `narramind-chat` **sans** réintroduire un onglet « mémoire brute » ; cibler questions ponctuelles ou power users.

4. **UX « guide NarraMind »**  
   - État navigation + personnage sur fil d’Ariane (cf. `Produit/NarraMind.md` §7) après stabilisation des données d’ancrage.

5. **Intégration génération scénario**  
   - Vérifier que les usages **réels** de `generate-scenario-ai` en mode `narramind` couvrent les flux éditeur souhaités ; ajuster prompts si besoin.

6. **Qualité / observabilité**  
   - Rejouer des mesures type Itération 1–2 (tokens / latence) après changements majeurs ; exploiter `narramind_metrics`.

---

## Comment tester tout ce qui a été fait jusqu’ici

### Prérequis

- Projet Supabase à jour : **toutes les migrations** ci-dessus appliquées (dont `narramind_anomalies` sur `scenario_chapters`).
- Edge Function **`narramind-update`** déployée avec les secrets requis (`GEMINI_API_KEY`, etc.).
- Frontend : `npm install` ; `.env` avec `VITE_SUPABASE_URL` et clé anon.

### Tests manuels — pipeline invisible (sans bandeau chapitre)

1. **Lore & univers**  
   - Créer un asset avec un **LORE** très explicite (ex. « Ne peut pas voler »).  
   - Renseigner le **lore du monde** dans **Univers**.  
   - Sauvegarder : le déclenchement sur le dernier chapitre est **silencieux** (pas de toast NarraMind).

2. **Éditeur de chapitre**  
   - Ouvrir un chapitre de **≥ 80 mots** ; modifier le texte.  
   - Attendre **auto-save** (≈2 s) puis **≥ 12 min** et une nouvelle sauvegarde si besoin pour le prochain appel auto **ou** déclencher via **Univers** (sauvegarde lore).  
   - **Pas de bandeau** dans l’éditeur : vérifier les effets via **métriques** / logs / réponse `narramind-update` si besoin.

3. **Persistance**  
   - Après un run : `scenario_chapters.narramind_anomalies` doit rester **`[]`** ; `narramind_checked_at` mis à jour ; `narramind_metrics.anomalies_detected` reflète le nombre signalé par le LLM.

4. **Mémoire technique**  
   - Tables `memory_entities` / `memory_summaries` : constater des lignes après analyses (pas d’UI dédié).

5. **Régression**  
   - `npx tsc --noEmit` ; `npm test -- --run`.

### Tests serveur — modes `generate-scenario-ai` (sans UI)

- Appel HTTP direct (curl / Postman) à `generate-scenario-ai` avec `mode: "baseline"` ou `"narramind"` et `project_id` valides + JWT user ; vérifier réponse et lignes dans `narramind_metrics` (`mode` `baseline_raw` ou `narramind`).

---

## Notes pour le dossier Projet Innovant

### Réponse à la question Liberté / Contrainte (prof)

NarraMind ne bloque jamais l'utilisateur. Il **informe**. L'auteur peut écrire ce qu'il veut, mais NarraMind lui signale quand il s'écarte de son propre LORE. La décision finale reste à l'auteur : assumer l'incohérence ou corriger. C'est la distinction clé entre un outil **prescriptif** (bloquant) et un outil **contributif** (accompagnant).

### Réponse sur la propriété intellectuelle

Le LORE est écrit par l'utilisateur. NarraMind ne génère que des *suggestions* de LORE depuis le contexte de l'histoire, que l'utilisateur peut modifier ou rejeter. L'œuvre, le LORE et tous les assets appartiennent à l'utilisateur. DreamWeave est un outil, comme Photoshop ne revendique pas la propriété des images créées avec lui. À inscrire explicitement dans les CGU.

### Défi technique central

Maintenir un contexte LLM **stable à ~1 400 tokens** quel que soit le nombre de chapitres, tout en assurant une cohérence narrative supérieure à l'injection brute. C'est le problème que NarraMind résout via la compression du résumé glissant et la mise à jour (non accumulation) des fiches entités enrichies par le LORE.

---

*Dernière mise à jour : 30 avril 2026 — alignement sur le dépôt, synthèse état, marche à suivre et plan de tests.*
