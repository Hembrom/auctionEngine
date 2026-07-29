import { Link } from 'react-router-dom';
import type { AuctionState, Bid, Captain, Player } from '../types';
import { CollapsibleSection } from './CollapsibleSection';
import { LiveAuctionPanel } from './LiveAuctionPanel';
import { PlayerStatusBoard } from './PlayerStatusBoard';
import { PlayersLeftPanel } from './PlayersLeftPanel';
import { CaptainDashboard } from './CaptainDashboard';
import { SpectatorBanner } from './SpectatorBanner';

interface SpectatorDashboardSectionsProps {
  roomId: string;
  state: AuctionState;
  players: Player[];
  bids: Bid[];
  captains: Captain[];
}

function PreAuctionPlayersList({ players }: { players: Player[] }) {
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="card admin-wide players-left-panel">
      <div className="player-board-header">
        <h3>All Players</h3>
        <div className="player-board-summary">
          <span className="player-board-pill muted">{players.length} total</span>
        </div>
      </div>
      <p className="muted player-board-hint">Full room roster before the auction starts.</p>
      {sorted.length === 0 ? (
        <p className="muted player-board-empty">No players added yet</p>
      ) : (
        <ul className="players-left-list">
          {sorted.map((p) => (
            <li key={p.id}>
              <span className="players-left-name">{p.name}</span>
              <span className="player-board-positions">
                {p.positions.map((pos) => (
                  <span key={pos} className={`pos-tag pos-${pos.toLowerCase()}`}>
                    {pos}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SpectatorDashboardSections({
  roomId,
  state,
  players,
  bids,
  captains,
}: SpectatorDashboardSectionsProps) {
  const approved = captains.filter((c) => c.status === 'approved');
  const isLivePhase = ['live', 'result', 'unsold'].includes(state.phase);
  const isPreAuction = ['waiting', 'lobby', 'setup'].includes(state.phase);

  return (
    <div className="watch-sections">
      <p className="players-nav">
        <Link to={`/room/${roomId}/players`} className="btn-link">
          Browse All Players
        </Link>
      </p>

      {isLivePhase && (
        <CollapsibleSection title="Live Actions" badge={state.phase.toUpperCase()} defaultOpen>
          <SpectatorBanner />
          <LiveAuctionPanel
            roomId={roomId}
            state={state}
            players={players}
            bids={bids}
            captains={captains}
          />
        </CollapsibleSection>
      )}

      {!isLivePhase && (
        <CollapsibleSection title="Watch Mode" badge={state.phase.toUpperCase()} defaultOpen>
          <SpectatorBanner />
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            Auction has not started yet. You can browse the full player list and follow captain
            squads below.
          </p>
        </CollapsibleSection>
      )}

      {isPreAuction && players.length > 0 && (
        <CollapsibleSection title="All Players" defaultOpen>
          <PreAuctionPlayersList players={players} />
        </CollapsibleSection>
      )}

      {isLivePhase && players.length > 0 && (
        <>
          <CollapsibleSection title="Player Pipeline" defaultOpen>
            <PlayerStatusBoard state={state} players={players} captains={captains} />
          </CollapsibleSection>

          <CollapsibleSection title="Players Left" defaultOpen>
            <PlayersLeftPanel players={players} />
          </CollapsibleSection>
        </>
      )}

      {approved.length > 0 && (
        <CollapsibleSection title="Captain Squads" defaultOpen>
          <CaptainDashboard captains={captains} title="All Captain Squads" />
        </CollapsibleSection>
      )}
    </div>
  );
}
