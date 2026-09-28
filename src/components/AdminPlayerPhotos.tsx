import { useRef, useState } from 'react';
import type { Player } from '../types';
import { clearPlayerPhoto, setPlayerPhoto } from '../lib/auctionService';
import { validatePlayerImageFile } from '../lib/playerImageStorage';
import { PlayerPhoto } from './PlayerPhoto';

interface AdminPlayerPhotosProps {
  roomId: string;
  players: Player[];
}

export function AdminPlayerPhotos({ roomId, players }: AdminPlayerPhotosProps) {
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="card admin-wide admin-player-photos">
      <h3>Player photos ({sorted.filter((p) => p.imageUrl).length}/{sorted.length} set)</h3>
      <p className="muted">
        Upload a headshot for each player (JPEG, PNG, or WebP, max 5 MB). Photos appear on the live
        auction card and player browser.
      </p>
      <ul className="admin-photo-list">
        {sorted.map((player) => (
          <AdminPlayerPhotoRow key={player.id} roomId={roomId} player={player} />
        ))}
      </ul>
    </section>
  );
}

function AdminPlayerPhotoRow({ roomId, player }: { roomId: string; player: Player }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const runUpload = async (file: File) => {
    const validationError = validatePlayerImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setPlayerPhoto(roomId, player.id, file);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!player.imageUrl || busy) return;
    if (!window.confirm(`Remove photo for ${player.name}?`)) return;
    setBusy(true);
    setError('');
    try {
      await clearPlayerPhoto(roomId, player.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="admin-photo-row">
      <div className="admin-photo-preview">
        {player.imageUrl ? (
          <PlayerPhoto player={player} size="sm" />
        ) : (
          <div className="admin-photo-placeholder" aria-hidden>
            ?
          </div>
        )}
      </div>
      <div className="admin-photo-meta">
        <strong>{player.name}</strong>
        <span className="muted">{player.positions.join('/')}</span>
        {error && <p className="error admin-photo-error">{error}</p>}
      </div>
      <div className="admin-photo-actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="admin-photo-file-input"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void runUpload(file);
          }}
        />
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Uploading…' : player.imageUrl ? 'Replace' : 'Upload'}
        </button>
        {player.imageUrl && (
          <button type="button" className="btn-small" disabled={busy} onClick={() => void handleRemove()}>
            Remove
          </button>
        )}
      </div>
    </li>
  );
}
