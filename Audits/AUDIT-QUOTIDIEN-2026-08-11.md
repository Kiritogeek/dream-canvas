# 🔍 Audit Quotidien DreamWeave — 2026-08-11

*Audit automatisé complet. Branche `pre-production` · commit `8a3c92a` (2026-08-11) · read-only. Depuis le dernier audit (24/07, commit `ee49cac`) : 7 commits, mais **1 seul fichier applicatif modifié** (`src/components/chapter/ScenarioCasesPanel.tsx`, +7/-2 lignes) — les 6 autres commits concernent l'export PDF du mémoire de fin d'études (`Produit/Memoire_DreamWeave.md`), hors périmètre applicatif. Sources benchmark : fenêtre visée 11 juillet – 11 août 2026 (< 30 jours) ; la recherche n'a que très rarement pu localiser des annonces datées avec précision dans cette fenêtre — voir avertissement en fin de section 1.*

---

## 1. 🔍 Benchmark & Competitive Intelligence

> ⚠️ **Avertissement méthodologique** : la recherche web d'aujourd'hui n'a remonté quasiment que du contenu evergreen/SEO ("Best AI Comic Generators 2026", guides comparatifs) sans date de publication fiable, ou daté en dehors de la fenêtre des 30 derniers jours (mars-mai 2026 pour la plupart). Conformément à la règle de sourcing stricte, ces sources sont **écartées comme findings du mois** et seulement mentionnées ci-dessous comme contexte de marché non daté, clairement signalé comme tel.

### Aucune annonce précisément datée dans la fenêtre du mois

Recherches ciblées sur l'actualité webtoon/manga IA d'août 2026, la communauté Reddit/Product Hunt, et les mises à jour FAL.ai/FLUX : aucune source n'a pu être datée avec certitude entre le 11 juillet et le 11 août 2026. Le lancement Product Hunt le mieux documenté trouvé (Mangaka.app) date du 30 mars 2026 — hors fenêtre, écarté. Les levées de fonds Kaon AI / annonces Naver WEBTOON identifiées lors des audits précédents (juillet) n'ont pas de développement nouveau daté ce mois-ci dans les résultats obtenus.

### Contexte de marché non daté (à ne pas traiter comme actualité du mois)

- Le marché du webtoon/webcomic continue sa croissance rapide (estimations divergentes selon les sources : 8,17 Md$ en 2025 → 8,76 Md$ en 2026 selon une source, 10,85 Md$ → 60,25 Md$ d'ici 2031 selon une autre — écarts de méthodologie non résolus, à ne pas citer comme chiffre unique).
- Le sujet #1 de friction remonté par la recherche généraliste (non daté précisément) reste la **cohérence des personnages** entre panels : "le héros a un visage différent en page 2, la cicatrice du méchant change de joue" — LoRA fine-tuning et "identity embedding" (empreinte à partir de 1-3 images de référence) sont cités comme réponses techniques dominantes du marché.
- FLUX.2 [pro] (Black Forest Labs, déjà le modèle utilisé par DreamWeave) reste cité comme leader 2026 sur le photoréalisme et la cohérence multi-référence (jusqu'à 8-10 images de référence simultanées, sortie 4 mégapixels) — confirme que le choix technique de DreamWeave reste aligné sur l'état de l'art, sans annonce de rupture identifiée ce mois-ci.
- Aucun signal Reddit/Discord/X daté précisément n'a pu être isolé pour des outils concurrents nommés (Dashtoon, Jenova, COMICPAD, Anifusion, Comistitch) — recommandation reconduite des audits précédents : des requêtes `site:reddit.com` et Product Hunt ciblées sur une fenêtre calendaire précise seraient nécessaires pour un vrai signal communautaire daté.

**Lecture pour DreamWeave** : deuxième audit consécutif où aucune annonce concurrentielle fraîche et vérifiable n'émerge. Cela ne signifie pas absence de mouvement marché, mais plutôt que ces acteurs communiquent peu via des canaux indexés/datés, ou que la recherche générale sature sur du contenu SEO evergreen plutôt que de l'actualité. Un prochain audit devrait tester des requêtes plus précises (noms de domaines concurrents + `news`/`launch` + date exacte) plutôt que des requêtes génériques "AI webtoon 2026".

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification |
|---|---|---|
| **Qualité du code** | **8** | Zéro `TODO`/`FIXME`/`HACK` dans `src/` et `supabase/`. Zéro `console.log` (uniquement `console.error`/`warn` sur des chemins d'erreur catchés, légitimes). Un seul `any` dans tout `src/` (`EmailVerification.tsx`). `npx tsc --noEmit` → 0 erreur. 25 fichiers de tests Vitest couvrant services, hooks et logique canvas. Point faible inchangé : god-files — `ChapterDetail.tsx` (3174 lignes, zone canvas freezée), `LoreGraphView.tsx` (2196 lignes), `ScenarioChapterEditor.tsx` (1937 lignes). |
| **Architecture** | **8** | Flux `types → integrations/supabase → services → hooks → components → pages` respecté. `App.tsx` lazy-load toutes les routes avec garde anti-boucle sur hash de déploiement obsolète. Dette structurelle connue : `TIER_CONFIG` dupliqué entre `src/types/index.ts` (client) et `supabase/functions/_shared/tierConfig.ts` (Deno), mais protégé par `src/test/tierConfigSync.test.ts` qui compare champ à champ — bon garde-fou, dette non résorbée mais sous contrôle. 49 migrations montrent une évolution incrémentale cohérente du schéma. |
| **Performance & scalabilité** | **7** | Routes code-splittées, dépendances lourdes (`framer-motion`, `@xyflow/react`, `html2canvas`, `recharts`, `jszip`) chargées uniquement sur les pages qui les utilisent. Index FK ajoutés en 06/2026 (`idx_assets_project`, `idx_chapters_project`, `idx_chapter_canvases_chapter`). `narramind-compass` utilise une recherche pgvector bornée par `LIMIT`, pas de full-scan. Point de vigilance inchangé depuis plusieurs audits : **aucune preuve de virtualisation** du canvas chapitre (jusqu'à 100 000px, potentiellement des dizaines de blocs/bulles) — risque de scalabilité non validé sous charge réelle. |
| **Sécurité** | **9** | `client.ts` n'utilise que la clé publique (`VITE_SUPABASE_PUBLISHABLE_KEY`) — 0 occurrence de `service_role` côté `src/`. Chaque Edge Function agissant sur des données utilisateur valide le JWT (`generate-asset-image/index.ts:562-575`, `narramind-compass/index.ts:427-430`) ; `stripe-webhook` valide correctement la signature Stripe plutôt que le JWT. RLS activée sur toutes les tables coeur avec `auth.uid() = user_id`. Durcissement confirmé : migration `20260627120000` a ajouté des `WITH CHECK` manquants (faille où un `UPDATE` pouvait réassigner `user_id`) et corrigé un `search_path` mutable sur `match_embeddings` ; `20260702120000` verrouille `profiles.billing_period_start`/`stripe_customer_id`/`excluded_from_stats` côté client. Point mineur reconduit : la policy `SELECT` sur `storage.objects` autorise la lecture de tout le bucket `dreamweave` par tout utilisateur authentifié, sans vérification de chemin par utilisateur — probablement acceptable pour des assets publics, mais à valider explicitement si un asset privé venait à y transiter. |
| **Dette technique** | **7,5** | Zéro TODO/FIXME/HACK. Dette identifiée et stable : (1) `allowLongMemory` toujours déclaré dans `TIER_CONFIG` mais **non consommé nulle part** en dehors du test de sync — flag mort confirmé une nouvelle fois ; (2) doc CLAUDE.md annonce "14 Edge Functions" mais le dossier `supabase/functions/` en contient **15** (`generate-cover-image` non documenté dans le tableau) — dérive documentaire mineure ; (3) 84 couleurs hex codées en dur dans `src/components/`, mais concentrées dans des contextes de personnalisation utilisateur légitimes (color picker, bulles, SFX) — exception défendable à la règle, pas une violation nette. Dépendances à jour (React 18.3, Vite 7.3.1, TS 5.8.3, Supabase JS 2.95.3, TanStack Query 5.83), aucune majeure en retard identifiée. |

**Moyenne technique ≈ 7,9/10.** Base saine, stable depuis le dernier audit (quasi aucun changement de code applicatif). Les points de vigilance restent inchangés d'un audit à l'autre : canvas non virtualisé, `TIER_CONFIG` dupliqué, `allowLongMemory` mort — dette identifiée mais qui persiste sans arbitrage depuis plusieurs cycles.

---

## 3. 📦 Product Audit

**Cohérence tiers/positionnement : confirmée.** `TIER_CONFIG` (`src/types/index.ts:25-62`) montre `allowReferenceImages`/`allowScenarioAI`/`allowFullExport` identiques sur les trois plans et `model: "flux-2-pro"` partout — la différenciation est purement `maxGenerationsPerMonth` (20/100/250), conforme à la stratégie "tout gratuit" actée le 30/05/2026.

**Menu Univers : implémentation substantielle, conforme à l'ADN v1.** `UniverseSection.tsx` est câblé comme onglet dans `ProjectDetail.tsx`, avec `LoreGraphView.tsx` (cartographie graphe via `@xyflow/react`), `LoreNodeSheet.tsx`, `LoreUniversProposalsSheet.tsx`, `ArianeAnalysisModal.tsx`/`ArianeNarrativeSheet.tsx` pour le pilier "amélioration continue" adossé à NarraMind Compass. Ce constat, déjà documenté dans les audits précédents, reste d'actualité — le statut roadmap "🔴 non démarré" dans CLAUDE.md est obsolète et devrait être corrigé pour refléter l'implémentation réelle, distincte d'une simple ébauche.

**Changement produit du jour** : `AUTO_COMPOSITION_ENABLED = false` ajouté dans `ScenarioCasesPanel.tsx`, commenté explicitement "masquée à la demande de Louis (2026-07-19)". Les boutons Composer/Recomposer IA de la composition automatique de chapitre sont désormais masqués côté UI — l'utilisateur place lui-même ses blocs par glisser-déposer. C'est une régression de scope volontaire et documentée (pas un bug), cohérente avec un choix produit assumé plutôt qu'une suppression silencieuse. Le code de composition automatique reste en place (flag, pas suppression), ce qui permet une réactivation rapide si le choix est révisé.

**`allowLongMemory`** reste un flag mort, non consommé, statut inchangé depuis l'audit du 27/06.

---

## 4. 🎨 UX / UI Audit

**Parcours principal fluide** : `ProjectDetail.tsx` structure le parcours en onglets (`style`, `assets`, `universe`, `scenario`, `edition`), avec gating progressif via `useProgressiveMenuGate.ts` (déverrouillage séquentiel selon l'état de validation). Aucune route morte trouvée dans `App.tsx` — toutes les pages sont atteignables et lazy-loadées correctement.

**Design system majoritairement respecté** : `tailwind.config.ts` confirme `Quicksand` (display) / `Nunito` (body), aucune référence à Inter. Couleurs hex hardcodées confinées à des contextes acceptables (icônes SVG, presets de color picker) à une exception près : `DashboardHome.tsx` code en dur des stops de dégradé pour les couvertures de genre en zone de chrome/layout plutôt que via tokens — candidat à un refactor token-based, impact mineur.

**⚠️ Violation confirmée de la règle "zéro tolérance em-dash"** — cohérent avec le finding de l'audit du 24/07, non corrigé depuis : occurrences réelles dans du copy utilisateur affiché, notamment `src/components/ariane/ArianeOnboardingCard.tsx:355` et `src/components/ariane/ArianeContinuityPanel.tsx:182` / `:294`. Ironie notable : ces violations se trouvent dans les composants Ariane/onboarding, censés être la vitrine qualité du produit. Correction rapide et à faible risque, toujours pas traitée trois semaines après son premier signalement (24/07).

**Complexité de l'éditeur** : `ChapterDetail.tsx` reste à 3174 lignes (zone canvas freezée, changement non recommandé sans accord explicite de Louis). `EditionSection.tsx` (665 lignes) reste raisonnable en comparaison.

**Comparaison au benchmark (section 1)** : le point de friction #1 remonté par le marché général (cohérence des personnages entre panels) est structurellement adressé par le Sheet System de DreamWeave (fiche 4 angles) — positionnement toujours pertinent, mais aucune preuve de mise en avant marketing de cet atout dans le produit lui-même (pas de copy in-app qui vend explicitement "cohérence garantie" comme différenciateur face à la douleur #1 du marché).

---

## 5. 💡 Improvement Suggestions

### 🗑️ Removals
- **Trancher `allowLongMemory`** (implémenter ou retirer de `TIER_CONFIG` + `tierConfigSync.test.ts`) — flag mort confirmé sur plusieurs audits consécutifs, dette qui ne se résorbe pas d'elle-même.
- **Décider du sort de la composition automatique** (`AUTO_COMPOSITION_ENABLED = false`) : si le choix manuel est définitif, retirer le code mort plutôt que le masquer indéfiniment ; si c'est temporaire, documenter un critère de réactivation.

### ⚡ Optimizations
- **Corriger les violations em-dash** dans `ArianeOnboardingCard.tsx:355` et `ArianeContinuityPanel.tsx:182/294` — signalé depuis le 24/07, toujours pas traité, correction rapide et peu risquée.
- **Dédupliquer `TIER_CONFIG`** (client vs `_shared/tierConfig.ts`) — le test de sync protège aujourd'hui mais une source unique générée éliminerait le risque plutôt que de le détecter après coup.
- **Virtualiser le canvas de l'éditeur** (windowing des blocs/bulles hors viewport) — risque de scalabilité non résorbé depuis plusieurs audits. **⚠️ Zone canvas freezée : nécessite l'accord explicite de Louis avant toute implémentation.**
- **Découper les 3 god-files** (`ChapterDetail.tsx`, `LoreGraphView.tsx`, `ScenarioChapterEditor.tsx`).
- **Corriger la dérive documentaire** : CLAUDE.md indique 14 Edge Functions, le dossier en contient 15 (`generate-cover-image` manquant du tableau).
- **Mettre à jour le statut roadmap "Univers v1"** de 🔴 à son état réel (largement implémenté) pour que la documentation reflète le code.

### ➕ Additions
- **Mettre en avant le Sheet System comme réponse directe à la douleur #1 du marché** (cohérence des personnages) dans le copy produit/marketing — le différenciateur technique existe déjà, la communication ne l'exploite pas explicitement.
- **Pipeline d'export/publication vers plateformes de lecture** (Webtoon, Tapas, LINE) — écart signalé lors des audits précédents, toujours non résorbé.
- *(Aucune suggestion benchmark supplémentaire aujourd'hui faute de source datée dans la fenêtre du mois — voir avertissement section 1.)*

---

## 6. 🚀 Launch Status

**Contexte** : tourne en local et/ou sur Vercel, pas encore annoncé publiquement. Code applicatif quasi inchangé depuis le 24/07 (1 fichier, 9 lignes) — l'essentiel de l'activité récente a porté sur l'export PDF du mémoire de fin d'études, hors périmètre produit.

**Bloqueurs identifiés :**
- **Go-to-market (P0)** : aucune présence publique identifiée. Bloqueur principal, inchangé depuis plusieurs audits.
- **Technique (P1)** : scalabilité du canvas long non validée sous charge réelle ; `TIER_CONFIG` dupliqué client/serveur.
- **Produit/Polish (P2)** : `allowLongMemory` toujours non tranché ; violations em-dash toujours présentes (3 semaines sans correction) ; statut roadmap Univers désynchronisé du code réel.

**Checklist de lancement priorisée :**
1. **[P0]** Landing d'acquisition + waitlist — aucun progrès identifié depuis les audits précédents.
2. **[P0]** Test de charge du canvas éditeur sur chapitre long.
3. **[P0]** Vérifier vars d'env prod (Supabase/FAL.ai/Stripe) + webhook Stripe en mode live.
4. **[P1]** Corriger les violations em-dash (rapide, faible risque, signalé depuis 3 semaines).
5. **[P1]** Trancher `allowLongMemory`.
6. **[P2]** Mettre à jour CLAUDE.md (statut Univers, décompte des 15 Edge Functions).
7. **[P2]** Découpage des god-files ; couverture de tests élargie.
8. **[P2]** Pipeline d'export/publication vers plateformes de lecture.

---

## 7. 📣 Marketing Plan

**Posture actuelle** : aucune présence publique identifiée, inchangée depuis les audits précédents. Priorité : construire une audience avant lancement, créneau "crée ton webtoon sans savoir dessiner", cible créateurs FR d'abord.

| Tâche | Priorité | Effort |
|---|---|---|
| Landing d'acquisition + waitlist (démo visuelle Style→Assets→Univers→Scénario→Éditeur) | **Haute** | Medium |
| Créer les comptes réseaux (Instagram + TikTok + X) | **Haute** | Quick |
| Positionner le **Sheet System / cohérence de personnage** comme réponse directe à la douleur #1 du marché (visages incohérents entre panels) | **Haute** | Quick |
| Teaser vidéo de concept (30-45s : idée → chapitre webtoon en quelques minutes) | **Haute** | Medium |
| Préparer un lancement Product Hunt (assets, tagline, commentaires early) | Moyenne | Medium |
| Série de posts "build in public" (avancées, coulisses IA) | Moyenne | Long |
| Cibler les communautés créateurs FR (Discord webtoon/manga, r/webtoons) sans approche spam | Moyenne | Medium |
| SEO de contenu : "comment créer un webtoon sans dessiner" | Basse | Long |

---

## 📌 TL;DR

- **Code applicatif quasi inchangé depuis le 24/07** (1 fichier, 9 lignes) — scores techniques stables et bons (moyenne ~7,9/10, sécurité 9/10 et architecture/qualité code à 8/10 restent les points forts). L'essentiel de l'activité récente (6 des 7 derniers commits) concerne l'export PDF du mémoire de fin d'études, hors produit.
- **Changement produit notable** : la composition automatique de chapitre par IA a été masquée côté UI le 19/07 à la demande de Louis (`AUTO_COMPOSITION_ENABLED = false`) — choix assumé vers un placement manuel des blocs, code conservé pour réactivation éventuelle.
- **Dette non résorbée, signalée sur plusieurs audits consécutifs** : violations em-dash dans le copy Ariane (toujours pas corrigées 3 semaines après signalement), `allowLongMemory` toujours mort, canvas éditeur toujours non virtualisé, statut roadmap "Univers v1 🔴" toujours désynchronisé d'une implémentation en réalité substantielle.
- **Benchmark concurrentiel peu concluant ce mois-ci** : la recherche n'a pas permis d'isoler d'annonce fraîche datée avec certitude dans la fenêtre du 11/07-11/08 — recommandation reconduite de cibler des requêtes plus précises (domaines concurrents nommés + date exacte) lors du prochain audit plutôt que des requêtes génériques.
- **Aucune présence publique détectée** — le gap go-to-market reste le bloqueur P0 numéro un. Prochaines actions concrètes : (1) landing + waitlist, (2) correction des em-dash (3 semaines de retard), (3) test de charge canvas, (4) mise à jour de CLAUDE.md pour refléter le statut réel d'Univers v1.
