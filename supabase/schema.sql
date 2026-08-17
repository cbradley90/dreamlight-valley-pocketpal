-- Dreamlight Valley PocketPal — cloud sync schema.
--
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- after creating the project. It relies entirely on Supabase Auth's built-in
-- auth.users table — there's no separate signup/profile table.
--
-- One row per player, keyed by their auth user id. Row Level Security is the
-- only thing that protects this data: the anon key shipped to the browser is
-- public by design, so every policy below is load-bearing.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  owned      jsonb not null default '[]'::jsonb,
  done       jsonb not null default '{}'::jsonb,
  custom     jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "select own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "insert own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "update own progress"
  on public.progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own progress"
  on public.progress for delete
  using (auth.uid() = user_id);

-- Keep updated_at honest without relying on the client to set it.
create or replace function public.set_progress_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists progress_set_updated_at on public.progress;
create trigger progress_set_updated_at
  before update on public.progress
  for each row
  execute function public.set_progress_updated_at();
