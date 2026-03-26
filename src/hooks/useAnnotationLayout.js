import { useCallback, useEffect, useRef } from "react";
import { getContainerScale } from "../utils/getContainerScale";

// Named constants
export const ANNOTATION_GAP = 10; // px — minimum gap between stacked annotations
export const BEND_INSET = 12; // px — elbow bend point distance from column divider
export const LEADER_OVERSHOOT = 10; // px — how far leader line extends past the column divider
const TEXT_NOTE_OFFSET = 8; // px — CSS top offset for text notes
const IMAGE_OFFSET = 0; // px — CSS top offset for image annotations
const INPUT_OFFSET = 8; // px — CSS top offset for inline editing input

/**
 * Pure stacking algorithm. Takes an array of { id, naturalTop, height, lineTop }
 * sorted top-to-bottom, returns a layoutMap keyed by id.
 */
export function computeStackedLayout(entries) {
  const layoutMap = {};
  let prevBottom = -Infinity;

  for (const { id, naturalTop, height, lineTop } of entries) {
    const placedTop = Math.max(naturalTop, prevBottom + ANNOTATION_GAP);
    const displacement = placedTop - naturalTop;
    layoutMap[id] = { top: placedTop, height, displacement, lineTop };
    prevBottom = placedTop + height;
  }

  return layoutMap;
}

/**
 * Determines the per-type CSS offset for an individual annotation element.
 */
function getAnnotationOffsetForElement(el) {
  if (el.querySelector(".note-inline-input")) return INPUT_OFFSET;
  if (el.classList.contains("right-annotation-actions-wrapper--image"))
    return IMAGE_OFFSET;
  return TEXT_NOTE_OFFSET;
}

/**
 * Hook that measures annotation positions in the DOM, computes stacked layout,
 * and writes the result directly to context via setLayoutMap.
 *
 * @param {React.RefObject} bodyRef — ref to .document-body element
 * @param {object} annotations — state.annotations from context (used as effect trigger)
 * @param {object|null} editingNote — current editing note (used as effect trigger)
 * @param {function} setLayoutMap — setter from LyricSheetContext
 */
export function useAnnotationLayout(
  bodyRef,
  annotations,
  editingNote,
  setLayoutMap,
) {
  // Store annotations in a ref so the measure callback doesn't depend on them
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;
  const editingNoteRef = useRef(editingNote);
  editingNoteRef.current = editingNote;

  const measure = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;

    const container = body.closest(".document-container");
    const zoom = getContainerScale(container);
    const bodyRect = body.getBoundingClientRect();
    const bodyTop = bodyRect.top / zoom;

    // Iterate all line elements in document order
    const lineEls = body.querySelectorAll("[data-line-id]");
    const entries = [];

    for (const lineEl of lineEls) {
      const lineRect = lineEl.getBoundingClientRect();
      const lineTop = lineRect.top / zoom - bodyTop;

      // Find all annotation elements in this line (each has data-annotation-id)
      const annotationEls = lineEl.querySelectorAll("[data-annotation-id]");
      for (const annEl of annotationEls) {
        const id = annEl.dataset.annotationId;
        const offset = getAnnotationOffsetForElement(annEl);
        const height = annEl.getBoundingClientRect().height / zoom;
        const naturalTop = lineTop + offset;
        entries.push({ id, naturalTop, height, lineTop });
      }
    }

    const newLayout = computeStackedLayout(entries);
    setLayoutMap(newLayout);
  }, [bodyRef, setLayoutMap]);

  // Recalculate when annotations or editing state changes
  useEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [measure, annotations, editingNote]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => requestAnimationFrame(measure);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [measure]);

  // Re-measure when the DOM changes (e.g., TipTap renders NodeViews after initial mount).
  // Without this, the initial measure can run before annotation elements exist, producing
  // an empty layoutMap that causes annotations to overlap.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    let rafId;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });
    observer.observe(body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [bodyRef, measure]);
}
