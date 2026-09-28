import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function useRequireCaptainLogin(roomId: string) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/room/${roomId}/login`, { replace: true });
    }
  }, [loading, user, roomId, navigate]);

  return { user, loading };
}
