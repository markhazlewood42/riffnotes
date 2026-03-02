import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useLyricSheet } from '../../context/LyricSheetContext';
import { getRightNoteForLine, getChordsForLine } from '../../context/annotationReducer';

function AnnotatedLineView(props) {
  const { node } = props;
  const lineId = node.attrs.lineId;
  const { state, dispatch } = useLyricSheet();

  const rightNote = useMemo(
    () => getRightNoteForLine(state, lineId),
    [state, lineId]
  );

  const chords = useMemo(
    () => getChordsForLine(state, lineId),
    [state, lineId]
  );

  const handleDeleteRightNote = (e) => {
    e.stopPropagation();
    if (rightNote) {
      dispatch({ type: 'DELETE_ANNOTATION', payload: { id: rightNote.id } });
    }
  };

  // Sort chords by charOffset for rendering
  const sortedChords = useMemo(
    () => [...chords].sort((a, b) => a.charOffset - b.charOffset),
    [chords]
  );

  const handleDeleteChord = (chordId, e) => {
    e.stopPropagation();
    dispatch({ type: 'DELETE_ANNOTATION', payload: { id: chordId } });
  };

  // Build chord overlay — we render chord labels positioned above the text
  const chordOverlay = sortedChords.length > 0 ? (
    <div className="chord-overlay" contentEditable={false}>
      {sortedChords.map((chord) => (
        <span
          key={chord.id}
          className="chord-positioned"
          style={{ left: `${chord.charOffset}ch` }}
          title={`Chord: ${chord.value} (click to delete)`}
          onClick={(e) => handleDeleteChord(chord.id, e)}
        >
          {chord.value}
        </span>
      ))}
    </div>
  ) : null;

  const styleClass = rightNote
    ? `style-${rightNote.style || 'default'}`
    : '';

  const hasAnnotation = !!rightNote;
  const wrapperRef = useRef(null);
  const [pullbackPx, setPullbackPx] = useState(0);

  const measurePullback = useCallback(() => {
    if (!hasAnnotation || rightNote.charOffset == null || !wrapperRef.current) return;
    const contentEl = wrapperRef.current.querySelector('.lyric-content');
    if (!contentEl) return;

    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
    let textNode = null;
    let accumulated = 0;
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (accumulated + n.length >= rightNote.charOffset) {
        textNode = n;
        break;
      }
      accumulated += n.length;
    }
    if (!textNode) return;

    const localOffset = rightNote.charOffset - accumulated;
    const range = document.createRange();
    range.setStart(textNode, localOffset);
    range.setEnd(textNode, textNode.length);

    const rangeRect = range.getBoundingClientRect();
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    // getBoundingClientRect returns zoomed (screen) pixels; marginLeft is CSS pixels.
    // Divide by zoom so the margin value matches the visual offset correctly.
    const zoomEl = wrapperRef.current.closest('.document-container');
    const zoom = zoomEl ? (parseFloat(getComputedStyle(zoomEl).zoom) || 1) : 1;
    const px = (wrapperRect.right - rangeRect.left) / zoom;
    setPullbackPx(px);
  }, [hasAnnotation, rightNote]);

  useEffect(() => {
    measurePullback();
  }, [measurePullback]);

  return (
    <NodeViewWrapper
      className={`annotated-line ${hasAnnotation ? 'has-right-annotation' : ''}`}
      data-line-id={lineId}
    >
      <div className="lyric-content-wrapper" ref={wrapperRef}>
        {chordOverlay}
        <NodeViewContent className="lyric-content" />
      </div>
      {hasAnnotation && (
        <>
          <span
            className="leader-bridge"
            contentEditable={false}
            style={pullbackPx > 0 ? { marginLeft: `-${pullbackPx}px` } : undefined}
          />
          <div className="right-annotation-column" contentEditable={false}>
            <span
              className={`right-annotation-text ${styleClass}`}
              title="Click to delete"
              onClick={handleDeleteRightNote}
            >
              {rightNote.value}
            </span>
          </div>
        </>
      )}
    </NodeViewWrapper>
  );
}

export default AnnotatedLineView;
