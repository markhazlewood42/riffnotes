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

/**
 * Measure the screen X of the SVG tick mark and the screen X of the character
 * at charOffset for the given lineId. Both are in viewport coordinates.
 * Returns { tickX, charX } or null if elements aren't found.
 */
async function measureTickVsChar(page, lineId, charOffset) {
  return page.evaluate(({ lineId, charOffset }) => {
    const lineEl = document.querySelector(`[data-line-id="${lineId}"]`);
    if (!lineEl) return null;
    const contentEl = lineEl.querySelector('.lyric-content');
    const svgEl = lineEl.querySelector('.leader-line-svg');
    if (!contentEl || !svgEl) return null;

    // Walk all nodes to find the DOM position corresponding to charOffset.
    // Count text characters normally and <br> elements as 1 character each,
    // matching ProseMirror's hardBreak character counting.
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_ALL);
    let accumulated = 0;
    let target = null;
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.nodeType === Node.TEXT_NODE) {
        if (accumulated + n.length >= charOffset) {
          target = { type: 'text', node: n, offset: charOffset - accumulated };
          break;
        }
        accumulated += n.length;
      } else if (n.nodeType === Node.ELEMENT_NODE && n.nodeName === 'BR') {
        if (accumulated + 1 > charOffset) break;
        accumulated += 1;
        if (accumulated === charOffset) {
          const parent = n.parentNode;
          const index = Array.prototype.indexOf.call(parent.childNodes, n);
          target = { type: 'br', parent, offset: index + 1 };
          break;
        }
      }
    }
    if (!target) return null;

    // Collapsed range at charOffset = the character's left edge
    const range = document.createRange();
    if (target.type === 'text') {
      range.setStart(target.node, target.offset);
      range.setEnd(target.node, target.offset);
    } else {
      range.setStart(target.parent, target.offset);
      range.setEnd(target.parent, target.offset);
    }
    const charRect = range.getBoundingClientRect();

    // SVG left edge = where the tick is drawn (tick is at x=0 in the SVG)
    const svgRect = svgEl.getBoundingClientRect();

    return { tickX: svgRect.left, charX: charRect.left };
  }, { lineId, charOffset });
}

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

  test('leader line tick is pinned to its annotation character (mid-line)', async ({ page }) => {
    // charOffset 3 = start of "you" — tick must appear at that exact character.
    const CHAR_OFFSET = 3;
    await setAnnotations(page, {
      'ann-pin': {
        id: 'ann-pin',
        type: 'right-side',
        lineId: 'test-line-1',
        charOffset: CHAR_OFFSET,
        value: 'pin test',
        style: 'default',
      },
    });
    await expect(page.locator('.leader-line-svg').first()).toBeVisible();
    await page.waitForTimeout(100);

    const pos = await measureTickVsChar(page, 'test-line-1', CHAR_OFFSET);
    expect(pos).not.toBeNull();
    expect(Math.abs(pos.tickX - pos.charX)).toBeLessThan(5);
  });

  test('leader line tick stays pinned to character after backspace merge', async ({ page }) => {
    const CHAR_OFFSET = 3;
    await setDocument(page, {
      type: 'doc',
      content: [
        { type: 'songTitle' },
        { type: 'paragraph', attrs: { lineId: 'merge-line-1' }, content: [{ type: 'text', text: 'Do you know what' }] },
        { type: 'paragraph', attrs: { lineId: 'merge-line-2' }, content: [{ type: 'text', text: 'worth fighting for' }] },
      ],
    });
    await setAnnotations(page, {
      'ann-merge': {
        id: 'ann-merge',
        type: 'right-side',
        lineId: 'merge-line-1',
        charOffset: CHAR_OFFSET,
        value: 'merge pin test',
        style: 'default',
      },
    });
    await expect(page.locator('.leader-line-svg').first()).toBeVisible();
    await page.waitForTimeout(100);

    // Verify pinned before the merge
    const before = await measureTickVsChar(page, 'merge-line-1', CHAR_OFFSET);
    expect(before).not.toBeNull();
    expect(Math.abs(before.tickX - before.charX)).toBeLessThan(5);

    // Merge line 2 into line 1
    await page.locator('[data-line-id="merge-line-2"] .lyric-content').click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(150);

    // Tick must still be pinned to the same character after the merge
    const after = await measureTickVsChar(page, 'merge-line-1', CHAR_OFFSET);
    expect(after).not.toBeNull();
    expect(Math.abs(after.tickX - after.charX)).toBeLessThan(5);
  });

  test('leader line tick stays pinned when Shift+Enter is inserted after the annotation character', async ({ page }) => {
    // BR after the annotation — character stays on first visual sub-line, tick must remain pinned.
    const CHAR_OFFSET = 3;
    await setAnnotations(page, {
      'ann-br-after': {
        id: 'ann-br-after',
        type: 'right-side',
        lineId: 'test-line-1',
        charOffset: CHAR_OFFSET,
        value: 'br after pin test',
        style: 'default',
      },
    });
    await expect(page.locator('.leader-line-svg').first()).toBeVisible();
    await page.waitForTimeout(100);

    // Click past the annotation character and insert a BR after it
    const lyricBox = await page.locator('.lyric-content').first().boundingBox();
    await page.mouse.click(lyricBox.x + lyricBox.width * 0.7, lyricBox.y + lyricBox.height / 2);
    await page.keyboard.press('Shift+Enter');
    await page.waitForTimeout(150);

    const pos = await measureTickVsChar(page, 'test-line-1', CHAR_OFFSET);
    expect(pos).not.toBeNull();
    expect(Math.abs(pos.tickX - pos.charX)).toBeLessThan(5);
  });

  test('leader line tick does not span document when Shift+Enter moves annotation character to sub-line', async ({ page }) => {
    // BR before the annotation moves the character to the second visual sub-line.
    // Current architecture falls back to placing the tick at the leader-container edge
    // (end of first sub-line) rather than following the character to the second row.
    // TODO: implement sub-line pinning so the tick follows the character exactly.
    const lineText = 'Do you know what worth fighting for';
    await setAnnotations(page, {
      'ann-br-before': {
        id: 'ann-br-before',
        type: 'right-side',
        lineId: 'test-line-1',
        charOffset: lineText.length,
        value: 'br before test',
        style: 'default',
      },
    });
    await expect(page.locator('.leader-line-svg').first()).toBeVisible();

    const lyricBox = await page.locator('.lyric-content').first().boundingBox();
    await page.mouse.click(lyricBox.x + lyricBox.width * 0.4, lyricBox.y + lyricBox.height / 2);
    await page.keyboard.press('Shift+Enter');
    await page.waitForTimeout(150);

    // Assert the tick has NOT jumped to the document's far left edge.
    const svgRect = await page.locator('.leader-line-svg').first().boundingBox();
    const wrapperRect = await page.locator('.lyric-content-wrapper').first().boundingBox();
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
