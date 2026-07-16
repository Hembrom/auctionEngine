import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { SpectatorDashboardSections } from '../components/SpectatorDashboardSections';
import { useAuctionData } from '../hooks/useAuctionData';
import { useAuctionEngine } from '../hooks/useAuctionEngine';
import { useRoomId } from '../hooks/useRoom';
import { setSpectator } from '../hooks/useSession';

export function SpectatorPage() {
  const roomId = useRoomId();
  const navigate = useNavigate();
  const { state, captains, players, bids, loading, firebaseError } = useAuctionData(roomId);

  useAuctionEngine(roomId, state, players, captains);

  useEffect(() => {
    if (loading || firebaseError) return;
    setSpectator(roomId);
  }, [loading, firebaseError, roomId]);

  useEffect(() => {
    if (loading) return;
    if (state.phase === 'ended') {
      navigate(`/room/${roomId}/final`, { replace: true });
    }
  }, [loading, state.phase, navigate, roomId]);

  return (
    <Layout
      title={state.displayName || 'Live Auction'}
      subtitle="Watch the auction live"
      badge="SPECTATOR"
      theme="spectator"
    >
      <FirebaseBanner />
      <FirebaseErrorBanner error={firebaseError} />

      {!loading && !firebaseError && (
        <>
          <p className="connection-status">
            Room <strong>{roomId}</strong> · {state.phase}
          </p>
          <p className="muted join-alt-link">
            Want to bid? <Link to={`/room/${roomId}`}>Join as a captain</Link>
          </p>

          <SpectatorDashboardSections
            roomId={roomId}
            state={state}
            players={players}
            bids={bids}
            captains={captains}
          />
        </>
      )}

      {loading && <p className="muted">Loading auction…</p>}
    </Layout>
  );
}
