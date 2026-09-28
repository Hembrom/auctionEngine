import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import { isSpectator } from '../hooks/useSession';
import { CaptainIdentityBar } from '../components/CaptainIdentityBar';
import { MySquadPanel } from '../components/MySquadPanel';
import { SpectatorBanner } from '../components/SpectatorBanner';
import { CaptainDashboard } from '../components/CaptainDashboard';
import { AuthUserBar } from '../components/AuthUserBar';
import { useCaptainSession } from '../hooks/useCaptainSession';
import { useRequireCaptainLogin } from '../hooks/useRequireCaptainLogin';
import { useAuth } from '../context/AuthContext';
import { captainMatchesUser } from '../lib/captainAccess';
import { setTeamName } from '../lib/auctionService';

function LobbyPageCaptain() {
  const roomId = useRoomId();
  const { state, captains, loading } = useAuctionData(roomId);
  const navigate = useNavigate();
  const { user, loading: authGateLoading } = useRequireCaptainLogin(roomId);
  const { user: authedUser } = useAuth();
  const { authLoading, captainId } = useCaptainSession(roomId);
  const me = captains.find((c) => c.id === captainId);
  const [teamName, setTeamNameLocal] = useState(me?.teamName ?? '');
  const [saved, setSaved] = useState(false);
  const [teamError, setTeamError] = useState('');

  const approved = captains.filter((c) => c.status === 'approved');

  useEffect(() => {
    if (loading || authLoading || authGateLoading) return;
    if (!captainId) {
      navigate(`/room/${roomId}`);
      return;
    }
    if (me && !captainMatchesUser(me, authedUser?.uid)) return;
    if (me?.status === 'pending') navigate(`/room/${roomId}/waiting`);
    if (['live', 'result', 'unsold'].includes(state.phase)) {
      navigate(`/room/${roomId}/auction`);
      return;
    }
    if (state.phase === 'ended') navigate(`/room/${roomId}/final`);
  }, [loading, authLoading, authGateLoading, state.phase, me, captainId, authedUser?.uid, navigate, roomId]);

  useEffect(() => {
    if (me) setTeamNameLocal(me.teamName);
  }, [me?.teamName]);

  if (authGateLoading || !user) {
    return null;
  }

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
    <>
      {me && <CaptainIdentityBar captain={me} />}
      {me && <MySquadPanel captain={me} />}

      <p className="players-nav">
        <Link to={`/room/${roomId}/players`} className="btn-link">
          Browse Players
        </Link>
      </p>

      <div className="grid-2">
        <div className="card">
          <h3>Your Team</h3>
          {me && (
            <>
              <p>
                Captain: <strong>{me.name}</strong>
              </p>
              <div className="form-row">
                <label>Team Name (optional)</label>
                <input
                  value={teamName}
                  onChange={(e) => setTeamNameLocal(e.target.value)}
                  placeholder={me.name}
                />
                <button type="button" onClick={handleSaveTeam}>
                  Save
                </button>
                {saved && <span className="success">Saved!</span>}
                {teamError && <p className="error">{teamError}</p>}
              </div>
              <p className="muted">Budget: ₹{state.startingBudget}</p>
            </>
          )}
        </div>

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
    </>
  );
}

function LobbyPageSpectator() {
  const roomId = useRoomId();
  const { state, captains, loading } = useAuctionData(roomId);
  const navigate = useNavigate();
  const approved = captains.filter((c) => c.status === 'approved');

  useEffect(() => {
    if (loading) return;
    if (['live', 'result', 'unsold'].includes(state.phase)) {
      navigate(`/room/${roomId}/spectate`, { replace: true });
      return;
    }
    if (state.phase === 'ended') navigate(`/room/${roomId}/final`);
  }, [loading, state.phase, navigate, roomId]);

  return (
    <>
      <SpectatorBanner />
      <p className="players-nav">
        <Link to={`/room/${roomId}/players`} className="btn-link">
          Browse Players
        </Link>
      </p>
      {approved.length > 0 && (
        <div className="watch-sections" style={{ marginBottom: '1rem' }}>
          <CaptainDashboard captains={captains} title="All Captain Squads" />
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
    </>
  );
}

export function LobbyPage() {
  const roomId = useRoomId();
  const { captains } = useAuctionData(roomId);
  const spectating = isSpectator(roomId);
  const approved = captains.filter((c) => c.status === 'approved');

  return (
    <Layout
      title="Lobby"
      subtitle="Auction starting soon"
      badge={spectating ? 'SPECTATOR' : `${approved.length} captains`}
      theme={spectating ? 'spectator' : 'captain'}
    >
      <AuthUserBar />
      {spectating ? (
        <LobbyPageSpectator />
      ) : (
        <LobbyPageCaptain />
      )}
    </Layout>
  );
}
