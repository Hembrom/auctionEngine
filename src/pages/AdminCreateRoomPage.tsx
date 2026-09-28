import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { AuthUserBar } from '../components/AuthUserBar';
import { useAuth } from '../context/AuthContext';
import { createRoom, listAdminRooms } from '../lib/auctionService';
import { slugifyRoomName } from '../lib/roomUtils';
import { setAdminId } from '../hooks/useSession';
import type { AdminRoomSummary } from '../types';

function formatRoomDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function AdminCreateRoomPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState<AdminRoomSummary[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState('');
  const [createName, setCreateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createSlug = slugifyRoomName(createName);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    setRoomsLoading(true);
    setRoomsError('');
    try {
      setRooms(await listAdminRooms(user.uid));
    } catch (e) {
      setRoomsError((e as Error).message);
    } finally {
      setRoomsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

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
    <Layout title="Your rooms" subtitle="Open an auction or create a new one" theme="admin">
      <FirebaseBanner />
      <FirebaseErrorBanner error={roomsError.includes('Firestore') ? roomsError : null} />
      <AuthUserBar />

      <section className="card admin-rooms-list-card">
        <div className="admin-rooms-list-header">
          <h3>My auction rooms</h3>
          {!roomsLoading && (
            <button type="button" className="btn-link" onClick={() => void loadRooms()}>
              Refresh
            </button>
          )}
        </div>
        {roomsLoading ? (
          <p className="muted">Loading rooms…</p>
        ) : roomsError ? (
          <p className="error">{roomsError}</p>
        ) : rooms.length === 0 ? (
          <p className="muted">No rooms yet — create your first auction below.</p>
        ) : (
          <ul className="admin-room-list">
            {rooms.map((room) => (
              <li key={room.roomId}>
                <Link to={`/room/${room.roomId}/admin`} className="admin-room-link">
                  <span className="admin-room-name">{room.displayName}</span>
                  <span className="muted admin-room-id">/room/{room.roomId}</span>
                </Link>
                <span className={`phase-pill phase-${room.phase}`}>{room.phase}</span>
                <span className="muted admin-room-date">{formatRoomDate(room.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="home-admin-card">
        <div className="card">
          <h3>Create new room</h3>
          <form onSubmit={handleCreate} className="join-form">
            <label htmlFor="create">Room name</label>
            <input
              id="create"
              placeholder="e.g. Friday Night Auction"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
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
