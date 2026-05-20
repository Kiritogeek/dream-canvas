# Protocole de début de session — DreamWeave

## Étape 1 — Charger le contexte (dans cet ordre)

1. **Mémoires persistantes** : lire `MEMORY.md` dans `.claude/projects/.../memory/`
2. **Wiki principal** : lire `C:/Users/kirit/OneDrive/Documents/Obsidian Vault/wiki/index.md`
3. **Produit** : lire `Produit/Memoire_DreamWeave.md` (résumé rapide — sections Architecture + Fonctionnalités + Modèle éco)
4. **Dernier commit** : `git log -5 --oneline`
5. **Dernier audit** : dernier fichier dans `Audits/` (date la plus récente)
6. **État du code** : `git status`
7. **Log de sessions** : lire la section "Prochaine session" dans `C:/Users/kirit/OneDrive/Documents/Obsidian Vault/log.md` — c'est là que Louis note les tâches prioritaires entre deux sessions

## Étape 2 — Vérifications techniques

```
npx tsc --noEmit
```
→ 0 erreur obligatoire avant de commencer quoi que ce soit.

Si erreurs détectées → les signaler à Louis immédiatement, les corriger avant toute autre tâche.

## Étape 3 — Répondre

Format obligatoire :

```
✅ Initialisé

- Projet : [état actuel en 1 phrase]
- Dernière session : [ce qui a été livré]
- Prochaine priorité : [d'après roadmap / log]
- TypeScript : [0 erreur / N erreurs à corriger]
```

## Règles

- Ne pas relire les fichiers Produit/ si déjà chargés dans le contexte de la session
- Charger une page wiki supplémentaire **uniquement** si la tâche du jour l'exige
- Ne pas commencer à coder avant que Louis ait confirmé la tâche
- Zone protégée canvas : voir CLAUDE.md section "Zone protégée"
