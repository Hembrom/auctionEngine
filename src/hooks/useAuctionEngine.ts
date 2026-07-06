import { useEffect, useRef, useState } from 'react';
import type { AuctionState, Captain, Player } from '../types';
import { finalizeCurrentPlayer, advanceAfterResult } from '../lib/auctionService';
import { isAuctionPaused } from '../lib/auctionState';
import { shouldSellOnOptOut } from '../lib/auctionLogic';

export function useAuctionEngine(
  roomId: string,
  state: AuctionState,
  players: Player[],
  captains: Captain[],
) {
  const processing = useRef(false);
  const stateRef = useRef(state);
  const playersRef = useRef(players);
  const captainsRef = useRef(captains);
  stateRef.current = state;
  playersRef.current = players;
  captainsRef.current = captains;

  useEffect(() => {
    if (!roomId) return;

    const tick = async () => {
      if (processing.current) return;

      const current = stateRef.current;
      if (isAuctionPaused(current)) return;

      const now = Date.now();

      if (
        current.phase === 'live' &&
        current.currentBid &&
        current.currentPlayerId &&
        !isAuctionPaused(current)
      ) {
        const player = playersRef.current.find((p) => p.id === current.currentPlayerId);
        if (
          player &&
          shouldSellOnOptOut(
            captainsRef.current,
            player,
            current.currentBid,
            current.optedOutCaptainIds,
          )
        ) {
          processing.current = true;
          try {
            await finalizeCurrentPlayer(
              roomId,
              playersRef.current,
              captainsRef.current,
              current,
              true,
            );
          } finally {
            processing.current = false;
          }
          return;
        }
      }

      if (current.phase === 'live' && current.bidDeadline && now >= current.bidDeadline) {
        processing.current = true;
        try {
          await finalizeCurrentPlayer(
            roomId,
            playersRef.current,
            captainsRef.current,
            current,
          );
        } finally {
          processing.current = false;
        }
        return;
      }

      if (current.phase === 'result' && current.resultEndsAt && now >= current.resultEndsAt) {
        processing.current = true;
        try {
          await advanceAfterResult(
            roomId,
            playersRef.current,
            captainsRef.current,
            current,
          );
        } finally {
          processing.current = false;
        }
      }
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [roomId]);
}

export function useCountdown(
  deadline: number | null,
  paused: boolean,
  pausedRemainingMs?: number | null,
): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (paused) {
      const frozen =
        typeof pausedRemainingMs === 'number' && pausedRemainingMs > 0
          ? Math.ceil(pausedRemainingMs / 1000)
          : deadline
            ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
            : 0;
      setRemaining(frozen);
      return;
    }

    if (!deadline) {
      setRemaining(0);
      return;
    }

    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline, paused, pausedRemainingMs]);

  return remaining;
}
