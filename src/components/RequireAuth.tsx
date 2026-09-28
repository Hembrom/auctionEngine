import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from './LoginForm';

interface RequireAuthProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function RequireAuth({ children, title, subtitle }: RequireAuthProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="card center-card">
        <p className="muted">Checking sign-in…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm title={title} subtitle={subtitle} />;
  }

  return <>{children}</>;
}
