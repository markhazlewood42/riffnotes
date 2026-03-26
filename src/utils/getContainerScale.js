/**
 * Returns the visual scale factor of the document container.
 * Works with both CSS zoom and CSS transform: scale() — fully browser-agnostic.
 * Compares the rendered (scaled) width from getBoundingClientRect() to the
 * layout (unscaled) width from offsetWidth.
 */
export function getContainerScale(container) {
  if (!container) return 1;
  const width = container.offsetWidth;
  if (width === 0) return 1;
  return container.getBoundingClientRect().width / width;
}
