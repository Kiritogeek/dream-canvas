# Edge Functions

> Ce fichier détaille les fonctions de génération principales. **Liste complète et à jour des 14 Edge Functions** : [`docs/EDGE_FUNCTIONS_INDEX.md`](../../docs/EDGE_FUNCTIONS_INDEX.md). Cartographie des flux (qui appelle quoi) : `Produit/02_Architecture_Technique.md` §6.3.

## generate-asset-image

Génère une image via l'API FAL.ai à partir d'un prompt, génère la sheet composite 4 angles (personnages), l'upload dans le bucket Storage `dreamweave`, met à jour l'asset et log l'usage.

**Modèle (identique pour tous les tiers — logique « tout gratuit », décision 30/05/2026) :**
- Sans image de référence → FLUX.2 Pro (`fal-ai/flux-2-pro`, text-to-image)
- Avec sheet / images de référence → FLUX.2 Pro Edit (`fal-ai/flux-2-pro/edit`, multi-référence)
- La différenciation entre plans (libre / createur / studio) porte sur le **volume de crédits** (20 / 100 / 250), jamais sur le modèle.

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

Multiplexeur IA scénario : IA Scénario, IA Chapitre et **découpage chapitre → blocs** (mode `detect_blocks`), plus les modes `ai_summary`, `suggest_block_prompt`, `baseline`, `narramind`, `narrative_directions`, `suggest_connection_label`, `extract_events`. Moteur : **Google Gemini `gemini-2.5-flash` (primaire)** avec **fallback `gemini-2.5-flash-lite`** en cas d'erreur 429 (quota) ou 503 (surcharge). **Groq Llama 3.3 70B** n'intervient qu'en fallback du mode `extract_events`.

**Secrets requis (Dashboard Supabase → Edge Functions → Secrets) :**
- `GEMINI_API_KEY` — clé API Google Gemini (modèle primaire)
- `GROQ_API_KEY` — clé API Groq (fallback)
- `SUPABASE_ANON_KEY` — clé anon du projet (souvent déjà injectée ; nécessaire pour valider le JWT utilisateur dans la fonction)
- `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` — en général déjà définis par Supabase

**Config (`supabase/config.toml`) :** `verify_jwt = false` pour cette fonction afin d’éviter un 401 côté passerelle ; la fonction vérifie elle-même le JWT via l’API Auth.

**Redéploiement :**

```bash
npx supabase link --project-ref VOTRE_PROJECT_REF   # si pas déjà lié
npx supabase functions deploy generate-scenario-ai
```

Après déploiement, vérifier dans le Dashboard que les secrets ci-dessus sont bien renseignés pour `generate-scenario-ai`.

---

## generate-style-template-images

Genere les 12 images d'exemple de styles (manga, webtoon-coreen, manhwa-chinois, europeen x character/background/scene), puis les enregistre dans Storage:

- `template-style-img/manga/*.png`
- `template-style-img/webtoon-coreen/*.png`
- `template-style-img/manhwa-chinois/*.png`
- `template-style-img/europeen/*.png`

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
