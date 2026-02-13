# DreamWeave — Documentation Produit

> **Dossier de conception produit complet** pour DreamWeave, la plateforme de création de webtoons par IA.

---

## Sommaire

### Documents originaux

| # | Document | Description |
|---|----------|-------------|
| — | [Product.md](./Product.md) | Document produit original — vue d'ensemble complète des fonctionnalités, flux utilisateur, stack technique et fonctionnalités à venir |

### Product Market Fit & Stratégie

| # | Document | Description |
|---|----------|-------------|
| 01 | [Product Market Fit](./01_Product_Market_Fit.md) | Analyse du problème, solution, marché cible, validation PMF, positionnement, risques, Go-to-Market |
| 03 | [Personas Utilisateurs](./03_Personas_Utilisateurs.md) | 4 personas détaillés (Luna, Marc, Élodie, Théo), frustrations, objectifs, WTP, matrice |
| 05 | [Business Model Canvas](./05_Business_Model_Canvas.md) | Canvas complet, modèle de revenus (freemium SaaS), grille tarifaire, projections, KPIs |
| 06 | [Analyse Concurrentielle](./06_Analyse_Concurrentielle.md) | Cartographie des concurrents, matrice comparative, SWOT, stratégie de différenciation |

### Conception Produit

| # | Document | Description |
|---|----------|-------------|
| 04 | [User Stories & Parcours](./04_User_Stories_Parcours.md) | Epics, user stories (40+), parcours utilisateur, experience map, priorisation RICE |
| 07 | [Roadmap Produit](./07_Roadmap_Produit.md) | 4 phases (Q1-Q4 2026), fonctionnalités détaillées, métriques de succès, timeline |

### Architecture Technique

| # | Document | Description |
|---|----------|-------------|
| 02 | [Architecture Technique](./02_Architecture_Technique.md) | Vue d'ensemble système, stack détaillée, architecture frontend/backend, flux de données, sécurité, performance |
| 08 | [Modèle de Données](./08_Modele_de_Donnees.md) | ERD, tables détaillées (5 tables), Storage, relations, contraintes, évolutions prévues |
| 09 | [Spécifications API](./09_Specifications_API.md) | API REST (PostgREST), Edge Functions, API FAL.ai, Storage API, SDK usage |
| 10 | [Sécurité & Infrastructure](./10_Securite_Infrastructure.md) | Couches de sécurité, RLS, secrets, RGPD, infrastructure, CI/CD, monitoring, DRP |

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

## Structure du dossier

```
Produit/
├── INDEX.md                          ← Ce fichier (sommaire)
├── Product.md                        ← Document produit original
├── 01_Product_Market_Fit.md          ← Analyse PMF & Go-to-Market
├── 02_Architecture_Technique.md      ← Architecture système complète
├── 03_Personas_Utilisateurs.md       ← 4 personas détaillés
├── 04_User_Stories_Parcours.md       ← User stories & parcours
├── 05_Business_Model_Canvas.md       ← Business model & revenus
├── 06_Analyse_Concurrentielle.md     ← Concurrence & SWOT
├── 07_Roadmap_Produit.md             ← Roadmap 4 phases (2026)
├── 08_Modele_de_Donnees.md           ← Schéma BDD & Storage
├── 09_Specifications_API.md          ← Documentation API
└── 10_Securite_Infrastructure.md     ← Sécurité, infra & monitoring
```

---

## Comment utiliser cette documentation

1. **Pour comprendre le produit** : Commencez par `Product.md`, puis `01_Product_Market_Fit.md`
2. **Pour comprendre les utilisateurs** : Lisez `03_Personas_Utilisateurs.md` et `04_User_Stories_Parcours.md`
3. **Pour le business** : Consultez `05_Business_Model_Canvas.md` et `06_Analyse_Concurrentielle.md`
4. **Pour la technique** : Commencez par `02_Architecture_Technique.md`, puis `08_Modele_de_Donnees.md` et `09_Specifications_API.md`
5. **Pour la roadmap** : Consultez `07_Roadmap_Produit.md`
6. **Pour la sécurité** : Référez-vous à `10_Securite_Infrastructure.md`

---

*Dernière mise à jour : 13 février 2026*
