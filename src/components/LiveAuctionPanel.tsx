import type { ReactNode } from 'react';
import type { AuctionState, Bid, Captain, Player } from '../types';
import { PlayerCard } from './PlayerCard';
import { BidFeed } from './BidFeed';
import { BidHero } from './BidHero';
import { BidPanel } from './BidPanel';
import { UnsoldPlayersPanel } from './UnsoldPlayersPanel';
import { useCountdown } from '../hooks/useAuctionEngine';
import {
  canPlaceBids,
  canShowLiveAuction,
  getBidTimerSeconds,
  getResultTimerSeconds,
  isAuctionPaused,
} from '../lib/auctionState';
import { formatSoldMessage, getUnsoldPlayers } from '../lib/auctionLogic';

interface LiveAuctionPanelProps {
  roomId: string;
  state: AuctionState;
  players: Player[];
  bids: Bid[];
  captains: Captain[];
  captainId?: string | null;
  adminControls?: ReactNode;
  showBidPanel?: boolean;
}

export function LiveAuctionPanel({
  roomId,
  state,
  players,
  bids,
  captains,
  captainId,
  adminControls,
  showBidPanel = false,
}: LiveAuctionPanelProps) {
  const me = captains.find((c) => c.id === captainId);
  const unsoldPlayers = getUnsoldPlayers(players);
  const bidTimerSeconds = getBidTimerSeconds(state);
  const resultTimerSeconds = getResultTimerSeconds(state);
  const currentPlayer = players.find((p) => p.id === state.currentPlayerId);
  const isPaused = isAuctionPaused(state);
  const countdown = useCountdown(state.bidDeadline, isPaused, state.pausedRemainingMs);
  const resultCountdown = useCountdown(state.resultEndsAt, false, null);
  const currentBid = state.currentBid?.amount ?? 0;
  const highBidder = state.currentBid?.captainName ?? '—';

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
          : resultTimerSeconds
        : resultCountdown;

  if (state.phase === 'lobby' || state.phase === 'waiting' || state.phase === 'setup') {
    return (
      <div className="live-auction-idle card">
        <p className="muted">Auction has not started yet. Waiting for the admin to open the lobby and start bidding.</p>
      </div>
    );
  }

  return (
    <>
      {isPaused && state.phase === 'live' && (
        <div className="pause-banner">Auction paused by admin</div>
      )}

      {adminControls}

      {state.phase === 'unsold' && (
        <UnsoldPlayersPanel
          players={unsoldPlayers}
          hint="Waiting for the admin to redo the unsold round or finish the auction."
        />
      )}

      {state.currentPlayerId && canShowLiveAuction(state) && state.phase !== 'unsold' && (
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
            bidTimerSeconds={bidTimerSeconds}
            resultTimerSeconds={resultTimerSeconds}
            paused={isPaused}
            resultDisplay={heroResult}
          />

          {showBidPanel && me && state.phase === 'live' && currentPlayer && (
            <BidPanel
              key={`bid-${state.currentPlayerId}`}
              roomId={roomId}
              captain={me}
              player={currentPlayer}
              currentHighBid={currentBid}
              currentBidderId={state.currentBid?.captainId}
              optedOutCaptainIds={state.optedOutCaptainIds}
              disabled={!canPlaceBids(state)}
            />
          )}

          <BidFeed bids={bids} />
        </div>
      )}

      {!state.currentPlayerId && state.phase !== 'unsold' && state.phase !== 'ended' && (
        <p className="muted live-auction-idle">No player on the block right now.</p>
      )}
    </>
  );
}
