import { Card, Spinner, Table } from '@heroui/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlobalToolbar from '../components/GlobalToolbar';
import { supabase } from '../supabase';
import './AdminPage.css';

function AdminPage() {
  const [profiles, setProfiles] = useState([]);
  const [songStats, setSongStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('songs').select('user_id, updated_at'),
    ]).then(([profilesRes, songsRes]) => {
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

            <Table aria-label="Users">
              <Table.Header>
                <Table.Column>Name</Table.Column>
                <Table.Column>Email</Table.Column>
                <Table.Column>Signed Up</Table.Column>
                <Table.Column>Last Active</Table.Column>
                <Table.Column>Songs</Table.Column>
              </Table.Header>
              <Table.Body>
                {profiles.map((profile) => {
                  const stats = songStats[profile.id];
                  const lastActive = stats?.lastActive
                    ? formatDate(stats.lastActive)
                    : formatDate(profile.created_at);
                  return (
                    <Table.Row key={profile.id}>
                      <Table.Cell>
                        {profile.avatar_url && (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="admin-user-avatar"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {profile.full_name || '—'}
                      </Table.Cell>
                      <Table.Cell>{profile.email || '—'}</Table.Cell>
                      <Table.Cell>{formatDate(profile.created_at)}</Table.Cell>
                      <Table.Cell>{lastActive}</Table.Cell>
                      <Table.Cell>{stats?.count || 0}</Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminPage;
