import { test, expect } from '@playwright/test';
import { gotoTestEditor } from './helpers.js';

test.describe('Document zoom', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
  });

  test('document container is scaled up from its base width', async ({ page }) => {
    const container = page.locator('.document-container');
    const box = await container.boundingBox();
    // Base width is 816px, zoomed should be larger (up to 1224px at 1.5x)
    expect(box.width).toBeGreaterThan(816);
  });

  test('zoom scale factor is applied correctly', async ({ page }) => {
    const scale = await page.evaluate(() => {
      const container = document.querySelector('.document-container');
      return container.getBoundingClientRect().width / container.offsetWidth;
    });
    // Scale should be > 1 (document is zoomed in)
    expect(scale).toBeGreaterThan(1);
    // Scale should not exceed 1.5
    expect(scale).toBeLessThanOrEqual(1.5 + 0.01);
  });

  test('--doc-zoom CSS variable is set as a resolved number', async ({ page }) => {
    const docZoom = await page.evaluate(() => {
      const container = document.querySelector('.document-container');
      return getComputedStyle(container).getPropertyValue('--doc-zoom');
    });
    // Should be a plain number, not a min()/calc() expression
    const parsed = parseFloat(docZoom);
    expect(parsed).toBeGreaterThan(0);
    expect(parsed).toBeLessThanOrEqual(1.5);
    // Verify it doesn't contain CSS functions (the bug that broke Firefox)
    expect(docZoom.trim()).not.toContain('min(');
    expect(docZoom.trim()).not.toContain('calc(');
  });
});
