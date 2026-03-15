import { useCallback, useEffect, useRef } from "react";

// Named constants
export const ANNOTATION_GAP = 10; // px — minimum gap between stacked annotations
export const BEND_INSET = 12; // px — elbow bend point distance from column divider
export const LEADER_OVERSHOOT = 10; // px — how far leader line extends past the column divider
const TEXT_NOTE_OFFSET = 8; // px — CSS top offset for text notes
const IMAGE_OFFSET = 0; // px — CSS top offset for image annotations
const INPUT_OFFSET = 8; // px — CSS top offset for inline editing input

/**
 * Pure stacking algorithm. Takes an array of { lineId, naturalTop, height, lineTop }
 * sorted top-to-bottom, returns a layoutMap.
 */
export function computeStackedLayout(entries) {
  const layoutMap = {};
  let prevBottom = -Infinity;

  for (const { lineId, naturalTop, height, lineTop } of entries) {
    const placedTop = Math.max(naturalTop, prevBottom + ANNOTATION_GAP);
    const displacement = placedTop - naturalTop;
    layoutMap[lineId] = { top: placedTop, height, displacement, lineTop };
    prevBottom = placedTop + height;
  }

  return layoutMap;
}

/**
 * Determines the annotation type for a line element by checking which
 * annotation content is rendered, and returns the per-type CSS offset.
 */
function getAnnotationOffset(lineEl) {
  if (lineEl.querySelector(".note-inline-input")) return INPUT_OFFSET;
  if (lineEl.querySelector(".right-annotation-actions-wrapper--image"))
    return IMAGE_OFFSET;
  if (lineEl.querySelector(".right-annotation-actions-wrapper"))
    return TEXT_NOTE_OFFSET;
  return null; // no annotation
}

/**
 * Measures the rendered height of an annotation element.
 */
function getAnnotationHeight(lineEl, zoom) {
  const el = lineEl.querySelector(
    ".right-annotation-actions-wrapper, .note-inline-input",
  );
  if (!el) return 0;
  return el.getBoundingClientRect().height / zoom;
}

/**
 * Hook that measures line positions in the DOM, computes stacked layout,
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
    const zoom = container
      ? parseFloat(getComputedStyle(container).zoom) || 1
      : 1;
    const bodyRect = body.getBoundingClientRect();
    const bodyTop = bodyRect.top / zoom;

    // Iterate all line elements in document order
    const lineEls = body.querySelectorAll("[data-line-id]");
    const entries = [];

    for (const lineEl of lineEls) {
      const lineId = lineEl.getAttribute("data-line-id");
      const offset = getAnnotationOffset(lineEl);
      if (offset === null) continue; // no annotation on this line

      // Natural top = line's position + per-type CSS offset
      const lineRect = lineEl.getBoundingClientRect();
      const lineTop = lineRect.top / zoom - bodyTop;
      const naturalTop = lineTop + offset;
      const height = getAnnotationHeight(lineEl, zoom);

      entries.push({ lineId, naturalTop, height, lineTop });
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
}
