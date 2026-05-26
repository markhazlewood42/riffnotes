import { useEffect, useRef } from "react";

const MAX_ZOOM = 1.5;
const VIEWPORT_PADDING = 40; // px — matches .app-container horizontal padding (20px * 2)

/**
 * Computes the responsive document zoom level and applies it via inline style.
 * Firefox doesn't support min()/viewport units inside CSS `zoom`, so we
 * compute the value in JS and set it as both a CSS custom property (--doc-zoom)
 * and a zoom style on the container.
 *
 * Also syncs the document-actions bar width to match the zoomed document.
 *
 * @param {React.RefObject} containerRef — ref to .document-container
 * @param {React.RefObject} actionsRef — ref to .document-actions (optional)
 */
export function useDocumentZoom(containerRef, actionsRef) {
  // Track the print media query so we skip zoom during print
  const printMQRef = useRef(
    typeof window !== "undefined" ? window.matchMedia("print") : null,
  );

  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      if (!container) return;
      // Don't apply zoom during print
      if (printMQRef.current?.matches) return;

      const docWidth =
        parseFloat(
          getComputedStyle(container).getPropertyValue("--document-max-width"),
        ) || 816;
      const available = window.innerWidth - VIEWPORT_PADDING;
      const zoom = Math.min(MAX_ZOOM, available / docWidth);

      container.style.zoom = String(zoom);
      container.style.setProperty("--doc-zoom", String(zoom));

      // Sync actions bar width to match zoomed document
      if (actionsRef?.current) {
        actionsRef.current.style.width = `${docWidth * zoom}px`;
      }
    };

    update();
    window.addEventListener("resize", update);

    // Reset zoom for print, restore after
    const printMQ = printMQRef.current;
    const handlePrint = (e) => {
      const container = containerRef.current;
      if (!container) return;
      if (e.matches) {
        container.style.zoom = "1";
      } else {
        update();
      }
    };
    printMQ?.addEventListener("change", handlePrint);

    return () => {
      window.removeEventListener("resize", update);
      printMQ?.removeEventListener("change", handlePrint);
    };
  }, [containerRef, actionsRef]);
}
