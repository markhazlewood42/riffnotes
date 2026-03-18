import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, setDocument, oneLineDoc } from './helpers.js';

test.describe('Text editing', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);
  });

  test('typing in the editor creates a paragraph', async ({ page }) => {
    const para = page.locator('.tiptap .node-paragraph').first();
    await para.click();
    await page.keyboard.type('Hello world');
    await expect(para).toContainText('Hello world');
  });

  test('pressing Enter splits a line into two paragraphs', async ({ page }) => {
    const firstPara = page.locator('.tiptap .node-paragraph').first();
    await firstPara.click();
    await page.keyboard.type('Line one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line two');

    const paras = page.locator('.tiptap .node-paragraph');
    await expect(paras).toHaveCount(2);
    await expect(paras.nth(0)).toContainText('Line one');
    await expect(paras.nth(1)).toContainText('Line two');
  });

  test('Backspace at start of line merges with previous line', async ({ page }) => {
    // Set up two lines via the document API for a reliable starting state
    const doc = {
      type: 'doc',
      content: [
        { type: 'songTitle' },
        { type: 'paragraph', attrs: { lineId: 'line-a' }, content: [{ type: 'text', text: 'Line one' }] },
        { type: 'paragraph', attrs: { lineId: 'line-b' }, content: [{ type: 'text', text: 'Line two' }] },
      ],
    };
    await page.evaluate((d) => window.__TEST__.setDocument(d), doc);
    await page.waitForFunction(() => document.querySelectorAll('.tiptap .node-paragraph').length === 2);

    // selectText places cursor from start to end of 'Line two'
    const found = await page.evaluate(() => window.__TEST__.selectText('Line two'));
    expect(found).toBe(true);
    // Wait for BubbleMenu to confirm selection is active
    await page.waitForSelector('.annotation-toolbar', { timeout: 3000 });
    // ArrowLeft collapses selection to the start anchor (beginning of 'Line two')
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Backspace');

    await expect(page.locator('.tiptap .node-paragraph')).toHaveCount(1);
    await expect(page.locator('.tiptap .node-paragraph').first()).toContainText('Line oneLine two');
  });

  test('Tab in song title jumps focus to first lyric line', async ({ page }) => {
    // Click on the song title and type
    const title = page.locator('.tiptap h1');
    await title.click();
    await page.keyboard.type('My Song');

    // Tab should move focus to first lyric paragraph
    await page.keyboard.press('Tab');
    await page.keyboard.type('First lyric');

    // Verify the text appeared in the lyric paragraph (not the title)
    const para = page.locator('.tiptap .node-paragraph').first();
    await expect(para).toContainText('First lyric');
    await expect(title).not.toContainText('First lyric');
  });

  test('Shift-Tab from lyrics jumps back to song title', async ({ page }) => {
    // Click on the first lyric paragraph and type
    const para = page.locator('.tiptap .node-paragraph').first();
    await para.click();
    await page.keyboard.type('Some lyric');

    // Shift-Tab should jump back to song title
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.type('My Title');

    // Verify title contains the typed text
    const title = page.locator('.tiptap h1');
    await expect(title).toContainText('My Title');
    // Lyric paragraph should not contain the title text
    await expect(para).not.toContainText('My Title');
  });

  test('Enter in song title creates a lyric paragraph', async ({ page }) => {
    const title = page.locator('.tiptap h1');
    await title.click();
    await page.keyboard.type('My Song Title');

    // Press Enter — should create a new lyric paragraph (always at end of title)
    await page.keyboard.press('Enter');

    // There should now be at least 2 lyric paragraphs
    // (the original empty one + the new one created by Enter)
    await expect(page.locator('.tiptap .node-paragraph')).toHaveCount(2);
  });

  test('bold toggle via BubbleMenu', async ({ page }) => {
    // Set up a line with known text
    const lineId = 'test-bold-line';
    await page.evaluate((doc) => window.__TEST__.setDocument(doc), oneLineDoc(lineId, 'Bold this text'));
    await page.waitForTimeout(100);

    // Select the text using __TEST__ helper
    const found = await page.evaluate((t) => window.__TEST__.selectText(t), 'Bold this text');
    expect(found).toBe(true);

    // Wait for BubbleMenu toolbar to appear
    await page.waitForSelector('.annotation-toolbar', { timeout: 3000 });

    // Click the Bold button
    const boldBtn = page.locator('.annotation-toolbar .toolbar-btn[title="Bold"]');
    await boldBtn.click();

    // Wait for a moment for the DOM to update
    await page.waitForTimeout(100);

    // Verify <strong> tag is present in the lyric paragraph
    const strongEl = page.locator('.tiptap .node-paragraph strong');
    await expect(strongEl).toBeVisible();
    await expect(strongEl).toContainText('Bold this text');
  });
});
