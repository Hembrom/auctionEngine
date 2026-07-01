import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import { isSpectator, setSpectator } from '../hooks/useSession';
import { pathForAuctionPhase } from '../lib/roomUtils';

export function SpectatorPage() {
  const roomId = useRoomId();
  const navigate = useNavigate();
  const { state, loading, firebaseError } = useAuctionData(roomId);
  const watching = isSpectator(roomId);

  useEffect(() => {
    if (loading || !watching) return;
    navigate(pathForAuctionPhase(roomId, state.phase), { replace: true });
  }, [loading, watching, state.phase, roomId, navigate]);

  const handleWatch = () => {
    setSpectator(roomId);
    navigate(pathForAuctionPhase(roomId, state.phase));
  };

  return (
    <Layout
      title={state.displayName || roomId}
      subtitle="Watch the auction live"
      badge="Spectator"
    >
      <FirebaseBanner />
      <FirebaseErrorBanner error={firebaseError} />
      <div className="card center-card">
        <p className="muted">
          Spectators can follow the live auction, see bids, and view final teams — but cannot bid
          or join as a captain.
        </p>
        <button type="button" className="btn-primary btn-lg" onClick={handleWatch}>
          Enter as Spectator
        </button>
        <p className="muted join-alt-link">
          Want to bid?{' '}
          <a href={`/room/${roomId}`}>Join as a captain</a>
        </p>
      </div>
    </Layout>
  );
}
