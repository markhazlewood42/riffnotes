import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, pasteText, setDocument } from './helpers.js';

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
    await page.evaluate(() => {
      const editor = document.querySelector('.tiptap');
      editor.focus();
      const dt = new DataTransfer();
      dt.setData('text/plain', 'Plain content');
      dt.setData('text/html', '<p style="font-size:24px;color:red;font-family:Arial"><strong>Plain content</strong></p>');
      editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
    });
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
});
