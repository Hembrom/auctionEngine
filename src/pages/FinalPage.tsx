import { Layout } from '../components/Layout';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import type { Captain } from '../types';

function TeamCard({ captain }: { captain: Captain }) {
  const byPosition = { GK: [], DEF: [], MID: [], ST: [] } as Record<string, typeof captain.squad>;
  for (const p of captain.squad) {
    byPosition[p.position].push(p);
  }

  return (
    <div className="team-card">
      <div className="team-header">
        <h3>{captain.teamName}</h3>
        <span className="muted">{captain.name}</span>
      </div>
      <p>
        Remaining budget: <strong>₹{captain.budget}</strong> · {captain.squad.length}/7 players
      </p>
      <div className="team-squad">
        {(['GK', 'DEF', 'MID', 'ST'] as const).map((pos) => (
          <div key={pos} className="squad-position">
            <h4>{pos}</h4>
            {byPosition[pos].length === 0 ? (
              <p className="muted">—</p>
            ) : (
              <ul>
                {byPosition[pos].map((p) => (
                  <li key={p.playerId}>
                    {p.name} <span className="muted">₹{p.price}</span>
                  </li>
                ))}
              </ul>
            )}
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
