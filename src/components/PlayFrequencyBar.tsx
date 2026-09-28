import type { PlayFrequency } from '../types';
import { RATING_MAX } from '../lib/playerUtils';
import { getPlayFrequencyOption } from '../lib/playFrequency';

export function PlayFrequencyBar({ frequency }: { frequency: PlayFrequency | undefined }) {
  const { label, barValue } = getPlayFrequencyOption(frequency);

  return (
    <div className="rating-row skill-row play-frequency-row">
      <span className="rating-label">Play frequency</span>
      <div className="play-frequency-bar-cell">
        <span className="play-frequency-choice" title={label}>
          {label}
        </span>
        <div className="rating-bar">
          <div className="rating-fill" style={{ width: `${(barValue / RATING_MAX) * 100}%` }} />
        </div>
      </div>
      <span className="rating-value">
        {barValue}/{RATING_MAX}
      </span>
    </div>
  );
}
