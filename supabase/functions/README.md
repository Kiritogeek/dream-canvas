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

---

## generate-scenario-ai

IA Scénario, IA Chapitre et **découpage chapitre → panels** (mode `panels`). Utilise Groq (Llama 3.3 70B).

**Secrets requis (Dashboard Supabase → Edge Functions → Secrets) :**
- `GROQ_API_KEY` — clé API Groq
- `SUPABASE_ANON_KEY` — clé anon du projet (souvent déjà injectée ; nécessaire pour valider le JWT utilisateur dans la fonction)
- `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` — en général déjà définis par Supabase

**Config (config.toml) :** `verify_jwt = false` pour cette fonction afin d’éviter un 401 côté passerelle ; la fonction vérifie elle-même le JWT via l’API Auth.

**Redéploiement :**

```bash
npx supabase link --project-ref VOTRE_PROJECT_REF   # si pas déjà lié
npx supabase functions deploy generate-scenario-ai
```

Après déploiement, vérifier dans le Dashboard que les secrets ci-dessus sont bien renseignés pour `generate-scenario-ai`.

---

## generate-style-template-images

Genere les 9 images d'exemple de styles (manga, webtoon-coreen, manhwa-chinois x character/background/scene), puis les enregistre dans Storage:

- `template-style-img/manga/*.png`
- `template-style-img/webtoon-coreen/*.png`
- `template-style-img/manhwa-chinois/*.png`

**Secrets requis :**
- `FAL_API_KEY`
- `TEMPLATE_STYLE_ADMIN_TOKEN` (token d'administration pour proteger l'appel)

**Deploiement :**

```bash
npx supabase functions deploy generate-style-template-images
```

**Invocation (une fois) :**

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/generate-style-template-images" ^
  -H "Content-Type: application/json" ^
  -H "x-template-admin-token: <TEMPLATE_STYLE_ADMIN_TOKEN>" ^
  -d "{}"
```
