import { useState } from 'react';
import { roomJoinUrl, roomSpectatorUrl } from '../lib/roomUtils';

function ShareLinkCard({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="card admin-wide share-links">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      <div className="share-row">
        <code className="share-url">{url}</code>
        <button type="button" onClick={copy}>
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </section>
  );
}

export function ShareRoomLinks({ roomId }: { roomId: string }) {
  return (
    <>
      <ShareLinkCard
        title="Share with Captains"
        description="Send this link — captains join and bid in this room."
        url={roomJoinUrl(roomId)}
      />
      <ShareLinkCard
        title="Share with Spectators"
        description="Send this link — watch-only, no bidding."
        url={roomSpectatorUrl(roomId)}
      />
      <p className="muted share-room-id">
        Room ID: <strong>{roomId}</strong>
      </p>
    </>
  );
}
