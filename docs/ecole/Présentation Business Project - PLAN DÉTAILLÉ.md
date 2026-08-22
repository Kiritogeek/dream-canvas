# Présentation Business Project — Plan détaillé

> **Rôle de ce fichier.** Concevoir la présentation orale complète du Business Project DreamWeave, **de l'énoncé du problème à la conclusion**, sans se limiter aux 15 slides actuelles. Ce document se lit en deux temps : d'abord la **note d'intention** (pourquoi cette présentation est construite ainsi), ensuite le **développement page par page** (table d'architecture + contenu proposé pour chaque slide).
>
> **Source de vérité du contenu :** `Buisness_Project.md` (les 12 décisions D1→D12, les correctifs C1→C5) et le livrable `Memoire DreamWeave - Louis Basnier.pdf`.

---

## PARTIE I — NOTE D'INTENTION (à lire avant de développer)

### 1. Objectif de la soutenance

Démontrer, en 15 minutes devant un jury RNCP (2 professionnels + responsable de majeure), qu'un projet entrepreneurial **complet et viable** a été mené : marché réel, produit différenciant, modèle économique soutenable, faisabilité technique prouvée. La note se joue moins sur « le produit est joli » que sur **« chaque choix est justifié »**.

### 2. La thèse de la présentation

**DreamWeave n'est pas une liste de fonctionnalités : c'est une suite de décisions.**
C'est le fil rouge de tout le mémoire (note d'intention du `.md`), et il doit structurer l'oral. Pour chaque brique — produit, économique, technique — on montre : le **problème** qui l'a fait naître, les **options** étudiées, le **choix** retenu, sa **justification**. Le jury doit repartir en se disant : *« il ne construit pas au hasard, il arbitre. »*

### 3. Ce que le jury évalue (et où on le sert)

| Attente du jury | Slide(s) qui la servent |
|---|---|
| Compréhension d'un marché réel | 3-4-5-6-7 (problème, contexte, TAM/SAM/SOM, personas, concurrence) |
| Produit différenciant et défendable | 9-10-11 (solution, barrières, cœur technique cohérence) |
| Modèle économique qui tient | 15-16-17 (BMC, pricing, projections + break-even) |
| Posture entrepreneuriale / gestion du risque | 8-18-19 (décision fondatrice, organisation, GTM) |
| Faisabilité et posture CTO | 12-13-14-20-21-22 (Sheet System, blocs, NarraMind, stack, juridique, scale) |
| Honnêteté intellectuelle | 22 (architecture de scale = limites assumées) + slides backup |

### 4. Le ton et le registre

**Deck d'investissement, pas cours magistral.** Une idée forte par slide, un chiffre qui la prouve, une phrase qui la referme. On raconte des décisions, on ne récite pas des specs. Registre assuré mais pas survendeur : les objectifs sont **volontairement prudents** (10 000 inscrits, 600 payants) et c'est une force à assumer, pas à cacher.

### 5. Le système visuel

- **Glassmorphisme DreamWeave** cohérent avec le produit (le deck EST une démo de goût produit).
- 1 chiffre-héros par slide, en très gros. Le reste en appui.
- **Captures réelles du POC** dès que possible (slide solution + cœur technique) : le produit tourne, il faut le montrer.
- Zéro em-dash dans les titres, zéro copy AI-slop (« seamless », « révolutionner »), pas 3 cartes identiques en colonnes égales.
- Chaque slide « décision » porte un picto `💡 Dx` discret : le jury visualise le fil.

### 6. Le rythme (budget 15 min)

Le deck complet ci-dessous fait **~26 slides** (dont la slide pédagogique « Qu'est-ce qu'un Webtoon ? » et la slide « Sources & justifications »). Toutes ne sont pas de même poids :
- **Cœur (à dire absolument)** : slides 1, 3, 4, 7, 8, 10, 13, 17, 18, 23, 24, 25, 26 → l'ossature 15 min.
- **Extension (si le temps le permet ou en version longue)** : 2, 5, 6, 9, 11, 12, 14, 15, 16, 19, 20, 21, 22.
- **Backup (Q&A uniquement)** : slides B1-B3.

> **Règle de justification (exigée par Louis).** Chaque affirmation chiffrée est adossée soit à une **source externe** `[n]` listée en slide 25, soit à une **preuve de réflexion** (mesure interne ou calcul explicite). Rien n'est avancé sans justification traçable. Corollaire : **aucun taux d'abandon chiffré** n'est cité (non vérifiable, retiré du mémoire).

En 15 min, viser **~40 s / slide** sur l'ossature, et fondre les extensions en transitions rapides. La version « complète » sert de réservoir : on montre tout dans le mémoire écrit, on choisit à l'oral.

### 7. Les 5 messages à faire atterrir (si le jury ne retient que ça)

1. Un marché qui explose (+27 %/an, 45 Md$ en 2030) bloqué par une seule barrière : **savoir dessiner**.
2. La **cohérence** (visuelle + narrative) est le vrai problème difficile, donc le fossé concurrentiel.
3. **Sheet System + NarraMind** = la réponse technique à ce fossé, et elle **tourne déjà** (POC).
4. Pricing **logique Spotify** : on convertit par la satisfaction (manque de volume), pas par la frustration.
5. **Rentable dès 10-15 abonnés** : viable très tôt, sans levée.

### 8. Pièges à désamorcer (corrections non négociables du `.md`)

- **C1** — ARR M12 : dire **~137 000 €** (600 × 19 € × 12), jamais « ~150 000 € ».
- **C2** — le segment studio (Elodie, WTP 49-150 €) relève de **Entreprise (sur devis)**, pas de Studio à 29,99 €. Ajouter la 4e offre au slide pricing.
- **C4** — ne **jamais** citer « 89 % d'abandon » ni « n = 12 + 3 » (retiré du mémoire, non vérifiable). Remplacer par les faits sourcés (coût 300-1500 €, délai, compétence) + l'observation des communautés (r/webtoons, Tapas).
- **C5** — la frise GTM (Product Hunt, content marketing, B2B) doit être **cohérente** avec « lancement sep-oct 2026 ».
- **C3** — durée de dev : dire **« 4 à 6 mois »**, pas « 4 mois ».

---

## PARTIE II — ARCHITECTURE DE LA PRÉSENTATION (vue d'ensemble)

| # | Slide | Rôle dans le récit | Décision portée | Poids |
|---|-------|--------------------|-----------------|-------|
| 1 | Couverture | Planter la promesse en 1 phrase | — | Cœur |
| 2 | Note d'intention : une suite de décisions | Donner la clé de lecture du deck | Cadre | Extension |
| 3 | Le problème : le goulot d'étranglement | Créer la tension | — | Cœur |
| 4 | **Qu'est-ce qu'un Webtoon ? (GIF)** | Mettre le jury au même niveau, montrer le format | — | Cœur |
| 5 | Le contexte : un marché installé | Prouver que le public existe (sources) | — | Extension |
| 6 | Taille du marché : TAM / SAM / SOM | Chiffrer l'opportunité + la prudence | — | Extension |
| 7 | Cibles : 4 personas, 1 blocage | Montrer qu'on connaît l'utilisateur | D2 (B2C d'abord) | Cœur |
| 8 | Concurrence : la place vide (SWOT / matrice) | Positionner : cohérence + accessibilité | — | Cœur |
| 9 | Décision fondatrice : pourquoi DreamWeave | Justifier l'existence même du produit | D1 | Extension |
| 10 | La solution : un parcours en 4 étapes | Rendre le produit tangible | — | Cœur |
| 11 | Les 5 barrières → 5 réponses | Charnière problème/solution | — | Extension |
| 12 | Onboarding : déblocage progressif | Servir le Time-to-Value < 10 min | D3 | Extension |
| 13 | Cœur technique 1 : Sheet System | Le différenciateur n°1 (cohérence visuelle) | D6 | Cœur |
| 14 | Cœur technique 2 : génération par bloc | Workflow créatif itératif | D7 | Extension |
| 15 | Cœur technique 3 : NarraMind | Cohérence narrative longue distance | D8 | Extension |
| 16 | Business Model Canvas | Le modèle en une vue | — | Extension |
| 17 | Pricing : logique Spotify | Le choix économique central | D4 | Cœur |
| 18 | Projections An 1 + break-even | Prouver la viabilité précoce | — | Cœur |
| 19 | Organisation : équipe minimale + juridique | Posture lead dev + gestion du risque | D5 | Extension |
| 20 | Go To Market : cycle de vie + 5 phases | Prouver avant de dépenser | — | Extension |
| 21 | Stack technique : le benchmark raisonné | Justifier les briques (posture CTO) | D9-D12 | Extension |
| 22 | Cadre juridique IA : conformité = argument | Transformer la contrainte en atout | — | Extension |
| 23 | Architecture de scale : les limites assumées | Honnêteté technique | — | Cœur |
| 24 | Conclusion : bon produit, bon moment | Refermer sur une décision-clé | — | Cœur |
| 25 | **Sources & justifications** | Adosser chaque chiffre à sa source / preuve | — | Cœur |
| 26 | Merci / Questions | Ouvrir la Q&A | — | Cœur |
| B1-B3 | Slides backup (coûts, risques, argumentaire abandon) | Dégainer en Q&A | — | Backup |

---

## PARTIE III — DÉVELOPPEMENT PAGE PAR PAGE

> Format de chaque page : **Titre · Message unique · Contenu · Chiffre-héros · Visuel · Script (1-2 phrases) · Transition.**
>
> ⚠️ **Numérotation.** Depuis l'ajout de la slide « Qu'est-ce qu'un Webtoon ? » (nouvelle position 4) et de « Sources & justifications » (nouvelle position 25), la numérotation de référence est celle du **tableau de la Partie II** ci-dessus et du fichier *« Business Project - SCRIPT SOUTENANCE »*. Dans les intitulés ci-dessous, toute slide au-delà de la 3 est décalée de +1 (l'ancienne « Slide 4 » devient la slide 5, etc.). Les deux nouvelles slides sont développées à leur place réelle.

### Slide 1 — Couverture
- **Message unique :** DreamWeave crée un webtoon complet et cohérent par IA, sans savoir dessiner.
- **Contenu :** Logo, titre, baseline *« De l'idée au chapitre publié, sans savoir dessiner. »*, Louis Basnier, WSF Promotion 2026, format « Soutenance · 15 min ».
- **Visuel :** hero glassmorphisme + une case webtoon générée en fond.
- **Script :** *« Je vais vous présenter DreamWeave : créer un webtoon complet et cohérent grâce à l'IA, sans compétence en dessin. »*
- **Transition :** *« Pour comprendre pourquoi ce produit existe, il faut partir d'un problème. »*

### Slide 2 — Une suite de décisions (note d'intention)
- **Message unique :** ce deck ne liste pas des features, il raconte des arbitrages.
- **Contenu :** *« Pour chaque choix : le problème, les options, la décision, la justification. »* Pictogramme des 12 décisions D1→D12.
- **Visuel :** frise verticale des décisions estompées.
- **Script :** *« Je ne vais pas vous montrer ce que j'ai construit, mais pourquoi je l'ai construit ainsi. »*
- **Transition :** *« La première décision, c'est de savoir quel problème on attaque. »*

### Slide 3 — Le problème
- **Message unique :** un marché qui explose, un goulot d'étranglement unique.
- **Contenu :** +27 %/an ; 45,3 Md$ en 2030 (vs 8,28 en 2023) ; +200 % de recherches « AI webtoon maker » ; un chapitre illustré coûte 300 à 1 500 € et prend 1 à 4 semaines. Résultat : l'abandon en cours de projet est un constat récurrent des communautés de créateurs (r/webtoons, Tapas) — pas de pourcentage chiffré avancé.
- **Chiffre-héros :** 45,3 Md$ (marché 2030) ou 300-1500 € (coût d'un chapitre).
- **Visuel :** courbe de marché qui monte / mur « savoir dessiner ».
- **Script :** *« La demande explose, mais créer un webtoon reste bloqué par le dessin. C'est ce mur que DreamWeave supprime. »*
- **Transition :** *« Deux mots sur ce marché et son public. »*

### Slide 4 (nouvelle) — Qu'est-ce qu'un Webtoon ? *(GIF)*
- **Message unique :** un format de BD numérique verticale, lu en scrollant sur mobile, natif smartphone.
- **Contenu :** définition en une phrase (BD verticale née en Corée, pensée mobile, pas une BD papier scannée). Ce que DreamWeave produit est exactement ce format (canvas vertical unique jusqu'à 100 000 px).
- **Visuel :** **GIF de lecture en temps réel** (scroll vertical continu, cases qui s'enchaînent). ⚠️ Droits : privilégier un GIF **généré par DreamWeave** (montre le produit + zéro problème de copyright), sinon un webtoon sous licence libre crédité à l'écran.
- **Script :** *« Un webtoon, c'est ça : on lit en scrollant, en une seule colonne verticale. C'est exactement ce format que DreamWeave produit, et c'est ce qui impose sa contrainte n°1, la cohérence sur toute la longueur. »*
- **Transition :** *« Ce format a déjà un public massif. »*

### Slide 5 — Le contexte : un marché installé
- **Message unique :** le public et l'économie de créateurs sont déjà là.
- **Contenu :** 170 M lecteurs actifs / mois (plateforme leader) ; 24 M créateurs ; romance = 38,8 % des revenus ; lecture verticale scroll mobile, Gen Z. **86 % des créateurs utilisent déjà l'IA générative.**
- **Chiffre-héros :** 170 M lecteurs.
- **Visuel :** mockup smartphone scroll vertical.
- **Script :** *« Le public est massif, l'économie de créateurs installée : ce qui manque, ce sont des outils de production accessibles. »*
- **Transition :** *« Concrètement, quelle est la taille de l'opportunité ? »*

### Slide 5 — TAM / SAM / SOM
- **Message unique :** opportunité large, objectif volontairement prudent.
- **Contenu :** TAM **~160 M** (tous les auteurs de webfiction mondiaux) ; SAM **5-10 M** (créateurs bloqués par le dessin, prêts à 10-30 €/mois) ; SOM à 12 mois = **10 000 inscrits, 600 payants**, CAC < 30 €, LTV/CAC > 3.
- **Chiffre-héros :** 600 payants visés.
- **Visuel :** 3 cercles concentriques (TAM > SAM > SOM), chacun chiffré.
- **Script :** *« Des objectifs prudents, choisis pour valider le modèle avant de chercher à grandir. »*
- **Transition :** *« Qui sont ces 10 000 personnes ? »*

### Slide 6 — Personas + priorisation (💡 D2)
- **Message unique :** 4 profils, un même blocage, une séquence d'attaque claire.
- **Contenu :** Luna (créatrice passionnée, cible primaire, 8-15 €/mois) · Marc (auteur amateur exigeant, 15-25 €) · Théo (étudiant, sensible au prix, prescripteur viral) · Elodie (éditeur B2B, WTP 49-150 €). **Séquence : B2C d'abord (Luna + Marc), B2B (Elodie) dès la V1 / T3 2026.**
- **Visuel :** 4 cartes personas + flèche de priorisation.
- **Script :** *« Le B2C finance l'apprentissage produit et génère les preuves sociales qui crédibiliseront le B2B ensuite, exactement la trajectoire de Dashtoon. »*
- **Transition :** *« Face à eux, que propose la concurrence ? »*

### Slide 7 — Concurrence : la place vide
- **Message unique :** personne n'occupe le quadrant « cohérence + accessibilité ».
- **Contenu :** matrice 2×2 (axe automatisation IA × axe spécialisation webtoon). Dashtoon (workflow mais cohérence faible), Clip Studio (réf. pros, refuse l'IA, exige de dessiner), AI Comic Factory (gratuit mais rendu brut). **DreamWeave seul dans le quadrant vide.** Force : FLUX.2 Pro pour tous + mémoire narrative. Faiblesse assumée : dépendance fournisseur IA.
- **Visuel :** matrice 2×2 avec DreamWeave isolé en haut à droite.
- **Script :** *« La place vide, c'est l'intersection cohérence et accessibilité. C'est là que je me positionne. »*
- **Transition :** *« Pourquoi ce produit-là, et pas une marketplace ou un outil de dessin ? »*

### Slide 8 — Décision fondatrice (💡 D1)
- **Message unique :** on attaque la cause de l'abandon, pas un symptôme.
- **Contenu :** Options écartées : marketplace auteurs/illustrateurs (ne supprime ni coût ni délai) ; outil de dessin assisté (exige une compétence) ; génération one-shot type Midjourney (ni cohérence ni workflow). **Choix : pipeline complet idée → webtoon publiable**, où la valeur = la cohérence sur la durée d'une série.
- **Visuel :** 3 options barrées → 1 retenue.
- **Script :** *« C'est la seule option qui attaque la cause de l'abandon. Et la cohérence inter-chapitres, difficile, crée le fossé concurrentiel. »*
- **Transition :** *« Voici à quoi ressemble ce pipeline. »*

### Slide 9 — La solution : 4 étapes
- **Message unique :** un parcours guidé, des visuels cohérents en secondes.
- **Contenu :** Style (direction artistique de référence) → Assets (personnages, décors, cohérents) → Scénario (écriture assistée, découpage auto en cases) → Éditeur (composition, bulles, export chapitre).
- **Visuel :** **captures réelles du POC**, une par étape.
- **Script :** *« Quatre étapes, de la direction artistique au chapitre exporté, sans savoir dessiner. »*
- **Transition :** *« Ce qui rend tout cela possible, c'est de résoudre un problème difficile : la cohérence. »*

### Slide 10 — Les 5 barrières → 5 réponses
- **Message unique :** chaque barrière à la création a une réponse technique dédiée.
- **Contenu :** tableau barrière → réponse (barrière artistique → génération IA ; incohérence → Sheet System ; fragmentation des outils → tout-en-un ; coût → crédits ; complexité → onboarding progressif).
- **Visuel :** tableau à deux colonnes, impact critique surligné.
- **Script :** *« C'est la charnière du projet : de cette correspondance terme à terme découle toute l'architecture. »*
- **Transition :** *« Première barrière traitée dès l'entrée : ne pas noyer l'utilisateur. »*

### Slide 11 — Onboarding : déblocage progressif (💡 D3)
- **Message unique :** on ouvre les fonctions au fur et à mesure, guidé par Ariane.
- **Contenu :** options (tout exposer = écrasant ; wizard forcé = frustrant ; **déblocage progressif + badges New + Ariane**). Sert le Time-to-Value < 10 min sans sacrifier la profondeur.
- **Visuel :** onglets qui s'allument progressivement.
- **Script :** *« La logique des outils créatifs qui réussissent leur adoption : puissant sans être intimidant. »*
- **Transition :** *« Passons au cœur, mon vrai différenciateur : la cohérence. »*

### Slide 12 — Cœur technique 1 : Sheet System (💡 D6)
- **Message unique :** un personnage qui reste lui-même du chapitre 1 au chapitre 50.
- **Contenu :** problème (le même prompt donne un visage différent à chaque appel). Options : seed fixe (casse dès qu'on change l'angle) ; LoRA par perso (qualité max mais coûteux, lent, incompatible temps réel). **Choix : fiche composite 4 angles injectée à chaque génération via FLUX.2 Pro Edit.** ~20 itérations de prompt engineering pour stabiliser ratio/fond/qualité.
- **Chiffre-héros :** ~90 % du bénéfice du LoRA, pour une fraction du coût.
- **Visuel :** la sheet 4 angles + 3 cases où le perso reste identique.
- **Script :** *« Un choix d'ingénieur : la solution suffisante et livrable bat la solution parfaite et inatteignable. »*
- **Transition :** *« Une case n'est pas une image unique. »*

### Slide 13 — Cœur technique 2 : génération par bloc (💡 D7)
- **Message unique :** on régénère un bloc sans toucher aux autres.
- **Contenu :** layout `JSONB` dans `chapter_canvases` ; chaque bloc = `{ id, x, y, width, height, prompt, asset_refs, image_url }`, généré seul. Souplesse de schéma pour des compositions imprévisibles.
- **Visuel :** case découpée en blocs, un bloc en cours de régénération.
- **Script :** *« Indispensable à un workflow créatif : l'auteur retouche un détail sans tout refaire. »*
- **Transition :** *« Reste la cohérence de l'histoire, pas seulement des images. »*

### Slide 14 — Cœur technique 3 : NarraMind (💡 D8)
- **Message unique :** une mémoire narrative qui alerte quand le scénario se contredit.
- **Contenu :** problème (contexte brut = ~850 tokens/chapitre, inutilisable à 50 chapitres). Options : tout injecter (non scalable) ; fenêtre glissante (perd le lore ancien). **Choix : compression ~50 tokens/chapitre + recherche vectorielle (Gemini text-embedding-004 768D, pgvector).** Ariane montre les alertes, jamais la tuyauterie.
- **Chiffre-héros :** ~50 tokens/chapitre (vs 850).
- **Visuel :** alerte Ariane « ce personnage est mort au ch. 12 ».
- **Script :** *« La mémoire reste invisible : l'auteur ne voit que les alertes, jamais la plomberie. »*
- **Transition :** *« Ce produit doit aussi tenir économiquement. »*

### Slide 15 — Business Model Canvas
- **Message unique :** un seul levier porte la marge.
- **Contenu :** partenaires (FAL.ai, Supabase, Vercel) ; ressources clés (FLUX.2 Pro, **prompts système propriétaires**, NarraMind) ; revenus (abonnements + packs + marketplace styles 30 % + API B2B) ; coûts (fixes ~60 €/mois, variables ~0,065 €/génération). **Marge = ratio prix abonnement / coût réel des générations.**
- **Visuel :** BMC 9 blocs, le bloc « levier de marge » surligné.
- **Script :** *« L'essentiel des coûts est variable : je ne paie que ce que les utilisateurs consomment. »*
- **Transition :** *« D'où une décision de pricing à contre-courant. »*

### Slide 16 — Pricing : logique Spotify (💡 D4)
- **Message unique :** on différencie sur le volume, pas sur les fonctionnalités.
- **Contenu :** options écartées (feature-gating classique ; pay-as-you-go). **Choix : mêmes fonctions et même qualité FLUX.2 Pro pour tous ; seul le volume change.** Libre 0 € / 20 crédits · Créateur 12,99 € / 100 · Studio 29,99 € / 250 · **Entreprise sur devis (segment studios, WTP 49-150 €)**. 1 crédit ≈ 0,065 € ; un utilisateur gratuit ≈ 1,30 €/mois, absorbable.
- **Chiffre-héros :** 100 % des fonctions, même en gratuit.
- **Visuel :** 4 colonnes de plans, « même qualité pour tous » en bandeau.
- **Script :** *« L'utilisateur gratuit éprouve la pleine valeur, puis upgrade parce qu'il manque de volume, pas parce qu'on lui refuse une fonction. »*
- **Transition :** *« Ce que ça donne, chiffré, la première année. »*

### Slide 17 — Projections An 1 + break-even
- **Message unique :** viable très tôt, sans levée.
- **Contenu :** un chapitre passe de 1-4 semaines à 2-4 heures ; de 300-1500 € à < 5 €. Conversion prudente 2 % → 6 % sur 12 mois. **600 payants à M12 ≈ ARR ~137 000 €. Break-even opérationnel dès 10-15 abonnés Créateur.**
- **Chiffre-héros :** rentable dès 10-15 abonnés.
- **Visuel :** avant/après (temps + coût) + jauge break-even.
- **Script :** *« Le point d'attention n'est pas le MRR absolu, c'est la trajectoire : rentable dès une poignée d'abonnés. »*
- **Transition :** *« Qui délivre tout ça ? »*

### Slide 18 — Organisation (💡 D5)
- **Message unique :** une équipe minimale outillée par l'IA + une structure juridique par paliers.
- **Contenu :** pari : une personne outillée par l'IA de dev délivre la complexité d'une équipe de 3-5 devs ; recrutements P0→P3 déclenchés par des seuils de revenus. Juridique : **auto-entrepreneur → SASU (30 k€ CA ou 1er salarié) → SAS (associés / levée)**, chaque transition déclenchée par un fait. Dev : « 4 à 6 mois ».
- **Visuel :** frise des 3 statuts avec seuils déclencheurs.
- **Script :** *« Chaque transition est déclenchée par un fait, pas par une intuition : la gestion du risque appliquée au juridique. »*
- **Transition :** *« Comment on met ce produit sur le marché ? »*

### Slide 19 — Go To Market
- **Message unique :** construire la preuve avant de dépenser.
- **Contenu :** cycle de vie (le point critique = **l'activation**, le wow moment < 10 min, pas l'acquisition). 5 phases : bêta (10 pilotes) → lancement freemium public → content marketing SEO/tutos (Q4 2026) → influence créateurs (Q4 2026-Q1 2027) → B2B studios. Frise cohérente avec « lancement sep-oct 2026 ».
- **Visuel :** entonnoir + frise datée des 5 phases.
- **Script :** *« On commence par le freemium, l'acquisition la moins chère, et aucune dépense marketing avant d'avoir prouvé l'activation. »*
- **Transition :** *« Tout cela ne tient que si la technique suit. »*

### Slide 20 — Stack technique : benchmark raisonné (💡 D9-D12)
- **Message unique :** chaque brique maximise ce qu'une seule personne peut livrer et maintenir.
- **Contenu :** Supabase (RLS native multi-tenant dès J0) ; FAL.ai / FLUX.2 Pro (multi-référence native = Sheet System possible + indemnisation copyright) ; Gemini Flash primaire + Groq fallback auto sur 429 (continuité de service) ; React + Vite + React Query + Edge Functions Deno (zéro friction sur des mois de dev solo).
- **Visuel :** tableau benchmark, colonne « pourquoi » mise en avant.
- **Script :** *« Le fil conducteur : maximiser ce qu'une personne peut livrer, quitte à accepter une dépendance tant qu'elle reste réversible. »*
- **Transition :** *« Un mot sur un sujet que le jury attend : le droit de l'IA. »*

### Slide 21 — Cadre juridique IA
- **Message unique :** transformer la contrainte réglementaire en argument commercial.
- **Contenu :** intervention humaine créative à chaque étape (sécurise la propriété, L.111-1 CPI) ; badge de transparence sur les exports (anticipe l'obligation de déclaration des plateformes) ; couverture copyright héritée de FAL.ai. **DreamWeave se positionne comme l'outil le plus conforme du secteur.**
- **Visuel :** badge « Créé avec DreamWeave » + 3 piliers de conformité.
- **Script :** *« La conformité devient un différenciateur face aux outils génériques non balisés. »*
- **Transition :** *« Et à l'échelle ? Soyons honnêtes. »*

### Slide 22 — Architecture de scale : les limites assumées
- **Message unique :** les choix présents sont des choix de phase de lancement, pas des impasses.
- **Contenu :** pour chaque composant, la limite actuelle + l'évolution priorisée (P1/P2/P3) pour passer 10 000 MAU. Le LoRA reste planifié comme évolution de scale, pas comme socle.
- **Visuel :** tableau composant / limite / plan de dépassement.
- **Script :** *« Un exercice d'honnêteté : chaque limite a déjà son plan de dépassement. »*
- **Transition :** *« En résumé. »*

### Slide 23 — Conclusion
- **Message unique :** le bon produit, au bon moment, prouvé par un prototype.
- **Contenu :** marché qui grandit vite, 86 % des créateurs utilisent déjà l'IA, personne ne résout vraiment la cohérence. De l'idée au chapitre publié, sans savoir dessiner, pour quelques euros. Modèle soutenable dès le premier utilisateur gratuit. **Rappel de la décision-clé :** *« la solution suffisante et livrable bat la solution parfaite et inatteignable. »*
- **Chiffre-héros :** < 5 € le chapitre.
- **Visuel :** synthèse en 3 icônes (marché / différenciateur / viabilité).
- **Script :** *« DreamWeave démocratise la création de webtoons, et ce n'est pas un concept : le prototype tourne. »*
- **Transition :** *« Merci, je suis à votre disposition. »*

### Slide 25 (nouvelle) — Sources & justifications
- **Message unique :** chaque chiffre est adossé à une source publique vérifiable ou à une preuve de réflexion assumée.
- **Contenu (à afficher intégralement) :**

  **Sources externes**
  | Réf | Source | Chiffres justifiés |
  |-----|--------|--------------------|
  | [1] | Cho, Adkins & Long — *Journal of Documentation* (fév. 2025) | 76 % des lecteurs ont 18-33 ans |
  | [2] | Webtoon Entertainment — *SEC S-1 Filing* (2024) | 170 M MAU · 24 M créateurs · 150+ pays |
  | [3] | Grand View Research — *Webtoon Market Report* (2023) | 8,28 Md$ (2023) → 45,3 Md$ (2030) · CAGR 27,3 % · romance 38,8 % |
  | [4] | Adobe — *Creators' Toolkit Report* (oct. 2025) | 86 % utilisent l'IA générative · 81 % « créent l'impossible » |
  | [5] | Dashtoon x KWIA — *GlobeNewswire* (août 2024) | validation trajectoire B2C → B2B |
  | [6] | Vox Illustration (2025) + contrat Webtoon Originals (Tapas Forum) | coût 300-1500 €/chapitre |
  | — | Google Trends | +200 % recherches « AI webtoon maker » (2023-2025) |

  **Preuves de réflexion (données internes assumées)**
  | Donnée | Justification |
  |--------|---------------|
  | WTP par persona | Positionnement raisonné à partir des prix du marché SaaS créatif (fourchettes assumées) |
  | ~0,065 €/génération | Mesure sur l'API FAL.ai (FLUX.2 Pro) |
  | ARR ~137 000 € | Calcul 600 × ~19 € × 12 |
  | Break-even 10-15 abonnés | Coûts fixes ~60 €/mois + variables vs MRR Créateur 12,99 € |
  | ~50 tokens/chapitre · ~90 % du bénéfice LoRA | Mesures internes du POC (NarraMind, Sheet System) |

- **Visuel :** deux colonnes claires « Sources externes / Preuves de réflexion ».
- **Script :** *« Chaque chiffre vient soit d'une source publique vérifiable, soit d'une enquête ou d'un calcul que j'assume. »*
- **Transition :** *« Merci, je suis à votre disposition. »*

### Slide 26 — Merci / Questions
- **Contenu :** *« Merci de votre attention. Des questions ? »* + coordonnées.
- **Visuel :** épuré, logo.

### Slides backup (Q&A)
- **B1 — Structure de coûts détaillée :** fixes vs variables, sensibilité au prix FAL.ai, plan si hausse tarifaire fournisseur.
- **B2 — Risques & mitigations :** dépendance FAL.ai (veille + réversibilité), entrée d'un acteur établi (Adobe/Canva), copyright IA.
- **B3 — Argumentaire abandon :** faits sourcés (coût 300-1500 €, délai, compétence) + observation des communautés (r/webtoons, Tapas), pour expliquer pourquoi aucun % chiffré n'est avancé. La slide 25 « Sources » sert déjà de premier filet en Q&A.

---

## Comment compresser en 15 minutes

Garder l'**ossature Cœur** (1, 3, 4, 7, 8, 10, 13, 17, 18, 23, 24, 25, 26) = 13 slides, ~1 min chacune. La slide 4 (Webtoon + GIF) et la slide 25 (Sources) restent dans l'ossature : la première fait adhérer le jury au format, la seconde blinde la crédibilité. Fondre les extensions les plus fortes (9, 15, 20) en 20 s de transition. Réserver le reste au mémoire écrit et aux slides backup pour la Q&A.
