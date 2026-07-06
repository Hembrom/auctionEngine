import type { Player } from '../types';

function PosTags({ positions }: { positions: string[] }) {
  return (
    <span className="player-board-positions">
      {positions.map((p) => (
        <span key={p} className={`pos-tag pos-${p.toLowerCase()}`}>
          {p}
        </span>
      ))}
    </span>
  );
}

interface PlayersLeftPanelProps {
  players: Player[];
}

export function PlayersLeftPanel({ players }: PlayersLeftPanelProps) {
  const sold = players.filter((p) => p.status === 'sold');
  const left = players
    .filter((p) => p.status !== 'sold')
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="card admin-wide players-left-panel">
      <div className="player-board-header">
        <h3>Players Left</h3>
        <div className="player-board-summary">
          <span className="player-board-pill player-board-pill-live">{left.length} remaining</span>
          <span className="player-board-pill player-board-pill-sold">{sold.length} sold</span>
          <span className="player-board-pill muted">{players.length} total</span>
        </div>
      </div>

      <p className="muted player-board-hint">
        Still in the pool — auction order is not shown.
      </p>

      {left.length === 0 ? (
        <p className="muted player-board-empty">No players left in the pool</p>
      ) : (
        <ul className="players-left-list">
          {left.map((p) => (
            <li key={p.id}>
              <span className="players-left-name">{p.name}</span>
              <PosTags positions={p.positions} />
              {p.status === 'unsold' && <span className="players-left-tag">unsold</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
