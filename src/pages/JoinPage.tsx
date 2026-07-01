import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import { requestJoin } from '../lib/auctionService';
import { setCaptainId } from '../hooks/useSession';

export function JoinPage() {
  const roomId = useRoomId();
  const navigate = useNavigate();
  const { state, firebaseError } = useAuctionData(roomId);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const id = await requestJoin(roomId, name.trim());
      setCaptainId(roomId, id);
      navigate(`/room/${roomId}/waiting`);
    } catch (e) {
      setError((e as Error).message || 'Failed to join.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title={state.displayName || roomId}
      subtitle="Enter your name to join as a captain"
      badge={roomId}
    >
      <FirebaseBanner />
      <FirebaseErrorBanner error={firebaseError} />
      <div className="card center-card">
        <form onSubmit={handleJoin} className="join-form">
          <label htmlFor="name">Captain Name</label>
          <input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Requesting...' : 'Request to Join'}
          </button>
          {error && <p className="error">{error}</p>}
          <p className="muted join-alt-link">
            Just watching? <a href={`/room/${roomId}/spectate`}>Enter as spectator</a>
          </p>
        </form>
      </div>
    </Layout>
  );
}
