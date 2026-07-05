# Spec — Découpage Light Novel → Webtoon (2026-07-05)

> Spec générée à partir de l'analyse de vraies paires LN↔Webtoon (Shadow Slave, Lord of Mysteries, The Beginning After The End, My Vampire System) via novelfrance.fr + recherche webtoon.
> Références détaillées (locales, non commitées) : `References/LightNovel/patterns.md`, `References/Webtoon/patterns.md`.
> But : rendre le découpage `detect_blocks` **objectif** et **fidèle** (fin des « cases qui n'ont aucun sens »).

---

## Principe : DÉCOUPAGE OBJECTIF

Le nombre de cases n'est **jamais imposé** : il découle des beats réels. Un chapitre riche = beaucoup de cases (100 cases si le chapitre les justifie). Déjà appliqué dans `detect-blocks.ts` (CIBLE retirée) + `index.ts` (plafond de sortie 8192→32768).

## Light Novel vs Webtoon (résumé)

| | Light Novel (source) | Webtoon (cible) |
|---|---|---|
| Porteur du sens | Prose, **monologue intérieur**, description sensorielle | **Image** ; texte minimal |
| Rythme | Phrases longues à clauses enchâssées | **Vide vertical (gutter)** entre les cases |
| World-building | Décrit en toutes lettres | **Montré** dans l'image (environmental storytelling) |
| Densité | 400-600 mots/page | Max 3 bulles/case, 3-8 mots/ligne, cases muettes |

## Ratios documentés
- 1 scène LN (300-500 mots, 1 moment clé) ≈ **6-10 cases** (exposition 5-6 · action 8-12 serrées · introspection 4-7 avec grand blanc).
- Épisode ≈ **40-55 cases**, 8-12 beats majeurs (~4-6 cases/beat).
- Compression roman→manhua ~1,6:1 (Lord of Mysteries : 104→65 ch.).

---

## Les 15 règles de mapping LN → Webtoon (à intégrer au prompt `detect_blocks`)

1. **Description → establishing** : paragraphe descriptif (décor sans acteur) = 1 case establishing, détail dans l'image/palette, pas en bulle.
2. **Monologue → séquence visuelle** : 2-4 phrases de pensée = 3-5 cases (macro-expression + body language + réaction), 1-2 captions courtes max.
3. **Phrase multi-couches → mini-séquence** : 1 phrase à clauses enchâssées = 2-3 cases, une couche par case.
4. **Action → décomposition** : paragraphe d'action = 3-5 cases (charge → impact → réaction), gutters réduits 50-150px, mouvement qui descend l'écran.
5. **Dialogue → 1 réplique par case** : bulle courte (3-8 mots/ligne) ; jamais 2 locuteurs différents dans une même case.
6. **Allègement dialogue** : couper 30-50% (confirmations, répétitions, qualificateurs) ; garder subtext, révélations, pivots.
7. **Passage sensoriel → fond + expression** : odeur/froid/toucher = détail de background + réaction du visage, pas de bulle descriptive.
8. **Réalisation émotionnelle → trigger/choc/révélation** : 3 cases (déclencheur → gros plan choc → révélation), gutter 600-900px AVANT la révélation.
9. **Question thématique → caption sur splash** : question rhétorique = caption sur case d'ambiance / title card, pas une bulle de perso.
10. **Contraste textuel → cases adjacentes** : avant/après = 2 cases juxtaposées, la dualité est montrée.
11. **Gutter = tempo** : rythme par le vide vertical, pas par le texte (barème `breathing_after` : 50-150 action … 600-900 cliffhanger … 2000+ ellipse).
12. **Budget de cases par scène** : 6-10 cases/scène selon le registre.
13. **Structure d'épisode** : climax aux ~2/3, hook dans les 10-15% finaux, ne jamais finir au calme.
14. **Plafond densité texte** : max 3 bulles/case, cases muettes privilégiées.
15. **Cull sans pitié** : couper monologue redondant, asides explicatifs (« Il réalisa que… » → montrer), descriptions ornementales, double-vérifications.

---

## Prochaine étape (proposée)
Ces 15 règles peuvent enrichir le system prompt `detect-blocks.ts` (aujourd'hui la grammaire visuelle par `scene_type` existe, mais le **mapping registre LN → nb de cases + gutter** n'est pas explicite). Intégration = Edge Function → feu vert + déploiement. Voir wiki `[[Decoupage-Regles]]` (§2 bis).

Sources : novelfrance.fr, webtoons.com (format), comistitch.com, s-morishitastudio.com, toonora.com (Solo Leveling novel→webtoon), lordofthemysteries.fandom.com.
