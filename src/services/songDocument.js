/**
 * Build a TipTap document JSON from a title and plain lyrics text.
 * Each line becomes a paragraph node; empty lines become empty paragraphs.
 */
export function buildDocumentFromLyrics(title, lyricsText) {
  const lines = lyricsText.split('\n');

  // Collapse runs of 3+ blank lines to 2 (matching paste behavior)
  const normalized = [];
  let consecutiveEmpty = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      consecutiveEmpty++;
      if (consecutiveEmpty <= 2) normalized.push('');
    } else {
      consecutiveEmpty = 0;
      normalized.push(line.trim());
    }
  }

  // Remove trailing empty lines
  while (normalized.length > 0 && normalized[normalized.length - 1] === '') {
    normalized.pop();
  }

  const paragraphs = normalized.map((line) =>
    line
      ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
      : { type: 'paragraph' }
  );

  return {
    type: 'doc',
    content: [
      {
        type: 'songTitle',
        attrs: { level: 1 },
        content: [{ type: 'text', text: title }],
      },
      ...paragraphs,
    ],
  };
}
