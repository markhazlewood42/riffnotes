import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { getContainerScale } from "../../utils/getContainerScale";
import { Check, Trash2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getChordsForLine,
  getRightAnnotationsForLine,
} from "../../context/annotationReducer";
import { useLyricSheet } from "../../context/LyricSheetContext";
import { BEND_INSET, LEADER_OVERSHOOT } from "../../hooks/useAnnotationLayout";
import { supabase } from "../../supabase";

const VERTICAL_TICK_HEIGHT = 14; // px — height of the vertical tick at the start of the leader line

/**
 * Individual right-column annotation (text note or image).
 * Encapsulates its own hover/confirm delete state, and in-place contentEditable editing.
 */
function RightAnnotationItem({ annotation, lineId, topOffset, isLocked, onDelete }) {
  const { startEditingNote, stopEditingNote, editingNote, dispatch, editorRef } =
    useLyricSheet();
  const [hoverState, setHoverState] = useState("idle");
  const wrapperRef = useRef(null);
  const editableRef = useRef(null);
  // Prevents the Enter keydown handler and the subsequent onBlur from both firing
  const isSubmittingRef = useRef(false);

  const isEditing =
    !isLocked &&
    editingNote?.lineId === lineId &&
    editingNote?.charOffset === annotation.charOffset &&
    editingNote?.initialValue != null; // only true when editing an existing annotation

  // Set text content synchronously (before paint + before layout RAF) so the
  // span has its correct height from the very first frame.
  useLayoutEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.textContent = annotation.value;
    }
  }, [isEditing]); // intentionally omit annotation.value — only run on isEditing toggle

  // Focus and place cursor at end after paint
  useEffect(() => {
    if (!isEditing || !editableRef.current) return;
    const el = editableRef.current;
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [isEditing]);

  const submitEdit = useCallback(() => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const value = editableRef.current?.textContent?.trim() ?? "";
    if (value) {
      dispatch({
        type: "ADD_RIGHT_NOTE",
        payload: {
          lineId,
          charOffset: annotation.charOffset,
          value,
          style: annotation.style || "default",
        },
      });
    }
    stopEditingNote();
    editorRef.current?.commands.focus();
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 0);
  }, [dispatch, lineId, annotation, stopEditingNote, editorRef]);

  const cancelEdit = useCallback(() => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    stopEditingNote();
    editorRef.current?.commands.focus();
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 0);
  }, [stopEditingNote, editorRef]);

  const handleEditKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitEdit();
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [submitEdit, cancelEdit],
  );

  const handleEditInput = useCallback((e) => {
    const el = e.currentTarget;
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode || !el.contains(sel.anchorNode)) return;
    const anchorOffset = sel.anchorOffset;
    const text = el.textContent || "";
    const replaced = text.replace(/-->/g, "→").replace(/->/g, "→");
    if (replaced !== text) {
      // Compute caret adjustment from text before the caret only
      const beforeText = text.slice(0, anchorOffset);
      const beforeReplaced = beforeText.replace(/-->/g, "→").replace(/->/g, "→");
      el.textContent = replaced;
      if (el.firstChild) {
        const newPos = Math.max(0, Math.min(beforeReplaced.length, replaced.length));
        const range = document.createRange();
        range.setStart(el.firstChild, newPos);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, []);

  // Dismiss confirm state on outside click
  useEffect(() => {
    if (hoverState !== "confirm") return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setHoverState("idle");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [hoverState]);

  const handleMouseEnter = () => {
    if (!isLocked && !isEditing && hoverState === "idle") setHoverState("hover");
  };
  const handleMouseLeave = () => {
    if (hoverState === "hover") setHoverState("idle");
  };

  const actions = !isLocked && (
    <div className="annotation-actions">
      <button
        className={`annotation-action-btn${hoverState === "idle" ? " annotation-action-btn--hidden" : ""}${hoverState === "confirm" ? " annotation-action-btn--disabled" : ""}`}
        disabled={hoverState === "confirm"}
        onMouseDown={
          hoverState === "hover"
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                setHoverState("confirm");
              }
            : undefined
        }
        aria-label="Delete annotation"
      >
        <Trash2 size={12} />
      </button>
      <button
        aria-label="Confirm delete"
        className={`annotation-action-btn annotation-action-btn--confirm${hoverState !== "confirm" ? " annotation-action-btn--hidden" : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(annotation.id);
        }}
      >
        <Check size={12} />
      </button>
    </div>
  );

  const isImage = annotation.type === "image";

  return (
    <div
      ref={wrapperRef}
      data-annotation-id={annotation.id}
      className={`right-annotation-actions-wrapper${isImage ? " right-annotation-actions-wrapper--image" : ""}`}
      style={topOffset != null ? { top: `${topOffset}px` } : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isImage ? (
        <div className="right-annotation-image-container">
          <img
            className="right-annotation-image"
            src={annotation.url}
            alt="Annotation"
          />
        </div>
      ) : isEditing ? (
        <span
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Edit annotation"
          aria-multiline={false}
          className={`right-annotation-text style-${annotation.style || "default"} is-editing`}
          onKeyDown={handleEditKeyDown}
          onInput={handleEditInput}
          onBlur={cancelEdit}
          onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData
              .getData("text/plain")
              .replace(/\r?\n/g, " ");
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }}
        />
      ) : (
        <span
          className={`right-annotation-text style-${annotation.style || "default"}${hoverState !== "idle" ? " is-active" : ""}`}
          onClick={() =>
            !isLocked &&
            startEditingNote(lineId, annotation.charOffset ?? 0, annotation.value)
          }
        >
          {annotation.value}
        </span>
      )}
      {actions}
    </div>
  );
}

function AnnotatedLineView(props) {
  const { node } = props;
  const lineId = node.attrs.lineId;
  const {
    state,
    dispatch,
    editingNote,
    stopEditingNote,
    editorRef,
    isLocked,
    layoutMap,
  } = useLyricSheet();

  const stateRef = useRef(state);
  stateRef.current = state;

  // All right-column annotations (text + image) for this line, sorted by charOffset
  const rightAnnotations = useMemo(
    () => getRightAnnotationsForLine(state, lineId),
    [state, lineId],
  );

  const chords = useMemo(
    () => getChordsForLine(state, lineId),
    [state, lineId],
  );

  const sortedChords = useMemo(
    () => [...chords].sort((a, b) => a.charOffset - b.charOffset),
    [chords],
  );

  const isEditingNote = editingNote?.lineId === lineId;
  // Creating a new annotation (via BubbleMenu) — no existing annotation at this charOffset
  const isCreatingNew = isEditingNote && editingNote?.initialValue == null;
  const showRightColumn = rightAnnotations.length > 0 || isEditingNote;

  // Always show all annotations — existing annotations handle their own editing state
  const displayAnnotations = rightAnnotations;

  // Items that need leader lines: all annotations + the new-annotation input slot (if creating)
  const leaderItems = useMemo(() => {
    const items = displayAnnotations.map((ann) => ({
      id: ann.id,
      charOffset: ann.charOffset,
    }));
    if (isCreatingNew) {
      items.push({
        id: `editing-${lineId}`,
        charOffset: editingNote.charOffset,
      });
    }
    items.sort((a, b) => a.charOffset - b.charOffset);
    return items;
  }, [displayAnnotations, isCreatingNew, editingNote, lineId]);

  const wrapperRef = useRef(null);
  const noteInputRef = useRef(null);
  const leaderRef = useRef(null);
  const [pullbackMap, setPullbackMap] = useState({});
  const [leaderWidth, setLeaderWidth] = useState(0);
  const [chordLeftPositions, setChordLeftPositions] = useState({});

  // Auto-focus the inline input when editing starts
  useEffect(() => {
    if (isEditingNote && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [isEditingNote]);

  // Measure pullback for each leader item's charOffset
  const measureAllPullbacks = useCallback(() => {
    if (!showRightColumn || !wrapperRef.current) {
      setPullbackMap({});
      return;
    }
    const contentEl = wrapperRef.current.querySelector(".lyric-content");
    if (!contentEl) return;

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const zoomEl = wrapperRef.current.closest(".document-container");
    const zoom = getContainerScale(zoomEl);

    // Measure the actual glyph top of the first character to use as a reference
    // for the first-line guard. wrapperRect.top is the element-box top, which sits
    // above the text glyphs by ~half the line-height gap (e.g. ~5px at 200% lh /
    // 11px font). Comparing rangeRect.top against the glyph top avoids false positives.
    let firstLineGlyphTop = wrapperRect.top;
    {
      const fw = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
      const fn = fw.nextNode();
      if (fn && fn.length > 0) {
        const fr = document.createRange();
        fr.setStart(fn, 0);
        fr.setEnd(fn, Math.min(1, fn.length));
        firstLineGlyphTop = fr.getBoundingClientRect().top;
      }
    }

    const newMap = {};
    for (const item of leaderItems) {
      if (item.charOffset == null) continue;

      // Use SHOW_ALL so <br> (hardBreak) nodes are visited and counted as 1
      // character each, matching ProseMirror's model offset for positions after a break.
      const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_ALL);
      let textNode = null;
      let accumulated = 0;
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (n.nodeType === Node.ELEMENT_NODE) {
          if (n.nodeName === 'BR') {
            if (accumulated + 1 > item.charOffset) break;
            accumulated += 1;
            if (accumulated === item.charOffset) continue;
          }
        } else if (n.nodeType === Node.TEXT_NODE) {
          if (accumulated + n.length >= item.charOffset) {
            textNode = n;
            break;
          }
          accumulated += n.length;
        }
      }
      if (!textNode) continue;

      const localOffset = item.charOffset - accumulated;
      const range = document.createRange();
      range.setStart(textNode, localOffset);
      range.setEnd(textNode, textNode.length);

      const rangeRect = range.getBoundingClientRect();
      // Guard: if charOffset landed on a later visual sub-line (e.g. after a hard
      // break), rangeRect.top will be a full line-height below firstLineGlyphTop.
      // Skip it so pullback defaults to 0 — tick at the leader-container edge.
      if (rangeRect.top > firstLineGlyphTop + 3 * zoom) continue;
      newMap[item.id] = (wrapperRect.right - rangeRect.left) / zoom;
    }
    setPullbackMap(newMap);
  }, [showRightColumn, leaderItems]);

  // Measure actual pixel left positions for chord labels using collapsed DOM Ranges.
  // Chords are centered over their selection: measure start and end pixel positions,
  // find the visual center, then subtract half the rendered label width.
  const measureChordPositions = useCallback(() => {
    if (!wrapperRef.current || sortedChords.length === 0) {
      setChordLeftPositions({});
      return;
    }
    const contentEl = wrapperRef.current.querySelector(".lyric-content");
    if (!contentEl) return;

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const zoomEl = wrapperRef.current.closest(".document-container");
    const zoom = getContainerScale(zoomEl);

    // Returns the pixel offset (from wrapper left) of a collapsed range at charOffset.
    const measurePixelOffset = (offset) => {
      const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_ALL);
      let textNode = null;
      let accumulated = 0;
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (n.nodeType === Node.ELEMENT_NODE) {
          if (n.nodeName === 'BR') {
            if (accumulated + 1 > offset) break;
            accumulated += 1;
            if (accumulated === offset) continue;
          }
        } else if (n.nodeType === Node.TEXT_NODE) {
          if (accumulated + n.length >= offset) {
            textNode = n;
            break;
          }
          accumulated += n.length;
        }
      }
      if (!textNode) return null;
      const localOffset = offset - accumulated;
      const range = document.createRange();
      range.setStart(textNode, localOffset);
      range.setEnd(textNode, localOffset);
      return (range.getBoundingClientRect().left - wrapperRect.left) / zoom;
    };

    const positions = {};
    for (const chord of sortedChords) {
      const startPx = measurePixelOffset(chord.charOffset);
      if (startPx == null) continue;

      const endOffset = chord.charOffsetEnd ?? chord.charOffset;
      const endPx =
        endOffset !== chord.charOffset
          ? (measurePixelOffset(endOffset) ?? startPx)
          : startPx;

      const selectionCenterPx = (startPx + endPx) / 2;

      // Subtract half the rendered label width so the chord text is visually centered.
      const chordEl = wrapperRef.current.querySelector(
        `[data-chord-id="${chord.id}"]`,
      );
      const labelWidth = chordEl ? chordEl.offsetWidth / zoom : 0;

      positions[chord.id] = selectionCenterPx - labelWidth / 2;
    }
    setChordLeftPositions(positions);
  }, [sortedChords]);

  const handleNoteSubmit = useCallback(
    (value) => {
      if (value.trim()) {
        dispatch({
          type: "ADD_RIGHT_NOTE",
          payload: {
            lineId,
            charOffset: editingNote.charOffset,
            value: value.trim(),
            style: "default",
          },
        });
      }
      stopEditingNote();
      editorRef.current?.commands.focus();
    },
    [dispatch, lineId, editingNote, stopEditingNote, editorRef],
  );

  const handleNoteCancel = useCallback(() => {
    stopEditingNote();
    editorRef.current?.commands.focus();
  }, [stopEditingNote, editorRef]);

  const handleNoteChange = useCallback((e) => {
    const target = e.target;
    const raw = target.value;
    const replaced = raw.replace(/-->/g, "→").replace(/->/g, "→");
    if (replaced !== raw) {
      const caret = typeof target.selectionStart === "number" ? target.selectionStart : raw.length;
      // Compute adjustment from text before the caret only
      const beforeRaw = raw.slice(0, caret);
      const beforeReplaced = beforeRaw.replace(/-->/g, "→").replace(/->/g, "→");
      const pos = Math.max(0, Math.min(caret - (beforeRaw.length - beforeReplaced.length), replaced.length));
      target.value = replaced;
      target.setSelectionRange(pos, pos);
    }
  }, []);

  const handleNotePaste = useCallback(
    async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;

          // Show image instantly with a local blob URL
          const blobUrl = URL.createObjectURL(file);
          dispatch({
            type: "ADD_IMAGE",
            payload: {
              lineId,
              charOffset: editingNote.charOffset,
              url: blobUrl,
            },
          });
          stopEditingNote();
          editorRef.current?.commands.focus();

          // Upload to Storage in the background, then swap URL
          const ext = file.type.split("/")[1] || "png";
          const fileName = `${crypto.randomUUID()}.${ext}`;

          const { error } = await supabase.storage
            .from("annotation-images")
            .upload(fileName, file, { contentType: file.type });

          if (error) {
            console.error("Image upload failed:", error);
            const failedAnn = Object.values(
              stateRef.current.annotations,
            ).find((a) => a.type === "image" && a.url === blobUrl);
            if (failedAnn) {
              dispatch({
                type: "DELETE_ANNOTATION",
                payload: { id: failedAnn.id },
              });
            }
            URL.revokeObjectURL(blobUrl);
            return;
          }

          const { data: urlData } = supabase.storage
            .from("annotation-images")
            .getPublicUrl(fileName);

          // Find the annotation we just created and update its URL
          const ann = Object.values(stateRef.current.annotations).find(
            (a) => a.type === "image" && a.url === blobUrl,
          );
          if (ann) {
            dispatch({
              type: "UPDATE_ANNOTATION",
              payload: { id: ann.id, changes: { url: urlData.publicUrl } },
            });
          }
          URL.revokeObjectURL(blobUrl);
          return;
        }
      }
    },
    [dispatch, lineId, editingNote, stopEditingNote, editorRef],
  );

  const handleDeleteAnnotation = useCallback(
    (annotationId) => {
      if (isLocked) return;
      dispatch({ type: "DELETE_ANNOTATION", payload: { id: annotationId } });
    },
    [dispatch, isLocked],
  );

  const handleDeleteChord = (chordId, e) => {
    e.stopPropagation();
    if (isLocked) return;
    dispatch({ type: "DELETE_ANNOTATION", payload: { id: chordId } });
  };

  useEffect(() => {
    measureAllPullbacks();
  }, [measureAllPullbacks, node.nodeSize]);

  useEffect(() => {
    measureChordPositions();
  }, [measureChordPositions, node.nodeSize]);

  // Measure leader container width for SVG viewBox
  const measureLeader = useCallback(() => {
    if (!leaderRef.current) return;
    const container = leaderRef.current.closest(".document-container");
    const zoom = getContainerScale(container);
    const rect = leaderRef.current.getBoundingClientRect();
    setLeaderWidth(rect.width / zoom);
  }, []);

  useEffect(() => {
    measureLeader();
  }, [measureLeader, showRightColumn, node.nodeSize]);

  // Build chord overlay — pixel positions from DOM measurement, ch fallback on first render
  const chordOverlay =
    sortedChords.length > 0 ? (
      <div className="chord-overlay" contentEditable={false}>
        {sortedChords.map((chord) => (
          <span
            key={chord.id}
            data-chord-id={chord.id}
            className="chord-positioned"
            style={{
              left:
                chordLeftPositions[chord.id] != null
                  ? `${chordLeftPositions[chord.id]}px`
                  : `${chord.charOffset}ch`,
            }}
            title={`Chord: ${chord.value} (click to delete)`}
            onClick={(e) => handleDeleteChord(chord.id, e)}
          >
            {chord.value}
          </span>
        ))}
      </div>
    ) : null;

  return (
    <NodeViewWrapper
      className={`annotated-line ${showRightColumn ? "has-right-annotation" : ""}`}
      data-line-id={lineId}
    >
      <div className="lyric-content-wrapper" ref={wrapperRef}>
        {chordOverlay}
        <NodeViewContent className="lyric-content" />
      </div>
      {showRightColumn && (
        <div
          ref={leaderRef}
          className="leader-line-container"
          contentEditable={false}
        >
          {leaderItems.map((item) => {
            const pullback = pullbackMap[item.id] || 0;
            const layout = layoutMap?.[item.id];
            const displacement = layout?.displacement ?? 0;
            const svgW = (leaderWidth || 1) + pullback + 2 + LEADER_OVERSHOOT;
            const svgH =
              VERTICAL_TICK_HEIGHT + (displacement > 0 ? displacement + 2 : 2);

            return (
              <svg
                key={item.id}
                className="leader-line-svg"
                style={{
                  left: `-${pullback + 1}px`,
                  width: `${svgW}px`,
                  height: `${svgH}px`,
                  top: `-${VERTICAL_TICK_HEIGHT - 3}px`,
                }}
                viewBox={`0 0 ${svgW} ${svgH}`}
              >
                {/* Vertical tick at leader start */}
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={VERTICAL_TICK_HEIGHT}
                  className="leader-line leader-line-tick"
                />
                {displacement > 0 && leaderWidth > 0 ? (
                  <>
                    <line
                      x1="0"
                      y1={VERTICAL_TICK_HEIGHT}
                      x2={Math.max(0, svgW - LEADER_OVERSHOOT - BEND_INSET)}
                      y2={VERTICAL_TICK_HEIGHT}
                      className="leader-line"
                        />
                    <line
                      x1={Math.max(0, svgW - LEADER_OVERSHOOT - BEND_INSET)}
                      y1={VERTICAL_TICK_HEIGHT}
                      x2={svgW}
                      y2={VERTICAL_TICK_HEIGHT + displacement}
                      className="leader-line"
                        />
                  </>
                ) : (
                  <line
                    x1="0"
                    y1={VERTICAL_TICK_HEIGHT}
                    x2={svgW}
                    y2={VERTICAL_TICK_HEIGHT}
                    className="leader-line"
                    />
                )}
              </svg>
            );
          })}
        </div>
      )}
      {showRightColumn && <div className="right-annotation-column" contentEditable={false}>
        {displayAnnotations.map((annotation) => {
          const layout = layoutMap?.[annotation.id];
          const topOffset = layout ? layout.top - layout.lineTop : null;
          return (
            <RightAnnotationItem
              key={annotation.id}
              annotation={annotation}
              lineId={lineId}
              topOffset={topOffset}
              isLocked={isLocked}
              onDelete={handleDeleteAnnotation}
            />
          );
        })}
        {isCreatingNew && (
          <div
            data-annotation-id={`editing-${lineId}`}
            className="right-annotation-actions-wrapper"
            style={(() => {
              const layout = layoutMap?.[`editing-${lineId}`];
              const topOffset = layout ? layout.top - layout.lineTop : null;
              return topOffset != null ? { top: `${topOffset}px` } : undefined;
            })()}
          >
            <input
              ref={noteInputRef}
              className="note-inline-input"
              type="text"
              placeholder="type note or paste image"
              defaultValue={editingNote?.initialValue ?? ""}
              onPaste={handleNotePaste}
              onChange={handleNoteChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleNoteSubmit(e.target.value);
                } else if (e.key === "Escape") {
                  handleNoteCancel();
                }
              }}
              onBlur={(e) => {
                handleNoteCancel();
              }}
            />
          </div>
        )}
      </div>}
    </NodeViewWrapper>
  );
}

export default AnnotatedLineView;
