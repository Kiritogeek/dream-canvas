# Slide 21 — Stack : benchmark raisonné (💡 D9-D12) · ⏱ ~40 s · *16:10*

**Sur la slide :** tableau benchmark · Supabase · FAL.ai / FLUX.2 Pro · Gemini Flash + Groq fallback · React/Vite/React Query/Edge Functions · colonne « pourquoi » en avant.

## Ce que tu dois dire
- Fil conducteur : **maximiser ce qu'une seule personne peut livrer et maintenir**.
- 4 briques : **Supabase** (RLS native = multi-tenant dès J0) ; **FAL.ai / FLUX.2 Pro** (multi-référence native = le Sheet System n'existe que grâce à elle, + indemnisation copyright) ; **Gemini Flash + Groq fallback auto** sur 429 (continuité de service) ; **React + Vite + React Query + Edge Functions Deno** (zéro friction en dev solo).
- Message : dépendances **assumées et réversibles** (PostgreSQL standard exportable).

## À dire (version prête)
« Ce n'est pas qu'un concept : le prototype fonctionne, et chaque brique de la stack répond à un même fil conducteur — **maximiser ce qu'une seule personne peut livrer et maintenir**. Supabase me donne la sécurité par utilisateur dès le premier jour. FAL.ai et FLUX.2 Pro offrent la multi-référence native : sans elle, pas de Sheet System, et j'hérite en prime d'une couverture copyright. Gemini pour le texte, avec un fallback Groq automatique en cas de surcharge. Et un front React classique, sans friction. Mes dépendances sont **assumées et réversibles** : ma base reste du PostgreSQL standard, exportable. »

**Transition :** *« Un sujet que le jury attend : le droit de l'IA. »*
