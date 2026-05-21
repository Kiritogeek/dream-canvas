# 🎨 Guide : Utiliser le template d'email DreamWeave dans Supabase

## 📋 Étapes rapides

### 1. Ouvrir les templates d'email dans Supabase

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **DreamWeave**
3. Dans le menu de gauche : **Authentication** → **Email Templates**
4. Cliquez sur **"Confirm signup"** (ou **"Confirmation d'inscription"**)

### 2. Copier le template HTML

1. Ouvrez le fichier `email-templates/confirm-signup.html` dans votre éditeur
2. **Sélectionnez tout** (Ctrl+A / Cmd+A) et **copiez** (Ctrl+C / Cmd+C)
3. Dans Supabase, collez le contenu dans le champ **"HTML"**
4. Cliquez sur **"Save"** (Enregistrer)

### 3. Copier le template texte

1. Ouvrez le fichier `email-templates/confirm-signup-text.txt` dans votre éditeur
2. **Sélectionnez tout** et **copiez**
3. Dans Supabase, collez le contenu dans le champ **"Plain text"**
4. Cliquez sur **"Save"** (Enregistrer)

### 4. Tester

1. Créez un compte de test avec votre email
2. Vérifiez votre boîte de réception
3. L'email devrait avoir le style DreamWeave avec les couleurs lavande, pêche et menthe ✨

## 🎨 Aperçu du template

Le template inclut :

- ✨ **Header avec gradient** lavande → pêche
- 📧 **Message de bienvenue** personnalisé
- 🔘 **Bouton CTA** avec le style DreamWeave
- 💡 **Informations** sur ce que l'utilisateur peut faire ensuite
- 📱 **Design responsive** pour mobile et desktop
- 🎨 **Couleurs DreamWeave** : lavande, pêche, menthe

## ⚠️ Important

- **Ne modifiez pas** les variables `{{ .Email }}` et `{{ .ConfirmationURL }}` - elles sont remplacées automatiquement par Supabase
- **Testez toujours** avant de mettre en production
- Les **gradients** peuvent s'afficher différemment selon le client email (Gmail, Outlook, etc.)

## 📧 Template "Mot de passe oublié"

Pour configurer le template de réinitialisation de mot de passe :

1. Dans Supabase : **Authentication** → **Email Templates** → **"Reset password"**
2. Copiez le contenu de `email-templates/reset-password.html` dans le champ **"HTML"**
3. Copiez le contenu de `email-templates/reset-password-text.txt` dans le champ **"Plain text"**
4. Cliquez sur **"Save"** (Enregistrer)

## 🔄 Personnalisation

Si vous voulez modifier les templates :

1. Éditez les fichiers HTML/TXT dans `email-templates/`
2. Testez localement en ouvrant le HTML dans un navigateur
3. Copiez le nouveau contenu dans Supabase
4. Testez avec un compte de test

---

**Besoin d'aide ?** Consultez `email-templates/README.md` pour plus de détails.
