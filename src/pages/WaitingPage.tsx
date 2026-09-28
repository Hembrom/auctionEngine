import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { RequireAuth } from '../components/RequireAuth';
import { AuthUserBar } from '../components/AuthUserBar';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import { useCaptainSession } from '../hooks/useCaptainSession';
import { useAuth } from '../context/AuthContext';
import { captainMatchesUser } from '../lib/captainAccess';

function WaitingPageContent() {
  const roomId = useRoomId();
  const { state, captains, loading } = useAuctionData(roomId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { authLoading, captainId } = useCaptainSession(roomId);
  const me = captains.find((c) => c.id === captainId);

  useEffect(() => {
    if (loading || authLoading) return;
    if (!captainId) {
      navigate(`/room/${roomId}`, { replace: true });
      return;
    }
    if (me?.status === 'rejected') return;

    if (me?.status === 'approved') {
      if (state.phase === 'ended') {
        navigate(`/room/${roomId}/final`);
      } else {
        navigate(`/room/${roomId}/lobby`);
      }
    }
  }, [loading, authLoading, me?.status, state.phase, captainId, navigate, roomId]);

  if (authLoading || !me) {
    return (
      <div className="card center-card">
        <p>Loading...</p>
      </div>
    );
  }

  if (!captainMatchesUser(me, user?.uid)) {
    return (
      <div className="card center-card">
        <p className="error">This captain profile is linked to a different account.</p>
      </div>
    );
  }

  if (me.status === 'rejected') {
    return (
      <div className="card center-card">
        <p className="error">Your request to join was rejected by the admin.</p>
      </div>
    );
  }

  if (me.status === 'approved') {
    return (
      <div className="card center-card">
        <p>You're in! Taking you to the lobby...</p>
      </div>
    );
  }

  return (
    <div className="card center-card">
      <div className="pulse-dot" />
      <p>
        Hi <strong>{me.name}</strong>, please wait while the admin reviews your request.
      </p>
      <p className="muted" style={{ marginTop: '1rem' }}>
        Meanwhile you can <Link to={`/room/${roomId}/players`}>browse players</Link>. Shortlisting
        unlocks after approval.
      </p>
    </div>
  );
}

export function WaitingPage() {
  const roomId = useRoomId();

  return (
    <Layout title="Waiting Room" subtitle="Waiting for admin approval" badge={roomId} theme="captain">
      <AuthUserBar />
      <RequireAuth title="Captain sign in" subtitle="Sign in to access your waiting room.">
        <WaitingPageContent />
      </RequireAuth>
    </Layout>
  );
}
