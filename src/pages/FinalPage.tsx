import { Layout } from '../components/Layout';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import type { Captain, Position } from '../types';

const POSITION_ORDER: Position[] = ['GK', 'DEF', 'MID', 'ST'];

function TeamCard({ captain }: { captain: Captain }) {
  const byPosition = { GK: [], DEF: [], MID: [], ST: [] } as Record<Position, typeof captain.squad>;
  for (const p of captain.squad) {
    byPosition[p.position].push(p);
  }

  return (
    <div className="team-card">
      <div className="team-header">
        <h3>{captain.teamName}</h3>
        <span className="muted">{captain.name}</span>
      </div>
      <p className="team-meta">
        Budget left: <strong>₹{captain.budget}</strong> · {captain.squad.length}/7
      </p>
      <div className="team-squad-rows">
        {POSITION_ORDER.map((pos) => (
          <div key={pos} className="team-squad-row">
            <span className={`team-pos-label pos-tag pos-${pos.toLowerCase()}`}>{pos}</span>
            <div className="team-pos-players">
              {byPosition[pos].length === 0 ? (
                <span className="muted">—</span>
              ) : (
                byPosition[pos].map((p) => (
                  <div key={p.playerId} className="team-player-line">
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

export function FinalPage() {
  const roomId = useRoomId();
  const { state, captains } = useAuctionData(roomId);
  const approved = captains.filter((c) => c.status === 'approved');

  return (
    <Layout title="Final Teams" subtitle={state.displayName || 'Auction complete'} badge={roomId}>
      <div className="teams-grid">
        {approved.map((c) => (
          <TeamCard key={c.id} captain={c} />
        ))}
      </div>
    </Layout>
  );
}
