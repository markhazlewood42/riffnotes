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

test('debug tour step 2 position', async ({ page }) => {
  await page.route(/\/rest\/v1\/songs/, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EXAMPLE_SONG_FULL) });
  });
  await page.route(/\/rest\/v1\/setlists/, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/songs/a0000000-0000-0000-0000-000000000001');
  await page.waitForSelector('.tiptap', { timeout: 10000 });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(500);

  const info = await page.evaluate(() => {
    const indicator = document.querySelector('.save-indicator');
    const spotlight = document.querySelector('[data-test-id="spotlight"], .__floater, .react-joyride__spotlight');
    const overlay = document.querySelector('.react-joyride__overlay');
    return {
      scrollY: window.scrollY,
      indicator: indicator ? indicator.getBoundingClientRect() : null,
      spotlightEl: spotlight ? { rect: spotlight.getBoundingClientRect(), style: spotlight.getAttribute('style') } : null,
      overlayEl: overlay ? { rect: overlay.getBoundingClientRect(), style: overlay.getAttribute('style') } : null,
      allJoyrideEls: Array.from(document.querySelectorAll('[class*="joyride"]')).map(el => ({ class: el.className, rect: el.getBoundingClientRect() })),
    };
  });
  console.log('Debug info:', JSON.stringify(info, null, 2));
});
