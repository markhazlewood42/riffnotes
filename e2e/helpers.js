/**
 * Shared helpers for RiffNotes Playwright e2e tests.
 *
 * All helpers that interact with the editor go through window.__TEST__,
 * which is exposed by TestEditor.jsx in auth-bypass mode.
 */

/**
 * Navigate to /test and wait for the editor to be ready.
 * Call this once per test file in a beforeAll, or inline in tests that need a fresh page.
 * Call this once per test file in a beforeAll, or inline in tests that need a fresh page.
 */
export async function gotoTestEditor(page) {
  // Abort Supabase requests to avoid slow timeouts and console noise
  await page.route('**/supabase.co/**', (route) => route.abort());
  await page.goto('/test');
  // Wait for the React useEffect to fire and assign window.__TEST__
  // (the effect fires after mount, so it may not be defined at navigate-complete)
  await page.waitForFunction(() => typeof window.__TEST__ !== 'undefined');
  // Then await the editor-ready promise (waits for editorRef.current to be set)
  await page.evaluate(() => window.__TEST__.ready);
}

/**
 * Reset editor to empty document and clear all annotations.
 * Call in beforeEach to ensure test isolation.
 */
export async function resetEditor(page) {
  await page.evaluate(() => window.__TEST__.resetEditor());
  // Belt-and-suspenders: wait for DOM to show exactly one empty lyric paragraph.
  // TipTap paragraphs are rendered as NodeViews (.node-paragraph divs), not <p> tags.
  await page.waitForFunction(() => {
    const paras = document.querySelectorAll('.tiptap .node-paragraph');
    return paras.length === 1 && paras[0].textContent.trim() === '';
  });
}

/**
 * Inject a TipTap document JSON into the editor.
 */
export async function setDocument(page, doc) {
  await page.evaluate((d) => window.__TEST__.setDocument(d), doc);
  await page.waitForTimeout(100); // allow layout to settle
}

/**
 * Inject an annotations map into the annotation store.
 */
export async function setAnnotations(page, annotations) {
  await page.evaluate((a) => window.__TEST__.setAnnotations(a), annotations);
  await page.waitForTimeout(100);
}

/**
 * Select text in the editor using TipTap's setTextSelection API.
 * Throws if the text is not found. Waits for BubbleMenu to appear.
 */
export async function selectText(page, text) {
  const found = await page.evaluate((t) => window.__TEST__.selectText(t), text);
  if (!found) throw new Error(`Text not found in editor: "${text}"`);
  await page.waitForSelector('.annotation-toolbar', { timeout: 3000 });
}

/**
 * Get the current TipTap document JSON.
 */
export async function getEditorContent(page) {
  return page.evaluate(() => window.__TEST__.getState().document);
}

/**
 * Get the current annotations map.
 */
export async function getAnnotations(page) {
  return page.evaluate(() => window.__TEST__.getState().annotations);
}

/**
 * Simulate a plain-text paste into the focused editor element.
 * Uses the native clipboard API + keyboard shortcut so Firefox handles it correctly.
 */
export async function pasteText(page, text) {
  await page.evaluate((t) => navigator.clipboard.writeText(t), text);
  await page.keyboard.press('ControlOrMeta+v');
  // Allow the editor's paste handler to finish processing before assertions.
  await page.waitForTimeout(100);
}

/**
 * A minimal one-line document with a given lineId and text content.
 * Useful for tests that need a known starting state.
 */
export function oneLineDoc(lineId, text) {
  return {
    type: 'doc',
    content: [
      { type: 'songTitle' },
      {
        type: 'paragraph',
        attrs: { lineId },
        content: text ? [{ type: 'text', text }] : [],
      },
    ],
  };
}
