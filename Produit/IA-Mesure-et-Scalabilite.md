# IA — Mesure, coûts et scalabilité

> Vue **transversale** pour DreamWeave : fournisseurs d’IA (texte + image), ce qui est **mesuré** aujourd’hui, **leviers** pour absorber une audience importante, et **pistes** de gouvernance. Complète `NarraMind.md` (mémoire narrative) et `09_Specifications_API.md` (contrats techniques).

---

## 1. Fournisseurs et rôles

| Fournisseur | Usage principal | Où (couche code) |
|-------------|-----------------|------------------|
| **Google Gemini** | Génération scénario, découpage, résumés, modes structurés JSON, **NarraMind** (`narramind-update`) | Edge Functions `generate-scenario-ai`, `narramind-update` |
| **Groq** (Llama 3.3 70B) | **Fallback** si Gemini indisponible ; certains modes historiques scénario | Mêmes fonctions (ordre d’appel défini dans le code) |
| **FAL.ai** | Images : assets (FLUX Schnell / 2 Pro / Edit), **panels par bloc** `generate-panel-image`, styles, landing | Edge Functions `generate-asset-image`, `generate-panel-image`, etc. |

**Secrets** : uniquement côté serveur (Edge Functions / env Supabase). Une ou quelques **clés API par fournisseur** = **toute** la conso des utilisateurs est **consolidée** sur ton compte fournisseur.

---

## 2. Unités de coût

| Unité | Typiquement facturée comme | DreamWeave côté produit |
|--------|---------------------------|-------------------------|
| **Tokens** (entrée + sortie) | / million de tokens (grille du modèle) | Appels Gemini / Groq par caractère ou token estimé |
| **Image** | Par requête / crédits FAL | Aligné **crédits** utilisateur (1 crédit ≈ 1 génération image) |
| **Stockage / egress** | Bucket Supabase | Hors scope IA direct, à surveiller avec le volume d’images |

Les **coûts variables** montent avec : **nombre d’appels** × **taille moyenne des prompts** × **prix unitaire**, plus **volume FAL**.

---

## 3. Mesure existante (observabilité)

| Mécanisme | Contenu utile | Limite |
|-----------|---------------|--------|
| Table **`usage`** | Comptage mensuel côté **génération image** (quota Free/Pro) | Ne détaille pas les tokens Gemini |
| Table **`narramind_metrics`** | `context_tokens`, `response_tokens`, `duration_ms`, `anomalies_detected`, `chapters_in_context`, etc. | Par run NarraMind, pas un tableau de bord « coût € » |
| Logging / dashboards **fournisseurs** | Quotas, 429, facturation | Source de vérité pour la **€ réelle** |
| **`canGenerate()`** + UI plans | Empêche les appels FAL au-delà du quota | Ne throttle pas le texte seul |

**Écart typique** : pas de **journal central « tokens par user_id / par jour »** pour Gemini — à ajouter si tu veux facturer ou limiter finement l’IA texte.

---

## 4. Leviers pour tenir la charge (N utilisateurs)

1. **Produit** : quotas **différenciés** Free vs Pro sur **NarraMind**, **IA scénario**, **FAL** ; features « gourmandes » réservées au Pro.
2. **Throttles** (ex. NarraMind : intervalle minimum entre appels, seuil de mots) — déjà en place côté éditeur ; **généraliser** le principe aux autres flux si besoin..
3. **Éviter les reruns** : ne pas rappeler l’EF si le **hash du contenu** n’a pas changé depuis le dernier run réussi.
4. **Contexte borné** : fenêtres de résumés (NarraMind), pas d’injection du roman entier dans chaque prompt.
5. **Fallback** : Groq quand Gemini rate-limite — disponibilité, pas nécessairement moindre coût.
6. **Alertes** : budgets et seuils sur les consoles Google AI / FAL avant saturation.

---

## 5. Évolutions recommandées (roadmap technique produit)

| Priorité | Évolution |
|----------|-----------|
| P1 | **Dashboard interne** ou export : agréger `usage` + `narramind_metrics` + volume d’appels par EF (même sans € exact). |
| P2 | **Quota texte** (soft/hard) par plan, aligné sur la grille tarifaire. |
| P3 | **Estimation coût** : mapper tokens → € avec une grille configurable (hors code, admin ou table de config). |

---

## 6. Liens utiles

- `NarraMind.md` — mémoire narrative, déclenchement, budgets contexte.
- `09_Specifications_API.md` — endpoints Edge, FAL.
- `05_Business_Model_Canvas.md` — crédits, tiers.
- `CLAUDE.md` (repo) — stack et règles d’appel (`refreshSession`, etc.).

---

*Dernière mise à jour : 30 avril 2026 — création document ; fusion doc Produit.*
