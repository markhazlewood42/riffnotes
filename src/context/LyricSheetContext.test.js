import { annotationReducer, initialState, getChordsForLine, getRightNoteForLine } from './annotationReducer';

describe('annotationReducer', () => {
  test('ADD_CHORD creates a chord annotation', () => {
    const state = { annotations: {}, songId: 'test' };
    const result = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 5, label: 'Am' },
    });
    const annotations = Object.values(result.annotations);
    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toMatchObject({
      type: 'chord',
      lineId: 'line-1',
      charOffset: 5,
      label: 'Am',
    });
  });

  test('DELETE_ANNOTATION removes an annotation', () => {
    const state = {
      annotations: { 'a1': { id: 'a1', type: 'chord', lineId: 'l1' } },
      songId: 'test',
    };
    const result = annotationReducer(state, {
      type: 'DELETE_ANNOTATION',
      payload: { id: 'a1' },
    });
    expect(Object.keys(result.annotations)).toHaveLength(0);
  });

  test('getChordsForLine filters by lineId and type', () => {
    const state = {
      annotations: {
        'a1': { id: 'a1', type: 'chord', lineId: 'l1' },
        'a2': { id: 'a2', type: 'right-side', lineId: 'l1' },
        'a3': { id: 'a3', type: 'chord', lineId: 'l2' },
      },
    };
    expect(getChordsForLine(state, 'l1')).toHaveLength(1);
    expect(getChordsForLine(state, 'l1')[0].id).toBe('a1');
  });
});
