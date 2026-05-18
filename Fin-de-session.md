# Protocole de fin de session — DreamWeave

> Déclenché par : Louis écrit **"Fin de session"**
> Ce protocole vaut autorisation explicite de pusher si l'audit passe.

---

## Étape 1 — Audit technique complet

```bash
npx tsc --noEmit          # 0 erreur obligatoire
npm test                  # 0 régression
```

Vérifications manuelles :
- [ ] Golden path éditeur : ajout bloc / couleur / bulle → instantané
- [ ] Drag & drop blocs image / couleur / bulles → instantané
- [ ] Suppression des 3 types d'éléments → instantané
- [ ] Génération d'image panel → spinner correct, image apparaît
- [ ] Navigation projet → chapitre → pas de page intermédiaire
- [ ] Toutes les mutations canvas utilisent `setQueryData` (pas d'`invalidateQueries` post-mutation canvas)
- [ ] `canGenerate()` vérifié avant appel FAL.ai
- [ ] `refreshSession()` avant appel Edge Function
- [ ] Interface entièrement en français

## Étape 2 — Si bug bloquant détecté

→ **STOP** : corriger avant de continuer. Ne pas pusher du code cassé.

Définition bug bloquant : crash, perte de données, mutation échouée sans rollback, erreur TypeScript.

## Étape 3 — Si audit PASS — Commit

```bash
git status                # vérifier les fichiers modifiés
git add [fichiers]        # ajouter explicitement (jamais git add -A sans vérifier)
git commit -m "Message en français, impératif présent"
```

Format commit message :
```
Résumé court de la session (< 72 chars)

- [feature/fix 1]
- [feature/fix 2]
...

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## Étape 4 — Push preprod

```bash
git push origin pre-production
```

## Étape 5 — Push main

```bash
git push origin main
```

## Étape 6 — Mise à jour documentation

- [ ] Mettre à jour les pages wiki concernées (`C:/Users/kirit/OneDrive/Documents/Obsidian Vault/wiki/`)
- [ ] Ajouter une entrée dans `C:/Users/kirit/OneDrive/Documents/Obsidian Vault/log.md`
- [ ] Si une décision impacte `Produit/Memoire_DreamWeave.md` → proposer la mise à jour à Louis
- [ ] Mettre à jour `CLAUDE.md` si la stack, les tiers ou les règles ont changé

---

## Rappels critiques

- ❌ Ne jamais pusher si TypeScript a des erreurs
- ❌ Ne jamais pusher si un bug bloquant est détecté
- ❌ Ne jamais pusher vers main sans avoir d'abord pushé vers preprod
- ✅ Le push est autorisé **uniquement** quand Louis écrit "Fin de session"
- ✅ Zone protégée canvas : toute modification → prévenir Louis (voir CLAUDE.md)
