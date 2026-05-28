# Grammaire Visuelle Webtoon — DreamWeave
# Extraite de : Solo Leveling (c01-c82) + "Your Talent is Mine" LN ch.1-4
# Usage : injectée dans DETECT_BLOCKS_SYSTEM_PROMPT pour guider le découpage et les prompts image

---

## PRINCIPE FONDAMENTAL

Un webtoon n'illustre PAS le texte — il le **traduit visuellement**.
Le lecteur ne lit pas "Ye Tian frappa l'ennemi" et ne voit pas un plan moyen neutre.
Il voit : un ECU sur le poing au moment du contact, des speed lines radiales, une lueur d'impact.
Le storyboarder CHOISIT le cadrage qui crée l'émotion — jamais le cadrage évident.

---

## TAXONOMIE DES SCÈNES (8 types)

### 1. `establishing` — Établissement de lieu ou d'époque

**Déclencheurs texte :**
- Description d'un lieu ("Les rues étaient animées", "L'Académie Numéro Cinq")
- Marqueur de temps ("Un mois plus tard", "Le lendemain")
- Ouverture de chapitre / changement de scène

**Cadrage :** ELS (Extreme Long Shot) ou LS. Personnages absents ou minuscules silhouettes.

**Composition :** Large, atmosphérique, profondeur de champ visible. Horizon visible si extérieur.

**FLUX keywords :**
```
wide establishing shot, panoramic view, atmospheric depth, environment detail,
no close characters, location establishing, manga webtoon background art,
cinematic wide angle, spatial context
```

**Palette :** Selon heure/ambiance. Intérieur sombre → low-key bleus. Extérieur jour → lumière naturelle chaude.

---

### 2. `dialogue` — Échange entre personnages

**Déclencheurs texte :**
- Lignes de dialogue entre deux personnes ("Ye Tian dit", "Zhang Bao répondit")
- Interaction directe, regard face à face

**Cadrage :** MCU (Medium Close-Up) ou OTS (Over-The-Shoulder). 1-2 personnages visibles.

**Composition :** Espace pour bulles de dialogue. Visages expressifs au premier plan. Background simplifié ou flouté.

**FLUX keywords :**
```
medium close-up shot, two characters, expressive faces, conversation scene,
speech bubble composition space, clean simplified background, character interaction,
manga webtoon style, warm ambient lighting, soft background blur
```

**Règle :** Varier OTS et face-à-face sur 2-3 panels consécutifs — jamais le même angle deux fois.

---

### 3. `internal_monologue` — Pensée intérieure / analyse

**Déclencheurs texte :**
- Narration interne ("Ye Tian réfléchit", "Il pensa", "Il savait que...")
- Calcul stratégique ("Mon plan était...", "Si je...", "Cela signifiait que...")
- Souvenirs ou flashback mental

**Cadrage :** CU (Close-Up) sur le visage. Regard dans le vide ou légèrement baissé.

**Composition :** Personnage seul. Background sombre ou abstrait. Espace textuel important.

**FLUX keywords :**
```
close-up face, contemplative expression, introspective mood, single character,
blurred abstract background, cool desaturated tones, low key lighting,
slight downward gaze, manga webtoon style, psychological depth
```

---

### 4. `reaction_revelation` — Choc, surprise, révélation émotionnelle

**Déclencheurs texte :**
- "ses yeux s'écarquillèrent", "choc", "stupéfaction", "il n'en croyait pas ses yeux"
- Découverte d'une information inattendue
- Moment de réalisation soudaine ("Il comprit soudain")

**Cadrage :** ECU (Extreme Close-Up) sur le visage, ou CU avec expression maximale.

**Composition :** Fond sombre à 80%. Lumière sur le visage. Expression extrême (yeux écarquillés, sueurs, bouche ouverte).

**FLUX keywords :**
```
extreme close-up face, wide eyes shock expression, high contrast dramatic lighting,
dark dramatic background, single light source on face, expressive manga face,
surprise revelation moment, sweat drops, intense emotional reaction,
manga webtoon style, deep shadow contrast
```

---

### 5. `revelation_system` — Panneau système / notification / statut

**Déclencheurs texte :**
- Affichage de statut ("Humain : Ye Tian / Talent : Moyen")
- Notification de jeu/système ("Duplication réussie", "Voulez-vous intégrer ?")
- Interface virtuelle visible dans la fiction

**Cadrage :** Panel centré, fond sombre. UI box avec bordure lumineuse.

**Composition :** Interface flottante au centre. Icône + texte structuré. Personnage visible en arrière-plan flou ou absent.

**FLUX keywords :**
```
dark background near black, glowing UI notification panel, system interface box,
centered text layout, glowing border effect, game HUD aesthetic,
manhwa system panel, semi-transparent panel overlay,
cool blue or purple glow, webtoon system notification style
```

---

### 6. `action_movement` — Déplacement rapide, charge, fuite

**Déclencheurs texte :**
- "se précipita", "bondit", "traversa en courant", "s'élança"
- Mouvement de grande amplitude dans l'espace
- Vitesse impliquée sans impact direct

**Cadrage :** MS (Medium Shot) à LS. Dutch angle (caméra inclinée 15-25°).

**Composition :** Speed lines horizontales sur tout le background. Corps en mouvement avec léger flou de mouvement. Composition diagonale.

**FLUX keywords :**
```
medium shot, dutch angle tilt, horizontal speed lines across background,
motion blur on moving figure, dynamic diagonal composition,
sense of velocity and momentum, kinetic energy, dust particles,
manga webtoon action style, directional movement lines
```

---

### 7. `action_impact` — Coup, explosion, impact direct

**Déclencheurs texte :**
- "Boom!", "fracas", "l'impact", frappa, explosa, brisa
- Collision directe entre deux forces
- Moment précis du contact

**Cadrage :** ECU sur le point de contact (poing, lame, zone d'impact). Low angle dramatique.

**Composition :** Speed lines RADIALES depuis le point d'impact. Flash/burst lumineux à l'impact. Énergie ou débris projetés vers l'extérieur du cadre.

**FLUX keywords :**
```
extreme close-up impact point, low angle dramatic shot, radial speed lines,
impact burst explosion effect, energy glow at contact point,
motion blur on striking limb, debris and particles,
high contrast flash lighting, dynamic power composition,
manga webtoon action impact, kinetic energy explosion,
shockwave effect, intense dramatic angle
```

**Note Solo Leveling :** L'ECU sur la main/lame précède souvent un plan plus large montrant le résultat.

---

### 8. `tension_confrontation` — Face-à-face, menace, standoff

**Déclencheurs texte :**
- Deux personnages en opposition directe, regard fixé
- Menace explicite ou implicite ("...dit-il en s'avançant", "leurs regards se croisèrent")
- Silence lourd avant le combat

**Cadrage :** Low angle sur le personnage dominant. CU sur les yeux. Counter-shot sur la réaction adverse.

**Composition :** Personnage menaçant occupe 60%+ du cadre. Background sombre. Souvent yeux lumineux ou aura d'énergie subtile.

**FLUX keywords :**
```
low angle shot looking up, menacing dominant character,
high contrast shadows, intense glowing eyes,
dark atmospheric background, power imbalance in composition,
confrontation tension, two figures opposing forces,
manga webtoon confrontation scene, foreboding atmosphere
```

---

### 9. `action_melee` — Combat de groupe, mêlée générale

**Déclencheurs texte :**
- Plusieurs combattants simultanément
- "La bataille faisait rage", "les guerriers combattaient"
- Chaos, multiple adversaires

**Cadrage :** MS à LS large. Vue d'ensemble. Personnage principal observable mais pas en ECU.

**Composition :** Composition diagonale. Personnages à différents plans de profondeur. Onomatopées visuelles intégrées. Débris, poussière, énergie partout.

**FLUX keywords :**
```
wide battle scene, multiple fighters in frame, diagonal dynamic composition,
dust and debris particles, overlapping figures at different depths,
manga battle chaos, energy effects multiple sources,
motion in every element, wide action shot, battlefield atmosphere,
sound effect visual elements, intense combat scene
```

---

### 10. `power_display` — Révélation de pouvoir, power-up, aura

**Déclencheurs texte :**
- Activation d'une capacité ("Il libéra son pouvoir", "une aura l'enveloppa")
- Transformation ou montée en puissance
- Moment de dépassement de ses limites

**Cadrage :** LS sur le personnage entier pour montrer l'aura. Ou CU sur les yeux s'illuminant.

**Composition :** Personnage au centre, lumière émanant de lui vers l'extérieur. Background sombre ou détruit autour. Effets de particules/énergie.

**FLUX keywords :**
```
full body power aura, energy emanating from character,
dark background void, dramatic internal lighting,
power radiating outward, energy particles surrounding figure,
isolated figure dominates frame, awe-inspiring power composition,
glowing eyes, manga power-up scene, atmospheric energy effects
```

---

## RÈGLES DE SÉQUENÇAGE (ordre des panels dans une scène)

### Règle du Zoom-In progressif (action)
```
Panel 1 : LS établit le contexte (qui, où)
Panel 2 : MS montre le mouvement
Panel 3 : ECU sur l'impact
Panel 4 : LS montrant le résultat
```

### Règle du Choc (révélation)
```
Panel 1 : neutral MCU personnage, expression normale
Panel 2 : ECU yeux, expression qui change
Panel 3 : Ce qu'il voit (subjective/POV)
Panel 4 : ECU visage, réaction complète
```

### Règle Dialogue alternant (2 personnages)
```
Panel 1 : OTS A → B (on voit B de face)
Panel 2 : MCU B seul (réplique B)
Panel 3 : OTS B → A (on voit A de face)
→ Jamais deux fois le même angle consécutif
```

### Règle de l'Ellipse temporelle
```
Saut de temps → 1 panel establishing seul (lieu ou ciel ou objet symbolique)
→ Suivi du resumé narratif si nécessaire
```

---

## ADAPTATION LN → WEBTOON (leçons extraites "Your Talent is Mine")

| Type de passage LN | Panel webtoon recommandé |
|---|---|
| Monologue intérieur long | 1-2 panels internal_monologue + text box (pas bulle) |
| Description d'une foule/rue | 1 panel establishing (LS) |
| Affichage de talent/statut | 1 panel revelation_system (dark bg, UI box) |
| Dialogue entre 2 personnes | 2-3 panels dialogue alternants |
| Coup/impact physique | Séquence 2-3 panels : action_movement → action_impact → réaction |
| Révélation d'information clé | reaction_revelation ECU visage |
| Ellipse temporelle ("Un mois plus tard") | 1 panel establishing + caption box |
| Combat avec plusieurs ennemis | 1-2 panels action_melee |
| Activation d'un talent/pouvoir | 1 panel power_display |

---

## MAPPING SHOT TYPE → TERME FLUX

| Nom | Terme FLUX |
|---|---|
| ECU | `extreme close-up, ultra close detail` |
| CU | `close-up shot, face from shoulders up` |
| MCU | `medium close-up, bust shot` |
| MS | `medium shot, waist up` |
| MLS | `medium long shot, three-quarter body` |
| LS | `long shot, full body visible` |
| ELS | `wide shot, extreme long shot, full environment` |
| Low angle | `low angle shot, worm eye view, looking upward` |
| High angle | `high angle shot, bird eye view, looking down` |
| Dutch angle | `dutch angle, tilted camera 20 degrees` |
| POV | `first person POV, subjective camera` |
| OTS | `over the shoulder shot, two-shot dialogue` |

---

## EFFETS VISUELS — VOCABULAIRE FLUX

| Effet | Quand | FLUX keywords |
|---|---|---|
| Speed lines radiales | action_impact | `radial speed lines, burst lines from center` |
| Speed lines horizontales | action_movement | `horizontal motion lines, directional speed lines` |
| Impact burst | action_impact | `impact explosion burst, shockwave flash, contact flash` |
| Energy glow | action_impact, power_display | `energy glow, power aura, glowing light effect` |
| Motion blur | action_movement, action_impact | `motion blur, streaked figure, velocity blur` |
| Particles/débris | action_impact, action_melee | `debris particles, dust cloud, shattered fragments` |
| Deep shadow | reaction_revelation, tension | `deep shadow, 80% dark background, dramatic contrast` |
| Inner glow | power_display, eyes | `internal glow, lit from within, glowing eyes` |
| Screen tone | internal_monologue | `halftone background, screen tone pattern, manga texture` |
| Sweat drops | reaction_revelation | `sweat drop, tension indicator, manga sweat` |
| Onomatopée visuelle | action_melee, action_impact | NE PAS générer de texte — décrire l'effet visuel équivalent |

**RÈGLE ABSOLUE :** Ne jamais demander à FLUX de générer du texte dans l'image.
Remplacer onomatopées par leur équivalent visuel (ex: "BOOM" → "explosion burst shockwave effect").

---

## ERREURS À ÉVITER (anti-patterns observés)

| Erreur | Correction |
|---|---|
| Plan moyen neutre pour chaque case | Varier systématiquement selon le type de scène |
| Même cadrage 3 panels d'affilée | Appliquer la règle du zoom-in ou d'alternance |
| Action sans effets (speed lines, impact) | Toujours ajouter les FLUX keywords d'effet correspondants |
| Dialogue en plan large | MCU ou OTS obligatoire pour le dialogue |
| Révélation sans ECU visage | La révélation nécessite un ECU réaction |
| Monologue intérieur en plan large | CU visage + abstract background |
| Establishing avec personnage visible en gros plan | ELS/LS uniquement, personnages minuscules si présents |

---

*Source : analyse de Solo Leveling c01-c82 + "Your Talent is Mine" LN ch.1-4*
*Créé le 2026-05-28. Injecter dans DETECT_BLOCKS_SYSTEM_PROMPT.*
