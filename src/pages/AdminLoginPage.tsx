import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FirebaseBanner } from '../components/FirebaseBanner';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export function AdminLoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';

  useEffect(() => {
    if (!loading && user) {
      navigate(next, { replace: true });
    }
  }, [loading, user, next, navigate]);

  return (
    <Layout title="Admin Sign In" subtitle="Create or manage auction rooms" theme="admin">
      <FirebaseBanner />
      <div className="auth-page-single">
        <LoginForm
          role="admin"
          title="Admin account"
          subtitle="Sign in to create a room or open your admin panel."
          onSuccess={() => navigate(next, { replace: true })}
        />
        <p className="muted auth-page-back">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
    </Layout>
  );
}
