import type { AuctionState } from '../types';
import { RESULT_SECONDS, TIMER_SECONDS } from '../types';

/**
 * Paused only when explicitly true, or live auction with timer saved but cleared.
 * Explicit `paused: false` always means running (fixes resume sync issues).
 */
export function isAuctionPaused(state: AuctionState): boolean {
  return state.paused === true;
}

export function canShowLiveAuction(state: AuctionState): boolean {
  return state.phase === 'live' || state.phase === 'result' || state.phase === 'unsold';
}

export function canPlaceBids(state: AuctionState): boolean {
  return state.phase === 'live' && !isAuctionPaused(state) && !!state.currentPlayerId;
}

export function getBidTimerSeconds(state: AuctionState): number {
  return state.bidTimerSeconds ?? TIMER_SECONDS;
}

export function getResultTimerSeconds(state: AuctionState): number {
  return state.resultTimerSeconds ?? RESULT_SECONDS;
}
