# DreamWeave — Audit quotidien complet
**Date : 23 juillet 2026**

---

## 1. 🔍 Benchmark & Competitive Intelligence

*Fenêtre stricte : 23 juin – 23 juillet 2026. Toute source non datable au dernier mois a été écartée.*

### Concurrents directs & lancements

**WEBTOON lance "byUs", un service de chat IA avec des personnages** — Source : [Anime News Network](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448), 11 juillet 2026 (annonce le 1er juillet). Naver WEBTOON lance byUs : chat IA avec des personnages de séries approuvées par les créateurs, deux modes (Original Stories / Fan Stories), réponses suggérées par IA, "Special Cuts" déblocables. Corée uniquement pour l'instant. Cible l'engagement lecteur/fan-fiction, pas la création côté auteur — mais confirme que le leader du marché investit dans l'IA générative autour du webtoon.

**Concours de webtoons générés par IA (ville d'Icheon, Corée)** — Source : [Anime News Network](https://www.animenewsnetwork.com/news/2026-07-11/icheon-city-government-launches-ai-generated-webtoon-contest/.239518), soumissions ouvertes le 8 juillet 2026. Concours institutionnel exigeant un webtoon ≤20 planches "créé avec de l'IA générative", avec divulgation de l'outil utilisé. Signal de légitimation grand public de la création de webtoons par IA en Corée — marché culturel de référence pour DreamWeave.

**Aucun lancement Product Hunt vérifiable dans le créneau.** Les leaderboards Product Hunt de mi/fin juillet 2026 ont été consultés directement — aucun produit BD/webtoon/manga IA dédié n'apparaît. Les noms cités récurremment dans les recherches (Dashtoon, ComicPad, ComicsMaker.ai, Anifusion, Comistitch...) n'ont aucune date de publication vérifiable en juillet 2026 — probablement du contenu SEO evergreen, écarté par rigueur.

### Plateformes de storytelling IA

**Kaon AI (ex-FlowGPT) lève 60 M$ pour des univers narratifs IA personnalisés** — Source : [SiliconANGLE](https://siliconangle.com/2026/07/08/kaon-ai-raises-60m-build-next-generation-ai-driven-interactive-entertainment/), 8 juillet 2026. Son produit Emochi (storytelling interactif avec images/vidéo générées) revendique 2M DAU, 45M$ ARR, 150 min/jour par utilisateur. Signal fort de demande grand public pour du "story + visuel généré" — adjacent à DreamWeave mais orienté divertissement consommateur, pas outil créateur.

**Meta teste "StoryKit", une appli IA d'histoires pour enfants** — Source : [TechCrunch](https://techcrunch.com/2026/07/21/meta-is-testing-an-ai-bedtime-story-app-for-people-with-no-imagination/), 21 juillet 2026. L'utilisateur crée un personnage (photo d'un jouet), décrit un monde, choisit une "leçon" — l'appli génère une histoire illustrée personnalisée, aucune écriture requise. Valide la mécanique cœur de DreamWeave ("décrire, l'IA illustre") côté grand public, portée par un acteur majeur.

**Instagram "Muse Image AI" : fonctionnalité retirée en 3 jours après backlash** — Source : [TechCrunch](https://techcrunch.com/2026/07/10/meta-removes-controversial-ai-feature-on-instagram-after-backlash/), lancée le 7 juillet, retirée le 10 juillet 2026. Génération d'images IA "inspirées" d'un compte public sans consentement, activée par défaut — retrait forcé après réaction de talents et syndicats (SAG-AFTRA, CAA). **Signal de risque direct pour DreamWeave** : toute fonctionnalité touchant la ressemblance d'une personne réelle ou le mimétisme de style d'artistes vivants expose à un backlash rapide et sévère actuellement.

### Sentiment communautaire (Reddit / Product Hunt / X / Discord)

**Aucune source individuellement vérifiable et datée du dernier mois trouvée.** Plusieurs requêtes ciblées (Reddit AI webtoon, r/WebtoonCanvas, plaintes Discord sur les crédits, frustrations X sur la continuité des personnages) n'ont remonté que du contenu d'agrégateurs non daté ou des résumés sans URL source vérifiable — écartés par rigueur plutôt que rapportés comme faits.

Thèmes récurrents mais **non sourcés/non datés** à titre indicatif seulement : (1) rupture de cohérence des visages/personnages au-delà de 20-50 pages, (2) lassitude face au paiement à la génération, (3) gestion des bulles de dialogue traitée comme un à-côté plutôt qu'un élément de mise en page à part entière — ce dernier point est une zone où l'éditeur de cases de DreamWeave (blocs image + couleur + bulles) différencie déjà structurellement.

**Lacune à signaler** : le moteur de recherche web utilisé synthétise plutôt que de remonter des threads Reddit/Discord/X vivants avec dates vérifiables — limitation d'outil probable, pas absence réelle de discussion.

---

## 2. 🛠️ Audit Technique

| Axe | Score /10 | Justification |
|---|---|---|
| Qualité du code | 8.5 | Zéro `any`/`as any` dans `src/`, zéro TODO/FIXME/HACK — discipline rare. Commentaires respectent la règle "WHY pas WHAT" (`App.tsx:32-34`). Points faibles : deux god-components — `ChapterDetail.tsx` (3174 lignes) et `LoreGraphView.tsx` (2196 lignes) mélangeant état, logique métier et rendu. |
| Architecture globale | 8 | Layering `types → integrations → services → hooks → components → pages` bien respecté (`useAssets.ts` → `services/assets.ts` → `integrations/supabase/client.ts`). Lazy loading soigné avec garde anti-boucle documentée (`App.tsx:56-71`). Déduction pour les deux gros composants ci-dessus. |
| Performance & scalabilité | 7 | `ImageBlockLayer`/`ColorBlockLayer` utilisent `memo()` et `useCallback` correctement. React Query bien configuré (`staleTime: 30_000` global, overrides par hook). **Risque réel** : aucune virtualisation trouvée dans `ChapterDetail.tsx` malgré des canvases jusqu'à 100 000px (`panels.ts:13 PANEL_HEIGHT_MAX`) — tous les blocs/bulles d'un chapitre sont probablement montés simultanément. |
| Sécurité | 9 | Webhook Stripe vérifie la signature (`stripe-webhook/index.ts:91-99`), rejette signature manquante. Aucun `service_role` côté `src/` client. RLS confirmée sur les tables sensibles via migrations (`rename_panels_to_chapter_canvases`, `audit_hardening_rls_indexes`). Token bearer correctement transmis, service key uniquement côté serveur. |
| Dette technique | 6.5 | `allowLongMemory` confirmé mort (défini dans `TIER_CONFIG` mais jamais consommé — cohérent avec le CLAUDE.md). **Dérive de documentation** : `generate-cover-image` existe dans `supabase/functions/` mais absent du tableau "14 Edge Functions" du CLAUDE.md et de `docs/EDGE_FUNCTIONS_INDEX.md` (15 fonctions réelles, pas 14). 49 migrations avec plusieurs passes de renommage/durcissement — churn de schéma sain mais notable. |

**Action immédiate suggérée** : mettre à jour le CLAUDE.md et `docs/EDGE_FUNCTIONS_INDEX.md` pour inclure `generate-cover-image` (15e fonction).

---

## 3. 📦 Audit Produit

Le positionnement correspond globalement à l'implémentation. La grille tarifaire (`types/index.ts:26-61`) est identique au CLAUDE.md — Libre 20cr/€0, Créateur 100cr/€12,99, Studio 250cr/€29,99 — et tous les tiers partagent les mêmes flags de features (`allowReferenceImages`, `allowScenarioAI`, `allowFullExport` tous `true`). La stratégie "tout gratuit, différenciation par crédits uniquement" est réellement codée, pas seulement affichée en marketing.

**Correspondance feature ↔ code** :
- **Sheet System** : câblé (`image_url_sheet` sur `assets`).
- **NarraMind Compass** : le sous-système le plus investi du code — hooks dédiés (`useCompassIndex`, `useCompassProposals`, `useNarraMindDebounce`, `useNarramindAlerts`, `useNarramindMissingAssets`), edge functions `narramind-compass`/`narramind-update`, 6+ migrations dédiées.
- **Menu Univers (cartographie + Ariane)** : réellement implémenté conformément à la règle ADN — `LoreGraphView.tsx` (graph via `@xyflow/react`), `LoreUniversProposalsSheet.tsx`, `ArianeAnalysisModal.tsx`.
- **Fil d'Ariane** : composants d'onboarding présents et référencent la progression Style→Assets→Univers→Scénario→Édition.

**Point à vérifier** : `src/components/project/TestSection.tsx` est un onglet de debug interne ("Fil d'Ariane — Test", "Univers — Test", "Ariane Univers — Scan manuel") accessible via un `TabsContent value="test"` dans le système d'onglets standard — à confirmer qu'il n'est pas exposé aux utilisateurs non-admin en production.

**Aucune incohérence majeure entre promesse et livraison** n'a été trouvée — le produit livre globalement ce qu'il annonce.

---

## 4. 🎨 Audit UX / UI

Le parcours Style → Assets → Scénario → Édition → Univers est cohérent et correspond à `PROGRESSIVE_TOUR_TABS`. `ChapterDetail.tsx` (3174 lignes) est la pièce la plus lourde — vu son statut "zone gelée" (CLAUDE.md), sa taille complique toute modification future sans risque de régression.

**Violations du design system identifiées** :
- **Em-dash dans le copy UI — règle "zéro tolérance" violée** dans au moins 7 emplacements : `ArianeOnboardingCard.tsx:355`, `GlobalKPICards.tsx:154`, `UserDetailDrawer.tsx:214`, `LoreGraphView.tsx:2093,2129`, `ScenarioSection.tsx:930`, `TestSection.tsx:350,374,438,500`.
- **Couleurs hexadécimales en dur** : 97 occurrences hors exceptions SVG, concentrées dans `ArianeOrbitIcon.tsx`/`ArianeThreadIcon.tsx` — défendable pour des icônes en gradient mais viole techniquement la règle "jamais de couleur en dur".
- **Polices** : correctement configurées (Quicksand/Nunito, zéro référence à Inter) — conforme.

**Comparaison avec les standards concurrents (section 1)** : Kaon AI/Emochi et Meta StoryKit misent sur une génération quasi instantanée sans étapes intermédiaires ("décrire → illustré"). Le parcours de DreamWeave est plus riche (Style → Assets → Scénario → Édition) mais plus long avant la première image finale — un compromis assumé pour la cohérence visuelle multi-planches, un point faible identifié chez les concurrents non sourcés (rupture de cohérence des personnages).

---

## 5. 💡 Suggestions d'amélioration

### 🗑️ Removals
- **`allowLongMemory` dans `TIER_CONFIG`** : retirer ou implémenter. Reste un flag mort depuis l'audit du 2026-06-27 — clarifier définitivement pour éviter la confusion en cas de future revue de code.
- **`TestSection.tsx` en onglet standard** : déplacer derrière un flag admin/dev explicite (`import.meta.env.DEV` ou rôle admin) plutôt qu'un `TabsContent` accessible dans le flux normal.

### ⚡ Optimisations
- **Virtualisation du canvas `ChapterDetail.tsx`** : implémenter un rendu virtualisé (IntersectionObserver ou windowing) pour les blocs/bulles hors-viewport sur les chapitres longs (jusqu'à 100 000px) — risque de scalabilité réel identifié dans l'audit technique. *(Zone gelée — nécessite validation explicite de Louis avant implémentation, cf. règle canvas éditeur du CLAUDE.md.)*
- **Découpage de `ChapterDetail.tsx` (3174 lignes) et `LoreGraphView.tsx` (2196 lignes)** : extraire logique métier vers des hooks dédiés pour réduire le risque de régression, surtout `ChapterDetail.tsx` qui est en zone gelée.
- **Corriger la dérive de documentation** : ajouter `generate-cover-image` au tableau CLAUDE.md et à `docs/EDGE_FUNCTIONS_INDEX.md` (15 fonctions réelles).
- **Nettoyer les 7 em-dashes UI** identifiés — règle zéro-tolérance déjà écrite, juste pas appliquée partout.

### ➕ Additions
- **Renforcer la cohérence de personnage multi-planches** — point faible générique constaté chez les concurrents non sourcés (rupture au-delà de 20-50 pages) ; le Sheet System de DreamWeave (4 angles) est déjà un début de réponse structurelle. *Suggestion sans source datée du mois — à valider avant priorisation, car non appuyée par une source du dernier mois comme l'exige la méthodologie.*
- **Vigilance consentement/ressemblance** — s'appuyer sur le précédent Instagram Muse Image AI ([TechCrunch, 10 juillet 2026](https://techcrunch.com/2026/07/10/meta-removes-controversial-ai-feature-on-instagram-after-backlash/)) : si une feature de "style mimicry" d'artiste ou de personnage réel est un jour envisagée, prévoir opt-in explicite et pas de génération basée sur une personne réelle sans consentement — le backlash a été rapide et sévère pour un acteur bien plus gros que DreamWeave.
- **Suivre l'angle "chat avec personnage"** de WEBTOON byUs ([ANN, 11 juillet 2026](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448)) — non urgent, mais un signal que le marché explore l'engagement post-publication autour des personnages générés ; à garder en veille, hors scope Univers v1 (cartographie + Ariane uniquement selon l'ADN produit).

---

## 6. 🚀 Statut de lancement

**Contexte** : exécution locale et/ou Vercel, pas d'annonce publique à ce jour.

**Bloquants techniques identifiés** :
- Documentation Edge Functions désynchronisée (15 vs 14 documentées) — mineur mais à corriger avant tout onboarding externe/support.
- Absence de virtualisation sur les canvases longs — risque de dégradation de performance perçue par de nouveaux utilisateurs sur des chapitres denses, potentiellement un facteur de churn day-1.
- Em-dashes résiduels dans le copy UI — cosmétique mais visible, contraire à la règle produit affirmée.

**Bloquants produit** : aucun majeur identifié — le parcours cœur (Style → Assets → Scénario → Édition) est livré et cohérent avec la promesse.

### Checklist de lancement priorisée
1. **P0** — Corriger la documentation Edge Functions (15 fonctions).
2. **P0** — Décider du sort de `TestSection.tsx` (masquer en production si pas déjà admin-only).
3. **P1** — Nettoyer les em-dashes UI (7 emplacements identifiés).
4. **P1** — Évaluer la charge réelle sur un chapitre proche de 100 000px (test de charge manuel) avant d'annoncer publiquement — même sans implémenter la virtualisation immédiatement, il faut connaître le seuil de dégradation.
5. **P2** — Décider : implémenter ou retirer `allowLongMemory`.
6. **P2** — Refactoring `ChapterDetail.tsx`/`LoreGraphView.tsx` en tâche de fond, hors zone gelée pour la partie non-canvas.

---

## 7. 📣 Plan Marketing

| Tâche | Priorité | Effort |
|---|---|---|
| Créer le compte Instagram DreamWeave | Haute | Rapide |
| Créer un compte X/Twitter et poster un teaser visuel (Sheet System 4 angles) | Haute | Rapide |
| Lancer une landing page orientée acquisition avec CTA waitlist | Haute | Moyen |
| Ouvrir une liste d'attente (waitlist) avec incitation "crédits bonus au lancement" | Haute | Rapide |
| Produire une vidéo teaser concept (parcours Style → Assets → Scénario → Édition en 30s) | Moyenne | Moyen |
| Poster sur r/webtoons, r/WebtoonCanvas, r/comicbookcreation en mode "show & tell" (pas de spam) | Moyenne | Rapide |
| Préparer un post de lancement Product Hunt (aucun concurrent BD/webtoon IA n'y est visible actuellement — créneau ouvert) | Moyenne | Moyen |
| Contacter 5-10 créateurs webtoon indépendants pour un accès anticipé/feedback | Moyenne | Moyen |
| Rédiger un comparatif honnête DreamWeave vs outils génériques (Midjourney/Sora pour BD) soulignant la cohérence de personnage (Sheet System) | Basse | Moyen |
| Mettre en place un tracking UTM simple sur la landing page avant tout lancement payant | Haute | Rapide |

---

## TL;DR

- **Technique solide** : sécurité (9/10) et qualité de code (8.5/10) excellentes ; le vrai risque est la performance du canvas sur les très longs chapitres (aucune virtualisation trouvée malgré des cases jusqu'à 100 000px) et deux fichiers god-component (`ChapterDetail.tsx`, `LoreGraphView.tsx`).
- **Produit fidèle à la promesse** : Sheet System, NarraMind Compass et menu Univers sont réellement implémentés (pas des stubs) ; seul point à vérifier est l'exposition de `TestSection.tsx` en production.
- **Dérive documentaire mineure** : 15 Edge Functions réelles vs 14 documentées (`generate-cover-image` manquant) — à corriger rapidement.
- **Marché** : aucun concurrent BD/webtoon IA n'a lancé sur Product Hunt ce mois-ci — fenêtre ouverte pour un lancement DreamWeave. Kaon AI (60M$ levés) et Meta StoryKit valident la demande grand public pour "décrire → IA illustre", en cohérence avec le pari produit de DreamWeave.
- **Signal de risque externe** : le retrait forcé de la fonctionnalité Instagram Muse Image AI (consentement/ressemblance) doit rester une ligne rouge si DreamWeave envisage un jour du mimétisme de style d'artiste réel.
- **Prochaine action concrète** : corriger la doc Edge Functions + décider du sort de `TestSection.tsx`, puis lancer la waitlist/landing page — aucun bloquant produit majeur ne retarde plus le lancement.

---

📝 **Impact Mémoire** : Cet audit ne déclenche pas la règle Mémoire — pas de changement d'architecture, de feature majeure livrée, de repositionnement ou de nouveaux KPIs décidés aujourd'hui. Signalé pour traçabilité uniquement.
