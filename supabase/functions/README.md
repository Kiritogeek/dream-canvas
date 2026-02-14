# Edge Functions

## generate-asset-image

Génère une image via l'API FAL.ai à partir d'un prompt, l'upload dans le bucket Storage `dreamweave` et met à jour l'asset avec l'URL publique.

**Modèles utilisés :**
- Plan Free → FLUX.1 Schnell (`fal-ai/flux/schnell`)
- Plan Pro → FLUX.2 Pro (`fal-ai/flux-2-pro`) ou FLUX.2 Pro Edit (`fal-ai/flux-2-pro/edit`) si images de référence

**Secrets requis :**
- `FAL_API_KEY` (clé API FAL.ai)
- `ALLOWED_ORIGIN` (optionnel, URL du domaine de production pour les CORS)

**Déploiement :**

```bash
npx supabase login
npx supabase link --project-ref VOTRE_PROJECT_REF
npx supabase functions deploy generate-asset-image
```

Voir aussi le guide principal : [SUPABASE_SETUP.md](../../SUPABASE_SETUP.md) (section « Génération d'images IA »).
