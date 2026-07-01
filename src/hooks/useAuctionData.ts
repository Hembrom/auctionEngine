import { useEffect, useState } from 'react';
import type { AuctionState, Bid, Captain, Player } from '../types';
import { createDefaultAuctionState } from '../lib/auctionLogic';
import {
  subscribeRoomState,
  subscribeBids,
  subscribeCaptains,
  subscribePlayers,
} from '../lib/auctionService';

function formatFirestoreError(err: Error): string {
  const msg = err.message || 'Unknown Firestore error';
  if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
    return 'Firestore permission denied. In Firebase Console → Firestore → Rules, allow read/write (or deploy firestore.rules from this repo).';
  }
  if (msg.includes('not-found') || msg.includes('404')) {
    return 'Firestore database not found. Create a Firestore database in Firebase Console.';
  }
  return msg;
}

export function useAuctionData(roomId: string, currentPlayerId?: string | null) {
  const [state, setState] = useState<AuctionState>(createDefaultAuctionState());
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [roomFound, setRoomFound] = useState(true);

  const handleError = (err: Error) => {
    setFirebaseError(formatFirestoreError(err));
    setLoading(false);
  };

  useEffect(() => {
    if (!roomId) return;

    setFirebaseError(null);
    setLoading(true);

    const unsubs = [
      subscribeRoomState(
        roomId,
        (s) => {
          setState(s);
          setRoomFound(!!s.displayName || s.phase !== 'setup' || s.createdAt > 0);
          setLoading(false);
        },
        handleError,
      ),
      subscribeCaptains(roomId, setCaptains, handleError),
      subscribePlayers(roomId, setPlayers, handleError),
    ];
    return () => unsubs.forEach((u) => u());
  }, [roomId]);

  useEffect(() => {
    const pid = currentPlayerId ?? state.currentPlayerId;
    return subscribeBids(roomId, pid, setBids, handleError);
  }, [roomId, currentPlayerId, state.currentPlayerId]);

  return { state, captains, players, bids, loading, firebaseError, roomFound };
}
