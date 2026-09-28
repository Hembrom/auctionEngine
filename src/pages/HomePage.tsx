import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner } from '../components/FirebaseBanner';
import { LoginForm } from '../components/LoginForm';
import { roomExists } from '../lib/auctionService';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;
    if (next && next !== '/') {
      navigate(next, { replace: true });
      return;
    }
    navigate('/create', { replace: true });
  }, [authLoading, user, next, navigate]);

  const handleLoginSuccess = () => {
    if (next && next !== '/') {
      navigate(next, { replace: true });
    } else {
      navigate('/create', { replace: true });
    }
  };

  if (authLoading || user) {
    return (
      <Layout title="Football Auction" subtitle="Loading…" theme="admin">
        <FirebaseBanner />
        <div className="card center-card">
          <p className="muted">Loading…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Football Auction" subtitle="Admin sign in" theme="admin">
      <FirebaseBanner />
      <div className="auth-page-single">
        <LoginForm
          role="admin"
          title="Sign in"
          subtitle="Use your email and password, or create an account."
          onSuccess={handleLoginSuccess}
        />
      </div>
    </Layout>
  );
}

export function RoomNotFound() {
  const navigate = useNavigate();
  return (
    <Layout title="Room Not Found">
      <div className="card center-card">
        <p>This room doesn't exist or hasn't been created yet.</p>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    </Layout>
  );
}

export function RoomGuard({
  roomId,
  children,
}: {
  roomId: string;
  children: React.ReactNode | ((props: { roomId: string }) => React.ReactNode);
}) {
  const [status, setStatus] = useState<'loading' | 'found' | 'missing'>('loading');

  useEffect(() => {
    roomExists(roomId).then((exists) => setStatus(exists ? 'found' : 'missing'));
  }, [roomId]);

  if (status === 'loading') {
    return (
      <Layout title="Loading...">
        <div className="card center-card">
          <p>Loading room...</p>
        </div>
      </Layout>
    );
  }
  if (status === 'missing') return <RoomNotFound />;
  return <>{typeof children === 'function' ? children({ roomId }) : children}</>;
}
