# Recherche web — webtoons, web novels, adaptation — 2026-07-03

> Mission Louis : « va chercher sur internet, lis des webtoons et des light novels, donne les noms, tire des conclusions / ajouts pour l'Édition ».
> Méthode : 3 agents de recherche en parallèle. **Honnêteté des sources** : les web novels ont été **réellement lus** (texte intégral extrait et mesuré) ; les webtoons ont été étudiés **via des analyses professionnelles textuelles** (pas de lecture visuelle des planches — l'extension Chrome n'était pas connectée ; une passe visuelle est possible si Louis la connecte).

---

## 1. Ce qui a été lu / étudié (noms exacts)

### Web novels — LUS intégralement (Royal Road, légal et gratuit)
| Œuvre | Auteur | Chapitres lus | Mots |
|---|---|---|---|
| **Mother of Learning** | Domagoj Kurmaić (nobody103) | ch.1 « Good Morning Brother », ch.2 « Life's Little Problems » | 7 620 + 7 520 |
| **Super Supportive** | Sleyca | ch.1 « ONE: The Boy in the Bubble » | 1 570 |
| **Beware of Chicken** | CasualFarmer | ch.1 « He Bravely Turned His Tail and Fled » | 2 110 |

Textes intégraux archivés dans le scratchpad de session (`mol_ch1/mol_ch2/ss_ch1/boc_ch1.txt`).

### Webtoons — étudiés via analyses professionnelles (sources nommées)
- **Tower of God** (Hox, Matt Reads Comics), **Lore Olympus** (Bloom Reviews + étude sémiotique des couleurs), **Annarasumanara**, **Bongchon-Dong Ghost**, **Omniscient Reader's Viewpoint** (Content Curve + interview studio Redice/Sleepy-C, Comics Beat), **S-Classes That I Raised**, **The Right Number** (Scott McCloud), **RE: Trailer Trash** (process scénariste WEBTOON Originals, Alyssa Villaire).
- Guides pro : Blambot (grammaire du lettrage, référence US), Clip Studio/Art Rocket officiel, Comistitch (paneling scroll chiffré), Multic (format/bulles/action), S-Morishita (canvas + cases par épisode), interview storyboardeur Hashimoto Lion (pixivision).

### Adaptations roman → webtoon — étudiées via analyses/interviews
**Solo Leveling** (Game Rant, GoodNovel), **The Beginning After the End** (ChapterBrief, Game Rant), **Omniscient Reader's Viewpoint** (Comics Beat, Wikipedia), cas d'échec **God of High School / Noblesse** (compression destructrice).

---

## 2. Conclusions majeures

### A. La règle « 45 mots = 1 case » de DreamWeave est fausse sur du texte réel (mesuré)
- Mother of Learning ch.1 : 7 620 mots → la règle donne **169 cases = 3 épisodes** entassés en un chapitre.
- Super Supportive ch.1 : 1 570 mots → 34 cases = **exactement un épisode webtoon** (standard pro : 30-80 cases, WEBTOON Originals plafonne à ~55).
- Le dialogue **sous-produit** (10 répliques ≈ 120 mots = 6-10 cases, pas 3) ; l'exposition **sur-produit** (150 mots de world-building = 1 case décor, pas 3).
- → Découper par **beats** (réplique, action, perception), pas par tranches de mots ; plafonner ~60 cases ; proposer un split quand la prose dépasse ~3 000 mots.

### B. Le webtoon est un « highlight reel » du roman (ratio mesurable)
- Solo Leveling : 8 chapitres de roman → 3 chapitres de manhwa (~2,5:1). On coupe : explications de système, politique, arcs secondaires. On garde/amplifie : pics dramatiques, monologue **identitaire** (décisions), cases silencieuses.
- Piège documenté n°1 (God of High School, TBATE) : couper le monologue qui définit le héros → personnage vide. Piège n°2 : recopier la prose → mur de texte. Discipline pro : **1-2 bulles par case, une ligne par bulle**, bulles posées AVANT le dessin (Hashimoto Lion).

### C. Le vide vertical est le langage n°1 du média (chiffré)
- Comistitch/McCloud : 100-150px = action rapide · 200-300px = battement émotionnel · 400-600px = transition de scène · 600-800px = pause cliffhanger. « Distance = Time. »
- Confirme les mesures faites sur nos propres références (YTIM/SL : 400-900px avant chaque révélation).

### D. Structure de prose qui marche (mesuré sur Royal Road)
- Hook ≤ 25 mots, **sensoriel** (douleur, goût du sang), jamais du décor. 3-5 scènes par chapitre avec séparateur + phrase d'établissement. Dialogue = 20-35 % des mots mais 50-65 % des paragraphes. Paragraphe d'une ligne = case pleine. 3 types de fins qui fonctionnent : cliffhanger sensoriel sec, micro-cliff relationnel, fausse quiétude ironique. 1-2 détails-graines plantés dans des paragraphes anodins.

### E. Specs officielles WEBTOON (recoupées ×4 sources)
800px de large · tranches 1280px max (**notre export ZIP est déjà exactement conforme**) · 20 MB max/épisode · JPG 85-95 % · miniatures CANVAS 1080×1080 (<500KB) et 1080×1920 (<700KB) · zone header ~300px en haut d'épisode.

---

## 3. Ajouts à l'Édition

### ✅ Implémentés le 2026-07-03 (cette session)
1. **Respirations (rythme)** — onglet Cases : 4 presets sémantiques (Enchaînement 120px, Battement 250px, Changement de scène 500px, Cliffhanger 700px). Insère un espace vertical en décalant tout ce qui suit (undo couvert, helper pur `insertVerticalBreathing` testé). Le levier narratif n°1 du scroll vertical, absent jusqu'ici.
2. **Guide écran mobile** — Préférences éditeur : overlay lignes d'écran ≈1500px + zone header ≈300px hachurée. Évite l'erreur de composition la plus citée (info liée coupée entre deux écrans). Jamais exporté.

### 🟠 Recommandés — nécessitent l'accord de Louis
| # | Ajout | Pourquoi | Blocage |
|---|---|---|---|
| 1 | **Paquet Scénario/découpage** (révisé 2026-07-03 après retour Louis) : champ `dialogue` + `narration` par case dans detect_blocks. **Budget de bulles PAR TYPE DE SCÈNE** (action 0-1, standard 1-2, dialogue jusqu'à 4-5 en cascade — pattern SL c01 p016), bulle individuelle 5-15 mots cible / ~25 max (la contrainte dure = pas de mur de texte par bulle). **Réglage utilisateur « Densité de texte » (Aéré/Standard/Dense)** au découpage, modulant les plafonds — mémorisé côté client, zéro migration. **`system_window` strictement conditionnel** : émis uniquement si le texte contient un affichage d'interface explicite ; jamais inventé ; **toggle projet « Univers avec système »** qui retire le type de la grammaire pour les genres non-RPG (romance, drame). SFX suggérés modulés par genre. Règle « highlight reel » (~40 % du texte) ; quota monologue (phrase charnière) ; cases silencieuses 10-20 % ; hook de fin obligatoire ; budget de cases par intensité. Option : profils de genre (Action ~60 cases/ép., Romance ~40, Comédie ~30). + prompt chapitre « adaptation-ready ». | Le raté le plus probable aujourd'hui : `text_excerpt` = prose brute recopiée dans les cases (mur de texte) | **Edge Function** `generate-scenario-ai` (detect-blocks.ts, chapter.ts) — accord + déploiement manuel |
| 2 | **Queues de bulles pro** (courbe, ancrage bouche, off-panel, longueur) + **bulles jointes/connecteurs** | Blambot : c'est la queue qui distingue le lettrage pro, pas la forme — rejoint ton constat sur les formes stylisées | **Zone protégée** (BubbleLayer) |
| 3 | **Filtres colorimétriques par bloc image** (sépia flashback, nuit, monochrome émotionnel — Lore Olympus, guide Clip Studio officiel) | Gros gain narratif **sans crédit IA** (filtre CSS) | **Zone protégée** (rendu ImageBlockLayer) + export |
| 4 | **Texte riche intra-bulle** (gras-italique d'emphase, petit corps = murmure — convention Blambot) | Convention omniprésente | Système bulles |
| 5 | **Conformité export** (jauge 20 MB/épisode, qualité JPG) + **recadrage miniatures** aux formats officiels CANVAS | Ferme la boucle éditeur → publication | Hors zone protégée — scope à part |
| 6 | `estimatePanelCount` : plafond ~60 cases + suggestion de split >3 000 mots | Mesures Royal Road (§A) | Change un comportement produit — validation Louis |

---

*Créé le 2026-07-03. Sources détaillées (URLs) dans les rapports d'agents de la session. Complète `elements-edition-2026-07-03.md` (analyse visuelle des références locales).*
