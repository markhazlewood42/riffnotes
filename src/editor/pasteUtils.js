/**
 * Normalizes pasted text for insertion into the lyric editor.
 * Collapses runs of 3+ consecutive newlines to 2 (one blank separator line)
 * then splits on newlines. Returns an array of line strings; empty strings
 * represent blank lines (verse/stanza separators).
 *
 * @param {string|null|undefined} text
 * @returns {string[]}
 */
export function normalizePasteLines(text) {
  if (!text) return [];
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').split('\n');
}
