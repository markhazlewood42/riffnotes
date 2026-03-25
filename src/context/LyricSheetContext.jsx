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

function LyricSheetProvider({ songId, initialDocument, initialAnnotations, initialInstruments, isLocked, children }) {
  const [state, dispatch] = useReducer(annotationReducer, {
    annotations: initialAnnotations || {},
    songId,
  });

  const [instruments, setInstrumentsState] = useState(initialInstruments ?? ['Guitar']);
  const [editingNote, setEditingNote] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [layoutMap, setLayoutMap] = useState({});
  const [layoutReady, setLayoutReady] = useState(false);
  const layoutReadyRef = useRef(false);

  const setLayoutMapOnce = useCallback((map) => {
    setLayoutMap((prev) => {
      // Skip update if layout values are identical — avoids unnecessary
      // re-renders when annotation positions haven't actually changed.
      const prevKeys = Object.keys(prev);
      const mapKeys = Object.keys(map);
      if (
        prevKeys.length === mapKeys.length &&
        prevKeys.every(
          (k) =>
            map[k] &&
            prev[k].top === map[k].top &&
            prev[k].height === map[k].height &&
            prev[k].displacement === map[k].displacement &&
            prev[k].lineTop === map[k].lineTop,
        )
      ) {
        return prev; // same reference → no re-render
      }
      return map;
    });
    if (!layoutReadyRef.current) {
      layoutReadyRef.current = true;
      // Defer enabling transitions to the next frame so the initial layout
      // paints without animation before transitions become active.
      requestAnimationFrame(() => setLayoutReady(true));
    }
  }, []);

  const editorRef = useRef(null);
  const saveTimerRef = useRef(null);
  const stateRef = useRef(state);
  const songIdRef = useRef(songId);
  const instrumentsRef = useRef(instruments);
  stateRef.current = state;
  songIdRef.current = songId;
  instrumentsRef.current = instruments;

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
          .insert({ user_id: user.id, title, document: doc, annotations: stateRef.current.annotations, instruments: instrumentsRef.current })
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
        .update({ title, document: doc, annotations: stateRef.current.annotations, instruments: instrumentsRef.current })
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

  const setInstruments = useCallback((newInstruments) => {
    setInstrumentsState(newInstruments);
    instrumentsRef.current = newInstruments;
    requestSave();
  }, [requestSave]);

  const setEditor = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const startEditingNote = useCallback((lineId, charOffset, initialValue) => {
    setEditingNote({ lineId, charOffset, initialValue });
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
    instruments,
    setInstruments,
    layoutMap,
    setLayoutMap: setLayoutMapOnce,
    layoutReady,
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
