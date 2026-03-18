import { normalizePasteLines } from '../src/editor/pasteUtils.js';

describe('normalizePasteLines', () => {
  test('empty string returns empty array', () => {
    expect(normalizePasteLines('')).toEqual([]);
  });

  test('null returns empty array', () => {
    expect(normalizePasteLines(null)).toEqual([]);
  });

  test('undefined returns empty array', () => {
    expect(normalizePasteLines(undefined)).toEqual([]);
  });

  test('single line with no newlines', () => {
    expect(normalizePasteLines('hello')).toEqual(['hello']);
  });

  test('multiple lines split on newlines', () => {
    expect(normalizePasteLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  test('single blank line is preserved as empty string', () => {
    expect(normalizePasteLines('a\n\nb')).toEqual(['a', '', 'b']);
  });

  test('three consecutive newlines collapsed to one blank line', () => {
    expect(normalizePasteLines('a\n\n\nb')).toEqual(['a', '', 'b']);
  });

  test('four or more consecutive newlines collapsed to one blank line', () => {
    expect(normalizePasteLines('a\n\n\n\nb')).toEqual(['a', '', 'b']);
  });

  test('mixed blank and non-blank lines preserved in order', () => {
    expect(normalizePasteLines('verse\nline 1\n\nchorus\nline 2')).toEqual([
      'verse', 'line 1', '', 'chorus', 'line 2',
    ]);
  });
});
