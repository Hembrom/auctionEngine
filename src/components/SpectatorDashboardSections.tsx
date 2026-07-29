import { Link } from 'react-router-dom';
import type { AuctionState, Bid, Captain, Player } from '../types';
import { getOverallRating } from '../lib/playerUtils';
import { CollapsibleSection } from './CollapsibleSection';
import { LiveAuctionPanel } from './LiveAuctionPanel';
import { CaptainDashboard } from './CaptainDashboard';
import { SpectatorBanner } from './SpectatorBanner';
import { BrowsePlayerCard } from './BrowsePlayerCard';

interface SpectatorDashboardSectionsProps {
  roomId: string;
  state: AuctionState;
  players: Player[];
  bids: Bid[];
  captains: Captain[];
}

function RatedPlayersGrid({ players }: { players: Player[] }) {
  const sorted = [...players].sort((a, b) => getOverallRating(b) - getOverallRating(a));

  return (
    <div className="players-browse-grid">
      {sorted.map((player) => (
        <BrowsePlayerCard key={player.id} player={player} />
      ))}
    </div>
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
          Browse Players (available / sold)
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
            Auction has not started yet. Browse player ratings below, or open Browse Players to
            filter by available / sold.
          </p>
        </CollapsibleSection>
      )}

      {players.length > 0 && (isPreAuction || isLivePhase) && (
        <CollapsibleSection
          title={`All Players with Ratings (${players.length})`}
          defaultOpen={isPreAuction}
        >
          <RatedPlayersGrid players={players} />
        </CollapsibleSection>
      )}

      {approved.length > 0 && (
        <CollapsibleSection title="Captain Squads" defaultOpen>
          <CaptainDashboard captains={captains} title="All Captain Squads" />
        </CollapsibleSection>
      )}
    </div>
  );
}
