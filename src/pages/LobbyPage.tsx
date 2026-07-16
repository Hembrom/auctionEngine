import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import { getCaptainId, isSpectator } from '../hooks/useSession';
import { CaptainIdentityBar } from '../components/CaptainIdentityBar';
import { MySquadPanel } from '../components/MySquadPanel';
import { SpectatorBanner } from '../components/SpectatorBanner';
import { setTeamName } from '../lib/auctionService';

export function LobbyPage() {
  const roomId = useRoomId();
  const { state, captains, loading } = useAuctionData(roomId);
  const navigate = useNavigate();
  const captainId = getCaptainId(roomId);
  const spectating = isSpectator(roomId);
  const me = captains.find((c) => c.id === captainId);
  const [teamName, setTeamNameLocal] = useState(me?.teamName ?? '');
  const [saved, setSaved] = useState(false);
  const [teamError, setTeamError] = useState('');

  const approved = captains.filter((c) => c.status === 'approved');

  useEffect(() => {
    if (loading) return;
    if (!captainId && !spectating) {
      navigate(`/room/${roomId}`);
      return;
    }
    if (me?.status === 'pending') navigate(`/room/${roomId}/waiting`);
    if (['live', 'result', 'unsold'].includes(state.phase)) {
      navigate(spectating ? `/room/${roomId}/spectate` : `/room/${roomId}/auction`);
      return;
    }
    if (state.phase === 'ended') navigate(`/room/${roomId}/final`);
  }, [loading, state.phase, me, captainId, spectating, navigate, roomId]);

  useEffect(() => {
    if (me) setTeamNameLocal(me.teamName);
  }, [me?.teamName]);

  const handleSaveTeam = async () => {
    if (!captainId || !me) return;
    setTeamError('');
    try {
      await setTeamName(roomId, captainId, teamName, me.name);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setTeamError((e as Error).message);
    }
  };

  return (
    <Layout
      title="Lobby"
      subtitle={state.displayName || 'Auction starting soon'}
      badge={spectating ? 'SPECTATOR' : `${approved.length} captains`}
      captainName={me ? `${me.name} (${me.teamName})` : undefined}
      theme={spectating ? 'spectator' : 'captain'}
    >
      {spectating && <SpectatorBanner />}
      {me && <CaptainIdentityBar captain={me} />}
      {me && <MySquadPanel captain={me} />}

      <div className={spectating ? 'grid-1' : 'grid-2'}>
        {!spectating && (
        <div className="card">
          <h3>Your Team</h3>
          {me && (
            <>
              <p>Captain: <strong>{me.name}</strong></p>
              <div className="form-row">
                <label>Team Name (optional)</label>
                <input
                  value={teamName}
                  onChange={(e) => setTeamNameLocal(e.target.value)}
                  placeholder={me.name}
                />
                <button onClick={handleSaveTeam}>Save</button>
                {saved && <span className="success">Saved!</span>}
                {teamError && <p className="error">{teamError}</p>}
              </div>
              <p className="muted">Budget: ₹{state.startingBudget}</p>
            </>
          )}
        </div>
        )}

        <div className="card">
          <h3>Approved Captains</h3>
          <ul className="captain-list">
            {approved.map((c) => (
              <li key={c.id}>
                <strong>{c.teamName}</strong>
                <span className="muted"> ({c.name})</span>
              </li>
            ))}
          </ul>
          <p className="muted">Waiting for admin to start the auction...</p>
        </div>
      </div>
    </Layout>
  );
}
