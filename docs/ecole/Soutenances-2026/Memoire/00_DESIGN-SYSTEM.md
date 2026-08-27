# Mémoire de fin d'études — Design System & Contenu

> **Présentation orale du mémoire « Grandir sans s'en apercevoir ».** Retour réflexif, **15 slides · 20 minutes**.
> Registre visuel : **LIGHT DreamWeave**, épuré, presque littéraire, beaucoup de blanc, une phrase-clé par slide.
> Ce fichier = le **look** (Partie A) **+** ce qui est **affiché sur chaque slide** (Partie C). Pour ce que tu dois **dire**, voir `slides/NN_*.md`.
> Source : `Mémoire de fin d'études - Louis Basnier.pdf`.
> ⚠️ **Ce n'est pas un pitch.** Le jury attend une **maturité réflexive**, pas une performance commerciale. Le pire écueil serait de « marketer » ce mémoire comme un CV.

---

# PARTIE A — DESIGN SYSTEM (mode LIGHT)

Même famille de marque que le Business Project, mais registre inversé : là où le deck d'investissement est sombre et punchy, le mémoire est **clair, calme, aéré**. Il vaut par la sincérité, pas par l'effet.

## A.1 — Palette

Dérivée des tokens light de l'app DreamWeave. L'accent lavande est utilisé **avec parcimonie** : le blanc porte le propos.

| Rôle | Token (HSL) | Hex | Usage |
|------|-------------|-----|-------|
| Fond principal | `220 12% 96%` | `#F4F4F6` | Fond de toutes les slides. Blanc cassé, jamais blanc clinique. |
| Surface / carte | `0 0% 100%` | `#FFFFFF` | Encadré d'artefact, citation. Ombre très douce. |
| Bordure | `220 12% 80%` | `#C6C9D1` | Filet fin, discret. |
| Texte principal | `270 22% 14%` | `#241C2C` | Titres, phrases-clés. Prune très sombre, pas noir. |
| Texte secondaire | `270 12% 40%` | `#665A72` | Corps, légendes, « le déplacement ». |
| **Accent lavande** | `275 55% 65%` | `#AE75D7` | Accent **rare** : le mot-clé d'un titre, le trait du fil rouge. |
| Accent pêche | `28 85% 82%` | `#F8CFAA` | Ponctuation chaude, année en cours. |
| Accent menthe | `170 45% 68%` | `#89D2C6` | Convergence, « ce que je sais faire ». |

**Règle 70/25/5** : 70 % blanc/vide, 25 % texte, **5 % accent seulement**. Sur une slide d'année, l'accent ne touche qu'un mot ou un trait. Le vide fait le calme, le calme fait la sincérité.

## A.2 — Typographie

| Usage | Police | Graisse | Taille projetée (16:9, 1080p) |
|-------|--------|---------|-------------------------------|
| Phrase-clé / titre | Quicksand | 600 | 40-56 px |
| Année + titre de chapitre | Quicksand | 500 | 24-30 px |
| Corps / le déplacement | Nunito | 400 | 20-24 px |
| Citation / texte à 19 ans | Nunito | 400 *italique* | 22-26 px |
| Légende | Nunito | 400 | 14-16 px |

- **Titres = Quicksand**, **corps = Nunito**. Fallback : Fredoka / Mulish.
- Le registre est littéraire : on peut se permettre **une citation en italique** par slide-clé (le texte à 19 ans, une phrase du mémoire). Jamais plus.
- Beaucoup d'interlignage (line-height 1.5-1.6). Le texte respire.

## A.3 — Grille, espacement, gabarit unique

- Format **16:9**. Marges généreuses : **12 %** de vide sur le pourtour (plus aéré que le Business).
- Espacement 8 px, mais on **sur-espace** volontairement : le blanc est un matériau.
- Coins arrondis **16 px**.
- **Gabarit régulier des slides d'année** (4 à 8) — la régularité fait sentir la progression. Triptyque vertical « avant → artefact → après », relié par des flèches ↓ lavande :
  ```
  [ Année N · Titre du chapitre ]        ← haut gauche, petit, accent

        CE QUE JE PENSAIS                ← label gris (6B6478)
        « la croyance de départ »        ← Nunito italique, gris (le regard ancien)
        ↓
        L'ARTEFACT (nommé)               ← label orange, Quicksand
        l'objet produit                  ← Nunito
        ↓
        LE CHANGEMENT DE POSTURE         ← label lavande, Quicksand
        le déplacement qu'il a produit   ← Nunito, mot-clé en gras lavande

  [ le grand numéro d'année ]            ← côté droit, dégradé, unique
  ```
- Gabarits secondaires : **Couverture** (titre centré, vide massif), **Citation** (texte 19 ans en grand italique), **Deux colonnes** (bilan : sais / ne sais pas encore), **Fil rouge** (frise verticale convergente).

## A.4 — Surfaces & ombres

- Cartes **papier** : fond blanc `#FFFFFF`, ombre très douce et basse, filet quasi invisible. Pas de glassmorphisme marqué ici (on n'est pas dans l'app produit, on est dans un mémoire).
- Une seule carte par slide au maximum. Le reste est du vide.

## A.5 — Accent & fil rouge

- L'accent lavande `#AE75D7` matérialise **la ligne** : sur la slide « Fil rouge », un trait vertical lavande relie les 5 déplacements et converge vers « Product Owner / Product Builder ».
- Sur les slides d'année, l'accent ne touche que le **numéro d'année** ou le **verbe du déplacement**.

## A.6 — Imagerie

- **Un seul visuel par année**, sobre, celui qui a vraiment compté : deux stages (année 1), métro parisien cadré sobre (année 2), capture de l'app Star Wars + Dublin (année 3), Naxos / terrain (année 4), interface de code + IA (année 5).
- **DreamWeave** : une seule capture, sobre. Ici DreamWeave est un **révélateur de soi**, pas un produit à vendre : pas de chiffres, pas de pricing, pas de matrice concurrentielle.
- Pas de clipart, pas de photo « corporate ». Préférer une image authentique, ou un artefact réel (capture, page manuscrite estompée).
- Le **texte à 19 ans** (slide 2) : traité comme une archive — fond papier, italique, légèrement estompé.

## A.7 — Motion

- Transition unique : **fondu lent**. Le rythme est posé, on laisse respirer. Rien de dynamique ni de commercial.

## A.8 — Accessibilité projection

- Contraste `#241C2C` sur `#F4F4F6` = largement AA. L'accent lavande ne porte jamais de texte long.
- Corps ≥ 20 px projeté.

## A.9 — Application du thème (PowerPoint / autre outil)

1. **Polices** : titre = Quicksand (fallback Century Gothic), corps = Nunito (fallback Calibri).
2. **Couleurs** : fond `#F4F4F6`, texte `#241C2C`, accent `#AE75D7` (pêche/menthe en secondaires, usage rare).
3. **Cartes** : fond blanc, ombre douce, coins arrondis. Beaucoup d'espace.
4. Enregistrer comme thème réutilisable « DreamWeave Light ».

> **Cohérence entre les deux decks** : même typo (Quicksand/Nunito), même famille lavande/pêche/menthe, mêmes coins arrondis. Ce qui change, c'est le **mode** (dark punchy ↔ light littéraire) et la **densité** (chiffre-héros ↔ vide). Le jury sent une même main, deux intentions.

---

# PARTIE B — ARCHITECTURE (budget 20 min)

15 slides. Rythme **posé** (mémoire réflexif) : on laisse respirer les transitions. Minutage détaillé dans chaque `slides/NN_*.md`.

| # | Slide | Déplacement porté | Gabarit | Durée | Cumul |
|---|-------|-------------------|---------|-------|-------|
| 1 | Couverture « Grandir sans s'en apercevoir » | — | Couverture | 0:45 | 0:45 |
| 2 | Pourquoi cet angle (texte à 19 ans) | Cadre | Citation | 1:45 | 2:30 |
| 3 | La méthode : artefact → déplacement | Cadre | Schéma | 1:10 | 3:40 |
| 4 | Année 1 · Le choix | Ne pas choisir = déjà PO | Année | 1:40 | 5:20 |
| 5 | Année 2 · Le miroir | D'où je regarde ; forme = fond | Année | 1:40 | 7:00 |
| 6 | Année 3 · Le saut | Livrer ≠ démontrer | Année | 1:40 | 8:40 |
| 7 | Année 4 · Le terrain | On apprend en produisant | Année | 1:40 | 10:20 |
| 8 | Année 5 · L'outil | L'IA démultiplie | Année | 1:35 | 11:55 |
| 9 | Projet miroir · DreamWeave | Preuve de bout en bout | Année | 1:30 | 13:25 |
| 10 | Fil rouge : les 5 déplacements | Synthèse | Fil rouge | 1:15 | 14:40 |
| 11 | Ce que DreamWeave prouve | Chaîne besoin → système | Schéma | 0:55 | 15:35 |
| 12 | Sans concession · Bilan | La décision sans filet | 2 colonnes | 1:35 | 17:10 |
| 13 | Conclusion : PO + Product Builder | Direction assumée | Schéma | 1:15 | 18:25 |
| 14 | Ouverture | Engagement | Couverture | 0:35 | 19:00 |
| 15 | Merci / Questions | — | Couverture | 0:20 | 19:20 |

**Total dit ≈ 19:20**, avec des silences volontaires entre les slides → tient dans 20 min. La slide **Méthode (3)** et la slide **Fil rouge (10)** sont les deux ajouts à fort effet de levier : elles rendent explicites la grille de lecture et la convergence, exactement ce qu'un jury de mémoire réflexif récompense.

---

# PARTIE C — CONTENU PAR SLIDE (ce qui est affiché)

> Format : **Titre / phrase-clé · Ce qui est affiché · Visuel.** Ce qui se dit est dans `slides/`.

### 1 — Couverture
- **Titre :** Grandir sans s'en apercevoir.
- **Affiché :** sous-titre « Cinq années à la Web School Factory : mon parcours, mes projets, et comment ma manière de penser a changé ». Louis Basnier · Product Owner apprenti chez Naxos (Arche Groupe) · WSF Promotion 2026.
- **Visuel :** couverture épurée, vide massif, un filet lavande discret.

### 2 — Pourquoi cet angle
> **Rôle : le POURQUOI (motivation).** Ne pas empiéter sur la slide 3 (le COMMENT). Ici, aucune mécanique « artefact → déplacement » — uniquement l'origine et l'intention.
- **Phrase-clé :** J'y reconnaissais chaque phrase, sans m'en souvenir.
- **Affiché :** un texte écrit à 19 ans, retrouvé. La décision : raconter **non pas la liste de mes compétences, mais la façon dont ma pensée a changé, sans que je m'en aperçoive**. « Sans concession » = refuser la version marketing de soi.
- **Visuel :** le texte à 19 ans traité en archive (papier, italique, estompé).

### 3 — La méthode
> **Rôle : le COMMENT (la grille de lecture).** C'est la **légende du triptyque** que les slides 4–8 répètent 5 fois. Distincte de la slide 2 (le POURQUOI).
- **Phrase-clé :** Pas « j'ai fait X », mais « X a changé ma posture ».
- **Affiché :** la légende en **3 étapes**, aux mêmes codes couleur que les slides d'année : **CE QUE JE PENSAIS** (gris) → **L'ARTEFACT** (orange) → **LE CHANGEMENT DE POSTURE** (lavande). Légende « Répété pour chacune des cinq années ». Ligne de clôture : « Cinq années, cinq objets, un même regard ».
- **Visuel :** 3 cartes reliées par des flèches → (grise, pêche, lavande).

### 4 — Année 1 · Le choix
- **Ce que je pensais :** « Faire un site ou un produit, c'est uniquement le coder. »
- **Artefact :** l'arrivée à la WSF, deux stages opposés (développement d'un côté, CRM/marketing de l'autre).
- **Le déplacement :** découverte de l'UX ; ne pas trancher technique/business était **déjà le profil Product Owner**.
- **Visuel :** triptyque vertical + le grand « 1 » à droite.

### 5 — Année 2 · Le miroir
- **Ce que je pensais :** « Analyser une situation, c'est décrire ce que j'observe. »
- **Artefact :** une ethnographie sur les personnes sans-abri du métro parisien.
- **Le déplacement :** se demander **d'où je regarde** avant de juger ; **la forme compte autant que le fond**. L'IA entre discrètement dans ma vie.
- **Visuel :** triptyque vertical + le grand « 2 » à droite.

### 6 — Année 3 · Le saut
- **Ce que je pensais :** « Réussir un projet, c'est qu'il marche le jour de la démo. »
- **Artefact :** l'année la plus technique (plusieurs projets de développement) + un semestre à Dublin.
- **Le déplacement :** **faire marcher une démo n'est pas livrer un produit qui tient** ; Dublin compte moins par les compétences que par la personne devenue.
- **Visuel :** triptyque vertical + le grand « 3 » à droite.

### 7 — Année 4 · Le terrain
- **Ce que je pensais :** « On apprend un métier en l'observant. »
- **Artefact :** l'étude de cas John Deere, le début de l'alternance chez Naxos comme PO apprenti.
- **Le déplacement :** on apprend un métier **en produisant**, pas en l'observant. L'apprentissage, c'est un changement de rythme et de responsabilité.
- **Visuel :** triptyque vertical + le grand « 4 » à droite.

### 8 — Année 5 · L'outil
- **Ce que je pensais :** « L'IA va remplacer une partie de mes compétences. »
- **Artefact :** un rapport sur l'IA et le droit européen, un procès fictif, le vibe coding.
- **Le déplacement :** l'IA **démultiplie**, ne remplace pas ; le vibe coding devient mon **point d'équilibre**, assez technique pour construire, assez produit pour penser.
- **Visuel :** triptyque vertical + le grand « 5 » à droite.

### 9 — Projet miroir · DreamWeave
- **Phrase-clé :** Personne ne m'a donné ce sujet.
- **Affiché :** un logiciel de création de webtoons par IA, construit seul. Un projet mené **par envie**, avant toute consigne, en dit plus sur qui l'on est qu'un exercice imposé.
- **Visuel :** une seule capture de DreamWeave, sobre. **Pas de chiffres, pas de pricing.**

### 10 — Fil rouge : les 5 déplacements
- **Phrase-clé :** Cinq déplacements, une seule direction.
- **Affiché :** (1) ne pas choisir technique/business = PO · (2) d'où je regarde · (3) la forme = le fond · (4) une démo qui marche n'est pas un produit qui tient · (5) l'IA démultiplie.
- **Visuel :** frise verticale, trait lavande, convergence vers « PO / Product Builder ».

### 11 — Ce que DreamWeave prouve
- **Phrase-clé :** L'envie s'est traduite en compétence complète.
- **Affiché :** tenir la chaîne besoin → spécification → système, seul ; faire de l'IA un prolongement de soi ; un produit qui tourne, pas une maquette.
- **Visuel :** pipeline besoin → spec → système.

### 12 — Sans concession · Bilan
- **Phrase-clé :** Ma limite la mieux documentée n'est pas technique.
- **Affiché :** deux colonnes. *Ce que je sais faire* : tenir la chaîne de bout en bout, seul. *Ce que je ne sais pas encore* : **la décision sans filet**, porter seul un choix qui coûterait cher. Le vrai test viendra quand la supervision disparaîtra.
- **Visuel :** deux colonnes « Ce que je sais faire / Ce que je ne sais pas encore ».

### 13 — Conclusion · Ce que je veux devenir
- **Phrase-clé :** Product Owner aujourd'hui, Product Builder au-delà.
- **Affiché :** PO = là où se rejoignent technique et produit. Product Builder = penser le produit et se donner les moyens de le construire. L'IA comme prolongement, pas comme béquille.
- **Visuel :** deux cercles PO / Product Builder qui se recouvrent.

### 14 — Ouverture
- **Phrase-clé :** Aujourd'hui, je choisis consciemment la suite.
- **Affiché :** ce que ce mémoire m'a fait comprendre, je veux le mettre au service d'un produit et d'une équipe.
- **Visuel :** épuré, une ligne, vide massif.

### 15 — Merci / Questions
- **Affiché :** « Merci de votre écoute. Je suis prêt à répondre à vos questions. » Louis Basnier. Logo WSF.
- **Visuel :** épuré.
