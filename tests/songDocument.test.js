import { buildDocumentFromLyrics, sanitizeDocument } from '../src/services/songDocument.js';

describe('buildDocumentFromLyrics', () => {
  test('creates doc with songTitle and lyric paragraphs', () => {
    const doc = buildDocumentFromLyrics('Artist - Song', 'line one\nline two');
    expect(doc.type).toBe('doc');
    expect(doc.content).toHaveLength(3);
    expect(doc.content[0]).toEqual({
      type: 'songTitle',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Artist - Song' }],
    });
    expect(doc.content[1]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'line one' }],
    });
    expect(doc.content[2]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'line two' }],
    });
  });

  test('empty lines become empty paragraphs', () => {
    const doc = buildDocumentFromLyrics('Title', 'verse\n\nchorus');
    expect(doc.content).toHaveLength(4); // title + verse + empty + chorus
    expect(doc.content[2]).toEqual({ type: 'paragraph' });
  });

  test('collapses 3+ consecutive blank lines to 2', () => {
    const doc = buildDocumentFromLyrics('Title', 'a\n\n\n\nb');
    // 4 blank lines → 2 empty paragraphs
    const paragraphs = doc.content.slice(1);
    expect(paragraphs).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
      { type: 'paragraph' },
      { type: 'paragraph' },
      { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
    ]);
  });

  test('exactly 2 consecutive blank lines are preserved', () => {
    const doc = buildDocumentFromLyrics('Title', 'a\n\n\nb');
    const paragraphs = doc.content.slice(1);
    expect(paragraphs).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
      { type: 'paragraph' },
      { type: 'paragraph' },
      { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
    ]);
  });

  test('trailing empty lines are removed', () => {
    const doc = buildDocumentFromLyrics('Title', 'line\n\n\n');
    const paragraphs = doc.content.slice(1);
    expect(paragraphs).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'line' }] },
    ]);
  });

  test('trims whitespace from lines', () => {
    const doc = buildDocumentFromLyrics('Title', '  hello  \n  world  ');
    expect(doc.content[1]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'hello' }],
    });
    expect(doc.content[2]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'world' }],
    });
  });

  test('single line of lyrics produces one paragraph', () => {
    const doc = buildDocumentFromLyrics('Title', 'only line');
    expect(doc.content).toHaveLength(2);
  });

  test('realistic lyrics with verse/chorus structure', () => {
    const lyrics = [
      'Verse line one',
      'Verse line two',
      '',
      'Chorus line one',
      'Chorus line two',
    ].join('\n');

    const doc = buildDocumentFromLyrics('Bob Dylan - Blowin', lyrics);
    expect(doc.content).toHaveLength(6); // title + 4 lines + 1 blank
    expect(doc.content[0].type).toBe('songTitle');
    expect(doc.content[3]).toEqual({ type: 'paragraph' }); // blank between verse/chorus
  });
});

// Helper to build a minimal doc for sanitize tests
function makeDoc(...nodes) {
  return { type: 'doc', content: nodes };
}
const title = { type: 'songTitle', content: [{ type: 'text', text: 'My Song' }] };
const emptyPara = { type: 'paragraph' };
const lyricPara = { type: 'paragraph', content: [{ type: 'text', text: 'Some lyrics' }] };

describe('sanitizeDocument', () => {
  test('returns a well-formed document unchanged (same reference)', () => {
    const doc = makeDoc(title, emptyPara, lyricPara);
    expect(sanitizeDocument(doc)).toBe(doc);
  });

  test('removes empty paragraphs before the songTitle', () => {
    const doc = makeDoc(emptyPara, emptyPara, title, lyricPara);
    const result = sanitizeDocument(doc);
    expect(result.content[0].type).toBe('songTitle');
    expect(result.content).toHaveLength(2); // title + lyric
  });

  test('removes single empty paragraph before the songTitle', () => {
    const doc = makeDoc(emptyPara, title, lyricPara);
    const result = sanitizeDocument(doc);
    expect(result.content[0].type).toBe('songTitle');
    expect(result.content[1]).toBe(lyricPara);
  });

  test('collapses multiple empty paragraphs after the title to one', () => {
    const doc = makeDoc(title, emptyPara, emptyPara, emptyPara, lyricPara);
    const result = sanitizeDocument(doc);
    expect(result.content).toHaveLength(3); // title + 1 empty + lyric
    expect(result.content[0].type).toBe('songTitle');
    expect(result.content[1]).toEqual(emptyPara);
    expect(result.content[2]).toBe(lyricPara);
  });

  test('handles both: empty paragraphs before AND after the title', () => {
    const doc = makeDoc(emptyPara, emptyPara, title, emptyPara, emptyPara, emptyPara, lyricPara);
    const result = sanitizeDocument(doc);
    // Leading empty paras removed (including the ones after the title since
    // they become leading after title is extracted), title moved to front
    expect(result.content[0].type).toBe('songTitle');
    expect(result.content[1]).toBe(lyricPara);
    expect(result.content).toHaveLength(2); // title + lyric
  });

  test('preserves a single empty paragraph after the title', () => {
    const doc = makeDoc(title, emptyPara, lyricPara);
    expect(sanitizeDocument(doc)).toBe(doc); // unchanged
  });

  test('ensures at least one paragraph exists after the title', () => {
    const doc = makeDoc(title);
    const result = sanitizeDocument(doc);
    expect(result.content).toHaveLength(2);
    expect(result.content[1]).toEqual({ type: 'paragraph' });
  });

  test('does not remove non-empty paragraphs before the title', () => {
    // Edge case: a lyric paragraph somehow ended up before the title
    const doc = makeDoc(lyricPara, title, emptyPara);
    const result = sanitizeDocument(doc);
    // Title should be moved to front, but the non-empty para stays
    expect(result.content[0].type).toBe('songTitle');
    expect(result.content[1]).toBe(lyricPara);
  });

  test('handles null/undefined/empty content gracefully', () => {
    expect(sanitizeDocument(null)).toBe(null);
    expect(sanitizeDocument({})).toEqual({});
    expect(sanitizeDocument({ type: 'doc', content: [] })).toEqual({ type: 'doc', content: [] });
  });

  test('handles document with no songTitle', () => {
    const doc = makeDoc(emptyPara, lyricPara);
    expect(sanitizeDocument(doc)).toBe(doc); // unchanged, nothing to fix
  });

  test('preserves empty paragraphs in the middle of lyrics (verse gaps)', () => {
    const verse2 = { type: 'paragraph', content: [{ type: 'text', text: 'Verse two' }] };
    const doc = makeDoc(title, lyricPara, emptyPara, verse2);
    expect(sanitizeDocument(doc)).toBe(doc); // unchanged
  });

  test('preserves node attrs like lineId through sanitization', () => {
    const paraWithId = { type: 'paragraph', attrs: { lineId: 'line-abc' }, content: [{ type: 'text', text: 'Lyrics' }] };
    const doc = makeDoc(emptyPara, title, paraWithId);
    const result = sanitizeDocument(doc);
    expect(result.content[0].type).toBe('songTitle');
    expect(result.content[1].attrs.lineId).toBe('line-abc');
  });
});
