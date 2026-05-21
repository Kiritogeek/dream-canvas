# Guide : Activation de la vérification d'email dans Supabase

Ce guide vous explique comment activer la vérification d'email pour l'authentification dans Supabase.

## 📋 Étapes pour activer la vérification d'email

### 1. Accéder aux paramètres d'authentification

1. Connectez-vous à votre projet Supabase : [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **DreamWeave**
3. Dans le menu de gauche, cliquez sur **Authentication**
4. Cliquez sur **Providers** (ou **Fournisseurs**)

### 2. Activer la confirmation d'email

1. Dans la liste des providers, trouvez **Email** et cliquez dessus
2. Activez le toggle **"Enable email confirmations"** (ou **"Activer les confirmations d'email"**)
3. **Important** : Assurez-vous que **"Enable email provider"** est également activé
4. Cliquez sur **Save** (ou **Enregistrer**)

### 3. Configurer l'URL de redirection (optionnel mais recommandé)

Dans les paramètres Email, vous pouvez configurer :

- **Site URL** : L'URL de votre application (ex: `http://localhost:8080` pour le développement, `https://votre-domaine.com` pour la production)
- **Redirect URLs** : Ajoutez les URLs autorisées pour les redirections après vérification :
  - `http://localhost:8080/auth/verify-email` (développement)
  - `https://votre-domaine.com/auth/verify-email` (production)

### 4. Personnaliser les emails (optionnel)

1. Dans le menu **Authentication**, cliquez sur **Email Templates**
2. Vous pouvez personnaliser :
   - **Confirm signup** : Email envoyé lors de l'inscription
   - **Magic Link** : Email pour la connexion sans mot de passe
   - **Change Email Address** : Email pour changer d'adresse email
   - **Reset Password** : Email pour réinitialiser le mot de passe

### 5. Tester la vérification d'email

1. **En développement** :
   - Dans Supabase Dashboard → **Authentication** → **Settings**
   - Activez **"Enable email confirmations"**
   - Les emails seront envoyés mais vous pouvez aussi les voir dans les logs Supabase

2. **Vérifier les emails** :
   - Dans Supabase Dashboard → **Authentication** → **Users**
   - Vous verrez les utilisateurs avec leur statut de confirmation
   - Un utilisateur non confirmé aura `email_confirmed_at: null`

## 🔧 Comportement après activation

### Lors de l'inscription

1. L'utilisateur remplit le formulaire d'inscription
2. Un email de vérification est automatiquement envoyé
3. L'utilisateur voit un message : *"Email de vérification envoyé. Vérifiez votre boîte de réception..."*
4. Le formulaire bascule automatiquement vers le mode connexion
5. L'utilisateur doit cliquer sur le lien dans l'email pour confirmer son compte

### Lors de la vérification

1. L'utilisateur clique sur le lien dans l'email
2. Il est redirigé vers `/auth/verify-email`
3. La page vérifie automatiquement le token
4. Si la vérification réussit :
   - Message de succès affiché
   - Redirection automatique vers la page de connexion après 2 secondes
5. Si le lien a expiré :
   - Message d'expiration affiché
   - Bouton pour renvoyer l'email de vérification

### Lors de la connexion

Si un utilisateur essaie de se connecter sans avoir confirmé son email :
- Un message d'erreur s'affiche : *"Veuillez confirmer votre email avant de vous connecter..."*
- Un toast rappelle qu'un email de vérification a été envoyé

## 📧 Configuration des emails en production

Pour la production, vous devrez configurer un service d'envoi d'email :

1. Dans Supabase Dashboard → **Settings** → **Auth**
2. Configurez un **SMTP provider** (SendGrid, Mailgun, AWS SES, etc.)
3. Ou utilisez le service par défaut de Supabase (limité)

## ⚠️ Notes importantes

- **En développement** : Les emails peuvent être lents ou ne pas arriver. Vérifiez les logs Supabase.
- **Spam** : Les emails peuvent arriver dans les spams. Ajoutez votre domaine à la liste blanche.
- **Expiration** : Les liens de vérification expirent après 24 heures par défaut (configurable dans Supabase).
- **Renvoyer l'email** : Les utilisateurs peuvent demander un nouvel email depuis la page de vérification si le lien a expiré.

## 🔄 Désactiver la vérification (si nécessaire)

Si vous souhaitez désactiver temporairement la vérification :

1. Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. Désactivez **"Enable email confirmations"**
3. Les nouveaux utilisateurs seront automatiquement connectés après inscription

---

**Date de création** : 17 février 2026  
**Dernière mise à jour** : 17 février 2026
