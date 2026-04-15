# Guide de maintenance des styles — Ajout, modification, suppression

> Procédure opérationnelle pour faire évoluer le système de styles (UI + prompts + templates IA) en garantissant la cohérence des générations dans tout le projet.

---

## 1. Objectif

Ce guide explique comment :
- ajouter un nouveau style (ex: `seinen-noir`, `comic-us`, etc.),
- modifier un style existant (description, prompts, visuels templates),
- supprimer un style proprement sans casser les flux de génération.

Le but est d'assurer que le style sélectionné dans l'UI soit correctement propagé dans les Edge Functions (`generate-asset-image`, `generate-panel-image`) via `style_template`.

---

## 2. Architecture actuelle du système de style

Le système s'appuie sur 3 briques :

1. **UI / projet**
   - Fichier: `src/components/project/StyleManager.tsx`
   - Source de vérité UI: `STYLE_OPTIONS`
   - Génération du texte `style_template` avec métadonnées:
     - `style_principal`
     - `style_key`
     - `description_style`
     - contraintes globales (full-bleed, artefacts interdits)

2. **Templates visuels de style**
   - Fichier: `supabase/functions/generate-style-template-images/index.ts`
   - Source de vérité prompts templates: `DEFINITIONS`
   - Sorties Storage:
     - `template-style-img/<style>/<character|background|scene>.png`

3. **Consommation du style dans les Edge Functions**
   - `generate-asset-image`: injecte `style_template` dans les prompts assets
   - `generate-panel-image`: injecte `style_template` dans les prompts de blocs/panels

---

## 3. Ajouter un nouveau style

## 3.1 Modifier l'UI

Dans `src/components/project/StyleManager.tsx`, ajouter une entrée dans `STYLE_OPTIONS` :
- `key`: slug stable (ex: `seinen-noir`)
- `label`: nom affiché
- `description`: direction artistique
- `images`: URLs via `getTemplateStyleImageUrl("<key>", "character|background|scene")`

Recommandations :
- garder un `key` court et immuable (éviter les renommages futurs),
- écrire une description orientée résultat visuel (lumière, ligne, matière, ambiance),
- éviter les descriptions ambiguës.

## 3.2 Ajouter les prompts templates

Dans `supabase/functions/generate-style-template-images/index.ts` :
- étendre `TemplateStyleKey` avec la nouvelle clé,
- ajouter 3 définitions dans `DEFINITIONS`:
  - `<style>.character`
  - `<style>.background`
  - `<style>.scene`

Toujours inclure :
- consigne de qualité (niveau de détail, composition, lisibilité),
- contrainte full-bleed stricte,
- interdiction explicite des artefacts (`white margins`, `blank borders`, `matte frame`, etc.).

## 3.3 Déployer et générer

Depuis `dream-canvas/` :

```bash
npx supabase functions deploy generate-style-template-images
```

Puis appeler la fonction (ciblé ou complet) avec le token admin :

```bash
# Exemple ciblé
POST /functions/v1/generate-style-template-images
{
  "targets": [
    "seinen-noir.character",
    "seinen-noir.background",
    "seinen-noir.scene"
  ]
}
```

---

## 4. Modifier un style existant

Cas fréquents :
- améliorer la qualité visuelle,
- corriger des artefacts (bordures blanches, zones vides),
- réaligner la DA (couleurs, contraste, cadrage).

Étapes :
1. Mettre à jour la `description` dans `STYLE_OPTIONS` si nécessaire.
2. Mettre à jour les prompts concernés dans `DEFINITIONS`.
3. Déployer la fonction.
4. Régénérer uniquement les cibles impactées via `targets`.
5. Vérifier l'affichage dans l'UI après `Ctrl+F5`.

Bonnes pratiques prompt :
- être spécifique sur les bords (`outermost pixels` non blancs),
- forcer `edge-to-edge`,
- imposer une composition lisible selon le type (`character/background/scene`).

---

## 5. Supprimer un style

Pour retirer un style sans régression :

1. **UI**
   - retirer l'entrée correspondante dans `STYLE_OPTIONS`.
   - vérifier qu'un style par défaut reste sélectionnable.

2. **Template generator**
   - retirer la clé du type `TemplateStyleKey`.
   - retirer les 3 entrées associées dans `DEFINITIONS`.

3. **Nettoyage optionnel Storage**
   - supprimer `template-style-img/<style>/...` si souhaité.

4. **Compatibilité des projets existants**
   - si des projets ont encore `style_key` supprimé dans `style_template`,
     prévoir un fallback côté UI (déjà partiellement géré via correspondance `label`).

---

## 6. Checklist de validation

- [ ] Le style apparaît dans le carousel.
- [ ] Les 3 templates s'affichent (`character`, `background`, `scene`).
- [ ] Aucun liseré blanc visible sur les bords.
- [ ] `style_template` est bien sauvegardé dans `projects.style_template`.
- [ ] Génération asset: le style est injecté dans le prompt.
- [ ] Génération panel/bloc: le style est injecté dans le prompt.
- [ ] Pas d'erreurs linter/TypeScript.

---

## 7. Commandes utiles

```bash
# Déployer la fonction templates
npx supabase functions deploy generate-style-template-images

# Déployer les fonctions principales de génération (si modifications)
npx supabase functions deploy generate-asset-image
npx supabase functions deploy generate-panel-image
```

---

*Dernière mise à jour : 15 avril 2026*
