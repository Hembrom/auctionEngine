import { useEffect, useState } from 'react';
import type { Captain, Player } from '../types';
import {
  getAvailableBudget,
  isEligibleToBid,
} from '../lib/auctionLogic';
import { placeBid } from '../lib/auctionService';
import { STARTING_BID } from '../types';

const QUICK_BID_INCREMENTS = [1, 5, 10] as const;

interface BidPanelProps {
  roomId: string;
  captain: Captain;
  player: Player;
  currentHighBid: number;
  disabled: boolean;
}

function getQuickBidAmount(increment: number, currentHighBid: number): number {
  const minBid = currentHighBid === 0 ? STARTING_BID : currentHighBid + 1;
  if (increment === 1) return minBid;
  const reference = currentHighBid === 0 ? STARTING_BID : currentHighBid;
  return reference + increment;
}

export function BidPanel({ roomId, captain, player, currentHighBid, disabled }: BidPanelProps) {
  const [error, setError] = useState('');
  const [loadingIncrement, setLoadingIncrement] = useState<number | null>(null);

  const minBid = currentHighBid === 0 ? STARTING_BID : currentHighBid + 1;
  const available = getAvailableBudget(captain);
  const { eligible, reason } = isEligibleToBid(captain, player, minBid, currentHighBid);

  useEffect(() => {
    if (!disabled) setError('');
  }, [disabled]);

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

  return (
    <div className="bid-panel">
      <p className="muted bid-panel-min">
        Min bid: ₹{minBid} · Available: ₹{available}
      </p>

      {!eligible && !disabled ? (
        <div className="bid-disabled">
          <p>{reason}</p>
        </div>
      ) : disabled ? (
        <div className="bid-disabled">
          <p>Bidding paused — waiting for admin to resume</p>
        </div>
      ) : (
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
                disabled={!canBid || loadingIncrement !== null}
              >
                <span className="bid-quick-label">+{increment}</span>
                <span className="bid-quick-amount">
                  {isLoading ? 'Placing...' : `₹${bidAmount}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
