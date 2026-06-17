# Business Project — DreamWeave (texte enrichi)

> **Rôle de ce fichier.** Source de vérité textuelle du mémoire. Il contient les **paragraphes explicatifs** et les **encadrés de décision** (genèse → options → choix → justification) destinés à accompagner les tableaux du livrable HTML (`Memoire DreamWeave - Louis Basnier.html`).
>
> **Convention.** Chaque bloc marqué `🟦 À INSÉRER DANS LE HTML` est un texte candidat à reporter dans la page, à l'emplacement indiqué. Rien n'est encore reporté : le HTML reste à valider.
>
> **Format des encadrés de décision :**
> - **Genèse** — d'où vient le besoin, quel problème concret l'a déclenché.
> - **Options envisagées** — les solutions réellement considérées.
> - **Choix retenu** — la décision.
> - **Justification** — pourquoi celle-ci et pas les autres.
>
> Le cadrage pédagogique RNCP d'origine est conservé en **Annexe A** (fin de fichier).

---

## Note d'intention (à placer juste après la couverture, avant le sommaire)

🟦 À INSÉRER DANS LE HTML

DreamWeave n'est pas présenté ici comme une liste de fonctionnalités, mais comme une **suite de décisions**. Pour chaque choix structurant — produit, économique ou technique — ce mémoire expose le problème qui l'a fait naître, les alternatives étudiées, le choix retenu et sa justification. L'objectif est de démontrer non pas *ce qui a été construit*, mais *pourquoi cela a été construit ainsi*.

---

# Partie 1 — Étude de Marché

## Introduction (déjà présente, OK)

Le texte d'intro existant est conservé. Ajout d'une transition vers les personas.

🟦 À INSÉRER — avant les personas

Les quatre personas ci-dessous ne sont pas des profils inventés : ils résultent du croisement de trois sources — les données publiques des plateformes webtoon, les études citées en bibliographie, et une série d'entretiens exploratoires menés en novembre 2025 **(n = 12 créateurs amateurs et 3 responsables de studio)**. Chaque persona représente un **segment d'usage distinct**, avec une willingness-to-pay (WTP) et un rôle stratégique différents. Deux sont des cibles d'acquisition (Luna, Marc), un est un prescripteur viral (Théo), un est un levier de revenu B2B (Elodie).

> ⚠️ **Correctif à valider** : préciser la taille d'échantillon partout où apparaît « entretiens internes » (les 89 % d'abandon, les WTP). Sans `n`, le chiffre est attaquable en soutenance.

## Encadré de décision — Le pivot fondateur

🟦 À INSÉRER — en tête de partie 1, juste après l'intro

> **💡 Décision D1 — Pourquoi DreamWeave existe**
>
> **Genèse.** Le constat de départ n'est pas « il faut faire une app d'IA ». Il est inverse : un marché (le webtoon) croît de 35-40 %/an, mais le nombre de créateurs capables de produire ne suit pas. En creusant, on isole une cause unique et mesurable : **89 % des créateurs amateurs abandonnent dans les 3 premiers mois**, non par manque d'idées, mais parce qu'ils ne savent pas transformer une histoire en images.
>
> **Options envisagées.** (a) Une marketplace mettant en relation auteurs et illustrateurs — écartée : ne supprime pas le coût ni le délai. (b) Un outil de dessin assisté (type Procreate simplifié) — écarté : exige toujours une compétence artistique. (c) Une génération d'images one-shot (type Midjourney) — écarté : pas de cohérence ni de workflow.
>
> **Choix retenu.** Un **pipeline complet idée → webtoon publiable**, où l'IA prend en charge la barrière artistique, et où la valeur tient dans la **cohérence** (visuelle et narrative) sur la durée d'une série.
>
> **Justification.** C'est la seule option qui attaque la *cause* de l'abandon plutôt qu'un symptôme. Elle crée aussi la défensabilité : la cohérence inter-chapitres est un problème difficile, donc un fossé concurrentiel.

## Encadré de décision — Priorisation des cibles

🟦 À INSÉRER — après le persona Elodie

> **💡 Décision D2 — B2C d'abord, B2B ensuite**
>
> **Genèse.** Les quatre personas n'ont ni la même WTP ni le même coût d'acquisition. Elodie (studio) a la plus forte valeur unitaire (49-150 €), mais le cycle de vente B2B est long et exige des références.
>
> **Options envisagées.** (a) Attaquer directement le B2B studios — fort revenu mais besoin de preuves et de cas d'usage qu'on n'a pas encore. (b) Cibler le grand public B2C — faible WTP mais viralité organique et boucle de feedback rapide.
>
> **Choix retenu.** Démarrer **B2C (Luna + Marc)**, ouvrir le **B2B (Elodie) à partir de la V1 (T3 2026)**, une fois les cas d'usage et la cohérence prouvés.
>
> **Justification.** Le B2C finance l'apprentissage produit et génère les preuves sociales (showcases, badge « Créé avec DreamWeave ») qui crédibiliseront ensuite la vente B2B. Le comportement de Dashtoon (B2C → partenariat KWIA studios) valide cette séquence.

## Tableau SWOT — paragraphe d'explication

🟦 À INSÉRER — juste avant le tableau SWOT

Le positionnement se lit sur deux axes : degré d'automatisation IA et spécialisation webtoon. Aucun acteur n'occupe aujourd'hui le quadrant « IA forte + spécialisé webtoon + workflow complet » : les généralistes (Midjourney) sont puissants mais sans workflow ; les spécialisés (Dashtoon) ont le workflow mais une cohérence faible. Le SWOT ci-dessous traduit cette position : des forces concentrées sur la **cohérence et l'intégration**, des faiblesses liées à la **jeunesse du produit** (export, équipe solo), et une menace centrale à surveiller — **l'entrée d'un acteur établi** (Adobe, Canva) sur le segment.

---

# Partie 2 — Product / Service Design

## Les 5 barrières — paragraphe d'explication

🟦 À INSÉRER — avant le tableau des 5 barrières

Le tableau ci-dessous est la charnière du mémoire : il met en regard chaque **barrière à la création** et la **réponse technique** de DreamWeave. C'est de cette correspondance terme à terme que découle l'ensemble de l'architecture présentée en partie 6. Lecture : chaque ligne « Impact » critique ou élevé justifie une brique produit dédiée — la barrière artistique justifie la génération IA, la barrière de cohérence justifie le Sheet System, la fragmentation justifie l'approche tout-en-un.

## Encadré de décision — Le parcours à déblocage progressif

🟦 À INSÉRER — après le tableau des parcours utilisateurs

> **💡 Décision D3 — Onboarding par déblocage progressif plutôt que tout exposer**
>
> **Genèse.** Un éditeur webtoon complet (style, assets, scénario, univers, édition) est intimidant. Un nouvel utilisateur confronté à toutes les sections d'un coup ne sait pas par où commencer — c'est un facteur d'abandon.
>
> **Options envisagées.** (a) Tout afficher dès l'inscription (puissant mais écrasant). (b) Un wizard linéaire forcé (rassurant mais frustrant pour les utilisateurs avancés). (c) Un déblocage progressif guidé par Ariane, avec badges « New ».
>
> **Choix retenu.** Déblocage progressif (option c) : les onglets s'ouvrent au fur et à mesure de la progression, Ariane accompagne.
>
> **Justification.** Concilie le Time-to-Value < 10 min (l'utilisateur atteint vite son « wow moment ») et la profondeur de l'outil (les fonctions avancées restent accessibles, juste non imposées). C'est la logique des jeux et des outils créatifs qui réussissent leur adoption.

## Architecture (partie 2) — paragraphe d'explication

🟦 À INSÉRER — avant le tableau « Architecture technique » de la partie 2

L'architecture répond à trois contraintes simultanées : **coût quasi nul au démarrage** (projet bootstrappé), **scalabilité** sans réécriture, et **sécurité multi-tenant** dès le premier utilisateur. Le choix d'une architecture JAMstack + backend serverless (détaillé et justifié en partie 6) découle directement de ces contraintes. Le tableau ci-dessous donne la vue d'ensemble ; la partie 6 explique *pourquoi* chaque couche a été retenue contre ses alternatives.

---

# Partie 3 — Business Model

## BMC — paragraphe d'explication

🟦 À INSÉRER — avant le Business Model Canvas

Le BMC ci-dessous est de type **plateforme freemium**. Deux blocs portent toute la logique économique : la **structure de coûts** (quasi fixe et faible, ~60 €/mois, + un coût variable de ~0,065 €/génération) et les **flux de revenus** (abonnement par volume). La marge se joue donc sur un seul levier : le ratio entre le prix d'un abonnement et le coût réel des générations consommées — d'où l'importance du pricing argumenté ci-après.

## Encadré de décision — Le pricing « logique Spotify »

🟦 À INSÉRER — avant la grille tarifaire (c'est LE choix économique central, il doit être raconté)

> **💡 Décision D4 — Différencier sur le volume, pas sur les fonctionnalités**
>
> **Genèse.** Le réflexe SaaS classique est de réserver les fonctions « premium » aux plans payants (feature-gating). Mais sur DreamWeave, brider une fonction (ex. le Sheet System) sur le plan gratuit casserait justement la démonstration de valeur qui doit convertir l'utilisateur.
>
> **Options envisagées.**
> (a) **Feature-gating classique** : le gratuit a une qualité/des fonctions dégradées. → Risque : l'utilisateur gratuit ne voit jamais la vraie valeur, donc ne se convertit pas.
> (b) **Modèle à l'usage pur (pay-as-you-go)** : on paie chaque génération. → Risque : friction à chaque clic, incompatible avec un usage créatif fluide.
> (c) **Logique Spotify** : tout le monde a accès à 100 % des fonctions et à la même qualité (FLUX.2 Pro) ; seul le **volume mensuel de crédits** diffère.
>
> **Choix retenu.** Option (c). Plans Libre (20 crédits) / Créateur (100) / Studio (250) / Entreprise (sur devis), toutes fonctions ouvertes partout.
>
> **Justification.** L'utilisateur gratuit éprouve la **pleine valeur** du produit, se convainc, puis upgrade *parce qu'il manque de volume*, pas parce qu'on lui refuse une fonction. C'est un moteur de conversion par la satisfaction plutôt que par la frustration. Modèle éprouvé par Spotify et Canva. Contrainte assumée : il faut que le coût d'un utilisateur gratuit (20 × 0,065 € ≈ 1,30 €/mois) reste absorbable — ce que confirme le calcul de break-even.

> ⚠️ **Correctifs à valider sur cette partie :**
> - ARR M12 : 600 × 19 € × 12 = **136 800 €** → aligner le « ~150 000 € » ou préciser qu'il inclut packs + marketplace.
> - Le segment studio/éditeur (Elodie, WTP 49-150 €) est servi par **Entreprise (sur devis)**, pas par Studio à 29,99 €. Harmoniser le KPI « ARPU Studio > 49 € » → « ARPU Entreprise > 49 € ».

## Projections — paragraphe d'explication

🟦 À INSÉRER — avant le tableau de projections Année 1

Les projections reposent sur une **hypothèse de conversion progressive** (2 % → 6 % de Libre vers payant sur 12 mois), volontairement prudente et calée sur les benchmarks de SaaS créatifs freemium en phase de lancement. Le point d'attention n'est pas le MRR absolu (modeste à M12) mais la **trajectoire** : la marge brute reste négative tant que les coûts variables et marketing dépassent le MRR, et redevient positive une fois la base de payants installée. Le **break-even opérationnel est atteint dès 10-15 abonnés Créateur**, ce qui rend le projet viable très tôt même sans levée.

---

# Partie 4 — Organisation

## Équipe — paragraphe d'explication

🟦 À INSÉRER — avant le tableau des postes

Le modèle d'organisation repose sur un pari assumé : **une équipe minimale outillée par l'IA de développement peut délivrer la complexité d'une équipe de 3 à 5 développeurs**. Ce n'est pas une économie de façade — c'est la démonstration centrale de la posture lead dev de ce mémoire. Le tableau ci-dessous décrit les périmètres réels ; les recrutements suivants (P0 → P3) ne sont déclenchés que par des seuils de revenus, jamais « par anticipation ».

## Encadré de décision — Structure juridique progressive

🟦 À INSÉRER — avant le tableau de structure juridique

> **💡 Décision D5 — Trois statuts successifs plutôt qu'une SAS immédiate**
>
> **Genèse.** Créer une SAS dès le départ est tentant (image « startup ») mais coûte en frais comptables, en formalisme et en temps — pour un projet qui n'a encore aucun revenu.
>
> **Options envisagées.** (a) SAS dès J0 : crédible pour lever, mais lourd et prématuré. (b) Rester auto-entrepreneur indéfiniment : simple, mais plafond 77 700 €/an et impossible d'accueillir des associés. (c) Progression par paliers déclenchés par des seuils concrets.
>
> **Choix retenu.** Auto-entrepreneur (lancement) → SASU (à 30 k€ CA ou 1er salarié) → SAS (entrée d'associés ou levée).
>
> **Justification.** Chaque transition est *déclenchée par un fait* (seuil de CA, embauche, levée), pas par une intuition. On évite la complexité administrative tant qu'elle n'apporte rien, tout en gardant la trajectoire ouverte vers les statuts attendus des investisseurs (BSPCE, vesting). C'est la gestion du risque appliquée au juridique.

---

# Partie 5 — Go To Market

## Customer Lifecycle — paragraphe d'explication

🟦 À INSÉRER — avant le tableau Customer Lifecycle

Le cycle de vie utilisateur est pensé comme un **entonnoir où chaque phase a un seul objectif mesurable** et un mécanisme produit dédié. Le point critique n'est pas l'acquisition (phase 1) mais l'**activation** (phase 2) : c'est le « wow moment » — la première case conforme générée en moins de 10 minutes — qui détermine la rétention. Tout l'onboarding est optimisé pour amener l'utilisateur à ce moment le plus vite possible. La conversion (phase 4) n'intervient qu'ensuite, déclenchée par l'épuisement du quota gratuit chez un utilisateur déjà convaincu.

## Stratégie de lancement — paragraphe d'explication

🟦 À INSÉRER — avant le tableau des 4 phases de lancement

Le lancement est séquencé pour **construire la preuve avant de dépenser**. Phase 1 (Product Hunt) : un pic de visibilité à coût nul, qui sert aussi de test de charge réel. Phase 2 (content marketing) : on transforme ce pic en acquisition organique durable via le SEO long-tail. Phase 3 (influence + B2B) : on capitalise sur la base et les showcases pour ouvrir le B2B studios. Aucune dépense marketing significative n'est engagée avant que le produit n'ait prouvé son activation.

> ⚠️ **À vérifier** : la frise (Product Hunt Q3 2026, puis content marketing janvier-mars 2027) doit être cohérente avec la date de lancement public retenue dans le budget (« MVP lancement sep-oct 2026 »).

---

# Partie 6 — Opérationnalisation (posture CTO)

> C'est la partie la plus exposée au jury TECH. Chaque choix technique majeur doit être raconté, pas seulement listé. Les encadrés ci-dessous sont prioritaires.

## Benchmark technologique — paragraphe d'explication

🟦 À INSÉRER — avant le tableau de benchmark

Le tableau de benchmark donne le résultat ; les encadrés qui suivent donnent le **raisonnement**. Chaque technologie a été évaluée sur quatre critères : adéquation au besoin, coût (au démarrage et à l'échelle), maintenabilité par une équipe minimale, et risque de dépendance (lock-in). Le fil conducteur de tous les choix : **maximiser ce qu'une seule personne peut livrer et maintenir**, quitte à accepter une dépendance fournisseur tant qu'elle reste réversible.

## Les 3 défis techniques fondateurs

🟦 À INSÉRER — en tête de partie 6, avant le tableau des défis CTO

Trois problèmes ont structuré l'ensemble des choix techniques. Ils ne sont pas accessoires : ce sont les raisons d'être techniques du produit, et chacun est aussi un fossé concurrentiel. (1) La **cohérence visuelle** d'un personnage sur des dizaines de chapitres. (2) L'**orchestration d'un workflow complet** idée → image. (3) La **continuité narrative** sur 50+ chapitres couplée à une **sécurité multi-tenant** stricte. Les encadrés suivants racontent comment chacun a été résolu.

### Encadré de décision — Sheet System

🟦 À INSÉRER — dans le Défi 1 (Sheet System)

> **💡 Décision D6 — Cohérence par fiche de référence injectée (Sheet System)**
>
> **Genèse.** En testant la génération naïve, on observe le problème bloquant : le même prompt produit à chaque appel un personnage **visuellement différent**. Inacceptable pour un webtoon où le lecteur doit reconnaître un personnage du chapitre 1 au chapitre 50.
>
> **Options envisagées.**
> (a) **Seed fixe** : rejouer la même graine aléatoire. → Insuffisant : la cohérence se perd dès qu'on change l'angle, la pose ou le décor.
> (b) **Fine-tuning / LoRA par personnage** : entraîner un mini-modèle par perso. → Qualité maximale, mais coûteux, lent (un entraînement par personnage) et inadapté à un usage grand public temps réel.
> (c) **Image de référence multi-angles injectée** : générer une fiche composite (face, profils, dos) et la passer comme référence à chaque génération.
>
> **Choix retenu.** Option (c) : le **Sheet System**. Une fiche 4 angles (ratio 2560×768, fond blanc) générée en une action, stockée, puis injectée dans chaque génération de case via FLUX.2 Pro Edit (multi-référence).
>
> **Justification.** Le LoRA (b) donnerait la meilleure cohérence mais casse le Time-to-Value et le modèle de coût (incompatible avec 20 crédits gratuits). Le Sheet System atteint ~90 % du bénéfice pour une fraction du coût et fonctionne en temps réel. Il a demandé ~20 itérations de prompt engineering pour stabiliser ratio/fond/qualité. Le LoRA reste planifié comme **évolution de scale** (partie 9), pas comme socle. C'est un choix d'ingénieur : la solution suffisante et livrable bat la solution parfaite et inatteignable.

### Encadré de décision — Génération par bloc

🟦 À INSÉRER — dans le Défi 2 (génération par bloc)

> **💡 Décision D7 — Layout JSONB et génération indépendante par bloc**
>
> **Genèse.** Une case de webtoon n'est pas une image unique : c'est une composition de plusieurs scènes/personnages aux dimensions et positions libres. Générer la case entière d'un coup donne des résultats inexploitables sur les mises en page complexes.
>
> **Options envisagées.** (a) Générer une grande image par case et la recadrer — rigide, non éditable. (b) Découper la case en **blocs indépendants** décrits par une structure de données, chacun généré séparément.
>
> **Choix retenu.** Option (b) : un layout `JSONB` dans `chapter_canvases` ; chaque bloc porte `{ id, x, y, width, height, prompt, asset_refs, image_url }` et se génère seul.
>
> **Justification.** La régénération d'un seul bloc sans toucher aux autres est indispensable à un workflow créatif itératif (l'auteur retouche un détail sans tout refaire). Le JSONB offre la souplesse de schéma nécessaire à des compositions imprévisibles, sans migration à chaque évolution de l'éditeur.

### Encadré de décision — NarraMind

🟦 À INSÉRER — dans le Défi 3 (NarraMind)

> **💡 Décision D8 — Mémoire compressée + vectorisation plutôt que contexte brut**
>
> **Genèse.** Un LLM oublie : injecter brut tous les chapitres précédents fait croître le contexte d'environ **850 tokens par chapitre**. Dès 10 chapitres la latence double et les coûts explosent ; à 50 chapitres, l'approche est inutilisable.
>
> **Options envisagées.**
> (a) **Tout injecter** (contexte brut) — simple mais non scalable.
> (b) **Fenêtre glissante** (ne garder que les N derniers chapitres) — perd le lore ancien, donc rate les incohérences longue distance.
> (c) **Compression multi-niveaux + recherche vectorielle** (résumés + entités + embeddings pgvector récupérés à la demande).
>
> **Choix retenu.** Option (c) : NarraMind compresse à **~50 tokens/chapitre** (vs 850 en naïf), stocke entités et résumés, et récupère le contexte pertinent par similarité vectorielle (Gemini text-embedding-004, 768D, pgvector).
>
> **Justification.** Seule l'option (c) maintient un contexte **stable** quel que soit le nombre de chapitres tout en conservant la mémoire longue nécessaire à la détection d'incohérences (un personnage mort qui réapparaît au ch. 40). Contrainte UX assumée : la mémoire doit rester **invisible** — l'auteur ne voit que les alertes d'Ariane, jamais la tuyauterie.

### Encadré de décision — Backend (Supabase)

🟦 À INSÉRER — sous la ligne « Backend as a Service » du benchmark

> **💡 Décision D9 — Supabase comme backend tout-en-un**
>
> **Genèse.** Une équipe solo ne peut pas opérer une base de données, un service d'auth, un stockage et un backend séparés. Il faut un socle unifié, sécurisé par défaut et serverless.
>
> **Options envisagées.** (a) **Firebase** (NoSQL) — écarté : modèle documentaire mal adapté aux relations projet/asset/chapitre, et requêtes complexes pénibles. (b) **PlanetScale + auth maison** — écarté : puissant mais impose de construire et maintenir l'auth, le stockage et la sécurité soi-même. (c) **Supabase** — PostgreSQL relationnel + Auth + Storage + Edge Functions + RLS native.
>
> **Choix retenu.** Supabase.
>
> **Justification.** La **RLS PostgreSQL native** donne l'isolation multi-tenant (chaque ligne filtrée par `auth.uid()`) dès le premier jour, sans code applicatif de sécurité — décisif pour un projet manipulant les données créatives privées de chaque utilisateur. Le relationnel colle au domaine (projets → assets → chapitres). Lock-in jugé **acceptable et réversible** (PostgreSQL standard, exportable).

### Encadré de décision — IA Image (FAL.ai / FLUX.2 Pro)

🟦 À INSÉRER — sous la ligne « IA Images » du benchmark

> **💡 Décision D10 — FAL.ai + FLUX.2 Pro pour la génération d'images**
>
> **Genèse.** Le Sheet System impose une capacité précise : **passer plusieurs images de référence** à une génération (multi-référence). Tous les fournisseurs ne l'offrent pas nativement.
>
> **Options envisagées.** (a) **Stability AI / DALL·E** — bons modèles, mais multi-référence native limitée et couverture juridique floue. (b) **Replicate** — flexible mais latence et coûts variables moins maîtrisés. (c) **FAL.ai (FLUX.2 Pro / Pro Edit)** — qualité webtoon, multi-référence native, indemnisation copyright contractuelle.
>
> **Choix retenu.** FAL.ai avec FLUX.2 Pro.
>
> **Justification.** La **multi-référence native rend le Sheet System possible** — sans elle, le différenciateur n°1 du produit n'existe pas. L'indemnisation copyright de FAL.ai est un filet juridique précieux (voir partie 7). Coûts réels mesurés (~0,065 €/génération) compatibles avec le modèle freemium. Dépendance fournisseur assumée et surveillée (alerte de veille sur tout changement tarifaire).

### Encadré de décision — IA Texte (Gemini + fallback Groq)

🟦 À INSÉRER — sous la ligne « IA Texte » du benchmark

> **💡 Décision D11 — Gemini Flash en primaire, Groq en fallback**
>
> **Genèse.** La génération de scénario doit être rapide, peu coûteuse, et **ne jamais tomber** même quand le quota du fournisseur primaire est atteint (erreur 429).
>
> **Options envisagées.** (a) **GPT-4o seul** — qualité haute mais coût plus élevé et pas de filet en cas de quota. (b) **Groq seul** — ultra-rapide mais quotas plus contraints. (c) **Gemini Flash primaire + Groq Llama 3.3 70B en fallback automatique sur 429.**
>
> **Choix retenu.** Option (c), bascule automatique.
>
> **Justification.** Gemini Flash offre des quotas généreux et une latence < 3 s pour un coût minime ; Groq garantit la **continuité de service** en secours. Le fallback automatique transforme une panne de quota en simple changement de modèle invisible pour l'utilisateur — la robustesse prime sur l'attachement à un fournisseur unique.

### Encadré de décision — Frontend & Edge (groupé, plus court)

🟦 À INSÉRER — sous les lignes Frontend / Build / Cache / Runtime du benchmark

> **💡 Décision D12 — React + Vite + React Query + Edge Functions Deno**
>
> **Genèse.** L'interface est riche (éditeur canvas, drag & drop, états serveur nombreux) et doit rester maintenable par une personne.
>
> **Options envisagées.** Next.js (SSR inutile ici, complexité de migration) ; Create React App (build lent, déprécié) ; gestion d'état Redux manuelle (verbeux) ; runtime Node Lambda (cold start plus lent).
>
> **Choix retenu.** **Vite** (build < 100 ms, HMR instantané, SPA suffisante), **React + TypeScript** (stack mature et bien outillée pour l'IA de dev), **TanStack React Query** (élimine ~80 % de la logique de cache manuelle), **Edge Functions Deno** (natif Supabase, cold start < 200 ms, secrets natifs).
>
> **Justification.** Aucune de ces briques n'a généré de friction sur plusieurs mois de développement solo — c'est le critère décisif. Pas de SSR à opérer, pas de cache à coder à la main, pas d'infra Lambda à gérer : chaque choix retire de la charge à l'équipe minimale.

## Cadre juridique IA — paragraphe d'explication

🟦 À INSÉRER — avant le tableau juridique de la partie 7

La stratégie juridique consiste à **transformer une contrainte réglementaire en argument commercial**. Plutôt que de subir l'AI Act et le flou sur la propriété des œuvres IA, DreamWeave se positionne comme **l'outil le plus conforme du secteur** : intervention humaine créative à chaque étape (qui sécurise la propriété au sens du L.111-1 CPI), badge de transparence sur les exports (qui anticipe l'obligation de déclaration des plateformes), et couverture copyright héritée de FAL.ai. La conformité devient un différenciateur face aux outils génériques non balisés.

## Architecture de scale — paragraphe d'explication

🟦 À INSÉRER — avant le tableau d'architecture de scale

Ce tableau est un **exercice d'honnêteté technique** : il liste, pour chaque composant, la limite actuelle assumée et l'évolution déjà identifiée. Il démontre au jury que les choix présents sont des choix de *phase de lancement* (suffisants et économes), pas des impasses : chaque limite a son plan de dépassement priorisé (P1/P2/P3) pour passer le cap des 10 000 MAU.

---

# Synthèse des correctifs factuels à arbitrer (récap)

| # | Localisation | Problème | Correction proposée |
|---|--------------|----------|---------------------|
| C1 | Projections (P3) | ARR M12 « ~150 000 € » ≠ 600 × 19 € × 12 = 136 800 € | Écrire « ~137 000 € » OU préciser « incl. packs + marketplace » |
| C2 | Pricing / GTM | Plan Studio à 29,99 € mais « ARPU Studio > 49 € » et persona Elodie WTP 49-150 € | Rattacher le segment studio à **Entreprise (sur devis)** ; renommer le KPI |
| C3 | Organisation | « 4 mois » de dev vs janvier→juin (5-6 mois) | « 4 à 6 mois » |
| C4 | Personas / Insights | 89 % d'abandon et WTP sans taille d'échantillon | Ajouter « (n = 12 créateurs + 3 studios, nov. 2025) » |
| C5 | GTM | Frise Product Hunt Q3 2026 vs content marketing 2027 | Vérifier cohérence avec « lancement sep-oct 2026 » du budget |

---

---

# Annexe A — Cadrage pédagogique d'origine (consignes RNCP)

> Contenu original du fichier, conservé pour référence.

## Présentation générale

- Objectif : **Démontrer votre aptitude à mettre en oeuvre votre expertise dans le cadre d'un projet entre.intra.preneurial complet**
- Sujet : **Création d'un produit ou service dans le cadre d'un projet entrepreneurial ou intrapreneurial**
- Format : **Plan commun + parties spécifiques pour chaque majeure**
- Forme : **Pro et détaillé** (type Deck investissement)
- Mentorat : **F. Pumir + Responsables de majeures + experts externes**
- Rendu : **25 Août 2026 dernier délai** (malus si retard)
- Soutenance : **Premiers jours de Septembre 2026**
- Évaluation : **2 professionnels + Responsable de majeure**
- Titre : RNCP 40601

## Plan du Business Project (rappel)

1. **Étude de marché** — Ciblage (personas), taille du marché (TAM/SAM/SOM), benchmark concurrentiel, positionnement, veille systémique.
2. **Product / Service Design** — Insights & PMF, parcours utilisateurs, blueprint global.
3. **Business Model** — BMC détaillé, pricing argumenté.
4. **Organisation** — Équipe Build/Run, structure juridique.
5. **Go To Market** — Customer lifecycle, stratégie GTM.
6. **Opérationnalisation [TECH]** — Choix technologiques (benchmark + architecture), plan de release, besoins techniques, budget Build/Run, lead dev.

## Roadmap de validation (FP)

- Validation du product/market fit : **max 9 janvier 2026**
- Rédaction parties 1 et 2 + plan 3 et 4 : **13 mars 2026**
- Rédaction parties 3 et 4 + plan 5 et 6 : **22 mai 2026**
- Rédaction parties 5 et 6 : **17 juillet 2026**
- Finalisation globale : **jusqu'au 25 août 2026**
