import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor } from './helpers.js';

// Returns cursor position info from the editor state
async function getCursorInfo(page) {
  return page.evaluate(() => {
    const { from } = window.__TEST__.editor.state.selection;
    const $from = window.__TEST__.editor.state.doc.resolve(from);
    return { from, parentOffset: $from.parentOffset, nodeType: $from.parent.type.name };
  });
}

// Set cursor to start of paragraph N (1-indexed), with DOM focus so key events work
async function cursorAtParaStart(page, n = 1) {
  await page.evaluate((targetN) => {
    const doc = window.__TEST__.editor.state.doc;
    let count = 0, pos = null;
    doc.forEach((node, p) => {
      if (node.type.name === 'paragraph') {
        count++;
        if (count === targetN) pos = p + 1;
      }
    });
    if (pos !== null) window.__TEST__.editor.chain().focus().setTextSelection(pos).run();
  }, n);
}

// Set cursor to end of paragraph N (1-indexed), with DOM focus
async function cursorAtParaEnd(page, n) {
  await page.evaluate((targetN) => {
    const doc = window.__TEST__.editor.state.doc;
    let count = 0, pos = null;
    doc.forEach((node, p) => {
      if (node.type.name === 'paragraph') {
        count++;
        if (count === targetN) pos = p + node.nodeSize - 1;
      }
    });
    if (pos !== null) window.__TEST__.editor.chain().focus().setTextSelection(pos).run();
  }, n);
}

// Set cursor partway into paragraph N (1-indexed), with DOM focus
async function cursorAtParaOffset(page, n, offset) {
  await page.evaluate(([targetN, off]) => {
    const doc = window.__TEST__.editor.state.doc;
    let count = 0, pos = null;
    doc.forEach((node, p) => {
      if (node.type.name === 'paragraph') {
        count++;
        if (count === targetN) pos = p + 1 + off;
      }
    });
    if (pos !== null) window.__TEST__.editor.chain().focus().setTextSelection(pos).run();
  }, [n, offset]);
}

// Count paragraphs in the document
async function getParaCount(page) {
  return page.evaluate(() => {
    let count = 0;
    window.__TEST__.editor.state.doc.forEach((node) => {
      if (node.type.name === 'paragraph') count++;
    });
    return count;
  });
}

const twoLineDoc = {
  type: 'doc',
  content: [
    { type: 'songTitle' },
    { type: 'paragraph', attrs: { lineId: 'nav-1' }, content: [{ type: 'text', text: 'Line one' }] },
    { type: 'paragraph', attrs: { lineId: 'nav-2' }, content: [{ type: 'text', text: 'Line two' }] },
  ],
};

test.describe('Keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);
    await page.evaluate((doc) => window.__TEST__.setDocument(doc), twoLineDoc);
    await page.waitForTimeout(100);
  });

  // --- Arrow key wrapping ---

  test('ArrowUp from first lyric line moves cursor into title', async ({ page }) => {
    await cursorAtParaStart(page, 1);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(50);
    const info = await getCursorInfo(page);
    expect(info.nodeType).toBe('songTitle');
  });

  test('ArrowDown from last lyric line stays within the document', async ({ page }) => {
    await cursorAtParaEnd(page, 2);
    const before = await getCursorInfo(page);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    const after = await getCursorInfo(page);
    expect(after.nodeType).toBe('paragraph');
    expect(after.from).toBeGreaterThanOrEqual(before.from);
  });

  test('ArrowLeft at start of second lyric wraps to end of first lyric', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Arrow key navigation not reliable on mobile device emulation');
    await cursorAtParaStart(page, 2);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(50);
    const info = await getCursorInfo(page);
    expect(info.nodeType).toBe('paragraph');
    expect(info.parentOffset).toBe('Line one'.length);
  });

  test('ArrowRight at end of first lyric wraps to start of second lyric', async ({ page }) => {
    await cursorAtParaEnd(page, 1);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const info = await getCursorInfo(page);
    expect(info.nodeType).toBe('paragraph');
    expect(info.parentOffset).toBe(0);
  });

  // --- Home / End ---

  test('Home key moves cursor to start of line', async ({ page }) => {
    await cursorAtParaOffset(page, 1, 4); // mid-way through 'Line one'
    await page.keyboard.press('Home');
    await page.waitForTimeout(50);
    const info = await getCursorInfo(page);
    expect(info.parentOffset).toBe(0);
  });

  test('End key moves cursor to end of line', async ({ page }) => {
    await cursorAtParaOffset(page, 1, 4); // mid-way through 'Line one'
    await page.keyboard.press('End');
    await page.waitForTimeout(50);
    const info = await getCursorInfo(page);
    expect(info.parentOffset).toBe('Line one'.length);
  });

  // --- Delete / Backspace edge cases ---

  test('Backspace at start of first lyric does not merge into title', async ({ page }) => {
    await cursorAtParaStart(page, 1);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(100);
    // Both lyric paragraphs should still exist
    expect(await getParaCount(page)).toBe(2);
    // Title should not contain lyric text
    const titleText = await page.evaluate(() =>
      window.__TEST__.editor.state.doc.firstChild?.textContent ?? ''
    );
    expect(titleText).toBe('');
  });

  test('Delete at end of last lyric line does not change the document', async ({ page }) => {
    await cursorAtParaEnd(page, 2);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);
    expect(await getParaCount(page)).toBe(2);
    const lastText = await page.evaluate(() => {
      const paras = [];
      window.__TEST__.editor.state.doc.forEach((node) => {
        if (node.type.name === 'paragraph') paras.push(node.textContent);
      });
      return paras[paras.length - 1];
    });
    expect(lastText).toBe('Line two');
  });

  test('selecting across line boundary and pressing Delete merges to one paragraph', async ({ page }) => {
    // Select from mid first para to mid second para, then delete
    await page.evaluate(() => {
      const doc = window.__TEST__.editor.state.doc;
      const positions = [];
      doc.forEach((node, pos) => {
        if (node.type.name === 'paragraph') positions.push({ pos, size: node.nodeSize });
      });
      // from = offset 4 into para 1; to = offset 4 into para 2
      const from = positions[0].pos + 1 + 4;
      const to = positions[1].pos + 1 + 4;
      window.__TEST__.editor.chain().focus().setTextSelection({ from, to }).run();
    });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);
    expect(await getParaCount(page)).toBe(1);
    // Remaining text should be prefix of line1 + suffix of line2
    const text = await page.evaluate(() => {
      let t = '';
      window.__TEST__.editor.state.doc.forEach((node) => {
        if (node.type.name === 'paragraph') t = node.textContent;
      });
      return t;
    });
    expect(text).toBe('Line two');
  });
});
