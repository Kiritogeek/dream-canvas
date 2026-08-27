# Business Project — Design System & Contenu

> **Présentation orale du Business Project DreamWeave.** Deck d'investissement, **26 slides · 20 minutes**.
> Registre visuel : **DARK DreamWeave**, glassmorphisme, un chiffre-héros par slide.
> Ce fichier = le **look** (Partie A) **+** ce qui est **affiché sur chaque slide** (Partie C). Pour ce que tu dois **dire**, voir `slides/NN_*.md`.
> Source de vérité du contenu : `Buisness_Project.md` (décisions D1→D12, correctifs C1→C5) et `Memoire DreamWeave - Louis Basnier.pdf`.

---

# PARTIE A — DESIGN SYSTEM (mode DARK)

Le deck EST une démonstration du goût produit. Il reprend les tokens réels de l'app DreamWeave (mode dark permanent).

## A.1 — Palette

Source de vérité = tokens HSL de l'app. Les hex sont donnés pour le sélecteur de couleurs de l'outil.

| Rôle | Token (HSL) | Hex | Usage |
|------|-------------|-----|-------|
| Fond principal | `275 20% 7%` | `#13101B` | Fond de toutes les slides. **Jamais noir pur.** |
| Surface / carte | `275 16% 11%` | `#1C1726` | Cartes en verre, encadrés, zones de contenu. |
| Bordure | `275 14% 22%` | `#2E2740` | Filet 1 px des cartes verre. |
| Texte principal | `0 0% 100%` | `#FFFFFF` | Titres, chiffres-héros. |
| Texte secondaire | `0 0% 92%` | `#EBEBEB` | Corps, légendes. |
| **Accent lavande** | `275 50% 75%` | `#C59FDF` | Accent n°1 : chiffres, pictos décision, liens. |
| Accent pêche | `28 70% 80%` | `#F0C9A8` | Accent chaud n°2 : surlignages, « avant/après ». |
| Accent menthe | `170 40% 72%` | `#9BD4CB` | Accent n°3 : validation, « place vide », gains. |

**Règle 60/30/10** : 60 % fond sombre, 30 % surfaces verre + texte, 10 % accents. Les trois accents ne cohabitent jamais à parts égales sur une slide : un domine, les autres ponctuent.

**Interdits couleur** : pas d'accent chaud isolé hors pêche (pas de rouge/orange vif), pas de mesh gradient bleu-violet « IA générique », pas de noir pur.

## A.2 — Typographie

| Usage | Police | Graisse | Taille projetée (16:9, 1080p) |
|-------|--------|---------|-------------------------------|
| Chiffre-héros | Quicksand | 700 | 120-200 px |
| Titre de slide | Quicksand | 600-700 | 44-60 px |
| Sous-titre | Quicksand | 500 | 26-32 px |
| Corps / bullet | Nunito | 400-500 | 20-24 px |
| Légende / source | Nunito | 400 | 14-16 px |

- **Titres = Quicksand**, **corps = Nunito**. Fallback portable (utilisé dans le PPTX livré) : **Century Gothic** (titres) / **Calibri** (corps).
- Jamais de serif par défaut, jamais Inter, jamais system-ui visible.
- Une seule idée de titre par slide. Titres courts, sans em-dash.

## A.3 — Grille, espacement, gabarits

- Format **16:9**. Marges de sécurité **7 %** sur tout le pourtour (rien de vital dans les bords, la salle peut rogner).
- Espacement basé sur **8 px** (8/16/24/32/48/64).
- Coins arrondis **16 px** partout (`--radius: 1rem`).
- **4 gabarits** seulement, pour un rythme régulier :
  1. **Héros** : chiffre géant centré + une ligne de contexte. (couverture, problème, break-even, conclusion)
  2. **Split 60/40** : argument à gauche, visuel/preuve à droite. (solution, Sheet System, pricing)
  3. **Matrice / schéma plein cadre** : un seul visuel dominant + titre. (concurrence 2×2, TAM/SAM/SOM, BMC)
  4. **Liste structurée** : 3 à 5 lignes max, jamais 3 cartes identiques. (barrières→réponses, GTM, stack)

## A.4 — Surfaces « verre » (glass)

- Carte verre = fond `#1C1726` à ~70 % d'opacité + filet 1 px `#2E2740` + ombre douce basse.
- Style de carte « arrondi », fond légèrement plus clair que la slide, ombre subtile. Pas de carte blanche plate.
- Un halo lavande diffus (`#C59FDF` à 8-12 %) peut habiller un coin de slide-héros. Discret.

## A.5 — Gradients signature

- `gradient-primary` : lavande `#C59FDF` → pêche-deep `#D99A6E`, 135°. Réservé aux CTA / éléments actifs / chiffre-héros de conclusion.
- `gradient-dream` : lavande → pêche → menthe, 135°, opacité 25 %. Fonds décoratifs de couverture / section uniquement.
- `text-gradient` : lavande → pêche sur le mot-clé d'un titre (1 mot max par slide).

## A.6 — Pictogrammes « décision »

Chaque slide qui porte une décision fondatrice affiche un picto discret en haut à droite : **💡 D1** à **💡 D12**. Petit, accent lavande. Il matérialise le fil rouge « une suite de décisions » sans alourdir.

## A.7 — Imagerie

- **Captures réelles du POC** dès que possible (solution, Sheet System, bloc, NarraMind). Le produit tourne : le montrer vaut mille mots.
- **GIF webtoon** (slide 4) : privilégier un GIF **généré par DreamWeave** (montre le produit + zéro problème de droits). À défaut, webtoon sous licence libre crédité à l'écran. **Jamais** d'extrait commercial sans droits.
- Captures cadrées, coins arrondis 16 px, filet verre. Pas de mockup de smartphone générique clipart : préférer un vrai cadre device sobre.
- Zéro banque d'images « équipe qui sourit » / « IA cerveau bleu ». Anti-slop absolu.

## A.8 — Motion (transitions)

- Transition unique entre slides : **fondu doux** (fade) ou glissement léger. Jamais de rotation 3D, cube, ou effet cinématique.
- Animer seulement l'apparition (opacity/translate). Cohérent avec l'app : intensité 6/10, purposeful.

## A.9 — Accessibilité projection

- Contraste texte/fond **WCAG AA** minimum (blanc sur `#13101B` = OK). Les accents servent d'accent, pas de texte long.
- Taille de corps ≥ 20 px projeté : lisible du fond de la salle.
- Ne jamais coder une information par la seule couleur (doubler par une icône ou un label).

## A.10 — Application du thème (PowerPoint / autre outil)

1. **Polices** : titre = Quicksand (fallback Century Gothic), corps = Nunito (fallback Calibri).
2. **Couleurs** : fond `#13101B`, texte `#FFFFFF`, accent `#C59FDF` (secondaires pêche/menthe).
3. **Cartes** : coins arrondis, ombre douce, fond `#1C1726`.
4. Enregistrer comme thème réutilisable « DreamWeave Dark ».

---

# PARTIE B — ARCHITECTURE (budget 20 min)

26 slides. Minutage détaillé dans chaque `slides/NN_*.md`. À 20 min, on joue **l'architecture complète** (plus besoin de compresser sur l'ossature).

| # | Slide | Décision | Gabarit | Durée | Cumul |
|---|-------|----------|---------|-------|-------|
| 1 | Couverture + baseline | — | Héros | 0:30 | 0:30 |
| 2 | Une suite de décisions | Cadre | Liste | 0:30 | 1:00 |
| 3 | Le problème (goulot) | — | Héros | 1:00 | 2:00 |
| 4 | Qu'est-ce qu'un Webtoon ? (GIF) | — | Visuel | 0:50 | 2:50 |
| 5 | Le contexte : marché installé | — | Split | 0:45 | 3:35 |
| 6 | TAM / SAM / SOM | — | Schéma | 0:50 | 4:25 |
| 7 | 4 personas + priorisation | D2 | Liste | 0:55 | 5:20 |
| 8 | Concurrence : la place vide | — | Matrice | 0:55 | 6:15 |
| 9 | Décision fondatrice | D1 | Liste | 0:40 | 6:55 |
| 10 | La solution : 4 étapes | — | Split | 0:55 | 7:50 |
| 11 | 5 barrières → 5 réponses | — | Liste | 0:40 | 8:30 |
| 12 | Onboarding : déblocage progressif | D3 | Split | 0:35 | 9:05 |
| 13 | Sheet System | D6 | Split | 1:10 | 10:15 |
| 14 | Génération par bloc | D7 | Split | 0:40 | 10:55 |
| 15 | NarraMind | D8 | Split | 0:45 | 11:40 |
| 16 | Business Model Canvas | — | Schéma | 0:40 | 12:20 |
| 17 | Pricing : logique Spotify | D4 | Liste | 0:55 | 13:15 |
| 18 | Projections + break-even | — | Héros | 0:50 | 14:05 |
| 19 | Organisation + juridique | D5 | Liste | 0:40 | 14:45 |
| 20 | Go To Market : 5 phases | — | Liste | 0:45 | 15:30 |
| 21 | Stack : benchmark raisonné | D9-D12 | Liste | 0:40 | 16:10 |
| 22 | Cadre juridique IA | — | Liste | 0:35 | 16:45 |
| 23 | Architecture de scale | — | Liste | 0:40 | 17:25 |
| 24 | Conclusion | — | Héros | 0:50 | 18:15 |
| 25 | Sources & justifications | — | Schéma | 0:20 | 18:35 |
| 26 | Merci / Questions | — | Héros | 0:15 | 18:50 |

**Total dit ≈ 18:50**, marge ~70 s pour respirer / transitions → tient dans 20 min. Slides backup B1-B3 (coûts, risques, abandon) hors budget, pour la Q&A.

---

# PARTIE C — CONTENU PAR SLIDE (ce qui est affiché)

> Format : **Titre · Chiffre-héros · Bullets affichés · Visuel.** Ce qui se dit est dans `slides/`.

### 1 — Couverture
- **Titre :** DreamWeave — « De l'idée au chapitre publié, sans savoir dessiner. »
- **Affiché :** Louis Basnier · WSF Promotion 2026 · Business Project · 20 min.
- **Visuel :** hero glassmorphisme, une case webtoon générée en fond, halo lavande.

### 2 — Une suite de décisions
- **Titre :** Ce deck ne liste pas des features. Il raconte des décisions.
- **Affiché :** Pour chaque choix → Problème · Options · Décision · Justification. Frise D1→D12 estompée.
- **Visuel :** frise verticale des 12 décisions en filigrane.

### 3 — Le problème
- **Chiffre-héros :** 45,3 Md$ (marché 2030) — ou 300-1500 € (coût d'un chapitre).
- **Affiché :** +27 %/an · 8,28 Md$ (2023) → 45,3 Md$ (2030) · +200 % de recherches « AI webtoon maker » · un chapitre = 300-1500 € et 1-4 semaines.
- **Visuel :** courbe de marché qui monte + mur « savoir dessiner ».

### 4 — Qu'est-ce qu'un Webtoon ? (GIF)
- **Titre :** Un webtoon, ça se lit en scrollant.
- **Affiché :** BD verticale née en Corée, native mobile · une seule colonne, jusqu'à 100 000 px de haut.
- **Visuel :** **GIF de lecture** (scroll vertical continu). GIF généré par DreamWeave de préférence.

### 5 — Le contexte : un marché installé
- **Chiffre-héros :** 170 M lecteurs actifs / mois.
- **Affiché :** 24 M créateurs · romance ≈ 39 % des revenus · 76 % des lecteurs ont 18-33 ans · **86 % des créateurs utilisent déjà l'IA**.
- **Visuel :** cadre device sobre, scroll vertical.

### 6 — TAM / SAM / SOM
- **Chiffre-héros :** 600 payants visés (SOM à 12 mois).
- **Affiché :** TAM ~160 M · SAM 5-10 M · SOM 10 000 inscrits / 600 payants · CAC < 30 € · LTV/CAC > 3.
- **Visuel :** 3 cercles concentriques chiffrés.

### 7 — 4 personas + priorisation (💡 D2)
- **Titre :** Quatre profils, un même blocage.
- **Affiché :** Luna (créatrice, cible primaire, 8-15 €) · Marc (amateur exigeant, 15-25 €) · Théo (étudiant, prescripteur) · Elodie (éditeur B2B, 49-150 €). Séquence : **B2C d'abord, B2B dès la V1 / T3 2026**.
- **Visuel :** 4 cartes personas + flèche de priorisation.

### 8 — Concurrence : la place vide
- **Titre :** Personne n'occupe « cohérence + accessibilité ».
- **Affiché :** matrice 2×2 (automatisation IA × spécialisation webtoon). Dashtoon · Clip Studio · AI Comic Factory. **DreamWeave seul en haut à droite.**
- **Visuel :** matrice 2×2, DreamWeave isolé dans le quadrant vide (accent menthe).

### 9 — Décision fondatrice (💡 D1)
- **Titre :** On attaque la cause de l'abandon, pas un symptôme.
- **Affiché :** écartés → marketplace · outil de dessin assisté · génération one-shot. Retenu → **pipeline complet idée → webtoon publiable**.
- **Visuel :** 3 options barrées → 1 retenue.

### 10 — La solution : 4 étapes
- **Titre :** Un parcours guidé, des visuels cohérents en secondes.
- **Affiché :** Style → Assets → Scénario → Éditeur.
- **Visuel :** **captures réelles du POC**, une par étape.

### 11 — 5 barrières → 5 réponses
- **Titre :** À chaque barrière, une réponse technique.
- **Affiché :** artistique → génération IA · incohérence → Sheet System · fragmentation → tout-en-un · coût → crédits · complexité → onboarding progressif.
- **Visuel :** tableau 2 colonnes, ligne « incohérence » surlignée.

### 12 — Onboarding : déblocage progressif (💡 D3)
- **Titre :** Puissant sans être intimidant.
- **Affiché :** écartés → tout exposer · wizard forcé. Retenu → **déblocage progressif + Ariane + badges New**. Time-to-Value < 10 min.
- **Visuel :** onglets qui s'allument progressivement.

### 13 — Sheet System (💡 D6)
- **Chiffre-héros :** ~90 % du bénéfice d'un LoRA, pour une fraction du coût.
- **Affiché :** problème → même prompt, visage différent. Écartés → seed fixe · LoRA par perso. Retenu → **fiche 4 angles injectée via FLUX.2 Pro Edit** (~20 itérations de prompt engineering).
- **Visuel :** la sheet 4 angles + 3 cases où le perso reste identique.

### 14 — Génération par bloc (💡 D7)
- **Titre :** On régénère un bloc sans toucher aux autres.
- **Affiché :** layout `JSONB` · chaque bloc = { id, x, y, w, h, prompt, asset_refs, image_url }, généré seul.
- **Visuel :** case découpée en blocs, un bloc en cours de régénération.

### 15 — NarraMind (💡 D8)
- **Chiffre-héros :** ~50 tokens/chapitre (vs ~850 en brut).
- **Affiché :** écartés → tout injecter · fenêtre glissante. Retenu → **compression + recherche vectorielle** (Gemini 768D, pgvector). Ariane montre les alertes.
- **Visuel :** alerte Ariane « ce personnage est mort au ch. 12 ».

### 16 — Business Model Canvas
- **Titre :** Le modèle en une vue, un seul levier de marge.
- **Affiché :** partenaires (FAL.ai, Supabase, Vercel) · ressources (FLUX.2 Pro, prompts système propriétaires, NarraMind) · revenus (abonnements + packs + marketplace 30 % + API B2B) · coûts (fixes ~60 €/mois, variables ~0,065 €/génération).
- **Visuel :** BMC 9 blocs, bloc « levier de marge » surligné.

### 17 — Pricing : logique Spotify (💡 D4)
- **Chiffre-héros :** 100 % des fonctions, même en gratuit.
- **Affiché :** Libre 0 €/20 crédits · Créateur 12,99 €/100 · Studio 29,99 €/250 · **Entreprise sur devis**. Même qualité FLUX.2 Pro pour tous, seul le volume change.
- **Visuel :** 4 colonnes de plans, bandeau « même qualité pour tous ».

### 18 — Projections An 1 + break-even
- **Chiffre-héros :** rentable dès 10-15 abonnés.
- **Affiché :** un chapitre : 1-4 sem → 2-4 h · 300-1500 € → < 5 € · conversion 2 % → 6 % · 600 payants à M12 ≈ ARR ~137 000 €.
- **Visuel :** avant/après (temps + coût) + jauge break-even.

### 19 — Organisation + juridique (💡 D5)
- **Titre :** Une équipe minimale outillée par l'IA, un juridique par paliers.
- **Affiché :** recrutements P0→P3 déclenchés par seuils de revenus · auto-entrepreneur → SASU (30 k€ ou 1er salarié) → SAS · dev « 4 à 6 mois ».
- **Visuel :** frise des 3 statuts avec seuils déclencheurs.

### 20 — Go To Market : 5 phases
- **Titre :** Construire la preuve avant de dépenser.
- **Affiché :** bêta (10 pilotes) → lancement freemium public → content marketing SEO/tutos (Q4 2026) → influence créateurs → B2B studios. Point critique = **l'activation** (wow < 10 min).
- **Visuel :** entonnoir + frise datée, cohérente « lancement sep-oct 2026 ».

### 21 — Stack : benchmark raisonné (💡 D9-D12)
- **Titre :** Maximiser ce qu'une seule personne peut livrer.
- **Affiché :** Supabase (RLS J0) · FAL.ai / FLUX.2 Pro (multi-référence + copyright) · Gemini Flash + Groq fallback (429) · React/Vite/React Query/Edge Functions.
- **Visuel :** tableau benchmark, colonne « pourquoi » en avant.

### 22 — Cadre juridique IA
- **Titre :** La conformité devient un argument.
- **Affiché :** intervention humaine créative (L.111-1 CPI) · badge de transparence sur les exports · couverture copyright héritée de FAL.ai.
- **Visuel :** badge « Créé avec DreamWeave » + 3 piliers.

### 23 — Architecture de scale
- **Titre :** Les limites sont des choix de phase, pas des impasses.
- **Affiché :** tableau composant → limite actuelle → évolution priorisée (P1/P2/P3) pour 10 000 MAU. Le LoRA reste une évolution de scale.
- **Visuel :** tableau composant / limite / plan de dépassement.

### 24 — Conclusion
- **Chiffre-héros :** < 5 € le chapitre.
- **Affiché :** marché qui grandit vite · 86 % des créateurs déjà à l'IA · personne ne résout la cohérence. « La solution suffisante et livrable bat la solution parfaite et inatteignable. »
- **Visuel :** synthèse en 3 icônes (marché / différenciateur / viabilité).

### 25 — Sources & justifications
- **Titre :** Chaque chiffre est traçable.
- **Affiché :** deux colonnes. *Sources externes* [1] Cho, Adkins & Long · [2] SEC S-1 Webtoon · [3] Grand View Research · [4] Adobe Creators' Toolkit · [5] Dashtoon×KWIA · [6] Vox Illustration · Google Trends. *Preuves de réflexion* : WTP personas · 0,065 €/génération · ARR 137 000 € · break-even · 50 tokens / 90 % LoRA.
- **Visuel :** deux colonnes claires.

### 26 — Merci / Questions
- **Affiché :** « Merci de votre attention. Des questions ? » + coordonnées. Épuré, logo.
