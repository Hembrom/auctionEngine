import type { Captain } from '../types';
import { formatRemainingSlots, getAvailableBudget } from '../lib/auctionLogic';

interface MySquadPanelProps {
  captain: Captain;
}

export function MySquadPanel({ captain }: MySquadPanelProps) {
  const available = getAvailableBudget(captain);
  const byPosition = { GK: [], DEF: [], MID: [], ST: [] } as Record<
    string,
    typeof captain.squad
  >;
  for (const p of captain.squad) {
    byPosition[p.position].push(p);
  }

  return (
    <div className="my-squad-panel">
      <div className="my-squad-header">
        <h3>My Squad — {captain.name}</h3>
        <span className="my-squad-team">{captain.teamName}</span>
      </div>
      <div className="my-squad-stats">
        <span>
          Budget: <strong>₹{captain.budget}</strong>
        </span>
        <span>
          Available to bid: <strong>₹{available}</strong>
        </span>
        <span>
          Players: <strong>{captain.squad.length}/7</strong>
        </span>
        <span>
          Need: <strong>{formatRemainingSlots(captain)}</strong>
        </span>
      </div>

      {captain.squad.length === 0 ? (
        <p className="muted my-squad-empty">No players bought yet</p>
      ) : (
        <ul className="my-squad-list">
          {captain.squad.map((p) => (
            <li key={p.playerId}>
              <span className={`pos-tag pos-${p.position.toLowerCase()}`}>{p.position}</span>
              <span className="my-squad-name">{p.name}</span>
              <span className="muted">₹{p.price}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
