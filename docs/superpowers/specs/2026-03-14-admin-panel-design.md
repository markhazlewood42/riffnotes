# Admin Panel Design

## Overview

Add a lightweight admin panel at `/admin` that shows user signups and usage stats. Scoped to the minimum needed for alpha-stage visibility: a user list with activity data and summary counts.

## Database

### New `profiles` table

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
```

Columns `full_name`, `email`, and `avatar_url` are copied from `auth.users.raw_user_meta_data` at signup time. This is necessary because `auth.users` lives in the `auth` schema and is not queryable from the client SDK.

### Auto-create trigger

Fires AFTER INSERT on `auth.users`. Creates a profile row and copies Google OAuth metadata.

```sql
create or replace function handle_new_user_profile()
returns trigger as $$
begin
  insert into profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function handle_new_user_profile();
```

### `is_admin` helper function

```sql
create or replace function is_admin(uid uuid)
returns boolean as $$
  select exists (
    select 1 from profiles where id = uid and is_admin = true
  );
$$ language sql security definer stable set search_path = public;
```

### RLS policies

**On `profiles`:**

```sql
-- All authenticated users can read their own profile
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

-- Admins can read all profiles
create policy "Admins can read all profiles"
  on profiles for select
  using (is_admin(auth.uid()));
```

No INSERT/UPDATE/DELETE policies — profile rows are created by the trigger, and `is_admin` is only changed via direct SQL/migrations.

**On `songs` (new policy, existing policies unchanged):**

```sql
-- Admins can read all songs
create policy "Admins can read all songs"
  on songs for select
  using (is_admin(auth.uid()));
```

### Backfill

One-off SQL to run after migration:

1. Insert profile rows for all existing `auth.users` who don't have one yet
2. Set `is_admin = true` for `markhazlewood42@gmail.com`

```sql
-- Backfill profiles for existing users
insert into profiles (id, full_name, email, avatar_url)
select
  u.id,
  u.raw_user_meta_data->>'full_name',
  u.email,
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Set admin
update profiles
set is_admin = true
where email = 'markhazlewood42@gmail.com';
```

## Auth & Context Layer

### AuthContext changes

After Supabase auth session is established, fetch the user's profile row:

```js
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single();
```

Expose `isAdmin` (boolean, default `false`) in the auth context alongside the existing `user` and `loading` values. When `AUTH_BYPASS` is active, default `isAdmin` to `false` (no profile fetch needed — mirrors how the fake user skips Supabase). On any profile fetch error, default `isAdmin` to `false`.

### AdminRoute component

New component at `src/components/AdminRoute.jsx`:

- Reads `isAdmin` and `loading` from `useAuth()`
- If still loading, returns `null` (avoids redirect flash while profile fetch completes)
- If `isAdmin` is true, renders `<Outlet />`
- If `isAdmin` is false, redirects to `/`
- Pattern mirrors the existing `ProtectedRoute`

### Route registration

In `App.jsx`, nest `/admin` under both `ProtectedRoute` and `AdminRoute`:

```jsx
<Route element={<ProtectedRoute />}>
  {/* existing routes */}
  <Route element={<AdminRoute />}>
    <Route path="/admin" element={<AdminPage />} />
  </Route>
</Route>
```

## Admin Page UI

### File

`src/pages/AdminPage.jsx`

### Layout

- `GlobalToolbar` (same as all other pages)
- Document-actions bar with back link ("← All songs")
- Content area centered, similar width to song browser

### Content

**Summary stats row** — two HeroUI `Card` components:
- Total users (count of profiles)
- Total songs (count of songs)

**Users table** — HeroUI `Table` component:

| Column | Source |
|--------|--------|
| Name | `profiles.full_name` |
| Email | `profiles.email` |
| Signup Date | `profiles.created_at` (formatted) |
| Last Active | `MAX(songs.updated_at)` per user, or signup date if no songs |
| Song Count | `COUNT(songs.id)` per user |

- Sorted by signup date descending (newest first)
- No pagination (alpha-scale user count)
- Read-only — no edit/delete actions

### Data fetching

Two queries on page load:

1. **All profiles:** `supabase.from('profiles').select('*')`
2. **Song stats per user:** `supabase.from('songs').select('user_id, updated_at')` — aggregate client-side to get count and max `updated_at` per `user_id`

Total songs is derived by summing the per-user counts.

Both queries rely on the "Admins can read all" RLS policies — without them, a non-admin would only see their own data. Client-side aggregation is intentional for alpha simplicity; a server-side view or RPC can replace it if data volume grows.

### Navigation

- Admin link in `GlobalToolbar` (visible only when `isAdmin` is true) — small link or icon, not prominent

## What's NOT included

- No charting or graphs (charting library available for future use)
- No user edit/delete actions
- No activity logging or event tracking
- No sub-routes or tabbed navigation within admin
- No pagination
- No admin write operations through the client (admin flag managed via SQL only)

## Files to create or modify

| File | Action |
|------|--------|
| `supabase/add_profiles_and_admin.sql` | Create — migration SQL |
| `supabase/backfill_profiles.sql` | Create — backfill script |
| `src/context/AuthContext.jsx` | Modify — fetch profile, expose `isAdmin` |
| `src/components/AdminRoute.jsx` | Create — admin route guard |
| `src/pages/AdminPage.jsx` | Create — admin dashboard page |
| `src/App.jsx` | Modify — add admin route |
| `src/components/GlobalToolbar.jsx` | Modify — add admin link (conditional) |
