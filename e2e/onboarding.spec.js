import { test, expect } from '@playwright/test';

// Fake song data returned from mocked Supabase API
const EXAMPLE_SONG = {
  id: 'a0000000-0000-0000-0000-000000000001',
  title: "Knockin' on Heaven's Door",
  updated_at: '2026-03-01T00:00:00Z',
  created_at: '2026-03-01T00:00:00Z',
  is_locked: false,
  is_example: true,
};
const REGULAR_SONG = {
  id: 'a0000000-0000-0000-0000-000000000002',
  title: 'My Song',
  updated_at: '2026-03-10T00:00:00Z',
  created_at: '2026-03-10T00:00:00Z',
  is_locked: false,
  is_example: false,
};
const EXAMPLE_SONG_FULL = {
  ...EXAMPLE_SONG,
  document: {
    type: 'doc',
    content: [
      {
        type: 'songTitle',
        attrs: { level: 1 },
        content: [{ type: 'text', text: "Knockin' on Heaven's Door" }],
      },
      {
        type: 'paragraph',
        attrs: { lineId: 'line-1' },
        content: [{ type: 'text', text: 'Mama, take this badge off of me' }],
      },
    ],
  },
  annotations: {},
  instruments: ['Guitar'],
};

// Intercept Supabase REST requests using regex patterns (unambiguous, avoids glob edge cases).
async function mockSupabase(page, songs = [EXAMPLE_SONG, REGULAR_SONG]) {
  await page.route(/\/rest\/v1\/songs/, (route) => {
    const url = route.request().url();
    // Single-song fetch (SongEditor) uses id=eq.<uuid> (not user_id=eq.)
    if (/[?&]id=eq\./.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EXAMPLE_SONG_FULL),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(songs),
    });
  });

  await page.route(/\/rest\/v1\/setlists/, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function gotoSongBrowser(page) {
  await page.goto('/');
  await page.waitForSelector('.song-card', { timeout: 8000 });
}

// ─── WelcomeModal ─────────────────────────────────────────────────────────────

test.describe('WelcomeModal', () => {
  test('appears on first visit when user has example song', async ({ page }) => {
    // Inline route registration (same pattern as debug test — avoids any closure issue)
    await page.route(/\/rest\/v1\/songs/, (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([EXAMPLE_SONG, REGULAR_SONG]) });
    });
    await page.route(/\/rest\/v1\/setlists/, (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.goto('/');
    await page.waitForTimeout(1500);
    const bodyText = await page.textContent('body');
    console.log('body has Welcome:', bodyText.includes('Welcome to RiffNotes'));
    console.log('song cards:', await page.$$('.song-card').then(els => els.length));
    await expect(page.getByText('Welcome to RiffNotes')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/practice song is ready/)).toBeVisible();
  });

  test('does not appear when already welcomed', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('riffnotes_welcomed', 'true'));
    await mockSupabase(page);
    await gotoSongBrowser(page);
    await expect(page.getByText('Welcome to RiffNotes')).not.toBeVisible();
  });

  test('does not appear when user has no example song', async ({ page }) => {
    await mockSupabase(page, [REGULAR_SONG]);
    await gotoSongBrowser(page);
    await expect(page.getByText('Welcome to RiffNotes')).not.toBeVisible();
  });

  test('"Open practice song" navigates to example song and sets localStorage', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await expect(page.getByText('Welcome to RiffNotes')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Open practice song' }).click();

    await expect(page).toHaveURL(new RegExp(EXAMPLE_SONG.id), { timeout: 5000 });
    // Check localStorage is marked in the new context (after navigation)
    const welcomed = await page.evaluate(() => localStorage.getItem('riffnotes_welcomed'));
    expect(welcomed).toBe('true');
  });

  test('"Maybe later" closes modal and sets localStorage flag', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await expect(page.getByText('Welcome to RiffNotes')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Maybe later' }).click();

    await expect(page.getByText('Welcome to RiffNotes')).not.toBeVisible({ timeout: 3000 });
    const welcomed = await page.evaluate(() => localStorage.getItem('riffnotes_welcomed'));
    expect(welcomed).toBe('true');
  });

  test('does not reappear after page reload once dismissed', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Maybe later' }).click();

    await mockSupabase(page); // re-register for reload
    await page.reload();
    await page.waitForSelector('.song-card', { timeout: 8000 });

    await expect(page.getByText('Welcome to RiffNotes')).not.toBeVisible();
  });
});

// ─── OnboardingTour ───────────────────────────────────────────────────────────

test.describe('OnboardingTour', () => {
  async function gotoExampleSong(page) {
    await mockSupabase(page);
    await page.goto(`/songs/${EXAMPLE_SONG.id}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    // Allow delayed tour mount (600ms timer in OnboardingTour)
    await page.waitForTimeout(900);
  }

  test('beacon appears on example song when tour not done', async ({ page }) => {
    await gotoExampleSong(page);
    await expect(page.locator('.react-joyride__beacon')).toBeVisible({ timeout: 3000 });
  });

  test('clicking beacon opens step-1 tooltip', async ({ page }) => {
    await gotoExampleSong(page);
    await page.locator('.react-joyride__beacon').click();
    await expect(page.getByText('Try annotating')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/Select any word or line/)).toBeVisible();
  });

  test('tour does not appear when already done', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('riffnotes_tour_done', 'true'));
    await gotoExampleSong(page);
    await expect(page.locator('.react-joyride__beacon')).not.toBeVisible();
  });

  test('completing tour (all 3 steps) sets localStorage flag', async ({ page }) => {
    await gotoExampleSong(page);

    // Step 1: click beacon → tooltip → Next
    await page.locator('.react-joyride__beacon').click();
    await expect(page.getByText('Try annotating')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: continuous mode shows tooltip directly (no beacon) — "Auto-save"
    await expect(page.getByText('Auto-save')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: "Your songs" — last step button says "Done"
    await expect(page.getByText('Your songs')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Done' }).click();

    const tourDone = await page.evaluate(() => localStorage.getItem('riffnotes_tour_done'));
    expect(tourDone).toBe('true');
  });

  test('tour does not appear on a regular (non-example) song', async ({ page }) => {
    const regularFull = { ...REGULAR_SONG, document: EXAMPLE_SONG_FULL.document, annotations: {}, instruments: ['Guitar'] };
    await page.route(/\/rest\/v1\/songs/, (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(regularFull) });
    });
    await page.goto(`/songs/${REGULAR_SONG.id}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(900);
    await expect(page.locator('.react-joyride__beacon')).not.toBeVisible();
  });
});

// ─── SongBrowser display ──────────────────────────────────────────────────────

test.describe('SongBrowser is_example display', () => {
  test('example song shows lock icon, not delete button', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('riffnotes_welcomed', 'true'));
    await mockSupabase(page);
    await gotoSongBrowser(page);

    const exampleCard = page.locator('.song-card').filter({ hasText: "Knockin' on Heaven's Door" });
    await expect(exampleCard).toBeVisible();
    await expect(exampleCard.locator('.song-card-locked')).toBeVisible();
    await expect(exampleCard.locator('.song-card-delete')).not.toBeVisible();
  });

  test('regular song shows delete button, not lock icon', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('riffnotes_welcomed', 'true'));
    await mockSupabase(page);
    await gotoSongBrowser(page);

    const regularCard = page.locator('.song-card').filter({ hasText: 'My Song' });
    await expect(regularCard).toBeVisible();
    await expect(regularCard.locator('.song-card-delete')).toBeVisible();
    await expect(regularCard.locator('.song-card-locked')).not.toBeVisible();
  });
});
