# Refonte UX — Éditeur de l'Œuvre

Rédigé le 23/04/2026. Approche validée : **Option B court terme → Option A cible**.

---

## Contexte & Problème

L'éditeur actuel (`ChapterDetail.tsx`, 2611 lignes) impose un workflow en 4 sous-menus séquentiels :
Architecture → Personnalisation → Couleurs → Dialogue.

Pour chaque action, l'utilisateur doit savoir dans quel "mode" il se trouve. Ajouter une bulle alors qu'on est en mode Architecture = switch de mode, chercher le bon onglet, revenir. Ce workflow brise le flow créatif et génère de la friction inutile.

**Objectif** : liberté à la Figma — tout accessible sans quitter son intention créative.

---

## Option B — Court terme · 1 session · Priorité immédiate

### Principe
Conserver l'architecture existante (blocs image, couleur, bulles). Rendre l'interface **contextuelle** plutôt que modale.

### Changements UI

| Avant | Après |
|-------|-------|
| 4 onglets PANEL_EDITOR_STEPS en sidebar | Supprimés |
| Propriétés dans la sidebar selon le mode actif | Panel droit accordéon — toujours visible |
| Aucun raccourci documenté | Raccourcis `B/C/T/D/Esc` affichés dans un tooltip |
| Assets visibles seulement en mode Architecture | Sidebar gauche assets permanente |

### Détail des changements

**1. Supprimer PANEL_EDITOR_STEPS**
- Supprimer les 4 onglets (Architecture / Personnalisation / Couleurs / Dialogue) dans `ChapterDetail.tsx`
- Le `activeStep` / `setActiveStep` state devient inutile → supprimer

**2. Panel droit accordéon permanent**
```
▼ Blocs image
  [+ Ajouter un bloc] [presets…]
  Si bloc sélectionné : prompt, asset_refs, dimensions, [Générer]
▼ Blocs couleur
  [+ Ajouter] Si sélectionné : fill, opacité
▼ Dialogue
  [+ Ajouter une bulle] Type de bulle…
  Si bulle sélectionnée : type, texte, formatage complet
```

**3. Toolbar contextuelle flottante**
Quand un objet est sélectionné → petit menu flottant au-dessus avec : Dupliquer / Supprimer / Monter/Descendre z-index

**4. Raccourcis clavier**
- `B` → ajouter un bloc image (ouvre le picker presets)
- `C` → ajouter un bloc couleur
- `D` → ajouter une bulle dialogue
- `Esc` → désélectionner tout
- `Delete/Backspace` → supprimer (déjà livré)

**5. Sidebar gauche assets toujours visible**
- Liste des assets du projet (personnages, décors, objets)
- Drag-and-drop vers le canvas → crée un bloc image avec `asset_refs` prérempli

### Fichiers à modifier

| Fichier | Changement |
|---------|-----------|
| `src/pages/ChapterDetail.tsx` | Supprimer PANEL_EDITOR_STEPS, ajouter panel accordéon, raccourcis |
| `src/components/project/EditionSection.tsx` | Aucun |

### Risques & garde-fous
- **Ne pas casser** : drag/drop, resize 8 poignées, génération image, export PNG, zoom
- Tester golden path : créer un bloc → générer → ajouter une bulle → exporter
- TypeScript : `npx tsc --noEmit` avant et après

### Critères d'acceptation
- [ ] Aucun onglet PANEL_EDITOR_STEPS visible
- [ ] Panel droit accordéon avec les 3 sections
- [ ] Raccourcis B/C/D/Esc fonctionnels
- [ ] Drag asset depuis sidebar → bloc créé sur le canvas
- [ ] 0 régression sur les fonctions existantes

---

## Option A — Cible Figma-like · 2-3 sessions · Moyen terme

### Principe
Refactoriser `ChapterDetail.tsx` en composants indépendants. Canvas centré plein écran, UI composée.

### Architecture cible

```
ChapterDetail (< 400 lignes après refacto)
├── CanvasArea              — canvas central, full-width, zoom
│   ├── ImageBlockLayer     — blocs image drag/resize
│   ├── ColorBlockLayer     — blocs couleur
│   └── BubbleLayer         — bulles SVG
├── LeftSidebar             — assets du projet + presets
│   ├── AssetList           — personnages, décors, objets
│   └── BlockPresets        — formats rapides
├── RightPanel              — propriétés de l'objet sélectionné
│   ├── ImageBlockProps
│   ├── ColorBlockProps
│   └── BubbleProps
├── TopToolbar              — zoom, undo/redo, export, save, raccourcis
└── LayersPanel (optionnel) — z-index visuel
```

### Nouveaux hooks
```
useDragBlock(canvasRef)       — logique drag commune blocs + bulles
useResizeBlock(blockRef)      — 8 poignées
useKeyboardShortcuts()        — B/C/T/D/Esc/Delete/Ctrl+Z
useCanvasSelection()          — sélection simple + multi
```

### Phases

| Phase | Contenu | Durée estimée |
|-------|---------|---------------|
| 1 | Extraire `useDragBlock` + `useResizeBlock` de `ChapterDetail.tsx` | ~2h |
| 2 | Séparer `ImageBlockLayer`, `ColorBlockLayer`, `BubbleLayer` | ~3h |
| 3 | `LeftSidebar` assets + drag-to-canvas | ~2h |
| 4 | `RightPanel` accordéon contextuel | ~2h |
| 5 | `TopToolbar` + undo/redo via `useReducer` action log | ~3h |

### Règles de migration
- Utiliser `isolation: "worktree"` (risque : `ChapterDetail.tsx` God Component)
- Jamais de feature freeze pendant la migration — Option B reste opérationnelle
- Chaque phase = commit indépendant, 0 régression avant de passer à la suivante

---

## Décisions

| Question | Décision | Raison |
|----------|----------|--------|
| Canvas SVG ou DOM ? | DOM | Cohérent avec l'existant, html2canvas fonctionne |
| Undo/redo ? | Phase 5 uniquement | Scope trop large pour Option B |
| Drag depuis sidebar | HTML5 drag API | Déjà utilisé pour blocs |
| Multi-sélection ? | Option A Phase 4 | Pas dans Option B |
| Layers panel ? | Optionnel | Utile si > 15 blocs par panel |

---

## Référence

- `src/pages/ChapterDetail.tsx` — fichier principal (2611 lignes)
- `src/components/project/SpeechBubbleEditor.tsx` — éditeur bulles (1541 lignes)
- `src/services/panels.ts` — BLOCK_PRESETS, generatePanelBlockImage()
- `src/hooks/usePanels.ts` — mutations React Query
- Wiki : `C:/Users/PC/Documents/WikiBrain/wiki/RefontEditeur.md`
- Wiki : `C:/Users/PC/Documents/WikiBrain/wiki/Edition-Panel.md`
