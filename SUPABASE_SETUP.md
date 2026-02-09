# Créer votre propre projet Supabase (accès à la base)

Ce projet a été généré par Lovable avec un Supabase que vous ne contrôlez pas. Pour avoir **votre** base de données et y accéder (dashboard, SQL, storage), créez un projet Supabase avec votre compte.

## 1. Créer un compte et un projet Supabase

1. Allez sur **[supabase.com](https://supabase.com)** et cliquez sur **Start your project**.
2. Connectez-vous avec GitHub ou email.
3. **New project** :
   - **Name** : par ex. `dream-weave`
   - **Database password** : choisissez un mot de passe fort et **notez-le** (pour accéder à la BDD si besoin).
   - **Region** : choisissez la plus proche de vous.
4. Cliquez sur **Create new project** et attendez la fin du déploiement.

## 2. Récupérer l’URL et la clé (anon)

1. Dans le projet Supabase, allez dans **Project Settings** (icône engrenage) → **API**.
2. Vous verrez :
   - **Project URL** → c’est votre `VITE_SUPABASE_URL`
   - **Project API keys** → **anon public** → c’est votre `VITE_SUPABASE_PUBLISHABLE_KEY`
   - L’**ID du projet** est dans l’URL (ex. `https://xxxxx.supabase.co` → `xxxxx` = `VITE_SUPABASE_PROJECT_ID`).

## 3. Créer les tables (migration)

1. Dans le dashboard Supabase : **SQL Editor** → **New query**.
2. Ouvrez le fichier **`supabase/migrations/20260209195229_f35fa33d-369d-4bfe-b797-2c3227a88c61.sql`** dans votre éditeur.
3. **Copiez tout le contenu** du fichier et **collez-le** dans l’éditeur SQL Supabase.
4. Cliquez sur **Run** (ou Ctrl+Enter).
5. Vérifiez qu’il n’y a pas d’erreur. Les tables `profiles`, `projects`, `assets`, `chapters`, `panels` et le bucket Storage `dreamweave` seront créés.

## 4. Brancher l’app sur votre projet

1. À la racine du projet, copiez le fichier d’exemple :
   ```bash
   cp .env.example .env
   ```
2. Ouvrez **`.env`** et remplacez par les valeurs de **votre** projet :
   - `VITE_SUPABASE_PROJECT_ID` = l’ID du projet (partie avant `.supabase.co` dans l’URL).
   - `VITE_SUPABASE_URL` = **Project URL** (étape 2).
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = clé **anon public** (étape 2).

Exemple :
```env
VITE_SUPABASE_PROJECT_ID="abcdefghijklmnop"
VITE_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

3. Sauvegardez le fichier. **Ne commitez jamais `.env`** (il est dans `.gitignore`).

## 5. Tester

1. Lancez l’app : `npm run dev`
2. Inscrivez-vous avec un email/mot de passe.
3. Dans Supabase : **Authentication** → **Users** → vous devriez voir votre utilisateur, et **Table Editor** → **profiles** → un profil créé automatiquement.

### Désactiver la confirmation par email

Pour que les utilisateurs soient connectés tout de suite après inscription (sans clic dans un email) :

1. Dans Supabase : **Authentication** → **Providers** → **Email**.
2. Désactivez **« Confirm email »** (ou **« Enable email confirmations »**).
3. Enregistrez.

Les nouveaux comptes (email unique + mot de passe) seront alors créés et la session active immédiatement ; l’app les redirige vers le dashboard.

---

## 6. (Optionnel) Connexion avec Google

Pour que le bouton **« Continuer avec Google »** fonctionne :

### A. Créer des identifiants Google (Google Cloud Console)

1. Allez sur **[console.cloud.google.com](https://console.cloud.google.com)**.
2. Créez un projet ou sélectionnez un projet existant.
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
4. Si demandé, configurez l’**écran de consentement OAuth** (type « Externe », nom de l’app, email de support, puis enregistrez).
5. Type d’application : **Web application**.
6. **Name** : par ex. « DreamWeave ».
7. **Authorized redirect URIs** : ajoutez l’URL fournie par Supabase :
   - Dans Supabase : **Authentication** → **Providers** → **Google** → le champ **Callback URL** affiche une URL du type  
     `https://VOTRE_PROJECT_REF.supabase.co/auth/v1/callback`
   - Copiez cette URL et collez-la dans « Authorized redirect URIs » dans Google Cloud.
8. Créez le client et notez le **Client ID** et le **Client Secret**.

### B. Activer Google dans Supabase

1. Dans le dashboard Supabase : **Authentication** → **Providers** → **Google**.
2. Activez **Enable Sign in with Google**.
3. Collez le **Client ID** et le **Client Secret** de l’étape A.
4. Enregistrez.

Après ça, les utilisateurs pourront se connecter avec Google ; après redirection, ils arriveront sur `/dashboard`.

---

## Dépannage : erreur 401 (signup, login, Google)

Si tu as **401** sur `/auth/v1/signup` ou `/auth/v1/user` :

1. **Clé anon**  
   - Supabase → **Project Settings** (engrenage) → **API**.  
   - Copie la clé **anon public** (pas la clé `service_role`).  
   - Dans ton projet, ouvre **`.env`** et mets à jour **`VITE_SUPABASE_PUBLISHABLE_KEY`** avec cette valeur (sans espace avant/après).  
   - Redémarre le serveur de dev (`npm run dev`) et recharge la page.

2. **URL du projet**  
   - Dans la même page **API**, vérifie que **Project URL** est bien `https://xxxxx.supabase.co`.  
   - Dans **`.env`**, **`VITE_SUPABASE_URL`** doit être exactement cette URL (sans espace à la fin).

3. **Auth : Email activé**  
   - **Authentication** → **Providers** → **Email** → **Enable Email provider** activé, puis **Save**.

4. **URLs autorisées**  
   - **Authentication** → **URL Configuration**.  
   - **Site URL** : `http://localhost:8080` (ou le port que tu utilises).  
   - **Redirect URLs** : ajouter `http://localhost:8080` et `http://localhost:8080/**`, puis **Save**.

5. **Message exact**  
   - Lors d’une inscription/connexion, si une **toast d’erreur** s’affiche, note le message (ex. « Invalid API key », « Signups not allowed »).  
   - Ou dans l’onglet **Réseau** : cliquer sur la requête en 401 → **Réponse** : le JSON indique souvent la cause.

### 401 sur Google uniquement (GET /auth/v1/user)

Si l’inscription email marche mais que la connexion Google renvoie 401 après redirection :

1. **Réponse 401** : dans l’onglet **Réseau**, clique sur la requête **`user`** qui renvoie 401 → onglet **Réponse** (ou **Response**). Note le message JSON (ex. `invalid jwt`, `jwt expired`, etc.).
2. **Clé JWT du projet** : **Project Settings** (engrenage) → **API** → section **JWT Settings**. Si tu as déjà **changé le JWT Secret** après la création du projet, les anciens tokens peuvent être refusés. Dans ce cas, ne plus modifier le secret, ou recréer un projet pour repartir propre.
3. **Console navigateur** : après un clic sur « Continuer avec Google », ouvre la **Console** (F12). Un message `[Auth] (voir Console): ...` affiche l’erreur renvoyée par Supabase.

---

## Génération d’images IA (Nebius)

Les personnages, décors et objets peuvent être générés par l’IA via **Nebius Token Factory**. Il suffit de configurer une clé API.

### 1. Obtenir une clé Nebius

1. Va sur **[Nebius Token Factory](https://tokenfactory.nebius.com/)** et connecte-toi.
2. **API keys** → **Create API key** → donne un nom → **Create**.
3. Copie la clé affichée (elle ne sera plus visible ensuite).

### 2. Configurer la clé dans Supabase

1. Dans ton projet Supabase : **Project Settings** (engrenage) → **Edge Functions**.
2. Section **Secrets** : ajoute un secret :
   - **Name** : `NEBIUS_API_KEY`
   - **Value** : la clé copiée à l’étape 1.
3. Enregistre.

### 3. Déployer l’Edge Function

Ouvre un terminal et va dans le dossier **dream-canvas** (c’est là que se trouve `supabase/functions/`) :

```bash
cd dream-canvas
```

Puis enchaîne (remplace `bczoajqahhlivchcxzpw` par ton project ref si besoin) :

```bash
npx supabase login
npx supabase link --project-ref bczoajqahhlivchcxzpw
npx supabase functions deploy generate-asset-image
```

Si tu es déjà à la racine `DreamWeave`, fais d’abord `cd dream-canvas` avant ces commandes, sinon le CLI ne trouve pas la fonction.

**En cas de 401** à l’appel de la fonction (souvent avec une connexion Google), le projet est configuré avec `verify_jwt = false` pour cette fonction : la passerelle laisse passer la requête, et la fonction vérifie elle-même que tu es bien propriétaire de l’asset. Pense à **redéployer** après toute modif de `supabase/config.toml` :

```bash
cd dream-canvas
npx supabase functions deploy generate-asset-image
```

Après ça, quand tu crées un asset (personnage, décor ou objet) avec une **description / prompt**, l’image est générée automatiquement et affichée une fois prête. Le système prompt pourra être affiné plus tard.

---

## Accéder à la base ensuite

- **Dashboard** : [supabase.com/dashboard](https://supabase.com/dashboard) → votre projet.
- **Tables** : **Table Editor**.
- **SQL** : **SQL Editor**.
- **Auth** : **Authentication**.
- **Fichiers (images, etc.)** : **Storage** → bucket `dreamweave`.

Vous avez ainsi votre propre base, entièrement sous votre contrôle.
