# Slide 15 — NarraMind (💡 D8) · ⏱ ~45 s · *11:40*

**Sur la slide :** chiffre-héros **~50 tokens/chapitre (vs ~850)** · alerte Ariane « ce personnage est mort au ch. 12 ».

## Ce que tu dois dire
- Problème : injecter brut tous les chapitres fait exploser le contexte (**~850 tokens/chapitre**) ; à 50 chapitres, inutilisable.
- Options écartées : tout injecter (non scalable), fenêtre glissante (perd le lore ancien).
- Choix : **compression à ~50 tokens/chapitre** + **recherche vectorielle** (Gemini text-embedding-004, 768D, pgvector).
- UX : la mémoire reste **invisible**, l'auteur ne voit que les **alertes d'Ariane** (ex. un personnage mort qui réapparaît).

## Chiffres à citer + source
- ~50 tokens/chapitre vs 850 → **preuve de réflexion : mesure interne NarraMind (compression vs contexte brut)**.

## À dire (version prête)
« Dernière brique de cohérence : l'histoire elle-même. Injecter tous les chapitres en brut fait exploser le contexte, environ 850 tokens par chapitre — à cinquante chapitres, c'est ingérable. J'ai écarté la fenêtre glissante, qui oublie le lore ancien. Ma solution, NarraMind : je **compresse à une cinquantaine de tokens par chapitre** et j'ajoute une recherche vectorielle. La mémoire reste **invisible** : l'auteur ne voit que les alertes d'Ariane, par exemple "ce personnage est mort au chapitre 12". Il voit les alertes, jamais la plomberie. »

**Transition :** *« Ce produit doit aussi tenir économiquement. »*
