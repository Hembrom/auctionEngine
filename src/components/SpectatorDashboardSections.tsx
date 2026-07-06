import type { AuctionState, Bid, Captain, Player } from '../types';
import { CollapsibleSection } from './CollapsibleSection';
import { LiveAuctionPanel } from './LiveAuctionPanel';
import { CaptainDashboard } from './CaptainDashboard';
import { SpectatorBanner } from './SpectatorBanner';

interface SpectatorDashboardSectionsProps {
  roomId: string;
  state: AuctionState;
  players: Player[];
  bids: Bid[];
  captains: Captain[];
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

  return (
    <div className="watch-sections">
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

      {approved.length > 0 && (
        <CollapsibleSection title="Captain Squads" defaultOpen={isLivePhase}>
          <CaptainDashboard captains={captains} title="All Captain Squads" />
        </CollapsibleSection>
      )}
    </div>
  );
}
