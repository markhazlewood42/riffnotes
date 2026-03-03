import React, { useState, useRef, useCallback } from 'react';
import { useLyricSheet } from '../context/LyricSheetContext';
import ChordInput from './inputs/ChordInput';
import './AnnotationToolbar.css';

function AnnotationToolbar({ editor }) {
  const [activeInput, setActiveInput] = useState(null);
  const { dispatch, startEditingNote } = useLyricSheet();

  // Store selection context when a button is clicked, before editor loses focus
  const selectionRef = useRef({ lineId: null, charOffset: 0 });

  const captureSelection = useCallback(() => {
    if (!editor) return;
    const { $from, $to } = editor.state.selection;
    let lineId = null;
    for (let depth = $from.depth; depth >= 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === 'paragraph') {
        lineId = node.attrs.lineId;
        break;
      }
    }
    selectionRef.current = {
      lineId,
      charOffset: $from.parentOffset,
      endOffset: $to.parentOffset,
    };
  }, [editor]);

  // Use onMouseDown to capture selection before the click blurs the editor
  const openInput = useCallback((inputType) => {
    captureSelection();
    setActiveInput(inputType);
  }, [captureSelection]);

  const handleAddChord = (value) => {
    const { lineId, charOffset, endOffset } = selectionRef.current;
    if (!lineId || !value.trim()) return;
    dispatch({
      type: 'ADD_CHORD',
      payload: { lineId, charOffset, charOffsetEnd: endOffset ?? charOffset, value: value.trim() },
    });
    setActiveInput(null);
    editor.commands.focus();
  };

  const handleCancel = () => {
    setActiveInput(null);
    editor.commands.focus();
  };

  if (activeInput === 'chord') {
    return (
      <div className="annotation-toolbar">
        <ChordInput onSubmit={handleAddChord} onCancel={handleCancel} />
      </div>
    );
  }

  return (
    <div className="annotation-toolbar">
      <button
        className="toolbar-btn"
        onMouseDown={(e) => { e.preventDefault(); openInput('chord'); }}
        title="Add chord annotation (above text)"
      >
        <span className="btn-icon">&#9834;</span>
        <span className="btn-label">Chord</span>
      </button>
      <button
        className="toolbar-btn"
        onMouseDown={(e) => {
          e.preventDefault();
          captureSelection();
          const { lineId, charOffset } = selectionRef.current;
          if (lineId) startEditingNote(lineId, charOffset);
        }}
        title="Add performance note (right side)"
      >
        <span className="btn-icon">&rarr;</span>
        <span className="btn-label">Note</span>
      </button>
      <div className="toolbar-divider" />
      <button
        className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
        title="Bold"
      >
        <span className="btn-icon"><strong>B</strong></span>
      </button>
      <button
        className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
        title="Italic"
      >
        <span className="btn-icon"><em>I</em></span>
      </button>
    </div>
  );
}

export default AnnotationToolbar;
