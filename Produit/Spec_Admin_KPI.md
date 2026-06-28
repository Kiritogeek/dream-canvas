# Spécification — Page Pilotage (Admin KPI & Support)

**Accès** : `kiritogeek@gmail.com` uniquement — double guard (client + server-side)
**Route** : `/dashboard/pilotage` — lazy-loaded
**Nav** : item "Pilotage" dans la sidebar `DashboardLayout`, visible uniquement pour l'admin, positionné sous "Profil"
**Chantier** : Chantier 6 (implémenté le 2026-05-10)

---

## 1. Objectif

Cockpit de pilotage produit + outil de support utilisateur pour Louis :
- Surveiller les KPIs produit clés (activation, rétention, conversion)
- Identifier les frictions dans le parcours utilisateur
- Agir directement sur les comptes utilisateurs (support)

---

## 2. Architecture technique

### 2.1 Guard accès admin

Double protection obligatoire :

```typescript
// Côté client - guard dans la page Pilotage elle-même (src/pages/Pilotage.tsx)
// La route /dashboard/pilotage utilise ProtectedRoute (auth) ; le check admin est dans la page.
if (user?.email?.trim().toLowerCase() !== ARIANE_ONBOARDING_ADMIN_EMAIL) {
  return <Navigate to="/dashboard" replace />
}
```

```typescript
// Côté serveur - dans chaque Edge Function admin (ADMIN_EMAIL en dur = 'kiritogeek@gmail.com')
const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
  headers: { Authorization: `Bearer ${token}`, apikey: anonKey ?? serviceKey },
})
const userData = await userRes.json()
if (userData?.email !== ADMIN_EMAIL) return json({ error: 'Accès refusé' }, 403, cors)
```

### 2.2 Sidebar nav

Item "Pilotage" ajouté dans `DashboardLayout.tsx`, sous "Profil", visible uniquement si `user.email === 'kiritogeek@gmail.com'`.

### 2.3 Edge Functions

| Fonction | Rôle |
|----------|------|
| `admin-get-kpis` | KPIs globaux + liste users + détail user (modes `global` / `users_list` / `user`) |
| `admin-user-action` | 4 actions : `reset_quota`, `delete_user`, `set_plan` (sur n'importe quel user), `toggle_excluded` |
| `admin-set-plan` | Existante - change le plan de l'admin LUI-MÊME uniquement (pas de targetUserId). Le changement de plan d'un autre user passe par `admin-user-action` action `set_plan`. |

Toutes utilisent `service_role` pour contourner RLS.

### 2.4 Fichiers à créer/modifier

```
src/pages/Pilotage.tsx                  # Page principale /dashboard/pilotage (NOUVEAU)
src/components/admin/
  GlobalKPICards.tsx                    # 6 cartes KPI vitaux
  PlanDistributionChart.tsx             # Donut recharts
  ActivityChart.tsx                     # Courbe générations 30j
  UserListTable.tsx                     # Tableau paginé recherchable
  UserDetailDrawer.tsx                  # Panneau latéral détail + actions support
  DeleteUserDialog.tsx                  # Dialog double confirmation suppression
src/services/adminService.ts            # Appels Edge Functions admin (NOUVEAU)
src/components/DashboardLayout.tsx      # Ajout item nav Pilotage (MODIFIÉ)
src/App.tsx                             # Ajout route /dashboard/pilotage (MODIFIÉ)
supabase/functions/admin-get-kpis/      # Edge Function KPIs (NOUVEAU)
supabase/functions/admin-user-action/   # Edge Function actions support (NOUVEAU)
```

---

## 3. Page Pilotage — Structure

### 3.1 Onglet "Vue Globale"

**Cartes KPI (6)**

| KPI | Calcul |
|-----|--------|
| Utilisateurs total | `COUNT(profiles)` |
| Actifs 7 jours | `COUNT DISTINCT usage.user_id WHERE created_at > now()-7d` |
| Actifs 30 jours | idem 30 jours |
| Nouveaux (7j) | `COUNT profiles WHERE created_at > now()-7d` |
| Taux activation | `active30d / totalUsers` (proportion d'users actifs sur 30j) |
| Plans payants | `COUNT profiles WHERE plan != 'libre'` |

**Donut — Répartition plans**
- Libre / Créateur / Studio (nombre + %)

**Courbe — Activité 30 jours (recharts LineChart)**
- Axis X : date · Axis Y : générations · Série : Total

### 3.2 Onglet "Utilisateurs"

**Barre de recherche + filtre**
- Recherche temps réel sur `display_name` et `email`
- Filtre unique (dropdown) : Tous / Libre / Créateur / Studio / Non activés (`unactivated` = 0 génération ce mois ET jamais d'activité)

**Tableau paginé (20 par page)**

| Colonne | Source |
|---------|--------|
| Pseudo | `profiles.display_name` |
| Email | `profiles.email` (auth) |
| Plan | badge coloré |
| Inscrit le | `profiles.created_at` |
| Générations mois | `COUNT usage WHERE month=current` |
| Projets | `COUNT projects` |
| Actions | icônes : 👁️ Détail · 🔄 Reset quota · 🗑️ Supprimer |

Clic sur une ligne → ouvre `UserDetailDrawer`

---

## 4. UserDetailDrawer — Panneau latéral

Sheet Radix (slide-in droite), 480px.

### 4.1 En-tête

Avatar + `display_name` + email + badge plan + badge Actif/Inactif

### 4.2 KPIs personnels (cartes compactes)

Générations mois · Quota restant · Projets · Assets · Chapitres · Sessions 7j

### 4.3 Courbe activité 30j (mini recharts)

### 4.4 Projets (liste compacte)

Titre · style_template · assets count · chapitres count · dernière modif

### 4.5 Actions support

```
[ 🔄 Reset quota ]   [ 🏷️ Changer de plan ▾ ]   [ 🗑️ Supprimer le compte ]
```

**Reset quota** : dialog simple "Remettre le quota de [pseudo] à zéro ?" → confirm → appelle `admin-user-action` mode `reset_quota`

**Changer de plan** : dropdown Libre / Créateur / Studio → appelle `admin-user-action` action `set_plan` (avec `userId` cible). NB : `admin-set-plan` ne sert qu'à changer le plan de l'admin lui-même, pas celui d'un user ciblé.

**Supprimer le compte** : voir section 5

---

## 5. Suppression compte — Double confirmation ✅

> Décision validée : double confirmation avec saisie du pseudo (irréversible, support critique)

### Flux

1. Clic "Supprimer le compte" → `DeleteUserDialog` s'ouvre
2. **Étape 1** : "Vous êtes sur le point de supprimer le compte de **[pseudo]** (email). Cette action est irréversible et supprime tous ses projets, assets et données."  → bouton `Continuer`
3. **Étape 2** : "Pour confirmer, saisissez le pseudo exact : **[pseudo]**"  → champ texte → le bouton `Supprimer définitivement` s'active uniquement quand le texte correspond exactement
4. Appel `admin-user-action` mode `delete_user`
5. L'utilisateur disparaît du tableau, toast "Compte supprimé"

### Ce que supprime `delete_user`

Dans l'ordre (service_role) :
1. `usage` WHERE user_id
2. Pour chaque projet du user : `chapter_canvases` (via les `chapters` du projet) → `chapters` → `scenario_chapters` → `assets`
3. `projects` WHERE user_id
4. `profiles` WHERE user_id
5. `DELETE /auth/v1/admin/users/{userId}` (Admin API) - supprime le compte auth

---

## 6. Edge Function `admin-get-kpis`

### Modes

**`global`** — params : `period` (`30d`/`90d`/`1y`), `testOnly` (bool, filtre sur `excluded_from_stats`). Retourne (extrait non exhaustif ; la réponse réelle inclut aussi `dau`, `conversionRate`, `mrrEstimated` = createur×12,99 + studio×29,99, `arpuEstimated`, `dauMauRatio`, `retentionD7`, `quotaSaturation` {libre/createur/studio}, `churnEstimated`, `kpiTrends`, `dailyNewUsers`, `subscriptionsByMonth`, `totalGenerations`) :
```json
{
  "totalUsers": 42,
  "active7d": 12,
  "active30d": 28,
  "newUsers7d": 5,
  "activationRate": 0.71,
  "paidUsers": 8,
  "planDistribution": { "libre": 34, "createur": 6, "studio": 2 },
  "dailyGenerations": [{ "date": "2026-05-01", "count": 12 }]
}
```

**`users_list`** — params : `search`, `plan`, `page` (20/page) — retourne liste + total

**`user`** — param : `userId` — retourne KPIs individuels + projets + 50 dernières actions

---

## 7. Edge Function `admin-user-action`

```json
{ "action": "reset_quota", "userId": "..." }
{ "action": "delete_user", "userId": "..." }
{ "action": "set_plan", "userId": "...", "plan": "libre|createur|studio" }
{ "action": "toggle_excluded", "userId": "..." }
```

**reset_quota** : `DELETE FROM usage WHERE user_id = $1 AND created_at >= billing_period_start_or_month_start` (retourne `deletedCount`)

**delete_user** : cascade complète (voir section 5) + suppression compte auth via Admin API

**set_plan** : PATCH `profiles.plan` du user ciblé (set `billing_period_start` si plan payant)

**toggle_excluded** : bascule `profiles.excluded_from_stats` (exclure un compte de test des KPIs)

---

## 8. Sécurité

- Jamais de service_role côté client — tout passe par les Edge Functions
- Guard double sur chaque EF (voir 2.1)
- Route non listée dans la nav pour les non-admins (flag `adminOnly` dans `DashboardLayout`)
- ⚠️ NON IMPLÉMENTÉ : le logging `admin_logs` (voir section 9) n'existe pas dans le code actuel. Aucune action admin n'est journalisée. À implémenter si besoin.

---

## 9. Migration SQL (PROPOSÉE, non appliquée à ce jour)

> ⚠️ Cette migration `admin_logs` n'existe dans aucun fichier `supabase/migrations/`. La table n'a jamais été créée et le code des Edge Functions ne l'écrit pas. Bloc conservé comme spec de référence si le journal d'audit est implémenté ultérieurement.

```sql
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,                    -- 'reset_quota' | 'delete_user' | 'set_plan'
  target_user_id UUID,                     -- NULL si user déjà supprimé
  target_email TEXT,                       -- garder même après suppression
  metadata JSONB DEFAULT '{}',             -- ex: { old_plan, new_plan }
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Pas de RLS — service_role uniquement
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
-- Aucune policy = aucun accès client direct
```

---

## 10. KPIs prioritaires pour le produit

| Priorité | Signal | Action |
|----------|--------|--------|
| P0 | Users inscrits sans génération (activation < 100%) | Améliorer onboarding Ariane |
| P0 | Users quota épuisé en Libre | Upsell contextuel |
| P1 | Users avec projet mais 0 case composée | Simplifier éditeur |
| P1 | Users inactifs 7j+ avec crédits restants | Relance email |
| P2 | Régénérations > 3 sur même asset | Améliorer cohérence style |

---

*Lié à : [[Roadmap-2026]] Chantier 6 · [[Architecture-Technique]] · [[Modele-Donnees]]*

*Audit 7 juin 2026 : noms de plans (Libre/Créateur/Studio), guards admin et modes Edge Functions vérifiés conformes — aucun fait obsolète.*

*Audit 28 juin 2026 : alignement sur le code livré. Corrigés : guard client (dans `Pilotage.tsx`, pas un composant `AdminRoute` dans App.tsx ; route via `ProtectedRoute`), 4 actions `admin-user-action` (`reset_quota` / `delete_user` / `set_plan` / `toggle_excluded`), changement de plan d'un user ciblé via `admin-user-action` set_plan (et non `admin-set-plan` qui ne vise que l'admin lui-même), ordre exact du cascade `delete_user`, filtre liste unique (avec `Non activés`), calcul réel du taux d'activation, KPIs supplémentaires de `admin-get-kpis` (MRR, rétention D7, saturation quota, churn). Signalé : la table `admin_logs` (§9) n'est PAS implémentée.*
