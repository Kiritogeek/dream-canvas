# Contribuer à DreamWeave

## Prérequis

- Node.js 20+ (la CI utilise Node 22)
- npm

## Installation

```sh
npm install
```

## Variables d’environnement

Copier `.env.example` vers `.env` et renseigner **vos** valeurs :

- `VITE_SUPABASE_URL` — URL du projet Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` — clé **anon / publishable** (jamais la clé `service_role`)
- Éventuellement `VITE_ADMIN_EMAIL`, `VITE_SUPABASE_PROJECT_ID` selon le setup

Ne **commitez jamais** de clés réelles dans `.env.example` ou dans le dépôt. La clé publishable peut figurer uniquement dans `.env` local / secrets CI hébergeur.

## Commandes utiles

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de dev (voir `vite.config.ts` pour host/port) |
| `npm run build` | Build production (`dist/`) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Vérification TypeScript (aussi dans le hook pre-commit) |
| `npm test` | Vitest (mode CI : `vitest run`) |

## Hooks Git

Après clone, Husky peut enregistrer un **pre-commit** qui exécute `tsc --noEmit` et `lint-staged` :

```sh
npm run prepare   # généralement déjà après npm install si prepare est défini dans package.json
```

## Pull requests

- La **CI GitHub Actions** doit être verte (lint, typecheck, tests, build).
- Préférer des commits / PRs centrées sur un sujet lisible pour la revue.

## Edge Functions & Supabase

- Migrations SQL : `supabase/migrations/`
- Fonctions : `supabase/functions/<nom>/`
- Tableau synthétique des slugs et rôles : [`EDGE_FUNCTIONS_INDEX.md`](./EDGE_FUNCTIONS_INDEX.md)

Pour le détail déploiement et secrets côté Supabase, voir [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) et le dossier `Produit/`.
