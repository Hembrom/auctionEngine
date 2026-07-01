import { useEffect, useState } from 'react';

interface CircularTimerProps {
  seconds: number;
  totalSeconds: number;
  paused: boolean;
  active: boolean;
}

export function CircularTimer({ seconds, totalSeconds, paused, active }: CircularTimerProps) {
  const [tickFlash, setTickFlash] = useState(false);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = active && !paused && totalSeconds > 0 ? seconds / totalSeconds : 0;
  const offset = circumference * (1 - progress);

  useEffect(() => {
    if (!active || paused) return;
    setTickFlash(true);
    const t = setTimeout(() => setTickFlash(false), 350);
    return () => clearTimeout(t);
  }, [seconds, active, paused]);

  return (
    <div
      className={`circular-timer ${tickFlash ? 'circular-timer-tick' : ''} ${paused ? 'circular-timer-paused' : ''}`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="circular-timer-track" cx="60" cy="60" r={radius} />
        <circle
          className={`circular-timer-ring ${seconds <= 5 && active && !paused ? 'circular-timer-urgent' : ''}`}
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={`circular-timer-value ${active ? 'has-unit' : ''}`}>
        {active ? `${seconds}` : '—'}
      </span>
      {paused && active && <span className="circular-timer-paused-label">paused</span>}
    </div>
  );
}
