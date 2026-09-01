# Script oral — Business Project · DreamWeave

> Ce que tu dis à voix haute, slide par slide, en langage de présentation normal.
> Durée cible : **20 minutes**. Minutage cumulé indiqué à chaque slide (~18:20, marge incluse).
> Les mêmes textes sont dans les **notes du présentateur** du PPTX (mode Présentateur PowerPoint).
>
> **Rythme :** ~135 mots/minute, assuré mais pas récité. Respire entre les slides. Regarde le jury.
> **Règle d'or :** chaque chiffre est adossé à une source (slide 24) ou à une preuve de réflexion assumée. Jamais de « % d'abandon » chiffré.
>
> **Deck à 25 slides** — ordre à jour : la slide « Une suite de décisions » a été retirée, et les **Cinq barrières** passent désormais **après le Pricing**.

---

## Slide 1 — Couverture · *0:30*

Bonjour. Je vais vous présenter **DreamWeave**, mon business project : un outil qui permet de créer un webtoon complet et cohérent grâce à l'IA, **sans savoir dessiner**. En vingt minutes, je vais couvrir le marché, la solution, le modèle économique et la faisabilité technique.

---

## Slide 2 — Le problème · *1:30*

Le marché du webtoon croît de **27 % par an** et pèsera **45 milliards de dollars en 2030**. Mais il y a un goulot d'étranglement : pour créer un webtoon, il faut savoir dessiner, ou payer **300 à 1 500 € par chapitre**, pour une à quatre semaines de travail. Sans cette compétence ni ce budget, beaucoup de créateurs abandonnent en cours de route. Résultat : la demande d'outils IA explose, **plus 200 % de recherches** « AI webtoon maker » en deux ans.

*(⚠️ ne jamais citer de pourcentage d'abandon chiffré.)*

---

## Slide 3 — Qu'est-ce qu'un webtoon · *2:20*

Deux mots sur le format. Un webtoon, c'est une bande dessinée **verticale**, qu'on lit en scrollant sur mobile, pensée pour la Gen Z. Pas de double page : une seule colonne continue, qui peut faire des dizaines de milliers de pixels de haut. C'est **exactement ce format** que DreamWeave produit, et c'est lui qui impose ma vraie contrainte technique : garder un personnage cohérent sur toute la longueur d'une série.

---

## Slide 4 — Le contexte · *3:05*

Le public est massif. La plateforme leader compte **170 millions de lecteurs** et **24 millions de créateurs** — et ce chiffre vient de son document réglementaire d'introduction en bourse, pas d'un blog. La romance domine, avec près de **40 % des revenus**, et l'audience est jeune. Le public est là, l'économie de créateurs aussi : ce qui manque, ce sont des **outils de production accessibles**.

---

## Slide 5 — TAM / SAM / SOM · *3:55*

On regarde le marché à trois niveaux. Le **TAM**, c'est tous les auteurs de webfiction du monde, autour de 160 millions. Le **SAM**, plus réaliste : les créateurs bloqués par le dessin, prêts à payer 10 à 30 € par mois, cinq à dix millions. Et le **SOM**, mon objectif à un an : **10 000 inscrits, 600 payants**, avec un coût d'acquisition sous 30 €. Des objectifs volontairement **prudents**.

---

## Slide 6 — Personas · *4:50*

J'ai identifié quatre personas à partir de données publiques. Ma cible primaire : **Luna**, la créatrice passionnée, prête à mettre 8 à 15 € par mois. Autour d'elle : Marc, l'auteur exigeant qui refuse de payer 300 à 1 500 € d'illustration par épisode ; Théo, l'étudiant prescripteur ; et Elodie, l'éditeur B2B qui veut passer de six mois à six semaines de production. Tous partagent **le même blocage** : produire des visuels cohérents. Ma décision : commencer par le **B2C**, qui finance l'apprentissage produit et génère les preuves sociales, puis ouvrir le **B2B** — la trajectoire qu'a suivie Dashtoon.

---

## Slide 7 — Concurrence · *5:45*

Dashtoon a le workflow, mais une **cohérence faible**. Clip Studio est la référence des pros, mais **refuse l'IA** et exige de savoir dessiner. AI Comic Factory est gratuit, mais reste un **rendu brut**. La place vide, c'est l'intersection **cohérence et accessibilité**, et c'est là que je me positionne. Ma force : FLUX.2 Pro pour tous, plus une mémoire narrative. Ma faiblesse, que j'assume : la dépendance à un fournisseur d'IA.

---

## Slide 8 — Décision fondatrice · *6:25*

Pourquoi ce produit et pas un autre ? J'ai écarté trois options : une marketplace, qui ne supprime ni le coût ni le délai ; un outil de dessin assisté, qui exige toujours de savoir dessiner ; et la génération one-shot, sans cohérence ni workflow. J'ai retenu un **pipeline complet, de l'idée au webtoon publiable**. C'est la seule option qui attaque la **cause** de l'abandon, et la cohérence sur la durée crée mon fossé concurrentiel.

---

## Slide 9 — La solution · *7:20*

Voici la solution, en **quatre étapes**. On fixe un **style** de référence. On génère les **assets** — personnages, décors — cohérents entre eux. On écrit le **scénario**, qui se découpe automatiquement en cases. Et dans l'**éditeur**, on compose chaque case, on ajoute les bulles, on exporte le chapitre. Le tout produit des visuels cohérents **en secondes**. Et ce que vous voyez tourne déjà : le prototype fonctionne.

---

## Slide 10 — Onboarding · *7:55*

Un éditeur complet, montré d'un coup, est intimidant, donc un facteur d'abandon. J'ai écarté deux extrêmes : tout exposer, écrasant ; et le wizard forcé, frustrant. J'ai retenu le **déblocage progressif**, guidé par l'assistant Ariane, avec des badges « New ». On garde un time-to-value sous dix minutes sans sacrifier la profondeur.

---

## Slide 11 — Sheet System · *9:05*  ⭐ CŒUR

Voici mon vrai différenciateur. Le problème : avec une génération naïve, **le même prompt donne un personnage différent** à chaque fois. Impossible pour un webtoon, où le lecteur doit reconnaître un héros du chapitre 1 au chapitre 50. J'ai écarté le seed fixe, qui casse dès qu'on change l'angle, et le LoRA par personnage, coûteux et lent. Ma solution : le **Sheet System**, une fiche du personnage sous **quatre angles**, réinjectée à chaque génération via FLUX.2 Pro Edit. J'obtiens environ **90 % du bénéfice d'un LoRA, pour une fraction du coût**. C'est un choix d'ingénieur : la solution suffisante et livrable bat la solution parfaite et inatteignable.

---

## Slide 12 — Génération par bloc · *9:45*

Une case n'est pas une image unique : c'est une composition de plusieurs blocs. Chaque bloc porte ses coordonnées, ses dimensions, son prompt et ses références d'assets, dans un layout JSONB, et se génère **indépendamment**. Résultat : l'auteur peut régénérer un seul bloc sans refaire toute la case. Indispensable à un vrai workflow créatif.

---

## Slide 13 — NarraMind · *10:30*

Dernière brique de cohérence : l'histoire elle-même. Injecter tous les chapitres en brut fait exploser le contexte, environ 850 tokens par chapitre. J'ai écarté la fenêtre glissante, qui oublie le lore ancien. Ma solution, NarraMind : je **compresse à une cinquantaine de tokens par chapitre** et j'ajoute une recherche vectorielle. La mémoire reste invisible : l'auteur ne voit que les **alertes d'Ariane**, jamais la plomberie.

---

## Slide 14 — Business Model Canvas · *11:10*

Le modèle en une vue. Mes partenaires : FAL.ai, Supabase, Vercel. Mes ressources clés : les modèles FLUX et surtout mes **prompts système propriétaires**. Les revenus : abonnements, packs de crédits, marketplace de styles à 30 %, API B2B. Et l'essentiel de mes coûts est **variable**, environ six centimes par génération : mon seul vrai levier de marge, c'est le ratio entre le prix de l'abonnement et le coût réel des générations.

---

## Slide 15 — Pricing · *12:05*

Mon pricing suit une **logique Spotify** : la même qualité pour tous, on ne fait payer que le volume. Libre gratuit avec 20 crédits, Créateur à 12,99 € avec 100, Studio à 29,99 € avec 250, et une offre **Entreprise sur devis** pour les studios. Toutes les fonctions sont ouvertes, **même en gratuit**. L'utilisateur gratuit éprouve la pleine valeur, puis passe payant **par manque de volume, pas par frustration**. Un gratuit me coûte environ 1,30 € par mois : absorbable, c'est ma stratégie d'acquisition.

---

## Slide 16 — Cinq barrières · *12:45*

Avant de passer aux chiffres, une synthèse. Cinq barrières empêchent aujourd'hui de créer un webtoon, et à chacune DreamWeave fait correspondre une réponse concrète : la barrière artistique, c'est la génération IA ; l'incohérence, le Sheet System ; la fragmentation des outils, le tout-en-un ; le coût, le modèle à crédits ; la complexité, l'onboarding progressif. C'est cette correspondance terme à terme qui structure tout le produit — et qui justifie les projections que voici.

---

## Slide 17 — Projections · *13:35*

Ce que ça change, chiffré. Un chapitre qui demandait une à quatre semaines se produit en deux à quatre heures, et un coût de 300 à 1 500 € tombe **sous 5 €**. Sur une hypothèse de conversion prudente, de 2 à 6 % sur douze mois, j'atteins **600 payants à un an, soit un revenu annuel récurrent d'environ 137 000 €**. Mais le point clé, c'est la **trajectoire** : je suis à l'équilibre opérationnel **dès dix à quinze abonnés**, sans avoir à lever.

---

## Slide 18 — Organisation et juridique · *14:15*

Qui délivre tout ça ? Mon pari : une **personne seule, outillée par l'IA de développement**, peut porter la complexité d'une équipe de trois à cinq. Les recrutements viennent ensuite, déclenchés par des **seuils de revenus**, pas à l'intuition. Même logique côté juridique : auto-entrepreneur, puis **SASU** au premier salarié ou à 30 000 € de chiffre d'affaires, puis **SAS** en cas d'associés ou de levée. Chaque transition est déclenchée par un **fait concret**, jamais par le calendrier. Le développement du produit prend **quatre à six mois**.

---

## Slide 19 — Go To Market · *15:00*

La mise sur le marché se fait en **cinq phases**. Une bêta avec une dizaine de pilotes. Le lancement public du gratuit. Le content marketing — SEO et tutoriels. Une phase d'influence avec des créateurs. Et en parallèle, une offre B2B pour les studios. Le point critique, ce n'est pas l'acquisition : c'est **l'activation**, le wow moment en moins de dix minutes. Je ne dépense en marketing qu'une fois cette activation prouvée.

---

## Slide 20 — Stack technique · *15:40*

Le prototype fonctionne, et chaque brique répond à un même fil conducteur : **maximiser ce qu'une seule personne peut livrer et maintenir**. Supabase me donne la sécurité par utilisateur dès le premier jour. FAL.ai et FLUX.2 Pro offrent la multi-référence native — sans elle, pas de Sheet System — et une couverture copyright. Gemini pour le texte, avec un fallback Groq automatique. Mes dépendances sont **assumées et réversibles**.

---

## Slide 21 — Cadre juridique IA · *16:15*

Un sujet que le jury attend : le droit de l'IA. Ma stratégie, c'est d'en faire un **argument commercial**. Trois piliers. Une **intervention humaine créative** à chaque étape — style, prompt, composition — qui sécurise la propriété de l'œuvre en droit français. Un **badge de transparence** sur les exports, qui anticipe l'obligation de déclaration de l'AI Act. Et une **couverture copyright** héritée de FAL.ai, qui porte le risque en amont, pas sur le créateur. DreamWeave se positionne comme l'outil le plus conforme du secteur.

---

## Slide 22 — Architecture de scale · *16:55*

Et à l'échelle ? Soyons honnêtes. J'ai fait l'exercice inverse d'un pitch : pour chaque composant, je nomme sa **limite actuelle** et son **plan** pour passer les dix mille utilisateurs actifs. La base Supabase est gratuite jusqu'à ce palier, puis passe à une offre payante. L'infrastructure IA se dédie et s'optimise à l'échelle. Et la cohérence, aujourd'hui portée par les références du Sheet System, passera au **LoRA plus tard** — une évolution de scale, pas un prérequis du lancement. Mes choix d'aujourd'hui sont des choix de **phase de lancement, pas des impasses** : chaque limite a déjà son plan.

---

## Slide 23 — Conclusion · *17:45*

Pour conclure : le marché grandit vite, **86 % des créateurs utilisent déjà l'IA**, et personne ne résout vraiment la cohérence. DreamWeave arrive au bon moment : de l'idée au chapitre publié, sans savoir dessiner, pour **moins de 5 € le chapitre**. Ce n'est pas un concept — le prototype tourne — et le modèle est soutenable dès le premier utilisateur gratuit. La phrase qui a guidé tous mes choix : **la solution suffisante et livrable bat la solution parfaite et inatteignable**.

---

## Slide 24 — Sources · *18:05*

Un mot sur la rigueur. Chaque chiffre de cette présentation vient soit d'une **source publique vérifiable**, à gauche, soit d'une **enquête ou d'un calcul que j'assume**, à droite. Je garde cette slide affichée : si un chiffre vous interpelle, on y revient.

---

## Slide 25 — Merci · *18:20*

Merci de votre attention. Je suis à votre disposition pour vos questions.

---

### Slides backup à préparer (Q&A)
- **Coûts détaillés** : fixes vs variables, sensibilité au prix FAL.ai, plan si hausse tarifaire.
- **Risques** : dépendance FAL.ai (réversibilité), entrée d'Adobe/Canva, copyright IA.
- **Abandon** : faits sourcés (coût, délai, compétence) + observation des communautés (r/webtoons, Tapas) — pourquoi aucun % chiffré n'est avancé.
