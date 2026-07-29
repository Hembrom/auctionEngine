import type { Player, PlayerMark } from '../types';
import {
  getOverallRating,
  PLAYER_MARKS,
  PLAYER_MARK_LABELS,
  PLAYER_SKILL_LABELS,
  PLAYER_SKILLS,
  getPlayerSkillValue,
} from '../lib/playerUtils';

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
  const overall = getOverallRating(player);

  return (
    <article className={`card browse-player-card ${shortlisted ? 'browse-player-shortlisted' : ''}`}>
      <div className="browse-player-top">
        <div>
          <h3>{player.name}</h3>
          <div className="position-tags">
            {player.positions.map((p) => (
              <span key={p} className={`pos-tag pos-${p.toLowerCase()}`}>
                {p}
              </span>
            ))}
            <span className={`status-pill status-${player.status}`}>{player.status}</span>
          </div>
        </div>
        <div className="browse-overall">
          <span className="browse-overall-value">{overall}</span>
          <span className="muted">Overall</span>
        </div>
      </div>

      <div className="browse-skills">
        {PLAYER_SKILLS.map((skill) => (
          <div key={skill} className="browse-skill">
            <span>{PLAYER_SKILL_LABELS[skill]}</span>
            <strong>{getPlayerSkillValue(player, skill)}</strong>
          </div>
        ))}
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
