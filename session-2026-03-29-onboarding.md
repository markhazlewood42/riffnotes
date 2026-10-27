---
type: project-doc
title: RiffNotes — Onboarding Session Notes
project: riffnotes
created: 2026-03-29
updated: 2026-08-26
tags: [session-notes, onboarding]
memory: [project-riffnotes-onboarding]
---

# Session Handoff: RiffNotes Onboarding Improvement

**Date:** 2026-03-29
**Status:** Brainstorming phase, early — context gathered, first question not yet asked
**Plan file:** `C:\Users\markh\.claude\plans\radiant-beaming-iverson.md` (not yet written)

---

## Goal

Improve the new user onboarding experience for RiffNotes. Current onboarding is a single locked example song with instructional annotations — it tells but doesn't show. Mark wants an interactive onboarding that demonstrates features (e.g., shepherd tour, beacons, or another approach).

## What Was Completed

### 1. Tool/Library Research

**Best library candidate: React Joyride**
- MIT license, native pulsing beacon support, interactive steps, v3.0.0 just released
- React-native, works well with dynamic content
- 635k weekly npm downloads, very active maintenance

**Runner-up: Driver.js**
- Only 5KB gzipped, MIT license, TypeScript
- Good but less React-specific, no native beacons
- Last release Nov 2025

**Avoid:**
- Shepherd.js — AGPL license (needs commercial license)
- Intro.js — AGPL license
- Reactour — unmaintained (2+ years stale)

**Available MCP tools for design/build:**
- Figma MCP — visual mockups
- Playwright MCP — testing onboarding flows
- HeroUI MCP — component docs during implementation

### 2. Current Onboarding State (Full Exploration)

**How it works today:**
- Postgres trigger (`seed_example_song_trigger`) fires on new user creation in `auth.users`
- Inserts a locked example song: "Knockin' on Heaven's Door" with 15 chord annotations, 2 instructional text notes, 1 image annotation
- `is_locked: true` makes editor read-only, hides BubbleMenu/annotation tools, shows lock icon instead of save status

**New user flow:**
1. Google OAuth → Supabase creates user → trigger seeds example song
2. Redirect to SongBrowser → example song appears first (sorted `is_locked DESC`)
3. User clicks example → sees read-only song with embedded text instructions

**What's missing:**
- No welcome screen or first-run modal
- No tooltips or interactive tutorials
- No progress tracking (no localStorage flags for onboarding state)
- No guided path to creating first own song
- Example song is read-only so users can't practice the features it describes
- Only localStorage key used is `theme`

**Key files:**
| Feature | File Path |
|---------|-----------|
| Example song trigger & SQL | `supabase/add_is_locked_and_example_song.sql` |
| Backfill script | `supabase/backfill.sql` |
| Song browser | `src/pages/SongBrowser.jsx` |
| Song editor | `src/pages/SongEditor.jsx` |
| Lyric editor (read-only) | `src/editor/LyricEditor.jsx` |
| Annotation rendering | `src/editor/nodeviews/AnnotatedLineView.jsx` |
| Auth context | `src/context/AuthContext.jsx` |
| Login page | `src/pages/LoginPage.jsx` |
| Protected route | `src/components/ProtectedRoute.jsx` |
| Global toolbar | `src/components/GlobalToolbar.jsx` |
| Lyric sheet context (locked state) | `src/context/LyricSheetContext.jsx` |

## What's Next

The brainstorming skill was invoked and tasks created. The next agent should:

1. **Resume brainstorming** — pick up from task #2 (visual companion was accepted but server didn't finish starting; may need restart)
2. **Ask clarifying questions one at a time**, starting with the first key question:
   - Should the onboarding happen in the SongBrowser, inside a song editor, or both?
   - Should the example song be interactive (editable sandbox) or remain locked?
   - What's the target audience sophistication? (Musicians who get it fast vs. general users)
   - How much onboarding is acceptable before it feels like friction?
3. **Propose 2-3 approaches** with trade-offs (e.g., guided tour vs. progressive disclosure vs. interactive sandbox)
4. **Present design** for approval, then write spec to `docs/superpowers/specs/`
5. **Invoke writing-plans skill** to create implementation plan

## Brainstorming Tasks (from task tracker)

1. ~~Explore project context~~ (completed)
2. ~~Offer visual companion~~ (completed — user accepted)
3. Ask clarifying questions (next)
4. Propose 2-3 approaches
5. Present design
6. Write design doc
7. Spec self-review
8. User reviews written spec
9. Transition to implementation
