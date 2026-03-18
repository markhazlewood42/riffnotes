import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, setDocument, selectText, getAnnotations } from './helpers.js';

const DOC_WITH_LINES = {
  type: 'doc',
  content: [
    { type: 'songTitle' },
    {
      type: 'paragraph',
      attrs: { lineId: 'test-line-1' },
      content: [{ type: 'text', text: 'Do you know what worth fighting for' }],
    },
    {
      type: 'paragraph',
      attrs: { lineId: 'test-line-2' },
      content: [{ type: 'text', text: 'Child is slowly taken' }],
    },
  ],
};

test.describe('Chord annotations', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);
    await setDocument(page, DOC_WITH_LINES);
  });

  test('add chord via Add button', async ({ page }) => {
    await selectText(page, 'Do you');

    // Click the Chord toolbar button (uses onMouseDown, but .click() still works)
    await page.locator('.annotation-toolbar .toolbar-btn').filter({ hasText: 'Chord' }).click();

    // Wait for chord input to appear
    await page.waitForSelector('.toolbar-input', { timeout: 3000 });

    // Fill in the chord value and click the submit button
    await page.locator('.toolbar-input').fill('Am');
    await page.locator('.toolbar-submit-btn').click();

    // Verify chord appears in the editor overlay
    await expect(page.locator('.chord-overlay .chord-positioned').first()).toBeVisible();
    await expect(page.locator('.chord-overlay .chord-positioned').first()).toContainText('Am');

    // Verify the annotation was saved in the store
    const annotations = await getAnnotations(page);
    const chords = Object.values(annotations).filter((a) => a.type === 'chord');
    expect(chords).toHaveLength(1);
    expect(chords[0].value).toBe('Am');
  });

  test('add chord via Enter key', async ({ page }) => {
    await selectText(page, 'Do you');

    await page.locator('.annotation-toolbar .toolbar-btn').filter({ hasText: 'Chord' }).click();

    await page.waitForSelector('.toolbar-input', { timeout: 3000 });

    await page.locator('.toolbar-input').fill('G7');
    await page.keyboard.press('Enter');

    // Verify chord appears in the editor overlay
    await expect(page.locator('.chord-overlay .chord-positioned').first()).toBeVisible();
    await expect(page.locator('.chord-overlay .chord-positioned').first()).toContainText('G7');

    // Verify annotation store has the chord
    const annotations = await getAnnotations(page);
    const chords = Object.values(annotations).filter((a) => a.type === 'chord');
    expect(chords).toHaveLength(1);
    expect(chords[0].value).toBe('G7');
  });

  test('cancel chord input via Escape returns to toolbar buttons', async ({ page }) => {
    await selectText(page, 'Do you');

    await page.locator('.annotation-toolbar .toolbar-btn').filter({ hasText: 'Chord' }).click();

    await page.waitForSelector('.toolbar-input', { timeout: 3000 });

    // Type something and then press Escape to cancel
    await page.locator('.toolbar-input').fill('Dm');
    await page.keyboard.press('Escape');

    // The chord input should be gone; toolbar buttons should be visible
    await expect(page.locator('.toolbar-input')).not.toBeVisible();
    await expect(page.locator('.annotation-toolbar .toolbar-btn').filter({ hasText: 'Chord' })).toBeVisible();

    // No annotation should have been added
    const annotations = await getAnnotations(page);
    const chords = Object.values(annotations).filter((a) => a.type === 'chord');
    expect(chords).toHaveLength(0);
  });

  test('after adding chord, selecting new text resets toolbar to buttons', async ({ page }) => {
    // Add a chord to the first line
    await selectText(page, 'Do you');
    await page.locator('.annotation-toolbar .toolbar-btn').filter({ hasText: 'Chord' }).click();
    await page.waitForSelector('.toolbar-input', { timeout: 3000 });
    await page.locator('.toolbar-input').fill('C');
    await page.locator('.toolbar-submit-btn').click();

    // Wait a moment for the toolbar to reset after submit
    await page.waitForTimeout(200);

    // Now select text on the second line — this triggers a new selection
    await selectText(page, 'Child is slowly');

    // Toolbar should show the buttons view, not the chord input
    await expect(page.locator('.annotation-toolbar .toolbar-btn').filter({ hasText: 'Chord' })).toBeVisible();
    await expect(page.locator('.toolbar-input')).not.toBeVisible();
  });

  test('delete a chord annotation', async ({ page }) => {
    // Add a chord first
    await selectText(page, 'Do you');
    await page.locator('.annotation-toolbar .toolbar-btn').filter({ hasText: 'Chord' }).click();
    await page.waitForSelector('.toolbar-input', { timeout: 3000 });
    await page.locator('.toolbar-input').fill('Em');
    await page.locator('.toolbar-submit-btn').click();

    // Wait for chord to appear
    await expect(page.locator('.chord-overlay .chord-positioned')).toBeVisible();

    // Click on the chord span to delete it (AnnotatedLineView uses onClick for delete).
    // The lyric-content div overlaps the chord overlay in z-order, so we dispatch
    // the click via JavaScript to reach the React event handler directly.
    await page.evaluate(() => {
      const chord = document.querySelector('.chord-overlay .chord-positioned');
      if (chord) chord.click();
    });

    // Verify chord is gone from the DOM
    await expect(page.locator('.chord-overlay .chord-positioned')).toHaveCount(0);

    // Verify annotation store is empty of chords
    const annotations = await getAnnotations(page);
    const chords = Object.values(annotations).filter((a) => a.type === 'chord');
    expect(chords).toHaveLength(0);
  });
});
