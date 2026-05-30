# AUDIT COMPLET DREAMWEAVE — 2026-05-30

> Audit de référence (Opus 4.8). Base pour toutes corrections de bugs / améliorations futures.
> Méthode : exécution réelle (tsc, vitest, eslint), inspection code, gating, sécurité, cohérence docs↔code.

---

## 0. Verdict en une ligne

Le produit est **fonctionnellement riche et techniquement sain au compilateur** (TSC 0 erreur, ESLint 0 erreur), mais souffre de **deux problèmes critiques invisibles à la compilation** : le **modèle freemium ne différencie plus rien** (tout est déverrouillé sur le plan Libre) et la **suite de tests est rouge** (4/50) avec une **CI qui échoue donc à chaque push**.

---

## 1. Scorecard

| Domaine | Note | Évidence |
|---------|------|----------|
| Compilation TypeScript | 🟢 10/10 | `tsc --noEmit` → 0 erreur |
| Lint | 🟢 9/10 | `eslint .` → 0 erreur, 5 warnings cosmétiques (react-refresh / unused type) |
| Tests | 🔴 3/10 | `vitest run` → **4 échecs / 50** (suite rouge, CI cassée) |
| Monétisation / gating | 🔴 3/10 | Tous les gates ouverts sur Libre — freemium non différencié |
| Architecture | 🟠 6/10 | Features riches mais God Components (ChapterDetail 2496 l.) |
| Sécurité | 🟢 7.5/10 | RLS stricte, verify_jwt manuel cohérent, `.env` tracké (mineur) |
| Cohérence docs↔code | 🔴 4/10 | Tarifs contradictoires sur 4 sources |

---

## 2. 🔴 P0 — Critiques (à traiter en priorité absolue)

> **STATUT 2026-05-30 — RÉSOLU PAR DÉCISION PRODUIT + ALIGNEMENT CODE.** Louis a tranché : choix assumé « tout gratuit », différenciation sur le **volume de crédits** (20/100/250) + mémoire longue Studio. `TIER_CONFIG` reste en l'état (tout ouvert). Docs alignées. **De plus, les gates ad-hoc qui contredisaient encore cette décision ont été supprimés** (la décision n'était qu'à moitié appliquée) :
> - `StyleManager.tsx` — images de référence : `userPlan !== "libre"` → piloté par `TIER_CONFIG[userPlan].allowReferenceImages` (const `canUseReferenceImages`). Libre peut désormais ajouter des images de référence.
> - `ChapterDetail.tsx` / `EditorRightPanel.tsx` — outil Cases : prop `isPro` (= plan payant) renommée `canUseCases`, pilotée par `allowScenarioAI`. Libre accède à l'outil Cases. `isPro` conservé uniquement pour la couleur du badge de plan (usage légitime).
> - `Dashboard.tsx:227` — upsell reformulé en volume de crédits (« 100 générations/mois au lieu de 20 »).
> - Copy marketing : `Landing.tsx` (highlights cartes) + `Plans.tsx` (cartes Libre/Créateur + tableau comparatif : Projets, Découpage, Export, Fil d'Ariane passent à « accessible Libre ») alignés sur tout-gratuit.
> Reste cosmétique : branche else morte dans `StyleManager` (upsell refs jamais rendu tant que `allowReferenceImages` est true partout) — conservée comme fallback si re-gating futur. TSC 0 · lint 0 · tests 51/51.

### P0-1 — Le freemium ne différencie plus rien (→ choix assumé, voir statut ci-dessus)
**Évidence** : `src/types/index.ts:25-62` — les 3 plans (`libre`/`createur`/`studio`) ont des valeurs identiques sur **tous** les gates :

| Gate | libre | createur | studio | Attendu (Roadmap) |
|------|-------|----------|--------|-------------------|
| `maxProjects` | `null` (illimité) | `null` | `null` | Libre = **1 projet** |
| `allowScenarioAI` | `true` | `true` | `true` | Libre = **false** |
| `allowFullExport` | `true` | `true` | `true` | Libre = **false** |
| `filArianeLimit` | `null` (illimité) | `null` | `null` | Libre = **3 alertes** |
| `allowLongMemory` | `false` | `false` | `true` | OK |
| crédits/mois | 20 | 100 | 250 | (cf. P1-1) |

**Conséquence** : la seule différence réelle entre Libre et payant est **le nombre de crédits** (20 vs 100/250) et la mémoire longue (Studio). Un utilisateur Libre obtient Scénario IA, découpage cases, export complet, fil d'Ariane illimité, projets illimités — **gratuitement**. Il n'y a quasiment aucune raison de payer.

**Mécanique de gating intacte** : le code consommateur fonctionne (`Dashboard.tsx:63` teste `maxProjects !== null`, `EditionSection.tsx:215` teste `allowScenarioAI`, `ArianeContinuityPanel.tsx:112` teste `filArianeLimit`, `Dashboard.tsx:227` affiche même un upsell "Passez à Créateur pour le découpage IA et l'export"). **Seules les valeurs de config sont sur "tout ouvert"** — probablement des valeurs de test jamais rétablies. La Roadmap les déclare pourtant "✅ Livré (03/05)".

**Fix** : restaurer les valeurs de gate dans `TIER_CONFIG` (1 fichier, ~6 lignes). À décider d'abord : est-ce un choix stratégique (lancer tout-gratuit) ou une régression ? → Question 1.

> **STATUT 2026-05-30 — RÉSOLU.** Les 4 assertions périmées de `panels.test.ts` (`estimatePanelCount`) ont été réécrites selon le contrat réel (`round(mots/45)`, plancher 30 mots, override `targetPerChapter`). Suite verte : **51/51**. Constantes mortes `PANELS_REFERENCE_MIN/MAX` retirées des imports du test (toujours exportées dans `panels.ts` mais plus consommées — cleanup optionnel à part). CI redevient verte.

### P0-2 — Suite de tests rouge + CI cassée (→ RÉSOLU, voir statut ci-dessus)
**Évidence** : `vitest run` → **4 tests échouent** dans `src/services/panels.test.ts` (`estimatePanelCount`). Le test attend `PANELS_REFERENCE_MAX` (=14, plafond), mais `estimatePanelCount` (`panels.ts:88-97`) a été réécrit : il divise par 45 sans plafond (`words(2000)` → 44). **Le test est périmé, pas le code** — mais le résultat est une suite rouge.

**Aggravant** : `.github/workflows/ci.yml` exécute `npm test` (ligne 30) sur chaque `push main` et chaque PR → **la CI échoue systématiquement**. Le pre-commit Husky ne lance **que** `tsc + eslint` (pas les tests), donc la régression a pourri silencieusement.

**Note doc** : `Audits-Techniques.md` affirme "pas de CI" et le protocole de session affirme "npm test 0 régression" — **les deux sont faux**.

**Fix** : mettre à jour les 4 assertions du test (5 min) → suite verte → CI verte. Puis décider si le pre-commit doit aussi lancer les tests.

---

## 3. 🟠 P1 — Importants

### P1-1 — Incohérence tarifaire sur 4 sources
| Source | Libre | Intermédiaire | Haut |
|--------|-------|---------------|------|
| **Code** (`types/index.ts`) | 0€ / 20cr | Créateur 12,99€ / 100cr | Studio 29,99€ / 250cr |
| Roadmap-2026.md | 0€ / 20cr | Créateur 12,99€ / 100cr | Studio 29,99€ / 250cr |
| **CLAUDE.md** | 0€ / 20cr | Créateur **7,99€ / 150cr** | Studio **19,99€ / 500cr** |
| Vision-Produit.md | Free 0€ / 20cr | Pro **14,99€ / 300cr** | — |

Le code = la Roadmap (faisant foi). **CLAUDE.md et Vision-Produit sont périmés** et risquent d'induire en erreur le mémoire de fin d'études et toute décision business. → 📝 Impact Mémoire (cf. §6).

### P1-2 — B2 toujours non corrigé (perte de données possible)
`src/services/panels.ts:181` — `replacePanelsFromOutline` fait `delete` puis `createPanelsFromOutline` (insert) **sans transaction**. Si l'insert échoue après le delete, le chapitre perd tous ses panels. Documenté depuis le 23/04, jamais corrigé. **Fix** : RPC Supabase transactionnel ou Edge Function.

### P1-3 — God Components (maintenabilité)
| Fichier | Lignes | Cible |
|---------|--------|-------|
| `ChapterDetail.tsx` | **2496** | < 400 (Roadmap Option A) |
| `LoreGraphView.tsx` | 2244 | — |
| `ScenarioChapterEditor.tsx` | 1728 | — |
| `SpeechBubbleEditor.tsx` | 1543 | — |

ChapterDetail reste le point chaud (zone canvas freezée → refactoring à signaler avant exécution). L'Option A de la Roadmap (LayersPanel, undo/redo, découpe < 400 l.) est inachevée.

---

## 4. 🟡 P2 — Hygiène

- **`.env` tracké par git** : ne contient que des valeurs publiques côté client (`VITE_SUPABASE_*`, `VITE_ADMIN_EMAIL`). Risque faible (la clé anon est publique par design, RLS protège). À déplacer hors suivi par hygiène ; l'email admin exposé est cosmétique (admin vérifié server-side).
- **`npm audit` inaccessible** (erreur certificat réseau local) → angle mort sur les vulnérabilités de dépendances. À relancer hors réseau filtré.
- **Bugs B4/B5/B6/B7** (useAuth double setState, chapterId `?? ""`, invalidate→refetch, sidebar recouvrement) : statut de correction non confirmé, à revérifier ponctuellement.
- **Dossiers `References/` non commités** (git status) — fichiers de recherche webtoon. À `.gitignore` ou committer.

---

## 5. ✅ Ce qui est solide

- **TSC + ESLint au vert** (hors warnings cosmétiques) — discipline de typage réelle.
- **Périmètre fonctionnel large et cohérent** : auth PKCE+OAuth, Style System, Sheet System 4 angles, Scénario IA (Gemini+fallback Groq), composition webtoon (14 compositions A-P), NarraMind/fil d'Ariane, Compass pgvector, Stripe live (Créateur+Studio), vue admin KPI.
- **Sécurité** : RLS `auth.uid()=user_id` partout, `verify_jwt=false` assumé + vérification manuelle ES256 dans chaque handler, CORS `ALLOWED_ORIGIN`.
- **Outillage** : Husky pre-commit (tsc+eslint), CI existante (à réparer).

---

## 6. 📝 Impact Mémoire de fin d'études

> **Ce qui change** : les tarifs et quotas réels (code) diffèrent de ceux écrits dans CLAUDE.md et Vision-Produit.
> **Section concernée** : Modèle économique.
> **Proposition** : aligner le mémoire sur la grille du code/Roadmap — **Libre 0€/20cr · Créateur 12,99€/100cr · Studio 29,99€/250cr** — et préciser le facteur de différenciation réel une fois P0-1 tranché (quota seul, ou quota + features gatées).

---

## 7. Plan d'action recommandé (ordre)

1. **P0-1** — Trancher la stratégie freemium puis restaurer `TIER_CONFIG` (ou documenter le choix tout-gratuit). *~10 min code.*
2. **P0-2** — Réparer les 4 assertions de `panels.test.ts` → suite + CI vertes. *~5 min.*
3. **P1-1** — Aligner CLAUDE.md + Vision-Produit + mémoire sur la grille réelle. *~10 min docs.*
4. **P1-2** — Rendre `replacePanelsFromOutline` atomique (RPC). *~30 min.*
5. **P1-3** — Reprendre l'Option A éditeur (signaler la zone canvas avant toute touche). *Chantier.*

---

*Audit produit par Opus 4.8 le 2026-05-30. Données d'exécution réelles. Sert de référence pour les corrections futures.*
