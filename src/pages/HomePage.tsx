import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { createRoom, roomExists, getRoom } from '../lib/auctionService';
import { slugifyRoomName, isValidRoomSlug, pathForAuctionPhase } from '../lib/roomUtils';
import { setAdminId, setSpectator } from '../hooks/useSession';
import { useAuth } from '../context/AuthContext';
import { AuthUserBar } from '../components/AuthUserBar';

export function HomePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [createName, setCreateName] = useState('');
  const [watchName, setWatchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createSlug = slugifyRoomName(createName);
  const watchSlug = slugifyRoomName(watchName);

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

  const handleSpectate = async () => {
    if (!watchName.trim()) return;
    const roomId = slugifyRoomName(watchName);
    if (!isValidRoomSlug(roomId)) {
      setError('Enter a valid room name (at least 3 characters).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const exists = await roomExists(roomId);
      if (!exists) {
        setError(`Room "${roomId}" not found. Check the name with your admin.`);
        return;
      }
      const room = await getRoom(roomId);
      setSpectator(roomId);
      navigate(pathForAuctionPhase(roomId, room?.phase ?? 'waiting'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Football Auction" subtitle="Create or watch an auction">
      <FirebaseBanner />
      <FirebaseErrorBanner error={error.includes('Firestore') ? error : null} />
      <AuthUserBar />

      <div className="grid-2">
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

        <div className="card">
          <h3>Watch as Spectator</h3>
          <p className="muted">Enter the room name your admin shared with you.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSpectate();
            }}
            className="join-form"
          >
            <label htmlFor="watch">Room Name</label>
            <input
              id="watch"
              placeholder="e.g. friday-night-auction"
              value={watchName}
              onChange={(e) => setWatchName(e.target.value)}
            />
            {watchSlug && <p className="muted">Room ID: {watchSlug}</p>}
            <button type="submit" disabled={loading || !watchName.trim()}>
              {loading ? 'Opening…' : 'Watch Live'}
            </button>
          </form>
          <p className="muted home-captain-note">
            Captains: use the <strong>room link</strong> from your admin (e.g. /room/your-room-name) to
            sign in and join — not from this page.
          </p>
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
