import type { PlayFrequency } from '../types';
import { RATING_MAX } from '../lib/playerUtils';
import { getPlayFrequencyOption } from '../lib/playFrequency';

export function PlayFrequencyBar({ frequency }: { frequency: PlayFrequency | undefined }) {
  const { label, barValue } = getPlayFrequencyOption(frequency);

  return (
    <div className="play-frequency-block">
      <span className="rating-label play-frequency-field-label">Play frequency</span>
      <span className="play-frequency-choice">{label}</span>
      <div className="rating-bar play-frequency-bar">
        <div className="rating-fill" style={{ width: `${(barValue / RATING_MAX) * 100}%` }} />
      </div>
    </div>
  );
}
