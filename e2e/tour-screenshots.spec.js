import { test } from '@playwright/test';

const EXAMPLE_SONG_ID = 'a0000000-0000-0000-0000-000000000001';
const EXAMPLE_SONG_FULL = {
  id: EXAMPLE_SONG_ID,
  title: "Knockin' on Heaven's Door",
  updated_at: '2026-03-01T00:00:00Z',
  created_at: '2026-03-01T00:00:00Z',
  is_locked: false,
  is_example: true,
  document: {
    type: 'doc',
    content: [
      { type: 'songTitle', attrs: { level: 1 }, content: [{ type: 'text', text: "Knockin' on Heaven's Door" }] },
      { type: 'paragraph', attrs: { lineId: 'line-1' }, content: [{ type: 'text', text: 'Mama, take this badge off of me' }] },
      { type: 'paragraph', attrs: { lineId: 'line-2' }, content: [{ type: 'text', text: "I can't use it anymore" }] },
    ],
  },
  annotations: {},
  instruments: ['Guitar'],
};

test('capture tour steps', async ({ page }) => {
  await page.route(/\/rest\/v1\/songs/, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EXAMPLE_SONG_FULL) });
  });
  await page.route(/\/rest\/v1\/setlists/, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto(`/songs/${EXAMPLE_SONG_ID}`);
  await page.waitForSelector('.tiptap', { timeout: 10000 });
  await page.waitForTimeout(900);

  await page.screenshot({ path: 'e2e/screenshots/step1.png', fullPage: false });

  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'e2e/screenshots/step2.png', fullPage: false });

  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'e2e/screenshots/step3.png', fullPage: false });
});
