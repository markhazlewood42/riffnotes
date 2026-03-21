const LRCLIB_BASE = 'https://lrclib.net/api';

/**
 * Search for songs by query string (title, artist, or both).
 * Returns array of { id, trackName, artistName, albumName, duration, plainLyrics }.
 */
export async function searchSongs(query, { signal } = {}) {
  if (!query || query.trim().length < 2) return [];

  const url = `${LRCLIB_BASE}/search?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new Error(`LRCLIB search failed: ${res.status}`);
  }

  const data = await res.json();

  // Filter out instrumentals / entries without lyrics, then deduplicate
  // by trackName + artistName (LRCLIB often returns multiple versions).
  // Keeping first match (which has lyrics) per unique key.
  const seen = new Set();
  return data
    .filter((item) => item.plainLyrics)
    .filter((item) => {
      const key = `${item.trackName?.toLowerCase()}|${item.artistName?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
