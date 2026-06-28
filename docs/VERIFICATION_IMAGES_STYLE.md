# Vérification des images de référence dans le style

Ce document explique comment vérifier que les images de référence ajoutées dans l'onglet "Style" sont bien prises en compte lors de la génération d'assets.

> Rappel architecture : les images de style ne sont JAMAIS envoyées dans le corps de la requête. L'Edge Function `generate-asset-image` lit le style uniquement depuis `projects.style_template` et `projects.style_image_urls` en base (service role). Le corps de requête ne contient que `asset_id`, `prompt` et `asset_type`. Maximum 2 images de référence par projet (`MAX_STYLE_IMAGES = 2`).

## 🔍 Méthodes de vérification

### 1. **Indicateur visuel dans l'interface**

Dans l'onglet **Style** → **Images de référence** :
- Un badge affiche le nombre d'images sur le maximum : `"N/2"`
- Le bouton d'ajout indique aussi le compteur : `"Glisser ou cliquer (N/2)"`

**Exemple :**
```
Images de référence  [2/2]
```

### 2. **Console du navigateur (Frontend)**

En build de développement (`import.meta.env.DEV`), ouvrez la console du navigateur (F12) et générez un asset. Le hook `useAssetGeneration` logue le contexte de style lu sur le projet :

```javascript
[DreamWeave][Generate asset] {
  assetId: "…",
  asset_type: "character",
  style_key: "manga",
  style_text_chars: 150,
  reference_images_on_project: 2
}
```

**Vérifications :**
- ✅ `reference_images_on_project: 2` → Le bon nombre d'images est présent sur le projet
- ✅ `style_text_chars > 0` → Un template de style est défini

> Note : le corps réellement envoyé à l'Edge Function ne contient que `asset_id`, `prompt` et `asset_type`. Les images de style ne transitent pas par la requête : elles sont relues côté serveur depuis la base. Ce log sert donc à vérifier l'état du projet, pas le contenu de la requête.

### 3. **Logs de l'Edge Function (Backend)**

Les logs de l'Edge Function Supabase affichent des informations détaillées. Pour les voir :

1. Allez dans **Supabase Dashboard** → **Edge Functions** → **generate-asset-image**
2. Cliquez sur **Logs** ou **View logs**
3. Générez un asset et regardez les logs

**Log attendu (contexte de requête) :**

```
[generate-asset-image] request context {
  request_id: "…",
  asset_id: "…",
  style_key: "manga",
  style_text_chars: 150,
  style_refs_count: 2,
  plan: "createur",
  asset_type: "character"
}
```

**Vérifications :**
- ✅ `style_refs_count` correspond au nombre d'images de référence du projet (0, 1 ou 2)
- ✅ `style_text_chars > 0` si un template de style est défini

> Cas particulier preset `manga` : les images de référence (souvent couleur / webtoon) sont volontairement ignorées pour préserver un rendu noir et blanc. Vous verrez alors :
> ```
> [generate-asset-image] preset=manga: N image(s) de reference ignorees (evite derive webtoon / couleur)
> ```
> Dans ce cas, `style_refs_count` vaut `0` même si le projet contient des images.

### 4. **Comment les images sont réellement transmises à FAL.ai**

Les images de style ne sont PAS insérées sous forme d'URLs dans le texte du prompt. Elles sont passées à FAL.ai via le champ `image_urls` de l'API FLUX.2 Pro Edit (`https://fal.run/fal-ai/flux-2-pro/edit`). Sans référence, c'est FLUX.2 Pro text-to-image (`/flux-2-pro`) qui est utilisé.

Le prompt texte contient en revanche une consigne dédiée quand des images de style sont présentes :

```
RÈGLE ABSOLUE — IMAGES DE RÉFÉRENCE STYLE UNIQUEMENT :
Ces images définissent UNIQUEMENT le style graphique : type et épaisseur des traits,
technique d'ombrage, palette de couleurs, niveau de détail, rendu des matériaux.
INTERDIT STRICTEMENT : copier, reproduire ou intégrer les sujets, personnages, objets…
```

Pour un personnage, la génération est séquentielle : la vue de face d'abord, puis la sheet 4 angles (`flux-2-pro/edit`) avec la face en première référence d'identité, suivie des éventuelles images de style.

## ✅ Checklist de vérification

Avant de générer un asset, vérifiez :

- [ ] **Dans l'UI** : Le badge affiche le bon compteur `N/2`
- [ ] **Dans l'UI** : Les images de référence apparaissent bien dans l'onglet Style
- [ ] **Console navigateur (DEV)** : `reference_images_on_project` correspond au nombre d'images ajoutées
- [ ] **Console navigateur (DEV)** : `style_text_chars` est cohérent avec votre template de style
- [ ] **Logs Edge Function** : `style_refs_count` est correct (et vaut `0` si preset `manga`)
- [ ] **Logs Edge Function** : `style_key` correspond au preset attendu

## ⚠️ Problèmes courants

### Les images ne sont pas détectées

**Symptôme :** `style_refs_count: 0` côté Edge Function alors que vous avez ajouté des images.

**Solutions :**
1. Vérifiez que les images sont bien sauvegardées dans `projects.style_image_urls` (et pas seulement dans un brouillon UI non validé)
2. Rechargez la page pour rafraîchir les données du projet
3. Vérifiez que le preset n'est pas `manga` : dans ce cas, les images de référence sont volontairement ignorées (rendu noir et blanc préservé)

### Le style ne semble pas appliqué

**Symptôme :** L'image générée ne reflète ni le template ni les images de référence.

**Solutions :**
1. Vérifiez que `style_template` et/ou `style_image_urls` sont bien renseignés sur le projet (le style d'un brouillon local non enregistré n'est jamais utilisé)
2. Vérifiez que le projet n'a pas atteint le quota mensuel (réponse `429`)
3. Consultez les logs : un fallback `policy violation` (FAL 422) peut basculer en génération text-only et droper les images de référence

## 📊 Exemple complet

**Scénario :** 2 images de référence ajoutées (maximum)

**Dans l'UI :**
```
Images de référence  [2/2]
```

**Dans la console navigateur (DEV) :**
```javascript
[DreamWeave][Generate asset] {
  asset_type: "character",
  style_key: "webtoon",
  style_text_chars: 150,
  reference_images_on_project: 2
}
```

**Dans les logs Edge Function :**
```
[generate-asset-image] request context {
  style_key: "webtoon",
  style_text_chars: 150,
  style_refs_count: 2,
  asset_type: "character"
}
```

Si toutes ces vérifications passent, vos images sont bien prises en compte ! 🎉
