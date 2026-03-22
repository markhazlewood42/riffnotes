const LRCLIB_BASE = 'https://lrclib.net/api';

/**
 * Search for songs via Genius API (proxied through Vercel serverless function).
 * Returns array of { id, trackName, artistName, albumArt }.
 * Does NOT include lyrics — use getLyrics() to fetch those separately.
 */
export async function searchSongs(query, { signal } = {}) {
  if (!query || query.trim().length < 2) return [];

  const url = `/api/genius-search?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const data = await res.json();
  return data.hits || [];
}

/**
 * Fetch lyrics for a specific track from LRCLIB by exact track name + artist.
 * Returns { plainLyrics } or null if not found.
 */
export async function getLyrics(trackName, artistName, { signal } = {}) {
  const params = new URLSearchParams({
    track_name: trackName,
    artist_name: artistName,
  });
  const url = `${LRCLIB_BASE}/get?${params}`;
  const res = await fetch(url, { signal });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`LRCLIB lookup failed: ${res.status}`);

  const data = await res.json();
  return data.plainLyrics ? { plainLyrics: data.plainLyrics } : null;
}
