import type { ReactNode } from 'react';
import type { Player } from '../types';

interface UnsoldPlayersPanelProps {
  players: Player[];
  title?: string;
  hint?: string;
  actions?: ReactNode;
}

export function UnsoldPlayersPanel({
  players,
  title = 'Unsold Players',
  hint,
  actions,
}: UnsoldPlayersPanelProps) {
  return (
    <section className="card admin-wide unsold-panel">
      <h3>
        {title} ({players.length})
      </h3>
      {hint && <p className="muted unsold-panel-hint">{hint}</p>}
      {players.length === 0 ? (
        <p className="muted">No unsold players.</p>
      ) : (
        <ul className="player-list unsold-player-list">
          {players.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong>
              <span className="muted"> ({p.positions.join('/')})</span>
            </li>
          ))}
        </ul>
      )}
      {actions && <div className="admin-controls unsold-panel-actions">{actions}</div>}
    </section>
  );
}
