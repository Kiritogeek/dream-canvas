# Audit quotidien DreamWeave — 25 juillet 2026

---

## 1. 🔍 Benchmark & Competitive Intelligence

*Sources filtrées : uniquement datées de juillet 2026.*

- **WEBTOON lance "byUs", un service de chat narratif IA basé sur des IP créateurs approuvées** — les lecteurs peuvent co-créer des histoires en interagissant avec des personnages issus de webtoons existants (licences validées par les créateurs). Signal fort : Naver/WEBTOON investit dans l'IA générative *narrative*, pas seulement visuelle, et le fait avec l'accord des créateurs (évite la controverse "IA qui pille"). Positionnement différent de DreamWeave (outil de création vs. expérience de lecture/fandom), mais montre l'appétit du leader du marché pour l'IA conversationnelle autour de l'IP.
  Source : [Anime News Network, 11/07/2026](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448)

- **Comparatif "10 Tools Tested" (COMICPAD)** classe Dashtoon en tête (8.6/10, forte consistance de personnage + pipeline de publication intégré) et COMICPAD lui-même en 2e position (8.5/10, chemin le plus rapide idée → BD finie sur les plans payants). Ces deux outils sont les références directes à surveiller sur la consistance de personnage et la vitesse de production — deux axes où DreamWeave (Sheet System, FLUX.2 Pro) doit rester compétitif.
  Source : [COMICPAD, juillet 2026](https://www.comicpad.app/best-ai-comic-generators)

- **Le marché de la génération d'image se spécialise par usage** : GPT Image 2 domine les classements de rendu de texte et d'adhérence au prompt, Nano Banana Pro (Gemini 3 Pro) se positionne comme "moteur de raisonnement" capable d'encoder l'identité d'un personnage pour la consistance multi-panels, FLUX.2 reste la référence open-weight/entreprise avec le meilleur rapport qualité-prix API (≈0,015 $/image). DreamWeave utilise FLUX.2 Pro pour tous les tiers — choix toujours pertinent côté coût, mais Nano Banana Pro devient une alternative crédible spécifiquement sur la consistance de personnage (cœur de valeur de DreamWeave via le Sheet System).
  Sources : [BuildMVPFast, juillet 2026](https://www.buildmvpfast.com/articles/best-llms-2026-guide/image-generation-ai) · [SolidAITech, 07/2026](https://www.solidaitech.com/2026/07/nano-banana-ai-google-guide.html) · [Thunder Compute, juillet 2026](https://www.thundercompute.com/blog/flux-comfyui-ai-image-generation)

- **Sentiment communautaire (Reddit, discussion WEBTOON Canvas)** : les créateurs critiquent encore les BD générées par IA pour leur "mauvaise continuité", des "visages statiques", des "expressions faciales erronées" et un lettrage faible. Confirme que la consistance de personnage et la qualité du texte dans l'image restent les points de douleur perçus par la communauté — exactement les axes sur lesquels Dashtoon et Nano Banana Pro communiquent le plus, et où le Sheet System de DreamWeave a un argument à faire valoir s'il est bien mis en avant.
  Source : cité par [AI Tribune, analyse de discussions Reddit, 2026](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/) *(discussion source antérieure à 30 jours — mentionnée ici uniquement comme contexte de sentiment persistant, non comptée comme finding daté)*

**Limite de cette section** : peu d'annonces strictement datées de juillet 2026 au-delà du lancement WEBTOON byUs et des comparatifs d'outils republiés mensuellement (COMICPAD, BuildMVPFast, SolidAITech). Aucune annonce de nouveau concurrent direct sur le segment précis "création de webtoon avec assets cohérents + scénario IA + éditeur de cases" n'a été trouvée ce mois-ci — le positionnement de DreamWeave reste non répliqué à l'identique.

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification |
|---|---|---|
| Qualité du code | 7/10 | `npx tsc --noEmit` passe sans erreur. Quasi aucun `any` réel dans `src/` ou `supabase/functions/`. Zéro TODO/FIXME dans le code. 25 fichiers de tests Vitest couvrant des points sensibles (sanitation HTML des bulles, undo canvas, sync config tier). Point faible : `zod` est déclaré en dépendance et documenté dans CLAUDE.md mais **aucun import réel** — validation de formulaires probablement faite à la main, en écart avec la doc. |
| Architecture globale | 6/10 | Séparation `services/ → hooks/ → components/ → pages/` respectée. Mais `ChapterDetail.tsx` fait **3174 lignes** (2,5x le second plus gros fichier) — god component qui centralise drag & drop, blocs, bulles, undo, zoom, export. Documentation désynchronisée : CLAUDE.md et `docs/EDGE_FUNCTIONS_INDEX.md` annoncent "14 Edge Functions" alors qu'il y en a **15** réellement déployées (`generate-cover-image` manquante des deux documents). |
| Performance & scalabilité | 5/10 | Aucune virtualisation (`react-window` et équivalents absents) alors que le canvas d'un chapitre peut atteindre 100 000px de haut selon CLAUDE.md — tout le contenu est potentiellement monté en DOM simultanément. Aucun `IntersectionObserver` détecté. Un bon point : la migration `20260627130000_atomic_credit_consumption.sql` corrige une race condition de consommation de crédits via `pg_advisory_xact_lock`. |
| Sécurité | 8/10 | RLS présente sur toutes les tables (aucune `CREATE TABLE` sans policy détectée). Aucune fuite de `service_role` côté client. `refreshSession()` bien appliqué avant chaque Edge Function. Point notable : la migration `20260702120000_profiles_lock_sensitive_columns.sql` corrige une faille P1 réelle (un utilisateur pouvait réinitialiser son quota mensuel en modifiant `billing_period_start` côté client) — preuve d'un audit itératif fonctionnel, mais aussi qu'une vraie faille a existé en prod avant correction. |
| Dette technique | 6/10 | Répertoires `.claude/worktrees/agent-*` non nettoyés (copies complètes du repo laissées par des sessions d'agents). Aucun Error Boundary React dans tout `src/` — un crash de rendu dans `ChapterDetail.tsx` (le composant le plus critique) ferait tomber toute l'app sans fallback. `.claude/skills/taste-skill/SKILL.md`, référencé comme garde-fou obligatoire dans CLAUDE.md, **n'existe pas sur le disque**. |

---

## 3. 📦 Product Audit

- Les features cœur listées dans CLAUDE.md sont toutes réellement codées et cohérentes avec le positionnement : scénario IA (`src/services/scenarioAI.ts`), découpage en cases (`src/services/panels.ts`), composition canvas blocs/bulles (`ChapterDetail.tsx`), Sheet System (`image_url_sheet`, `image_url_profile_left/right`, `image_url_back`), export (`exportPanel.ts`), Univers/NarraMind Compass (`narramind-compass`, `narramind-update`, `project_embeddings`, `compass_proposals`).
- **`allowLongMemory` confirmé mort** : présent dans `src/types/index.ts` et dupliqué dans `supabase/functions/_shared/tierConfig.ts`, mais la seule référence applicative est un test de synchronisation entre les deux copies — aucun composant/hook/service ne le lit pour conditionner un comportement. Conforme à ce que CLAUDE.md annonce (retiré de l'offre commerciale), mais révèle une **config tier dupliquée non-DRY** entre client et edge functions, avec un test dédié rien que pour garder les deux en synchro — risque de drift si un futur avantage de tier est ajouté d'un seul côté.
- **Feature non documentée mais fonctionnelle** : génération de couverture de projet (`generate-cover-image`, `src/services/cover.ts`, `src/pages/CoverEditor.tsx`) — absente de `docs/EDGE_FUNCTIONS_INDEX.md` et du tableau Edge Functions de CLAUDE.md. À réintégrer dans la doc pour refléter le périmètre réel (15, pas 14, fonctions).
- Pas de doublon fonctionnel flagrant entre `AssetLibrary` / `StyleManager` / `ScenarioSection` / `EditionSection` — chacun a un rôle distinct dans le flux Style → Assets → Scénario → Éditeur.
- Cohérence globale positionnement/code : README.md et CLAUDE.md restent alignés sur FLUX.2 Pro tous tiers, Gemini Flash + fallback Groq, pgvector — pas d'incohérence de discours marketing/technique détectée.

---

## 4. 🎨 UX / UI Audit

- `.impeccable.md` existe et détaille précisément les tokens HSL (`--lavender`, `--peach`, `--mint`, `--bg-dark`), les classes custom (`.glass`, `.gradient-primary`, `.text-gradient`) et la typographie (Quicksand/Nunito, confirmée dans `tailwind.config.ts`).
- **Contradiction de gouvernance** : `.claude/skills/taste-skill/SKILL.md`, cité dans CLAUDE.md comme garde-fou anti-slop **obligatoire** avant toute livraison UI, **n'existe pas sur le disque** (`.claude/skills/` est absent). La Pre-Flight Check censée bloquer les mauvaises livraisons UI n'est donc pas exécutable en l'état.
- **Violation de la règle "zéro em-dash"** : 259 occurrences de `—` dans les `.tsx` de `src/` (hors tests). Une partie sert de placeholder neutre ("—" pour absence de donnée), mais du texte visible utilisateur en zone admin contient aussi des em-dash de phrase (`GlobalKPICards.tsx`, `PlanDistributionChart.tsx`) — zone moins exposée aux utilisateurs finaux, mais violation directe de la règle "zéro tolérance".
- **Couleurs hors design system** : 97 occurrences de hex dans les `.tsx`, en grande partie des dégradés SVG illustratifs (icônes Ariane) défendables mais non documentés comme exception dans `.impeccable.md`. Cas plus net : `PlanDistributionChart.tsx` contient un commentaire explicite "violet Studio — pas de token design system pour cette couleur" — écart conscient, pas un oubli.
- Diffusion correcte de l'identité visuelle : 35 fichiers utilisent `.glass`/`glass-card`, la classe signature n'est pas cantonnée à quelques écrans.
- **Friction structurelle** : `ChapterDetail.tsx` (3174 lignes) concentre drag de blocs, bulles, undo, zoom et export dans un seul fichier "freezé" par CLAUDE.md — toute amélioration UX de l'éditeur devient coûteuse à qualifier sans casser l'existant, et tout bug de zoom ou de drag risque de se propager aux autres interactions.
- **Comparaison concurrents** : le sentiment communautaire pointe la "mauvaise continuité" et les "visages statiques" comme frustrations récurrentes sur les outils IA concurrents (cf. section 1) — le Sheet System de DreamWeave (4 angles cohérents) répond directement à ce point de douleur, mais ce n'est pas mis en avant comme argument différenciant dans l'UI actuelle (à vérifier côté onboarding/landing).

---

## 5. 💡 Improvement Suggestions

**🗑️ Removals**
- Retirer ou implémenter réellement `allowLongMemory` dans `TIER_CONFIG` (src/types/index.ts + supabase/functions/_shared/tierConfig.ts) — actuellement mort des deux côtés, maintenu en synchro par un test dédié pour rien.
- Nettoyer les répertoires `.claude/worktrees/agent-*` non utilisés — hygiène de dépôt, aucun impact fonctionnel mais alourdit le repo.
- Supprimer la dépendance `zod` du `package.json` si elle reste non consommée, ou l'adopter réellement pour la validation de formulaires (cohérence avec CLAUDE.md qui l'annonce comme stack officielle).

**⚡ Optimizations**
- Ajouter un Error Boundary React autour de `ChapterDetail.tsx` (le composant le plus critique et le plus complexe) — actuellement un crash de rendu ferait tomber toute l'app sans fallback gracieux.
- Introduire une stratégie de virtualisation/culling sur le canvas de `ChapterDetail.tsx` avant qu'un chapitre n'atteigne une hauteur significative (CLAUDE.md mentionne jusqu'à 100 000px) — risque de lag réel sans changement de comportement visible pour l'utilisateur, donc alignable avec le mantra perf actuel.
- Recréer `.claude/skills/taste-skill/SKILL.md` (référencé mais absent) pour que la Pre-Flight Check anti-slop devienne réellement exécutable, ou retirer la référence de CLAUDE.md si le processus a changé.
- Corriger les 259 occurrences d'em-dash dans les zones admin (`GlobalKPICards.tsx`, `PlanDistributionChart.tsx`) pour respecter la règle "zéro tolérance" du design system, au moins sur le texte visible utilisateur (les "—" placeholders de donnée manquante peuvent rester).
- Mettre à jour `CLAUDE.md` et `docs/EDGE_FUNCTIONS_INDEX.md` pour refléter les 15 Edge Functions réelles (ajout de `generate-cover-image`).

**➕ Additions**
- Mettre en avant le Sheet System (consistance 4 angles) comme argument différenciant explicite dans l'onboarding/landing, en réponse directe à la frustration "mauvaise continuité / visages statiques" identifiée dans le sentiment communautaire concurrent (source Reddit/AI Tribune, section 1).
- Évaluer Nano Banana Pro (Gemini 3 Pro) comme option de génération alternative ou complémentaire à FLUX.2 Pro, spécifiquement sur les cas de consistance de personnage multi-panels — c'est l'axe où ce modèle communique le plus fort en juillet 2026 (source BuildMVPFast/SolidAITech).
- Envisager un mode "chat avec personnage" léger (inspiré de byUs de WEBTOON) comme feature d'engagement post-création, si aligné avec la vision produit — à challenger avec Louis avant tout développement, car ça sort du périmètre actuel outil de création → devient aussi expérience de lecture.

---

## 6. 🚀 Launch Status

**Contexte** : projet fonctionnel en local et déployable sur Vercel (`vercel.json` présent), CI configurée (`.github/workflows/ci.yml`), `.env.example` présent — base de déploiement en place, pas encore annoncé publiquement.

**Blockers identifiés avant lancement public :**
1. **Absence d'Error Boundary** sur le composant le plus critique (`ChapterDetail.tsx`) — un crash isolé ferait tomber toute l'app pour l'utilisateur en pleine session d'édition. Bloquant pour un lancement public à trafic imprévisible.
2. **Pas de virtualisation du canvas** — risque de lag/crash navigateur sur les chapitres longs, alors que c'est justement le cas d'usage "power user" qui arrivera après le lancement.
3. **Documentation produit désynchronisée du code** (14 vs 15 Edge Functions, `generate-cover-image` non documentée) — à corriger avant d'onboarder du support ou des partenaires externes qui liraient cette doc.
4. **Gouvernance UI non exécutable** (`taste-skill/SKILL.md` absent) — le processus qualité censé garantir l'absence d'"AI tells" avant chaque livraison n'est pas en place, risque de dérive visuelle continue si le rythme de livraison s'accélère post-lancement.

**Checklist priorisée :**
1. (P0) Error Boundary sur `ChapterDetail.tsx` et idéalement au niveau racine de l'app
2. (P0) Vérifier/renforcer la consommation atomique des crédits en charge concurrente (la migration du 27/06 est un bon signal, à confirmer sous test de charge)
3. (P1) Virtualisation ou culling du canvas long
4. (P1) Resynchroniser CLAUDE.md / docs/EDGE_FUNCTIONS_INDEX.md avec le code réel
5. (P2) Recréer ou retirer la référence à `taste-skill/SKILL.md`
6. (P2) Nettoyer `.claude/worktrees/`, dépendance `zod` non utilisée

---

## 7. 📣 Marketing Plan

| Tâche | Priorité | Effort |
|---|---|---|
| Créer le compte Instagram/TikTok DreamWeave et publier un premier post de teasing (visuel généré via le Sheet System, argument "consistance de personnage") | Haute | Rapide |
| Publier une vidéo-teaser courte montrant le parcours Style → Assets → Scénario → Éditeur en accéléré | Haute | Moyen |
| Écrire une landing page orientée acquisition mettant en avant le Sheet System comme réponse directe aux frustrations "continuité/visages statiques" citées par la communauté webtoon IA | Haute | Moyen |
| Lancer une liste d'attente (waitlist) avant l'annonce publique complète, avec un lot de crédits offerts aux premiers inscrits | Moyenne | Rapide |
| Poster un comparatif honnête DreamWeave vs Dashtoon/COMICPAD sur un forum créateur (Reddit r/webtoons ou équivalent) en insistant sur le tarif (Libre gratuit, 20 crédits) | Moyenne | Rapide |
| Solliciter 3-5 créateurs webtoon amateurs pour un test utilisateur + témoignage avant lancement public | Moyenne | Moyen |
| Préparer un post de lancement Product Hunt avec captures d'écran du Sheet System et de l'éditeur de cases | Basse | Moyen |
| Rédiger une FAQ publique sur le modèle de crédits (Libre/Créateur/Studio) pour anticiper les questions de pricing | Basse | Rapide |

---

## TL;DR

- **Sécurité solide** (8/10) avec preuve d'un audit itératif réel (faille de quota corrigée le 02/07), mais **absence d'Error Boundary** sur le composant le plus critique (`ChapterDetail.tsx`, 3174 lignes) — c'est le blocker P0 avant tout lancement public.
- **Documentation désynchronisée du code réel** : 15 Edge Functions déployées vs "14" annoncées dans CLAUDE.md et docs/EDGE_FUNCTIONS_INDEX.md (`generate-cover-image` manquante) ; `.claude/skills/taste-skill/SKILL.md`, référencé comme garde-fou UI obligatoire, n'existe pas sur le disque.
- **Performance à risque sur les chapitres longs** : aucune virtualisation du canvas malgré une hauteur pouvant atteindre 100 000px — à traiter avant que des power users ne créent des chapitres massifs post-lancement.
- **`allowLongMemory` confirmé mort** dans le code (conforme à la décision produit du 27/06), mais maintenu en double config (client + edge functions) uniquement pour un test de synchro — à retirer proprement.
- **Opportunité marketing claire** : le sentiment communautaire de juillet 2026 pointe la mauvaise continuité de personnage comme frustration n°1 des outils IA concurrents — le Sheet System de DreamWeave y répond directement mais n'est pas mis en avant comme argument de vente dans l'UI/landing actuelle.
