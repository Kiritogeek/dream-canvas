# Templates d'email DreamWeave

Ce dossier contient les templates d'email personnalisés pour DreamWeave, avec le style visuel de la marque.

## 📧 Templates disponibles

### 1. `confirm-signup.html`
Template HTML pour la confirmation d'inscription (email de vérification).

**Variables disponibles :**
- `{{ .Email }}` - L'adresse email de l'utilisateur
- `{{ .ConfirmationURL }}` - L'URL de confirmation (générée automatiquement par Supabase)

### 2. `confirm-signup-text.txt`
Version texte brut du template de confirmation (pour les clients email qui ne supportent pas HTML).

### 3. `reset-password.html`
Template HTML pour la réinitialisation de mot de passe.

**Variables disponibles :**
- `{{ .Email }}` - L'adresse email de l'utilisateur
- `{{ .ConfirmationURL }}` - L'URL de réinitialisation (générée automatiquement par Supabase)

### 4. `reset-password-text.txt`
Version texte brut du template de réinitialisation (pour les clients email qui ne supportent pas HTML).

## 🎨 Style DreamWeave

Les templates utilisent la charte graphique DreamWeave :

- **Couleurs principales :**
  - Lavande : `#B19CD9` (hsl(275, 45%, 72%))
  - Pêche : `#F4C2A1` (hsl(28, 80%, 88%))
  - Menthe : `#A8D5BA` (hsl(170, 35%, 78%))

- **Gradients :**
  - Principal : Lavande → Pêche
  - Fond : Lavande douce → Pêche légère → Menthe douce

- **Typographie :**
  - Titres : Nunito (700)
  - Corps : Quicksand (400)

- **Style :**
  - Design glassmorphism avec transparence
  - Ombres douces et colorées
  - Bordures arrondies (12-24px)
  - Espacement généreux

## 📋 Comment utiliser dans Supabase

### Étape 1 : Accéder aux templates d'email

1. Connectez-vous à votre projet Supabase : [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Allez dans **Authentication** → **Email Templates**
3. Sélectionnez **"Confirm signup"** (Confirmation d'inscription)

### Étape 2 : Copier le template HTML

1. Ouvrez le fichier `confirm-signup.html` dans ce dossier
2. Copiez tout le contenu HTML
3. Collez-le dans le champ **"HTML"** du template Supabase

### Étape 3 : Copier le template texte

1. Ouvrez le fichier `confirm-signup-text.txt` dans ce dossier
2. Copiez tout le contenu texte
3. Collez-le dans le champ **"Plain text"** du template Supabase

### Pour le template "Reset Password" (Réinitialisation de mot de passe)

1. Dans Supabase Dashboard → **Authentication** → **Email Templates**
2. Sélectionnez **"Reset password"** (Réinitialisation de mot de passe)
3. Copiez le contenu de `reset-password.html` dans le champ **"HTML"**
4. Copiez le contenu de `reset-password-text.txt` dans le champ **"Plain text"**
5. Cliquez sur **"Save"** (Enregistrer)

### Étape 4 : Personnaliser (optionnel)

Vous pouvez modifier les templates selon vos besoins :

- **Changer les couleurs** : Remplacez les codes couleur hex (`#B19CD9`, etc.) par vos propres couleurs
- **Modifier le texte** : Adaptez les messages selon votre ton de voix
- **Ajouter des images** : Ajoutez votre logo ou des illustrations (utilisez des URLs absolues)

### Étape 5 : Tester

1. Cliquez sur **"Save"** (Enregistrer) dans Supabase
2. Créez un compte de test avec votre email
3. Vérifiez que l'email reçu correspond au design attendu
4. Testez sur différents clients email (Gmail, Outlook, Apple Mail, etc.)

## 🔧 Variables Supabase disponibles

Supabase fournit automatiquement ces variables dans les templates :

- `{{ .Email }}` - L'adresse email de l'utilisateur
- `{{ .ConfirmationURL }}` - L'URL complète de confirmation
- `{{ .Token }}` - Le token de confirmation (si nécessaire)
- `{{ .TokenHash }}` - Le hash du token (si nécessaire)
- `{{ .SiteURL }}` - L'URL de votre site (configurée dans les paramètres)

## 📱 Compatibilité

Les templates sont conçus pour être compatibles avec :

- ✅ Gmail (Web, iOS, Android)
- ✅ Outlook (Web, Desktop, Mobile)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ Thunderbird
- ✅ Clients email mobiles

**Note :** Les clients email ont des limitations différentes. Le template utilise des techniques compatibles avec la plupart des clients, mais certains effets avancés (comme les gradients complexes) peuvent être simplifiés dans certains clients.

## 🎯 Bonnes pratiques

1. **Toujours inclure une version texte** : Certains utilisateurs préfèrent les emails en texte brut
2. **Tester sur plusieurs clients** : Les rendus peuvent varier selon le client email
3. **Vérifier les liens** : Assurez-vous que `{{ .ConfirmationURL }}` fonctionne correctement
4. **Garder le design simple** : Les emails complexes peuvent ne pas s'afficher correctement partout
5. **Optimiser pour mobile** : La majorité des emails sont lus sur mobile

## 🔄 Mise à jour des templates

Si vous modifiez les templates :

1. Testez d'abord avec un compte de test
2. Vérifiez le rendu sur plusieurs clients email
3. Assurez-vous que tous les liens fonctionnent
4. Mettez à jour ce README si nécessaire

---

**Date de création** : 17 février 2026  
**Dernière mise à jour** : 17 février 2026
