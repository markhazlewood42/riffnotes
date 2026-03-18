import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, setDocument, setAnnotations } from './helpers.js';

// 5-line document for stacking tests
const STACKING_DOC = {
  type: 'doc',
  content: [
    { type: 'songTitle' },
    {
      type: 'paragraph',
      attrs: { lineId: 'line-1' },
      content: [{ type: 'text', text: 'Knockin on heavens door' }],
    },
    {
      type: 'paragraph',
      attrs: { lineId: 'line-2' },
      content: [{ type: 'text', text: 'Mama take this badge off of me' }],
    },
    {
      type: 'paragraph',
      attrs: { lineId: 'line-3' },
      content: [{ type: 'text', text: 'I cant use it anymore' }],
    },
    {
      type: 'paragraph',
      attrs: { lineId: 'line-4' },
      content: [{ type: 'text', text: 'Its getting dark too dark to see' }],
    },
    {
      type: 'paragraph',
      attrs: { lineId: 'line-5' },
      content: [{ type: 'text', text: "I feel I'm knockin on heavens door" }],
    },
  ],
};

// Tiny 1x1 transparent PNG for image annotation tests
const DATA_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Returns bounding rects for all annotation wrappers currently in the DOM.
 * Uses unzoomed CSS pixels (getBoundingClientRect values divided by zoom).
 */
async function getAllAnnotationRects(page) {
  return page.evaluate(() => {
    const container =
      document.querySelector('.document-container') || document.body || document.documentElement

    const zoomStyle = container ? window.getComputedStyle(container).zoom : null
    const zoom = (() => {
      if (!zoomStyle || zoomStyle === 'normal') return 1
      const parsed = parseFloat(zoomStyle)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
    })()

    const wrappers = document.querySelectorAll('.right-annotation-actions-wrapper')
    return Array.from(wrappers).map((el) => {
      const r = el.getBoundingClientRect()
      return {
        top: r.top / zoom,
        bottom: r.bottom / zoom,
        height: r.height / zoom,
      }
    })
  })
}

test.describe('Annotation stacking', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);
    await setDocument(page, STACKING_DOC);
  });

  test('consecutive text annotations do not visually overlap', async ({ page }) => {
    await setAnnotations(page, {
      'ann-text-1': {
        id: 'ann-text-1',
        type: 'right-side',
        lineId: 'line-1',
        charOffset: 0,
        value: 'First note here',
        style: 'default',
      },
      'ann-text-2': {
        id: 'ann-text-2',
        type: 'right-side',
        lineId: 'line-2',
        charOffset: 0,
        value: 'Second note here',
        style: 'default',
      },
      'ann-text-3': {
        id: 'ann-text-3',
        type: 'right-side',
        lineId: 'line-3',
        charOffset: 0,
        value: 'Third note here',
        style: 'default',
      },
    });

    // Wait for layout coordinator to converge
    await page.waitForTimeout(200);

    const rects = await getAllAnnotationRects(page);
    expect(rects).toHaveLength(3);

    for (let i = 1; i < rects.length; i++) {
      expect(rects[i].top).toBeGreaterThanOrEqual(rects[i - 1].bottom);
    }
  });

  test('consecutive image annotations do not visually overlap', async ({ page }) => {
    await setAnnotations(page, {
      'ann-img-1': {
        id: 'ann-img-1',
        type: 'image',
        lineId: 'line-1',
        charOffset: 0,
        url: DATA_IMG,
      },
      'ann-img-2': {
        id: 'ann-img-2',
        type: 'image',
        lineId: 'line-2',
        charOffset: 0,
        url: DATA_IMG,
      },
      'ann-img-3': {
        id: 'ann-img-3',
        type: 'image',
        lineId: 'line-3',
        charOffset: 0,
        url: DATA_IMG,
      },
    });

    // Wait for layout coordinator to converge and images to render
    await page.waitForTimeout(300);

    const rects = await getAllAnnotationRects(page);
    expect(rects).toHaveLength(3);

    for (let i = 1; i < rects.length; i++) {
      expect(rects[i].top).toBeGreaterThanOrEqual(rects[i - 1].bottom);
    }
  });

  test('mixed text and image annotations do not overlap', async ({ page }) => {
    await setAnnotations(page, {
      'ann-mix-1': {
        id: 'ann-mix-1',
        type: 'right-side',
        lineId: 'line-1',
        charOffset: 0,
        value: 'Text note on line 1',
        style: 'default',
      },
      'ann-mix-2': {
        id: 'ann-mix-2',
        type: 'image',
        lineId: 'line-2',
        charOffset: 0,
        url: DATA_IMG,
      },
      'ann-mix-3': {
        id: 'ann-mix-3',
        type: 'right-side',
        lineId: 'line-3',
        charOffset: 0,
        value: 'Text note on line 3',
        style: 'default',
      },
    });

    // Wait for layout coordinator to converge and images to render
    await page.waitForTimeout(300);

    const rects = await getAllAnnotationRects(page);
    expect(rects).toHaveLength(3);

    for (let i = 1; i < rects.length; i++) {
      expect(rects[i].top).toBeGreaterThanOrEqual(rects[i - 1].bottom);
    }
  });

  test('adding an annotation above an existing one pushes the lower one down', async ({ page }) => {
    // Start with just one annotation on line 2
    await setAnnotations(page, {
      'ann-lower': {
        id: 'ann-lower',
        type: 'right-side',
        lineId: 'line-2',
        charOffset: 0,
        value: 'Lower note',
        style: 'default',
      },
    });

    await page.waitForTimeout(200);

    const rectsBefore = await getAllAnnotationRects(page);
    expect(rectsBefore).toHaveLength(1);
    const lowerTopBefore = rectsBefore[0].top;

    // Now add a tall annotation on line 1 (above line 2)
    await setAnnotations(page, {
      'ann-upper': {
        id: 'ann-upper',
        type: 'right-side',
        lineId: 'line-1',
        charOffset: 0,
        value:
          'This is a longer upper note that takes up more vertical space and should push the lower annotation downward to avoid any overlap',
        style: 'default',
      },
      'ann-lower': {
        id: 'ann-lower',
        type: 'right-side',
        lineId: 'line-2',
        charOffset: 0,
        value: 'Lower note',
        style: 'default',
      },
    });

    // Wait for layout to re-converge after the new annotation is added
    await page.waitForTimeout(300);

    const rectsAfter = await getAllAnnotationRects(page);
    expect(rectsAfter).toHaveLength(2);

    // The lower note's top should be at or below where it was before (pushed down)
    const lowerTopAfter = rectsAfter[1].top;
    expect(lowerTopAfter).toBeGreaterThanOrEqual(lowerTopBefore);

    // And they should not overlap
    expect(rectsAfter[1].top).toBeGreaterThanOrEqual(rectsAfter[0].bottom);
  });

  test('displaced annotation has a diagonal elbow leader line (2 line elements)', async ({ page }) => {
    // A very tall text annotation on line 1 will force line 2's annotation to displace
    // downward, triggering the elbow SVG path (2 <line> elements instead of 1).
    const tallNote =
      'This annotation is intentionally very long so that its rendered height forces the annotation on the next line far enough down to create a displacement and trigger the diagonal elbow leader line in the SVG rendering.';

    await setAnnotations(page, {
      'ann-tall': {
        id: 'ann-tall',
        type: 'right-side',
        lineId: 'line-1',
        charOffset: 0,
        value: tallNote,
        style: 'default',
      },
      'ann-displaced': {
        id: 'ann-displaced',
        type: 'right-side',
        lineId: 'line-2',
        charOffset: 0,
        value: 'Displaced note',
        style: 'default',
      },
    });

    // Wait for layout to converge
    await page.waitForTimeout(400);

    // Check that at least one leader SVG has 2 <line> elements (the elbow shape).
    // A non-displaced annotation has exactly 1 <line>; a displaced one has 2.
    const hasElbow = await page.evaluate(() => {
      const svgs = document.querySelectorAll('.leader-line-svg');
      for (const svg of svgs) {
        if (svg.querySelectorAll('line').length === 2) return true;
      }
      return false;
    });

    expect(hasElbow).toBe(true);
  });
});
