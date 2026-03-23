import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { Check, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 * Encapsulates its own hover/confirm delete state.
 */
function RightAnnotationItem({ annotation, topOffset, isLocked, onDelete }) {
  const [hoverState, setHoverState] = useState("idle");
  const wrapperRef = useRef(null);

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
    if (!isLocked && hoverState === "idle") setHoverState("hover");
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
      >
        <Trash2 size={12} />
      </button>
      <button
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
      ) : (
        <span
          className={`right-annotation-text style-${annotation.style || "default"}${hoverState !== "idle" ? " is-active" : ""}`}
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
  const showRightColumn = rightAnnotations.length > 0 || isEditingNote;

  // When editing, hide any existing annotation at the same charOffset (it will be replaced on submit)
  const displayAnnotations = useMemo(() => {
    if (!isEditingNote) return rightAnnotations;
    return rightAnnotations.filter(
      (a) => a.charOffset !== editingNote.charOffset,
    );
  }, [rightAnnotations, isEditingNote, editingNote]);

  // Items that need leader lines: displayed annotations + editing input
  const leaderItems = useMemo(() => {
    const items = displayAnnotations.map((ann) => ({
      id: ann.id,
      charOffset: ann.charOffset,
    }));
    if (isEditingNote) {
      items.push({
        id: `editing-${lineId}`,
        charOffset: editingNote.charOffset,
      });
    }
    items.sort((a, b) => a.charOffset - b.charOffset);
    return items;
  }, [displayAnnotations, isEditingNote, editingNote, lineId]);

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
    const zoom = zoomEl ? parseFloat(getComputedStyle(zoomEl).zoom) || 1 : 1;

    const newMap = {};
    for (const item of leaderItems) {
      if (item.charOffset == null) continue;

      const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
      let textNode = null;
      let accumulated = 0;
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (accumulated + n.length >= item.charOffset) {
          textNode = n;
          break;
        }
        accumulated += n.length;
      }
      if (!textNode) continue;

      const localOffset = item.charOffset - accumulated;
      const range = document.createRange();
      range.setStart(textNode, localOffset);
      range.setEnd(textNode, textNode.length);

      const rangeRect = range.getBoundingClientRect();
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
    const zoom = zoomEl ? parseFloat(getComputedStyle(zoomEl).zoom) || 1 : 1;

    // Returns the pixel offset (from wrapper left) of a collapsed range at charOffset.
    const measurePixelOffset = (offset) => {
      const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
      let textNode = null;
      let accumulated = 0;
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (accumulated + n.length >= offset) {
          textNode = n;
          break;
        }
        accumulated += n.length;
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
  }, [measureAllPullbacks]);

  useEffect(() => {
    measureChordPositions();
  }, [measureChordPositions, node.textContent]);

  // Measure leader container width for SVG viewBox
  const measureLeader = useCallback(() => {
    if (!leaderRef.current) return;
    const container = leaderRef.current.closest(".document-container");
    const zoom = container
      ? parseFloat(getComputedStyle(container).zoom) || 1
      : 1;
    const rect = leaderRef.current.getBoundingClientRect();
    setLeaderWidth(rect.width / zoom);
  }, []);

  useEffect(() => {
    measureLeader();
  }, [measureLeader, showRightColumn]);

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
                  top: `-${VERTICAL_TICK_HEIGHT - 4}px`,
                }}
                viewBox={`0 0 ${svgW} ${svgH}`}
                preserveAspectRatio="none"
              >
                {/* Vertical tick at leader start */}
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={VERTICAL_TICK_HEIGHT}
                  className="leader-line leader-line-tick"
                  vectorEffect="non-scaling-stroke"
                />
                {displacement > 0 && leaderWidth > 0 ? (
                  <>
                    <line
                      x1="0"
                      y1={VERTICAL_TICK_HEIGHT}
                      x2={Math.max(0, svgW - LEADER_OVERSHOOT - BEND_INSET)}
                      y2={VERTICAL_TICK_HEIGHT}
                      className="leader-line"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={Math.max(0, svgW - LEADER_OVERSHOOT - BEND_INSET)}
                      y1={VERTICAL_TICK_HEIGHT}
                      x2={svgW}
                      y2={VERTICAL_TICK_HEIGHT + displacement}
                      className="leader-line"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                ) : (
                  <line
                    x1="0"
                    y1={VERTICAL_TICK_HEIGHT}
                    x2={svgW}
                    y2={VERTICAL_TICK_HEIGHT}
                    className="leader-line"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
            );
          })}
        </div>
      )}
      <div className="right-annotation-column" contentEditable={false}>
        {displayAnnotations.map((annotation) => {
          const layout = layoutMap?.[annotation.id];
          const topOffset = layout ? layout.top - layout.lineTop : null;
          return (
            <RightAnnotationItem
              key={annotation.id}
              annotation={annotation}
              topOffset={topOffset}
              isLocked={isLocked}
              onDelete={handleDeleteAnnotation}
            />
          );
        })}
        {isEditingNote && (
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
              onPaste={handleNotePaste}
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
      </div>
    </NodeViewWrapper>
  );
}

export default AnnotatedLineView;
