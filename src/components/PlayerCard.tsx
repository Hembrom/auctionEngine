import type { Player } from '../types';
import { PlayerPhoto } from './PlayerPhoto';
import { getPlayFrequencyOption } from '../lib/playFrequency';
import {
  PLAYER_SKILLS,
  PLAYER_SKILL_LABELS,
  getOverallRating,
  getPlayerSkillValue,
  ratingToScore100,
} from '../lib/playerUtils';

interface PlayerCardProps {
  player: Player;
  large?: boolean;
}

function SkillBar({ label, value }: { label: string; value: number }) {
  const score100 = ratingToScore100(value);
  return (
    <div className="rating-row skill-row">
      <span className="rating-label">{label}</span>
      <div className="rating-bar">
        <div className="rating-fill" style={{ width: `${score100}%` }} />
      </div>
      <span className="rating-value">{score100}/100</span>
    </div>
  );
}

export function PlayerCard({ player, large }: PlayerCardProps) {
  const overall = getOverallRating(player);
  const { label: frequencyLabel } = getPlayFrequencyOption(player.playFrequency);

  return (
    <div className={`player-card ${large ? 'player-card-lg' : ''}`}>
      <div className="player-card-split">
        <aside className="player-card-left">
          <PlayerPhoto player={player} size={large ? 'lg' : 'md'} showPlaceholder />
          <div className="player-overall-badge" aria-label={`Overall rating ${overall} out of 100`}>
            <span className="player-overall-value">{overall}</span>
            <span className="player-overall-label">Overall /100</span>
          </div>
          <h2 className="player-card-name">{player.name}</h2>
          <div className="position-tags player-card-positions">
            {player.positions.map((p) => (
              <span key={p} className={`pos-tag pos-${p.toLowerCase()}`}>
                {p}
              </span>
            ))}
          </div>
          <div className="player-frequency-badge" aria-label={`Play frequency ${frequencyLabel}`}>
            <span className="player-frequency-label">Play Frequency</span>
            <span className="player-frequency-value">{frequencyLabel}</span>
          </div>
        </aside>

        <div className="player-card-right">
          <h3 className="player-skills-title">General Skills</h3>
          <div className="skills-matrix">
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
    </div>
  );
}
