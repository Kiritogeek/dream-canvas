# Spécifications Application Mobile — App compagnon DreamWeave

> Premières spécifications (V1 exploratoire) d'une application mobile compagnon, en complément de l'application web DreamWeave existante. Document de cadrage : périmètre fonctionnel et choix technique, pas encore une spec d'implémentation détaillée.

---

## 1. Contexte et positionnement

DreamWeave est aujourd'hui une **application web** (React + Vite + Supabase) couvrant tout le workflow de création : Style → Assets → Scénario → Éditeur Canvas → Univers → Export (voir `Product.md`).

Le roadmap produit (`07_Roadmap_Produit.md`, Phase 4 — § 4.3 « Mobile et performance ») mentionnait déjà une **PWA installable** comme item P0 futur, sans spécification détaillée. Ce document constitue la première déclinaison concrète de cet item.

**Décision de cadrage actée pour cette V1** :
- **Périmètre** : app **compagnon** (lecture + suivi), pas un portage du studio de création complet.
- **Approche technique** : **PWA installable**, en réutilisant la base React/Vite/Supabase existante — pas de build natif (React Native / Swift / Kotlin) à ce stade.

### Pourquoi une app compagnon plutôt qu'un portage complet

L'Éditeur Canvas (blocs image/couleur, bulles de dialogue, drag & drop, redimensionnement 8 points — voir zone protégée dans `CLAUDE.md`) est un éditeur dense type Figma. Le reconstruire pour un écran tactile de 6 pouces serait un chantier à lui seul (UX à réinventer, pas une adaptation responsive) et n'est pas le besoin prioritaire identifié : un créateur de webtoon compose ses panels sur un écran large, mais veut **consulter l'avancement, lire le résultat et suivre ses générations** depuis son téléphone, entre deux sessions de travail.

---

## 2. Périmètre fonctionnel V1

### 2.1 Inclus

| Domaine | Fonctionnalités V1 | Source (web) |
|---------|--------------------|---------------|
| **Authentification** | Connexion email/password + Google OAuth, session persistante | `useAuth.tsx` |
| **Dashboard** | Stats (projets, assets, chapitres), liste projets récents | `Dashboard.tsx` |
| **Projets** | Liste, recherche, consultation détail (lecture) | `useProjects.ts` |
| **Assets** | Consultation bibliothèque (personnages/décors/objets), visualisation Sheet System 4 angles | `AssetLibrary.tsx` |
| **Scénario** | Lecture des chapitres de scénario, édition de texte simple (sans IA Scénario/IA Chapitre, sans diff visuel) | `ScenarioSection.tsx` (sous-ensemble) |
| **Lecture webtoon** | Lecteur défilement vertical du chapitre exporté/composé (panels + blocs + bulles déjà générés, rendu lecture seule) | Export PNG / vue chapitre |
| **Suivi génération** | Notifications push quand une génération asset/panel se termine, statut quota/crédits en temps réel | `usage`, `useUserPlan.ts` |
| **Profil & Plan** | Consultation profil, plan actuel, lien vers page Plans (paiement reste web) | `Profile.tsx`, `Plans.tsx` |

### 2.2 Explicitement hors périmètre V1

| Domaine | Raison |
|---------|--------|
| **Éditeur Canvas** (blocs image/couleur, bulles) | Zone protégée, UX dense incompatible avec un MVP mobile — voir § 1 |
| **IA Scénario / IA Chapitre** (génération + diff visuel accepter/rejeter) | Flux de comparaison texte riche, pensé pour grand écran |
| **Univers / Lore** (graphe interactif `@xyflow/react`) | Interaction graphe (zoom, drag, connexions) inadaptée au tactile en V1 |
| **Génération d'asset depuis mobile** | Ouvre la question du coût crédit + formulaire de prompt détaillé déclenché en contexte de saisie mobile — **à trancher en V2**, voir § 5 |
| **Paiement / changement de plan** | Reste sur le web (Stripe Checkout déjà fonctionnel) |
| **Administration** (`Pilotage.tsx`) | Hors cible utilisateur final |

---

## 3. Approche technique — PWA

### 3.1 Pourquoi une PWA plutôt qu'une app native

| Critère | PWA | Natif (React Native) |
|---------|-----|----------------------|
| Réutilisation du code existant | Élevée — composants React, hooks, services partagés tels quels | Partielle — UI à reconstruire |
| Délai de mise sur le marché | Court | Long |
| Distribution | URL + installation directe (Add to Home Screen) | App Store / Play Store (review, comptes développeur) |
| Notifications push | Web Push API (Android complet, iOS limité ≥ 16.4) | Natif complet |
| Accès matériel (caméra, etc.) | Limité | Complet |

Pour un périmètre « lecture + suivi », la PWA couvre le besoin sans le coût d'un build natif. Le natif reste une option de réévaluation si le périmètre s'élargit (génération mobile, usage hors-ligne poussé).

### 3.2 Implications techniques

- **Manifest** (`manifest.json`) : icônes, nom, couleur thème, `display: standalone`.
- **Service Worker** : cache des assets statiques + stratégie réseau pour les données (`network-first` pour les données Supabase, `cache-first` pour les images déjà vues).
- **Responsive** : les vues listées en § 2.1 doivent être auditées/adaptées pour mobile (la majorité des composants actuels sont déjà construits avec Tailwind responsive, mais le Dashboard et l'AssetLibrary n'ont pas été conçus en priorité mobile-first).
- **Notifications** : Web Push nécessite un backend de souscription (table `push_subscriptions` à créer) + une Edge Function d'envoi — **changement de schéma**, donc à valider explicitement avec Louis avant implémentation (règle CLAUDE.md « Ne pas toucher sans demande explicite »).
- **Routing** : réutilisation de React Router DOM existant, avec un layout mobile dédié (navigation par tab bar en bas plutôt que sidebar).

---

## 4. Écrans clés (V1)

1. **Connexion / Onboarding** — réutilise `Auth.tsx`, adapté tab bar mobile
2. **Dashboard** — stats + projets récents, version condensée
3. **Liste projets**
4. **Détail projet** — onglets Assets (lecture) / Scénario (lecture + édition simple) en vue mobile, pas de Style ni Édition (canvas)
5. **Bibliothèque Assets** — grille adaptée, fiche asset (Sheet System en lecture)
6. **Lecteur de chapitre** — scroll vertical, plein écran
7. **Notifications** — centre de notifications (génération terminée, quota bas)
8. **Profil** — infos + plan + lien web pour gérer l'abonnement

---

## 5. Questions ouvertes (à trancher avant la spec d'implémentation)

| Question | Impact |
|----------|--------|
| Le mode hors-ligne doit-il permettre de **lire** un chapitre déjà ouvert sans réseau ? | Détermine la stratégie de cache du Service Worker |
| Notifications push iOS — l'app doit-elle être ajoutée à l'écran d'accueil pour fonctionner (contrainte Apple ≥ 16.4) ? Comment l'expliquer à l'utilisateur ? | UX d'onboarding spécifique iOS |
| Génération d'asset simple (formulaire court, sans canvas) — V2 ou exclu durablement ? | Périmètre V2, impact `canGenerate()` / quota côté mobile |
| Édition de texte de scénario en mobile : faut-il garder l'autosave (≥ 80 mots, 12 min) du web, ou adapter le seuil au contexte mobile (sessions plus courtes) ? | UX scénario mobile |
| Faut-il une navigation dédiée Univers (lecture seule des fiches lore, sans le graphe) en V1 ou en V1.1 ? | Périmètre — actuellement exclu, candidat V1.1 léger |

---

## 6. Métriques de succès (à définir précisément en V1.1)

- Taux d'installation PWA (Add to Home Screen) parmi les utilisateurs actifs web
- Taux d'ouverture suite à notification push (génération terminée)
- Temps de lecture mobile vs web (proxy d'usage compagnon réel)
- Taux de rétention spécifique aux utilisateurs ayant installé la PWA

---

## 7. Prochaines étapes

1. Valider ce périmètre avec Louis (ce document = première itération, pas figée)
2. Trancher les questions ouvertes § 5 prioritaires (notifications, hors-ligne)
3. Audit responsive des composants concernés (`Dashboard.tsx`, `AssetLibrary.tsx`, `ScenarioSection.tsx`)
4. Spec technique détaillée : manifest, Service Worker, schéma `push_subscriptions` (nécessite validation schéma DB)
5. Mettre à jour `07_Roadmap_Produit.md` § 4.3 avec ce périmètre détaillé une fois validé

---

*Première rédaction : 16 juin 2026 — cadrage initial app compagnon PWA, à affiner après validation Louis.*
