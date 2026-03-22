import { buildDocumentFromLyrics } from '../src/services/songDocument.js';

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
