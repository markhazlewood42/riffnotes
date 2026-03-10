import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Spinner } from '@heroui/react';
import { Lock, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import GlobalToolbar from '../components/GlobalToolbar';
import './SongBrowser.css';

function SongBrowser() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('songs')
      .select('id, title, updated_at, created_at, is_locked')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load songs:', error);
        setSongs(data || []);
        setLoading(false);
      });
  }, []);

  const createSong = async () => {
    const { data, error } = await supabase
      .from('songs')
      .insert({ user_id: user.id, title: '', annotations: {} })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create song:', error);
      return;
    }
    navigate(`/songs/${data.id}`);
  };

  const deleteSong = async (e, songId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this song?')) return;

    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', songId);

    if (error) {
      console.error('Failed to delete song:', error);
      return;
    }
    setSongs(prev => prev.filter(s => s.id !== songId));
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="song-browser-page">
      <GlobalToolbar />
      <main className="song-browser-content">
        <div className="song-browser-header">
          <h2 className="song-browser-title">Your Songs</h2>
          <Button color="accent" onPress={createSong}>+ New Song</Button>
        </div>

        {loading ? (
          <div className="song-browser-status">
            <Spinner size="lg" color="accent" />
          </div>
        ) : songs.length === 0 ? (
          <div className="song-browser-empty">
            <p>No songs yet.</p>
            <Button color="accent" onPress={createSong} className="mt-4">
              Create your first song
            </Button>
          </div>
        ) : (
          <div className="song-grid">
            {songs.map(song => (
              <Card
                key={song.id}
                className="song-card cursor-pointer"
                onClick={() => navigate(`/songs/${song.id}`)}
              >
                <Card.Content className="song-card-body">
                  <h3 className="song-card-title">
                    {song.title || 'Untitled'}
                  </h3>
                  <p className="song-card-date">
                    {formatDate(song.updated_at || song.created_at)}
                  </p>
                  {song.is_locked ? (
                    <span className="song-card-locked" title="This song is locked">
                      <Lock size={14} />
                    </span>
                  ) : (
                    <button
                      className="song-card-delete"
                      onClick={(e) => deleteSong(e, song.id)}
                      title="Delete song"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </Card.Content>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default SongBrowser;
