import React, { createContext, useContext, useReducer, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { annotationReducer } from './annotationReducer';

const LyricSheetContext = createContext(null);

export function extractTitleFromDoc(doc) {
  if (!doc?.content) return '';
  const titleNode = doc.content.find(n => n.type === 'songTitle');
  if (!titleNode?.content) return '';
  return titleNode.content.map(n => n.text || '').join('');
}

function LyricSheetProvider({ songId, initialDocument, initialAnnotations, isLocked, children }) {
  const [state, dispatch] = useReducer(annotationReducer, {
    annotations: initialAnnotations || {},
    songId,
  });

  const [editingNote, setEditingNote] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');

  const editorRef = useRef(null);
  const saveTimerRef = useRef(null);
  const stateRef = useRef(state);
  const songIdRef = useRef(songId);
  stateRef.current = state;
  songIdRef.current = songId;

  const requestSave = useCallback(() => {
    if (isLocked) return;
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const sid = songIdRef.current;
      if (!sid) return;
      const doc = editorRef.current?.getJSON() || null;
      const title = extractTitleFromDoc(doc);
      setSaveStatus('saving');
      const { error } = await supabase
        .from('songs')
        .update({
          title,
          document: doc,
          annotations: stateRef.current.annotations,
        })
        .eq('id', sid);
      setSaveStatus(error ? 'unsaved' : 'saved');
    }, 1000);
  }, [isLocked]);

  // Auto-save when annotations change (skip initial render)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    requestSave();
  }, [state.annotations, requestSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const setEditor = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const startEditingNote = useCallback((lineId, charOffset) => {
    setEditingNote({ lineId, charOffset });
  }, []);

  const stopEditingNote = useCallback(() => {
    setEditingNote(null);
  }, []);

  const value = {
    state,
    dispatch,
    editorRef,
    setEditor,
    editingNote,
    startEditingNote,
    stopEditingNote,
    requestSave,
    saveStatus,
    initialDocument,
    isLocked,
  };

  return (
    <LyricSheetContext.Provider value={value}>
      {children}
    </LyricSheetContext.Provider>
  );
}

function useLyricSheet() {
  const context = useContext(LyricSheetContext);
  if (!context) {
    throw new Error('useLyricSheet must be used within a LyricSheetProvider');
  }
  return context;
}

export { LyricSheetProvider, useLyricSheet };
