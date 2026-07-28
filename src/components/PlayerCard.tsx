import type { Player } from '../types';
import {
  PLAYER_SKILLS,
  PLAYER_SKILL_LABELS,
  RATING_MAX,
  getPlayerSkillValue,
} from '../lib/playerUtils';

interface PlayerCardProps {
  player: Player;
  large?: boolean;
}

function SkillBar({ label, value, max = RATING_MAX }: { label: string; value: number; max?: number }) {
  return (
    <div className="rating-row skill-row">
      <span className="rating-label">{label}</span>
      <div className="rating-bar">
        <div className="rating-fill" style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="rating-value">{value}/{max}</span>
    </div>
  );
}

export function PlayerCard({ player, large }: PlayerCardProps) {
  return (
    <div className={`player-card ${large ? 'player-card-lg' : ''}`}>
      <div className="player-header">
        <h2>{player.name}</h2>
        <div className="position-tags">
          {player.positions.map((p) => (
            <span key={p} className={`pos-tag pos-${p.toLowerCase()}`}>
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="player-skills-section">
        <h3 className="player-skills-title">General Skills</h3>
        <div className={`skills-grid ${large ? 'skills-grid-lg' : ''}`}>
          {PLAYER_SKILLS.map((skill) => (
            <SkillBar
              key={skill}
              label={PLAYER_SKILL_LABELS[skill]}
              value={getPlayerSkillValue(player, skill)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
