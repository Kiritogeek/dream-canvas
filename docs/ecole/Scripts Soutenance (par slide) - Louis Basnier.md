# Scripts de soutenance — Louis Basnier · Promotion 2026

Deux présentations, calibrées **15 minutes** chacune. Sous chaque slide : le **minutage indicatif** (durée de la slide · temps cumulé) et le **texte à dire**.

**Conseils de rythme**
- Vise **~130 mots/minute** : ni trop vite, ni récité. Respire entre les slides.
- Les phrases en *italique* sont des **transitions** : elles enchaînent proprement sur la slide suivante.
- Regarde le jury, pas les slides. Les slides sont un appui, pas un prompteur.
- Garde **1 à 2 minutes de marge** pour les questions si on te coupe.

---

# 1 — Présentation Business Project
**15 slides · ~15 min · thème sombre DreamWeave**

### Slide 1 — DreamWeave (couverture) · ⏱ ~30 s · *0:30*
Bonjour. Je vais vous présenter **DreamWeave**, mon business project : un outil qui permet de créer un webtoon complet et cohérent grâce à l'IA, **sans savoir dessiner**. En quinze minutes, je vais couvrir le marché, la solution, le modèle économique et la faisabilité technique.
*Commençons par le problème.*

### Slide 2 — Le problème · ⏱ ~70 s · *1:40*
Le marché du webtoon croît de **27 % par an** et pèsera **45 milliards de dollars en 2030**. Mais il y a un goulot d'étranglement : pour créer un webtoon, il faut savoir dessiner, ou payer **300 à 1 500 € par chapitre**, pour une à quatre semaines de travail. Résultat : la demande d'outils IA explose, **+200 % de recherches** « AI webtoon maker » en deux ans.
*C'est exactement cet écart que DreamWeave vient combler. Mais d'abord, de quoi parle-t-on ?*

### Slide 3 — Le contexte · ⏱ ~60 s · *2:40*
Le webtoon, c'est une bande dessinée **verticale**, qu'on lit en scrollant sur mobile, pensée pour la Gen Z. La plateforme leader compte **170 millions de lecteurs** et **24 millions de créateurs**. La romance domine, avec près de **40 % des revenus**. Le public est là, l'économie de créateurs aussi : ce qui manque, ce sont des **outils de production accessibles**.

### Slide 4 — Les personas · ⏱ ~65 s · *3:45*
J'ai identifié quatre personas à partir de données publiques. Ma cible primaire : **la créatrice passionnée**, qui a des histoires mais ne sait pas dessiner, prête à mettre 8 à 15 € par mois. Autour d'elle : l'auteur amateur plus exigeant, l'étudiant très sensible au prix, et l'éditeur indépendant en B2B. Tous partagent **le même blocage** : produire des visuels cohérents.

### Slide 5 — TAM / SAM / SOM · ⏱ ~65 s · *4:50*
On regarde le marché à trois niveaux. Le **TAM**, c'est tous les auteurs de webfiction du monde. Le **SAM**, plus réaliste : les créateurs bloqués par le dessin, prêts à payer 10 à 30 € par mois. Et le **SOM**, mon objectif à un an : **10 000 inscrits, 600 payants**, avec un coût d'acquisition sous 30 € et un ratio valeur-vie sur coût supérieur à 3 pour 1. Des objectifs volontairement **prudents**.

### Slide 6 — Concurrence & SWOT · ⏱ ~70 s · *6:00*
Dashtoon a le workflow, mais une **cohérence faible** d'une case à l'autre. Clip Studio est la référence des pros, mais **refuse l'IA** et exige de savoir dessiner. AI Comic Factory est gratuit, mais reste un **rendu brut**, pas un produit. La place vide, c'est l'intersection **cohérence + accessibilité**. Ma force : la qualité FLUX.2 Pro pour tous, plus une mémoire narrative. Ma faiblesse assumée : la dépendance à un fournisseur d'IA.

### Slide 7 — La solution · ⏱ ~65 s · *7:05*
Voici la solution, en **quatre étapes**. On fixe un **style** de référence. On génère les **assets**, personnages et décors, cohérents entre eux. On écrit le **scénario**, qui se découpe automatiquement en cases. Et dans l'**éditeur**, on compose chaque case, on ajoute les bulles, on exporte le chapitre. Le tout produit des visuels cohérents **en secondes**, sans savoir dessiner.

### Slide 8 — Le cœur technique · ⏱ ~70 s · *8:15*
Mon vrai différenciateur, c'est la **cohérence**. Trois briques. Le **Sheet System** : une fiche du personnage sous quatre angles, réinjectée à chaque génération. **NarraMind** : une mémoire narrative qui alerte quand le scénario se contredit. Et **FLUX.2 Pro Edit**, qui génère chaque case à partir de la sheet. Résultat : un personnage qui reste lui-même **sur des dizaines de chapitres**.

### Slide 9 — Business Model Canvas · ⏱ ~65 s · *9:20*
Le modèle en une vue. Mes partenaires : FAL.ai pour l'IA image, Supabase, Vercel. Mes ressources clés : les modèles FLUX et surtout mes **prompts système propriétaires**. Les revenus : abonnements, packs de crédits, marketplace de styles à 30 %, et API B2B. Et l'essentiel des coûts est **variable**, environ 6 centimes par génération : je ne paie que ce que les utilisateurs consomment.

### Slide 10 — Pricing · ⏱ ~70 s · *10:30*
Le pricing suit une **logique Spotify** : la même qualité pour tous, on ne fait payer que le volume. Libre gratuit avec 20 crédits, Créateur à 12,99 € avec 100 crédits, Studio à 29,99 € avec 250 crédits. Toutes les fonctionnalités sont ouvertes, **même en gratuit**. Un crédit me coûte environ 6 centimes et demi : un utilisateur gratuit reste soutenable, c'est ma **stratégie d'acquisition**.

### Slide 11 — Projections Année 1 · ⏱ ~60 s · *11:30*
Ce que ça change, chiffré. Un chapitre qui demandait **une à quatre semaines** se produit en **deux à quatre heures**. Un coût de **300 à 1 500 €** tombe **sous 5 €**. La proposition de valeur est massive et facile à comprendre. Mon objectif financier à un an reste prudent : **600 clients payants**, ce qui valide le modèle avant de chercher à grandir.

### Slide 12 — Go to Market · ⏱ ~65 s · *12:35*
La mise sur le marché se fait en **cinq phases**. Une **bêta** avec une dizaine de pilotes. Le **lancement** public du gratuit. Le **content marketing** — SEO et tutoriels — pour capter la demande qui cherche déjà « AI webtoon maker ». Une phase d'**influence** avec des créateurs qui montrent le résultat. Et en parallèle, une offre **B2B** pour les studios. On commence par le freemium, l'acquisition la moins chère.

### Slide 13 — Faisabilité technique · ⏱ ~65 s · *13:40*
Ce n'est pas qu'un concept : le **prototype fonctionne**. Un front React sur Vercel, un back-end Supabase avec sécurité par utilisateur, l'IA image via FAL.ai et FLUX, l'IA texte via Gemini. Les trois défis que je m'étais fixés sont levés : la **cohérence** grâce au Sheet System, le **coût** grâce aux crédits, et une architecture pensée pour **passer les 10 000 utilisateurs**.

### Slide 14 — Conclusion · ⏱ ~55 s · *14:35*
Pour conclure : le marché grandit vite, **86 % des créateurs utilisent déjà l'IA**, et personne ne résout vraiment la cohérence. DreamWeave arrive au bon moment, avec la bonne réponse : de l'idée au chapitre publié, sans savoir dessiner, pour **quelques euros**. Un produit prouvé par un prototype, avec un modèle soutenable dès le premier utilisateur gratuit.

### Slide 15 — Merci · ⏱ ~20 s · *14:55*
Merci de votre attention. Je suis à votre disposition pour vos questions.

---

# 2 — Présentation Mémoire de fin d'études
**11 slides · ~15 min · thème clair DreamWeave**

### Slide 1 — Grandir sans s'en apercevoir (couverture) · ⏱ ~45 s · *0:45*
Bonjour. Mon mémoire s'intitule **« Grandir sans s'en apercevoir »**. Ce n'est pas un CV chronologique. C'est un retour honnête sur cinq années, à travers les objets que j'ai réellement produits — un rapport, une ethnographie, un logiciel — pour comprendre **comment ma façon de penser a changé** sans que je m'en rende compte sur le moment.
*Laissez-moi d'abord vous expliquer l'angle que j'ai choisi.*

### Slide 2 — Introduction, l'angle · ⏱ ~90 s · *2:15*
Tout est parti d'un détail. En préparant ce mémoire, j'ai retrouvé dans mes archives un **texte que j'avais écrit à dix-neuf ans**, où je me décrivais. Je n'en avais aucun souvenir, et pourtant j'en reconnaissais chaque phrase. C'est ce texte qui m'a fait comprendre ce que je voulais vraiment raconter. J'ai donc refusé le CV chronologique. J'ai préféré **repartir des objets concrets** que j'ai produits, et me demander, pour chacun, ce qu'il avait changé en moi — pas seulement en compétences, mais dans ma manière de raisonner. « **Sans concession** », ça ne veut pas dire se flageller : ça veut dire refuser la version marketing de soi, celle du CV, et regarder ce que chaque projet a **vraiment** coûté et appris.
*Commençons par la première année.*

### Slide 3 — Année 1, Le choix · ⏱ ~95 s · *3:50*
Je suis arrivé à la Web School Factory par un chemin indirect, sur le conseil d'une conseillère d'orientation. La première année, c'est surtout une année d'**atterrissage**. Et un vrai choc : la découverte de l'**UX**. Jusque-là, « faire un site », pour moi, c'était écrire du code. J'ai découvert qu'il existait, en amont, toute une couche de réflexion sur l'utilisateur — et que c'était précisément **cette couche qui m'intéressait le plus**. L'été, j'ai fait deux stages qui n'avaient rien en commun : du développement React à l'Aéroclub Paris Sud, et du CRM et du marketing chez Jones Lang LaSalle. La technique d'un côté, le business de l'autre. Je n'ai **jamais tranché** entre les deux. Et cinq ans plus tard, cette indécision porte un nom : **Product Owner**.
*Deuxième année : un exercice qui m'a appris à me regarder.*

### Slide 4 — Année 2, Le miroir · ⏱ ~90 s · *5:20*
En deuxième année, un exercice de méthodologie m'a demandé de mener une **ethnographie** de terrain. J'ai choisi les personnes sans-abri du métro parisien. Ce que j'en retiens n'est pas une compétence technique, mais une **méthode** : avant de juger une situation ou un utilisateur, se demander **depuis quelle position je regarde**. C'est devenu un réflexe professionnel — aujourd'hui, quand j'écris une spécification pour un métier que je n'exerce pas, je commence par là. J'ai aussi compris que **la forme compte** autant que le fond : bien ordonner ses idées, c'est capter l'attention de l'autre. Et c'est cette année-là, fin 2022, que l'**IA générative** est entrée dans ma vie — discrètement, sans que je mesure que c'était une bascule.
*Troisième année : l'année la plus technique.*

### Slide 5 — Année 3, Le saut · ⏱ ~95 s · *6:55*
La troisième année a été la plus technique. Trois exercices **Flutter** conséquents, et une application « Star Wars » présentée en vidéo, qui reste l'un des rendus dont je suis le plus fier : c'était la première fois que je tenais un projet **de bout en bout, seul, sans filet**. J'y ai compris la différence entre **démontrer** et **livrer** : livrer, ça apprend ce qu'aucun prototype de cours ne montre. Et puis il y a eu **Dublin**, un semestre à l'ISB. Là-bas, on travaillait sur de petits projets, entièrement en anglais, dans une autre logique d'apprentissage. Ce que je retiens de Dublin, c'est moins les compétences que le **dépaysement** et l'**autonomie** : vivre seul plusieurs mois, m'organiser sans mes repères, gérer un quotidien entier en anglais. J'en suis revenu un peu plus adulte.
*Quatrième année : le passage au terrain.*

### Slide 6 — Année 4, Le terrain · ⏱ ~100 s · *8:35*
La quatrième année marque une bascule nette : le début de mon **alternance chez Naxos**, comme Product Owner apprenti, sur les logiciels immobiliers du groupe Arche. Pour la première fois, tout ce que j'avais appris de façon cloisonnée — le code, l'UX, le produit — a dû cohabiter dans un seul rôle, avec de vrais utilisateurs et de vraies conséquences. Concrètement, mon métier suit un cycle : je **recueille un besoin**, je le traduis en **spécifications**, je rédige des **tickets**, je fais **développer**, je **teste**, et je fais mes **retours** jusqu'à ce que ce soit juste. Ce que j'ai compris, c'est qu'on n'apprend pas un métier en l'observant de loin : on l'apprend **en produisant**, et en écoutant ceux qui le vivent corriger ce qu'on produit. Le vrai apprentissage de l'entreprise, ce n'est pas un livrable : c'est un **changement de rythme et de responsabilité**.
*Cinquième année : l'IA devient centrale.*

### Slide 7 — Année 5, L'outil · ⏱ ~90 s · *10:05*
La dernière année tourne autour d'un fil unique : comprendre ce que l'IA change **concrètement** à mon métier. Un rapport sur l'IA et le droit européen, un procès fictif, et surtout le **vibe coding**, auquel je me suis vraiment mis début 2026. Ma conviction, c'est que l'IA **ne remplace pas la compétence** : elle démultiplie ce qu'une seule personne peut produire. Le vibe coding est devenu mon **point d'équilibre** : assez technique pour construire, assez produit pour penser. Et ma vraie découverte de l'année, ce n'est pas une réussite ponctuelle, c'est une **évidence** sur ce que j'aime vraiment faire.
*Et cette évidence, elle a un nom de projet.*

### Slide 8 — Projet miroir, DreamWeave · ⏱ ~90 s · *11:35*
**DreamWeave**, c'est un logiciel de création de webtoons par IA que j'ai imaginé et **construit seul**, sans que personne me donne le sujet. C'est le projet miroir de tout ce mémoire, parce qu'un projet mené **par envie**, avant toute consigne, en dit bien plus long sur qui l'on est que n'importe quel exercice imposé. Concrètement : l'utilisateur part d'un style, génère ses personnages, écrit son scénario, et compose ses planches, jusqu'à l'export. Le vrai défi que je me suis attaqué, c'est la **cohérence** d'un personnage d'un chapitre à l'autre — le point sur lequel les outils existants échouent. C'est la preuve concrète de ce que je sais construire **de bout en bout**, de l'idée au produit qui tourne.
*Alors, où est-ce que j'en suis vraiment ?*

### Slide 9 — Bilan, sans concession · ⏱ ~90 s · *13:05*
Le bilan, sans complaisance. Ce que je sais faire : tenir la chaîne **du besoin à la spécification jusqu'au système** qui fonctionne, de bout en bout, seul. Ma limite, elle, n'est pas technique. C'est la **décision sans filet** : je n'ai jamais eu à porter seul un choix produit qui coûterait cher à l'entreprise s'il se révélait mauvais. Toute ma prise de responsabilité est restée, jusqu'ici, sous supervision — un professeur, un manager. Le vrai test viendra quand cette supervision **disparaîtra**. Mais au fond, exécuter les produits des autres et porter les miens ne s'opposent pas : **c'est la même compétence**, à deux échéances.
*Ce qui m'amène à ce que je veux devenir.*

### Slide 10 — Conclusion, ce que je veux devenir · ⏱ ~80 s · *14:25*
Ma direction est aujourd'hui claire. Je veux être **Product Owner**, parce que c'est précisément là que se rejoignent mes compétences techniques et produit : recueillir un besoin, le traduire, l'intégrer dans un système qui fonctionne. Et au-delà, je veux être un **Product Builder** : quelqu'un qui pense le produit **et** se donne les moyens de le construire lui-même, en faisant de l'IA un **prolongement** de ses compétences, pas une béquille. C'est la direction que tout ce parcours dessine, et celle dans laquelle je m'engage pleinement.

### Slide 11 — Merci · ⏱ ~20 s · *14:45*
Merci de votre écoute. Je suis prêt à répondre à vos questions.

---

*Durées indicatives, à ajuster selon ton débit. Les deux tiennent dans les 15 minutes avec une petite marge pour respirer et pour les transitions.*
