# Slide 14 — Génération par bloc (💡 D7) · ⏱ ~40 s · *10:55*

**Sur la slide :** case découpée en blocs, un bloc en cours de régénération · layout `JSONB`, bloc = { id, x, y, w, h, prompt, asset_refs, image_url }.

## Ce que tu dois dire
- Une case est une **composition** de plusieurs scènes/personnages, pas une image unique.
- Choix : un layout **`JSONB`** où chaque bloc porte coordonnées, dimensions, prompt et références d'assets, et se génère **indépendamment**.
- Justifier : régénérer un seul bloc sans toucher aux autres est **indispensable à un workflow créatif itératif**.

## À dire (version prête)
« Une case n'est pas une image unique : c'est une composition de plusieurs blocs — un décor, un personnage, un gros plan. Chaque bloc porte ses coordonnées, ses dimensions, son prompt et ses références d'assets, dans un layout JSONB, et se génère **indépendamment**. Résultat : l'auteur peut régénérer un seul bloc sans refaire toute la case. C'est indispensable à un vrai workflow créatif : on itère sur un détail, pas sur l'ensemble. »

**Transition :** *« Reste la cohérence de l'histoire, pas seulement des images. »*
