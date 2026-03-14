import { Card, Spinner } from '@heroui/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlobalToolbar from '../components/GlobalToolbar';
import { supabase } from '../supabase';
import './AdminPage.css';

function AdminPage() {
  const [profiles, setProfiles] = useState([]);
  const [songStats, setSongStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
      supabase.from('songs').select('user_id, updated_at'),
    ]).then(([profilesRes, songsRes]) => {
      if (profilesRes.error || songsRes.error) {
        console.error('Admin data fetch failed:', profilesRes.error, songsRes.error);
        setError('Failed to load admin data.');
        return;
      }

      setProfiles(profilesRes.data || []);

      // Aggregate song stats per user
      const stats = {};
      for (const song of songsRes.data || []) {
        if (!stats[song.user_id]) {
          stats[song.user_id] = { count: 0, lastActive: null };
        }
        stats[song.user_id].count++;
        const updatedAt = new Date(song.updated_at);
        if (!stats[song.user_id].lastActive || updatedAt > stats[song.user_id].lastActive) {
          stats[song.user_id].lastActive = updatedAt;
        }
      }
      setSongStats(stats);
    }).catch((err) => {
      console.error('Admin data fetch failed:', err);
      setError('Failed to load admin data.');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const totalSongs = Object.values(songStats).reduce((sum, s) => sum + s.count, 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="admin-page">
      <GlobalToolbar />
      <main className="admin-content">
        <div className="admin-header">
          <h2 className="admin-title">Admin</h2>
          <Link to="/" className="admin-back-link">← All songs</Link>
        </div>

        {loading ? (
          <div className="admin-loading">
            <Spinner size="lg" color="accent" />
          </div>
        ) : error ? (
          <div className="admin-error">{error}</div>
        ) : (
          <>
            <div className="admin-stats">
              <Card className="admin-stat-card">
                <Card.Content>
                  <div className="admin-stat-value">{profiles.length}</div>
                  <div className="admin-stat-label">Total Users</div>
                </Card.Content>
              </Card>
              <Card className="admin-stat-card">
                <Card.Content>
                  <div className="admin-stat-value">{totalSongs}</div>
                  <div className="admin-stat-label">Total Songs</div>
                </Card.Content>
              </Card>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Signed Up</th>
                  <th>Last Active</th>
                  <th>Songs</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => {
                  const stats = songStats[profile.id];
                  const lastActive = stats?.lastActive
                    ? formatDate(stats.lastActive)
                    : formatDate(profile.created_at);
                  return (
                    <tr key={profile.id}>
                      <td>
                        {profile.avatar_url && (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="admin-user-avatar"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {profile.full_name || '—'}
                      </td>
                      <td>{profile.email || '—'}</td>
                      <td>{formatDate(profile.created_at)}</td>
                      <td>{lastActive}</td>
                      <td>{stats?.count || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminPage;
