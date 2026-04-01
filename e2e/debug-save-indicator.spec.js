import { test } from '@playwright/test';

const EXAMPLE_SONG_FULL = {
  id: 'a0000000-0000-0000-0000-000000000001',
  title: "Knockin' on Heaven's Door",
  updated_at: '2026-03-01T00:00:00Z',
  created_at: '2026-03-01T00:00:00Z',
  is_locked: false,
  is_example: true,
  document: { type: 'doc', content: [{ type: 'songTitle', attrs: { level: 1 }, content: [{ type: 'text', text: "Knockin' on Heaven's Door" }] }, { type: 'paragraph', attrs: { lineId: 'line-1' }, content: [{ type: 'text', text: 'Mama, take this badge off of me' }] }] },
  annotations: {},
  instruments: ['Guitar'],
};

test('debug save-indicator', async ({ page }) => {
  await page.route(/\/rest\/v1\/songs/, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EXAMPLE_SONG_FULL) });
  });
  await page.route(/\/rest\/v1\/setlists/, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/songs/a0000000-0000-0000-0000-000000000001');
  await page.waitForSelector('.tiptap', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const els = document.querySelectorAll('.save-indicator');
    return Array.from(els).map(el => ({
      tag: el.tagName,
      text: el.textContent.trim(),
      rect: el.getBoundingClientRect(),
      outerHTML: el.outerHTML.substring(0, 200),
      parentClass: el.parentElement?.className,
    }));
  });
  console.log('save-indicator elements:', JSON.stringify(info, null, 2));
});
