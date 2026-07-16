import type { Captain, Player } from '../types';
import type { AuctionPhase } from '../types';

interface AdminLobbySectionProps {
  phase: AuctionPhase;
  players: Player[];
  approved: Captain[];
  onOpenLobby: () => void;
  onStartAuction: () => void;
  openLobbyBusy?: boolean;
}

export function AdminLobbySection({
  phase,
  players,
  approved,
  onOpenLobby,
  onStartAuction,
  openLobbyBusy = false,
}: AdminLobbySectionProps) {
  const hasPlayers = players.length > 0;
  const enoughCaptains = approved.length > 1;
  const canOpenLobby = phase === 'waiting' && hasPlayers && enoughCaptains;
  const isLobby = phase === 'lobby';
  const isPreAuction = phase === 'waiting' || phase === 'lobby' || phase === 'setup';

  if (!isPreAuction) {
    return null;
  }

  return (
    <section className="admin-lobby-section card admin-wide">
      <h3>Open Lobby</h3>

      {phase === 'waiting' && (
        <>
          <p className="muted admin-lobby-intro">
            Open the lobby when players are uploaded and at least two captains have joined and been
            approved.
          </p>
          <ul className="lobby-prereq-list">
            <li className={hasPlayers ? 'lobby-prereq-ok' : 'lobby-prereq-missing'}>
              {hasPlayers ? '✓' : '○'} Upload players ({players.length} in pool)
            </li>
            <li className={enoughCaptains ? 'lobby-prereq-ok' : 'lobby-prereq-missing'}>
              {enoughCaptains ? '✓' : '○'} At least 2 approved captains ({approved.length} ready)
            </li>
            {!enoughCaptains && (
              <li className="lobby-prereq-hint muted">
                Share the captain link and approve join requests in Room Setup.
              </li>
            )}
          </ul>
          <button
            type="button"
            className="btn-primary btn-lg admin-open-lobby-btn"
            disabled={!canOpenLobby || openLobbyBusy}
            onClick={onOpenLobby}
          >
            {openLobbyBusy ? 'Opening…' : 'Open Lobby'}
          </button>
        </>
      )}

      {isLobby && (
        <>
          <p className="admin-lobby-status">
            Lobby is open — <strong>{approved.length}</strong> captain(s) ready
          </p>
          <ul className="captain-list admin-lobby-captains">
            {approved.map((c) => (
              <li key={c.id}>
                <strong>{c.teamName}</strong>
                <span className="muted"> ({c.name})</span>
                <span className="admin-lobby-budget"> — ₹{c.budget}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-primary btn-lg"
            disabled={players.length === 0 || approved.length === 0}
            onClick={onStartAuction}
          >
            Start Auction
          </button>
          {players.length === 0 && <p className="error">Add players before starting</p>}
        </>
      )}

      {phase === 'setup' && (
        <p className="muted">Finish room setup below, then open the lobby when captains have joined.</p>
      )}
    </section>
  );
}
