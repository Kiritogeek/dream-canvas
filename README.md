# DreamWeave — Créez vos webtoons avec l'IA

Plateforme web de création de webtoons assistée par intelligence artificielle. Générez des personnages, décors et objets cohérents stylistiquement en quelques secondes.

## Stack technique

- **Frontend** : React 18 + TypeScript (strict) + Vite 7
- **UI** : shadcn/ui + Tailwind CSS 3 + Framer Motion
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions Deno)
- **IA** : FAL.ai (FLUX.1 Schnell / FLUX.2 Pro / FLUX.2 Pro Edit)
- **State** : TanStack React Query 5
- **Routing** : React Router DOM 7 (lazy loading)

## Démarrage rapide

```sh
# 1. Cloner le repo
git clone <URL_DU_REPO>
cd dream-canvas

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY

# 4. Lancer le serveur de développement
npm run dev
```

## Configuration Supabase

Voir [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) pour les instructions complètes (tables, Auth, Storage, Edge Functions, Google OAuth).

## Déploiement

Le frontend est un SPA statique généré par Vite. Déployez sur Vercel, Netlify ou tout hébergeur de fichiers statiques.

```sh
npm run build   # Génère le dossier dist/
```

## Documentation produit

Voir le dossier [Produit/](./Produit/) pour la documentation complète (architecture, roadmap, modèle de données, sécurité, etc.).
