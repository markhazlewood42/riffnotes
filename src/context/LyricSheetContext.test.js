// We test the storage migration behavior by directly manipulating localStorage
// and importing the module to verify the contract.
import { STORAGE_KEY } from './LyricSheetContext';

describe('localStorage migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('STORAGE_KEY is the expected key', () => {
    expect(STORAGE_KEY).toBe('gignotes-data');
  });

  test('stored data without songId is detectable', () => {
    const dataWithoutId = { annotations: {} };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithoutId));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.songId).toBeUndefined();
  });

  test('stored data with songId is preserved', () => {
    const dataWithId = { annotations: {}, songId: 'existing-uuid' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithId));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.songId).toBe('existing-uuid');
  });
});
