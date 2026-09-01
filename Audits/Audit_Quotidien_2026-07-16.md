# Audit quotidien DreamWeave — 16 juillet 2026

---

## 1. 🔍 Benchmark & Competitive Intelligence

*Sources limitées aux 30 derniers jours (16 juin – 16 juillet 2026).*

### Lancements & mouvements majeurs

**WEBTOON lance "byUs" (chat narratif IA sur IP officielles)** — 1er juillet 2026
Naver WEBTOON a lancé byUs, un service de chat narratif IA permettant aux utilisateurs de devenir le protagoniste d'histoires construites avec des personnages de webtoons officiellement approuvés par les créateurs. Deux formats : "Original Stories" (histoires qui démarrent sur la trame originale puis bifurquent via IA) et "Fan Stories" (UGC avec personnages existants).
Source : [Anime News Network, 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448)
→ Ce n'est pas un concurrent direct sur la création visuelle, mais un signal fort : le leader du marché (WEBTOON) investit dans l'IA générative narrative alors même que son propre règlement de concours interdit l'IA générative dans les soumissions (voir plus bas). Tension positionnement à surveiller.

**Concours "AI-Generated Webtoon" — Ville d'Icheon (Corée)** — ouvert du 8 juillet au 14 août 2026
La municipalité d'Icheon lance un concours officiel de webtoons générés par IA (max 20 planches). Signal de légitimation institutionnelle de la création IA en Corée, marché historique du webtoon.
Source : [Anime News Network, 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/icheon-city-government-launches-ai-generated-webtoon-contest/.239518)

**Dashtoon reste positionné #1 sur les benchmarks de capacité IA comic**, avec un pipeline storyboard → planche annoncé à 5-6h par épisode contre 40-50h en méthode traditionnelle. Pas d'annonce produit majeure identifiée dans les 30 derniers jours spécifiquement, mais confirmation de la position dominante et de la stack de monétisation intégrée (contrairement à DreamWeave, purement outil de création).
Source : [thearcweb.com](https://www.thearcweb.com/company/dashtoon), [Microsoft AI First Movers](https://www.microsoft.com/en-in/aifirstmovers/dashtoon)

### Sentiment communautaire (Reddit)

Sur Reddit, une partie des lecteurs qualifie l'art généré par IA de "low-effort" ou visuellement reconnaissable, en particulier quand les personnages manquent de continuité entre les cases — et la réaction est plus dure encore quand un créateur publie des planches IA sans le déclarer.
Source : [AI Tribune, 2026-05-08](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/) *(hors fenêtre 30 jours stricte, cité pour contexte de sentiment uniquement — pas retenu comme fait daté)*

**Point de vigilance** : le règlement du concours WEBTOON "Webcomic Legends" interdit explicitement toute IA générative dans les soumissions, sous peine de disqualification. Le marché reste donc polarisé entre plateformes qui embrassent l'IA (Dashtoon, byUs) et celles qui la bannissent côté publication (WEBTOON pour ses propres concours) — un rappel que **DreamWeave vend l'outil de création, pas la distribution**, ce qui limite son exposition à ce clivage.

### Paysage tarifaire concurrent (comparaison directe pertinente pour le modèle "crédits")

| Outil | Free tier | Palier payant |
|---|---|---|
| Anifusion (manga) | 100 crédits gratuits, 5-100 crédits/génération selon modèle | — |
| Comicory | Crédits de démarrage à l'inscription | À partir de 9,99 $/mois |
| LlamaGen.AI | 1000 crédits gratuits | 11 $/mois (15 000 crédits) / 18 $/mois (45 000 crédits) |
| ComicsMaker.ai | 100 crédits/mois gratuits | À partir de 10 $/mois (3000 crédits) |

Source : [comicpad.app, juillet 2026](https://www.comicpad.app/best-ai-comic-generators), [Anifusion pricing](https://anifusion.ai/pricing/)

→ **Lecture DreamWeave** : le positionnement 1 crédit = 1 génération (20/100/250 selon plan) est nettement plus lisible que les grilles concurrentes (5-100 crédits/génération selon le modèle chez Anifusion). C'est un vrai avantage de simplicité de message, à mettre en avant dans le marketing (section 7).

### Modèle IA sous-jacent

FLUX.2 Pro (utilisé par DreamWeave pour tous les tiers) génère désormais en 3-5 secondes après l'upgrade vitesse du 3 mars 2026, avec jusqu'à 8 images de référence simultanées pour la cohérence de personnage — fonctionnalité directement pertinente pour le Sheet System de DreamWeave.
Source : [Atlas Cloud, 2026](https://www.atlascloud.ai/blog/guides/flux-2-pro-deep-dive), [bfl.ai](https://bfl.ai/models/flux-2)
*(Date d'annonce du modèle : novembre 2025 / upgrade vitesse mars 2026 — hors fenêtre stricte 30 jours, mais fait partie de la stack en production DreamWeave donc retenu pour contexte technique, pas comme "actualité concurrentielle" du mois.)*

---

## 2. 🛠️ Audit technique

*Réalisé par lecture directe du code (agent d'audit dédié).*

| Axe | Score /10 | Justification |
|---|---|---|
| Qualité du code | 8/10 | `tsc --noEmit` propre, zéro `as any` dans `src/`, seulement 2 `@ts-ignore` sur tout le repo. ESLint strict actif. Commentaires disciplinés (WHY uniquement). Point faible : fichiers monolithes — `ChapterDetail.tsx` (3174 lignes), `LoreGraphView.tsx` (2196 lignes), `ScenarioChapterEditor.tsx` (1937 lignes). |
| Architecture globale | 7.5/10 | Convention `types → integrations → services → hooks → components → pages` réellement respectée. Lazy loading propre avec fallback anti-écran-blanc dans `App.tsx`. 14 Edge Functions bien séparées, logique partagée dans `supabase/functions/_shared/`. Point faible : `TIER_CONFIG` dupliqué entre `src/types/index.ts` et `supabase/functions/_shared/tierConfig.ts`, synchronisation reposant sur un seul test (`tierConfigSync.test.ts`) — fragile. |
| Performance & scalabilité | 7/10 | Lazy loading systématique, React Query `staleTime: 30s`. Timeout FAL explicite (120s), dimensions cases plafonnées à 1440px avec snap 32px. Risque non mesurable statiquement : canvas chapitre jusqu'à 100 000px rendu dans un composant unique de 3174 lignes. Responsive très faible (`ChapterDetail.tsx` : 3 occurrences de breakpoints sur 3174 lignes) — cohérent avec un outil desktop mais à confirmer comme choix assumé plutôt que dette. |
| Sécurité | 8.5/10 | RLS confirmée (`auth.uid() = user_id`) sur toutes les tables vérifiées. Aucune clé `service_role` côté client. Changement de plan verrouillé sur `stripe-webhook` uniquement (commenté explicitement dans `useUserPlan.ts`). Pas de secret en dur trouvé. |
| Dette technique | 7/10 | 25 fichiers de tests unitaires (Vitest) couvrant hooks/services/lib — bonne discipline. Suite non exécutable dans le sandbox d'audit (erreur d'environnement, pas de code). Dette principale : champ `allowLongMemory` zombie dans `TIER_CONFIG` (voir section 3). |

**Note globale pondérée : ~7.6/10** — codebase saine et disciplinée pour un projet solo, avec une dette concentrée et identifiable plutôt que diffuse.

---

## 3. 📦 Audit produit

**Incohérence confirmée — `allowLongMemory`** : le champ existe toujours dans `TierLimits` (`src/types/index.ts:18` et sa copie `supabase/functions/_shared/tierConfig.ts:13`), avec `studio: true` / `libre|createur: false`. Recherche exhaustive : aucun composant, hook ou Edge Function ne lit ce flag en dehors du test de synchronisation. Ce n'est donc pas un bug fonctionnel actif, mais un résidu de modèle de données qui contredit visuellement le principe "différenciation = volume de crédits uniquement" affirmé dans CLAUDE.md. Côté UI (`Plans.tsx`, `Landing.tsx`), le nettoyage commercial du 2026-06-27 a bien été appliqué — le résidu est uniquement dans le type TypeScript.
→ **Action simple** : soit supprimer `allowLongMemory` de `TierLimits`, soit l'implémenter. CLAUDE.md le note déjà comme "à implémenter ou retirer ultérieurement" — aucune décision prise depuis.

**Écart majeur identifié — menu Univers** : CLAUDE.md classe "Univers v1 (cartographie + Ariane)" comme priorité roadmap actuelle 🔴 (à faire), mais le code montre une implémentation substantielle déjà branchée en production : `UniverseSection.tsx` est un onglet réel de `ProjectDetail.tsx`, `LoreGraphView.tsx` (2196 lignes, dépendance `@xyflow/react` dédiée) pour la cartographie, `LoreNodeSheet.tsx` (806 lignes) et `LoreUniversProposalsSheet.tsx` (512 lignes) pour le pilier "amélioration continue" via Ariane, plus les hooks `useLoreNodes.ts`, `useLoreEdges.ts`, `useArianeLoreProposals.ts` (1105 lignes).
→ **Deux hypothèses** : soit la roadmap Obsidian est périmée par rapport au code réel, soit le chantier est en cours mais pas encore jugé livrable par Louis (qualité/complétude non visible depuis le code seul). **À clarifier avec Louis** — c'est potentiellement la plus grosse nouvelle de cet audit si Univers v1 est en réalité bien plus avancé que documenté.

**Alignement tiers correct** : sur les champs `TierLimits` réellement consommés (`allowReferenceImages`, `allowScenarioAI`, `allowFullExport`, `filArianeLimit`), les trois tiers sont identiques — seul `maxGenerationsPerMonth` varie (20/100/250). Cohérent avec le positionnement "tout gratuit sauf volume".

**Risque de fragmentation Ariane** : la persona Ariane est répartie sur 10 fichiers sous `src/components/ariane/` (onboarding, tour, bulle, continuité) plus 4 fichiers liés au lore. Cohérent avec l'ADN produit, mais surface large — un utilisateur pourrait percevoir plusieurs widgets déconnectés plutôt qu'un seul assistant cohérent. Suggestion : un audit UX dédié (pas de code, juste parcours utilisateur) pour vérifier la perception d'unité d'Ariane.

**Face au benchmark concurrentiel (section 1)** : DreamWeave se distingue par un modèle de crédits plus lisible que la plupart des concurrents (1 crédit = 1 génération, contre des grilles 5-100 crédits/génération chez Anifusion). C'est un argument produit sous-exploité commercialement.

---

## 4. 🎨 Audit UX/UI

**Design system** : bonne adoption — `.glass` utilisé dans 37 fichiers. Le socle applicatif respecte le système dès le chargement (`ChunkErrorFallback`, `PageLoader` utilisent déjà `.glass`/`gradient-primary`/`text-gradient`).

**Violation de la règle "zéro em-dash" détectée** dans du texte UI réel (pas juste des commentaires) :
- `src/pages/ProjectDetail.tsx:429` — libellé d'onglet `"Test — Fil d'Ariane"`
- `src/pages/ProjectDetail.tsx:652` — `aria-label` contenant `"Fil d'Ariane — ..."`
→ Correction triviale (< 5 lignes), à corriger au fil de l'eau.

**Couleurs hardcodées** : 91 occurrences de hex littéraux, concentrées dans les icônes de mascotte (`ArianeOrbitIcon.tsx`, `ArianeThreadIcon.tsx`) — défendable pour une icône de marque bespoke mais hors tokens HSL au sens strict. D'autres occurrences (`BlockToolbar.tsx`, `BubbleLayer.tsx`) semblent être des couleurs de contenu utilisateur (texte de bulle choisi par l'utilisateur) plutôt que des tokens d'app — à trancher explicitement plutôt que de laisser ambigu.

**États de chargement/erreur** : bien couverts. `ProjectDetail.tsx` et `ChapterDetail.tsx` exposent systématiquement les états `isLoading`/`isPending` de React Query avec boutons désactivés et spinners pendant les mutations. `useAssetGeneration.ts` a un pattern mature de traduction des erreurs FAL en messages actionnables en français.

**Responsive** : usage très faible des breakpoints (`ProjectDetail.tsx` : 4/691 lignes, `ChapterDetail.tsx` : 3/3174 lignes) — cohérent avec un éditeur pensé desktop, mais à confirmer comme choix assumé plutôt que dette non documentée.

**Comparaison avec les concurrents benchmarkés** : les critiques Reddit sur les outils IA concurrents portent surtout sur la cohérence visuelle entre cases (personnages qui changent d'apparence). Le Sheet System de DreamWeave (fiche composite 4 angles) adresse directement ce point de douleur identifié côté marché — c'est un différenciateur produit validé par le sentiment communautaire observé.

**Zone protégée signalée sans y toucher** : `ChapterDetail.tsx` (3174 lignes, plus gros fichier du repo) concentre blocs image/couleur/bulles, SFX, composition et navigation. Cette taille est en soi un facteur de risque de cohérence UX à long terme. Conformément à la règle de zone protégée, aucune modification n'est proposée ici — signalement uniquement.

---

## 5. 💡 Suggestions d'amélioration

### 🗑️ Removals

- **Retirer `allowLongMemory` de `TierLimits`** (`src/types/index.ts`, `supabase/functions/_shared/tierConfig.ts`) — champ non consommé, contredit le positionnement "crédits uniquement" affirmé depuis l'audit du 2026-06-27. Alternative : l'implémenter si Louis veut relancer la feature, mais pas la laisser en zombie.
- **Auditer les 91 couleurs hex hardcodées** — trancher lesquelles doivent migrer vers des tokens HSL (icônes de marque) vs lesquelles sont légitimement dynamiques (contenu utilisateur dans les bulles).

### ⚡ Optimizations

- **Corriger les 2 em-dash en texte UI** (`ProjectDetail.tsx:429` et `:652`) — violation directe de la règle anti-slop, fix < 5 lignes.
- **Découper `ChapterDetail.tsx` (3174 lignes)** en sous-composants — hors zone protégée si le découpage ne touche pas au comportement des blocs image/couleur/bulles, uniquement à l'organisation des fichiers. À signaler à Louis avant toute action vu la sensibilité de la zone.
- **Renforcer la synchronisation `TIER_CONFIG`** entre client et Edge Functions — actuellement un seul test la garantit ; envisager une source unique générée plutôt que deux fichiers maintenus manuellement.
- **Mettre en avant la simplicité du modèle de crédits** (1 crédit = 1 génération) dans le copy marketing face à des concurrents à grilles de crédits complexes (5-100 crédits/génération chez Anifusion) — avantage identifié en section 1, actuellement sous-exploité.
Source du constat concurrentiel : [Anifusion pricing, juillet 2026](https://anifusion.ai/pricing/)

### ➕ Additions

- **Exploiter la fonctionnalité multi-référence de FLUX.2 Pro (jusqu'à 8 images)** pour enrichir le Sheet System — le modèle sous-jacent supporte déjà plus de références que ce que DreamWeave semble exploiter (4 angles). Vérifier s'il y a une marge d'amélioration de cohérence de personnage à coût de crédit égal.
Source : [Atlas Cloud, 2026](https://www.atlascloud.ai/blog/guides/flux-2-pro-deep-dive)
- **Clarifier l'état réel d'Univers v1** avec Louis — le code suggère un chantier bien plus avancé que ce que documente la roadmap. Si confirmé, communiquer/capitaliser dessus plutôt que de le traiter comme "à démarrer".
- **Envisager une charte de disclosure IA** dans l'export final (mention optionnelle "assisté par IA") — le sentiment Reddit montre que les lecteurs réagissent mal à de l'IA non déclarée ; positionner DreamWeave comme outil transparent pourrait être un argument de confiance face à des plateformes qui restent ambiguës sur le sujet.

---

## 6. 🚀 Statut de lancement

**Contexte actuel** : exécution locale et/ou Vercel, pas d'annonce publique.

**Bloquants identifiés dans cet audit** :
1. Décision non tranchée sur `allowLongMemory` (zombie de données — risque faible mais à nettoyer avant scale)
2. Clarification nécessaire sur l'état réel d'Univers v1 (roadmap vs code en décalage — impacte le message de lancement si la feature est en fait prête)
3. 2 violations em-dash en texte UI (triviales mais visibles dès le premier usage)

**Aucun bloquant technique critique identifié** (sécurité RLS solide, pas de secret exposé, TypeScript propre).

**Checklist de lancement priorisée** :

1. **P0 — Trancher Univers v1** : confirmer avec Louis si la feature est livrable, puis aligner roadmap et communication
2. **P0 — Nettoyer `allowLongMemory`** (retirer ou implémenter)
3. **P1 — Fixer les 2 em-dash UI**
4. **P1 — Exécuter la suite de tests Vitest en environnement réel** (non vérifiable dans le sandbox d'audit) pour confirmer 0 régression avant annonce publique
5. **P1 — Décider explicitement du statut responsive** (desktop-only assumé ou dette à traiter) et le documenter
6. **P2 — Découper `ChapterDetail.tsx`** si bande passante disponible (hors zone protégée, organisation uniquement)

---

## 7. 📣 Plan marketing

| Action | Priorité | Effort |
|---|---|---|
| Créer le compte Instagram DreamWeave | Haute | Rapide |
| Publier une vidéo teaser du concept (Sheet System + cohérence de personnage, argument différenciant validé par le sentiment Reddit) | Haute | Moyen |
| Rédiger une landing page orientée acquisition mettant en avant la simplicité du modèle de crédits (1 crédit = 1 génération) vs grilles concurrentes complexes | Haute | Moyen |
| Lancer une liste d'attente avec incitation crédits gratuits (ex : +10 crédits Libre pour les 100 premiers inscrits) | Haute | Rapide |
| Préparer un post de lancement Product Hunt (créneau porteur : "année de l'AI comic generator" selon la couverture 2026) | Moyenne | Long |
| Publier un comparatif transparent DreamWeave vs concurrents (crédits, tiers, positionnement "tout gratuit") | Moyenne | Moyen |
| Communiquer sur une politique de disclosure IA (transparence) pour se différencier du sentiment anti-IA-non-déclarée observé sur Reddit | Moyenne | Rapide |
| Explorer une présence Discord communautaire (webtoon/manga creators) | Basse | Long |
| Solliciter une couverture presse spécialisée (comparer avec Dashtoon/Comicpad, qui bénéficient de couverture éditoriale) | Basse | Long |

---

## TL;DR

- **Codebase saine (~7.6/10 pondéré)** : sécurité RLS solide, TypeScript propre, dette concentrée et identifiable plutôt que diffuse. Deux fichiers monolithes (`ChapterDetail.tsx` 3174 lignes) à surveiller.
- **Décalage roadmap vs code à clarifier en priorité avec Louis** : Univers v1, marqué "à faire" dans la roadmap, semble en réalité largement implémenté (`LoreGraphView.tsx`, `useArianeLoreProposals.ts`, etc.) — c'est potentiellement le finding le plus important de cet audit.
- **Nettoyage rapide à faire** : champ `allowLongMemory` zombie dans `TierLimits`, et 2 violations em-dash en texte UI (`ProjectDetail.tsx:429` et `:652`).
- **Positionnement crédit lisible = avantage concurrentiel sous-exploité** : le modèle "1 crédit = 1 génération" de DreamWeave est plus simple que la plupart des grilles concurrentes (Anifusion : 5-100 crédits/génération) — à mettre en avant dans le marketing.
- **Marché en tension IA/anti-IA** : WEBTOON investit dans l'IA générative narrative (byUs) tout en interdisant l'IA générative dans ses propres concours — DreamWeave, en tant qu'outil de création (pas plateforme de distribution), est peu exposé à ce clivage mais devrait envisager une posture de transparence sur l'usage de l'IA.
