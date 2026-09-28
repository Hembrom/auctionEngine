import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { createRoom, roomExists } from '../lib/auctionService';
import { slugifyRoomName } from '../lib/roomUtils';
import { setAdminId } from '../hooks/useSession';
import { useAuth } from '../context/AuthContext';
import { AuthUserBar } from '../components/AuthUserBar';

export function HomePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [createName, setCreateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createSlug = slugifyRoomName(createName);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    if (!user) {
      navigate(`/login/admin?next=${encodeURIComponent('/')}`);
      return;
    }
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

  return (
    <Layout title="Football Auction" subtitle="Create an auction room">
      <FirebaseBanner />
      <FirebaseErrorBanner error={error.includes('Firestore') ? error : null} />
      <AuthUserBar />

      <div className="home-admin-card">
        <div className="card">
          <h3>Create Room (Admin)</h3>
          <p className="muted">Start a new auction. Your account owns the room.</p>
          {!authLoading && !user ? (
            <div className="home-auth-cta">
              <Link to="/login/admin" className="btn-primary home-auth-link">
                Admin sign in
              </Link>
              <p className="muted">Sign in or create an admin account, then create your room.</p>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="join-form">
              <label htmlFor="create">Room Name</label>
              <input
                id="create"
                placeholder="e.g. Friday Night Auction"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
              {createSlug && <p className="muted">URL: /room/{createSlug}</p>}
              <button type="submit" disabled={loading || !createName.trim() || !user}>
                {loading ? 'Creating...' : 'Create & Open Admin'}
              </button>
            </form>
          )}
        </div>
      </div>

      {error && !error.includes('Firestore') && <p className="error center-error">{error}</p>}
    </Layout>
  );
}

export function RoomNotFound() {
  const navigate = useNavigate();
  return (
    <Layout title="Room Not Found">
      <div className="card center-card">
        <p>This room doesn't exist or hasn't been created yet.</p>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    </Layout>
  );
}

export function RoomGuard({
  roomId,
  children,
}: {
  roomId: string;
  children: React.ReactNode | ((props: { roomId: string }) => React.ReactNode);
}) {
  const [status, setStatus] = useState<'loading' | 'found' | 'missing'>('loading');

  useEffect(() => {
    roomExists(roomId).then((exists) => setStatus(exists ? 'found' : 'missing'));
  }, [roomId]);

  if (status === 'loading') {
    return (
      <Layout title="Loading...">
        <div className="card center-card">
          <p>Loading room...</p>
        </div>
      </Layout>
    );
  }
  if (status === 'missing') return <RoomNotFound />;
  return <>{typeof children === 'function' ? children({ roomId }) : children}</>;
}
