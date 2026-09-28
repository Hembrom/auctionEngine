import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginFormProps {
  title: string;
  subtitle?: string;
  onSuccess?: () => void;
}

export function LoginForm({ title, subtitle, onSuccess }: LoginFormProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      onSuccess?.();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card auth-card">
      <h3>{title}</h3>
      {subtitle && <p className="muted auth-subtitle">{subtitle}</p>}
      <form onSubmit={handleSubmit} className="join-form auth-form">
        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'signup' ? 'At least 6 characters' : 'Password'}
        />
        <button type="submit" disabled={busy || !email.trim() || !password}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="muted auth-toggle">
        {mode === 'signin' ? (
          <>
            New here?{' '}
            <button type="button" className="btn-link" onClick={() => setMode('signup')}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" className="btn-link" onClick={() => setMode('signin')}>
              Sign in
            </button>
          </>
        )}
      </p>
      <p className="muted auth-hint">
        Enable Email/Password sign-in in Firebase Console → Authentication if login fails.
      </p>
    </div>
  );
}

function formatAuthError(err: unknown): string {
  const code = (err as { code?: string }).code;
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    default:
      return (err as Error).message || 'Authentication failed.';
  }
}
