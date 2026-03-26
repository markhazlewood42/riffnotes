/**
 * Sanitize a TipTap document JSON to fix structural issues:
 * - Ensures songTitle is the first node (moves it if needed)
 * - Removes empty paragraphs before the songTitle
 * - Collapses excessive empty paragraphs between the title and first content
 * Returns the document unchanged if no issues are found.
 */
export function sanitizeDocument(doc) {
  if (!doc?.content || !Array.isArray(doc.content) || doc.content.length === 0) {
    return doc;
  }

  const content = [...doc.content];

  // Find the songTitle node
  const titleIndex = content.findIndex(n => n.type === 'songTitle');
  if (titleIndex < 0) return doc; // no title — nothing to fix

  // If title isn't first, move it to front and drop empty paragraphs before it
  if (titleIndex > 0) {
    const title = content[titleIndex];
    // Remove title from its current position
    content.splice(titleIndex, 1);
    // Drop leading empty paragraphs (no text content)
    while (content.length > 0 && content[0].type === 'paragraph' && !hasTextContent(content[0])) {
      content.shift();
    }
    // Re-insert title at position 0
    content.unshift(title);
  }

  // Collapse excessive empty paragraphs right after the title (keep at most 1)
  let i = 1;
  let emptyCount = 0;
  while (i < content.length && content[i].type === 'paragraph' && !hasTextContent(content[i])) {
    emptyCount++;
    i++;
  }
  if (emptyCount > 1) {
    // Keep only 1 empty paragraph after title, remove the rest
    content.splice(1, emptyCount - 1);
  }

  // Ensure at least one paragraph after the title
  if (content.length === 1) {
    content.push({ type: 'paragraph' });
  }

  // Only return a new object if we actually changed something
  if (content.length === doc.content.length && content.every((n, idx) => n === doc.content[idx])) {
    return doc;
  }

  return { ...doc, content };
}

function hasTextContent(node) {
  if (!node.content || !Array.isArray(node.content)) return false;
  return node.content.some(child => child.text && child.text.trim().length > 0);
}

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
