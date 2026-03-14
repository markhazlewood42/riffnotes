import {
  Card,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
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
              <TableHeader
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'signedUp', label: 'Signed Up' },
                  { key: 'lastActive', label: 'Last Active' },
                  { key: 'songs', label: 'Songs' },
                ]}
              >
                {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
              </TableHeader>
              <TableBody items={profiles.map((profile) => {
                const stats = songStats[profile.id];
                return {
                  key: profile.id,
                  name: profile.full_name || '—',
                  avatarUrl: profile.avatar_url,
                  email: profile.email || '—',
                  signedUp: formatDate(profile.created_at),
                  lastActive: stats?.lastActive
                    ? formatDate(stats.lastActive)
                    : formatDate(profile.created_at),
                  songs: stats?.count || 0,
                };
              })}>
                {(item) => (
                  <TableRow key={item.key}>
                    <TableCell>
                      {item.avatarUrl && (
                        <img
                          src={item.avatarUrl}
                          alt=""
                          className="admin-user-avatar"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {item.name}
                    </TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{item.signedUp}</TableCell>
                    <TableCell>{item.lastActive}</TableCell>
                    <TableCell>{item.songs}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminPage;
