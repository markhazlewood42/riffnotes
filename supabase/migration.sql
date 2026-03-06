-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Songs table
create table songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default '',
  document jsonb,
  annotations jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookups by user
create index songs_user_id_idx on songs(user_id);

-- Row Level Security
alter table songs enable row level security;

create policy "Users can view their own songs"
  on songs for select using (auth.uid() = user_id);

create policy "Users can create their own songs"
  on songs for insert with check (auth.uid() = user_id);

create policy "Users can update their own songs"
  on songs for update using (auth.uid() = user_id);

create policy "Users can delete their own songs"
  on songs for delete using (auth.uid() = user_id);

-- Auto-update updated_at on every row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger songs_updated_at
  before update on songs
  for each row
  execute function update_updated_at();
