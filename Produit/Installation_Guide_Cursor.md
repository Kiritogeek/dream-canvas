# Guide d'installation DreamWeave — Prompt Cursor

> Copier l'intégralité du bloc ci-dessous et le coller dans Cursor en tant que prompt.
> Remplacer les valeurs `[...]` par les informations fournies par Louis avant de lancer.

---

## Prompt à copier dans Cursor

```
Je vais t'installer une application web React/TypeScript appelée DreamWeave.
Suis ces étapes dans l'ordre exact. Dis-moi à chaque étape si tu as besoin d'une confirmation.

---

## ÉTAPE 1 — Installer Git

1. Ouvre un navigateur et va sur https://git-scm.com/download/win
2. Télécharge "64-bit Git for Windows Setup"
3. Lance l'installeur et clique "Next" à chaque étape sans rien changer
4. Une fois installé, ouvre PowerShell (touche Windows → tape "powershell" → Entrée)
5. Tape : git --version
6. Tu dois voir quelque chose comme : git version 2.x.x
   → Si oui : Git est installé, passe à l'étape 2.
   → Si erreur : relance PowerShell et réessaie.

---

## ÉTAPE 2 — Installer Node.js

1. Va sur https://nodejs.org/
2. Télécharge la version LTS (bouton vert "LTS — Recommended for most users")
3. Lance l'installeur → "Next" à chaque étape, ne rien décocher
4. Une fois installé, ferme PowerShell et rouvre-le (important pour actualiser le PATH)
5. Tape : node --version
6. Tu dois voir : v20.x.x ou v22.x.x
7. Tape aussi : npm --version
8. Tu dois voir : 10.x.x ou supérieur
   → Si les deux commandes fonctionnent : passe à l'étape 3.

---

## ÉTAPE 3 — Cloner le dépôt DreamWeave

1. Dans PowerShell, navigue jusqu'au bureau :
   cd $env:USERPROFILE\Desktop

2. Clone le projet :
   git clone https://github.com/Kiritogeek/DreamWeave.git

3. Entre dans le dossier :
   cd DreamWeave

4. Vérifie le contenu :
   ls
   → Tu dois voir les dossiers : src, supabase, public, et les fichiers package.json, vite.config.ts, etc.

---

## ÉTAPE 4 — Configurer les variables d'environnement

1. Dans PowerShell (tu es déjà dans le dossier DreamWeave) :
   Copy-Item .env.example .env

2. Ouvre le fichier .env dans Notepad :
   notepad .env

3. Remplace les valeurs par celles-ci (fournies par Louis) :
   VITE_SUPABASE_URL="[COLLER_URL_SUPABASE_ICI]"
   VITE_SUPABASE_PUBLISHABLE_KEY="[COLLER_CLE_ANON_ICI]"

4. Sauvegarde (Ctrl+S) et ferme Notepad.

---

## ÉTAPE 5 — Installer les dépendances

1. Dans PowerShell (toujours dans le dossier DreamWeave) :
   npm install

2. L'installation prend 1-3 minutes. Tu verras défiler des packages.
3. À la fin tu dois voir : "added XXX packages" sans erreur rouge.
   → Si tu vois des warnings jaunes : c'est normal, pas de panique.
   → Si tu vois des erreurs rouges "npm error" : dis-le moi.

---

## ÉTAPE 6 — Lancer l'application

1. Dans PowerShell :
   npm run dev

2. Tu dois voir :
   VITE v7.x.x  ready in XXX ms
   ➜  Local:   http://localhost:8080/

3. Ouvre ton navigateur (Chrome de préférence) et va sur :
   http://localhost:8080

4. Tu dois voir la page d'accueil DreamWeave.
   → Pour arrêter le serveur : appuie sur Ctrl+C dans PowerShell.

---

## EN CAS DE PROBLÈME

- "node n'est pas reconnu" → Ferme et rouvre PowerShell après l'installation de Node.js
- "Permission denied" → Lance PowerShell en tant qu'administrateur (clic droit → Exécuter en tant qu'administrateur)
- Port déjà utilisé → Le serveur démarrera sur http://localhost:8081 automatiquement
- Page blanche dans le navigateur → Vérifie que les valeurs dans .env sont correctes (pas d'espace autour du =)

---

Commence par l'Étape 1 et dis-moi quand tu es prêt pour la suite.
```

---

## Valeurs à fournir à ton frère

Avant de lui donner ce prompt, renseigne ces deux valeurs depuis ton [Dashboard Supabase](https://supabase.com/dashboard) → Settings → API :

| Variable | Où la trouver |
|----------|--------------|
| `VITE_SUPABASE_URL` | Project URL (format : `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `anon` / `public` key (jamais la `service_role`) |

> Ces clés sont publiques côté client — c'est sécurisé par la RLS Supabase.
