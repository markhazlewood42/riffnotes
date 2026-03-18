import {
  annotationReducer,
  initialState,
  getChordsForLine,
  getRightNoteForLine,
  getImageForLine,
  getAnnotationsForLine,
} from '../src/context/annotationReducer.js';

// Helper to get a fresh empty state
function emptyState() {
  return { annotations: {}, songId: null };
}

// Helper to get the single annotation from state (asserts exactly one exists)
function onlyAnnotation(state) {
  const vals = Object.values(state.annotations);
  expect(vals).toHaveLength(1);
  return vals[0];
}

describe('initialState', () => {
  test('has empty annotations and null songId', () => {
    expect(initialState).toEqual({ annotations: {}, songId: null });
  });
});

describe('ADD_CHORD', () => {
  test('creates a chord annotation with correct fields', () => {
    const state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 5, charOffsetEnd: 8, value: 'Am' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.type).toBe('chord');
    expect(ann.lineId).toBe('line-1');
    expect(ann.charOffset).toBe(5);
    expect(ann.charOffsetEnd).toBe(8);
    expect(ann.value).toBe('Am');
    expect(ann.id).toBeTruthy();
  });

  test('multiple chords at same position coexist (no deduplication)', () => {
    let state = emptyState();
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 3, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 3, value: 'C' },
    });
    expect(Object.values(state.annotations)).toHaveLength(2);
  });

  test('preserves existing annotations', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'G' },
    });
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-2', charOffset: 5, charOffsetEnd: 8, value: 'D' },
    });
    expect(Object.values(state.annotations)).toHaveLength(2);
  });
});

describe('ADD_RIGHT_NOTE', () => {
  test('creates a right-side annotation with correct fields', () => {
    const state = annotationReducer(emptyState(), {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 10, value: 'Big finish', style: 'default' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.type).toBe('right-side');
    expect(ann.lineId).toBe('line-1');
    expect(ann.value).toBe('Big finish');
    expect(ann.style).toBe('default');
  });

  test('replaces existing right-side note on the same line', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'First', style: 'default' },
    });
    state = annotationReducer(state, {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Second', style: 'default' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.value).toBe('Second');
  });

  test('replaces existing image annotation on the same line', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/img.png' },
    });
    state = annotationReducer(state, {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Note text', style: 'default' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.type).toBe('right-side');
    expect(ann.value).toBe('Note text');
  });

  test('does not affect annotations on other lines', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Line 1 note', style: 'default' },
    });
    state = annotationReducer(state, {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-2', charOffset: 0, value: 'Line 2 note', style: 'default' },
    });
    expect(Object.values(state.annotations)).toHaveLength(2);
  });
});

describe('ADD_IMAGE', () => {
  test('creates an image annotation', () => {
    const state = annotationReducer(emptyState(), {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/img.png' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.type).toBe('image');
    expect(ann.lineId).toBe('line-1');
    expect(ann.url).toBe('https://example.com/img.png');
  });

  test('replaces existing right-side note on same line', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Some note', style: 'default' },
    });
    state = annotationReducer(state, {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/img.png' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.type).toBe('image');
  });

  test('replaces existing image annotation on same line', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/old.png' },
    });
    state = annotationReducer(state, {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/new.png' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.url).toBe('https://example.com/new.png');
  });

  test('does not remove chord annotations on same line', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/img.png' },
    });
    expect(Object.values(state.annotations)).toHaveLength(2);
  });
});

describe('UPDATE_ANNOTATION', () => {
  test('updates specified fields on an existing annotation', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Old text', style: 'default' },
    });
    const id = Object.keys(state.annotations)[0];
    state = annotationReducer(state, {
      type: 'UPDATE_ANNOTATION',
      payload: { id, changes: { value: 'New text' } },
    });
    expect(state.annotations[id].value).toBe('New text');
    expect(state.annotations[id].style).toBe('default'); // unchanged
  });

  test('no-ops when id does not exist', () => {
    const state = emptyState();
    const next = annotationReducer(state, {
      type: 'UPDATE_ANNOTATION',
      payload: { id: 'nonexistent', changes: { value: 'foo' } },
    });
    expect(next).toBe(state); // reference equality — no new object
  });
});

describe('DELETE_ANNOTATION', () => {
  test('removes annotation by id', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    const id = Object.keys(state.annotations)[0];
    state = annotationReducer(state, {
      type: 'DELETE_ANNOTATION',
      payload: { id },
    });
    expect(Object.values(state.annotations)).toHaveLength(0);
  });

  test('does not affect other annotations', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-2', charOffset: 0, charOffsetEnd: 2, value: 'G' },
    });
    const idToDelete = Object.keys(state.annotations)[0];
    state = annotationReducer(state, {
      type: 'DELETE_ANNOTATION',
      payload: { id: idToDelete },
    });
    expect(Object.values(state.annotations)).toHaveLength(1);
  });
});

describe('DELETE_ANNOTATIONS_FOR_LINE', () => {
  test('removes all annotations for the given lineId', () => {
    let state = emptyState();
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Note', style: 'default' },
    });
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-2', charOffset: 0, charOffsetEnd: 2, value: 'G' },
    });
    state = annotationReducer(state, {
      type: 'DELETE_ANNOTATIONS_FOR_LINE',
      payload: { lineId: 'line-1' },
    });
    expect(Object.values(state.annotations)).toHaveLength(1);
    expect(Object.values(state.annotations)[0].lineId).toBe('line-2');
  });
});

describe('REMAP_LINE_IDS', () => {
  test('remaps annotation lineIds according to mapping', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'old-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'REMAP_LINE_IDS',
      payload: { mapping: { 'old-1': 'new-1' } },
    });
    const ann = onlyAnnotation(state);
    expect(ann.lineId).toBe('new-1');
  });

  test('annotations not in mapping are unchanged', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-stays', charOffset: 0, charOffsetEnd: 2, value: 'G' },
    });
    state = annotationReducer(state, {
      type: 'REMAP_LINE_IDS',
      payload: { mapping: { 'other-line': 'new-other' } },
    });
    const ann = onlyAnnotation(state);
    expect(ann.lineId).toBe('line-stays');
  });
});

describe('LOAD', () => {
  test('replaces full state with payload', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    const newState = { annotations: { 'x': { id: 'x', type: 'chord', lineId: 'y' } }, songId: 'song-abc' };
    state = annotationReducer(state, { type: 'LOAD', payload: newState });
    expect(state).toEqual(newState);
  });
});

describe('Selectors', () => {
  let state;
  beforeEach(() => {
    state = emptyState();
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 10, charOffsetEnd: 12, value: 'G' },
    });
    state = annotationReducer(state, {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Some note', style: 'default' },
    });
    state = annotationReducer(state, {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-2', charOffset: 0, url: 'https://example.com/img.png' },
    });
  });

  describe('getChordsForLine', () => {
    test('returns all chords for a line', () => {
      const chords = getChordsForLine(state, 'line-1');
      expect(chords).toHaveLength(2);
      expect(chords.every(c => c.type === 'chord')).toBe(true);
    });

    test('returns empty array for line with no chords', () => {
      expect(getChordsForLine(state, 'line-2')).toEqual([]);
    });

    test('returns empty array for nonexistent lineId', () => {
      expect(getChordsForLine(state, 'nope')).toEqual([]);
    });
  });

  describe('getRightNoteForLine', () => {
    test('returns the right-side note for a line', () => {
      const note = getRightNoteForLine(state, 'line-1');
      expect(note).toBeDefined();
      expect(note.type).toBe('right-side');
      expect(note.value).toBe('Some note');
    });

    test('returns undefined for line with no right-side note', () => {
      expect(getRightNoteForLine(state, 'line-2')).toBeUndefined();
    });
  });

  describe('getImageForLine', () => {
    test('returns the image annotation for a line', () => {
      const img = getImageForLine(state, 'line-2');
      expect(img).toBeDefined();
      expect(img.type).toBe('image');
      expect(img.url).toBe('https://example.com/img.png');
    });

    test('returns undefined for line with no image', () => {
      expect(getImageForLine(state, 'line-1')).toBeUndefined();
    });
  });

  describe('getAnnotationsForLine', () => {
    test('returns all annotations for a line regardless of type', () => {
      const all = getAnnotationsForLine(state, 'line-1');
      expect(all).toHaveLength(3); // 2 chords + 1 right-side
    });

    test('returns empty array for nonexistent lineId', () => {
      expect(getAnnotationsForLine(state, 'nope')).toEqual([]);
    });
  });
});
