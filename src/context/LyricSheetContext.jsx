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
    // For new (unsaved) songs, skip the save cycle entirely until there's content.
    if (!songIdRef.current) {
      const hasContent = (editorRef.current?.getText().trim().length ?? 0) > 0;
      if (!hasContent) return;
    }
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const sid = songIdRef.current;
      const doc = editorRef.current?.getJSON() || null;
      const title = extractTitleFromDoc(doc);
      if (!sid) {
        // First save for a new song — INSERT
        const hasContent = (editorRef.current?.getText().trim().length ?? 0) > 0;
        if (!hasContent) { setSaveStatus('saved'); return; }
        setSaveStatus('saving');
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('songs')
          .insert({ user_id: user.id, title, document: doc, annotations: stateRef.current.annotations })
          .select('id')
          .single();
        if (!error) {
          songIdRef.current = data.id;
          setSaveStatus('saved');
          // Update URL to the real song ID without triggering a React Router
          // navigation (which would remount the editor and lose state).
          window.history.replaceState(null, '', `/songs/${data.id}`);
        } else {
          setSaveStatus('unsaved');
        }
        return;
      }
      // Existing song — UPDATE
      setSaveStatus('saving');
      const { error } = await supabase
        .from('songs')
        .update({ title, document: doc, annotations: stateRef.current.annotations })
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
