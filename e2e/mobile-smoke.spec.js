/**
 * Mobile smoke tests — run on all browser projects including WebKit and mobile devices.
 *
 * These four tests are designed to catch the Bug 1 (autofocus/IME line breaks)
 * and Bug 2 (SVG leader line visibility) regressions discovered on real devices.
 */
import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, setDocument, setAnnotations } from './helpers.js';

const LINE_ID = 'smoke-line-1';

const DOC = {
  type: 'doc',
  content: [
    { type: 'songTitle', content: [{ type: 'text', text: 'Smoke Test Song' }] },
    {
      type: 'paragraph',
      attrs: { lineId: LINE_ID },
      content: [{ type: 'text', text: 'Hello world lyrics' }],
    },
    {
      type: 'paragraph',
      attrs: { lineId: 'smoke-line-2' },
      content: [{ type: 'text', text: 'Second lyric line' }],
    },
  ],
};

const ANNOTATION = {
  'smoke-ann-1': {
    id: 'smoke-ann-1',
    lineId: LINE_ID,
    type: 'right-side',
    text: 'Test annotation',
  },
};

test.describe('Mobile smoke', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);
  });

  test('editor loads without document corruption', async ({ page }) => {
    await setDocument(page, DOC);

    // Expect exactly 2 lyric paragraphs (no extra empty lines from keyboard events)
    const paraCount = await page.evaluate(
      () => document.querySelectorAll('.tiptap .node-paragraph').length
    );
    expect(paraCount).toBe(2);
  });

  test('SVG leader lines render with non-zero dimensions', async ({ page }) => {
    await setDocument(page, DOC);
    await setAnnotations(page, ANNOTATION);

    // Wait for layout coordinator to run and SVG to appear
    await page.waitForSelector('.leader-line-svg', { timeout: 5000 });

    const svgDimensions = await page.evaluate(() => {
      const svg = document.querySelector('.leader-line-svg');
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      return { width: rect.width, height: rect.height, inDom: true };
    });

    expect(svgDimensions).not.toBeNull();
    expect(svgDimensions.inDom).toBe(true);
    expect(svgDimensions.width).toBeGreaterThan(0);
    expect(svgDimensions.height).toBeGreaterThan(0);
  });

  test('basic text input works', async ({ page }) => {
    await setDocument(page, DOC);

    // Click on the first lyric line to focus it
    const lyricLine = page.locator('.node-paragraph').first();
    await lyricLine.click();

    // Type a character and verify it appears
    await page.keyboard.type('X');

    const text = await page.evaluate(() => {
      const para = document.querySelector('.tiptap .node-paragraph');
      return para?.textContent ?? '';
    });

    expect(text).toContain('X');
  });

  test('no autofocus on touch devices', async ({ page, isMobile }) => {
    // Only assert no-autofocus on mobile device profiles
    if (!isMobile) {
      test.skip();
    }

    await setDocument(page, DOC);

    // On touch devices the editor should NOT steal focus on load
    const activeTag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
    // The editor's contenteditable div should not be the active element
    const isEditorFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.getAttribute('contenteditable') === 'true';
    });
    expect(isEditorFocused).toBe(false);
  });
});
