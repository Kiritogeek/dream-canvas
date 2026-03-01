# Vérification des images de référence dans le style

Ce document explique comment vérifier que toutes les images de référence ajoutées dans l'onglet "Style" sont bien prises en compte lors de la génération d'assets.

## 🔍 Méthodes de vérification

### 1. **Indicateur visuel dans l'interface**

Dans l'onglet **Style** → **Images de référence** :
- Un badge affiche le nombre d'images : `"X images"`
- Un message de confirmation apparaît : `"✓ X image(s) sera(nt) utilisée(s) lors des générations"`

**Exemple :**
```
Images de référence  [3 images]
✓ 3 images seront utilisées lors des générations
```

### 2. **Console du navigateur (Frontend)**

Ouvrez la console du navigateur (F12) et générez un asset. Vous verrez :

```javascript
[Frontend] Génération d'asset - Données envoyées: {
  asset_type: "character",
  hasStyleText: true,
  styleTextLength: 150,
  hasStyleImages: true,
  numberOfImages: 3,
  imageUrls: [
    "https://...supabase.co/storage/v1/object/public/dreamweave/.../image1.png",
    "https://...supabase.co/storage/v1/object/public/dreamweave/.../image2.png",
    "https://...supabase.co/storage/v1/object/public/dreamweave/.../image3.png"
  ]
}
```

**Vérifications :**
- ✅ `hasStyleImages: true` → Les images sont détectées
- ✅ `numberOfImages: 3` → Le bon nombre d'images est envoyé
- ✅ `imageUrls` → Liste complète des URLs envoyées

### 3. **Logs de l'Edge Function (Backend)**

Les logs de l'Edge Function Supabase affichent des informations détaillées. Pour les voir :

1. Allez dans **Supabase Dashboard** → **Edge Functions** → **generate-asset-image**
2. Cliquez sur **Logs** ou **View logs**
3. Générez un asset et regardez les logs

**Logs attendus :**

```
[generate-asset-image] ===== DÉBUT LOG GÉNÉRATION =====
[generate-asset-image] Type d'asset: character
[generate-asset-image] Vue: front
[generate-asset-image] Style texte présent: true
[generate-asset-image] Style texte: style webtoon sombre...
[generate-asset-image] Images de référence présentes: true
[generate-asset-image] Nombre d'images de référence: 3
[generate-asset-image] URLs des images de référence:
[generate-asset-image]   Image 1: https://...supabase.co/storage/v1/object/public/dreamweave/.../image1.png
[generate-asset-image]   Image 2: https://...supabase.co/storage/v1/object/public/dreamweave/.../image2.png
[generate-asset-image]   Image 3: https://...supabase.co/storage/v1/object/public/dreamweave/.../image3.png
[generate-asset-image] ===== FIN LOG GÉNÉRATION =====
```

**Vérification finale :**

```
[generate-asset-image] ✅ Vérification: Les URLs des images sont-elles dans le prompt? true
[generate-asset-image] 📋 Extrait du prompt avec URLs:
URLS DES IMAGES DE RÉFÉRENCE À ANALYSER :
Image 1: https://...supabase.co/storage/v1/object/public/dreamweave/.../image1.png
Image 2: https://...supabase.co/storage/v1/object/public/dreamweave/.../image2.png
Image 3: https://...supabase.co/storage/v1/object/public/dreamweave/.../image3.png
```

### 4. **Vérification dans le prompt final**

Le prompt envoyé à l'API FAL.ai contient une section dédiée aux images :

```
URLS DES IMAGES DE RÉFÉRENCE À ANALYSER :
Image 1: https://...
Image 2: https://...
Image 3: https://...

Tu dois analyser ces images et extraire avec la plus grande précision :
- le type de trait (épaisseur, netteté, texture)
- la technique de coloriage et d'ombrage...
```

## ✅ Checklist de vérification

Avant de générer un asset, vérifiez :

- [ ] **Dans l'UI** : Le badge affiche le bon nombre d'images
- [ ] **Dans l'UI** : Le message de confirmation apparaît
- [ ] **Console navigateur** : `numberOfImages` correspond au nombre d'images ajoutées
- [ ] **Console navigateur** : Toutes les URLs sont présentes dans `imageUrls`
- [ ] **Logs Edge Function** : `Nombre d'images de référence` est correct
- [ ] **Logs Edge Function** : Toutes les URLs sont listées individuellement
- [ ] **Logs Edge Function** : `Les URLs des images sont-elles dans le prompt? true`
- [ ] **Logs Edge Function** : L'extrait du prompt contient toutes les URLs

## ⚠️ Problèmes courants

### Les images ne sont pas détectées

**Symptôme :** `hasStyleImages: false` ou `numberOfImages: 0`

**Solutions :**
1. Vérifiez que les images sont bien sauvegardées dans `project.style_image_urls`
2. Rechargez la page pour rafraîchir les données
3. Vérifiez la console pour des erreurs de chargement

### Les URLs ne sont pas dans le prompt

**Symptôme :** `Les URLs des images sont-elles dans le prompt? false`

**Solutions :**
1. Vérifiez que `hasStyleImages` est `true` dans les logs
2. Vérifiez que `style_image_urls` n'est pas vide
3. Vérifiez que le prompt n'a pas été tronqué (limite de 1900 caractères)

### Le prompt est trop long

**Symptôme :** `Prompt trop long, truncation`

**Solutions :**
1. Réduisez le nombre d'images de référence
2. Réduisez la longueur du style texte
3. Les URLs peuvent être coupées si le prompt dépasse 1900 caractères

## 📊 Exemple complet

**Scénario :** 3 images de référence ajoutées

**Dans l'UI :**
```
Images de référence  [3 images]
✓ 3 images seront utilisées lors des générations
```

**Dans la console navigateur :**
```javascript
{
  numberOfImages: 3,
  imageUrls: [
    "https://.../image1.png",
    "https://.../image2.png", 
    "https://.../image3.png"
  ]
}
```

**Dans les logs Edge Function :**
```
Nombre d'images de référence: 3
Image 1: https://.../image1.png
Image 2: https://.../image2.png
Image 3: https://.../image3.png
✅ Vérification: Les URLs des images sont-elles dans le prompt? true
```

Si toutes ces vérifications passent, vos images sont bien prises en compte ! 🎉
