# Plan d'action — Suite de l'audit 2026-06-27

> Objectif : finaliser la mise en production des correctifs de l'audit, dans l'ordre **impact produit décroissant / risque maîtrisé**.
> Convention : 🟣 = action Claude (code), 🔵 = action Louis (deploy/décision). Chaque phase de code = commit sur `fix/audit-2026-06-27` + `tsc`/`lint`/`test`/`build` verts + QA avant déploiement.

---

## ✅ Phase 0 — Déjà en production
- EF déployées : `generate-scenario-ai` v73, `compose-chapter-layout` v31, `generate-asset-image` v70, `generate-panel-image` v58 → **2 IDOR critiques fermées + quota aligné**.
- Migration `20260627120000` (RLS WITH CHECK + index FK + search_path) **appliquée**.

---

## Phase 1 — Mettre en ligne le frontend déjà codé  🔵 (+ 🟣 push)
*Gains d'activation/acquisition immédiats, zéro code, zéro risque.*
**Contenu** : lazy-load ReactFlow, manualChunks, split polices, dead code supprimé, OG tags, sr-only FR, em-dash (2 chaînes), tests invariants.
- 🟣 Push de `fix/audit-2026-06-27` vers `pre-production` (autorisé).
- 🔵 Vérifier le déploiement Vercel (preview) puis valider la mise en prod (`main`) — **push `main` = ton accord explicite requis**.
- 🔵 Déposer `public/og-image.png` (1200×630) — image binaire à produire côté design.
- **Validation** : ouvrir un projet (chargement allégé), onglet Univers (skeleton puis graphe), partage de lien (preview correcte).
- **Rollback** : revert du merge / redeploy build précédent.

---

## Phase 2 — Décisions produit (à débloquer)  🔵
*Bloque une partie du code en aval. À trancher d'abord.*
- **H1 — différenciateurs Studio** : ❓ (A) retirer « mémoire longue » + « priorité FAL » de `Plans.tsx` *(reco — cohérent « tout gratuit »)* **ou** (B) les implémenter.
  - Si **A** → 🟣 retirer les 2 lignes `Plans.tsx`, aligner `CLAUDE.md` + `Vision-Produit` + signaler au mémoire. (~30 min, frontend)
  - Si **B** → projet à part entière (gating mémoire dans `narramind-update` + file FAL prioritaire) — à planifier séparément.
- **Scénario IA hors-crédit** : ❓ documenter comme produit d'appel *(reco)* **ou** ajouter un compteur. Si « documenter » → 🟣 note dans CLAUDE.md/mémoire, 0 code.

---

## Phase 3 — Race condition quota (item A)  🟣 + 🔵 deploy
*Protège le modèle économique avant d'ouvrir les vannes.*
**Contenu** :
- 🟣 Nouvelle migration : fonction Postgres `consume_image_credit(user_id, limit, period_start)` **atomique** (SECURITY DEFINER) — insère la ligne `usage` seulement si `count < limit`, en une transaction ; renvoie succès/échec.
- 🟣 `generate-asset-image` + `generate-panel-image` : remplacer le *check-puis-insert* par un appel à la RPC **avant** l'appel FAL (réservation), avec **suppression de la réservation si FAL échoue** (pas de crédit perdu sur échec).
- 🔵 Appliquer la migration (Dashboard SQL Editor) + redéployer les 2 EF (`--use-api`, AVG Web Shield coupé).
- **Validation** : à 19/20 crédits, lancer 3 générations en parallèle → **une seule** passe, les autres → 429. Une génération qui échoue ne consomme pas de crédit.
- **Risque** : chemin de facturation → QA renforcé + test au bord exact du quota.
- **Rollback** : redeploy v70/v58 + la RPC reste inerte si non appelée.

---

## Phase 4 — Fiabilité de l'outil créatif (item C)  🟣 + 🔵 deploy
*Le livrable et l'écriture, cœur de la promesse produit. Frontend only.*
- 🟣 `ScenarioTextHighlighter` : mémoïser le rendu + pré-calculer la map offset→ligne (supprime le coût quadratique à la frappe).
- 🟣 Export chapitre : rendu **séquentiel** (au lieu de tout en mémoire) + **barre de progression « panel X/N »** → anti-OOM sur gros chapitres.
- 🔵 Déployer le frontend (avec Phase 1 ou à la suite).
- **Validation manuelle (QA)** : écrire dans un long scénario (pas de saccade) ; exporter un chapitre très long (pas de page blanche, progression visible).
- **Risque** : non testable en runtime ici → **QA manuel obligatoire** avant prod.

---

## Phase 5 — Polish (items B + D)  🟣 + 🔵 deploy
*Finition « pro », faible priorité.*
- 🟣 (B) Durcissement EF : `encodeURIComponent` + whitelist `plan` (admin), messages d'erreur génériques (plus de `details` bruts), exiger `SUPABASE_ANON_KEY`, upsert embeddings atomique. → 🔵 redeploy 5 EF.
- 🟣 (D) Sweep em-dash complet + règle ESLint anti-régression (hors commentaires/zone protégée).
- **Validation** : `tsc`/`lint`/`test`/`build` + smoke test admin.

---

## Phase 6 — Zone canvas protégée (optionnel)  🔵 accord requis + 🟣
*Intégrité données + maintenabilité. Nécessite ton feu vert explicite (règle CLAUDE.md).*
- **`UNIQUE(chapter_id)`** : 🟣 d'abord vérifier l'absence de doublons en base → dédoublonner si besoin → ajouter la contrainte (migration). Empêche les « canvas fantômes ».
- **Factorisation handlers + sérialiseurs `Json`** (maintenabilité, comportement identique) — optionnel.

---

## Séquencement recommandé
```
Phase 1 (deploy front)  ──┐
Phase 2 (décisions H1)  ──┤→  Phase 3 (race condition)  →  Phase 4 (fiabilité)  →  Phase 5 (polish)  →  Phase 6 (si validé)
```
Phases 1 et 2 en parallèle (l'une est un deploy, l'autre une décision). Le code (3→5) s'enchaîne sur la branche, avec un déploiement groupé EF + un déploiement frontend.

## Récap qui fait quoi
| Type d'action | Qui |
|---|---|
| Écrire le code, commits, tsc/lint/test/build, QA, push `pre-production` | 🟣 Claude |
| Déployer les EF (`supabase ... --use-api`), appliquer les migrations (Dashboard), push/merge `main` | 🔵 Louis |
| Décisions produit (H1, crédit scénario), `og-image.png` | 🔵 Louis |

> 📝 **Impact Mémoire** : Phase 2 (modèle économique) et Phase 3 (intégrité du comptage de crédits) à refléter dans `Memoire_DreamWeave.md` si l'offre Studio ou le modèle de crédits y sont décrits.
