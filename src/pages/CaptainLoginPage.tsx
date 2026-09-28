import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner } from '../components/FirebaseBanner';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { useRoomId } from '../hooks/useRoom';
import { useAuctionData } from '../hooks/useAuctionData';

export function CaptainLoginPage() {
  const roomId = useRoomId();
  const { state } = useAuctionData(roomId);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const returnTo = `/room/${roomId}`;

  useEffect(() => {
    if (!loading && user) {
      navigate(returnTo, { replace: true });
    }
  }, [loading, user, returnTo, navigate]);

  return (
    <Layout
      title={state.displayName || 'Captain Sign In'}
      subtitle="Use the room link from your admin"
      badge={roomId}
      theme="captain"
    >
      <FirebaseBanner />
      <div className="auth-page-single">
        <LoginForm
          role="captain"
          title="Captain account"
          subtitle="Sign in to join this room and bid for your team."
          onSuccess={() => navigate(returnTo, { replace: true })}
        />
        <p className="muted auth-page-back">
          <Link to={`/room/${roomId}/spectate`}>Watch as spectator instead</Link>
        </p>
      </div>
    </Layout>
  );
}
