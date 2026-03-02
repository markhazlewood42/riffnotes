import { annotationReducer, initialState } from './annotationReducer';

describe('annotationReducer', () => {
  test('initialState includes a null songId field', () => {
    expect(initialState).toHaveProperty('songId');
    expect(initialState.songId).toBeNull();
  });

  test('LOAD action replaces state including songId', () => {
    const newState = {
      annotations: {},
      songId: 'test-song-uuid',
    };
    const result = annotationReducer(initialState, {
      type: 'LOAD',
      payload: newState,
    });
    expect(result.songId).toBe('test-song-uuid');
  });

  test('ADD_CHORD preserves songId', () => {
    const stateWithId = { ...initialState, songId: 'abc-123' };
    const result = annotationReducer(stateWithId, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Am' },
    });
    expect(result.songId).toBe('abc-123');
  });
});
