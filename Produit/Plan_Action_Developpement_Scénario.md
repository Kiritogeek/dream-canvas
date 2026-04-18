# Plan d'action — Section Scénario

> Récapitulatif du développement de la section Scénario et des évolutions décidées lors de la session du 18/04/2026 avec Louis.

---

## 1. Ce qui a été réalisé (février 2026)

### Phase A–D — Shell UI, modèles de données, écriture, organisation
- Onglet **Scénario** dans ProjectDetail (Style / Assets / Scénario / Édition)
- Table `scenario_chapters` : `id`, `project_id`, `user_id`, `chapter_number`, `title`, `content`, `panels_outline` (JSONB), `created_at`, `updated_at`
- Table `scenario_versions` : versions pour flux accepter/rejeter
- Chapitres créables, réorganisables (drag & drop), supprimables
- Contenu éditable par chapitre (textarea)

### Phase E–F — IA Scénario, IA Chapitre, Diff visuel
- **IA Scénario** : 1 prompt = 1 chapitre généré, accepter/rejeter
- **IA Chapitre** : réécriture d'un chapitre + diff visuel (rouge supprimé / vert ajouté)
- Edge Function `generate-scenario-ai` (Groq Llama 3.3 70B)

### Phase G — Détection assets, éléments non créés, création depuis scénario
- Surbrillance des noms d'assets (par type), HoverCard, Dialog agrandi
- Panneau `MissingAssetsPanel` : éléments non créés + option « Ne pas créer »
- Sélection de texte → « Créer comme asset » → navigation Assets pré-remplie
- Composants : `ScenarioTextHighlighter`, `MissingAssetsPanel`, `TextDiff`

---

## 2. Refonte décidée — 18/04/2026 (PRIORITÉ CHANTIER 1)

### 2.1 Nouvelle structure du chapitre textuel

**Abandonnée** : format `Lieu / Scène / Dialogue-Action` (trop rigide, pas user-centric).

**Retenu** : **Prose narrative libre avec marqueurs optionnels** (`=== Scène ===`).

```
=== Scène 1 — La rencontre ===

Yuki pousse la porte du café. L'air chaud la frappe.
Elle repère Marcus dans son coin habituel.

« Tu es venue. » — voix neutre, ni soulagée ni surprise.

Elle s'assied sans répondre. Long silence.
```

- Les `===` sont optionnels — l'utilisateur peut écrire sans les utiliser
- L'IA détecte automatiquement : dialogues, actions, descriptions, changements de lieu
- Facilite la détection de blocs visuels en arrière-plan

### 2.2 Compteur temps de lecture — live

**Formule :**
```
(mots du chapitre ÷ 200) + (blocs verrouillés × 20s)
```

- Debounce 800ms pendant la frappe
- Se déclenche uniquement si le chapitre contient du contenu narratif réel (pas juste une description de décor isolée)
- Sources : PMC Scientific Reports (1,5s/panel pur) + guidelines Webtoon officielles (40-60 panels = 10-15 min)

**Affichage :** `Cible : X panels · Estimé : Y panels · ~Z min de lecture`
- Dans le workspace Scénario (en-tête de chapitre)
- Repris comme badge dans l'éditeur de l'œuvre (`ChapterDetail.tsx`)

### 2.3 Cible de panels

- Globale par projet (`projects.panels_target_per_chapter`) — même cible pour tous les chapitres
- **Visible et modifiable directement** depuis la page Scénario (champ inline en haut du workspace)

### 2.4 Détection de blocs visuels avec verrouillage

- L'IA détecte en arrière-plan quand il y a assez de matière pour un panel
- Propose en marge : `📌 Panel suggéré — Valider ?` avec bouton Verrouiller
- Zones verrouillées : fond coloré + numéro de panel sur le côté
- L'utilisateur reste toujours libre de déverrouiller / modifier le texte
- 3 outils IA dans le workspace :
  - `Générer le prochain chapitre` (existe)
  - `✏️ Modifier ce passage` (sélection de texte → réécriture IA)
  - `🔍 Détecter les blocs` (analyse complète → propose tous les blocs)

### 2.5 Gestion du contexte IA — résumés compacts

**Problème résolu** : relire tous les chapitres précédents = prompt géant et coûteux.

**Solution** : résumé automatique de 80-100 mots sauvegardé par chapitre.

- Nouveau champ `ai_summary TEXT` sur `scenario_chapters` (migration légère)
- Contenu : personnages · lieu · ce qui se passe · enjeu pour la suite
- Généré automatiquement après chaque sauvegarde (1 appel Groq rapide)
- Quand l'IA travaille : utilise `ai_summary` des chapitres précédents + texte complet du chapitre courant uniquement (~600 mots max de contexte)

### 2.6 Accompagnement IA dans l'éditeur de l'œuvre

Bouton `✨ Suggérer un prompt` sur chaque bloc image vide dans `ChapterDetail.tsx`.

Au clic, l'IA reçoit :
- `ai_summary` des chapitres précédents
- Texte complet du chapitre courant
- Prompts déjà créés dans les blocs précédents du même panel

Retourne une proposition courte injectée **directement dans le champ prompt** (modifiable avant génération).

### 2.7 Limites de caractères sur tous les champs prompt

| Champ | Limite |
|-------|--------|
| Bloc panel | 400 caractères |
| Asset description | 300 caractères |
| Style template | 500 caractères |

### 2.8 Gate feature Pro — Découpage Chapitre → Panels

| Feature | Free | Pro |
|---------|------|-----|
| Écriture + outils IA de base | ✓ | ✓ |
| Détection blocs + verrouillage | ✓ | ✓ |
| Temps de lecture estimé | ✓ | ✓ |
| `✨ Suggérer un prompt` (éditeur) | ✓ | ✓ |
| **Découpage Chapitre → Panels** | ✗ (CTA upgrade) | **✓** |

---

## 3. À faire — Renommage d'assets → mise à jour scénario

*(Inchangé — voir section 2 de la version précédente)*

Lors du renommage d'un asset : détecter les occurrences dans les chapitres, proposer le remplacement via une modale de confirmation.

---

## 4. Fichiers impactés (implémentation chantier 1)

```
src/components/project/ScenarioSection.tsx   — refonte workspace complet
src/pages/ChapterDetail.tsx                  — bouton ✨ + badge lecture
supabase/functions/generate-scenario-ai/     — modes detect_blocks, suggest_block_prompt, ai_summary
supabase/migrations/                         — ADD COLUMN ai_summary TEXT sur scenario_chapters
src/types/index.ts                           — ScenarioChapter + ai_summary
src/integrations/supabase/types.ts           — régénérer après migration
```

---

*Dernière mise à jour : 18 avril 2026*
