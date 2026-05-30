# Analyse Pipeline Scénario→Cases — 2026-05-30

> Source : lecture de `visual-grammar.md`, des 4 chapitres LN "Your Talent is Mine", des pages webtoon YTIM ch1 (PNG), et de tous les system-prompts déployés.
> But : améliorer Scénario IA / Découpage / Prompt cases en s'appuyant sur les références réelles.

## Pipeline réel déployé

| Étage | Fichier prompt | État grammaire |
|-------|---------------|----------------|
| Scénario IA (`mode: scenario`/`chapter`) | `generate-scenario-ai/system-prompts/scenario.ts` | Format scènes OK, **pas d'arc épisodique webtoon** |
| Découpage (`mode: detect_blocks`, appelé par `ScenarioChapterEditor.tsx:709`) | `.../detect-blocks.ts` | ✅ 13 types + séquençage + mapping LN→webtoon |
| Composition (`compose-chapter-layout`) | `compose-chapter-layout/system-prompts/compose-layout.ts` | ⚠️ **ignore scene_type**, re-devine via regex (7 buckets) |
| Prompt image (`generate-panel-image`) | `generate-panel-image/index.ts` (`SCENE_TYPE_FLUX_PREFIX`) | ✅ 13 types + 25 effets mappés |

Vérification terrain : webtoon YTIM ch1 confirme la grammaire (p04 explosion monochrome rouge/noir = mort de Ye Tian ; p07 panel réaction letterbox + ciel rouge danger).

## Améliorations prioritaires

### P0 — `compose-layout` doit consommer `scene_type` ✅ FAIT (2026-05-30)
> Implémenté : `PanelOutlineBlock` étendu (scene_type/shot_type/effects) ; `tagBlock()` priorise un mapping direct des 13 scene_types → compo (regex en fallback) ; légende du system prompt mise à jour avec les 13 catégories ; cast côté client (`ChapterDetail`) rendu explicite. **Déploiement manuel requis : `supabase functions deploy compose-chapter-layout`.**

**Problème** : `detect_blocks` calcule un `scene_type` précis (13 valeurs), le client l'envoie (`composeChapterLayout.ts:11`), mais `compose-layout.ts` ne le lit pas — `PanelOutlineBlock` n'a pas le champ, et `tagBlock()` re-devine via regex FR vers 7 tags. Perte de précision + types non mappés.
**Fix** : ajouter `scene_type`/`shot_type`/`effects` à `PanelOutlineBlock` ; faire de `tagBlock()` une fonction qui priorise `scene_type` (mapping direct ci-dessous) et ne retombe sur la regex que si `scene_type` absent.

Mapping scene_type → composition suggérée :
| scene_type | compo | raison |
|---|---|---|
| establishing | F / A | décor large |
| dialogue | E / D | échange |
| internal_monologue | O / P / B | introspection, blanc latéral |
| reaction_revelation | B / L | choc, zoom |
| revelation_system | A / G | panneau centré |
| action_movement | I / C | mouvement latéral |
| action_impact | N / I | frappe verticale (signature SL) |
| tension_confrontation | D / L | face-à-face |
| action_melee | A / M | mêlée large |
| power_display | A / B | aura plein cadre |
| isolation_vulnerability | B / O | vide dominant |
| text_echo_psychological | A | splash pleine largeur, fond noir |
| memory_flashback | F / O | objet symbolique |

### P1 — Scénario IA « webtoon-arc »
Ajouter à `SCENARIO_SYSTEM_PROMPT` la structure épisodique : Hook d'ouverture (in medias res ou révélation) → 8-12 beats alternant action/dialogue/émotion → montée → **cliffhanger obligatoire** (jamais de fin calme). Beats typés : action = rapide, dialogue = posé, émotionnel = ralenti.

### P1 — Retirer le mode `panels` mort ✅ FAIT (2026-05-30)
> Chaîne morte supprimée intégralement : fichier `panels.ts` ; import + union de modes + 2 tableaux de validation + branche requête + branche parsing réponse dans `generate-scenario-ai/index.ts` ; types `PanelsAIRequest`/`PanelsAIResponse` + `callSplitChapterIntoPanels` (`scenarioAI.ts`) ; hook `useSplitChapterIntoPanels` + imports (`usePanels.ts`). Helper `tryClosePanelsJson` conservé (toujours utilisé par detect_blocks). **Déploiement manuel requis : `supabase functions deploy generate-scenario-ai`.**

### P2 — Enrichissements observés
- Gradient vertical d'intensité : panels calmes en haut (gaps larges, clair) → action dense en bas (gaps courts, sombre). Piloter `gap_after` en fonction de la position dans l'arc.
- Connectivité « 1 écran ≈ 2000px » : contenu lié garde gap_after ≤ ~500 ; changement de scène = gap ≥ 700.

## Ce qui est déjà bon (ne pas toucher)
- Découpage `detect_blocks` : grammaire complète, fidèle aux références.
- Prompt image : `SCENE_TYPE_FLUX_PREFIX` + `effectsMap` couvrent les 13 types et 25 effets ; règle "pas de texte généré dans l'image" respectée.
