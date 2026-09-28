import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CaptainIdentityBar } from '../components/CaptainIdentityBar';
import { MySquadPanel } from '../components/MySquadPanel';
import { LiveAuctionPanel } from '../components/LiveAuctionPanel';
import { AuthUserBar } from '../components/AuthUserBar';
import { useAuctionData } from '../hooks/useAuctionData';
import { useAuctionEngine } from '../hooks/useAuctionEngine';
import { useRoomId } from '../hooks/useRoom';
import { isSpectator } from '../hooks/useSession';
import { useCaptainSession } from '../hooks/useCaptainSession';
import { useRequireCaptainLogin } from '../hooks/useRequireCaptainLogin';
import { useAuth } from '../context/AuthContext';
import { captainMatchesUser } from '../lib/captainAccess';
import { pathForAuctionPhase } from '../lib/roomUtils';

function AuctionPageCaptain() {
  const roomId = useRoomId();
  const { state, captains, players, bids, loading } = useAuctionData(roomId);
  const navigate = useNavigate();
  const { user, loading: authGateLoading } = useRequireCaptainLogin(roomId);
  const { user: authedUser } = useAuth();
  const { authLoading, captainId } = useCaptainSession(roomId);
  const me = captains.find((c) => c.id === captainId);

  useAuctionEngine(roomId, state, players, captains);

  useEffect(() => {
    if (loading || authLoading || authGateLoading) return;

    if (!captainId) {
      navigate(`/room/${roomId}`, { replace: true });
      return;
    }

    if (state.phase === 'lobby' || state.phase === 'waiting') {
      navigate(pathForAuctionPhase(roomId, state.phase));
      return;
    }
    if (state.phase === 'ended') navigate(`/room/${roomId}/final`);
  }, [loading, authLoading, authGateLoading, state.phase, navigate, captainId, roomId]);

  if (authGateLoading || !user) {
    return null;
  }

  if (me && !captainMatchesUser(me, authedUser?.uid)) {
    return (
      <div className="card center-card">
        <p className="error">This captain profile is linked to a different account.</p>
      </div>
    );
  }

  return (
    <>
      {me && <CaptainIdentityBar captain={me} />}

      <p className="players-nav">
        <Link to={`/room/${roomId}/players`} className="btn-link">
          Browse Players (available / sold)
        </Link>
      </p>

      <LiveAuctionPanel
        roomId={roomId}
        state={state}
        players={players}
        bids={bids}
        captains={captains}
        captainId={captainId}
        showBidPanel
      />

      {me && <MySquadPanel captain={me} />}
    </>
  );
}

export function AuctionPage() {
  const roomId = useRoomId();
  const { state, loading } = useAuctionData(roomId);
  const navigate = useNavigate();
  const spectating = isSpectator(roomId);

  useEffect(() => {
    if (loading) return;
    if (spectating) {
      navigate(`/room/${roomId}/spectate`, { replace: true });
    }
  }, [loading, spectating, navigate, roomId]);

  if (spectating) {
    return null;
  }

  return (
    <Layout
      title="Live Auction"
      subtitle={
        state.phase === 'unsold'
          ? 'Unsold players remaining'
          : state.isUnsoldRound
            ? 'Unsold Round'
            : state.displayName
      }
      badge={roomId}
      theme="captain"
    >
      <AuthUserBar />
      <AuctionPageCaptain />
    </Layout>
  );
}
