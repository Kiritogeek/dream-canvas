create table narramind_missing_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  chapter_id uuid not null references scenario_chapters(id) on delete cascade,
  chapter_number int not null,
  name text not null,
  suggested_type text,
  mention_count int not null default 1,
  status text not null default 'pending',
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint narramind_missing_assets_project_chapter_dedupe_unique
    unique (project_id, chapter_id, dedupe_key)
);

alter table narramind_missing_assets enable row level security;

create policy "narramind_missing_assets_own"
  on narramind_missing_assets for all
  using (auth.uid() = user_id);

create index narramind_missing_assets_project_status_idx
  on narramind_missing_assets (project_id, status);
