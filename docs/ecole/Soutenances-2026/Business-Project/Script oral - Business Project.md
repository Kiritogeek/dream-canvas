# Script oral — Business Project · DreamWeave

> Ce que tu dis à voix haute, slide par slide, en langage de présentation normal (première personne, ton posé).
> Durée cible : **20 minutes**. Minutage cumulé indiqué à chaque slide.
> Les mêmes textes peuvent aller dans les **notes du présentateur** du PPTX (mode Présentateur PowerPoint).
>
> **Rythme :** ~135 mots/minute, assuré mais pas récité. Respire entre les slides, regarde le jury.
> **Règle d'or :** chaque chiffre est adossé à une source ou à une réflexion assumée. **Ne jamais citer de pourcentage d'abandon chiffré.**
>
> **Deck à 30 slides** : parcours produit détaillé, Solution → Onboarding → Style → Assets (×2) → Univers → Scénario (×2) → Édition (×2).

---

## Slide 1 — Couverture · *0:30*

Bonjour. Je vais vous présenter **DreamWeave** : un outil qui permet de créer un webtoon complet et cohérent grâce à l'IA, **sans savoir dessiner**. De l'idée jusqu'au chapitre publié. En vingt minutes, je couvre le marché, la solution, le modèle économique et la faisabilité technique.

---

## Slide 2 — Qu'est-ce qu'un webtoon · *1:15*

Deux mots sur le format. Un webtoon, c'est une bande dessinée **verticale**, née en Corée, pensée pour le mobile : on la lit en **scroll continu**, sur une seule colonne. Une histoire se découpe en chapitres, et un chapitre n'a pas de longueur limite : il peut faire des dizaines de milliers de pixels de haut. C'est exactement ce format que DreamWeave produit, et c'est lui qui impose ma vraie contrainte : garder un personnage **cohérent** sur toute la longueur d'une série.

---

## Slide 3 — Le marché du Webtoon · *2:05*

Le marché est déjà massif : environ **11 milliards de dollars en 2025**, et il croît vite : on l'estime autour de **40 milliards à l'horizon 2030**. La demande d'outils IA, elle, explose déjà : **plus 200 % de recherches** « AI webtoon maker » en deux ans. Le public et l'argent sont là ; ce qui manque, ce sont des outils de production accessibles.

---

## Slide 4 — Un marché installé · *2:55*

Le public existe déjà. La plateforme leader compte **170 millions de lecteurs actifs par mois** et **24 millions de créateurs**, et ce chiffre vient de son document réglementaire d'introduction en bourse, pas d'un blog. La romance pèse près de **40 % des revenus**, l'audience est jeune, **76 %** ont entre 18 et 33 ans. Et surtout : **86 % des créateurs utilisent déjà l'IA**. Le terrain est prêt.

---

## Slide 5 — Le problème · *3:40*

Voici le goulot d'étranglement. Créer un seul chapitre coûte aujourd'hui **300 à 1 500 €** quand on ne sait pas dessiner, pour une à quatre semaines de travail, ou alors des mois pour apprendre à illustrer. Le blocage n'est pas l'envie : c'est le mur « savoir dessiner ». Sans cette compétence ni ce budget, beaucoup de créateurs abandonnent en cours de route.

*(⚠️ ne jamais citer de pourcentage d'abandon chiffré, parler de faits : coût, délai, compétence.)*

---

## Slide 6 — Cibles · *4:35*

Quatre profils, un même blocage. Ma cible primaire : **Luna**, la créatrice romance-fantasy, prête à mettre 8 à 15 € par mois. Autour d'elle : **Marc**, l'auteur exigeant qui refuse de payer 300 à 1 500 € d'illustration par épisode ; **Théo**, l'étudiant prescripteur ; et **Élodie**, le studio d'édition qui veut passer de six mois à six semaines. Tous partagent le même besoin : des **visuels cohérents en quelques clics**. Ma décision : commencer par le **B2C**, avec Luna et Marc.

---

## Slide 7 — Concurrence · *5:20*

Un quadrant encore vide. **Dashtoon** a le workflow, mais une cohérence faible d'une case à l'autre. **Clip Studio** est la référence des pros, mais refuse l'IA et exige de savoir dessiner. **AI Comic Factory** est gratuit, mais reste un rendu brut, pas un produit. La place vide, c'est l'intersection **cohérence + accessibilité** : le quadrant haut-droite. C'est là que je me positionne.

---

## Slide 8 — Décision fondatrice · *6:05*

Pourquoi ce produit, et pas un autre ? J'ai écarté trois options : une **marketplace**, qui ne supprime ni le coût ni le délai ; un **outil de dessin assisté**, qui exige toujours de savoir dessiner ; et la **génération one-shot**, sans cohérence ni workflow. J'ai retenu un **pipeline complet, de l'idée au webtoon publiable**. C'est la seule option qui attaque la **cause** de l'abandon, pas un symptôme.

---

## Slide 9 — La solution · *6:55*

Voici la solution : un parcours guidé en cinq étapes, qui produit des visuels cohérents **en secondes**. On définit un **Style**, on génère les **Assets**, on cartographie l'**Univers**, on écrit le **Scénario** qui se découpe en cases, et on compose dans l'**Édition**. Ce que vous allez voir tourne déjà : chaque capture vient du prototype.

---

## Slide 10 — Onboarding · *7:30*

Un éditeur complet montré d'un coup, c'est intimidant, donc un facteur d'abandon. J'ai écarté deux extrêmes : tout exposer, écrasant ; et le wizard forcé, frustrant. J'ai retenu le **déblocage progressif**, guidé pas à pas par un assistant, avec des badges « New ». On garde un time-to-value **sous dix minutes** sans sacrifier la profondeur.

---

## Slide 11 — Étape 1 · Style · *8:05*

Première étape : le **style**. On fixe un univers visuel de référence, couleurs, trait, ambiance, à partir d'images ou d'un template : manga, manhwa, webtoon. Ce style devient la **signature** du projet, réinjectée à chaque génération. Tout ce qui est produit ensuite s'y conforme.

---

## Slide 12 — Étape 2 · Assets · *8:50*

Deuxième étape : les **assets**. On décrit un **personnage**, un **objet** ou un **lieu**, et DreamWeave le génère. Le style du projet est **injecté dans le prompt** de l'asset, pour que tout reste cohérent. Techniquement, la génération passe par **FLUX**, dans une **Edge Function Supabase**.

---

## Slide 13 — Étape 2 · Cohérence visuelle · *9:35*

Et voici mon différenciateur sur la cohérence. Pour chaque asset, je génère un **Sheet** : une fiche composite du personnage sous **quatre angles**. Ce Sheet fige l'apparence, puis il est **réinjecté à l'Édition** : c'est ce qui garantit que le personnage reste identique, d'une case à l'autre, du chapitre 1 au chapitre 50.

---

## Slide 14 — Étape 3 · Univers · *10:10*

Troisième étape : l'**Univers**. Personnages, lieux, objets et événements se relient dans un **graph de connaissances**, enrichi directement depuis l'histoire. Deux piliers : la **cartographie**, pour saisir et relier les éléments du monde ; et l'**amélioration continue**, où les fiches se complètent au fil du scénario.

---

## Slide 15 — Étape 4 · Scénario · *11:00*

Quatrième étape : le **scénario**. Il n'est pas seulement écrit, il est **compris** par l'IA, en quatre temps. Un : **validation du texte**, le chapitre est confirmé. Deux : **détection d'assets**, l'IA repère les personnages, lieux et objets cités. Trois : **validation d'assets**, on confirme les éléments à relier. Quatre : **découpage IA**, le texte devient une suite de cases.

---

## Slide 16 — Scénario · cohérence scénaristique · *11:50*

C'est ici qu'intervient **Ariane**, mon assistante narrative. Elle lit le scénario, propose de l'**enrichir**, du lore, des directions narratives, et surtout elle **détecte les incohérences** sur toute la durée de l'histoire. Sous le capot, une mémoire narrative **compressée** : une cinquantaine de tokens par chapitre au lieu de près de 900, avec recherche vectorielle en 768 dimensions et pgvector. L'auteur ne voit que les alertes, jamais la plomberie.

---

## Slide 17 — Étape 5 · Édition · *12:25*

Cinquième étape : l'**Édition**. Une case se construit par blocs indépendants, qu'on ajoute et déplace librement : des **bulles** de dialogue, des **blocs couleur** pour les fonds, et des **blocs image** pilotés par un prompt.

---

## Slide 18 — Édition · rendu cohérent · *13:05*

Et c'est là que tout se recolle. L'Édition **reprend le découpage IA** du scénario, **détecte les assets** cités dans le prompt de chaque bloc, et **injecte les visuels** correspondants. Résultat : un rendu cohérent de la première à la dernière case, sans que l'auteur ait à refaire la continuité à la main.

---

## Slide 19 — Business Model Canvas · *13:45*

Le modèle en une vue. Mes partenaires : FAL.ai, Supabase, Vercel. Mes ressources clés : FLUX.2 Pro, mes **prompts système propriétaires**, et NarraMind, ma mémoire narrative. Les revenus : abonnements et packs de crédits. Côté coûts, quelques charges fixes, Supabase Pro autour de 25 €, Vercel autour de 20 €, et surtout un coût **variable d'environ 6 centimes par génération**. Mon seul vrai levier de marge, c'est le ratio entre le prix de l'abonnement et le coût réel des générations.

---

## Slide 20 — Pricing · logique Spotify · *14:35*

Mon pricing suit une **logique Spotify** : la même qualité pour tous, on ne fait payer que le **volume**. **Libre** gratuit avec 20 crédits, **Créateur** à 12,99 € avec 100, **Studio** à 29,99 € avec 250, et une offre **Entreprise** pour les studios. Toutes les fonctions sont ouvertes, **même en gratuit**. L'utilisateur gratuit éprouve la pleine valeur, puis passe payant **par manque de volume, pas par frustration**.

---

## Slide 21 — Cinq barrières, cinq réponses · *15:10*

Une synthèse avant les chiffres. Cinq barrières empêchent aujourd'hui de créer un webtoon, et à chacune je fais correspondre une réponse concrète : la barrière **artistique**, c'est la génération IA ; l'**incohérence** des personnages, le Sheet System ; la **fragmentation** des outils, le tout-en-un ; le **coût**, le modèle à crédits ; la **complexité**, l'onboarding progressif.

---

## Slide 22 — Dimensionnement · *15:55*

Je regarde le marché à trois niveaux. Le **TAM** : environ 160 millions de lecteurs webtoon. Le **SAM**, plus réaliste : 5 à 10 millions de créateurs ou créateurs en devenir. Et le **SOM**, mon objectif à un an : **10 000 inscrits, 600 payants**, avec un coût d'acquisition sous 30 € et un ratio valeur-vie sur coût d'acquisition supérieur à 3. Des objectifs volontairement **prudents**.

---

## Slide 23 — Projections An 1 · *16:35*

Ce que ça change, chiffré. Un chapitre qui demandait une à quatre semaines se produit en deux à quatre heures ; un coût de 300 à 1 500 € tombe **sous 5 €**. Sur une conversion prudente, de 2 à 6 % sur douze mois, j'atteins **600 payants à un an, soit un revenu annuel récurrent d'environ 137 000 €**. Mais le point clé, c'est la trajectoire : je suis à l'**équilibre dès dix à quinze abonnés** payants, sans avoir à lever de fonds.

---

## Slide 24 — Organisation et juridique · *17:10*

Qui délivre tout ça ? Mon pari : une **personne seule, outillée par l'IA de développement**, peut porter la complexité d'une équipe de trois à cinq. Le produit se livre en **quatre à six mois**. Les recrutements viennent ensuite, déclenchés par des **seuils de revenus**, pas à l'intuition. Même logique côté statut : auto-entrepreneur au lancement, puis **SASU** au premier salarié ou à 30 000 € de chiffre d'affaires, puis **SAS** en cas d'associés ou de levée.

---

## Slide 25 — Go To Market · *17:45*

La mise sur le marché se fait en **cinq phases** : une bêta fermée avec une dizaine de pilotes, le lancement freemium public, le content marketing SEO et tutoriels, une phase d'influence avec des créateurs, et enfin une ouverture B2B vers les studios. Le point critique, ce n'est pas l'acquisition : c'est l'**activation**. Je ne dépense en marketing qu'une fois le wow moment prouvé.

---

## Slide 26 — Stack technique · *18:15*

Le prototype fonctionne, et chaque brique suit un même fil : **maximiser ce qu'une seule personne peut livrer**. **Supabase** pour la base, avec sécurité par utilisateur. **FAL.ai et FLUX.2 Pro** pour la génération : multi-référence native, sans elle pas de Sheet System, et couverture copyright. **Gemini** pour le texte, avec un fallback **Groq** automatique. Et **React, Vite, React Query** plus des Edge Functions côté produit.

---

## Slide 27 — Cadre juridique IA · *18:45*

Un sujet que le jury attend : le droit de l'IA. Ma stratégie, c'est d'en faire un **argument**. Une **intervention humaine créative** à chaque étape, style, prompt, composition, qui sécurise la propriété de l'œuvre en droit français, au titre de l'article L.111-1 du Code de la propriété intellectuelle. Un **badge de transparence** « Créé avec DreamWeave » sur les exports, qui anticipe l'obligation de déclaration de l'AI Act. Et une **couverture copyright** héritée de FAL.ai, qui porte le risque en amont, pas sur le créateur.

---

## Slide 28 — Architecture de scale · *19:10*

Et à l'échelle ? Pour chaque brique, je nomme sa limite actuelle et son plan. Supabase est gratuit jusqu'à ~10 000 utilisateurs, puis passe à une offre payante. L'infrastructure IA se dédie et s'optimise à gros volume. Et la cohérence, aujourd'hui portée par le Sheet System, pourra passer plus tard à un **modèle sur-mesure par personnage**, une évolution de scale, pas un prérequis au lancement. Ce sont des choix de phase de lancement, pas des impasses.

---

## Slide 29 — Conclusion · *19:35*

Pour conclure : le marché grandit vite, la majorité des créateurs utilisent déjà l'IA, et personne ne résout vraiment la cohérence. DreamWeave arrive au bon moment : de l'idée au chapitre publié, sans savoir dessiner, pour **moins de 5 € le chapitre**, contre 300 à 1 500 € aujourd'hui. Le prototype tourne, et le modèle est **rentable dès dix à quinze abonnés**. La phrase qui a guidé tous mes choix : **la solution suffisante et livrable bat la solution parfaite et inatteignable.**

---

## Slide 30 — Merci · *19:50*

Merci de votre attention. Je suis à votre disposition pour vos questions.

---

### Questions probables à préparer
- **Coûts** : fixes vs variables, sensibilité au prix FAL.ai, plan si hausse tarifaire.
- **Dépendance FAL.ai** : réversibilité, alternatives, ce que ça coûterait de changer.
- **CAC < 30 € / LTV/CAC > 3** : savoir définir les deux termes et défendre les hypothèses.
- **Marché** : 11 Md$ (2025) sourcé, ~40 Md$ (2030) estimé, assumer que c'est une projection.
- **Abandon** : faits sourcés (coût, délai, compétence), jamais de pourcentage chiffré.
- **Copyright IA** : intervention humaine, AI Act, couverture FAL.ai.
