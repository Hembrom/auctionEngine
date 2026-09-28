import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { AuthUserBar } from '../components/AuthUserBar';
import { useAuth } from '../context/AuthContext';
import { createRoom } from '../lib/auctionService';
import { slugifyRoomName } from '../lib/roomUtils';
import { setAdminId } from '../hooks/useSession';

export function AdminCreateRoomPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [createName, setCreateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createSlug = slugifyRoomName(createName);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      const roomId = await createRoom(createName.trim(), user.uid);
      setAdminId(roomId, user.uid);
      navigate(`/room/${roomId}/admin`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout title="Loading…" theme="admin">
        <div className="card center-card">
          <p className="muted">Loading…</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout title="New auction room" subtitle="Choose a name for your room" theme="admin">
      <FirebaseBanner />
      <FirebaseErrorBanner error={error.includes('Firestore') ? error : null} />
      <AuthUserBar />

      <div className="home-admin-card">
        <div className="card">
          <form onSubmit={handleCreate} className="join-form">
            <label htmlFor="create">Room name</label>
            <input
              id="create"
              placeholder="e.g. Friday Night Auction"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              autoFocus
            />
            {createSlug && <p className="muted">URL: /room/{createSlug}</p>}
            <button type="submit" disabled={loading || !createName.trim()}>
              {loading ? 'Creating…' : 'Create & open admin'}
            </button>
          </form>
        </div>
      </div>

      {error && !error.includes('Firestore') && <p className="error center-error">{error}</p>}
    </Layout>
  );
}
