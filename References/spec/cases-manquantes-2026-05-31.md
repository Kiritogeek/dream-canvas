# Cases manquantes pour la composition de chapitres — 2026-05-31

> Analyse demandée par Louis : quels types de cases / compositions ajouter dans l'Édition.
> Source : inventaire code réel + lecture de ~10 pages webtoon (YTIM ch1, Solo Leveling c01/c05).
> Statut : ANALYSE SEULE — aucune implémentation (décision de Louis le 2026-05-31).

## Inventaire de l'existant (base déjà riche)

| Brique | Inventaire |
|--------|-----------|
| Compositions (`compose-layout`) | 16 layouts A→P |
| Types de scène (`detect_blocks`) | 13 : establishing, dialogue, internal_monologue, reaction_revelation, revelation_system, action_movement, action_impact, tension_confrontation, action_melee, power_display, isolation_vulnerability, text_echo_psychological, memory_flashback |
| Kinds de blocs canvas | 3 : image, couleur (uni/dégradé), bulle |
| Formes de bloc image (`PanelBlockShape`) | 9 : rect, diagonal-r/l, taper-r/l, angle-tr/br/tl/bl |
| Types de bulles (`SpeechBubbleType`) | 13 : speech, thought, cloud (pensée), shout (cri), whisper (chuchotement), narration, radio, text, electronic, explosion, wavy, anger, sadness |

**Correction** : les bulles « manquantes » du `[[Webtoon-Research]]` (Pensée/Cri/Chuchotement) sont **déjà implémentées** (cloud/shout/whisper). Les formes de cases diagonales façon Solo Leveling aussi.

## Les vrais manques

### 🔴 Famille 1 — Nouveaux TYPES DE CASE (zone canvas PROTÉGÉE — accord Louis requis)

| Case | Preuve | État actuel | Spec cible |
|------|--------|-------------|-----------|
| **Bloc Notification Système** | révélation de talent YTIM ("Humain: Ye Yu / Talent: …") ; tout Solo Leveling (genre hunter/système dominant) | `revelation_system` existe mais **rendu en image FLUX → texte illisible** | 4e kind de bloc : boîte UI, fond sombre near-black, bordure lumineuse cyan/violet, **texte net éditable** (pas IA), police monospace/impact. Modèle = système de bulles mais pour statut/notification |
| **Bloc SFX** | SL c01 p006 (onomatopées rouges stylisées sur noir) | aucun home : règle « pas de texte dans l'image » + ce n'est pas une bulle | bloc texte : rotation libre, polices impact (Rock Salt, Black Ops One, Luckiest Guy), fond transparent, pas de conteneur bulle |

### 🟠 Famille 2 — Nouvelles COMPOSITIONS (compose-layout — hors zone protégée)

| Compo | Usage | Pourquoi A-P ne couvre pas | Dimensions cibles |
|-------|-------|----------------------------|-------------------|
| **Q — Bande cinématique (letterbox)** | yeux seuls, ligne d'horizon, pause dramatique | `A` est full-width mais HAUT (splash) ; aucune bande fine. Grammaire liste "letterbox crop" | 800 × ~150-220 px |
| **R — Panorama vertical** | chute, tour/monstre géant, attaque verticale longue, scale épique | `A`/`N` plafonnent en hauteur | 800 × 1800-2400 px |

P2 discutable : **diptyque simultané** côte-à-côte (action↔réaction au même instant) — `D`/`M` couvrent partiellement.

## Priorité recommandée si on implémente plus tard
1. Bloc Notification Système (plus haut impact, actuellement cassé) — zone protégée.
2. Compos Q + R (gain réel, sans toucher la zone protégée).
3. Bloc SFX — zone protégée.

## Mapping scene_type → composition (rappel, depuis le fix 2026-05-30)
Les 13 scene_types ont déjà un mapping de composition dans `tagBlock()`. `revelation_system → A/G` resterait un pis-aller tant que le **Bloc Système** n'existe pas (un système devrait cibler le nouveau bloc, pas une image).
