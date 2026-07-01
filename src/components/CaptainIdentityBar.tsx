import type { Captain } from '../types';

interface CaptainIdentityBarProps {
  captain: Captain;
}

export function CaptainIdentityBar({ captain }: CaptainIdentityBarProps) {
  return (
    <div className="captain-identity-bar">
      <span className="captain-identity-label">Playing as</span>
      <strong className="captain-identity-name">{captain.name}</strong>
      <span className="captain-identity-sep">·</span>
      <span className="captain-identity-label">Team</span>
      <strong className="captain-identity-team">{captain.teamName}</strong>
    </div>
  );
}
