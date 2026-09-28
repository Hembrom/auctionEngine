import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AuthUserBar() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div className="auth-user-bar">
      <span className="muted auth-user-email">{user.email}</span>
      <Link to="/create" className="btn-link auth-my-rooms">
        My rooms
      </Link>
      <button type="button" className="btn-link auth-sign-out" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );
}
