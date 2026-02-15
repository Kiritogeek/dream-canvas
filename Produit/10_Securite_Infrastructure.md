# Sécurité & Infrastructure — DreamWeave

> Transport (HTTPS), authentification (Supabase Auth), autorisation (RLS), infra et bonnes pratiques.

---

## 1. Architecture de sécurité

### 1.1 Vue d'ensemble des couches de sécurité

```
┌─────────────────────────────────────────────────────────────┐
│                    COUCHE 1 : TRANSPORT                      │
│                    HTTPS / TLS 1.3                            │
│                    Chiffrement en transit                     │
├─────────────────────────────────────────────────────────────┤
│                    COUCHE 2 : AUTHENTIFICATION                │
│                    Supabase Auth (GoTrue)                     │
│                    JWT Tokens + Refresh Tokens                │
│                    OAuth 2.0 (Google)                         │
├─────────────────────────────────────────────────────────────┤
│                    COUCHE 3 : AUTORISATION                   │
│                    Row Level Security (RLS)                   │
│                    Politiques par table et opération          │
│                    Isolation complète par utilisateur         │
├─────────────────────────────────────────────────────────────┤
│                    COUCHE 4 : PROTECTION API                 │
│                    CORS Policy                               │
│                    Rate Limiting                              │
│                    Input Validation                           │
├─────────────────────────────────────────────────────────────┤
│                    COUCHE 5 : PROTECTION DONNÉES             │
│                    Chiffrement au repos (AES-256)             │
│                    Backups automatiques                       │
│                    Isolation réseau                           │
├─────────────────────────────────────────────────────────────┤
│                    COUCHE 6 : SECRETS                        │
│                    Variables d'environnement Supabase         │
│                    Clés API côté serveur uniquement           │
│                    Rotation de clés                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentification

### 2.1 Mécanismes d'authentification

| Méthode | Implémentation | Statut |
|---------|---------------|--------|
| **Email / Password** | Supabase Auth (GoTrue) | ✅ Actif |
| **OAuth Google** | Supabase Auth + Google Cloud OAuth 2.0 | ✅ Actif |
| **Tokens JWT** | Émis par Supabase Auth, vérifiés par PostgREST et Edge Functions | ✅ Actif |
| **Refresh Tokens** | Renouvellement automatique via Supabase SDK | ✅ Actif |
| **MFA (2FA)** | Supabase Auth supporte TOTP | 📋 Planifié |

### 2.2 Flux JWT

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │────►│ Supabase Auth│────►│   JWT émis   │
│ (Browser)│     │  (GoTrue)    │     │  (1h expiry) │
└──────────┘     └──────────────┘     └──────┬───────┘
                                             │
                    ┌────────────────────────┤
                    │                        │
                    ▼                        ▼
           ┌──────────────┐        ┌──────────────┐
           │  PostgREST   │        │ Edge Function│
           │  (API BDD)   │        │ (Deno)       │
           │              │        │              │
           │ Vérifie JWT  │        │ Vérifie JWT  │
           │ Applique RLS │        │ Extrait      │
           │              │        │ user_id      │
           └──────────────┘        └──────────────┘
```

### 2.3 Politique de mots de passe

| Règle | Valeur |
|-------|--------|
| Longueur minimale | 6 caractères (Supabase par défaut) |
| Complexité | Non imposée (recommandation : 8+ avec mix) |
| Hashage | bcrypt (côté Supabase) |
| Confirmation email | Configurable (désactivable pour dev) |

### 2.4 Gestion de sessions

| Paramètre | Valeur |
|-----------|--------|
| Durée du JWT | 1 heure (3600s) |
| Refresh token | 7 jours |
| Stockage côté client | localStorage (via Supabase SDK) |
| Révocation | Possible via Supabase Dashboard |
| Détection de changement | `onAuthStateChange()` listener |

---

## 3. Autorisation (RLS)

### 3.1 Principe

Row Level Security (RLS) est activé sur **toutes les tables**. Chaque ligne est protégée par une politique qui vérifie `auth.uid() = user_id`.

### 3.2 Politiques par table

#### `profiles`

| Opération | Politique | Condition |
|-----------|----------|-----------|
| SELECT | Lecture de son propre profil | `auth.uid() = id` |
| UPDATE | Mise à jour de son propre profil | `auth.uid() = id` |
| INSERT | Via trigger uniquement | `handle_new_user()` (SECURITY DEFINER) |

#### `projects`

| Opération | Politique | Condition |
|-----------|----------|-----------|
| SELECT | Voir ses projets | `auth.uid() = user_id` |
| INSERT | Créer un projet | `auth.uid() = user_id` |
| UPDATE | Modifier ses projets | `auth.uid() = user_id` |
| DELETE | Supprimer ses projets | `auth.uid() = user_id` |

#### `assets`, `chapters`, `panels`

Mêmes politiques que `projects` : accès restreint au propriétaire via `auth.uid() = user_id`.

#### `usage`

| Opération | Politique | Condition |
|-----------|----------|-----------|
| SELECT | Voir son propre usage | `auth.uid() = user_id` |
| INSERT | Via Edge Function uniquement | `service_role` (non accessible au client) |

> L'insertion dans `usage` se fait via la clé `service_role` dans l'Edge Function, jamais depuis le client.

### 3.3 Matrice d'accès

```
                    Propriétaire    Autre utilisateur    Non authentifié
                    ─────────────   ─────────────────    ───────────────
  profiles          R/W             ✗                    ✗
  projects          CRUD            ✗                    ✗
  assets            CRUD            ✗                    ✗
  chapters          CRUD            ✗                    ✗
  panels            CRUD            ✗                    ✗
  usage             R               ✗                    ✗
  storage (upload)  ✓ (son dossier) ✗                    ✗
  storage (lecture)  ✓ (public)     ✓ (public)           ✓ (public)
  storage (delete)  ✓ (son dossier) ✗                    ✗
```

### 3.4 Évolution prévue (collaboration)

```
Rôle             Propriétaire    Éditeur     Lecteur     Public
──────────────   ─────────────   ─────────   ─────────   ──────
projects         CRUD            RU          R           ✗
assets           CRUD            CRUD        R           ✗
chapters         CRUD            CRUD        R           ✗
panels           CRUD            CRUD        R           ✗
```

---

## 4. Protection des secrets

### 4.1 Classification des secrets

| Secret | Type | Exposition | Localisation |
|--------|------|-----------|-------------|
| `VITE_SUPABASE_URL` | URL publique | Client (OK) | `.env` frontend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé anon (publique) | Client (OK) | `.env` frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin | Serveur UNIQUEMENT | Supabase Edge Function Secrets |
| `FAL_API_KEY` | Clé API IA | Serveur UNIQUEMENT | Supabase Edge Function Secrets |
| `JWT_SECRET` | Secret de signature JWT | Serveur UNIQUEMENT | Supabase interne |

### 4.2 Bonnes pratiques appliquées

| Pratique | Statut |
|---------|--------|
| `.env` dans `.gitignore` | ✅ |
| Clés API serveur dans Edge Function Secrets | ✅ |
| Jamais de `service_role` côté client | ✅ |
| `anon` key expose uniquement ce que RLS autorise | ✅ |
| Pas de secrets hardcodés dans le code | ✅ |

### 4.3 Risques et mitigations

| Risque | Mitigation |
|--------|-----------|
| Fuite de la clé anon | RLS empêche tout accès non autorisé |
| Fuite de FAL_API_KEY | Stockée dans Supabase Secrets, jamais côté client |
| Fuite de SERVICE_ROLE_KEY | Stockée dans Supabase Secrets, jamais dans le code |
| JWT volé | Expiration courte (1h), refresh token |

---

## 5. Sécurité de l'Edge Function

### 5.1 `generate-asset-image`

| Contrôle | Implémentation |
|---------|---------------|
| **Vérification JWT** | Vérifié via `supabase.auth.getUser()` (pas de décodage manuel) |
| **Vérification ownership** | L'asset doit appartenir à l'utilisateur (query BDD) |
| **Vérification quota** | Comptage usage mensuel vs. limite du plan (HTTP 429 si dépassé) |
| **Validation des entrées** | Vérification de `asset_id`, `prompt`, `asset_type`, `style_image_urls.length ≤ 2` |
| **Sélection de modèle** | Selon le plan : Free → Schnell, Pro → FLUX.2 Pro / Pro Edit |
| **Limitation de prompt** | Prompt tronqué à ~1900 caractères |
| **CORS** | Headers CORS dynamiques (`ALLOWED_ORIGIN` ou `*` en dev) |
| **Clé API serveur** | `FAL_API_KEY` lue depuis les Secrets |
| **Timeout** | `fetchWithTimeout(120s)` pour les appels FAL.ai |
| **Retry** | `fetchWithRetry(2 tentatives, backoff exponentiel)` |
| **Enregistrement usage** | INSERT dans `usage` après chaque génération réussie |

### 5.2 Configuration CORS

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // À restreindre en production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Recommandation production** : Restreindre `Access-Control-Allow-Origin` au domaine de l'app.

---

## 6. Sécurité des données

### 6.1 Chiffrement

| Type | Mécanisme | Statut |
|------|-----------|--------|
| **En transit** | HTTPS / TLS 1.3 | ✅ (Supabase) |
| **Au repos (BDD)** | AES-256 (Supabase managed) | ✅ (Supabase) |
| **Au repos (Storage)** | AES-256 (S3-compatible) | ✅ (Supabase) |
| **Backups** | Chiffrés | ✅ (Supabase) |

### 6.2 Backups

| Type | Fréquence | Rétention | Plan Supabase |
|------|-----------|-----------|---------------|
| **Point-in-time recovery** | Continue | 7 jours | Pro |
| **Daily backup** | Quotidien | 7 jours | Free |

### 6.3 Données personnelles (RGPD)

| Donnée | Sensibilité | Stockage | Suppression |
|--------|------------|----------|------------|
| Email | Personnelle | Supabase Auth | Suppression de compte |
| Nom d'affichage | Personnelle | profiles | Suppression de compte |
| Avatar | Personnelle | profiles | Suppression de compte |
| Projets/Assets | Contenu utilisateur | projects/assets | Suppression de compte ou manuelle |
| Images générées | Contenu utilisateur | Storage | Suppression manuelle |

**Droits RGPD à implémenter** :
- [ ] Droit d'accès : Export de toutes les données utilisateur
- [ ] Droit à l'effacement : Suppression complète du compte et données
- [ ] Droit à la portabilité : Export en format standard (JSON)
- [ ] Politique de confidentialité : Page dédiée

---

## 7. Infrastructure

### 7.1 Architecture de déploiement

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
│                                                                  │
│  Utilisateurs ──── DNS ──── CDN ──── Load Balancer               │
└──────────┬──────────────────────┬────────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────────────────┐
│                  │   │           SUPABASE CLOUD                  │
│  CDN/Edge        │   │           (AWS - eu-west)                 │
│  (Vercel/        │   │                                          │
│   Netlify)       │   │  ┌────────────────────────────────────┐  │
│                  │   │  │  API Gateway (Kong)                │  │
│  ┌────────────┐  │   │  │  - Rate limiting                  │  │
│  │ React SPA  │  │   │  │  - Auth routing                   │  │
│  │ (static)   │  │   │  │  - CORS                           │  │
│  │            │  │   │  └────────┬───────────────────────────┘  │
│  │ HTML/JS/   │  │   │           │                               │
│  │ CSS/Images │  │   │  ┌────────┼──────────────────────┐       │
│  └────────────┘  │   │  │        │                      │       │
│                  │   │  ▼        ▼                      ▼       │
│  Points de       │   │  ┌────┐  ┌──────┐  ┌─────────────────┐  │
│  présence (PoP): │   │  │Auth│  │ Post │  │ Edge Functions  │  │
│  - Europe        │   │  │    │  │ gREST│  │ (Deno Workers)  │  │
│  - Amérique      │   │  │GoTr│  │      │  │                 │  │
│  - Asie          │   │  │ue  │  │ API  │  │ generate-asset- │  │
│                  │   │  │    │  │ REST │  │ image           │  │
│                  │   │  └────┘  └──┬───┘  └────────┬────────┘  │
│                  │   │             │               │            │
│                  │   │             ▼               │            │
│                  │   │  ┌──────────────────┐       │            │
│                  │   │  │   PostgreSQL     │       │            │
│                  │   │  │   (managed)      │◄──────┘            │
│                  │   │  │                  │                    │
│                  │   │  │   Connection     │                    │
│                  │   │  │   Pooling        │                    │
│                  │   │  │   (Supavisor)    │                    │
│                  │   │  └──────────────────┘                    │
│                  │   │                                          │
│                  │   │  ┌──────────────────┐                    │
│                  │   │  │  Storage (S3)    │                    │
│                  │   │  │  Bucket:         │                    │
│                  │   │  │  dreamweave      │                    │
│                  │   │  │  (public CDN)    │                    │
│                  │   │  └──────────────────┘                    │
└──────────────────┘   └──────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
                       ┌──────────────────────────────┐
                       │    Services externes          │
                       │                              │
                       │  ┌────────────────────────┐  │
                       │  │ FAL.ai API          │  │
                       │  │ Schnell / Pro / Edit │  │
                       │  └────────────────────────┘  │
                       │                              │
                       │  ┌────────────────────────┐  │
                       │  │ Google OAuth           │  │
                       │  │ (authentification)     │  │
                       │  └────────────────────────┘  │
                       └──────────────────────────────┘
```

### 7.2 Environnements

| Environnement | Frontend | Backend (Supabase) | Usage |
|---------------|----------|-------------------|-------|
| **Local** | `localhost:8080` (Vite dev server) | Supabase Cloud (projet dev) | Développement |
| **Preview** | URL preview (Vercel/Netlify) | Supabase Cloud (projet dev) | Review PR |
| **Staging** | `staging.dreamweave.app` | Supabase Cloud (projet staging) | Tests QA |
| **Production** | `dreamweave.app` | Supabase Cloud (projet prod) | Utilisateurs |

### 7.3 CI/CD Pipeline

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Git     │────►│  Build   │────►│  Test    │────►│  Deploy  │
│  Push    │     │  (Vite)  │     │  (Vitest)│     │  (CDN)   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                                                         ▼
                                                  ┌──────────┐
                                                  │ Edge Fn   │
                                                  │ Deploy    │
                                                  │ (manual)  │
                                                  └──────────┘
```

**Pipeline recommandé** :
1. **Git push** → Déclenchement automatique
2. **Build** → `npm run build` (Vite, TypeScript, Tailwind)
3. **Lint** → `npm run lint` (ESLint)
4. **Test** → `npm run test` (Vitest)
5. **Deploy frontend** → Vercel/Netlify (automatique)
6. **Deploy Edge Functions** → `npx supabase functions deploy` (manuel ou CI)

### 7.4 Monitoring recommandé

| Outil | Usage | Priorité |
|-------|-------|----------|
| **Sentry** | Error tracking (frontend + Edge Functions) | P0 |
| **Supabase Dashboard** | Métriques BDD, Auth, Storage, Edge Functions | P0 |
| **PostHog** | Product analytics, funnels, rétention | P0 |
| **Uptime Robot** | Monitoring de disponibilité | P1 |
| **Grafana + Prometheus** | Dashboards de performance (si scale) | P2 |
| **PagerDuty / OpsGenie** | Alertes d'incidents | P2 |

### 7.5 Alertes critiques à configurer

| Alerte | Seuil | Action |
|--------|-------|--------|
| Taux d'erreur 5xx | > 5% sur 5 min | Investigation immédiate |
| Temps de réponse API | > 5s (p95) | Optimisation |
| Taux d'erreur génération IA | > 20% | Vérifier API FAL.ai |
| Espace Storage | > 80% du quota | Augmenter le plan |
| Connexions BDD | > 80% du pool | Scale Supabase |
| Erreurs Auth | > 10/min | Vérifier configuration |

---

## 8. Performance

### 8.1 Objectifs SLA

| Métrique | Cible | Critique |
|---------|-------|---------|
| **Disponibilité** | 99.9% | 99.5% |
| **TTFB** (Time to First Byte) | < 200ms | < 500ms |
| **LCP** (Largest Contentful Paint) | < 2.5s | < 4s |
| **Génération IA** | < 15s | < 30s |
| **API Response** (CRUD) | < 300ms | < 1s |

### 8.2 Optimisations actuelles

| Optimisation | Implémentation |
|-------------|---------------|
| **CDN** | Assets statiques servis via CDN mondial |
| **Code splitting** | Vite chunks automatiques |
| **Lazy loading** | Routes chargées à la demande (React.lazy possible) |
| **Image optimization** | `ImageWithFallback` avec retry et queue (max 3 concurrent) |
| **Connection pooling** | Supavisor (Supabase managed) |

### 8.3 Optimisations implémentées

| Optimisation | Impact | Statut |
|-------------|--------|--------|
| **React.lazy() pour les routes** | Réduction bundle initial | ✅ Livré |
| **TanStack React Query** | Cache serveur, mutations, invalidation auto | ✅ Livré |
| **fetchWithTimeout / fetchWithRetry** | Résilience API FAL.ai | ✅ Livré |
| **Quotas côté serveur** | Protection contre l'abus API | ✅ Livré |

### 8.4 Optimisations futures

| Optimisation | Impact | Effort |
|-------------|--------|--------|
| **Service Worker (PWA)** | Cache offline, vitesse | Moyen |
| **Image CDN (Cloudflare Images)** | Optimisation dynamique | Moyen |
| **Edge caching** | Réponses API mises en cache au edge | Élevé |
| **WebSocket (Supabase Realtime)** | Mises à jour en temps réel | Moyen |

---

## 9. Plan de reprise d'activité (DRP)

### 9.1 Scénarios de panne

| Scénario | Impact | RTO | RPO | Action |
|----------|--------|-----|-----|--------|
| **Panne CDN frontend** | App inaccessible | 5 min | 0 | Failover CDN automatique |
| **Panne Supabase** | BDD/Auth/Storage down | 30 min | 0 | Attendre restauration Supabase |
| **Panne API FAL.ai** | Génération IA impossible | N/A | N/A | Message d'erreur, réessayer plus tard |
| **Corruption BDD** | Perte de données | 1h | 24h (free) / 0 (pro) | Restauration backup |
| **Compromission sécurité** | Fuite de données | 1h | 0 | Rotation des clés, notification |

### 9.2 Procédures de récupération

1. **Rotation de clés** :
   - Régénérer `FAL_API_KEY` dans FAL.ai
   - Mettre à jour dans Supabase Edge Function Secrets
   - Redéployer l'Edge Function

2. **Restauration BDD** :
   - Supabase Dashboard → Backups → Restore
   - Ou Point-in-Time Recovery (plan Pro)

3. **Rollback frontend** :
   - Vercel/Netlify → Deployments → Rollback to previous

---

## 10. Checklist de sécurité

### Avant le lancement (production)

- [x] Vérifier toutes les politiques RLS (profiles, projects, assets, chapters, panels, usage)
- [x] S'assurer que `service_role` n'est jamais exposé côté client
- [x] Clé API FAL.ai dans Supabase Secrets uniquement
- [x] JWT vérifié via `supabase.auth.getUser()` dans l'Edge Function
- [x] Quotas de génération côté serveur (rate limiting applicatif)
- [x] Validation des entrées (style_image_urls.length ≤ 2, prompt, asset_id)
- [x] fetchWithTimeout (120s) et fetchWithRetry (2x backoff) pour résilience
- [ ] Restreindre CORS au domaine de production (`ALLOWED_ORIGIN`)
- [ ] Activer la confirmation par email
- [ ] Configurer les URL de redirection autorisées
- [ ] Configurer Sentry pour le error tracking
- [ ] Mettre en place le monitoring de disponibilité
- [ ] Rédiger et publier la politique de confidentialité
- [ ] Rédiger les conditions d'utilisation
- [ ] Tester la suppression de compte (RGPD)
- [ ] Auditer les dépendances npm (`npm audit`)
- [ ] Configurer les headers de sécurité HTTP (CSP, HSTS, etc.)

---

*Dernière mise à jour : 14 février 2026*
