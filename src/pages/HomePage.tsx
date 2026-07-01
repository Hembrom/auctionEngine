import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { createRoom, roomExists, getRoom } from '../lib/auctionService';
import { slugifyRoomName, isValidRoomSlug, pathForAuctionPhase } from '../lib/roomUtils';
import { setAdminId, setSpectator } from '../hooks/useSession';

export function HomePage() {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createSlug = slugifyRoomName(createName);
  const joinSlug = slugifyRoomName(joinName);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const adminId = `admin_${Date.now()}`;
      const roomId = await createRoom(createName.trim(), adminId);
      setAdminId(roomId, adminId);
      navigate(`/room/${roomId}/admin`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim()) return;
    const roomId = slugifyRoomName(joinName);
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
      navigate(`/room/${roomId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpectate = async () => {
    if (!joinName.trim()) return;
    const roomId = slugifyRoomName(joinName);
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
    <Layout title="Football Auction" subtitle="Create or join a room">
      <FirebaseBanner />
      <FirebaseErrorBanner error={error.includes('Firestore') ? error : null} />

      <div className="grid-2">
        <div className="card">
          <h3>Create Room (Admin)</h3>
          <p className="muted">
            Start a new auction. Each room is isolated — other admins won't interfere.
          </p>
          <form onSubmit={handleCreate} className="join-form">
            <label htmlFor="create">Room Name</label>
            <input
              id="create"
              placeholder="e.g. Friday Night Auction"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            {createSlug && <p className="muted">URL: /room/{createSlug}</p>}
            <button type="submit" disabled={loading || !createName.trim()}>
              {loading ? 'Creating...' : 'Create & Open Admin'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Join Room (Captain)</h3>
          <p className="muted">Enter the room name your admin shared with you.</p>
          <form onSubmit={handleJoin} className="join-form">
            <label htmlFor="join">Room Name</label>
            <input
              id="join"
              placeholder="e.g. friday-night-auction"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
            />
            {joinSlug && <p className="muted">Room ID: {joinSlug}</p>}
            <button type="submit" disabled={loading || !joinName.trim()}>
              {loading ? 'Joining...' : 'Join as Captain'}
            </button>
            <button
              type="button"
              className="btn-link spectator-join-btn"
              disabled={loading || !joinName.trim()}
              onClick={handleSpectate}
            >
              Watch as Spectator
            </button>
          </form>
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
        <div className="card center-card"><p>Loading room...</p></div>
      </Layout>
    );
  }
  if (status === 'missing') return <RoomNotFound />;
  return <>{typeof children === 'function' ? children({ roomId }) : children}</>;
}
