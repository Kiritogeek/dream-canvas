# Business Model Canvas — DreamWeave

> Bloc canvas : proposition de valeur, segments, canaux, revenus (Free/Pro), partenaires IA et infra.

---

## Vue d'ensemble

```
┌───────────────────┬──────────────────┬───────────────────┬──────────────────┬───────────────────┐
│                   │                  │                   │                  │                   │
│  PARTENAIRES      │  ACTIVITÉS       │  PROPOSITION      │  RELATIONS       │  SEGMENTS         │
│  CLÉS             │  CLÉS            │  DE VALEUR        │  CLIENTS         │  CLIENTS          │
│                   │                  │                   │                  │                   │
│  • FAL.ai (IA)    │  • Développement │  Créer des        │  • Self-service  │  • Auteurs de     │
│  • Supabase       │    produit       │  webtoons         │  • Communauté    │    webfiction     │
│  • Black Forest   │  • Optimisation  │  professionnels   │  • Support email │  • Créateurs de   │
│    Labs (FLUX.2 Pro)    │    prompts IA    │  en quelques      │  • Tutoriels &   │    contenu        │
│  • Plateformes    │  • Community     │  heures, sans     │    docs          │  • Studios &      │
│    webtoon        │    management    │  compétences      │  • Discord       │    éditeurs       │
│  • Vercel/        │  • Marketing     │  artistiques,     │                  │  • Amateurs       │
│    Netlify        │    d'acquisition │  grâce à l'IA     │                  │    passionnés     │
│                   │  • Support       │  générative       │                  │                   │
│                   │                  │                   │                  │                   │
├───────────────────┤                  │                   │                  ├───────────────────┤
│                   │                  │                   │                  │                   │
│  RESSOURCES       │                  │  Unique :         │                  │  CANAUX           │
│  CLÉS             │                  │  • Cohérence      │                  │                   │
│                   │                  │    stylistique    │                  │  • Site web       │
│  • Équipe dev     │                  │  • Vues multiples │                  │  • SEO/SEM        │
│  • Modèles IA     │                  │  • Workflow natif │                  │  • Réseaux        │
│  • Infrastructure │                  │    webtoon        │                  │    sociaux        │
│    cloud          │                  │  • Bibliothèque   │                  │  • Communautés    │
│  • Communauté     │                  │    d'assets       │                  │    (Reddit,       │
│    d'utilisateurs │                  │    réutilisables   │                  │    Discord)       │
│                   │                  │                   │                  │  • Influenceurs   │
│                   │                  │                   │                  │  • Product Hunt   │
│                   │                  │                   │                  │                   │
├───────────────────┴──────────────────┴───────────────────┴──────────────────┴───────────────────┤
│                                                                                                │
│  STRUCTURE DE COÛTS                            │  FLUX DE REVENUS                               │
│                                                │                                                │
│  • Infrastructure cloud (Supabase) : ~50-200€/m│  • Abonnements freemium (SaaS)                 │
│  • API IA (FAL.ai) : variable, ~0.01-0.05€/img │  • Plans : Free / Pro / Team / Enterprise       │
│  • Hébergement (Vercel) : ~20-100€/mois        │  • Crédits de génération supplémentaires        │
│  • Salaires équipe : principal poste de coût   │  • (Futur) Marketplace de styles                │
│  • Marketing & acquisition : 10-20% du CA      │  • (Futur) Commission sur publications          │
│                                                │                                                │
└────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

---

## 1. Segments de clients

### Segment primaire : B2C — Créateurs individuels

| Sous-segment | Taille estimée | Valeur par client |
|-------------|---------------|-------------------|
| Auteurs de webfiction (Wattpad, AO3, Tapas) | 10M+ actifs | 10-30 €/mois |
| Créateurs de contenu (YouTube, TikTok) | 50M+ créateurs | 15-50 €/mois |
| Auteurs de romans / auto-édition | 5M+ auteurs | 20-50 €/mois |
| Amateurs passionnés de webtoons | 100M+ lecteurs | 0-10 €/mois (freemium) |

### Segment secondaire : B2B — Professionnels

| Sous-segment | Taille estimée | Valeur par client |
|-------------|---------------|-------------------|
| Studios de webtoons | 10K+ studios | 100-500 €/mois |
| Agences de marketing (storytelling) | 50K+ agences | 50-200 €/mois |
| Institutions éducatives | 100K+ | 30-100 €/mois |

---

## 2. Proposition de valeur

### Valeur fonctionnelle

| Bénéfice | Avant DreamWeave | Avec DreamWeave |
|---------|------------------|----------------|
| **Temps de création** | 1-4 semaines/chapitre | 2-4 heures/chapitre |
| **Coût** | 300-2000 €/chapitre | < 5 €/chapitre (coût API) |
| **Compétences requises** | Dessin, colorisation, mise en page | Écriture de descriptions |
| **Cohérence visuelle** | Difficile à maintenir | Automatique (templates) |
| **Vues personnages** | Redessin manuel à chaque angle | Génération en 1 clic |

### Valeur émotionnelle

- **Empowerment** : "Je peux enfin visualiser mes histoires"
- **Fierté** : "J'ai créé ça moi-même"
- **Créativité libérée** : "Je me concentre sur l'histoire, pas le dessin"

### Valeur sociale

- **Statut** : "Je suis auteur de webtoon"
- **Partage** : Contenu partageable sur les réseaux sociaux
- **Communauté** : Appartenance à un mouvement de création IA

---

## 3. Modèle de revenus

### 3.1 Freemium SaaS — Grille tarifaire (mise à jour 18/04/2026)

> **Logique Spotify** : même qualité pour tous, seule la quantité diffère. Un utilisateur Free génère avec le même modèle qu'un Pro → il voit la valeur → il upgarde pour en avoir plus.

| | **Free** | **Pro** |
|---|---------|---------|
| **Prix** | 0 € | 14,99 €/mois |
| **Modèle IA** | **FLUX.2 Pro** (identique au Pro) | **FLUX.2 Pro** |
| **Crédits/mois** | **20** | **300** |
| **1 crédit =** | 1 génération (asset, sheet, bloc panel) | 1 génération (unifié) |
| **Sheet personnage** | ✓ (fiche composite 4 angles) | ✓ |
| **Cohérence panels** | ✓ (sheet injectée automatiquement) | ✓ |
| **Scénario IA basique** | ✓ | ✓ |
| **Découpage Chapitre → Panels** | ✗ (CTA upgrade) | **✓** |
| **Priorité traitement** | Standard | Prioritaire |
| **Support** | Communauté | Email |

> **Note** : Le multi-vues (profil G/D/dos séparés) est remplacé par le **Sheet System** — une fiche composite 4 angles générée en 1 action, disponible pour tous les plans. La sheet est injectée automatiquement comme référence dans la génération de panels pour garantir la cohérence visuelle.

> **⚠️ Stripe code implémenté (18/04) — déploiement après finalisation Scénario + Sheet System.**

#### Plans futurs (non implémentés)

| | **Team** | **Enterprise** |
|---|----------|---------------|
| **Prix** | 39,99 €/mois | Sur devis |
| **Générations/mois** | 1000 | Illimitées |
| **Export** | PDF, PNG, Format plateforme | API + tous formats |
| **Collaboration** | 5 membres | Illimité |
| **Support** | Prioritaire | Dédié |

### 3.2 Revenus complémentaires (futurs)

| Source | Description | Timeline |
|--------|------------|----------|
| **Crédits supplémentaires** | Packs de 100/500/1000 générations | 6 mois |
| **Marketplace de styles** | Vente de templates de style par la communauté (commission 30%) | 12 mois |
| **API B2B** | Accès API pour intégration dans d'autres outils | 12 mois |
| **Publication assistée** | Commission sur les webtoons publiés via la plateforme | 18 mois |

### 3.3 Projections financières (hypothèses)

#### Année 1 (lancement)

| Métrique | M3 | M6 | M9 | M12 |
|----------|-----|-----|-----|------|
| **Utilisateurs inscrits** | 500 | 3 000 | 10 000 | 25 000 |
| **Utilisateurs actifs (MAU)** | 200 | 1 200 | 4 000 | 10 000 |
| **Taux conversion Free→Pro** | 2% | 4% | 5% | 6% |
| **Abonnés payants** | 4 | 48 | 200 | 600 |
| **ARPU** | 14,99 € | 17 € | 19 € | 21 € |
| **MRR** | 60 € | 816 € | 3 800 € | 12 600 € |
| **ARR (projeté)** | — | — | — | ~150 000 € |

#### Coût unitaire par génération

| Modèle | Endpoint | Coût/image |
|--------|----------|------------|
| FLUX.1 Schnell (Free) | `fal-ai/flux/schnell` | ~$0.003 |
| FLUX.2 Pro (Pro, sans refs) | `fal-ai/flux-2-pro` | ~$0.03 |
| FLUX.2 Pro Edit (Pro, 2 refs) | `fal-ai/flux-2-pro/edit` | ~$0.09 |

> FAL.ai facture au **megapixel traité** (output + input refs). Avec 2 images de référence, chaque génération traite 3 megapixels (1 sortie + 2 entrées).

#### Marge brute par plan

| Plan | Prix | Coût max/mois | Coût réaliste/mois | Marge brute |
|------|------|---------------|-------------------|------------|
| **Free** | 0 € | $0.06 (20 × $0.003) | ~$0.04 | -$0.04 |
| **Pro** | 14,99 € | $27 (300 × $0.09 pire cas) | ~$15 (mix 50/50) | ~50-60% |

---

## 4. Canaux de distribution

### 4.1 Acquisition (comment les clients nous trouvent)

| Canal | Stratégie | Coût | Priorité |
|-------|----------|------|----------|
| **SEO** | "AI webtoon creator", "create webtoon without drawing" | Faible | P0 |
| **Communautés** | Reddit r/webtoons, r/webcomics, Discord serveurs manga/webtoon | Faible | P0 |
| **Product Hunt** | Lancement avec démo interactive | Faible | P0 |
| **Content Marketing** | Tutoriels, articles "How to create a webtoon with AI" | Moyen | P1 |
| **Réseaux sociaux** | Twitter/X, TikTok (montrer des créations), Instagram | Moyen | P1 |
| **Influenceurs** | Partenariats avec YouTubers/TikTokers storytelling | Élevé | P1 |
| **SEM** | Google Ads sur mots-clés ciblés | Élevé | P2 |
| **Partenariats** | Wattpad, plateformes webtoon | Variable | P2 |

### 4.2 Distribution (comment les clients accèdent au produit)

- **Web app** : Application navigateur, responsive (desktop + mobile)
- **Progressive Web App (PWA)** : Installation possible sur mobile (futur)
- **App native** : iOS/Android (long terme)

---

## 5. Relations clients

| Type | Description | Canal |
|------|------------|-------|
| **Self-service** | Inscription, utilisation, paiement autonome | Web app |
| **Communauté** | Entraide entre utilisateurs, partage de styles | Discord, Forum |
| **Support** | FAQ, documentation, email support | Site web, Email |
| **Onboarding** | Tutoriel interactif, exemples, templates | In-app |
| **Fidélisation** | Newsletter, nouveautés, challenges créatifs | Email, Discord |

---

## 6. Ressources clés

| Ressource | Description | Criticité |
|-----------|------------|-----------|
| **Équipe de développement** | Frontend, backend, IA, DevOps | Critique |
| **Modèles IA** | Accès aux APIs de génération d'images | Critique |
| **Infrastructure cloud** | Supabase, hébergement, CDN | Critique |
| **Communauté** | Early adopters, beta testeurs, ambassadeurs | Élevée |
| **Propriété intellectuelle** | Prompts système optimisés, workflow unique | Élevée |
| **Données** | Métriques d'usage, feedback utilisateurs | Moyenne |

---

## 7. Activités clés

| Activité | Description | Fréquence |
|----------|------------|-----------|
| **Développement produit** | Nouvelles fonctionnalités, corrections, optimisations | Continue |
| **Optimisation IA** | Amélioration des prompts, test de nouveaux modèles | Hebdomadaire |
| **Acquisition utilisateurs** | Marketing, SEO, community management | Continue |
| **Support client** | Réponse aux questions, résolution de problèmes | Quotidien |
| **Analyse produit** | Métriques, A/B tests, feedback analysis | Hebdomadaire |
| **Veille technologique** | Nouveaux modèles IA, tendances webtoon | Mensuel |

---

## 8. Partenaires clés

| Partenaire | Rôle | Type de relation |
|-----------|------|-----------------|
| **FAL.ai** | Fournisseur API IA (FLUX.2 Pro) | Fournisseur |
| **Supabase** | Backend-as-a-Service (BDD, Auth, Storage) | Fournisseur |
| **Vercel / Netlify** | Hébergement et CDN frontend | Fournisseur |
| **Plateformes webtoon** (Webtoon, Tapas) | Distribution du contenu créé | Partenaire stratégique |
| **Communautés créatives** (Wattpad, DeviantArt) | Source d'utilisateurs | Partenaire marketing |

---

## 9. Structure de coûts

### 9.1 Coûts fixes mensuels

| Poste | Coût estimé | Notes |
|-------|------------|-------|
| Supabase (Pro plan) | 25 €/mois | BDD, Auth, Storage, Edge Functions |
| Hébergement frontend | 0-20 €/mois | Vercel free tier → Pro |
| Domaine | ~1 €/mois | DNS |
| Outils (GitHub, Sentry, etc.) | ~50 €/mois | Outillage développement |
| **Total fixe** | **~100 €/mois** | Hors salaires |

### 9.2 Coûts variables

| Poste | Coût unitaire | Notes |
|-------|--------------|-------|
| API FAL.ai (par image) | ~0,02-0,04 € | Dépend du volume |
| Storage additionnel | ~0,02 €/GB/mois | Au-delà du plan inclus |
| Bande passante | ~0,09 €/GB | CDN images |
| Support (temps) | Variable | Proportionnel aux utilisateurs |

### 9.3 Coûts de croissance

| Poste | Coût estimé | Déclencheur |
|-------|------------|-------------|
| Marketing payant | 500-5000 €/mois | Phase de croissance |
| Supabase scale-up | 100-500 €/mois | > 10K MAU |
| Équipe support | 2000+ €/mois | > 5K utilisateurs payants |
| Infrastructure IA dédiée | 1000+ €/mois | Optimisation coûts à volume |

---

## 10. Métriques clés à suivre (KPIs)

### Métriques produit

| KPI | Définition | Cible |
|-----|-----------|-------|
| **DAU/MAU** | Ratio utilisateurs actifs quotidiens/mensuels | > 30% |
| **Time to Value** | Temps entre inscription et première génération | < 10 min |
| **Taux d'activation** | % inscrits qui créent un projet | > 60% |
| **Rétention J30** | % utilisateurs actifs après 30 jours | > 25% |
| **Générations/utilisateur/mois** | Nombre moyen d'images générées | > 15 |

### Métriques business

| KPI | Définition | Cible |
|-----|-----------|-------|
| **MRR** | Monthly Recurring Revenue | Croissance > 15%/mois |
| **Taux de conversion** | Free → Payant | > 5% |
| **ARPU** | Average Revenue Per User (payants) | > 18 € |
| **CAC** | Customer Acquisition Cost | < 30 € |
| **LTV** | Lifetime Value | > 150 € |
| **LTV/CAC** | Ratio valeur/coût acquisition | > 3:1 |
| **Churn** | Taux de désabonnement mensuel | < 8% |

---

---

## 11. Organisation & Équipe

### 11.1 Contributeurs réels du dépôt (git log)

| Identifiant git | Email | Commits | Rôle déduit |
|----------------|-------|---------|-------------|
| **Louis Basnier** | louis.basnier@naxos.fr | 108 | Product Owner, architecture, UX, full-stack |
| **Kiritogeek** | kiritogeek@gmail.com | 96 | Frontend, UI/composants, Edge Functions, animations, bugfixes — même personne que Louis Basnier (config git différente sur la machine) |
| **Schiffear** | — | 20 | Prompt engineering, Sheet System, sidebar navigation, cohérence génération assets |
| **Marine Tardy Miquel** | — | 3 | NarraMind (itération 2), chargement images, export ZIP |
| **Cursor Agent** | — | 2 | Agent IA (assistant de développement) |
| **gpt-engineer-app[bot]** | — | 2 | Bot IA (assistant de développement) |
| **Lovable** | — | 1 | Plateforme IA (scaffold initial) |

**Total : 237 commits sur la branche `main`.**

### 11.2 Structure de l'équipe

- **Projet solo** : Louis Basnier est le seul développeur humain actif à temps plein.
- **Contributeurs ponctuels** : Schiffear (prompt engineering, Sheet System) et Marine Tardy Miquel (NarraMind) ont contribué sur des fonctionnalités spécifiques.
- **Outillage IA** : Cursor Agent, gpt-engineer-app, Lovable et Claude Code ont accéléré le développement (commits IA représentent ~40% du total).

### 11.3 Répartition des responsabilités

| Domaine | Responsable |
|---------|-------------|
| **Product & Vision** | Louis Basnier |
| **Frontend React / TypeScript** | Louis Basnier |
| **Backend Supabase / Edge Functions** | Louis Basnier |
| **Prompt Engineering IA** | Louis Basnier + Schiffear |
| **Sheet System / Cohérence visuels** | Schiffear |
| **NarraMind (mémoire narrative)** | Louis Basnier + Marine Tardy Miquel |
| **DevOps / CI-CD** | Louis Basnier (GitHub Actions) |

### 11.4 Structure juridique

**Non trouvé dans le code.** Aucune mention de structure juridique (SAS, SASU, auto-entrepreneur, etc.) n'a été trouvée dans les fichiers du dépôt (`/Produit/`, code source, documentation).

### 11.5 Vesting, equity, associés

**Non trouvé dans le code.** Aucune information sur des accords de vesting, parts sociales ou associés n'est présente dans les fichiers du dépôt.

---

*Dernière mise à jour : 4 mai 2026 — section 11 ajoutée (Organisation & Équipe)*
