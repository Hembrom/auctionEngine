import { useEffect, useState } from 'react';
import type { Captain, Player } from '../types';
import {
  getAvailableBudget,
  isEligibleToBid,
} from '../lib/auctionLogic';
import { placeBid } from '../lib/auctionService';
import { STARTING_BID } from '../types';

interface BidPanelProps {
  roomId: string;
  captain: Captain;
  player: Player;
  currentHighBid: number;
  disabled: boolean;
}

export function BidPanel({ roomId, captain, player, currentHighBid, disabled }: BidPanelProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const minBid = currentHighBid === 0 ? STARTING_BID : currentHighBid + 1;
  const available = getAvailableBudget(captain);
  const { eligible, reason } = isEligibleToBid(captain, player, minBid, currentHighBid);

  useEffect(() => {
    if (!disabled) setError('');
  }, [disabled]);

  const handleBid = async () => {
    const bidAmount = Number(amount);
    const check = isEligibleToBid(captain, player, bidAmount, currentHighBid);
    if (!check.eligible) {
      setError(check.reason ?? 'Cannot bid');
      return;
    }

    setLoading(true);
    setError('');
    const result = await placeBid(
      roomId,
      player.id,
      captain.id,
      captain.teamName || captain.name,
      bidAmount,
    );
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Bid failed');
    } else {
      setAmount('');
    }
  };

  return (
    <div className="bid-panel">
      <p className="muted bid-panel-min">Min bid: ₹{minBid}</p>

      {!eligible && !disabled ? (
        <div className="bid-disabled">
          <p>{reason}</p>
        </div>
      ) : disabled ? (
        <div className="bid-disabled">
          <p>Bidding paused — waiting for admin to resume</p>
        </div>
      ) : (
        <div className="bid-form">
          <input
            type="number"
            min={minBid}
            max={available}
            placeholder={`₹${minBid}+`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={handleBid} disabled={loading || !amount}>
            {loading ? 'Placing...' : 'Place Bid'}
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
