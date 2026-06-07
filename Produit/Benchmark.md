# Benchmark complet — Webtoons, édition canvas & acteurs marché

> **Document** : comparaison structurée pour positionner **DreamWeave** face à des référents **logiciels de création**, **plateformes de publication** et **solutions IA « webtoon vertical »**.  
> **Mise à jour** : 2026-06-07 (audit de cohérence tiers/IA)  
> **Méthode** : grille critères notée /10, pondérations explicites, sources web listées en fin de document (guides officiels, comparatifs, annonces plateformes).

---

## 1. Résumé exécutif

| Acteur | Rôle dans le benchmark | Indice **création & production** (voir §4.1) /10 | Indice **publication & lecture** (voir §4.2) /10 |
|--------|------------------------|-----------------------------------------------|-----------------------------------------------|
| **DreamWeave** | Produit cible (web app, IA, canvas chapitre) | **8,0** | **6,3** |
| **Clip Studio Paint** | Référence « studio dessin » (Pro/EX) | **7,7** | **4,0** (export fort, pas de hub lecteur) |
| **MediBang Paint** | Alternative gratuite légère | **6,3** | **4,0** |
| **WEBTOON CANVAS** (comme **flux publication**) | Spécifications upload + lecteur | *N/A création* | **9,2** |
| **Tapas** (comme **flux publication**) | Dashboard créateur + monétisation Ink | *N/A création* | **8,8** |
| **Archétype « IA webtoon vertical »** (ex. Jenova, Anifusion — voir §3) | Génération & productivity IA | **7,4** | **6,5** |

**Lecture rapide**

- DreamWeave est **très compétitif sur la création assistée IA + mise en page** (blocs, bulles, style d’épisode), au prix d’un **écart encore possible** avec le **socle illustration pure** de Clip Studio et avec une **boucle publication one-click CANVAS/Tapas** (hors périmètre technique actuel des stores).
- Les **plateformes** WEBTOON / Tapas restent les **juges du dernier kilomètre** (JPEG, dimensions, thumbnails, communauté) — le benchmark sépare volontairement **production** vs **distribution** pour éviter de « pénaliser » abusivement soit les éditeurs dessin, soit les hubs.

---

## 2. Périmètre et acteurs comparés

### 2.1 Pourquoi ces acteurs ?

| Acteur | Pourquoi l’inclure |
|--------|---------------------|
| **DreamWeave** | Produit DreamWeave — SPA React, canvas chapitres, assets, IA FAL (FLUX), scénario, export découpage ZIP. |
| **Clip Studio Paint** | Standard industriel webtoon : toile longue, **export tranches**, **prévisualisation mobile**, bulles/matériaux ([manuel Webtoons](https://help.clip-studio.com/en-us/manual_en/540_comic/Webtoons.htm)). |
| **MediBang Paint** | Gratuit, cloud, panneaux/bulles — proxy du segment « accessible » ([comparatif tiers](https://www.multic.com/guides/best-webtoon-makers-compared/)). |
| **WEBTOON CANVAS** | **Spécifications** épisode (largeur, hauteur de segment, JPEG, etc.) + **lecture** verticale ([guide format](https://www.webtoons.com/en/canvas/webtoon-format/list?title_no=109936)). |
| **Tapas** | Alternative publication, **Ink**, dashboard créateurs ([creators.tapas.io](https://www.creators.tapas.io/), [aide Ink](https://help.tapas.io/hc/en-us/articles/115005798107-What-is-Ink-How-do-I-get-some)). |
| **IA vertical (archétype)** | Positionnement marché : cohérence personnage, rythme scroll, export multi-plateformes annoncé — illustré par [Jenova](https://www.jenova.ai/en/resources/best-ai-for-webtoon-creation), [Anifusion](https://anifusion.ai/features/ai-webtoon-creator/) (non exhaustif). |

### 2.2 Ce que ce benchmark ne mesure pas

- **Qualité artistique** du rendu par modèle (subjectif / dépend des prompts).
- **Prix et juridique** détaillé (licences CSP, revenus partagés CANVAS) — seulement des **indices** monétisation.
- **Parité fonctionnelle pixel par pixel** avec des produits fermés (pas d’audit interne WEBTOON/Tapas).

---

## 3. Hypothèses sur DreamWeave (état produit au moment du benchmark)

Utilisé pour noter de façon cohérente avec le code / la doc interne (`Edition-Oeuvre.md`, `ChapterDetail`, export ZIP 1280 px, largeur canvas 800 px, bulles, blocs couleur, historique image, scénario lié, plans Libre/Créateur/Studio).

| Capacité | Hypothèse |
|----------|-----------|
| Canvas | Blocs image, blocs couleur, bulles, zoom, redimensionnement, toolbars, undo canvas. |
| IA | Génération via Edge Functions + FAL, style projet, références. |
| Scénario | Chapitres scénario, détection assets, IA chapitre/scénario (selon roadmap livrée). |
| Export | Découpe **~1280 px** et **ZIP** depuis l’éditeur ; alignement avec pratiques type CANVAS à valider fichier par fichier. |
| Publication | Pas d’upload direct intégré vers WEBTOON/Tapas ; monétisation **DreamWeave** via **Stripe/plans** (Libre 0 € / Créateur 12,99 € / Studio 29,99 €, FLUX.2 Pro pour tous). |

Si une capacité évolue, **recalculer les lignes §4** lors de la prochaine révision du document.

---

## 4. Grilles de notation

**Échelle** : chaque critère **0–10** (10 = meilleur niveau observé dans le périmètre du critère pour cet acteur).

### 4.1 Table « **Création & production webtoon** »

Critères combinés dans un **indice pondéré** (somme des poids × note).  
**Pondération** :

| Critère | Poids | Description |
|---------|-------|-------------|
| **Composition & mise en page** | **25 %** | Grille blocs, redimensionnement, calques/overlays « éditable », précision placement. |
| **Dialogue & typographie** | **15 %** | Bulles, styles, lisibilité, contrôle local du texte. |
| **Pipeline assets & cohérence** | **20 %** | Bibliothèque personnages/décors/objets, réinjection dans les prompts, suivi sur la série. |
| **Prévisualisation « lecture mobile »** | **15 %** | Préview scroll vertical, ratio téléphone, rythme (blancs), confiance avant export. |
| **IA dans le flux créatif** | **25 %** | Génération intégrée, itération par bloc, suggestion prompts, même modèle FLUX.2 Pro pour tous les plans. |

#### Notes détaillées

| Critère | DreamWeave | Clip Studio | MediBang | Archétype IA vertical |
|---------|------------|-------------|----------|------------------------|
| Composition & mise en page | **8** — blocs + couleur + layout long ; pas de dessin vectoriel boîte à outils complet | **10** — référence professionnelle | **7** — panneaux/bulles, moins « webtoon long » intégré qu’une EX | **6** — souvent automatisation/placement génératif vs contrôle pixel |
| Dialogue & typo | **8** — toolbar riche (police, contour, fond, queue) | **9** — outils BD matures | **7** | **5** — variable selon outil ; focus souvent image |
| Pipeline assets & cohérence | **9** — bibliothèque projet + lien génération & scénario | **8** — matériaux communautaires ; cohérence = travail auteur | **7** | **9** — marketing fort sur « lock » personnage série |
| Prévisualisation lecture mobile | **5** — zoom & scroll dans modale ; **pas** encore mode « lecteur téléphone » dédié | **10** — zone d’affichage Webtoon (doc officielle) | **8** | **7** — souvent préview vertical intégrée |
| IA dans le flux | **9** — cœur produit | **3** — assistances limitées vs pipeline DreamWeave | **2** | **9** — promesse productivity |

#### Indices pondérés (§4.1)

Formule : \(\sum p_i \times s_i\) avec \(p\) en % et \(s\) la note /10.

| Acteur | Calcul (arrondi) | **Indice /10** |
|--------|------------------|----------------|
| DreamWeave | 0,25×8 + 0,15×8 + 0,20×9 + 0,15×5 + 0,25×9 | **8,0** |
| Clip Studio | 0,25×10 + 0,15×9 + 0,20×8 + 0,15×10 + 0,25×3 | **7,7** |
| MediBang | 0,25×7 + 0,15×7 + 0,20×7 + 0,15×8 + 0,25×2 | **6,3** |
| IA vertical | 0,25×6 + 0,15×5 + 0,20×9 + 0,15×7 + 0,25×9 | **7,4** |

---

### 4.2 Table « **Publication, conformité & monetization** »

**Pondération** :

| Critère | Poids | Description |
|---------|-------|-------------|
| **Alignement specs plateformes** | **35 %** | 800 px largeur, slices ~1280, JPEG/poids max, thumbnails (selon doc CANVAS etc.). |
| **Expérience lecteur finale** | **35 %** | App lecteur mature, découverte, commentaires — côté **plateforme**. |
| **Monétisation & relation créateur** | **30 %** | Ink, ad revenue, abonnements, programmes 2026, dashboard. |

**Notes** (DreamWeave mesuré comme **outil qui alimente** la publication, pas comme store) :

| Critère | DreamWeave | WEBTOON CANVAS | Tapas |
|---------|------------|----------------|-------|
| Specs plateformes | **7** — export ZIP découpé, largeur 800 dans le flux ; vérif JPEG/poids fichier par fichier côté auteur | **10** — référent natif ([format](https://www.webtoons.com/en/canvas/webtoon-format/list?title_no=109936), [notice découpage](https://www.webtoons.com/en/notice/detail?noticeNo=1766)) | **9** — guidelines publiques + communauté |
| Lecture finale | **4** — pas de hub lecteur DreamWeave identique WEBTOON | **10** | **9** |
| Monétisation créateur | **7** — **Stripe** / plans (**Libre/Créateur/Studio**) dans le produit ; pas de Ink / partage épisode tiers | **8** — programmes créateurs 2026 ([annonce](https://www.webtoons.com/en/notice/detail?noticeNo=3553)) | **8** — Ink & écosystème Tapas |

#### Indices pondérés (§4.2)

| Acteur | **Indice /10** |
|--------|----------------|
| DreamWeave | 0,35×7 + 0,35×4 + 0,30×7 = **6,3** |
| WEBTOON CANVAS | 0,35×10 + 0,35×10 + 0,30×8 = **9,2** |
| Tapas | 0,35×9 + 0,35×9 + 0,30×8 = **8,8** |

---

## 5. Synthèse par quadrant (Stratégie produit)

```text
                    fort en CRÉATION / IA
                            ▲
                            │
         Clip Studio ──────┼──────── DreamWeave
         (dessin pur)      │           (IA + layout)
                            │
────────────────────────────┼──────────────────────────► fort en PUBLICATION / LECTEUR
                            │
                            │    WEBTOON / Tapas
                            │    (distribution)
```

- **DreamWeave** : upper-right possible si vous continuez à renforcer **prévisualisation mobile** et **checklist pré-upload** tout en gardant l’IA.
- **Clip Studio** : upper-left (**maître** du pixel & export fichier, faible monetization intégrée).
- **WEBTOON / Tapas** : droite (**maîtres** de la diffusion), faible création intégrée.

---

## 6. Recommandations prioritaires (issues du benchmark)

Alignées avec `07_Roadmap_Produit.md` et l’audit technique — **sans doublon exhaustif** :

| Priorité | Action | Lien benchmark |
|----------|--------|----------------|
| P0 | **Mode « lecture téléphone »** ou bandeau ratio 9:16 safe dans l’éditeur | Rattraper CSP / attentes marché §4.1 |
| P0 | **Assistant conformité export** (JPEG, poids max, rappel 800×segments) avant ZIP | §4.2 vs [Webtoon Format](https://www.webtoons.com/en/canvas/webtoon-format/list?title_no=109936) |
| P1 | **Repères de tranche** visibles sur le canvas (lignes horizontales 1280) | Pratique auteur + [guides CSP export](https://help.clip-studio.com/en-us/manual_en/540_comic/Webtoons.htm) |
| P1 | **Presets composition** (1 hero + 2 cuts, bande réaction…) | Productivité vs [comparatif outils](https://www.multic.com/guides/best-webtoon-makers-compared/) |
| P2 | **Story** marketing : « cohérence série » explicite face aux **IA vertical** (assets + style + historique) | §4.1 archétype IA |

---

## 7. Sources & lectures utiles

| Source | URL | Usage dans le benchmark |
|--------|-----|-------------------------|
| Clip Studio — Webtoons (manuel) | https://help.clip-studio.com/en-us/manual_en/540_comic/Webtoons.htm | Export, découpe, prévisualisation |
| WEBTOON — Webtoon Format (Canvas) | https://www.webtoons.com/en/canvas/webtoon-format/list?title_no=109936 | Specs upload |
| WEBTOON — Notice découpage / optimisation | https://www.webtoons.com/en/notice/detail?noticeNo=1766 | Contexte technique upload |
| WEBTOON — Programmes créateurs 2026 | https://www.webtoons.com/en/notice/detail?noticeNo=3553 | Monetization / dashboard |
| Multic — Webtoon format guide | https://www.multic.com/guides/webtoon-format-guide/ | Synthèse multi-plateformes |
| Multic — Best webtoon makers | https://www.multic.com/guides/best-webtoon-makers-compared/ | Cartographie outils |
| Tapas — Publish | https://www.creators.tapas.io/ | Positionnement créateurs |
| Tapas — Ink (aide) | https://help.tapas.io/hc/en-us/articles/115005798107-What-is-Ink-How-do-I-get-some | Monétisation lecteur |
| Jenova — AI webtoon creation | https://www.jenova.ai/en/resources/best-ai-for-webtoon-creator | Archétype IA vertical |
| Anifusion — AI Webtoon Creator | https://anifusion.ai/features/ai-webtoon-creator/ | Archétype IA vertical |

---

## 8. Historique document

| Date | Auteur | Changement |
|------|--------|------------|
| 2026-05-02 | Équipe produit / assistant | Création : grilles pondérées, sources web, recommandations. |
| 2026-06-07 | Audit de cohérence | Plans alignés Libre/Créateur/Studio (0/12,99/29,99 €), FLUX.2 Pro pour tous, Sheet System. Notes /10 inchangées. |

---

*Les notes sont **indicatives** : revue semestrielle recommandée ou après toute évolution majeure du canvas / export / offre plateforme.*
