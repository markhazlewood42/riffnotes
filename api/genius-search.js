export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(200).json({ hits: [] });
  }

  const token = process.env.GENIUS_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Genius API token not configured' });
  }

  const url = `https://api.genius.com/search?q=${encodeURIComponent(q.trim())}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return res
      .status(response.status)
      .json({ error: `Genius API error: ${response.status}` });
  }

  const data = await response.json();

  // Extract just the song hits with the fields we need
  const hits = (data.response?.hits || [])
    .filter((hit) => hit.type === 'song')
    .map((hit) => ({
      id: hit.result.id,
      trackName: hit.result.title,
      artistName: hit.result.primary_artist?.name,
      albumArt: hit.result.song_art_image_thumbnail_url,
    }));

  res.status(200).json({ hits });
}
