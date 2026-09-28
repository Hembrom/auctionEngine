import type { PlayFrequency } from '../types';
import { getPlayFrequencyOption, getPlayFrequencyScore100 } from '../lib/playFrequency';

export function PlayFrequencyBar({ frequency }: { frequency: PlayFrequency | undefined }) {
  const { label } = getPlayFrequencyOption(frequency);
  const score100 = getPlayFrequencyScore100(frequency);

  return (
    <div className="rating-row skill-row play-frequency-row">
      <span className="rating-label">Play frequency</span>
      <div className="play-frequency-bar-cell">
        <span className="play-frequency-choice" title={label}>
          {label}
        </span>
        <div className="rating-bar">
          <div className="rating-fill" style={{ width: `${score100}%` }} />
        </div>
      </div>
      <span className="rating-value">{score100}/100</span>
    </div>
  );
}
