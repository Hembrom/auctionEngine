import type { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  large?: boolean;
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rating-row">
      <span className="rating-label">{label}</span>
      <div className="rating-bar">
        <div className="rating-fill" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="rating-value">{value}/5</span>
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
      <div className="ratings">
        <RatingBar label="Last Match" value={player.lastMatchRating} />
        <RatingBar label="Fitness" value={player.fitness} />
        <RatingBar label="Leadership" value={player.leadership} />
        <RatingBar label="Team Influence" value={player.teamInfluence} />
      </div>
    </div>
  );
}
