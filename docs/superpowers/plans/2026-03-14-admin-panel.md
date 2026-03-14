# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight admin panel at `/admin` showing user signups and song usage stats.

**Architecture:** New `profiles` table with `is_admin` flag, admin-scoped RLS policies on `profiles` and `songs`, profile fetch in AuthContext, AdminRoute guard, and a single AdminPage with stat cards and a users table.

**Tech Stack:** Supabase (PostgreSQL, RLS, triggers), React 19, React Router v6, HeroUI v3 beta, Lucide React icons.

**Spec:** `docs/superpowers/specs/2026-03-14-admin-panel-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/add_profiles_and_admin.sql` | Create | Migration: profiles table, trigger, is_admin function, RLS policies |
| `supabase/backfill_profiles.sql` | Create | One-off: backfill existing users, set admin |
| `src/context/AuthContext.jsx` | Modify | Fetch profile on login, expose `isAdmin` |
| `src/components/AdminRoute.jsx` | Create | Route guard checking `isAdmin` |
| `src/pages/AdminPage.jsx` | Create | Admin dashboard UI |
| `src/pages/AdminPage.css` | Create | Admin page styles |
| `src/App.jsx` | Modify | Add `/admin` route |
| `src/components/GlobalToolbar.jsx` | Modify | Add admin link for admins |

---

## Chunk 1: Database Migration & Backfill

### Task 1: Create migration SQL

**Files:**
- Create: `supabase/add_profiles_and_admin.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Step 1: Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Trigger function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- Step 3: Helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = uid AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Step 4: RLS policies on profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (is_admin(auth.uid()));

-- Step 5: Admin RLS policy on songs (existing policies unchanged)
CREATE POLICY "Admins can read all songs"
  ON songs FOR SELECT
  USING (is_admin(auth.uid()));
```

- [ ] **Step 2: Commit**

```bash
git add supabase/add_profiles_and_admin.sql
git commit -m "feat: add profiles table migration with admin RLS"
```

### Task 2: Create backfill script

**Files:**
- Create: `supabase/backfill_profiles.sql`

- [ ] **Step 1: Write the backfill file**

```sql
-- Run this AFTER the migration in Supabase SQL Editor
-- Backfills profile rows for existing users and sets admin

-- Backfill profiles for existing users
INSERT INTO profiles (id, full_name, email, avatar_url)
SELECT
  u.id,
  u.raw_user_meta_data->>'full_name',
  u.email,
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Set admin
UPDATE profiles
SET is_admin = true
WHERE email = 'markhazlewood42@gmail.com';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/backfill_profiles.sql
git commit -m "feat: add profiles backfill script with admin setup"
```

---

## Chunk 2: Auth Context & Route Guard

### Task 3: Add `isAdmin` to AuthContext

**Files:**
- Modify: `src/context/AuthContext.jsx`

- [ ] **Step 1: Add profile fetch and `isAdmin` state**

Add `isAdmin` state (default `false`). After the auth session resolves and `user` is set, fetch the profile. In the `AUTH_BYPASS` path, skip the fetch and leave `isAdmin` as `false`. On any profile fetch error, default `isAdmin` to `false`.

Here is the complete modified `AuthProvider`:

```jsx
function AuthProvider({ children }) {
  const [user, setUser] = useState(AUTH_BYPASS ? FAKE_USER : null);
  const [loading, setLoading] = useState(!AUTH_BYPASS);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (AUTH_BYPASS) return;

    const fetchAdmin = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('Failed to fetch profile:', error);
      }
      setIsAdmin(data?.is_admin ?? false);
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchAdmin(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAdmin(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ... signInWithGoogle, signOut unchanged ...

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

Key points:
- `fetchAdmin` is an async helper used by both `getSession` and `onAuthStateChange`
- In `getSession`, we `await fetchAdmin()` before `setLoading(false)` so that `AdminRoute` sees the correct `isAdmin` value on initial page load (prevents flash-redirect when navigating directly to `/admin`)
- In `onAuthStateChange`, `fetchAdmin` fires without await (sign-in/sign-out events don't need to block rendering)
- On error, `isAdmin` defaults to `false` (safe default)
- `AUTH_BYPASS` skips everything — `isAdmin` stays `false`

- [ ] **Step 2: Verify the dev server starts without errors**

Run: `npm run dev`
Expected: No errors. App loads, login works. `isAdmin` is `false` for all users until migration is run.

- [ ] **Step 3: Commit**

```bash
git add src/context/AuthContext.jsx
git commit -m "feat: fetch admin status from profiles in AuthContext"
```

### Task 4: Create AdminRoute component

**Files:**
- Create: `src/components/AdminRoute.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminRoute() {
  const { loading, isAdmin } = useAuth();

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}

export default AdminRoute;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdminRoute.jsx
git commit -m "feat: add AdminRoute guard component"
```

---

## Chunk 3: Admin Page & Routing

### Task 5: Create AdminPage with stats and user table

**Files:**
- Create: `src/pages/AdminPage.jsx`
- Create: `src/pages/AdminPage.css`

- [ ] **Step 1: Write the CSS**

Style the admin page to match the SongBrowser layout patterns (same max-width, font-family, spacing):

```css
.admin-page {
  min-height: 100vh;
  background: var(--color-bg-page);
}

.admin-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px;
  box-sizing: border-box;
  width: 100%;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.admin-title {
  font-family: var(--font-ui);
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.admin-back-link {
  font-family: var(--font-ui);
  font-size: 14px;
  color: var(--color-text-secondary);
  text-decoration: none;
}

.admin-back-link:hover {
  color: var(--color-text-primary);
}

.admin-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

.admin-stat-card {
  flex: 1;
}

.admin-stat-value {
  font-family: var(--font-ui);
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.admin-stat-label {
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.admin-loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.admin-user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  vertical-align: middle;
  margin-right: 8px;
}
```

- [ ] **Step 2: Write the AdminPage component**

```jsx
import { Card, Spinner, Table } from '@heroui/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlobalToolbar from '../components/GlobalToolbar';
import { supabase } from '../supabase';
import './AdminPage.css';

function AdminPage() {
  const [profiles, setProfiles] = useState([]);
  const [songStats, setSongStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('songs').select('user_id, updated_at'),
    ]).then(([profilesRes, songsRes]) => {
      setProfiles(profilesRes.data || []);

      // Aggregate song stats per user
      const stats = {};
      for (const song of songsRes.data || []) {
        if (!stats[song.user_id]) {
          stats[song.user_id] = { count: 0, lastActive: null };
        }
        stats[song.user_id].count++;
        const updatedAt = new Date(song.updated_at);
        if (!stats[song.user_id].lastActive || updatedAt > stats[song.user_id].lastActive) {
          stats[song.user_id].lastActive = updatedAt;
        }
      }
      setSongStats(stats);
      setLoading(false);
    });
  }, []);

  const totalSongs = Object.values(songStats).reduce((sum, s) => sum + s.count, 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="admin-page">
      <GlobalToolbar />
      <main className="admin-content">
        <div className="admin-header">
          <h2 className="admin-title">Admin</h2>
          <Link to="/" className="admin-back-link">← All songs</Link>
        </div>

        {loading ? (
          <div className="admin-loading">
            <Spinner size="lg" color="accent" />
          </div>
        ) : (
          <>
            <div className="admin-stats">
              <Card className="admin-stat-card">
                <Card.Content>
                  <div className="admin-stat-value">{profiles.length}</div>
                  <div className="admin-stat-label">Total Users</div>
                </Card.Content>
              </Card>
              <Card className="admin-stat-card">
                <Card.Content>
                  <div className="admin-stat-value">{totalSongs}</div>
                  <div className="admin-stat-label">Total Songs</div>
                </Card.Content>
              </Card>
            </div>

            <Table aria-label="Users">
              <Table.Header>
                <Table.Column>Name</Table.Column>
                <Table.Column>Email</Table.Column>
                <Table.Column>Signed Up</Table.Column>
                <Table.Column>Last Active</Table.Column>
                <Table.Column>Songs</Table.Column>
              </Table.Header>
              <Table.Body>
                {profiles.map((profile) => {
                  const stats = songStats[profile.id];
                  const lastActive = stats?.lastActive
                    ? formatDate(stats.lastActive)
                    : formatDate(profile.created_at);
                  return (
                    <Table.Row key={profile.id}>
                      <Table.Cell>
                        {profile.avatar_url && (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="admin-user-avatar"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {profile.full_name || '—'}
                      </Table.Cell>
                      <Table.Cell>{profile.email || '—'}</Table.Cell>
                      <Table.Cell>{formatDate(profile.created_at)}</Table.Cell>
                      <Table.Cell>{lastActive}</Table.Cell>
                      <Table.Cell>{stats?.count || 0}</Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminPage;
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminPage.jsx src/pages/AdminPage.css
git commit -m "feat: add AdminPage with stats cards and user table"
```

### Task 6: Add admin route to App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add imports and route**

Add imports at the top of `src/App.jsx`:

```js
import AdminRoute from './components/AdminRoute';
import AdminPage from './pages/AdminPage';
```

Then nest the admin route inside the existing `<Route element={<ProtectedRoute />}>` block, after the existing routes:

```jsx
<Route element={<ProtectedRoute />}>
  <Route path="/" element={<SongBrowser />} />
  <Route path="/songs/:id" element={<SongEditor />} />
  <Route element={<AdminRoute />}>
    <Route path="/admin" element={<AdminPage />} />
  </Route>
</Route>
```

- [ ] **Step 2: Verify dev server — navigate to `/admin`**

If not yet admin (migration not run), should redirect to `/`.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: register /admin route with AdminRoute guard"
```

### Task 7: Add admin link to GlobalToolbar

**Files:**
- Modify: `src/components/GlobalToolbar.jsx`

- [ ] **Step 1: Add conditional admin link**

Import `Link` from `react-router-dom` and `Shield` from `lucide-react` at the top of `src/components/GlobalToolbar.jsx`.

Read `isAdmin` from the existing `useAuth()` call (change `const { user, signOut } = useAuth();` to `const { user, signOut, isAdmin } = useAuth();`).

Add a small admin link in the `toolbar-right` div, before the theme toggle button:

```jsx
{isAdmin && (
  <Link to="/admin" className="toolbar-admin-link" title="Admin">
    <Shield size={16} />
  </Link>
)}
```

Add CSS for the link in `src/components/GlobalToolbar.css`:

```css
.toolbar-admin-link {
  display: flex;
  align-items: center;
  color: var(--color-text-secondary);
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}

.toolbar-admin-link:hover {
  color: var(--color-text-primary);
}
```

- [ ] **Step 2: Verify — the shield icon should NOT appear (migration not yet run)**

- [ ] **Step 3: Commit**

```bash
git add src/components/GlobalToolbar.jsx src/components/GlobalToolbar.css
git commit -m "feat: add admin link in toolbar for admin users"
```

---

## Chunk 4: Run Migration & Verify

### Task 8: Run migration and backfill in Supabase

- [ ] **Step 1: Run migration**

Open Supabase Dashboard > SQL Editor. Paste and run the contents of `supabase/add_profiles_and_admin.sql`.

- [ ] **Step 2: Run backfill**

In the same SQL Editor, paste and run `supabase/backfill_profiles.sql`.

- [ ] **Step 3: Verify in the app**

1. Log in as `markhazlewood42@gmail.com`
2. Shield icon should appear in the toolbar
3. Click it — should navigate to `/admin`
4. Admin page should show the stat cards and user table with real data
5. Log in as a different user (or use incognito) — shield icon should NOT appear, navigating to `/admin` should redirect to `/`
