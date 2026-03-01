# Analyse : génération IA des personnages (et assets)

## État actuel

### 1. Ce qui existe

| Élément | Fichier | Comportement |
|--------|---------|--------------|
| **UI « Nouvel asset »** | `src/pages/ProjectDetail.tsx` | Formulaire avec type (Personnages / Décors / Objets), nom et champ **Description / Prompt** (placeholder : « Décrivez l'asset pour la génération IA... »). |
| **Création d’asset** | `createAsset()` dans `ProjectDetail.tsx` (l.95–119) | Envoie uniquement à Supabase : `name`, `asset_type`, `prompt`. **Aucun appel à une API d’IA**, aucun téléchargement d’image. |
| **Affichage des assets** | Même page | Si `asset.image_url` est renseigné → affichage de l’image. Sinon → placeholder avec icône Sparkles. Comme `image_url` n’est jamais rempli par le code, tous les assets restent en placeholder. |
| **Table `assets`** | Supabase | Colonnes : `id`, `user_id`, `project_id`, `name`, `asset_type`, `prompt`, `image_url`, `created_at`. Pas de trigger ni de fonction qui génère une image. |
| **Template de style** | Onglet Style du projet | Champ texte sauvegardé dans `projects.style_template`. Prévu pour « appliquer à toutes les générations » mais **non utilisé** pour l’instant (aucune génération n’est faite). |

### 2. Ce qui n’existe pas

- **Aucun appel à un service d’IA** (OpenAI, Fal.ai, Replicate, Stable Diffusion, etc.).
- **Aucune génération d’image** à partir du prompt.
- **Aucun upload** vers Supabase Storage pour remplir `assets.image_url`.
- Aucune Edge Function Supabase dédiée à la génération.
- La génération de **panels** dans `ChapterDetail.tsx` est annoncée comme « bientôt disponible » (bouton désactivé, pas de logique).

---

## Flux actuel (personnages / assets)

```
Utilisateur remplit : Type + Nom + Description (prompt)
        ↓
createAsset() → supabase.from("assets").insert({ name, asset_type, prompt })
        ↓
Ligne en base avec image_url = null
        ↓
Affichage : carte avec placeholder (pas d’image)
```

Le prompt est donc **stocké** mais jamais envoyé à un modèle pour produire une image.

---

## Pour implémenter la génération IA des personnages

Il faudrait enchaîner :

1. **Choisir un fournisseur d’images par IA**  
   Exemples : Fal.ai (flux/image), Replicate (SDXL, etc.), OpenAI DALL·E, ou API maison.

2. **Où appeler l’API**  
   - **Option A** : depuis le front (appel direct depuis `ProjectDetail` avec une clé API côté client ou via proxy).  
   - **Option B** : Supabase Edge Function qui reçoit le prompt (et éventuellement `style_template`), appelle le fournisseur, reçoit l’image (ou une URL), upload dans Storage, met à jour `assets.image_url`. Plus propre et plus sécurisé (clé API côté serveur).

3. **Flux cible suggéré**  
   - L’utilisateur valide le formulaire « Nouvel asset » (nom + type + prompt).  
   - Création de la ligne `assets` avec `image_url = null` (comme aujourd’hui) + statut « en cours » si tu ajoutes un champ (ou simple loading UI).  
   - Appel backend/Edge Function avec `prompt` + éventuellement `projects.style_template`.  
   - Le backend : appel IA → récupération image → upload Storage → mise à jour de l’asset avec l’URL publique dans `image_url`.  
   - Le front affiche l’image dès que `image_url` est renseigné (polling ou Realtime Supabase).

4. **Données déjà prêtes**  
   - `assets.prompt` et `assets.image_url` sont déjà en base.  
   - `projects.style_template` peut être passé en contexte pour toutes les générations du projet.

---

## Fichiers à modifier pour ajouter la génération

| Fichier | Rôle |
|---------|------|
| `src/pages/ProjectDetail.tsx` | Après `insert` asset : lancer l’appel de génération (ou afficher « Génération en cours » et laisser un backend mettre à jour `image_url`). Gérer loading / erreur / affichage de l’image une fois l’URL reçue. |
| Nouveau : Edge Function ou route API | Recevoir prompt (+ style), appeler le fournisseur IA, upload Storage, mettre à jour `assets.image_url`. |
| Éventuel : `src/hooks/useGenerateAsset.ts` (ou similaire) | Centraliser l’appel « générer image pour cet asset » et la mise à jour de l’état / de la ligne en base. |

---

## Résumé

- **Aujourd’hui** : la « génération IA » des personnages (et autres assets) est **uniquement une saisie de métadonnées** (nom + prompt) en base. Aucune image n’est générée, aucun service IA n’est appelé.
- **Pour avoir une vraie génération** : brancher un service d’images par IA (de préférence via une Edge Function ou une API backend), utiliser le prompt (et le style du projet), puis remplir `assets.image_url` après upload du résultat dans Storage.
