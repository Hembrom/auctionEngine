import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import { setSpectator } from '../hooks/useSession';
import { pathForAuctionPhase } from '../lib/roomUtils';

export function SpectatorPage() {
  const roomId = useRoomId();
  const navigate = useNavigate();
  const { state, loading, firebaseError } = useAuctionData(roomId);

  useEffect(() => {
    if (loading || firebaseError) return;
    setSpectator(roomId);
    navigate(pathForAuctionPhase(roomId, state.phase), { replace: true });
  }, [loading, firebaseError, state.phase, roomId, navigate]);

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
        <p>Entering as spectator…</p>
        <p className="muted join-alt-link">
          Want to bid? <Link to={`/room/${roomId}`}>Join as a captain</Link>
        </p>
      </div>
    </Layout>
  );
}
