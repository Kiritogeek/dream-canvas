# Sujets à aborder par slide — Business Project · DreamWeave

> Deck **23 slides** (version finale). Pour chaque slide : **Message clé** (l'idée à faire passer) · **À aborder** (les points à dérouler) · **💡 Le pourquoi** (le raisonnement de fond, pour comprendre et défendre) · **Si le jury creuse** (questions + réponses).
> La **démo live** (Style → Édition, dans le produit) n'est pas scriptée ici : elle s'intercale après le slide 9.

---

## Slide 1 — Couverture

**Message clé** : poser le sujet en une phrase — créer des webtoons pro par IA, sans savoir dessiner.

**À aborder :**
- Te présenter : Louis Basnier, Product Owner apprenti.
- La promesse : de l'idée au chapitre publié, sans compétences artistiques.
- Annoncer le plan : marché → solution (démo) → modèle économique → faisabilité technique.

---

## Slide 2 — Le format (qu'est-ce qu'un webtoon)

**Message clé** : poser le format, parce qu'il impose la vraie contrainte technique.

**À aborder :**
- Webtoon = BD **verticale**, née en Corée, pensée mobile, lue en **scroll continu**, une seule colonne.
- Une histoire = plusieurs chapitres ; un chapitre n'a **pas de longueur limite** (des dizaines de milliers de pixels).
- La contrainte que ça crée : garder un personnage **cohérent** sur toute la longueur d'une série.

**💡 Le pourquoi** : tu commences par le format parce que c'est lui qui explique **toute** ta difficulté technique. Un webtoon n'est pas une image isolée, c'est une **série longue** où le même personnage revient case après case. C'est ce qui rend la cohérence si dure — et donc si précieuse quand tu la résous.

---

## Slide 3 — Le marché du Webtoon

**Message clé** : le public et l'argent sont **déjà là**, et ça grossit vite.

**À aborder :**
- Taille : **8,28 Md$ en 2023** → **45,3 Md$ en 2030** (source sectorielle).
- Croissance : **+27,3 %/an** (CAGR 2023-2030).
- Demande d'outils IA : **+200 %** de recherches « AI webtoon maker » en 2 ans (Google Trends).

**💡 Le pourquoi** : tu ouvres sur le marché pour prouver que tu ne crées pas un besoin, tu réponds à un besoin **existant et en croissance**. Le CAGR de 27 % dit « le train est en marche » ; le +200 % de recherches dit « les gens cherchent déjà activement un outil comme le mien ». Les deux ensemble = timing.

**Si le jury creuse :**
- *« Vos chiffres sont sourcés ? »* → 8,28 → 45,3 Md$ et CAGR 27,3 % = étude sectorielle citée au mémoire ; +200 % = Google Trends. Le 2030 est une **projection**, je l'assume.

---

## Slide 4 — Un marché installé

**Message clé** : ce n'est pas un pari sur l'avenir, l'audience et les créateurs existent déjà.

**À aborder :**
- **170 M** lecteurs actifs/mois, **24 M** créateurs (chiffre du document d'introduction en bourse de la plateforme, pas d'un blog).
- **Romance ≈39 %** des revenus · **76 %** ont 18-33 ans · **86 %** des créateurs utilisent **déjà** l'IA.

**💡 Le pourquoi** : le slide précédent parlait d'argent (marché), celui-ci parle de **gens** (audience + créateurs). Le 86 % est ton chiffre le plus fort : il désamorce l'objection « les créateurs vont rejeter l'IA » — non, ils l'ont **déjà** adoptée.

**Si le jury creuse :**
- *« 86 %, d'où ça vient ? »* → rapport Adobe sur les créateurs. Ça montre que l'IA n'est plus un tabou dans cette communauté.

---

## Slide 5 — Le problème

**Message clé** : le blocage n'est pas l'envie, c'est le **mur « savoir dessiner »**.

**À aborder :**
- Un seul chapitre = **300 à 1 500 €** quand on ne sait pas dessiner, pour **1 à 4 semaines**.
- Alternative : des **mois** pour apprendre à illustrer.
- ⚠️ **Ne jamais citer de % d'abandon chiffré** — rester sur des faits : coût, délai, compétence.

**💡 Le pourquoi** : tu sépares bien **l'envie** (elle existe, cf. les 24 M de créateurs) et **la capacité** (bloquée par le dessin). C'est central : si le problème était le manque d'envie, aucun produit ne le résoudrait. Comme c'est un problème de **compétence + coût**, un outil peut le faire sauter. C'est ce qui rend ton marché « débloquable ».

**Si le jury creuse :**
- *« Le 300-1500 €, sourcé ? »* → coût constaté d'illustration freelance par épisode (repris dans le persona Marc). Ordre de grandeur assumé.

---

## Slide 6 — Cibles

**Message clé** : 4 profils, **un même blocage** ; je commence par le B2C.

**À aborder :**
- **Luna** (22 ans, romance-fantasy) : cible primaire, WTP 8-15 €/mois, vecteur viral.
- **Marc** (28 ans, dev & scénariste) : fort potentiel de rétention, WTP 15-25 €.
- **Théo** (20 ans, étudiant) : prescripteur viral.
- **Élodie** (35 ans, studio) : B2B dès la V1.
- **Décision** : démarrer par le **B2C** (Luna + Marc).

**💡 Le pourquoi** : tu ne cibles pas tout le monde d'un coup. Luna = **acquisition** (elle est nombreuse et virale, elle amène du monde gratuitement). Marc = **revenu/rétention** (il paie et il reste). Commencer B2C = un cycle de vente court, pas de négociation, une boucle virale ; le B2B (Élodie) viendra quand le produit aura fait ses preuves.

**Si le jury creuse :**
- *« Luna à 8-15 €, mais vous parlez de gratuit ? »* → Luna a une WTP basse : elle vit le produit en plan Libre, puis convertit au plan Créateur. Profil « essai gratuit → conversion + viralité ».

---

## Slide 7 — Concurrence

**Message clé** : le quadrant **cohérence + accessibilité** est **vide** — c'est ma place.

**À aborder :**
- **Dashtoon** : bon workflow, **cohérence faible**.
- **Clip Studio** : référence pro, mais **refuse l'IA** et exige de savoir dessiner.
- **AI Comic Factory** : gratuit/open source, mais **one-shot** — aucune cohérence ni gestion de projet.
- Quadrant automatisation IA × spécialisation webtoon : le **haut-droite est libre** = DreamWeave.

**💡 Le pourquoi** : le quadrant n'est pas décoratif, il **démontre** ton positionnement. Chaque concurrent est fort sur **un** axe et faible sur l'autre : soit il automatise mais bâcle la cohérence (Dashtoon, AI Comic Factory), soit il est pro mais rejette l'IA (Clip Studio). Personne ne tient **les deux à la fois** — c'est exactement l'intersection que tu vises.

**Si le jury creuse :**
- *« Qu'est-ce qui vous protège d'un copieur ? »* → la brique cohérence (Sheet System) + la couche narrative (NarraMind), pas un simple wrapper d'API.

---

## Slide 8 — Décision fondatrice

**Message clé** : j'attaque la **cause** de l'abandon, pas un symptôme.

**À aborder :**
- 3 options écartées et **pourquoi** :
  - **Marketplace** → ne supprime ni le coût ni le délai.
  - **Outil de dessin assisté** → exige toujours de savoir dessiner.
  - **Génération one-shot** → sans cohérence ni workflow.
- Retenu : **pipeline complet, de l'idée au webtoon publiable**.

**💡 Le pourquoi** : ce slide prouve que ton produit est un **choix raisonné**, pas la première idée venue. Tu montres que tu as éliminé 3 fausses solutions parce qu'elles traitent un **symptôme** (le manque de dessins) et pas la **cause** (produire soi-même une série cohérente de bout en bout). Un jury adore voir ce raisonnement d'élimination.

**Si le jury creuse :**
- *« Pourquoi pas une marketplace, moins risqué ? »* → le blocage n'est pas l'accès à des dessins, c'est produire une série cohérente. La marketplace ne résout pas ça.

---

## Slide 9 — La solution (transition vers la démo)

**Message clé** : un parcours guidé en 5 étapes qui produit des visuels cohérents **en secondes** — et **ça tourne déjà**.

**À aborder :**
- Les 5 étapes : **Style → Assets → Univers → Scénario → Édition**.
- Annoncer la **démo en direct** dans le produit.

> ### 🎬 DÉMO LIVE — Style → Édition *(non scriptée ici, tu la fais dans l'app)*
> Tu déroules le produit en vrai. **Objectif** : prouver le « wow moment » (visuels cohérents en secondes) et que le produit fonctionne réellement.

---

## Slide 10 — Onboarding · Ariane *(après la démo)*

**Message clé** : un éditeur complet est intimidant → Ariane guide, sans écraser.

**À aborder :**
- Le risque : tout exposer d'un coup = facteur d'abandon.
- 2 extrêmes écartés : tout montrer (écrasant) / wizard forcé (frustrant).
- Solution : **déblocage progressif** + assistant Ariane + badges « New ».
- Résultat : time-to-value **< 10 min**.

**💡 Le pourquoi** : tu relies l'onboarding à ta thèse de départ (l'abandon). Un outil puissant mais intimidant recrée le problème qu'il prétend résoudre. Le déblocage progressif = tu montres la puissance **petit à petit**, au rythme où l'utilisateur en a besoin. Ariane incarne ça : un fil qui guide dans le labyrinthe.

---

## Slide 11 — Scénario · cohérence scénaristique (Ariane) *(après la démo)*

**Message clé** : Ariane est la **gardienne de la cohérence** sur toute la durée — c'est le différenciateur.

**À aborder :**
- Ariane fait **deux choses**, et il faut bien les séparer (c'est le piège) :
  - 🛡️ **Détecter les incohérences** → via une **mémoire compressée**.
  - 💡 **Proposer d'enrichir l'univers** (lore + directions narratives) → via la **vectorisation**.

### 🛡️ Mécanisme 1 — Détection d'incohérences (mémoire compressée, PAS de vecteurs)
Un LLM « oublie ». Si tu lui réinjectes le texte brut de tous les chapitres, le contexte grossit de **~850 tokens/chapitre** et la latence double dès le 6e. Solution : tu **compresses** chaque chapitre en un **résumé + des fiches entités** (~50 tokens/chapitre) → tu tiens la cohérence sur 50 chapitres sans exploser le coût (~9× plus compact). **Aucune vectorisation ici.**

### 💡 Mécanisme 2 — Propositions d'Ariane (la vectorisation)

**Sur quoi agit la vectorisation ?** Sur le **TEXTE de ton projet** : tes **chapitres** et tes **fiches d'Univers (lore)**. Elle les transforme en **empreintes de sens** (des vecteurs = des listes de 768 nombres). Fait au fil de l'écriture.

**« Proposition Ariane » et « enrichir le lore » = la même chose.** Ariane = le nom de l'assistante ; ses propositions sont de 2 saveurs, mais **même moteur** :
- 🌍 enrichir le **lore / l'Univers** (fiches personnages, lieux, événements, connexions) → s'affiche dans le menu **Univers** ;
- ✍️ **directions narratives** (pistes pour la suite) → s'affiche dans le **Scénario**.

**Comment on trouve les 5 passages « les plus proches » — proches de QUOI ?**
1. On prend le **passage courant** (le chapitre que tu viens d'écrire) → on en fait une empreinte.
2. On compare cette empreinte à **toutes les autres** du projet.
3. On garde les **5 dont le sens est le plus proche** de ce chapitre courant, puis on donne **seulement ces 5** à l'IA qui rédige les propositions.

**Sur quoi se juge la pertinence ?** Sur la **ressemblance de sens**, mesurée par un **angle** : chaque texte est une « flèche » dans l'espace, et le modèle place les textes au sens proche dans la **même direction**. Le score = **similarité cosinus** (cosinus de l'angle) : flèches parallèles → ≈ 1, sans rapport → ≈ 0. On trie, on garde le **top-5**, et on **jette tout ce qui est sous 0,65** (si rien n'est assez proche → Ariane ne propose rien plutôt que d'inventer).

**Le point fort à marteler** : ce n'est **pas** une recherche par mots-clés, c'est **par le sens**. « Il déterra un artefact ancien » et « elle trouva une relique enfouie » n'ont aucun mot commun mais pointent dans la même direction → l'IA comprend que c'est la même idée. Un Ctrl+F ne trouverait jamais ça.

**Exemple concret** : tu écris « Elara entre dans le temple oublié. » → la vectorisation retrouve les 5 passages liés (le chapitre 3 où le temple était évoqué, la fiche d'Elara…) → l'IA propose *« crée une fiche Temple oublié »* (lore) ou *« Elara pourrait y retrouver l'objet du chapitre 3 »* (direction narrative).

**Pourquoi vectoriser ?** Pour ne **pas** faire relire tout le projet à l'IA (trop lourd/cher sur 50 chapitres). On lui sert **uniquement les 5 passages utiles** → pertinent, rapide (~4 ms), coût quasi nul.

### 🎤 Phrases prêtes à dire
- **Vectorisation (court)** : « Plutôt que faire relire tout le projet à l'IA, je transforme chaque texte en empreinte de sens. Quand Ariane suggère, elle retrouve les 5 passages les plus proches du chapitre en cours et ne travaille que sur eux : pertinent, rapide, peu coûteux. »
- **Pertinence (si on pousse)** : « La pertinence se juge sur le sens, pas les mots : je mesure la proximité par un calcul d'angle — la similarité cosinus — entre le chapitre courant et le reste du projet, et je garde le top-5. Techniquement : 768 dimensions via Gemini, recherche pgvector en ~4 ms. »
- **Détection ≠ enrichissement** : « Deux mécanismes : la détection d'incohérences tourne sur une mémoire compressée ; les propositions d'enrichissement tournent sur la vectorisation. NarraMind est le nom de cette couche maison. »

**Si le jury creuse :**
- *« NarraMind, c'est juste Gemini ? »* → non. Gemini est le moteur ; NarraMind est ma couche propriétaire (compression + détection + vectorisation) qui le rend utile sur la durée. C'est mon IP, pas un simple appel d'API.
- *« La vectorisation sert ailleurs ? »* → non : uniquement les **propositions** d'Ariane. Ni la détection d'incohérences (mémoire compressée), ni la génération d'images.

---

## Slide 12 — Business Model Canvas

**Message clé** : le modèle tient en une vue, avec **un seul vrai levier de marge**.

**À aborder :**
- **Partenaires** : FAL.ai, Supabase, Vercel, Google Gemini (Groq en secours).
- **Ressources clés** : FLUX.2 Pro, **prompts système propriétaires**, **NarraMind** (mon IP).
- **Revenus** : abonnements + packs de crédits.
- **Coûts** : fixes légers (Supabase ~25 €, Vercel ~20 €) ; variable = **~0,06 €/génération d'image** (Gemini texte ~0,005 $/appel, marginal).

**💡 Le pourquoi — « un seul levier de marge » :** tes coûts fixes sont ridicules (~50 €/mois) et ne bougent pas avec le nombre d'utilisateurs. Le **seul** coût qui grandit avec l'usage, c'est la génération d'images (FAL.ai, 0,06 €). Donc ta rentabilité se joue sur **un unique curseur** : le prix de l'abonnement rapporté au nombre de générations consommées. C'est ce que le modèle à crédits contrôle. Et pourquoi Gemini est en **Partenaire** mais NarraMind en **Ressource** : Gemini, tu le **loues** (moteur externe) ; NarraMind, tu l'as **construit** (actif propre). Analogie : Gemini = le four loué, NarraMind = la recette secrète.

**Si le jury creuse :**
- *« Et si FAL.ai augmente ses prix ? »* → c'est mon vrai risque de marge ; réversibilité possible (autre fournisseur multi-référence) et, à l'échelle, infra dédiée.

---

## Slide 13 — Pricing · logique Spotify

**Message clé** : même qualité pour tous, on ne fait payer que le **volume**.

**À aborder :**
- **Libre 0 €** / 20 crédits · **Créateur 12,99 €** / 100 · **Studio 29,99 €** / 250 · **Entreprise** sur devis.
- **Toutes les fonctions ouvertes, même en gratuit** (y compris FLUX.2 Pro).
- 1 crédit = 1 génération (asset, sheet, bloc de case).

**💡 Le pourquoi — la « logique Spotify » :** la plupart des outils brident les **features** au gratuit (« débloquez la HD en payant »). Toi non : tout est ouvert, on ne limite que le **volume de crédits**. Pourquoi ? Parce que l'utilisateur gratuit **éprouve la pleine valeur** (le wow moment), se projette, crée son projet — puis il passe payant **parce qu'il en veut plus**, pas parce qu'on lui a bloqué une porte. Tu convertis par le **désir**, pas par la **frustration** : c'est un moteur d'adoption et de viralité bien plus puissant.

**Si le jury creuse :**
- *« Vous ne bridez rien, c'est risqué ? »* → non, c'est le pari : maximiser l'activation. Le coût marginal d'un utilisateur gratuit est quasi nul (crédits limités), et il devient mon canal d'acquisition.

---

## Slide 14 — 5 barrières → 5 réponses

**Message clé** : à chaque frein réel, une **réponse technique** concrète.

**À aborder :**
- Artistique → génération IA · Incohérence → Sheet System · Fragmentation → tout-en-un · Coût → modèle à crédits · Complexité → onboarding progressif.

**💡 Le pourquoi** : ce slide est ta **synthèse-preuve** avant les chiffres. Il montre que chaque brique du produit **répond à un blocage identifié** dans l'étude de marché — rien n'est là « parce que c'est cool ». C'est la jointure entre la partie « problème » et la partie « business ».

---

## Slide 15 — Dimensionnement (TAM / SAM / SOM)

**Message clé** : marché immense, objectif à 1 an **volontairement prudent** et rentable.

**À aborder :**
- **TAM ~160 M** : 10 M auteurs webfiction + 50 M créateurs de contenu + 100 M amateurs de webtoons.
- **SAM 5-10 M** : ceux freinés par la barrière artistique, WTP 10-30 €/mois.
- **SOM 25 000 inscrits → 600 payants à 12 mois** (~2,4 % de conversion).
- **CAC < 30 €** · **LTV/CAC > 3**.

**💡 Le pourquoi — l'entonnoir :** TAM/SAM/SOM sert à montrer que tu es **lucide**. Le TAM (160 M) prouve que le plafond est énorme (pas un marché de niche). Le SAM (5-10 M) resserre sur qui tu peux **vraiment** toucher. Le SOM (600 payants) est ton objectif **concret et modeste** à 1 an. L'erreur classique d'un candidat, c'est de promettre le TAM ; toi tu vises 600 payants — crédible et défendable. Et **LTV/CAC > 3** est la règle d'or : tant qu'un client rapporte plus de 3× ce qu'il coûte à acquérir, ta croissance est **saine** (tu ne brûles pas d'argent pour grossir).

**Si le jury creuse :**
- *« D'où sort le 160 M ? »* → 10 + 50 + 100 M (les 3 composantes).
- *« LTV et CAC ? »* → CAC = coût d'acquisition d'un client ; LTV = ce qu'il rapporte sur sa durée de vie (~237 € brut) ; ratio > 3 = sain.

---

## Slide 16 — Projections An 1

**Message clé** : ce que ça change, chiffré — et le **break-even très bas**.

**À aborder :**
- Impact : un chapitre passe de **1-4 semaines à 2-4 h** ; de **300-1500 € à < 5 €**.
- M12 : **25 000 inscrits**, **600 payants**, **~137 000 € d'ARR** (600 × 19 € × 12).
- **Équilibre dès 10-15 abonnés** payants, **sans lever de fonds**.

**💡 Le pourquoi — pourquoi le break-even bas change tout :** la plupart des startups doivent lever des fonds pour survivre avant d'être rentables. Toi non : comme tes coûts fixes sont ~50 €/mois, **10-15 abonnés Créateur** (≈ 12,99 € × 12) suffisent à les couvrir. Conséquence stratégique majeure : tu n'es **pas dépendant d'une levée**, tu ne dilues pas ton capital, et tu peux avancer à ton rythme. Les 600 payants ne sont pas un seuil de survie, c'est déjà **10× au-dessus** du point mort.

**Si le jury creuse :**
- *« 2 % ou 6 % de conversion ? »* → une rampe sur l'année ; l'objectif 600/25 000 ≈ 2,4 %, donc hypothèse **basse et prudente**.
- *« 137 k€, comment ? »* → 600 payants × ARPU ~19 € × 12 mois.

---

## Slide 17 — Organisation & juridique

**Message clé** : je scale de façon **disciplinée** — équipe et statut grandissent **avec le revenu**.

**À aborder :**
- **Le pari** : seul, outillé par l'IA de dev, je porte la charge d'une **équipe de 3-5 développeurs**. Preuve : le produit existe et tourne.
- **~5 mois** (janvier 2026 → produit en ligne).
- **Recrutements gated par le revenu** (pas au feeling).
- **Statut par paliers** : Auto-entrepreneur → SASU (au-delà de 30 k€ de CA/an) → SAS.

**💡 Le pourquoi — le parcours de statut en détail (ta question) :**

Le principe général : **on adapte la structure juridique à l'étape**, on ne prend pas une grosse structure trop tôt (coûteuse, complexe) ni une petite trop longtemps (limitante).

- **Auto-entrepreneur au lancement.** Pourquoi commencer là : c'est **gratuit, immédiat, ultra-simple** (déclaration en ligne, comptabilité allégée). Surtout, tu ne paies des charges **que sur ce que tu encaisses** — 0 € de CA = 0 charge. Parfait quand tu débutes et que le revenu est faible ou nul. Sa limite : un **plafond de CA** (~77 700 €/an en prestations de services) et tu es taxé sur le **chiffre d'affaires**, sans pouvoir déduire tes dépenses réelles.

- **Passage en SASU au-delà de ~30 k€ de CA/an.** Pourquoi basculer — trois raisons :
  1. **Fiscal** : en SASU tu es imposé sur le **bénéfice** (CA − charges), pas sur le CA brut. Dès que tes dépenses montent (marketing, serveurs, sous-traitance), tu peux les **déduire** — ce que l'auto-entreprise ne permet pas. Tu optimises aussi entre **salaire** et **dividendes**.
  2. **Protection** : la SASU est une **société** (personne morale distincte de toi). Ta **responsabilité est limitée à tes apports** → ton patrimoine personnel est protégé si ça tourne mal. En auto-entrepreneur, la séparation est plus faible.
  3. **Crédibilité** : une société inspire davantage confiance pour signer du **B2B**, contractualiser avec des partenaires, et préparer une éventuelle **levée**.
  > Pourquoi 30 k€ et pas le plafond de 77,7 k€ ? Parce qu'on ne bascule pas « quand on est **obligé** », mais « quand ça **devient avantageux** » : autour de 30 k€, le gain fiscal (déduction des charges) + la crédibilité compensent le surcoût de la SASU (comptable, formalités).

- **Passage en SAS si associés ou levée de fonds.** Pourquoi : la SAS, c'est la SASU… à **plusieurs**. Dès que tu prends un **associé** ou que tu **lèves des fonds**, il faut une structure capable d'**émettre des actions** à plusieurs investisseurs, avec une gouvernance souple. C'est le véhicule standard des startups qui lèvent.

**En une phrase à dire au jury** : « Je démarre en auto-entrepreneur parce que c'est gratuit et sans risque tant que le CA est faible ; je passe en SASU quand déduire mes charges et protéger mon patrimoine devient rentable ; et en SAS le jour où j'ai des associés ou une levée. La structure suit le revenu, jamais l'inverse. »

**Si le jury creuse :**
- *« Une seule personne, vraiment ? »* → le produit tourne, l'IA démultiplie (c'est le sujet de mon mémoire d'expertise).
- *« Quels premiers recrutements ? »* → Growth (acquisition), Customer Success (rétention), dev front junior (UI), déclenchés par des seuils de CA.
- *« Vous n'êtes pas juriste, c'est solide ? »* → c'est le schéma standard d'un créateur d'entreprise en France ; je m'appuierai sur un expert-comptable au moment de basculer.

---

## Slide 18 — Go To Market · 5 phases

**Message clé** : construire la **preuve** avant de dépenser ; le point critique est l'**activation**.

**À aborder :**
- **1** bêta fermée (100 early adopters) · **2** lancement public (Product Hunt) · **3** content marketing SEO / tutos · **4** partenariats influenceurs webtoon/manga (TikTok) · **5** B2B studios.
- Le point critique n'est pas l'acquisition, c'est l'**activation** (wow moment en < 10 min).

**💡 Le pourquoi — « la preuve avant de dépenser » :** l'ordre des phases n'est pas anodin. Tu commences par une **bêta fermée** (pas de budget marketing) pour **prouver l'activation** : est-ce que les gens ont le wow moment et reviennent ? Tant que ce n'est pas prouvé, dépenser en acquisition, c'est **remplir un seau percé**. Une fois l'activation validée, alors seulement tu ouvres les vannes (Product Hunt, SEO, influenceurs). Le B2B arrive en dernier parce qu'il exige un produit mûr et des références.

**Si le jury creuse :**
- *« Pourquoi Product Hunt / TikTok ? »* → Product Hunt = early adopters tech ; TikTok/influenceurs webtoon-manga = le canal viral naturel de Luna.

---

## Slide 19 — Stack · benchmark raisonné

**Message clé** : chaque brique **maximise ce qu'une seule personne peut livrer**, sans dépendance aveugle.

**À aborder :**
- **DB · Supabase** : Postgres + Auth + Storage + Edge Functions + sécurité par utilisateur (RLS), intégré.
- **IA · FAL.ai / FLUX.2 Pro** : **multi-référence native**, **condition du Sheet System**.
- **LLM · Gemini Flash + Groq en fallback (429)** : qualité + quotas + latence < 3 s ; Groq prend le relais si saturation.
- **FE · React / Vite / React Query + Edge Functions** : clés API côté serveur.

**💡 Le pourquoi — le critère unique de sélection :** chaque choix répond à **une** question : « qu'est-ce qui me fait gagner le plus de temps en solo ? »
- **Supabase** t'évite de recoder auth + stockage + sécurité (des semaines de travail) → tout est intégré.
- **FAL.ai** n'est pas choisi « au hasard » : c'est le seul à offrir la **multi-référence native**, et **sans multi-référence, pas de Sheet System, donc pas de cohérence**. C'est un choix **contraint par ta feature clé**.
- **Le fallback Groq** illustre ta philosophie : ne **jamais** dépendre d'un seul fournisseur. Si Gemini sature (erreur 429), Groq prend le relais **automatiquement**, invisible pour l'utilisateur. La robustesse prime sur l'attachement à une marque.

**Si le jury creuse :**
- *« Pourquoi FAL.ai et pas Replicate / Stability / DALL-E ? »* → seul avec la multi-référence native (condition Sheet System) + bon couple coût/latence.
- *« Pourquoi Supabase et pas Firebase ? »* → base relationnelle (Postgres) + RLS natif ; Firebase (NoSQL) mal adapté à des données relationnelles.

---

## Slide 20 — Cadre juridique IA

**Message clé** : je transforme le **risque juridique de l'IA** en **argument commercial de confiance**.

**À aborder — 3 piliers :**
- **Intervention humaine créative** (art. **L.111-1 CPI**) : choix humains à chaque étape → l'œuvre appartient à l'utilisateur.
- **Badge de transparence** : « Créé avec DreamWeave » → anticipe l'**AI Act**.
- **Couverture copyright** : FAL.ai garantit des droits d'usage commercial sur les visuels → risque porté en amont, pas par le créateur.

**💡 Le pourquoi — le raisonnement juridique, pilier par pilier :**
- **Intervention humaine.** La grande peur autour de l'IA : « une image générée par une machine, ça n'appartient à personne, donc je ne peux pas la vendre. » Ta réponse : en droit français (**L.111-1 CPI**), une œuvre est protégée s'il y a une **empreinte créative humaine**. Or ton utilisateur **choisit** le style, écrit les prompts, compose les cases — c'est **lui** l'auteur, l'IA n'est qu'un outil. Donc l'œuvre **lui appartient** et est protégeable.
- **Badge de transparence.** L'**AI Act** européen va **obliger** à signaler les contenus générés par IA. Plutôt que de le subir, tu l'**anticipes** avec la mention « Créé avec DreamWeave ». Tu es conforme **avant** la loi → ça devient un **signal de confiance**, pas une contrainte.
- **Couverture copyright** (celle que tu trouvais floue). Question : « ces images IA, est-ce qu'elles ne violent pas des droits d'auteur existants, et est-ce que j'ai le droit de les vendre ? » Réponse : le **fournisseur d'images (FAL.ai) garantit contractuellement** des droits d'usage commercial. Le risque est donc **assumé en amont** par le fournisseur (au niveau de l'entraînement et des licences de son modèle), **pas par ton créateur**. Ton utilisateur peut publier et monétiser **sereinement**.
- **La bascule stratégique** : face à des outils génériques qui n'adressent **rien** de tout ça, ta conformité devient un **argument de vente** (« avec DreamWeave, ton œuvre est à toi, déclarée, et sans risque de contrefaçon »).

**Si le jury creuse :**
- *« À qui appartient une image IA ? »* → à l'utilisateur, via son intervention créative (L.111-1).
- *« Le risque de contrefaçon ? »* → couvert en amont par la garantie commerciale de FAL.ai.
- *« C'est solide à 100 % ? »* → **sois honnête** : le droit de l'IA évolue ; ma stratégie **maximise** la protection (apport humain + transparence + garantie fournisseur), sans prétendre à une certitude absolue. Cette honnêteté joue pour toi.

---

## Slide 21 — Architecture de scale

**Message clé** : chaque limite d'aujourd'hui a **déjà son plan** — des choix de phase de lancement, pas des impasses.

**À aborder :**
- **BDD · Supabase** : gratuit aujourd'hui → Pro 25 €/mois → 100-500 €/mois au-delà de ~10 000 users.
- **IA · FAL.ai** : API partagée → infra IA dédiée à gros volume.
- **LLM · Gemini Flash** : palier gratuit + Groq → quotas payants (~0,005 $/appel), marginaux.
- **Style · Cohérence** : Sheet System aujourd'hui → modèle sur-mesure par personnage plus tard.

**💡 Le pourquoi — désamorcer l'objection « ça ne tiendra pas à l'échelle » :** un jury va forcément demander « et si vous avez 100 000 utilisateurs ? ». Ce slide **prend les devants** : pour chaque brique, tu nommes **la limite actuelle** ET **le plan**. Le message n'est pas « tout est déjà scalé » (ce serait du sur-engineering coûteux et inutile au lancement), mais « je **connais** mes limites et j'ai un plan pour chacune ». C'est la marque d'un builder lucide : on ne construit pas pour 100 000 users quand on en a 100, mais on sait **comment** on y arrivera.

**Si le jury creuse :**
- *« Votre cohérence tiendra à l'échelle ? »* → oui : le Sheet System suffit au lancement ; un modèle sur-mesure par personnage est une **évolution**, pas un prérequis.

---

## Slide 22 — Conclusion

**Message clé** : bon produit, bon moment, modèle rentable — la solution suffisante et livrable bat la parfaite et inatteignable.

**À aborder :**
- Marché en **+27,3 %/an**, créateurs déjà sur l'IA, **personne ne résout la cohérence**.
- De l'idée au chapitre publié, sans savoir dessiner, pour **< 5 € le chapitre** (vs 300-1500 €).
- Prototype qui **tourne**, **rentable dès 10-15 abonnés**.
- La phrase : **« la solution suffisante et livrable bat la solution parfaite et inatteignable. »**

---

## Slide 23 — Merci

**Message clé** : ouvrir les questions, avec assurance.

**À aborder :**
- Remercier, inviter aux questions.
- Rebonds prêts : coûts (FAL.ai), dépendance fournisseur, CAC/LTV, sources marché, copyright IA, NarraMind.

---

### Rebonds transverses à avoir en tête
- **Coûts** : fixes vs variables, sensibilité au prix FAL.ai, plan si hausse tarifaire.
- **Dépendance FAL.ai** : réversibilité, alternatives, coût d'un changement.
- **CAC < 30 € / LTV/CAC > 3** : savoir définir les deux et défendre les hypothèses.
- **Marché** : 8,28 Md$ (2023) sourcé, 45,3 Md$ (2030) = projection assumée.
- **Abandon** : faits (coût, délai, compétence), jamais de pourcentage chiffré.
- **Copyright IA** : intervention humaine (L.111-1), AI Act, couverture FAL.ai.
- **NarraMind** : couche propriétaire (mémoire compressée + détection + vectorisation), pas un simple appel Gemini.
- **Statut** : auto-entrepreneur (simple, gratuit) → SASU (déduire les charges + protéger le patrimoine + crédibilité) → SAS (associés / levée).
