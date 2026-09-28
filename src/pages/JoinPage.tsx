import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { RequireAuth } from '../components/RequireAuth';
import { AuthUserBar } from '../components/AuthUserBar';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import { useCaptainSession } from '../hooks/useCaptainSession';
import { useAuth } from '../context/AuthContext';
import { requestJoin } from '../lib/auctionService';
import { setCaptainId } from '../hooks/useSession';
import { pathForCaptainInRoom } from '../lib/captainRouting';

function JoinPageContent() {
  const roomId = useRoomId();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, captains } = useAuctionData(roomId);
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
    if (!user || !name.trim() || !teamName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const id = await requestJoin(roomId, name.trim(), teamName.trim(), user.uid);
      setCaptainId(roomId, id);
      navigate(`/room/${roomId}/waiting`);
    } catch (e) {
      setError((e as Error).message || 'Failed to join.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="card center-card">
        <p className="muted">Loading your captain session…</p>
      </div>
    );
  }

  return (
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
  );
}

export function JoinPage() {
  const roomId = useRoomId();
  const { state, firebaseError } = useAuctionData(roomId);

  return (
    <Layout
      title={state.displayName || roomId}
      subtitle="Sign in, then request to join as captain"
      badge={roomId}
      theme="captain"
    >
      <FirebaseBanner />
      <FirebaseErrorBanner error={firebaseError} />
      <AuthUserBar />
      <RequireAuth
        title="Captain sign in"
        subtitle="Use email and password. Your login stays linked to your team in this room."
      >
        <JoinPageContent />
      </RequireAuth>
    </Layout>
  );
}
