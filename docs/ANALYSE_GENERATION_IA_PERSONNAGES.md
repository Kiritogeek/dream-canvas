# Analyse : génération IA des personnages (et assets)

> Mis à jour le 28/06/2026 — la génération IA d'assets est livrée et opérationnelle. Ce document décrit désormais le pipeline réel.

## État actuel

### 1. Ce qui existe

| Élément | Fichier | Comportement |
|--------|---------|--------------|
| **UI « Nouvel asset »** | `src/components/project/AssetLibrary.tsx` | Formulaire avec type (Personnages / Décors / Objets), nom et champ **Description / Prompt**. La création passe par `useCreateAsset()` (React Query). |
| **Création d’asset** | `createAsset()` dans `src/services/assets.ts` | Insère dans Supabase : `name`, `asset_type`, `prompt`. La ligne est créée avec `image_url = null` ; l'image est générée dans un second temps (bouton « Générer »). |
| **Génération d’image** | `useAssetGeneration` (`src/hooks/useAssetGeneration.ts`) → `generateAssetImage()` (`src/services/assets.ts`) → Edge Function `generate-asset-image` | Vérifie le quota (`canGenerate()`), exige un style défini sur le projet, `refreshSession()` puis appelle l'Edge Function. Au retour, met à jour le cache React Query (`assets`, `monthlyUsage`). |
| **Affichage des assets** | `AssetLibrary.tsx` | Si `asset.image_url` est renseigné → affichage de l’image. Sinon → placeholder avec icône Sparkles, en attendant la génération. |
| **Table `assets`** | Supabase | Colonnes clés : `id`, `user_id`, `project_id`, `name`, `asset_type`, `prompt`, `image_url`, `image_url_sheet`, `reference_image_url`, `lore`, `metadata`, `created_at`. L'Edge Function remplit `image_url` (vue de face) et `image_url_sheet` (sheet 4 angles) après génération. |
| **Template de style** | Onglet Style du projet | Texte sauvegardé dans `projects.style_template` + images dans `projects.style_image_urls`. **Effectivement utilisé** : l'Edge Function lit le style **uniquement** depuis la BDD (jamais depuis le body) pour cadrer chaque génération. |

### 2. Comment ça marche (résumé)

- **Service d’IA image** : FAL.ai — FLUX.2 Pro (text-to-image) et FLUX.2 Pro Edit (avec images de référence), pour **tous les tiers** (libre / créateur / studio).
- **Génération d’image** déclenchée depuis le prompt + le style du projet, via l'Edge Function `generate-asset-image`.
- **Upload** vers Supabase Storage (bucket `dreamweave`) puis mise à jour de `assets.image_url` (et `image_url_sheet` pour les personnages).
- **Edge Function dédiée** : `generate-asset-image` (Deno, Supabase Functions).
- La génération des **panels** (blocs de case) est elle aussi livrée : `ChapterDetail.tsx` utilise `useGeneratePanelImage` (Edge Function `generate-panel-image`) et `useComposeChapterLayout` (mode Auto, Edge Function `compose-chapter-layout`).

---

## Flux actuel (personnages / assets)

```
Utilisateur remplit : Type + Nom + Description (prompt)
        ↓
createAsset() → supabase.from("assets").insert({ name, asset_type, prompt })
        ↓
Ligne en base avec image_url = null (placeholder affiché)
        ↓
Clic « Générer » → useAssetGeneration.generate(asset)
   • canGenerate() : quota OK + style défini sur le projet
   • generateAssetImage() : refreshSession() puis invoke "generate-asset-image"
        ↓
Edge Function generate-asset-image
   • réserve un crédit (atomique) avant l'appel FAL, refund si échec
   • lit style_template + style_image_urls EN BDD (jamais le body)
   • FLUX.2 Pro : face (1280x1024), puis sheet 4 angles (2560x768) pour les personnages
   • crop des bordures blanches, upload Storage (bucket dreamweave)
   • update assets.image_url (+ image_url_sheet), log usage
        ↓
Front : invalidation React Query → l'image s'affiche
```

Le prompt est **stocké à la création**, puis **envoyé au modèle FLUX.2 Pro** lors de la génération.

---

## Détails du pipeline de génération

1. **Fournisseur d’images par IA**  
   FAL.ai — FLUX.2 Pro (text-to-image, `https://fal.run/fal-ai/flux-2-pro`) et FLUX.2 Pro Edit (`/edit`, avec images de référence). Identique pour tous les tiers (logique « tout gratuit » : la différenciation se fait sur le volume de crédits 20 / 100 / 250, pas sur le modèle).

2. **Où l’API est appelée**  
   Côté serveur, dans l'Edge Function Supabase `generate-asset-image` (Deno). La clé FAL reste côté serveur. Le front n'appelle jamais FAL directement : il passe par `supabase.functions.invoke("generate-asset-image")` avec le JWT utilisateur en `Authorization: Bearer`.

3. **Sécurité & quota**  
   - Vérification JWT via `${supabaseUrl}/auth/v1/user`, puis opérations en service role.
   - Réservation de crédit **atomique** via la RPC `consume_image_credit` (anti race-condition quota), `refundImageCredit` si la génération/upload/BDD échoue.
   - 3 niveaux de fallback de prompt en cas de violation de la politique de contenu FAL (422).

4. **Cohérence personnages (Sheet System)**  
   Pour un `asset_type = 'character'`, la génération produit **séquentiellement** : la vue de face (affichée dans `image_url`), puis une **sheet 4 angles** (`image_url_sheet`) en utilisant la face comme référence d'identité. Les colonnes legacy `image_url_profile_left/right/back` sont réinitialisées à `null`.

---

## Fichiers impliqués dans la génération

| Fichier | Rôle |
|---------|------|
| `src/components/project/AssetLibrary.tsx` | Formulaire « Nouvel asset » (création) + déclenchement de la génération. |
| `src/hooks/useAssetGeneration.ts` | Centralise `canGenerate()` (quota + style) et `generate(asset)` (toasts, état de génération, invalidation React Query). |
| `src/services/assets.ts` | `createAsset()`, `generateAssetImage()` (invoke de l'Edge Function), CRUD assets. |
| `supabase/functions/generate-asset-image/index.ts` | Edge Function : réservation crédit, lecture du style en BDD, appel FAL.ai, crop, upload Storage, update `assets`. |

---

## Résumé

- **Aujourd’hui** : la génération IA des personnages (et autres assets) est **opérationnelle**. La création d'un asset insère les métadonnées (nom + prompt), puis la génération appelle FLUX.2 Pro via l'Edge Function `generate-asset-image`, qui upload l'image dans Storage et remplit `assets.image_url` (+ `image_url_sheet` pour les personnages).
- **Garde-fous** : quota vérifié avant tout appel FAL (crédit réservé de façon atomique), style lu uniquement depuis la BDD du projet, clé FAL côté serveur uniquement.
