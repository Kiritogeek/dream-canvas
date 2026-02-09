# Edge Functions

## generate-asset-image

Génère une image via l’API Nebius Token Factory à partir d’un prompt, l’upload dans le bucket Storage `dreamweave` et met à jour l’asset avec l’URL publique.

**Secret requis :** `NEBIUS_API_KEY` (à configurer dans Supabase → Project Settings → Edge Functions → Secrets).

**Déploiement :**

```bash
npx supabase login
npx supabase link --project-ref VOTRE_PROJECT_REF
npx supabase functions deploy generate-asset-image
```

Voir aussi le guide principal : [SUPABASE_SETUP.md](../../SUPABASE_SETUP.md) (section « Génération d’images IA »).
