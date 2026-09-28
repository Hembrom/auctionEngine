import { useAuth } from '../context/AuthContext';

export function AuthUserBar() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div className="auth-user-bar">
      <span className="muted auth-user-email">{user.email}</span>
      <button type="button" className="btn-link auth-sign-out" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );
}
