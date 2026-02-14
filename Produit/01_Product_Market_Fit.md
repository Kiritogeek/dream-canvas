# Product Market Fit — DreamWeave

## 📋 Vue d'ensemble

**DreamWeave** est une plateforme web innovante permettant de créer des webtoons (bandes dessinées verticales) grâce à l'intelligence artificielle. Le produit démocratise la création de contenu visuel narratif en permettant à quiconque, sans compétences artistiques, de transformer ses idées en webtoons professionnels.

---

## 1. Le Problème

### 1.1 Contexte de marché

Le marché mondial des webtoons est en pleine explosion :
- **Valorisation** : estimé à ~5 milliards USD en 2025, avec une croissance annuelle (CAGR) de 35-40 %
- **Lecteurs** : des centaines de millions d'utilisateurs actifs sur Webtoon, Tapas, Lezhin, Tappytoon, etc.
- **Démographie** : principalement 13-35 ans, forte adoption mobile, marché global (Corée, USA, Europe, SEA)

### 1.2 Le goulot d'étranglement : la création

Malgré une demande croissante de contenu, **la création de webtoons reste inaccessible** :

| Barrière | Impact | Gravité |
|----------|--------|---------|
| **Compétences artistiques** | Dessin, colorisation, mise en page, composition — nécessite des années de formation | Critique |
| **Coût de production** | 300-2000 €/chapitre si sous-traité à un artiste | Élevé |
| **Temps de production** | 1 à 4 semaines par chapitre (20-40 panels) | Élevé |
| **Cohérence visuelle** | Maintenir un style identique sur 50+ chapitres est un défi technique | Moyen |
| **Outils fragmentés** | Pas de workflow unifié (Photoshop + Clip Studio + export manuel) | Moyen |

### 1.3 Conséquence

Des **millions de créateurs potentiels** (auteurs, scénaristes, conteurs, fans) ont des histoires à raconter mais ne peuvent pas les transformer en webtoons. Le contenu disponible ne suit pas la demande.

---

## 2. La Solution DreamWeave

### 2.1 Proposition de valeur

> **DreamWeave permet à quiconque de transformer une histoire en webtoon professionnel en quelques heures, sans compétences artistiques, grâce à l'IA générative.**

### 2.2 Comment DreamWeave résout chaque barrière

| Barrière | Solution DreamWeave |
|----------|-------------------|
| Compétences artistiques | Génération automatique via IA (FLUX.1 Schnell pour Free, FLUX.2 Pro / Pro Edit pour Pro, via FAL.ai) |
| Coût de production | Coût marginal par image (quelques centimes via API) |
| Temps de production | Minutes par asset, heures par chapitre |
| Cohérence visuelle | Système de templates de style + images de référence (Pro) |
| Outils fragmentés | Plateforme tout-en-un : assets → chapitres → panels → lecture |

### 2.3 Avantage compétitif durable

1. **Système de cohérence stylistique** : Template texte + images de référence appliqués à toutes les générations
2. **Vues multiples des personnages** : Face, profil gauche, profil droit, dos — unique sur le marché (Pro)
3. **Workflow natif webtoon** : Format vertical, optimisé lecture mobile
4. **Bibliothèque d'assets réutilisables** : Un personnage créé une fois, utilisé dans tous les panels

---

## 3. Segments de marché cibles

### 3.1 Segment primaire : Créateurs indépendants (TAM estimé)

| Segment | Taille estimée | Willingness to Pay | Priorité |
|---------|---------------|-------------------|----------|
| **Auteurs de webfiction / fanfiction** | 10M+ auteurs actifs mondiaux | 10-30 €/mois | P0 |
| **Créateurs de contenu** (YouTubers, TikTokers) | 50M+ créateurs | 15-50 €/mois | P0 |
| **Auteurs de romans** voulant adapter en visuel | 5M+ auteurs auto-publiés | 20-50 €/mois | P1 |
| **Amateurs passionnés** de webtoons | 100M+ lecteurs de webtoons | 5-15 €/mois | P1 |

### 3.2 Segment secondaire : Professionnels

| Segment | Taille estimée | Willingness to Pay | Priorité |
|---------|---------------|-------------------|----------|
| **Studios et éditeurs** (pré-production) | 10K+ studios | 100-500 €/mois | P2 |
| **Agences marketing** (storytelling visuel) | 50K+ agences | 50-200 €/mois | P2 |
| **Éducation** (supports pédagogiques visuels) | 100K+ institutions | 30-100 €/mois | P3 |

### 3.3 Early Adopters (cible de lancement)

**Profil idéal** :
- Auteur/scénariste avec une histoire déjà écrite
- Familier avec les plateformes de webtoons (lecteur régulier)
- Frustré par l'impossibilité de visualiser ses histoires
- Actif sur des communautés comme Wattpad, AO3, Reddit r/webtoons
- Budget : 10-30 €/mois

---

## 4. Validation du Product-Market Fit

### 4.1 Signaux positifs actuels

| Signal | Indicateur |
|--------|-----------|
| **Demande existante** | Recherches "AI webtoon maker", "create webtoon without drawing" en forte hausse |
| **Marché en croissance** | +35% CAGR marché webtoons |
| **Technologie mature** | IA générative (Flux, SDXL, DALL-E 3) produit des résultats de qualité suffisante |
| **Peu de concurrents directs** | Pas de solution tout-en-un spécialisée webtoon avec IA |
| **Validation fonctionnelle** | Le MVP DreamWeave génère déjà des assets cohérents |

### 4.2 Métriques PMF à suivre

#### Métriques d'activation (premières semaines)

| Métrique | Cible PMF | Méthode de mesure |
|----------|----------|-------------------|
| **Taux d'inscription** (landing → signup) | > 5% | Analytics |
| **Taux d'activation** (signup → 1er projet créé) | > 60% | Supabase |
| **Time to Value** (signup → 1er asset généré) | < 10 min | Supabase |

#### Métriques de rétention (signal fort de PMF)

| Métrique | Cible PMF | Méthode de mesure |
|----------|----------|-------------------|
| **Rétention J7** | > 40% | Supabase + Analytics |
| **Rétention J30** | > 25% | Supabase + Analytics |
| **Usage régulier** (sessions/semaine) | > 2 | Analytics |

#### Métriques d'engagement (valeur perçue)

| Métrique | Cible PMF | Méthode de mesure |
|----------|----------|-------------------|
| **Assets générés/utilisateur/mois** | > 15 | Supabase |
| **Chapitres créés/projet** | > 3 | Supabase |
| **Taux de complétion** (projet avec chapitre) | > 30% | Supabase |
| **NPS** | > 40 | Enquête |

#### Le test Sean Ellis

> **« Seriez-vous très déçu si DreamWeave n'existait plus ? »**
> 
> Cible : > 40% de réponses "Très déçu" = PMF atteint

---

## 5. Positionnement

### 5.1 Matrice de positionnement

```
                    Professionnel
                         │
         Clip Studio     │    DreamWeave (cible)
         Paint           │    ─────────
                         │
  Complexe ──────────────┼──────────────── Simple
                         │
         Photoshop       │    Canva Comics
         + Scripts       │    (pas spécialisé)
                         │
                    Basique
```

### 5.2 Proposition de positionnement

**Pour** les créateurs d'histoires qui veulent les transformer en webtoons,
**DreamWeave est** la plateforme de création de webtoons par IA
**qui** permet de produire des chapitres visuellement cohérents en quelques heures,
**contrairement à** la création manuelle (semaines, compétences artistiques requises) ou aux outils d'IA génériques (pas de cohérence, pas de workflow webtoon),
**grâce à** son système unique de templates de style, sa bibliothèque d'assets réutilisables et son workflow optimisé projet → assets → chapitres → panels.

---

## 6. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|------------|--------|-----------|
| Qualité IA insuffisante | Moyen | Critique | Prompts optimisés, modèles multiples, régénération facile |
| Concurrence (Canva, Adobe) | Élevé | Élevé | Spécialisation webtoon, communauté, workflow unique |
| Coût API IA élevé | Moyen | Élevé | Modèles locaux, caching, quotas freemium |
| Problèmes de droits d'auteur IA | Moyen | Moyen | Veille juridique, modèles éthiques, ToS claires |
| Adoption lente | Moyen | Élevé | Marketing communautaire, partenariats plateformes webtoon |

---

## 7. Go-to-Market initial

### Phase 1 : Validation (0-3 mois)
- Beta fermée avec 50-100 créateurs ciblés
- Communautés : Reddit r/webtoons, r/webcomics, Wattpad, Discord
- Collecte de feedback intensif
- Itération rapide sur les prompts IA et le workflow

### Phase 2 : Lancement (3-6 mois)
- Beta ouverte avec modèle freemium
- Content marketing : tutoriels, exemples de webtoons créés
- Partenariats avec influenceurs/créateurs de contenu
- SEO sur "AI webtoon creator", "create webtoon without drawing"

### Phase 3 : Croissance (6-12 mois)
- Marketplace de styles
- Intégration avec plateformes de publication (Webtoon, Tapas)
- Programme d'affiliation créateurs
- Expansion géographique (localisation KR, JP, EN)

---

## 8. Fonctionnalités produit (résumé)

### 8.1 Gestion de projets
- Création de projets (titre, description), liste, dashboard, statistiques (projets, assets, chapitres).

### 8.2 Système de style visuel
- **Template de style texte** : description du style (ambiance, couleurs, traits).
- **Images de référence** (Pro) : jusqu'à 2 images pour guider l'IA (FLUX.2 Pro Edit).
- Application automatique du style à toutes les générations.

### 8.3 Bibliothèque d'assets
- **Types** : Personnages, Décors, Objets.
- **Personnages** : vues multiples (face, profil G/D, dos) en Pro.
- Création, modification, régénération, suppression ; stockage Supabase.

### 8.4 Section « Scénario » (texte narratif)
- **Contenu** : l'utilisateur écrit le scénario de son histoire **ou** importe un scénario (format texte : fichier .txt ou copier-coller).
- **Chapitres écrits = chapitres webtoon** : les **chapitres** créés dans la section Scénario **correspondent** aux chapitres du webtoon (un chapitre écrit = un chapitre webtoon). Cela permet de générer panel par panel l'histoire à partir du scénario en s'appuyant sur cette structure.
- **Découpage Chapitre → Panels (dans la section Scénario)** : au sein de chaque chapitre (texte), un **découpage en panels** est possible : l'utilisateur ou l'IA structure le chapitre en **liste de panels** (courtes descriptions par panel), directement dans la section Scénario. Ce découpage sert à la génération panel par panel en Édition de l'œuvre. Les **règles de gestion** de ce découpage (automatique, manuel, critères, etc.) sont à **définir plus tard**.
- **IA LLM — Deux types (même modèle, system prompts différents)** :
  - **IA Scénario** (histoire entière) : l'utilisateur **voit et utilise l'IA dès qu'il entre dans la section Scénario**. Choix du nombre de chapitres + prompt → génération de **toute l'histoire** chapitre par chapitre **directement sur le site**. Modification par prompt → réécriture → **comparaison ancienne/nouvelle** → **accepter / rejeter**.
  - **IA Chapitre** (un chapitre) : l'utilisateur **voit et utilise l'IA dès qu'il entre dans un chapitre de scénario créé**. Prompt de modification → réécriture du chapitre uniquement → **accepter / rejeter**.
- **Visibilité** : l'IA Scénario est **visible et accessible dès l'entrée** dans l'onglet Scénario ; l'IA Chapitre est **visible et accessible dès l'ouverture** d'un chapitre de scénario (sans étape supplémentaire).
- Les scénarios **approuvés** sont **persistés en BDD** (versions, voir roadmap).
- **Réflexion — Rôle étendu** : l'IA pourrait aussi servir à la **rédaction des prompts pour les panels** (suggestions à partir du scénario + assets), en gardant la règle : prompt d'image = style + assets + description (jamais le scénario brut).
- **Détection dans le scénario** : les mentions d'assets déjà créés (personnages, décors, objets) peuvent être **surlignées** dans l'éditeur, avec affichage de l'image au survol ; les éléments **mentionnés mais non encore créés** comme assets sont signalés (« à créer ») pour inviter à compléter la bibliothèque.
- **Rôle du scénario** : le scénario sert de référence pour l'adaptation en visuel ; il n'est **jamais** injecté tel quel dans les prompts de génération d'image (découpage IA éventuel en panels, structure uniquement).

### 8.5 Édition de l'œuvre (chapitres visuels et panels)
- **Édition de l'œuvre** désigne la partie **visuelle** du webtoon : chapitres (visuels) et panels. C'est là que l'utilisateur construit le webtoon à partir du scénario et des assets.
- **Deux modes** :
  - **Mode Automatique** : découpage IA du scénario en panels → sélection des assets du chapitre → génération panel par panel (prompt = style + assets + description du panel).
  - **Mode Structuré** : chapitre visuel vide → panels et blocs (rectangles) → description + assets par bloc → génération 1 image pleine par bloc.
- **Interface d'édition des panels** : pendant l'édition d'un panel, l'utilisateur dispose de **deux aides visuelles** :
  - **Côté scénario** : visualisation du **chapitre de scénario** (texte) qu'il adapte en visuel — affiché **dès l'entrée** dans l'édition du chapitre visuel si un chapitre de scénario est associé (ou choisi via un sélecteur). Voir **11_Rapport_Chapitres_Flux_Blocs_Scenario.md** § 3.4.1 pour la projection détaillée (lien optionnel chapitre visuel ↔ chapitre de scénario, panneau toujours visible ou repliable).
  - **Côté visuel** : visualisation des **assets sélectionnés** pour le prompting du panel (personnages, décors, objets), pour cadrer la génération IA.
  - Règle : la génération s'appuie toujours sur les **assets sélectionnés** (chapitre ou bloc), jamais sur le texte du scénario dans le prompt d'image.

### 8.6 Génération IA
- **Free** : FLUX.1 Schnell (~0,003 €/image). **Pro** : FLUX.2 Pro / Pro Edit (refs).
- Edge Function Supabase, FAL.ai, format 1024×1024, quotas mensuels (20 Free / 300 Pro).

### 8.7 Lecture, auth, UI, dashboard, profil, plans
- Lecture verticale type webtoon ; auth Supabase (email + Google) ; interface glassmorphism, thème clair/sombre ; dashboard (stats, usage, projets récents) ; plans Free / Pro (14,99 €/mois).

---

## 9. Flux utilisateur typique

1. **Inscription/Connexion** → Dashboard
2. **Création d'un projet** → Titre + description
3. **Définition du style** : template texte + images de référence (Pro)
4. **Création des assets** : personnages, décors, objets ; vues multiples (Pro)
5. **Section Scénario** : écrire ou importer le scénario (texte) ; créer des **chapitres** (correspondant aux chapitres webtoon) ; découper chaque chapitre en **panels** (liste + descriptions) pour permettre la génération panel par panel
6. **Édition de l'œuvre** : chapitres visuels et panels alignés sur les chapitres écrits — mode Automatique (découpage scénario → panels → génération) ou Structuré (blocs → descriptions + assets → génération) ; pendant l'édition : visualisation du chapitre texte correspondant + assets sélectionnés ; dialogues/narration en overlay
7. **Prévisualisation** : lecture verticale (images pleines dans panels/blocs)

---

## 10. Points de différenciation

1. **Cohérence stylistique garantie** : Templates de style + images de référence
2. **Vues multiples des personnages** : Face, profil, dos (Pro)
3. **Workflow optimisé** : Projet → Assets → Chapitres → Panels
4. **Format natif webtoon** : Vertical, mobile-first
5. **Accessibilité** : Aucune compétence artistique requise
6. **Rapidité** : Génération en quelques secondes
7. **Plan gratuit généreux** : 20 générations/mois, projets et assets illimités
8. **Multi-modèles IA** : Schnell (Free) / FLUX.2 Pro & Pro Edit (Pro)

---

## 11. Métriques de succès (produit & business)

### Produit
- Taux de création de projet, taux de complétion (projet avec chapitre), assets générés par projet, temps de génération.

### Business
- Taux d'inscription (landing → signup), rétention (MAU), engagement (projets/utilisateur), NPS et feedback.

*(Détails des cibles PMF : voir section 4.2.)*

---

## 12. Stack technique

- **Frontend** : React 18 + TypeScript (strict) + Vite 7
- **UI** : shadcn/ui + Tailwind CSS 3 + Framer Motion
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions Deno)
- **IA** : FAL.ai (FLUX.1 Schnell / FLUX.2 Pro / FLUX.2 Pro Edit)
- **Routing** : React Router DOM 7 (lazy loading)
- **State** : TanStack React Query 5
- **Déploiement** : Vercel / Netlify

---

## 13. Conclusion

DreamWeave répond à un besoin réel et croissant : **démocratiser la création de webtoons**. En combinant l'IA générative avec un workflow optimisé et une interface intuitive, le produit permet à quiconque de créer des webtoons professionnels en quelques heures plutôt qu'en plusieurs semaines.

Le product-market fit est solide car :
- ✅ Le marché est en croissance (webtoons, +35 % CAGR)
- ✅ La barrière à l'entrée est élevée (compétences artistiques, coût, temps)
- ✅ La solution est techniquement viable (IA générative mature)
- ✅ La valeur est immédiate (résultats visuels rapides, cohérence garantie)

**État actuel** : MVP Phase 1 complète (projets, assets, style, plans Free/Pro, multi-modèles IA, profil, Plans). Phase 2 planifiée : panels avancés, dialogues, chapitres (flux Automatique/Structuré), intégration Stripe.
