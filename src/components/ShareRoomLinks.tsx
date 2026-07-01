import { useState } from 'react';
import { roomJoinUrl } from '../lib/roomUtils';

export function ShareRoomLinks({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState<'captain' | null>(null);
  const captainUrl = roomJoinUrl(roomId);

  const copy = async () => {
    await navigator.clipboard.writeText(captainUrl);
    setCopied('captain');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="card admin-wide share-links">
      <h3>Share with Captains</h3>
      <p className="muted">Send this link — captains join only this room.</p>
      <div className="share-row">
        <code className="share-url">{captainUrl}</code>
        <button type="button" onClick={copy}>
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
      <p className="muted">Room ID: <strong>{roomId}</strong></p>
    </section>
  );
}
