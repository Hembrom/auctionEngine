import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCaptainId, setCaptainId } from './useSession';
import { findCaptainByAuthUid } from '../lib/auctionService';

export function useCaptainSession(roomId: string) {
  const { user, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [captainId, setCaptainIdState] = useState<string | null>(() => getCaptainId(roomId));

  useEffect(() => {
    if (authLoading) return;
    setCaptainIdState(getCaptainId(roomId));
    if (!user) {
      setReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      const sessionId = getCaptainId(roomId);
      if (sessionId) {
        if (!cancelled) setCaptainIdState(sessionId);
        if (!cancelled) setReady(true);
        return;
      }
      const existing = await findCaptainByAuthUid(roomId, user.uid);
      if (existing && existing.status !== 'rejected') {
        setCaptainId(roomId, existing.id);
        if (!cancelled) setCaptainIdState(existing.id);
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, roomId]);

  return {
    authLoading: authLoading || !ready,
    user,
    captainId: user ? captainId : null,
  };
}
