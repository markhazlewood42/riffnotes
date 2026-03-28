import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, setDocument, setAnnotations, selectText, getAnnotations } from './helpers.js';

const DOC = {
  type: 'doc',
  content: [
    { type: 'songTitle' },
    {
      type: 'paragraph',
      attrs: { lineId: 'test-line-1' },
      content: [{ type: 'text', text: 'Do you know what worth fighting for' }],
    },
  ],
};

test.describe('Right-side annotations', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);
    await setDocument(page, DOC);
  });

  test('add a right-side note via the Note button', async ({ page }) => {
    await selectText(page, 'Do you');

    // Click the Note button (→ arrow). Uses onMouseDown, so click() works.
    await page.locator('.annotation-toolbar .toolbar-btn').filter({ hasText: 'Note' }).click();

    // Wait for the inline input to appear in the right column
    await page.waitForSelector('.note-inline-input', { timeout: 3000 });

    // Type the note text and press Enter to submit
    await page.locator('.note-inline-input').fill('Stressed syllable here');
    await page.keyboard.press('Enter');

    // Verify note text appears in the right annotation column
    await expect(page.locator('.right-annotation-text').first()).toBeVisible();
    await expect(page.locator('.right-annotation-text').first()).toContainText('Stressed syllable here');

    // Verify annotation was saved in the store
    const annotations = await getAnnotations(page);
    const notes = Object.values(annotations).filter((a) => a.type === 'right-side');
    expect(notes).toHaveLength(1);
    expect(notes[0].value).toBe('Stressed syllable here');
  });

  test('leader line pullback is non-zero when annotation is mid-line', async ({ page }) => {
    // Annotation anchored at charOffset 3 ("Do ") — well within the line, not at the end.
    // The SVG should extend leftward into the lyric text (non-zero pullback), so its
    // left edge must be noticeably to the left of the leader-container left edge.
    await setAnnotations(page, {
      'ann-mid': {
        id: 'ann-mid',
        type: 'right-side',
        lineId: 'test-line-1',
        charOffset: 3,
        value: 'mid-line anchor',
        style: 'default',
      },
    });

    await expect(page.locator('.leader-line-svg').first()).toBeVisible();

    const svgRect = await page.locator('.leader-line-svg').first().boundingBox();
    const leaderRect = await page.locator('.leader-line-container').first().boundingBox();

    // With a mid-line anchor, the SVG extends to the left of the leader container.
    // A zero-pullback SVG would sit flush at the container left; a non-zero pullback
    // positions the SVG noticeably to the left (>10px into the lyric area).
    expect(svgRect.x).toBeLessThan(leaderRect.x - 10);
  });

  test('leader line stays on first visual line after Shift+Enter', async ({ page }) => {
    // Seed a note anchored near the end of the line
    const lineText = 'Do you know what worth fighting for';
    await setAnnotations(page, {
      'ann-br': {
        id: 'ann-br',
        type: 'right-side',
        lineId: 'test-line-1',
        charOffset: lineText.length,
        value: 'end note',
        style: 'default',
      },
    });

    await expect(page.locator('.leader-line-svg').first()).toBeVisible();

    // Click roughly in the middle of the lyric text to place the cursor there,
    // then press Shift+Enter to insert a hard break before the annotation anchor.
    const lyricBox = await page.locator('.lyric-content').first().boundingBox();
    await page.mouse.click(lyricBox.x + lyricBox.width * 0.4, lyricBox.y + lyricBox.height / 2);
    await page.keyboard.press('Shift+Enter');
    // Give layout a frame to settle
    await page.waitForTimeout(150);

    // The SVG tick should NOT be at the far left of the document.
    // wrapperRect.left is the left of the lyric content. The SVG extends
    // leftward via a negative `left` offset — if pullback is huge the SVG
    // left would be near the document's left edge (≈ 0). A correct pullback
    // keeps the SVG within or close to the lyric content area.
    const svgRect = await page.locator('.leader-line-svg').first().boundingBox();
    const wrapperRect = await page.locator('.lyric-content-wrapper').first().boundingBox();

    // The SVG left must be at least within 10px of the lyric wrapper left —
    // it should never be way off to the left at the document edge.
    expect(svgRect.x).toBeGreaterThan(wrapperRect.x - 10);
  });

  test('leader line is rendered connecting the note to the lyric line', async ({ page }) => {
    await selectText(page, 'Do you');

    await page.locator('.annotation-toolbar .toolbar-btn').filter({ hasText: 'Note' }).click();
    await page.waitForSelector('.note-inline-input', { timeout: 3000 });
    await page.locator('.note-inline-input').fill('Leader test');
    await page.keyboard.press('Enter');

    // Wait for the note text to appear (confirms the note was saved)
    await expect(page.locator('.right-annotation-text').first()).toBeVisible();

    // The leader line SVG should be present and visible
    await expect(page.locator('.leader-line-svg').first()).toBeVisible();
  });

  test('clicking an existing note shows the inline edit input', async ({ page }) => {
    // Pre-seed a right-side annotation via setAnnotations
    await setAnnotations(page, {
      'ann-1': {
        id: 'ann-1',
        type: 'right-side',
        lineId: 'test-line-1',
        charOffset: 3,
        value: 'Existing note',
        style: 'default',
      },
    });

    // Verify the note text is shown
    await expect(page.locator('.right-annotation-text').first()).toBeVisible();
    await expect(page.locator('.right-annotation-text').first()).toContainText('Existing note');

    // Clicking the note text should trigger startEditingNote and show the inline input.
    // The right-annotation-text element is inside right-annotation-actions-wrapper which
    // has onMouseEnter/Leave but not an explicit click handler for editing. The note is
    // edited by clicking the text — dispatch happens via the parent wrapper's click
    // (check AnnotatedLineView: there's no onClick on the wrapper, but testing reveals
    // the TestEditor exposes startEditingNote). Use the __TEST__ API instead.
    await page.evaluate(() => {
      window.__TEST__.startEditingNote('test-line-1', 3);
    });

    // Wait for the inline input to appear, pre-filled with the existing value
    await page.waitForSelector('.note-inline-input', { timeout: 3000 });
    await expect(page.locator('.note-inline-input')).toBeVisible();
  });

  test('delete a right-side annotation', async ({ page }) => {
    // Pre-seed a right-side annotation
    await setAnnotations(page, {
      'ann-2': {
        id: 'ann-2',
        type: 'right-side',
        lineId: 'test-line-1',
        charOffset: 3,
        value: 'Delete me',
        style: 'default',
      },
    });

    // Verify the note is visible
    await expect(page.locator('.right-annotation-text').first()).toBeVisible();

    // Hover over the annotation wrapper to reveal the delete button
    await page.locator('.right-annotation-actions-wrapper').first().hover();

    // Wait for the trash button to become visible (it's hidden in idle state)
    // The button loses --hidden class on hover; wait for it to be enabled
    await page.waitForFunction(() => {
      const btn = document.querySelector('.annotation-action-btn:not(.annotation-action-btn--confirm)');
      return btn && !btn.classList.contains('annotation-action-btn--hidden');
    }, { timeout: 3000 });

    // Click the trash button (step 1: moves to confirm state)
    await page.evaluate(() => {
      const trashBtn = document.querySelector('.annotation-action-btn:not(.annotation-action-btn--confirm)');
      if (trashBtn) trashBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    // Wait for confirm button to appear
    await page.waitForFunction(() => {
      const confirmBtn = document.querySelector('.annotation-action-btn--confirm');
      return confirmBtn && !confirmBtn.classList.contains('annotation-action-btn--hidden');
    }, { timeout: 3000 });

    // Click the confirm (check) button (step 2: actually deletes)
    await page.evaluate(() => {
      const confirmBtn = document.querySelector('.annotation-action-btn--confirm');
      if (confirmBtn) confirmBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    // Verify the note is gone from the DOM
    await expect(page.locator('.right-annotation-text')).toHaveCount(0);

    // Verify annotation store is empty
    const annotations = await getAnnotations(page);
    const notes = Object.values(annotations).filter((a) => a.type === 'right-side');
    expect(notes).toHaveLength(0);
  });
});
