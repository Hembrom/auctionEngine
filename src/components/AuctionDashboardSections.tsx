import type { ReactNode } from 'react';
import type { AuctionState, Bid, Captain, Player } from '../types';
import { CollapsibleSection } from './CollapsibleSection';
import { LiveAuctionPanel } from './LiveAuctionPanel';
import { PlayerStatusBoard } from './PlayerStatusBoard';
import { CaptainDashboard } from './CaptainDashboard';
import { SpectatorBanner } from './SpectatorBanner';

interface AuctionDashboardSectionsProps {
  roomId: string;
  state: AuctionState;
  players: Player[];
  bids: Bid[];
  captains: Captain[];
  captainId?: string | null;
  showBidPanel?: boolean;
  showSpectatorBanner?: boolean;
  adminLiveControls?: ReactNode;
  playerManagement?: ReactNode;
}

export function AuctionDashboardSections({
  roomId,
  state,
  players,
  bids,
  captains,
  captainId,
  showBidPanel = false,
  showSpectatorBanner = false,
  adminLiveControls,
  playerManagement,
}: AuctionDashboardSectionsProps) {
  const approved = captains.filter((c) => c.status === 'approved');
  const isLivePhase = ['live', 'result', 'unsold'].includes(state.phase);

  return (
    <div className="watch-sections">
      <CollapsibleSection title="Live Actions" badge={state.phase.toUpperCase()} defaultOpen>
        {showSpectatorBanner && <SpectatorBanner />}
        <LiveAuctionPanel
          roomId={roomId}
          state={state}
          players={players}
          bids={bids}
          captains={captains}
          captainId={captainId}
          showBidPanel={showBidPanel}
          adminControls={adminLiveControls}
        />
      </CollapsibleSection>

      {players.length > 0 && (
        <CollapsibleSection title="Player Pipeline" defaultOpen={isLivePhase}>
          <PlayerStatusBoard state={state} players={players} captains={captains} />
        </CollapsibleSection>
      )}

      {approved.length > 0 && (
        <CollapsibleSection title="Captain Squads" defaultOpen={isLivePhase}>
          <CaptainDashboard captains={captains} title="All Captain Squads" />
        </CollapsibleSection>
      )}

      {playerManagement && isLivePhase && (
        <CollapsibleSection title="Player Management" defaultOpen={false}>
          {playerManagement}
        </CollapsibleSection>
      )}
    </div>
  );
}
