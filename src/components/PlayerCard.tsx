import type { Player, PlayerSkill } from '../types';
import { PlayerPhoto } from './PlayerPhoto';
import { getPlayFrequencyOption } from '../lib/playFrequency';
import { getOverallRating, getPlayerSkillValue, ratingToScore100 } from '../lib/playerUtils';

interface PlayerCardProps {
  player: Player;
  large?: boolean;
}

/** FIFA-style stat order/short codes, interleaved into two columns (PAC | DRI, SHO | DEF, ...). */
const STAT_ORDER: { skill: PlayerSkill; code: string }[] = [
  { skill: 'pace', code: 'PAC' },
  { skill: 'dribbling', code: 'DRI' },
  { skill: 'shooting', code: 'SHO' },
  { skill: 'defending', code: 'DEF' },
  { skill: 'passing', code: 'PAS' },
  { skill: 'physical', code: 'PHY' },
  { skill: 'stamina', code: 'STA' },
];

export function PlayerCard({ player, large }: PlayerCardProps) {
  const overall = getOverallRating(player);
  const { label: frequencyLabel } = getPlayFrequencyOption(player.playFrequency);
  const primaryPosition = player.positions[0];

  return (
    <div className="player-card-fifa-wrap">
      <div className={`player-card player-card-fifa ${large ? 'player-card-lg' : ''}`}>
        <div className="fifa-photo-frame">
          <div className="fifa-rating-badge">
            <span className="fifa-overall">{overall}</span>
            {primaryPosition && <span className="fifa-position">{primaryPosition}</span>}
          </div>
          <PlayerPhoto player={player} size={large ? 'lg' : 'md'} showPlaceholder />
        </div>

        <h2 className="player-card-name">{player.name}</h2>

        <div className="fifa-stats-grid">
          {STAT_ORDER.map(({ skill, code }) => (
            <div className="fifa-stat" key={skill}>
              <span className="fifa-stat-value">{ratingToScore100(getPlayerSkillValue(player, skill))}</span>
              <span className="fifa-stat-label">{code}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fifa-frequency-row" aria-label={`Play frequency ${frequencyLabel}`}>
        <span className="fifa-frequency-label">Play Frequency</span>
        <span className="fifa-frequency-value">{frequencyLabel}</span>
      </div>
    </div>
  );
}
