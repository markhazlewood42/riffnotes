---
type: status
title: RiffNotes — Project Status
project: riffnotes
created: 2026-03-01
updated: 2026-10-06
tags: [status]
memory: [project-riffnotes-mobile, project-riffnotes-onboarding]
---

# RiffNotes

Lyrics annotation app — add structured annotations to song lyrics (chords, notes, performance cues).

## Architecture

- **Stack**: React 19 + Vite, TipTap 3 editor, Supabase (auth + Postgres + Storage), Tailwind CSS v4, HeroUI v3 beta
- **Data model**: Two-layer — TipTap document for text structure, AnnotationStore for annotation data
- **Auth**: Supabase Auth with Google OAuth
- **Hosting**: Vercel (static SPA + one serverless function, `api/genius-search.js`)
- **Repo**: `projects/riffnotes/` → https://github.com/markhazlewood42/riffnotes.git

## Current Status

Alpha — released to friends for testing. **Dormant since 2026-05-26** (last merge to `main`). Reviewed 2026-10-06.

### In progress

- **Interactive onboarding** (`feature/onboarding`, last pushed 2026-03-31) — feature complete, **never merged**. No PR is open.
  - `is_example` column decouples practice song identity from `is_locked`
  - WelcomeModal on first SongBrowser visit (with "Open practice song" CTA)
  - 3-step React Joyride tour on the example song (no beacons, scroll-locked, tight spotlight targets)
  - Avatar + username in GlobalToolbar is a dropdown with "RiffNotes walkthrough" (resets both flags, reopens WelcomeModal) and "Sign out"
  - `--radius-dropdown` CSS variable applied globally to all dropdowns
  - E2E: 24 onboarding tests (Chromium + Firefox), all passing as of 2026-03-31
  - **Uncommitted in the working tree:** `src/components/OnboardingTour.jsx` — switches from the `<Joyride>` component to the `useJoyride` hook (v3 removed `disableBeacon`; the beacon is now skipped with `on(EVENTS.BEACON, c.open())`) and retargets tour step 1 from `.tiptap` (center) to `[data-line-id='line-seed-8'] .lyric-content-wrapper` (bottom). Not committed or pushed, and not re-tested since the 2026-03-31 E2E run.
  - **Branch drift (checked 2026-10-06):** 4 commits ahead of and 6 behind `origin/main`. It lacks the mobile fixes (#38), the print fix (#39), the WebKit/mobile Playwright projects, and the image-annotation min-height change.
  - **Blocker:** `supabase/add_is_example.sql` has not been run in production. Run it in the Supabase SQL Editor before the merged code reaches production, or `SongBrowser` will fail to select `is_example`.
  - **Next:** commit or discard the `OnboardingTour.jsx` change → merge `origin/main` into the branch → re-run E2E → open the PR → run the migration → merge.

### Recently shipped

- **Print scaling fix** (2026-05-26) — PR #39. `.page-break-spacer` negative margins (−48px each side) and `.page-gap` margins (−20px) made the widest print element 952px inside the 816px viewport, so browsers shrank everything about 14%. Fix: reset those margins to 0 in `@media print`.
- **Mobile cross-browser fixes** (2026-04-05) — PR #38. Fixes for autofocus/IME line breaks and SVG leader-line visibility. Adds WebKit, Pixel 7 and iPad Pro 11 Playwright projects and `e2e/mobile-smoke.spec.js`. Also: image annotation minimum height raised.
- **Set lists** (2026-03-30) — PR #35. Ordered set lists with create/rename/delete, add/remove songs, drag-to-reorder. Dropdown filter on SongBrowser.
- **Orphaned image cleanup** (2026-03-30) — PR #23. Deletes the Supabase Storage image when an image annotation is removed.
- **Text editing hardening** (2026-03-29) — PR #17. **Leader line fixes** (2026-03-28) — PR #16.
- Also on `main`: Find a Song (Genius search + LRCLIB lyrics), instrument tags, per-page styling and page breaks, annotation stacking, admin panel, light/dark theme, and Vercel analytics.

### Open GitHub issues (17, checked 2026-10-06)

- **Bugs:** #37 image-paste test fails · #19 double spaces render too wide · #18 print view renders slightly longer than the editor
- **Features:** #30 magic-link login · #28 leader-line sub-line pinning · #27 page-break-aware stacking · #25 text notes above/below images
- **Stale, likely already shipped:** #29 set lists (shipped in PR #35) — close it after Mark confirms
- **Refactors:** #24 shared annotation rail · #22 sortable admin table · #21 extract hardcoded pixel values
- **Testing:** #36 visual verification for tour flows · #20 Find a Song integration harness
- **Big ideas:** #34 notation editor · #33 unified undo/redo · #32 better analytics · #31 multi-user collaboration

## Tests

- **Unit** (Vitest): `npm run test:unit` — 6 files in `tests/`.
- **E2E** (Playwright): `npm run test:e2e` — 12 specs in `e2e/`, run against the auth-bypass server on port 3002 (`npm run test:server`). On `main` there are 5 browser projects (chromium, firefox, webkit, mobile-chrome, mobile-safari); this branch still has the older config without the WebKit and mobile projects.

## Future Plans

See the open issues above. No separate roadmap is kept.

## Notes

- Dev server: `npm run dev` (port 3000)
- Test server with auth bypass: `npm run test:server` (port 3002, `VITE_AUTH_BYPASS=true`)
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The Vercel function also needs `GENIUS_ACCESS_TOKEN`.
- 18 remote branches besides `main` are fully merged into `main` and can be deleted. Only `feature/onboarding` is unmerged.
- Docs refreshed 2026-10-06: `CLAUDE.md`, `AGENTS.md`, `README.md`, this file. Plan docs under `docs/` are historical records and were not changed.
