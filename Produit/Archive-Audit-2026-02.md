> **Archive** : extrait de `INDEX.md` (audit février 2026). L’état code/docs a évolué depuis — se référer aux audits récents (`Audits/`) et à `INDEX.md` à jour.

---

## Audit 17/02/2026

### Vue d'ensemble

Cet audit fait le point sur l'état réel du code par rapport à la documentation produit. Les fichiers .md du dossier Produit ont été mis à jour pour refléter l'implémentation actuelle.

### Statut des phases

| Phase | Statut réel | Description |
|-------|-------------|-------------|
| **Phase 1 — MVP** | ✅ **Complètement livré** | Auth (email/password + Google OAuth), projets (CRUD), style (template + images de référence), assets (personnages/décors/objets avec génération IA), plans Free/Pro, quotas mensuels, dashboard, profil utilisateur, landing page, thème clair/sombre |
| **Phase 2 — Panels & Scénario** | 🔄 **Partiellement livré** | **Section Scénario** : ✅ complète (IA Scénario, IA Chapitre, chapitres texte, détection assets, éléments non créés). **Édition de l'œuvre** : ✅ implémentée (chapitres visuels, panels avec blocs, génération par bloc). **À venir** : découpage IA chapitre→panels, dialogues/bulles, lecteur webtoon |
| **Phase 3 — Export** | 📋 **Planifié** | Export PDF/PNG, collaboration, monétisation Stripe |
| **Phase 4 — Scale** | 📋 **Futur** | Marketplace, app mobile, publication, analytics |

### Fonctionnalités implémentées (détail)

*(Contenu historique conservé tel quel — tables `panels`, routes legacy, etc. peuvent différer du schéma actuel `chapter_canvases`.)*

#### ✅ Phase 1 — MVP (100% livré)
- **Authentification** : Email/password + Google OAuth, sessions persistantes, RLS
- **Projets** : CRUD complet, recherche, filtrage, dashboard avec stats
- **Style** : Template texte + images de référence (2 max Pro), application automatique
- **Assets** : Bibliothèque complète (personnages, décors, objets), génération IA multi-modèles (FLUX.1 Schnell / FLUX.2 Pro / FLUX.2 Pro Edit), vues multiples (face/profil/dos) pour personnages Pro
- **Plans** : Free (20 gen/mois) / Pro (300 gen/mois), page pricing, changement de plan
- **Quotas** : Tracking usage mensuel, barre de progression, alertes
- **UI/UX** : Design glassmorphism, thème clair/sombre, responsive, composants shadcn/ui

#### 🔄 Phase 2 — Panels & Scénario (partiellement livré)

**Section Scénario** ✅ **Complète** :
- Onglet Scénario dans ProjectDetail
- Tables `scenario_chapters` et `scenario_versions`
- IA Scénario : un prompt = un chapitre généré (Groq/Llama 3.3 70B)
- IA Chapitre : réécriture par chapitre avec diff visuel (texte supprimé/ajouté)
- Chapitres texte : création, réorganisation (drag & drop), édition, suppression
- Détection assets : surbrillance par type, hover (HoverCard), clic (Dialog)
- Éléments non créés : détection IA, panneau dédié, création depuis scénario
- Mode Édition / Aperçu avec surbrillance
- Import .txt (copier-coller)

**Édition de l'œuvre** ✅ **Implémentée** :
- Onglet "Édition de l'œuvre" dans ProjectDetail
- Chapitres visuels (`chapters` table) avec lien optionnel vers chapitres texte (`linked_scenario_chapter_id`)
- Panels (`panels` table) avec layout JSONB (blocs)
- Page `ChapterDetail` : édition immersive plein écran avec panel centré fixe + suivi chapitre textuel à droite
- Sous-menus d’édition : Personnalisation, Couleurs, Dialogue (pictos)
- Actions structurelles : ajout blocs (500×500 par défaut), position (drag & drop), dimensions (poignées), suppression
- Génération visuelle : prompt par bloc avec détection assets, génération par bloc
- Edge Function `generate-panel-image` : génération d'image avec dimensions du bloc
- Stockage : `panels/{panel_id}/blocks/{block_id}.png`

**À venir** :
- Découpage IA chapitre → panels (suggestion optionnelle)
- Bulles de dialogue (speech_bubbles JSONB prévu mais UI non implémentée)
- Narration, effets de transition
- Lecteur webtoon (défilement vertical)

### Architecture technique réelle (snapshot 02/2026)

#### Frontend
- **Pages** : Landing, Auth, Dashboard, Projects, ProjectDetail, Profile, Plans, ChapterDetail, NotFound
- **Composants** : DashboardLayout, AssetLibrary, StyleManager, ScenarioSection, EditionSection, ScenarioTextHighlighter, CharacterViewDialog, AssetCard, etc.
- **Services** : projects.ts, assets.ts, chapters.ts, panels.ts, scenarioChapters.ts, scenarioAI.ts, storage.ts
- **Hooks** : useAuth, useProjects, useAssets, useChapters, usePanels, useScenarioChapters, useScenarioAI, useAssetGeneration, useUserPlan, useTheme

#### Backend
- **Tables** : profiles, projects, assets, chapters, panels, scenario_chapters, scenario_versions, usage
- **Edge Functions** :
  - `generate-asset-image` : génération images assets (FLUX.1 Schnell / FLUX.2 Pro / FLUX.2 Pro Edit)
  - `generate-scenario-ai` : IA Scénario, IA Chapitre, découpage panels (Groq/Llama 3.3 70B)
  - `generate-panel-image` : génération images blocs de panels (dimensions personnalisées)
- **Storage** : Bucket `dreamweave` avec structure `{user_id}/projects/{project_id}/...`

### Modèle de données réel (snapshot)

**Tables principales** :
- `profiles` : plan (free/pro), display_name, avatar_url
- `projects` : title, description, style_template, style_image_urls, panels_target_per_chapter, cover_url
- `assets` : name, asset_type (character/background/object), prompt, image_url + vues multiples
- `chapters` : title, synopsis, chapter_number, linked_scenario_chapter_id
- `panels` : panel_number, prompt, image_url, layout (JSONB blocs), speech_bubbles (JSONB), dialogue, narration
- `scenario_chapters` : title, content, chapter_number, panels_outline (JSONB)
- `scenario_versions` : content, version_type, status (pending/accepted/rejected)
- `usage` : user_id, action, created_at (comptage mensuel)

### Routes implémentées (snapshot)

```
/ → Landing
/auth → Auth (inscription/connexion)
/dashboard → Dashboard
/dashboard/projects → Liste projets
/dashboard/projects/new → Création projet
/dashboard/projects/:id → Détail projet (onglets Style/Assets/Scénario/Édition)
/dashboard/projects/:id/chapter/:chapterId → Édition chapitre visuel (panels)
/dashboard/profile → Profil utilisateur
/dashboard/plans → Page pricing
* → NotFound
```

### Points d'attention

1. **Documentation vs Code** : Certains fichiers .md mentionnaient des fonctionnalités "à venir" qui sont en fait déjà implémentées (ex. Section Scénario complète, Édition de l'œuvre avec blocs)
2. **Tables manquantes dans certains docs** : `scenario_chapters`, `scenario_versions` étaient mentionnées mais pas toujours détaillées
3. **Edge Functions** : `generate-panel-image` était mentionnée mais pas toujours documentée dans les specs API
4. **Routes** : La route `/dashboard/projects/:id/chapter/:chapterId` (ChapterDetail) était mentionnée comme "placeholder" mais est complètement implémentée

### Actions de mise à jour (historique)

Tous les fichiers .md du dossier Produit ont été mis à jour pour refléter :
- L'état réel du code (février 2026)
- Les fonctionnalités réellement implémentées
- Les tables et relations de base de données réelles
- Les Edge Functions déployées
- Les routes et pages disponibles
- Le statut réel des phases (Phase 1 ✅, Phase 2 partiellement ✅)

Les éléments "à venir" ou "planifiés" ont été conservés pour les fonctionnalités non encore implémentées.

---

*Archivé le 30 avril 2026 — source : extrait INDEX.md audit 17/02/2026*
