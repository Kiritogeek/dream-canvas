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
| 04 | [User Stories](./04_User_Stories_Parcours.md) | Epics, stories, RICE |
| 07 | [Roadmap](./07_Roadmap_Produit.md) | Phases 2026 |
| — | [Plan Scénario](./Plan_Action_Developpement_Scénario.md) | Scénario : réalisé + chantier 1 + **TextHighlighter** (§5) |
| — | [**Édition de l’œuvre**](./Edition-Oeuvre.md) | **Document unique** : Phase 2 édition, flux Auto/Structuré, blocs/bulles, refonte Option B/A |
| — | [Guide styles](./Guide_Maintenance_Styles.md) | Évolution des styles (UI + EF) |
| — | [**NarraMind**](./NarraMind.md) | Mémoire narrative, EF, métriques ; persistance alertes sur branche **`feat/narramind-persist-alertes`** (PR dédiée) |
| — | [**Ariane** — guide & identité](./NarraMind-Guide-Personnage.md) | Assistance (NarraMind) + onboarding : nom, pictogramme, vouvoiement |
| — | [Plan implémentation NarraMind](./Plan-NarraMind-Implementation.md) | Phases code : alertes, caps prompt, mémoire longue, UI Ariane, 3ᵉ plan |
| — | [IA — Mesure & scalabilité](./IA-Mesure-et-Scalabilite.md) | Fournisseurs, `usage`, `narramind_metrics`, leviers charge |

### Architecture technique

| # | Document | Description |
|---|----------|-------------|
| 02 | [Architecture](./02_Architecture_Technique.md) | Stack, flux, sécurité |
| 08 | [Données](./08_Modele_de_Donnees.md) | ERD, tables, Storage |
| 09 | [API](./09_Specifications_API.md) | PostgREST, Edge Functions, FAL |
| 10 | [Sécurité & infra](./10_Securite_Infrastructure.md) | RLS, RGPD, CI/CD |

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

| Phase | Orientation |
|-------|-------------|
| Phase 1 — MVP | Livré |
| Phase 2 — Scénario & édition | Partiellement livré — voir `Edition-Oeuvre.md`, audits `Audits/` |
| Phase 3 — Export / monétisation | Planifié |
| Phase 4 — Scale | Futur |

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

*Dernière mise à jour : 30 avril 2026 — fusion docs édition, archive audit, déplacement feedback/école*
