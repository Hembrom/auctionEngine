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

  const units = [
    ...(days > 0 ? [{ key: 'days', value: days, label: 'days' }] : []),
    { key: 'hours', value: hours, label: 'hours' },
    { key: 'minutes', value: minutes, label: 'mins' },
    { key: 'seconds', value: seconds, label: 'secs' },
  ];

  const imminent = remaining > 0 && remaining <= 60 * 60 * 1000;

  return (
    <div className={`auction-countdown${imminent ? ' is-imminent' : ''}`}>
      <div className="auction-countdown-glow" aria-hidden="true" />
      <div className="auction-countdown-body">
        <span className="auction-countdown-badge">
          <span className="auction-countdown-dot" />
          Auction starts
        </span>

        {remaining <= 0 ? (
          <p className="auction-countdown-live">Starting any moment now…</p>
        ) : (
          <div className="auction-countdown-grid">
            {units.map((unit, index) => (
              <div className="auction-countdown-cell" key={unit.key}>
                <div className="auction-countdown-unit">
                  <strong>{pad(unit.value)}</strong>
                  <span>{unit.label}</span>
                </div>
                {index < units.length - 1 && (
                  <span className="auction-countdown-sep" aria-hidden="true">
                    :
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="auction-countdown-time">{formatAuctionStartLabel(startsAt)} IST</p>
      </div>
    </div>
  );
}
