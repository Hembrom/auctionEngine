import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import { getCaptainId } from '../hooks/useSession';

export function WaitingPage() {
  const roomId = useRoomId();
  const { state, captains, loading } = useAuctionData(roomId);
  const navigate = useNavigate();
  const captainId = getCaptainId(roomId);
  const me = captains.find((c) => c.id === captainId);

  useEffect(() => {
    if (loading) return;
    if (!captainId) {
      navigate(`/room/${roomId}`);
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
  }, [loading, me?.status, state.phase, captainId, navigate, roomId]);

  if (!me) {
    return (
      <Layout title="Waiting Room" badge={roomId}>
        <div className="card center-card"><p>Loading...</p></div>
      </Layout>
    );
  }

  if (me.status === 'rejected') {
    return (
      <Layout title="Access Denied" badge={roomId}>
        <div className="card center-card">
          <p className="error">Your request to join was rejected by the admin.</p>
        </div>
      </Layout>
    );
  }

  if (me.status === 'approved') {
    return (
      <Layout title="Approved!" badge={roomId}>
        <div className="card center-card">
          <p>You're in! Taking you to the lobby...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Waiting Room" subtitle="Waiting for admin approval" badge={roomId}>
      <div className="card center-card">
        <div className="pulse-dot" />
        <p>Hi <strong>{me.name}</strong>, please wait while the admin reviews your request.</p>
      </div>
    </Layout>
  );
}
