-- Fix : memory_entities et memory_summaries référençaient profiles(id)
-- (PK interne auto-généré) au lieu de auth.users(id) (l'ID auth réel).
-- Les inserts échouaient silencieusement sur la contrainte FK.

ALTER TABLE memory_entities
  DROP CONSTRAINT memory_entities_user_id_fkey,
  ADD CONSTRAINT memory_entities_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE memory_summaries
  DROP CONSTRAINT memory_summaries_user_id_fkey,
  ADD CONSTRAINT memory_summaries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
