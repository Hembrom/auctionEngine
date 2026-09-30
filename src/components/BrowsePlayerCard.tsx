import type { Player, PlayerMark } from '../types';
import { PlayerCard } from './PlayerCard';
import { PLAYER_MARKS, PLAYER_MARK_LABELS } from '../lib/playerUtils';

interface BrowsePlayerCardProps {
  player: Player;
  canShortlist?: boolean;
  shortlisted?: boolean;
  tags?: PlayerMark[];
  busy?: boolean;
  onToggleShortlist?: () => void;
  onToggleMark?: (mark: PlayerMark) => void;
}

export function BrowsePlayerCard({
  player,
  canShortlist = false,
  shortlisted = false,
  tags = [],
  busy = false,
  onToggleShortlist,
  onToggleMark,
}: BrowsePlayerCardProps) {
  return (
    <article className={`browse-player-card ${shortlisted ? 'browse-player-shortlisted' : ''}`}>
      <PlayerCard player={player} />
      <div className="browse-player-meta">
        <span className={`status-pill status-${player.status}`}>{player.status}</span>
        {player.isCaptain && (
          <span className="captain-player-mark" title="Selected captain">
            (C)
          </span>
        )}
      </div>

      {canShortlist && (
        <div className="browse-actions">
          <button
            type="button"
            className={shortlisted ? 'btn-success' : undefined}
            disabled={busy}
            onClick={onToggleShortlist}
          >
            {shortlisted ? '★ Shortlisted' : '☆ Shortlist'}
          </button>
          <div className="browse-marks">
            {PLAYER_MARKS.map((mark) => {
              const active = tags.includes(mark);
              return (
                <button
                  key={mark}
                  type="button"
                  className={`mark-chip ${active ? 'mark-chip-active' : ''}`}
                  disabled={busy}
                  onClick={() => onToggleMark?.(mark)}
                >
                  {PLAYER_MARK_LABELS[mark]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
