import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayerCard } from '../components/PlayerCard';
import { CaptainIdentityBar } from '../components/CaptainIdentityBar';
import { MySquadPanel } from '../components/MySquadPanel';
import { BidFeed } from '../components/BidFeed';
import { BidPanel } from '../components/BidPanel';
import { BidHero } from '../components/BidHero';
import { useAuctionData } from '../hooks/useAuctionData';
import { useAuctionEngine, useCountdown } from '../hooks/useAuctionEngine';
import { useRoomId } from '../hooks/useRoom';
import { getCaptainId } from '../hooks/useSession';
import { isAuctionPaused, canShowLiveAuction, canPlaceBids } from '../lib/auctionState';
import { formatSoldMessage } from '../lib/auctionLogic';
import { RESULT_SECONDS } from '../types';

export function AuctionPage() {
  const roomId = useRoomId();
  const { state, captains, players, bids, loading } = useAuctionData(roomId);
  const navigate = useNavigate();
  const captainId = getCaptainId(roomId);
  const me = captains.find((c) => c.id === captainId);

  const currentPlayer = players.find((p) => p.id === state.currentPlayerId);
  const isPaused = isAuctionPaused(state);
  const countdown = useCountdown(state.bidDeadline, isPaused, state.pausedRemainingMs);
  const resultCountdown = useCountdown(state.resultEndsAt, false, null);
  const currentBid = state.currentBid?.amount ?? 0;
  const highBidder = state.currentBid?.captainName ?? '—';

  useAuctionEngine(roomId, state, players, captains);

  const timerExpired = state.phase === 'live' && !isPaused && countdown === 0;
  const pendingSold = timerExpired && !!state.currentBid;
  const pendingUnsold = timerExpired && !state.currentBid;
  const heroPhase =
    state.phase === 'result'
      ? 'result'
      : pendingSold || pendingUnsold
        ? 'result'
        : state.phase === 'unsold'
          ? 'unsold'
          : 'live';
  const heroResult =
    state.resultDisplay ??
    (pendingSold && state.currentBid && state.currentPlayerId
      ? {
          message: formatSoldMessage(
            currentPlayer?.name ?? 'Player',
            state.currentBid.captainName,
            state.currentBid.amount,
          ),
          playerId: state.currentPlayerId,
          captainId: state.currentBid.captainId,
          amount: state.currentBid.amount,
        }
      : pendingUnsold && state.currentPlayerId
        ? { message: 'Unsold', playerId: state.currentPlayerId }
        : null);
  const heroResultCountdown =
    state.phase === 'result'
      ? resultCountdown
      : pendingSold || pendingUnsold
        ? resultCountdown > 0
          ? resultCountdown
          : RESULT_SECONDS
        : resultCountdown;

  useEffect(() => {
    if (loading) return;
    if (state.phase === 'lobby' || state.phase === 'waiting') {
      navigate(captainId ? `/room/${roomId}/lobby` : `/room/${roomId}/admin`);
    }
    if (state.phase === 'ended') navigate(`/room/${roomId}/final`);
  }, [loading, state.phase, navigate, captainId, roomId]);

  return (
    <Layout
      title="Live Auction"
      subtitle={state.isUnsoldRound ? 'Unsold Round' : state.displayName}
      badge={isPaused ? 'PAUSED' : roomId}
      captainName={me ? `${me.name} (${me.teamName})` : undefined}
    >
      {me && <CaptainIdentityBar captain={me} />}

      {isPaused && state.phase === 'live' && (
        <div className="pause-banner">Auction paused by admin</div>
      )}

      {state.currentPlayerId && canShowLiveAuction(state) && (
        <div className="auction-stack">
          {currentPlayer ? (
            <PlayerCard player={currentPlayer} large />
          ) : (
            <div className="card"><p>Loading player...</p></div>
          )}

          <BidHero
            phase={heroPhase}
            currentBidAmount={currentBid}
            highBidder={highBidder}
            bidCountdown={countdown}
            resultCountdown={heroResultCountdown}
            paused={isPaused}
            resultDisplay={heroResult}
          />

          {me && state.phase === 'live' && currentPlayer && (
            <BidPanel
              key={`bid-${state.currentPlayerId}`}
              roomId={roomId}
              captain={me}
              player={currentPlayer}
              currentHighBid={currentBid}
              disabled={!canPlaceBids(state)}
            />
          )}

          <BidFeed bids={bids} />
        </div>
      )}

      {me && <MySquadPanel captain={me} />}
    </Layout>
  );
}
