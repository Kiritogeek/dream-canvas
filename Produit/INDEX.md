# DreamWeave — Documentation Produit

> Dossier de conception produit complet pour DreamWeave, plateforme de création de webtoons par IA.

---

## Sommaire

### Documents originaux

| # | Document | Description |
|---|----------|-------------|
| — | [Product.md](./Product.md) | Document produit original — vue d'ensemble des fonctionnalités, flux, stack technique et à venir |

### Product Market Fit & Stratégie

| # | Document | Description |
|---|----------|-------------|
| 01 | [Product Market Fit](./01_Product_Market_Fit.md) | Problème, solution, marché cible, validation PMF, positionnement, risques, Go-to-Market |
| 03 | [Personas Utilisateurs](./03_Personas_Utilisateurs.md) | 4 personas (Luna, Marc, Élodie, Théo), frustrations, objectifs, WTP, matrice |
| 05 | [Business Model Canvas](./05_Business_Model_Canvas.md) | Canvas, modèle freemium SaaS, grille tarifaire, projections, KPIs |
| 06 | [Analyse Concurrentielle](./06_Analyse_Concurrentielle.md) | Concurrents, matrice comparative, SWOT, différenciation |

### Conception Produit & UX

| # | Document | Description |
|---|----------|-------------|
| **UX** | [**UX — Parcours utilisateur**](./UX.md) | **Étapes actuelles et futures, écran par écran ; schéma global de l'UX** |
| 04 | [User Stories & Parcours](./04_User_Stories_Parcours.md) | Epics, user stories (40+), parcours, experience map, priorisation RICE |
| 07 | [Roadmap Produit](./07_Roadmap_Produit.md) | 4 phases (Q1–Q4 2026), fonctionnalités, métriques, timeline |
| — | [Plan d'action Section Scénario](./Plan_Action_Developpement_Scénario.md) | Scénario : réalisé (phases A–G) + à prévoir (renommage assets) |
| — | [Plan d'action TextHighlighter](./Plan_Action_TextHighligh_No_Assets.md) | Détection éléments non créés : règles, répétition, stop-words, évolutions |
| — | [**Plan Phase 2 — Édition de l'œuvre**](./Plan_Phase2_Edition_Oeuvre.md) | **Plan détaillé Phase 2 : section Édition de l'œuvre, lien textuel↔visuel, IA Panel, transformation chapitre texte → visuel** |
| — | [**Édition panel — Blocs et bulles**](./Edition_Panel_Blocs_Bulles.md) | Workflow édition panel : agencement blocs, prompt par bloc, **génération par bloc (images dans les blocs)**, bulles, visualisation 720×5000 |
| — | [**Édition panel — Deux modes**](./Edition_Panel_Deux_Modes.md) | **Mode Architecture** (ajout, position, dimensions des blocs) et **Mode Édition** (prompt avec détection assets, bulles, effets, fond, texte) |

### Architecture Technique

| # | Document | Description |
|---|----------|-------------|
| 02 | [Architecture Technique](./02_Architecture_Technique.md) | Vue d'ensemble système, stack détaillée, architecture frontend/backend, flux de données, sécurité, performance |
| 08 | [Modèle de Données](./08_Modele_de_Donnees.md) | ERD, tables détaillées (5 tables), Storage, relations, contraintes, évolutions prévues |
| 09 | [Spécifications API](./09_Specifications_API.md) | API REST (PostgREST), Edge Functions, API FAL.ai, Storage API, SDK usage |
| 10 | [Sécurité & Infrastructure](./10_Securite_Infrastructure.md) | Couches de sécurité, RLS, secrets, RGPD, infrastructure, CI/CD, monitoring, DRP |
| 11 | [Rapport Chapitres — Flux, blocs, scénario](./11_Rapport_Chapitres_Flux_Blocs_Scenario.md) | Deux flux (Automatique / Structuré), images pleines dans des blocs, synopsis vs scénario, proposition de mise en place |

---

## Vue d'ensemble du projet

**DreamWeave** est une plateforme web permettant de créer des webtoons (bandes dessinées verticales) grâce à l'intelligence artificielle générative.

### Proposition de valeur

> Créer des webtoons professionnels en quelques heures, sans compétences artistiques, grâce à l'IA.

### Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 18 + TypeScript + Vite 7 + Tailwind CSS + shadcn/ui |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **IA** | FAL.ai API (FLUX.2 Pro) |
| **Hébergement** | Vercel / Netlify + Supabase Cloud |

### Statut actuel

| Phase | Statut | Description |
|-------|--------|-------------|
| **Phase 1 — MVP** | ✅ Livré | Auth, projets, style, assets, génération IA, dashboard |
| **Phase 2 — Panels** | 🔜 Next | Génération de panels, dialogues, lecteur webtoon |
| **Phase 3 — Export** | 📋 Planifié | Export PDF/PNG, collaboration, monétisation |
| **Phase 4 — Scale** | 📋 Futur | Marketplace, app mobile, publication, analytics |

---

## Structure uniforme des documents

Chaque document du dossier suit la même structure :

| Élément | Règle |
|--------|--------|
| **Titre** | `# Titre — Sous-titre` (H1 unique) |
| **Description** | Court bloc `> ...` (1–2 lignes) en tête |
| **Séparateur** | `---` après la description |
| **Corps** | Sections `## 1. …`, `## 2. …` (numérotation cohérente) |
| **Fin** | `---` puis `*Dernière mise à jour : JJ mois AAAA*` |

---

## Structure du dossier

```
Produit/
├── INDEX.md                          ← Ce fichier (sommaire + structure uniforme)
├── UX.md                             ← Parcours UX : étapes actuelles/futures + schéma global
├── Product.md                        ← Document produit original
├── 01_Product_Market_Fit.md          ← Analyse PMF & Go-to-Market
├── 02_Architecture_Technique.md      ← Architecture système complète
├── 03_Personas_Utilisateurs.md       ← 4 personas détaillés
├── 04_User_Stories_Parcours.md       ← User stories & parcours
├── 05_Business_Model_Canvas.md       ← Business model & revenus
├── 06_Analyse_Concurrentielle.md     ← Concurrence & SWOT
├── 07_Roadmap_Produit.md             ← Roadmap 4 phases (2026)
├── Plan_Action_Developpement_Scénario.md  ← Section Scénario : réalisé + à prévoir
├── Plan_Action_TextHighligh_No_Assets.md ← Détection éléments non créés (assets)
├── 08_Modele_de_Donnees.md           ← Schéma BDD & Storage
├── 09_Specifications_API.md          ← Documentation API
├── 10_Securite_Infrastructure.md     ← Sécurité, infra & monitoring
└── 11_Rapport_Chapitres_Flux_Blocs_Scenario.md  ← Flux chapitres, blocs, scénario
```

---

## Comment utiliser cette documentation

1. **Pour l’UX et les parcours** : Commencez par `UX.md` (étapes + schéma), puis `04_User_Stories_Parcours.md`
2. **Pour comprendre le produit** : `Product.md`, puis `01_Product_Market_Fit.md`
3. **Pour les utilisateurs** : `03_Personas_Utilisateurs.md` et `04_User_Stories_Parcours.md`
4. **Pour le business** : `05_Business_Model_Canvas.md` et `06_Analyse_Concurrentielle.md`
5. **Pour la technique** : `02_Architecture_Technique.md`, puis `08_Modele_de_Donnees.md` et `09_Specifications_API.md`
6. **Pour la roadmap** : `07_Roadmap_Produit.md`
7. **Pour la sécurité** : `10_Securite_Infrastructure.md`

---

*Dernière mise à jour : 14 février 2026 (UX.md ajouté, structure uniforme des documents, index Conception Produit & UX)*
