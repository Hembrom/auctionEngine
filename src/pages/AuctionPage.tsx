import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CaptainIdentityBar } from '../components/CaptainIdentityBar';
import { MySquadPanel } from '../components/MySquadPanel';
import { LiveAuctionPanel } from '../components/LiveAuctionPanel';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { PlayersLeftPanel } from '../components/PlayersLeftPanel';
import { useAuctionData } from '../hooks/useAuctionData';
import { useAuctionEngine } from '../hooks/useAuctionEngine';
import { useRoomId } from '../hooks/useRoom';
import { getCaptainId, isSpectator } from '../hooks/useSession';
import { pathForAuctionPhase } from '../lib/roomUtils';

export function AuctionPage() {
  const roomId = useRoomId();
  const { state, captains, players, bids, loading } = useAuctionData(roomId);
  const navigate = useNavigate();
  const captainId = getCaptainId(roomId);
  const spectating = isSpectator(roomId);
  const me = captains.find((c) => c.id === captainId);
  const isLivePhase = ['live', 'result', 'unsold'].includes(state.phase);

  useAuctionEngine(roomId, state, players, captains);

  useEffect(() => {
    if (loading) return;

    if (spectating) {
      navigate(`/room/${roomId}/spectate`, { replace: true });
      return;
    }

    if (state.phase === 'lobby' || state.phase === 'waiting') {
      if (captainId) {
        navigate(pathForAuctionPhase(roomId, state.phase));
      } else {
        navigate(`/room/${roomId}`);
      }
      return;
    }
    if (state.phase === 'ended') navigate(`/room/${roomId}/final`);
  }, [loading, state.phase, navigate, captainId, spectating, roomId]);

  return (
    <Layout
      title="Live Auction"
      subtitle={
        state.phase === 'unsold'
          ? 'Unsold players remaining'
          : state.isUnsoldRound
            ? 'Unsold Round'
            : state.displayName
      }
      badge={roomId}
      captainName={me ? `${me.name} (${me.teamName})` : undefined}
    >
      {me && <CaptainIdentityBar captain={me} />}

      <LiveAuctionPanel
        roomId={roomId}
        state={state}
        players={players}
        bids={bids}
        captains={captains}
        captainId={captainId}
        showBidPanel
      />

      {players.length > 0 && isLivePhase && (
        <div className="watch-sections">
          <CollapsibleSection title="Players Left" defaultOpen>
            <PlayersLeftPanel players={players} />
          </CollapsibleSection>
        </div>
      )}

      {me && <MySquadPanel captain={me} />}
    </Layout>
  );
}
