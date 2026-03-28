import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, pasteText } from './helpers.js';

test.describe('Paste behavior', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);
    // Click into the first lyric paragraph before each test
    await page.locator('.tiptap .node-paragraph').first().click();
  });

  test('pasting plain text creates one paragraph per line', async ({ page }) => {
    await pasteText(page, 'Line one\nLine two\nLine three');
    const paras = page.locator('.tiptap .node-paragraph');
    await expect(paras).toHaveCount(3);
    await expect(paras.nth(0)).toContainText('Line one');
    await expect(paras.nth(1)).toContainText('Line two');
    await expect(paras.nth(2)).toContainText('Line three');
  });

  test('pasting preserves single blank lines as empty paragraphs', async ({ page }) => {
    await pasteText(page, 'Verse\nLine 1\n\nChorus\nLine 2');
    const paras = page.locator('.tiptap .node-paragraph');
    await expect(paras).toHaveCount(5);
    await expect(paras.nth(0)).toContainText('Verse');
    await expect(paras.nth(1)).toContainText('Line 1');
    // paras.nth(2) is the blank separator
    await expect(paras.nth(3)).toContainText('Chorus');
    await expect(paras.nth(4)).toContainText('Line 2');
  });

  test('pasting collapses 3+ consecutive blank lines to one blank paragraph', async ({ page }) => {
    await pasteText(page, 'A\n\n\n\nB');
    const paras = page.locator('.tiptap .node-paragraph');
    // A, blank, B = 3 paragraphs
    await expect(paras).toHaveCount(3);
    await expect(paras.nth(0)).toContainText('A');
    await expect(paras.nth(2)).toContainText('B');
  });

  test('pasting rich HTML strips all formatting', async ({ page }) => {
    await page.evaluate(async () => {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob(
            ['<p style="font-size:24px;color:red;font-family:Arial"><strong>Plain content</strong></p>'],
            { type: 'text/html' }
          ),
          'text/plain': new Blob(['Plain content'], { type: 'text/plain' }),
        }),
      ]);
    });
    await page.keyboard.press('ControlOrMeta+v');
    await expect(page.locator('.tiptap .node-paragraph').first()).toContainText('Plain content');
    // No bold markup from the rich HTML
    const boldCount = await page.locator('.tiptap .node-paragraph strong').count();
    expect(boldCount).toBe(0);
  });

  test('pasting into middle of existing content inserts at cursor', async ({ page }) => {
    await page.locator('.tiptap .node-paragraph').first().click();
    await page.keyboard.type('Before ');
    await pasteText(page, 'Pasted');
    const text = await page.locator('.tiptap').innerText();
    expect(text).toContain('Before');
    expect(text).toContain('Pasted');
  });

  test('pasting a single word creates one paragraph', async ({ page }) => {
    await pasteText(page, 'Hello');
    const paras = page.locator('.tiptap .node-paragraph');
    await expect(paras).toHaveCount(1);
    await expect(paras.first()).toContainText('Hello');
  });

  test('pasting whitespace-only produces one blank paragraph', async ({ page }) => {
    await pasteText(page, '   ');
    // Whitespace trims to empty — one blank paragraph, no crash
    const paras = page.locator('.tiptap .node-paragraph');
    await expect(paras).toHaveCount(1);
    const text = await paras.first().textContent();
    expect(text.trim()).toBe('');
  });

  test('pasting multiline text into the song title does not corrupt the document', async ({ page }) => {
    // Focus the title instead of the lyric area
    await page.locator('.tiptap .song-title').click();
    await pasteText(page, 'My Song\nExtra line');
    // Document must still be structurally valid: title node + at least one paragraph
    const titleCount = await page.evaluate(() => {
      let n = 0;
      window.__TEST__.editor.state.doc.forEach((node) => {
        if (node.type.name === 'songTitle') n++;
      });
      return n;
    });
    const paraCount = await page.evaluate(() => {
      let n = 0;
      window.__TEST__.editor.state.doc.forEach((node) => {
        if (node.type.name === 'paragraph') n++;
      });
      return n;
    });
    expect(titleCount).toBe(1);
    expect(paraCount).toBeGreaterThanOrEqual(1);
    // Some part of the pasted text must appear in the document
    const fullText = await page.locator('.tiptap').innerText();
    expect(fullText).toContain('My Song');
  });

  test('pasting Google Docs-style HTML uses plain text and strips markup', async ({ page }) => {
    // Google Docs copies with heavy inline styling; we assert our handler ignores all of it
    const googleDocsHtml = [
      '<meta charset="utf-8">',
      '<b style="font-weight:normal;" id="docs-internal-guid-abc123">',
      '<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">',
      '<span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;">',
      'Verse one',
      '</span></p>',
      '<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">',
      '<span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;">',
      'Verse two',
      '</span></p></b>',
    ].join('');

    await page.evaluate(async (html) => {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob(['Verse one\nVerse two'], { type: 'text/plain' }),
        }),
      ]);
    }, googleDocsHtml);
    await page.keyboard.press('ControlOrMeta+v');
    await page.waitForTimeout(100);

    // Should produce two clean paragraphs — no span/style markup
    const paras = page.locator('.tiptap .node-paragraph');
    await expect(paras).toHaveCount(2);
    await expect(paras.nth(0)).toContainText('Verse one');
    await expect(paras.nth(1)).toContainText('Verse two');
    // No inline style elements should have leaked in
    const styledSpans = await page.locator('.tiptap .node-paragraph span').count();
    expect(styledSpans).toBe(0);
  });
});
