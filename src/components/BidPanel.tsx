import { useEffect, useState } from 'react';
import type { Captain, Player } from '../types';
import {
  getAvailableBudget,
  isEligibleToBid,
} from '../lib/auctionLogic';
import { optOutOfBid, placeBid } from '../lib/auctionService';
import { STARTING_BID } from '../types';

const QUICK_BID_INCREMENTS = [1, 5, 10] as const;

interface BidPanelProps {
  roomId: string;
  captain: Captain;
  player: Player;
  currentHighBid: number;
  currentBidderId?: string | null;
  optedOutCaptainIds?: string[];
  disabled: boolean;
}

function getQuickBidAmount(increment: number, currentHighBid: number): number {
  const base = currentHighBid === 0 ? STARTING_BID : currentHighBid;
  return base + increment;
}

export function BidPanel({
  roomId,
  captain,
  player,
  currentHighBid,
  currentBidderId,
  optedOutCaptainIds = [],
  disabled,
}: BidPanelProps) {
  const [error, setError] = useState('');
  const [loadingIncrement, setLoadingIncrement] = useState<number | null>(null);
  const [optOutBusy, setOptOutBusy] = useState(false);

  const minBid = currentHighBid === 0 ? STARTING_BID : currentHighBid + 1;
  const available = getAvailableBudget(captain);
  const isHighBidder = currentBidderId === captain.id;
  const hasOptedOut = optedOutCaptainIds.includes(captain.id);
  const { eligible, reason } = isEligibleToBid(captain, player, minBid, currentHighBid);

  useEffect(() => {
    if (!disabled) setError('');
  }, [disabled, currentHighBid, currentBidderId]);

  const handleQuickBid = async (increment: number) => {
    const bidAmount = getQuickBidAmount(increment, currentHighBid);
    const check = isEligibleToBid(captain, player, bidAmount, currentHighBid);
    if (!check.eligible) {
      setError(check.reason ?? 'Cannot bid');
      return;
    }

    setLoadingIncrement(increment);
    setError('');
    const result = await placeBid(
      roomId,
      player.id,
      captain.id,
      captain.teamName || captain.name,
      bidAmount,
    );
    setLoadingIncrement(null);
    if (!result.success) {
      setError(result.error ?? 'Bid failed');
    }
  };

  const handleOptOut = async () => {
    setOptOutBusy(true);
    setError('');
    try {
      await optOutOfBid(roomId, captain.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOptOutBusy(false);
    }
  };

  return (
    <div className="bid-panel">
      <p className="muted bid-panel-min">
        Min bid: ₹{minBid} · Available: ₹{available}
      </p>

      {hasOptedOut ? (
        <div className="bid-disabled">
          <p>You opted out of this player.</p>
        </div>
      ) : isHighBidder ? (
        <div className="bid-disabled bid-high-bidder">
          <p>You are the highest bidder — waiting for a counter bid.</p>
        </div>
      ) : disabled ? (
        <div className="bid-disabled">
          <p>Bidding paused — waiting for admin to resume</p>
        </div>
      ) : !eligible ? (
        <div className="bid-disabled">
          <p>{reason}</p>
          <button
            type="button"
            className="btn-opt-out"
            onClick={handleOptOut}
            disabled={optOutBusy}
          >
            {optOutBusy ? 'Opting out…' : 'Opt Out'}
          </button>
        </div>
      ) : (
        <>
          <div className="bid-quick-buttons">
            {QUICK_BID_INCREMENTS.map((increment) => {
              const bidAmount = getQuickBidAmount(increment, currentHighBid);
              const canBid = isEligibleToBid(captain, player, bidAmount, currentHighBid).eligible;
              const isLoading = loadingIncrement === increment;

              return (
                <button
                  key={increment}
                  type="button"
                  className="bid-quick-btn"
                  onClick={() => handleQuickBid(increment)}
                  disabled={!canBid || loadingIncrement !== null || optOutBusy}
                >
                  <span className="bid-quick-label">+{increment}</span>
                  <span className="bid-quick-amount">
                    {isLoading ? 'Placing...' : `₹${bidAmount}`}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn-opt-out"
            onClick={handleOptOut}
            disabled={optOutBusy || loadingIncrement !== null}
          >
            {optOutBusy ? 'Opting out…' : 'Opt Out of This Player'}
          </button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
