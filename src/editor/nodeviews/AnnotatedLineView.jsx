import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Trash2, Check } from 'lucide-react';
import { useLyricSheet } from '../../context/LyricSheetContext';
import { supabase } from '../../supabase';
import { getRightNoteForLine, getChordsForLine, getImageForLine } from '../../context/annotationReducer';

function AnnotatedLineView(props) {
  const { node } = props;
  const lineId = node.attrs.lineId;
  const { state, dispatch, editingNote, stopEditingNote, editorRef, isLocked } = useLyricSheet();

  const stateRef = useRef(state);
  stateRef.current = state;

  const rightNote = useMemo(
    () => getRightNoteForLine(state, lineId),
    [state, lineId]
  );

  const imageAnnotation = useMemo(
    () => getImageForLine(state, lineId),
    [state, lineId]
  );

  const chords = useMemo(
    () => getChordsForLine(state, lineId),
    [state, lineId]
  );

  // Sort chords by charOffset for rendering
  const sortedChords = useMemo(
    () => [...chords].sort((a, b) => a.charOffset - b.charOffset),
    [chords]
  );

  // Two-step delete: 'idle' | 'hover' | 'confirm'
  const [rightAnnotationState, setRightAnnotationState] = useState('idle');
  const rightAnnotationRef = useRef(null);

  // Dismiss confirm state on outside click
  useEffect(() => {
    if (rightAnnotationState !== 'confirm') return;
    const handler = (e) => {
      if (rightAnnotationRef.current && !rightAnnotationRef.current.contains(e.target)) {
        setRightAnnotationState('idle');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [rightAnnotationState]);

  const handleDeleteRightNote = (e) => {
    e?.stopPropagation();
    if (isLocked) return;
    if (rightNote) {
      dispatch({ type: 'DELETE_ANNOTATION', payload: { id: rightNote.id } });
      setRightAnnotationState('idle');
    }
  };

  const handleDeleteImage = (e) => {
    e?.stopPropagation();
    if (isLocked) return;
    if (imageAnnotation) {
      dispatch({ type: 'DELETE_ANNOTATION', payload: { id: imageAnnotation.id } });
      setRightAnnotationState('idle');
    }
  };

  const handleDeleteChord = (chordId, e) => {
    e.stopPropagation();
    if (isLocked) return;
    dispatch({ type: 'DELETE_ANNOTATION', payload: { id: chordId } });
  };

  const styleClass = rightNote
    ? `style-${rightNote.style || 'default'}`
    : '';

  const isEditingNote = editingNote?.lineId === lineId;
  const hasAnnotation = !!rightNote || !!imageAnnotation;
  const showRightColumn = hasAnnotation || isEditingNote;

  // charOffset for leader line: use editing position when creating, existing note's position otherwise
  const charOffsetForLeader = isEditingNote
    ? editingNote.charOffset
    : (rightNote?.charOffset ?? imageAnnotation?.charOffset ?? null);

  const wrapperRef = useRef(null);
  const noteInputRef = useRef(null);
  const [pullbackPx, setPullbackPx] = useState(0);
  const [chordLeftPositions, setChordLeftPositions] = useState({});

  // Auto-focus the inline input when editing starts
  useEffect(() => {
    if (isEditingNote && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [isEditingNote]);

  const measurePullback = useCallback(() => {
    if (!showRightColumn || charOffsetForLeader == null || !wrapperRef.current) return;
    const contentEl = wrapperRef.current.querySelector('.lyric-content');
    if (!contentEl) return;

    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
    let textNode = null;
    let accumulated = 0;
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (accumulated + n.length >= charOffsetForLeader) {
        textNode = n;
        break;
      }
      accumulated += n.length;
    }
    if (!textNode) return;

    const localOffset = charOffsetForLeader - accumulated;
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
  }, [showRightColumn, charOffsetForLeader]);

  // Measure actual pixel left positions for chord labels using collapsed DOM Ranges.
  // Chords are centered over their selection: measure start and end pixel positions,
  // find the visual center, then subtract half the rendered label width.
  const measureChordPositions = useCallback(() => {
    if (!wrapperRef.current || sortedChords.length === 0) {
      setChordLeftPositions({});
      return;
    }
    const contentEl = wrapperRef.current.querySelector('.lyric-content');
    if (!contentEl) return;

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const zoomEl = wrapperRef.current.closest('.document-container');
    const zoom = zoomEl ? (parseFloat(getComputedStyle(zoomEl).zoom) || 1) : 1;

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
      const endPx = endOffset !== chord.charOffset
        ? (measurePixelOffset(endOffset) ?? startPx)
        : startPx;

      const selectionCenterPx = (startPx + endPx) / 2;

      // Subtract half the rendered label width so the chord text is visually centered.
      const chordEl = wrapperRef.current.querySelector(`[data-chord-id="${chord.id}"]`);
      const labelWidth = chordEl ? chordEl.offsetWidth / zoom : 0;

      positions[chord.id] = selectionCenterPx - labelWidth / 2;
    }
    setChordLeftPositions(positions);
  }, [sortedChords]);

  const handleNoteSubmit = useCallback((value) => {
    if (value.trim()) {
      dispatch({
        type: 'ADD_RIGHT_NOTE',
        payload: { lineId, charOffset: editingNote.charOffset, value: value.trim(), style: 'default' },
      });
    }
    stopEditingNote();
    editorRef.current?.commands.focus();
  }, [dispatch, lineId, editingNote, stopEditingNote, editorRef]);

  const handleNoteCancel = useCallback(() => {
    stopEditingNote();
    editorRef.current?.commands.focus();
  }, [stopEditingNote, editorRef]);

  const handleNotePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        // Show image instantly with a local blob URL
        const blobUrl = URL.createObjectURL(file);
        dispatch({
          type: 'ADD_IMAGE',
          payload: {
            lineId,
            charOffset: editingNote.charOffset,
            url: blobUrl,
          },
        });
        stopEditingNote();
        editorRef.current?.commands.focus();

        // Upload to Storage in the background, then swap URL
        const ext = file.type.split('/')[1] || 'png';
        const fileName = `${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from('annotation-images')
          .upload(fileName, file, { contentType: file.type });

        if (error) {
          console.error('Image upload failed:', error);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('annotation-images')
          .getPublicUrl(fileName);

        // Find the annotation we just created and update its URL
        const ann = Object.values(stateRef.current.annotations).find(
          (a) => a.type === 'image' && a.url === blobUrl
        );
        if (ann) {
          dispatch({
            type: 'UPDATE_ANNOTATION',
            payload: { id: ann.id, changes: { url: urlData.publicUrl } },
          });
        }
        URL.revokeObjectURL(blobUrl);
        return;
      }
    }
  }, [dispatch, lineId, editingNote, stopEditingNote, editorRef]);

  useEffect(() => {
    measurePullback();
  }, [measurePullback]);

  useEffect(() => {
    measureChordPositions();
  }, [measureChordPositions, node.textContent]);

  // Build chord overlay — pixel positions from DOM measurement, ch fallback on first render
  const chordOverlay = sortedChords.length > 0 ? (
    <div className="chord-overlay" contentEditable={false}>
      {sortedChords.map((chord) => (
        <span
          key={chord.id}
          data-chord-id={chord.id}
          className="chord-positioned"
          style={{
            left: chordLeftPositions[chord.id] != null
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

  // Shared mouse handlers for right annotation hover/confirm states
  const rightAnnotationMouseEnter = () => {
    if (!isLocked && rightAnnotationState === 'idle') setRightAnnotationState('hover');
  };
  const rightAnnotationMouseLeave = () => {
    if (rightAnnotationState === 'hover') setRightAnnotationState('idle');
  };

  // Action buttons — always rendered (when not locked) so the hover area and layout
  // stay constant regardless of state. Visibility is toggled via CSS classes only.
  const annotationActions = !isLocked && (
    <div className="annotation-actions">
      <button
        className={`annotation-action-btn${rightAnnotationState === 'idle' ? ' annotation-action-btn--hidden' : ''}${rightAnnotationState === 'confirm' ? ' annotation-action-btn--disabled' : ''}`}
        disabled={rightAnnotationState === 'confirm'}
        onMouseDown={rightAnnotationState === 'hover' ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          setRightAnnotationState('confirm');
        } : undefined}
      >
        <Trash2 size={12} />
      </button>
      <button
        className={`annotation-action-btn annotation-action-btn--confirm${rightAnnotationState !== 'confirm' ? ' annotation-action-btn--hidden' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          imageAnnotation ? handleDeleteImage(e) : handleDeleteRightNote(e);
        }}
      >
        <Check size={12} />
      </button>
    </div>
  );

  return (
    <NodeViewWrapper
      className={`annotated-line ${showRightColumn ? 'has-right-annotation' : ''} ${imageAnnotation && !isEditingNote ? 'has-image-annotation' : ''}`}
      data-line-id={lineId}
    >
      <div className="lyric-content-wrapper" ref={wrapperRef}>
        {chordOverlay}
        <NodeViewContent className="lyric-content" />
      </div>
      {showRightColumn && (
        <span
          className="leader-bridge"
          contentEditable={false}
          style={pullbackPx > 0 ? { marginLeft: `-${pullbackPx}px` } : undefined}
        />
      )}
      <div className="right-annotation-column" contentEditable={false}>
        {showRightColumn && (
          isEditingNote ? (
            <input
              ref={noteInputRef}
              className="note-inline-input"
              type="text"
              placeholder="type note or paste image"
              onPaste={handleNotePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleNoteSubmit(e.target.value); }
                else if (e.key === 'Escape') { handleNoteCancel(); }
              }}
              onBlur={(e) => {
                handleNoteCancel();
              }}
            />
          ) : imageAnnotation ? (
            <div
              ref={rightAnnotationRef}
              className="right-annotation-actions-wrapper right-annotation-actions-wrapper--image"
              onMouseEnter={rightAnnotationMouseEnter}
              onMouseLeave={rightAnnotationMouseLeave}
            >
              <div className="right-annotation-image-container">
                <img
                  className="right-annotation-image"
                  src={imageAnnotation.url}
                  alt="Annotation"
                />
              </div>
              {annotationActions}
            </div>
          ) : (
            <div
              ref={rightAnnotationRef}
              className="right-annotation-actions-wrapper"
              onMouseEnter={rightAnnotationMouseEnter}
              onMouseLeave={rightAnnotationMouseLeave}
            >
              <span className={`right-annotation-text ${styleClass}${rightAnnotationState !== 'idle' ? ' is-active' : ''}`}>
                {rightNote.value}
              </span>
              {annotationActions}
            </div>
          )
        )}
      </div>
    </NodeViewWrapper>
  );
}

export default AnnotatedLineView;
