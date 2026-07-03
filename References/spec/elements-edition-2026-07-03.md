# Éléments d'un webtoon → features Édition — 2026-07-03

> Mission Louis : « analyser tous les éléments d'un webtoon, nourrir les .md, retranscrire en fonctionnalités pour l'Édition ».
> Source : analyse image par image de **146 planches** — YTIM webtoon ch1 (40 pages lues sur 152), Solo Leveling c00-c02 (55 pages), Solo Leveling c10/c30/c57/c82 (51 pages) — par 3 agents d'analyse visuelle en parallèle.
> Complète `cases-manquantes-2026-05-31.md` (inventaire code) et `visual-grammar.md` (grammaire FLUX).

---

## 1. Verdict transversal (les 3 analyses convergent)

**Le socle de composition de DreamWeave est bon** : cases full-bleed / flottantes / letterbox / splash, formes diagonales, bulles libres à cheval sur tout, vides de pacing, canvas 100 000px — tout cela couvre déjà la géométrie observée dans les références.

**Les manques étaient concentrés sur 4 couches** (par fréquence d'apparition dans les planches) :

| Couche manquante | Fréquence observée | Statut |
|---|---|---|
| SFX / texte libre stylé | ~80 % des planches d'action SL | ✅ **LIVRÉ 2026-07-03** |
| Fenêtres système RPG (texte net) | 4-8 écrans clés par chapitre, dont cliffhangers | ✅ **LIVRÉ 2026-07-03** |
| Fond de page narratif (noir/couleur entre les cases) | ~40 % du ch.1 YTIM, séquences entières SL | ✅ **LIVRÉ 2026-07-03** (presets fond pleine largeur sous les cases) |
| Presets webtoon (hauteurs 400px, fonds narratifs, prompts cadrage/éclairage/ambiance) | grammaire pro universelle | ✅ **LIVRÉ 2026-07-03** |

**3 patterns d'architecture confirmés par les références :**
1. **Tout chevauche tout** — bulles, SFX et fenêtres système vivent au niveau canvas, à cheval sur cases et gouttières. (Architecture DreamWeave déjà conforme : éléments libres du canvas.)
2. **La couleur est sémantique** — noir=impact, rouge=violence, violet=pouvoir (signature SL), bleu glow=magie, or=Système ; le fond de page encode la scène.
3. **Le blanc est un outil** — 400-900px de vide précèdent TOUJOURS les révélations ; ~45 % de la surface d'un chapitre YTIM est de la respiration.

---

## 2. Livré le 2026-07-03 (implémenté, testé, additif)

### 2.1 Bloc SFX / Texte libre (`SfxBlock`)
- Texte stylé hors bulle : police (bibliothèque Choc & SFX : Bangers, Luckiest Guy, Rock Salt, Black Ops One + toutes les autres), taille 12→600px, couleur, **contour** épaisseur 0-12 (simulé en text-shadows 16 directions — compatible export html2canvas, contrairement à `-webkit-text-stroke`), **lueur** (couleur + rayon — signature SL magie/pouvoir), **rotation libre** (poignée canvas avec snap 15° + slider), **opacité** (échos mentaux à instances multiples dégressives — YTIM p70), espacement lettres, multi-lignes (`\n`).
- 6 presets : Impact (BOOM! rouge glow), Coup (SLASH jaune), Fracas (KRAK blanc), Vitesse (FWOOSH cyan incliné), Grondement (GRRRR… violet glow), Pas (TAP TAP discret).
- Couvre aussi : narration nue sur fond de page (SL c00), pensées flottantes colorées (c30 p012), étiquettes flottantes, texte de cliffhanger coloré, aparté manuscrit (polices manuscrites disponibles).
- Stockage : `layout.sfxBlocks` (JSONB additif — aucune migration), undo/redo couvert, export ZIP inclus (z16), préservé lors d'une recomposition Auto (re-fusion client après compose).

### 2.2 Bloc Notification Système (`SystemBlock`)
- Fenêtre UI **à texte net éditable** (remplace le rendu FLUX illisible de `revelation_system`) : fond near-black dégradé, double bordure + halo lumineux (radial-gradient, export-safe), coins décoratifs, icône [!] optionnelle, **bouton ✕ optionnel** (signature RPG SL), titre uppercase glow + corps multi-lignes centré, typo Roboto Mono.
- 5 variantes avec accent sémantique : Notification (cyan), Quête (or — style SL chapitres avancés), Alerte (rouge), Level Up (violet), Statut (bleu). Accent personnalisable au picker.
- **Corps vide = bandeau une ligne** pleine largeur (`[UNE QUÊTE EST ARRIVÉE.]` — cliffhanger SL c82 p10).
- Stockage : `layout.systemBlocks` (JSONB additif), mêmes garanties que SFX (z14 export, sous les SFX et bulles).

### 2.3 Fond de page narratif
- 6 presets un-clic dans l'onglet Couleurs : Quotidien (blanc), Mystère (noir profond #0a0a12), Action (ambre #b45309), Pouvoir (bleu nuit #1e1b4b), Tension (rouge sombre #7f1d1d), Flashback (sépia #e8d9c0).
- Insère un bloc couleur **pleine largeur 800px sous toutes les cases** (zIndex = min-10) — nouveau handler dédié, sans modifier `handleAddColorBlock` (zone protégée). Le bloc reste un ColorBlock standard (déplaçable, redimensionnable, recolorable).

### 2.4 Presets webtoon
- **Cases webtoon pleine largeur** (onglet Cases) : Petite 800×400, Moyenne 800×800, Grande 800×1200, Impact 800×1600, **Letterbox 800×200** (bande ciné yeux/horizon — compo Q réalisable à la main sans toucher l'Edge Function).
- **Presets prompt FLUX** (popup Générer du bloc image) : chips Cadrage (gros plan, plongée, contre-plongée, OTS, dutch…), Éclairage (rim light, contre-jour, dramatique, néon, sépia…), Ambiance (braises, pluie, pétales, éclairs, speed lines…) — keywords issus de `visual-grammar.md`, dédupliqués, ajoutés au prompt en un clic.

### 2.5 Intégration éditeur
- Nouvel onglet rail gauche **« SFX & Système »** (icône ⚡) : presets cliquables + drag-drop précis.
- Calques : sections SFX (ambre) et Système (cyan) avec sélection + scroll-to.
- Raccourcis : Suppr/Backspace et Échap couvrent les nouveaux éléments (paramètres optionnels additifs du hook).
- Sélection mutuellement exclusive avec cases/couleurs/bulles.

---

## 3. Restant — nécessite l'arbitrage de Louis (zone protégée ou choix design)

### 🔴 P1 — fort impact, touche la zone protégée canvas
| # | Feature | Preuve | Impact zone protégée |
|---|---|---|---|
| 1 | **Bordure de case personnalisée** (couleur, épaisseur 0-10px, éventuellement radius) | ~20 cases/chapitre YTIM ; cadre or c82 p06 ; filet blanc sur fond noir c01 p005 | `ImageBlockLayer` (rendu du bloc) — nouvelle propriété `borderColor/borderWidth` sur `PanelBlock` + rendu. Additif mais DANS le composant gelé |
| 2 | **Bulle « pensée épineuse »** (ellipse + couronne de traits radiaux fins) | LA bulle signature SL/YTIM — la plus fréquente après speech (~30 occurrences/chapitre) | Nouveau `SpeechBubbleType` + forme SVG — passe par le processus bubble-proposals.html (règle : formes validées par Louis uniquement) |
| 3 | **Bulle cri polygonale déchiquetée** (bords droits irréguliers, étirable 1:4) | 2e signature SL (c00 p018 : 60 % de la page) | Idem — proposition de forme à valider |
| 4 | **Rich text intra-bulle** (un mot coloré/italique dans une bulle) | « THE GATE », « WEAKEST » en rouge — signature dramatique récurrente | `BubbleToolbar` + rendu texte bulle (execCommand foreColor) — hors composants gelés mais touche le système bulles |

### 🟠 P2 — polish, hors zone protégée
| # | Feature | Preuve |
|---|---|---|
| 5 | Bibliothèque de **stickers d'accent manga** (gouttes de sueur, ticks de surprise, traits de tremblement, étoiles, starburst d'impact) en overlay repositionnable | ~8-15 occurrences/chapitre — c82 p18 en a ~15 |
| 6 | **Motifs de bloc couleur** (trame halftone, croix de colère, stries verticales de transition) | fond comique YTIM p38, rideau de stries c01 p007 |
| 7 | **Fusion de bulles** (deux ellipses unies sans trait interne) + **rotation de bulle** | double-bosse c01 p12, bulle inclinée c10 p006 |
| 8 | **Bord adouci (feather)** par côté de bloc image — cases qui se dissolvent dans le fond | transitions oniriques c00 p010, YTIM p44 |
| 9 | **Compositions Q/R dans compose-chapter-layout** (letterbox + panorama vertical auto) | Edge Function — interdit sans accord explicite. La pose MANUELLE est couverte par les nouveaux presets |
| 10 | Gabarit **title card / outro de chapitre** (logo + crédits + numéro d'épisode) | structure répétée à l'identique SL c01→c82 |

### Notes de non-implémentation
- **Dégradé dans le remplissage du texte SFX** (jaune→orange SL) : `background-clip:text` n'est pas rendu par html2canvas — l'export perdrait le dégradé. Contour + lueur couvrent 80 % des cas. À revisiter si l'export migre vers une autre lib.
- **Fenêtre système en perspective 3D** (c00 p014) : texte éditable en perspective non atteignable proprement — compromis accepté : image générée FLUX.

---

## 4. Détails de conception (pour reprises futures)

- **Persistance** : `layout` JSONB porte `sfxBlocks[]` et `systemBlocks[]`. Tous les writes client font `{ ...layout }` (spread) → les clés survivent. L'Edge Function `compose-chapter-layout` réécrit le layout sans ces clés → **re-fusion client** dans `onCompose.onSuccess` (refetch → merge → updatePanel). « Refuser la recomposition » restaure le snapshot complet (clés incluses).
- **Export** : z-order aplati de l'export : couleurs 0 < images 10 < **système 14 < SFX 16** < bulles 20. Rendu partagé éditeur/export via composants purs `SfxVisual` / `SystemBlockVisual` (CSS restreint au sous-ensemble html2canvas : text-shadow, transform, gradients, borders — pas de box-shadow ni filter ni text-stroke).
- **Zone protégée respectée** : `useDragBlock`/`useResizeBlock` réutilisés tels quels (génériques). `handleAdd*`, `*MoveCommit`, layers image/couleur/bulle : non modifiés (seuls ajouts : désélection des nouveaux éléments dans leurs callbacks de sélection — comportement existant inchangé). `confirmCanvasElementDelete` : 2 branches ajoutées AVANT le fallthrough bulle, branches existantes intactes.

---

*Créé le 2026-07-03. Auteur : Claude (mission « éléments webtoon → Édition »). Prochaine itération : retours de Louis sur la section 3.*
