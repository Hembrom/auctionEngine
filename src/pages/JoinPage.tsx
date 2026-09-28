import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { AuthUserBar } from '../components/AuthUserBar';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import { useCaptainSession } from '../hooks/useCaptainSession';
import { useRequireCaptainLogin } from '../hooks/useRequireCaptainLogin';
import { useAuth } from '../context/AuthContext';
import { requestJoin } from '../lib/auctionService';
import { setCaptainId } from '../hooks/useSession';
import { pathForCaptainInRoom } from '../lib/captainRouting';

export function JoinPage() {
  const roomId = useRoomId();
  const navigate = useNavigate();
  const { state, captains, firebaseError } = useAuctionData(roomId);
  const { user, loading: authGateLoading } = useRequireCaptainLogin(roomId);
  const { user: authedUser } = useAuth();
  const { authLoading, captainId } = useCaptainSession(roomId);
  const me = captains.find((c) => c.id === captainId);
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !captainId || !me) return;
    if (me.status === 'rejected') return;
    navigate(pathForCaptainInRoom(roomId, state.phase, me), { replace: true });
  }, [authLoading, captainId, me, state.phase, navigate, roomId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authedUser || !name.trim() || !teamName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const id = await requestJoin(roomId, name.trim(), teamName.trim(), authedUser.uid);
      setCaptainId(roomId, id);
      navigate(`/room/${roomId}/waiting`);
    } catch (e) {
      setError((e as Error).message || 'Failed to join.');
    } finally {
      setLoading(false);
    }
  };

  if (authGateLoading || !user) {
    return null;
  }

  return (
    <Layout
      title={state.displayName || roomId}
      subtitle="Request to join as captain"
      badge={roomId}
      theme="captain"
    >
      <FirebaseBanner />
      <FirebaseErrorBanner error={firebaseError} />
      <AuthUserBar />

      {authLoading ? (
        <div className="card center-card">
          <p className="muted">Loading your captain session…</p>
        </div>
      ) : (
        <div className="card center-card">
          <form onSubmit={handleJoin} className="join-form">
            <label htmlFor="name">Captain Name</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <label htmlFor="team">Team Name</label>
            <input
              id="team"
              type="text"
              placeholder="Your team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <button type="submit" disabled={loading || !name.trim() || !teamName.trim()}>
              {loading ? 'Requesting...' : 'Request to Join'}
            </button>
            {error && <p className="error">{error}</p>}
            <p className="muted join-alt-link">
              Just watching? <Link to={`/room/${roomId}/spectate`}>Enter as spectator</Link>
            </p>
          </form>
        </div>
      )}
    </Layout>
  );
}
