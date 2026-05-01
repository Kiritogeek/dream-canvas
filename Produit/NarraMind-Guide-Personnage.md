# NarraMind — Personnage **Ariane** & identité visuelle

> **Document créatif / produit** — aligné sur `NarraMind.md` §7. En **interface**, l’assistance mémoire / continuité (moteur interne **NarraMind**) est présentée sous le nom **Ariane**. Le nom technique **NarraMind** et les préfixes `narramind_*` restent **code, docs techniques, métriques**.

---

## 1. Décision produit — **Ariane**

| Élément | Choix |
|---------|--------|
| **Nom interface (assistance)** | **Ariane** — système d’aide à la **cohérence du récit** (résumés, entités, alertes de continuité une fois persistées). |
| **Nom interface (onboarding)** | **Ariane** — **même personnage** que pour l’assistance : fil conducteur pour découvrir DreamWeave (parcours, onglets, première création). |
| **Code / API / BDD** | `NarraMind`, `narramind-update`, `narramind_*`, `triggerNarraMindUpdate`, etc. — **inchangés**. |
| **Ton** | **Vouvoiement** partout. |
| **Lien symbolique** | **Fil d’Ariane** — guide dans le labyrinthe du récit ; cohérent avec une bulle qui **orient** vers un passage ou une étape produit. |

**Ce qu’est Ariane** : une présence **d’atelier** — calme, précise, jamais culpabilisante. En contexte **alerte**, elle parle **histoire** (cf. prompts EF). En contexte **onboarding**, elle parle **parcours produit**, sans jargon technique.

**Ce qu’elle n’est pas** : étiquette « assistant IA », coach style générique, correctrice grammaticale, ou mascotte qui **nomme** NarraMind / les tables / les tokens.

---

## 2. Deux contextes d’affichage (même identité)

| Contexte | Rôle d’Ariane | Exemple de microcopy |
|----------|---------------|----------------------|
| **Onboarding site** | Accueillir, **étapes clés** (projet, style, scénario, édition), rassurer. | *« Bienvenue sur DreamWeave. Ariane vous guide pour créer votre premier projet et poser les bases de votre univers. »* |
| **Assistance scénario / continuité** (jalon futur) | Signaler des **écarts de continuité**, proposer d’**aller au passage**. | *« Ariane vous signale une incohérence possible sur le lieu : … Souhaitez-vous relire ce passage ? »* |

**Identité visuelle** : **même pictogramme** (fil + boucle + point central) et **même typo** (Quicksand pour le nom **Ariane** en signature) dans les deux contextes ; seuls le **fond de bulle** et la **densité du texte** peuvent varier (onboarding plus aéré, alertes plus factuelles).

---

## 3. Silhouette & signal graphique

- **Lecture immédiate** : *« le **fil** du récit tenu par une présence discrète »* — trait continu (encre / ligne), **boucle ouverte**, **point lumineux** lavande–pêche au centre.
- **Alerte** : pulse **très léger** sur le point ; hint de scroll possible vers la zone concernée.
- **Onboarding** : même silhouette ; ton **invitant** (couleurs déjà présentes dans le guide, sans surcharge `text-gradient` permanente).

Détail optionnel graphique : petit motif **fil / nœud** rappelant le mythe, sans illustration figurative lourde au MVP.

---

## 4. Titres & emplacements UI (recommandations)

| Zone | Titre ou signature |
|------|---------------------|
| Panneau continuité / alertes | **Continuité du récit** ou **Points d’attention** — sous-titre ou légende : *Ariane* ou *Ariane vous signale…* |
| Bulles onboarding | Signature **Ariane** ou *« Ariane »* en Quicksand sous l’avatar. |
| Tooltip / aide | *« Ariane sur le fil de votre histoire »* (variante courte à valider en revue UX). |

**Interdit dans les textes utilisateur** : *asset, entité, JSON, prompt, token, NarraMind, database* (comme aujourd’hui pour les anomalies).

---

## 5. Identité visuelle « système » (tokens)

- **Contour** : `--lavender` ; `text-gradient` **ponctuel** uniquement.
- **Cœur du pictogramme** : `--peach` / `--peach-deep`.
- **État résolu / étape onboarding validée** : `--mint` en accent discret.
- **Conteneurs** : `.glass` sur `.bg-content`.

**Accessibilité** : états pas **que** par couleur ; libellés *À relire*, *Étape suivante*, etc.

---

## 6. Cohérence avec `NarraMind.md`

- Guide d’alertes : **uniquement** si anomalie active pertinente (quand la persistance sera en place).
- **Onboarding** : Ariane peut apparaître **dès la première visite** (pas lié aux anomalies).
- Contenu des alertes : langage **auteur** (EF).

---

## 7. Implémentation (pistes)

- Centraliser le libellé affiché dans une constante front (ex. `ARIANE_DISPLAY_NAME = "Ariane"`) pour éviter les divergences onboarding / scénario.
- Même composant **bulle + avatar** réutilisable avec un prop `variant: "onboarding" | "continuity"`.

---

## Annexe — Alternatives non retenues (A–H)

Référence historique : **La Scripte**, **La Trame**, **Le Repère**, **La Continuité**, **La Séquence**, **La Rémanence**, **Le Dramaturge** — voir versions archivées du dépôt si besoin. **Choix final : Ariane.**

---

*Dernière mise à jour : 30 avril 2026 — **Ariane** retenue : assistance NarraMind + onboarding, vouvoiement.*
