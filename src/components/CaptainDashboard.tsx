import type { Captain, Position } from '../types';
import { formatRemainingSlots, getAvailableBudget } from '../lib/auctionLogic';

const POSITION_ORDER: Position[] = ['GK', 'DEF', 'MID', 'ST'];

interface CaptainDashboardProps {
  captains: Captain[];
  highlightCaptainId?: string | null;
  title?: string;
}

function CaptainSquadCard({
  captain,
  highlight,
}: {
  captain: Captain;
  highlight?: boolean;
}) {
  const available = getAvailableBudget(captain);
  const byPosition = { GK: [], DEF: [], MID: [], ST: [] } as Record<Position, typeof captain.squad>;
  for (const p of captain.squad) {
    byPosition[p.position].push(p);
  }

  return (
    <div className={`captain-squad-card ${highlight ? 'captain-squad-card-highlight' : ''}`}>
      <div className="captain-squad-card-header">
        <div>
          <h4>{captain.teamName}</h4>
          <span className="muted">{captain.name}</span>
          {highlight && <span className="you-badge">You</span>}
        </div>
      </div>
      <div className="captain-squad-card-stats">
        <span>Budget <strong>₹{captain.budget}</strong></span>
        <span>Available <strong>₹{available}</strong></span>
        <span>Players <strong>{captain.squad.length}/7</strong></span>
      </div>
      <p className="muted captain-squad-need">Need: {formatRemainingSlots(captain)}</p>
      <div className="captain-squad-rows">
        {POSITION_ORDER.map((pos) => (
          <div key={pos} className="captain-squad-row">
            <span className={`pos-tag pos-${pos.toLowerCase()}`}>{pos}</span>
            <div className="captain-squad-players">
              {byPosition[pos].length === 0 ? (
                <span className="muted">—</span>
              ) : (
                byPosition[pos].map((p) => (
                  <div key={p.playerId} className="captain-squad-player">
                    <span>{p.name}</span>
                    <span className="muted">₹{p.price}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CaptainDashboard({
  captains,
  highlightCaptainId,
  title = 'All Teams',
}: CaptainDashboardProps) {
  const approved = captains.filter((c) => c.status === 'approved');

  if (approved.length === 0) {
    return (
      <div className="captain-squads-board">
        <h3>{title}</h3>
        <p className="muted">No approved captains yet.</p>
      </div>
    );
  }

  return (
    <div className="captain-squads-board">
      <h3>{title}</h3>
      <div className="captain-squads-grid">
        {approved.map((c) => (
          <CaptainSquadCard
            key={c.id}
            captain={c}
            highlight={c.id === highlightCaptainId}
          />
        ))}
      </div>
    </div>
  );
}
