# Propositions produit — DreamWeave (27 juin 2026)

> Filtre ADN appliqué à chaque proposition : **« Tu n'es pas scénariste ni dessinateur ? Crée quand même ton webtoon — cohérent, vite, sans compétence. »**
> Issu d'une analyse multi-agents du code et du parcours réels. Personas : Théo (17 ans, gratuit, churn élevé), Luna (autrice Wattpad), Marc (créateur pressé), Élodie (studio).

---

## 🎯 Constat central
Le produit est **techniquement complet** mais deux choses manquent au cœur de la promesse :
1. **L'activation** : le 1er résultat visuel arrive trop tard après l'inscription, et plusieurs étapes exigent encore une *compétence* (écrire un bon prompt, poser des bulles à la main).
2. **La viralité** : DreamWeave produit des œuvres très visuelles mais n'a **aucune surface de partage** — chaque webtoon meurt dans le dossier Téléchargements. Le produit *est* la pub, et on ne l'exploite pas.

---

## P0 — Les leviers décisifs

### 1. Auto-poser les bulles de dialogue à la composition Auto
**Problème (vérifié) :** `compose-chapter-layout/index.ts:615` renvoie `speechBubbles: []` alors que le dialogue est **déjà stocké par bloc** (`dialogue_text`). L'utilisateur doit recréer et positionner chaque bulle à la main — le geste le plus « dessinateur » de tout l'outil, imposé case par case.
**Proposition :** à la compose, créer une bulle `speech` pré-remplie depuis `dialogue_text` (position/dimensions par défaut), que l'utilisateur n'a plus qu'à ajuster.
**Vision :** un webtoon **lisible** (images + texte) en un clic, pas un assemblage d'images muettes.
⚠️ **Zone canvas protégée** (BubbleLayer) → ton accord requis. Impact = ajout d'objets dans `speech_bubbles` au moment du compose, **sans** toucher l'édition manuelle.

### 2. Aide IA à la description d'asset (prompt assisté)
**Problème :** créer un asset **exige** un prompt texte libre (`AssetLibrary.tsx`, placeholder « Décrivez l'asset… »). Écrire un bon prompt FLUX *est* une compétence. Théo tape « un garçon cool », obtient un résultat médiocre, brûle 1 crédit (sur 20).
**Proposition :** (a) champs guidés optionnels (âge/genre, coiffure, tenue, expression) fusionnés en prompt ; (b) bouton **« Aide-moi à décrire »** qui appelle l'IA scénario (déjà branchée) pour pré-remplir un prompt riche, éditable, **sans consommer de crédit image**.
**Vision :** abolit la 2ᵉ barrière — l'utilisateur n'a pas à parler « langage IA ».

### 3. Démarrage express : 1er webtoon en < 5 min
**Problème :** `Dashboard.tsx` exige titre + genre + synopsis **avant** tout résultat. L'aha-moment (voir un perso généré) est loin du signup. Aucun projet exemple.
**Proposition :** parcours « Essayer en 2 min » — une phrase d'idée → style suggéré + chapitre 1 (IA) + assets pré-décrits + compose + bulles auto → l'utilisateur **arrive sur un chapitre jouable**. Ou, moins coûteux : un projet exemple clonable. Rendre synopsis/genre optionnels au départ.
**Vision :** l'outil produit un premier résultat **avant** d'exiger des compétences. Levier d'activation n°1 (Théo).

### 4. Page publique « œuvre partageable » (lien web)
**Problème :** l'export ne produit qu'un **ZIP de PNG** local. Zéro lien, zéro page hébergée → zéro viralité. Théo veut « partager sur Discord » ; il ne peut envoyer qu'un zip.
**Proposition :** export **« Publier en ligne »** → route `/w/:slug` en lecture seule (scroll vertical webtoon, mobile-first, carte Open Graph), bouton « Copier le lien » / `navigator.share`, watermark discret « Créé avec DreamWeave » + CTA inscription. Chaque œuvre partagée = une pub.
**Vision :** « créer un webtoon » n'a de sens que s'il peut être **lu**. C'est le maillon manquant entre « créer » et « être lu ».
⚠️ Impact schéma/RLS (table de partage opt-in, jamais de service_role exposé) → à cadrer.

### 5. Vitrine de vrais webtoons sur la landing
**Problème :** `Landing.tsx` ne montre **aucun** webtoon généré (icônes + bulle Ariane factice). La promesse « visuels superbes en secondes » sans preuve.
**Proposition :** section « Fait avec DreamWeave » : 4-6 cases réelles (perso Sheet System, décor, case composée avec bulle) + un avant/après « synopsis tapé → case obtenue ». Idéalement alimentée par les œuvres publiées (proposition 4).
**Vision :** la preuve visuelle **est** l'argument de vente vs Dashtoon (« cohérence limitée »).

---

## P1 — Renforcer l'activation et la croissance

| # | Proposition | Problème | Vision/persona |
|---|---|---|---|
| 6 | **Pré-remplir le prompt d'asset depuis le scénario** | À la création d'asset depuis le récit, seuls nom+type passent, prompt vide — alors que le scénario décrit déjà le perso | Luna (roman déjà écrit) ; supprime une re-saisie |
| 7 | **Assouplir le verrou de validation chapitre** | `canValidate` bloque tant que TOUS les assets détectés (faux positifs inclus) n'ont pas d'image → mur de 9 crédits pour un Libre/20 | Théo/Luna : ne plus être bloqués au milieu du 1er chapitre |
| 8 | **Onboarding « premier webtoon » guidé** | Les tours Ariane expliquent, mais ne *font* rien à la place de l'utilisateur | Théo (activation concrète) |
| 9 | **Crédits bonus aux jalons** (onboarding fini, 1er chapitre publié) | Un chapitre peut vider les 20 crédits avant l'aha-moment ; `QuotaReachedDialog` = upsell sec | Garantit que tout Libre atteigne « 1er webtoon abouti » (rétention J30) |
| 10 | **Parrainage** (crédits contre invitation) | Aucune boucle de croissance ; seule issue au quota = payer | Théo (Discord), Luna (Wattpad) → users gratuits deviennent canal d'acquisition |
| 11 | **Mur de quota orienté valeur** | Upsell froid sans projection de bénéfice ni alternative gratuite | Upsell honnête « tu paies plus de volume, pas des features » (logique Spotify) |

---

## P2 — Différenciation et rétention

- **12. Aperçu lecteur scrollable** (mode lecture plein écran avant export) — valider le rendu final « comme un vrai webtoon ».
- **13. Bouton « Tout générer » avec garde-fou crédits** — afficher « Générer les N images (N crédits) » + reste de quota après compose ; proposer « les X premières cases » si quota insuffisant.
- **14. Galerie / duplication de styles** — « dupliquer le style d'un projet » à la création + presets prêts à l'emploi → time-to-value des projets 2+, cohérence en série (Luna/Marc).
- **15. Mettre en avant le pipeline scénario→cases** sur la landing/onboarding (mini-démo « synopsis → cases ») — c'est ce que ni Dashtoon ni Midjourney ne font ; NarraMind = « le seul outil qui garde ton récit cohérent ».
- **16. Aligner `wiki/Business-Model.md` sur TIER_CONFIG** (doc) — le wiki décrit encore des gates de features abandonnés ; risque de décisions marketing fausses.

---

## Synthèse stratégique
Deux chantiers transforment le produit :
- **Activation** (1 + 2 + 3) : amener Théo de l'inscription à un webtoon jouable en minutes, sans compétence.
- **Viralité** (4 + 5 + 10) : faire de chaque œuvre créée un canal d'acquisition gratuit — indispensable vu la stratégie « tout gratuit, sans budget marketing ».

> 📝 **Impact Mémoire** : la viralité (partage d'œuvre) et l'activation (démarrage express) sont des leviers de **modèle économique / go-to-market** ; à intégrer dans la section stratégie du mémoire si retenus.
