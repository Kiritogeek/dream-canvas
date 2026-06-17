# DreamWeave — Documentation Produit

> Dossier de conception produit pour DreamWeave (webtoons par IA).

---

## Sommaire

### Documents originaux

| # | Document | Description |
|---|----------|-------------|
| — | [Product.md](./Product.md) | Document produit original — vue d’ensemble, flux, stack, à venir |

### Product Market Fit & stratégie

| # | Document | Description |
|---|----------|-------------|
| 01 | [Product Market Fit](./01_Product_Market_Fit.md) | PMF, validation, Go-to-Market |
| 03 | [Personas](./03_Personas_Utilisateurs.md) | 4 personas, WTP |
| 05 | [Business Model](./05_Business_Model_Canvas.md) | Freemium, grille tarifaire, KPIs |
| 06 | [Concurrentielle](./06_Analyse_Concurrentielle.md) | SWOT, différenciation |

### Conception produit & UX

| # | Document | Description |
|---|----------|-------------|
| **UX** | [**UX**](./UX.md) | Parcours utilisateur, écran par écran |
| **BM** | [**Benchmark**](./Benchmark.md) | Grilles pondérées (création / publication), références Clip Studio · WEBTOON CANVAS · Tapas · IA vertical, sources web |
| 04 | [User Stories](./04_User_Stories_Parcours.md) | Epics, stories, RICE |
| 07 | [Roadmap](./07_Roadmap_Produit.md) | Phases 2026 |
| — | [Plan Scénario](./Plan_Action_Developpement_Scénario.md) | Scénario : réalisé + chantier 1 + **TextHighlighter** (§5) |
| — | [**Édition de l’œuvre**](./Edition-Oeuvre.md) | **Document unique** : Phase 2 édition, flux Auto/Structuré, blocs/bulles, refonte Option B/A |
| — | [Guide styles](./Guide_Maintenance_Styles.md) | Évolution des styles (UI + EF) |
| — | [**NarraMind**](./NarraMind.md) | Mémoire narrative : tronc commun + 2 pistes, EF `narramind-update`, métriques |
| — | [**NarraMind Compass**](./NarraMind-Compass.md) | Vectorisation RAG : `narramind-compass` (index/propose), pgvector, `project_embeddings`, `compass_proposals` |
| — | [**NarraMind Compass — Univers**](./NarraMind-Compass-Univers.md) | Compass appliqué au lore / graphe Univers |
| — | [**Ariane** — guide & identité](./NarraMind-Guide-Personnage.md) | Assistance (NarraMind) + onboarding : nom, pictogramme, vouvoiement |
| — | **Parcours premier projet** | Spec Obsidian : `wiki/Parcours-Premier-Projet.md` ; résumé `UX.md` §2.2bis |
| — | [Plan implémentation NarraMind](./Plan-NarraMind-Implementation.md) | Phases code : alertes, caps prompt, mémoire longue, UI Ariane, 3ᵉ plan |
| — | [IA — Mesure & scalabilité](./IA-Mesure-et-Scalabilite.md) | Fournisseurs, `usage`, `narramind_metrics`, leviers charge |
| — | [Spec Admin KPI](./Spec_Admin_KPI.md) | Dashboard `Pilotage.tsx`, Edge `admin-get-kpis` / `admin-set-plan` / `admin-user-action` |

### Architecture technique

| # | Document | Description |
|---|----------|-------------|
| 02 | [Architecture](./02_Architecture_Technique.md) | Stack, **14 Edge Functions**, **§6.3 communication entre features**, sécurité |
| 08 | [Données](./08_Modele_de_Donnees.md) | ERD, tables réelles (mémoire, lore, Compass), Storage |
| 09 | [API](./09_Specifications_API.md) | PostgREST, Edge Functions, FAL.ai, `chapter_canvases` |
| 10 | [Sécurité & infra](./10_Securite_Infrastructure.md) | RLS, RGPD, CI/CD |
| 12 | [POC & itérations](./12_POC_Iterations_Techniques.md) | Historique technique, décisions (FLUX.2 Pro, tiers) |
| 13 | [Spécifications Application Mobile](./13_Specifications_Application_Mobile.md) | Premières specs app compagnon PWA (lecture + suivi), périmètre V1, questions ouvertes |

> Liste complète et à jour des Edge Functions (avec « appelée par ») : [`../docs/EDGE_FUNCTIONS_INDEX.md`](../docs/EDGE_FUNCTIONS_INDEX.md).

### Feedback & hors périmètre produit app

| Chemin | Document |
|--------|----------|
| [../docs/feedback/12_Retour_Utilisateur_Jeremy.md](../docs/feedback/12_Retour_Utilisateur_Jeremy.md) | Retour utilisateur (Jeremy) |
| [../docs/ecole/Buisness_Project.md](../docs/ecole/Buisness_Project.md) | Dossier école / RNCP (hors produit) |

---

## Vue d’ensemble

**DreamWeave** : plateforme web pour créer des webtoons verticaux avec IA générative.

### Proposition de valeur

> Créer des webtoons professionnels en quelques heures, sans compétences artistiques, grâce à l’IA.

### Stack (résumé)

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| IA image | FAL.ai (FLUX) |
| Hébergement | Vercel / Netlify + Supabase Cloud |

### Phases (vision produit — détail dans Roadmap & audits récents)

| Phase | Orientation | État réel (juin 2026) |
|-------|-------------|-----------------------|
| Phase 1 — MVP & fondations | Projets, assets, style, Sheet System, plans, auth | ✅ Livré |
| Phase 2 — Scénario, édition & monétisation | Section Scénario (IA + NarraMind + Ariane), Éditeur Canvas (blocs image/couleur + 12 bulles), Univers/Lore + Compass, Stripe, export PNG | ✅ Livré (Mode Auto = moteur de composition livré, chaînage image à finaliser) |
| Phase 3 — Export avancé / publication | Export HD, publication Webtoon/Tapas, collaboration | 📋 Planifié |
| Phase 4 — Marketplace & scale | Marketplace styles, PWA, API B2B | 📋 Futur |

---

## Structure uniforme des documents

| Élément | Règle |
|---------|-------|
| **Titre** | `# Titre — Sous-titre` (H1 unique) |
| **Description** | Bloc `> …` (1–2 lignes) |
| **Séparateur** | `---` après la description |
| **Corps** | `## 1. …`, `## 2. …` |
| **Fin** | `---` puis `*Dernière mise à jour : …*` |

---

## Arborescence (principaux fichiers)

```
Produit/
├── INDEX.md
├── UX.md
├── Product.md
├── 01_ … 10_*.md          # PMF, archi, personas, stories, business, concurrence,
│                           roadmap, données, API, sécurité
├── Edition-Oeuvre.md      # Fusion documentation édition (avr. 2026)
├── NarraMind.md
├── NarraMind-Guide-Personnage.md
├── Plan-NarraMind-Implementation.md
├── IA-Mesure-et-Scalabilite.md
├── Plan_Action_Developpement_Scénario.md
├── Guide_Maintenance_Styles.md
├── Benchmark.md
├── 13_Specifications_Application_Mobile.md  # Premières specs app compagnon PWA
└── Archive-Audit-2026-02.md   # Snapshot audit 17/02/2026 (INDEX historique)
docs/
├── feedback/12_Retour_Utilisateur_Jeremy.md
└── ecole/Buisness_Project.md
```

---

## Comment utiliser cette documentation

1. **UX** : `UX.md` puis `04_User_Stories_Parcours.md`
2. **Produit** : `Product.md`, `01_Product_Market_Fit.md`
3. **Édition chapitre / blocs** : `Edition-Oeuvre.md`
4. **Technique** : `02_Architecture_Technique.md`, `08_Modele_de_Donnees.md`, `09_Specifications_API.md`
5. **IA & coûts** : `IA-Mesure-et-Scalabilite.md`, `NarraMind.md`
6. **État code historique (fév. 2026)** : `Archive-Audit-2026-02.md` — pour l’état **actuel**, préférer les audits datés dans `Audits/`.

---

*Dernière mise à jour : 16 juin 2026 — ajout `13_Specifications_Application_Mobile.md` (premières specs app compagnon PWA). Précédente : 13 juin 2026 (audit vérité 2) — ajout des docs manquants à l'index (NarraMind-Compass, NarraMind-Compass-Univers, Spec_Admin_KPI, 12_POC), phases réalignées sur l'état réel (Phase 2 livrée : Scénario + Édition + Univers/Compass + Stripe + export PNG), renvoi vers `docs/EDGE_FUNCTIONS_INDEX.md` (14 fonctions) et `02_Architecture §6.3` (communication entre features). Précédente : 2 mai 2026 — Benchmark.* 
