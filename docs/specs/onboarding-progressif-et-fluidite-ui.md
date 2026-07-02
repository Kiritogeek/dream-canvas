# Spec — Onboarding progressif par actions + chantier fluidité UI

> Vision consignée le 2026-07-02 (Louis). Statut : **à affiner après la session de test A→Z du 02/07 au soir**. Rien n'est implémenté.

---

## Vision de Louis (verbatim reformulé)

**UX / Onboarding** — l'objectif : que l'utilisateur comprenne chaque onglet et ce qu'il peut y faire, en **faisant** plutôt qu'en lisant.
- L'onboarding reste **uniquement sur le 1er projet** (conserver l'existant).
- Progression **par actions débloquantes** : l'utilisateur doit accomplir le parcours réel pour débloquer la suite. Exemple du parcours cible :
  1. Faire tout le process d'un scénario → **valider le texte**
  2. **Valider les assets**
  3. **Valider le chapitre**
  4. → **Déblocage de l'Édition**
- Bénéfice : l'utilisateur effectue un maximum de tâches réelles dès le début et comprend tout le fonctionnement rapidement, **sans allers-retours** entre les sections.

**UI / Fluidité** — animations fluides + meilleure visualisation sur tout le site.
> « Point hyper important pour la rétention : si un utilisateur aime la manière dont les choses sont designées, il voudra rester plus longtemps. »

---

## Existant sur lequel s'appuyer (état au 02/07)

- `useProgressiveMenuGate` : gating progressif des onglets déjà en place dans ProjectDetail — la mécanique de déblocage existe, il faut la brancher sur des **actions validées** plutôt que sur la simple présence de données.
- Onboarding Ariane : localStorage/sessionStorage + CustomEvents window, logique éclatée dans ProjectDetail (~10 useEffect) — l'audit du 02/07 recommande déjà de la centraliser dans un hook `useArianeOnboarding`. Ce chantier est le bon moment.
- Contraintes : ADN du menu Univers (2 piliers), zone canvas freezée (toute anim sur les couches canvas = accord Louis), règles anti-slop (`transform`/`opacity` uniquement, pas d'em-dash, `.glass`).

## Propositions UX (à discuter avec Louis avant d'implémenter)

1. **Checklist de progression visible** (style quest log) : Style → Assets → Scénario → Chapitre → Édition, chaque étape avec état fait/à faire et cliquable vers le bon endroit. Persistée en **BDD** (colonne JSONB sur `projects`), pas en localStorage — survit au changement de device.
2. **Déblocage visuel** : onglet verrouillé = cadenas + tooltip « Terminez [action] pour débloquer » ; micro-célébration animée au déblocage d'une étape.
3. **Définir « valider » pour chaque étape** (décision produit à trancher) : texte validé = 1er chapitre scénario sauvegardé ? assets validés = N assets générés ? chapitre validé = découpage en cases accepté ?
4. **Empty states pédagogiques** : chaque onglet vide explique en 1 phrase ce qu'on y fait + 1 CTA vers l'action débloquante.
5. **Sortie de secours** : bouton « Passer l'onboarding » pour les power users — le gating ne s'applique qu'au 1er projet, mais même là, ne jamais bloquer quelqu'un qui sait ce qu'il fait.

## Propositions UI fluidité (à discuter)

1. Transitions d'onglets animées (Framer Motion layout animations — `transform`/`opacity` uniquement).
2. Skeletons systématiques sur les fetchs (LoreGraphView déjà identifié par les audits).
3. Micro-interactions sur les actions clés : génération lancée, asset créé, étape d'onboarding validée.
4. Perf perçue (déjà identifié par les audits, jamais appliqué) : réduire les Google Fonts de 16 → 4 familles (LCP), convertir le PNG Ariane 1,24 MB en WebP (~1/3 du dist).
5. React.memo sur les items des couches canvas pour la fluidité du drag — **zone freezée, accord Louis requis**.

## Session de test A→Z (02/07 au soir)

Itération produit de bout en bout. Consigner chaque friction dans `docs/feedback/` (même format que le retour Jeremy) pour alimenter ce chantier avec du réel plutôt que du supposé.
