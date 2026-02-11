import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { annotationReducer, initialState } from './annotationReducer';

const STORAGE_KEY = 'gignotes-data';

const LyricSheetContext = createContext(null);

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.annotations) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load annotation data from localStorage:', e);
  }
  return null;
}

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save annotation data to localStorage:', e);
  }
}

function LyricSheetProvider({ children }) {
  const savedState = loadFromStorage();
  const [state, dispatch] = useReducer(
    annotationReducer,
    savedState || initialState
  );

  const editorRef = useRef(null);

  // Auto-save on state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const setEditor = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const value = {
    state,
    dispatch,
    editorRef,
    setEditor,
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

export { LyricSheetProvider, useLyricSheet, STORAGE_KEY };
