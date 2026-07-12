# Analyse cohérence images — 12/07/2026 (Test1 sans assets vs Test2 avec assets)

> Suite de `ANALYSE-COHERENCE-IMAGES-2026-06-27.md`. Deux tests terrain fournis par Louis sur le
> projet **Test** (`e771c871-4d0c-4051-9e8f-ddbd3f0ed28f`, kiritogeek@gmail.com), générés en
> **Mode Auto** (compose → « Générer toutes les cases »). Rendus archivés dans
> `References/Test/Test1` (chapitre 1, SANS assets) et `References/Test/Test2` (chapitre 2, AVEC assets).

## 0. TL;DR

Le pipeline d'identité **est câblé et fonctionne** (`mergeBlockRefAssets` → `panelRefs.ts` → FLUX).
- **Test1 (aucun asset créé)** : identité aléatoire — Janis change de visage/yeux à chaque case, ange = cliché waifu, fonds ensoleillés dans une crypte de nuit.
- **Test2 (assets créés : Janis, Entité angélique, 3 décors)** : l'ancrage marche, mais révèle un problème **pire** : **contamination croisée des références**. Janis hérite des ailes/robe de l'ange, une figuration anonyme hérite du visage de Janis, l'apparence (yeux rouges) n'est jamais respectée.

**Conclusion produit (décision EN ATTENTE de Louis)** : la génération 100% auto d'un chapitre multi-personnages cohérent est un **verrou technique non résolu**. Reco = **pivoter vers une génération assistée par case** (l'utilisateur choisit les assets par case), garder le full-auto en mode brouillon. Louis penche pour ça (« plus simple de laisser l'utilisateur générer lui-même pour l'instant »).

---

## 1. Assets du projet Test (créés par Louis pour Test2)

| Asset | Type | Description fiche |
|-------|------|-------------------|
| **Janis** | perso | Homme 17-20 ans, brun, blanc, **yeux rouge** |
| **Entité angélique** | perso | Ange, **bandeau blanc sur les yeux**, 4 ailes argenté, halo doré, présence DIVINE |
| **Hall gigantesque sous terre** | décor | Hall en rond, portes tout autour, autel au milieu |
| **porte de pierre** | décor | Porte de pierre intérieur crypte |
| **Crypte souterraine** | décor | Crypte souterraine |

---

## 2. Preuves

### Test1 — SANS assets (identité non ancrée)
| Symptôme | Cases |
|----------|-------|
| Janis change d'yeux (rouge → gris → rouge) et de visage | `Panel_06`, `12`, `32` |
| Fond ensoleillé/slice-of-life dans une crypte de nuit | `Panel_04`, `06` |
| Ange = guerrière waifu en armure au lieu de « être de lumière sans traits » | `Panel_29` |
| Cases vides (brouillard) / génération blanche | `Panel_02`, `33`, `39` |
| Compositions cassées (2 scènes empilées + blanc) | `Panel_01`, `04`, `12` |
| Texte cuit dans l'image (VOUS AVEZ ÉTÉ CHOISIS…) | `Panel_25`, `27`, `30` |

### Test2 — AVEC assets (contamination croisée)
| Symptôme | Cases |
|----------|-------|
| **Janis déguisé en ange** (robe + ailes dorées), alors que le prompt ne parle que de Janis | `Panel_22` |
| **Janis avec des ailes** derrière lui | `Panel_14` |
| **Yeux bruns au lieu de rouges** (fiche non respectée) | `Panel_08`, `14` |
| **Ange ≠ fiche** : homme musclé gris/nu au lieu de la femme-ange robe blanche/halo ; seul le bandeau survit | `Panel_01`, `02` |
| **Contradiction narrative** : Janis porte une marque alors qu'il n'est PAS marqué (figuration anonyme avec son visage) | `Panel_08` |
| **Narration qui déborde** de son cartouche et bave sur l'image | `Panel_05` |
| **Fond ville post-apo** au lieu du décor « Hall gigantesque » | `Panel_01`, `05` |
| Segments vides / diptyques | `Panel_20`, `08`, `14` |

---

## 3. Causes racines (code lu)

Chaîne : `handleGenerateAll` (ChapterDetail.tsx ~1090-1160) → `mergeBlockRefAssets` (l.231) → `panelRefs.ts buildReferencePlan` → FLUX (`generate-panel-image`).

1. **Contamination par continuité** — `handleGenerateAll` repasse `previousImageUrl` (image de la case précédente) dès que `hasVisualLink(promptA, promptB)` (l.249) trouve **≥2 mots communs > 4 lettres**. Deux cases du même lieu partagent « obscurité / immensité / lumière » → l'image de l'ange devient la référence de la case Janis → **Janis pousse des ailes** (`Panel_22`). Heuristique trop grossière : même vocabulaire ≠ même sujet.
2. **Multi-détection** — `mergeBlockRefAssets` = assets épinglés (`asset_refs`) ∪ assets **détectés par nom** dans le prompt. Une case qui nomme Janis ET l'ange passe les 2 fiches → FLUX **fusionne** les deux personnages.
3. **Apparence jamais en texte** — `getAssetReferencePromptLabel` (l.238) renvoie `character named "Janis"` : **zéro descripteur physique**. « Yeux rouge » ne tient qu'à l'image de la fiche ; diluée par les multi-refs → yeux bruns.
4. **Décor non injecté** — le décor n'est passé que s'il est **détecté par nom** dans le prompt. Les prompts des cases ange ne disent pas « Hall gigantesque sous terre » → pas de ref décor → FLUX invente une ville. Il faudrait épingler le décor via le champ `location` de la case (déjà produit par le découpage).
5. **Texte** — Test1 : le LLM de découpage a mis du texte littéral dans `description` en **violation de la RÈGLE EFFETS** de `detect-blocks.ts`. Test2 : la narration native est auto-placée par compose mais le **cartouche déborde** (bug de dimensionnement). Louis veut que le texte soit géré par l'utilisateur.
6. **Compose** — segments vides / diptyques : blocs trop hauts ou respirations envoyés en génération FLUX → canvas vide ou 2 scènes empilées.

> Note : `getAssetReferenceImageUrl` (l.209) envoie déjà la **face** en priorité (pas la sheet 4-angles) — fix C1 du 27/06 conservé, bon.

---

## 4. Plan de correction (priorisé)

| P | Action | Touche | Zone gelée ? |
|---|--------|--------|--------------|
| **P0** | **Pivot produit** : génération assistée par case (sélection explicite des assets) = chemin principal ; full-auto = mode « brouillon » assumé | Client | Non |
| **P0** | **Couper la contamination de continuité** : ne repasser `previousImageUrl` que si **mêmes `characters`** (même sujet), pas juste mots communs | Client `handleGenerateAll` / `hasVisualLink` | Non (logique génération, pas drag/resize) |
| **P1** | **Apparence en texte** : injecter « brun, yeux rouges, 17 ans » depuis la fiche dans le label, pas que le nom | ⚠️ EF `generate-panel-image` + client | Non |
| **P1** | **1 gros plan = 1 seul personnage** : ne pas passer 2 fiches perso sur une même génération close-up | Client + ⚠️ EF | Non |
| **P1** | **Décor auto-épinglé** par le `location` de la case | Client | Non |
| **P2** | Narration : corriger la taille de cartouche **ou** la rendre optionnelle (préférence Louis) | ⚠️ EF `compose` | Proche compose |
| **P2** | Compose : plafonner la hauteur de bloc envoyée à FLUX (anti-diptyque), ne pas générer les respirations/vides | ⚠️ EF `compose` | Proche compose |

**Contraintes** :
- ⚠️ `generate-panel-image` et `compose-chapter-layout` sont des **Edge Functions** → ne pas modifier sans feu vert Louis.
- La **zone canvas gelée** (drag/resize/delete des blocs image/couleur/bulles) n'est PAS concernée par ces fixes : ils touchent l'orchestration de génération et les prompts, pas le comportement des éléments canvas.

---

## 5. Décision en attente (à trancher prochaine session)

**Option A (reco)** : pivot génération assistée d'abord (fiable, livrable vite), puis fixes de contamination pour améliorer les 2 modes.
**Option B** : tenter d'abord les fixes de contamination (continuité + apparence en texte) pour voir si le full-auto devient acceptable avant de trancher.

> 📝 Impact Mémoire signalé à Louis : décision de direction produit sur la feature cœur (auto vs assisté). `Produit/Memoire_DreamWeave.md` à mettre à jour une fois tranché (proposition d'encadré fournie dans le fil de session).
