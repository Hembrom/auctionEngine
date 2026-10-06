import { useEffect, useState } from 'react';
import type { AuctionPhase, AuctionState } from '../types';
import {
  formatAuctionStartLabel,
  getCountdownParts,
  resolveAuctionStartTime,
} from '../lib/auctionSchedule';

interface AuctionCountdownProps {
  roomId: string;
  state: AuctionState;
}

const HIDDEN_PHASES: AuctionPhase[] = ['live', 'result', 'unsold', 'ended'];

export function AuctionCountdown({ roomId, state }: AuctionCountdownProps) {
  const startsAt = resolveAuctionStartTime(roomId, state);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startsAt]);

  if (!startsAt || HIDDEN_PHASES.includes(state.phase)) return null;

  const remaining = startsAt - now;
  const { days, hours, minutes, seconds } = getCountdownParts(remaining);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="auction-countdown card">
      <p className="auction-countdown-label">Auction starts</p>
      <p className="auction-countdown-time">{formatAuctionStartLabel(startsAt)} IST</p>
      {remaining <= 0 ? (
        <p className="auction-countdown-live">Starting any moment now…</p>
      ) : (
        <div className="auction-countdown-grid">
          {days > 0 && (
            <div className="auction-countdown-unit">
              <strong>{pad(days)}</strong>
              <span>days</span>
            </div>
          )}
          <div className="auction-countdown-unit">
            <strong>{pad(hours)}</strong>
            <span>hrs</span>
          </div>
          <div className="auction-countdown-unit">
            <strong>{pad(minutes)}</strong>
            <span>min</span>
          </div>
          <div className="auction-countdown-unit">
            <strong>{pad(seconds)}</strong>
            <span>sec</span>
          </div>
        </div>
      )}
    </div>
  );
}
