import type { AuctionPhase, Captain } from '../types';
import { pathForAuctionPhase } from './roomUtils';

export function pathForCaptainInRoom(
  roomId: string,
  phase: AuctionPhase,
  captain: Captain,
): string {
  if (captain.status === 'rejected') {
    return `/room/${roomId}`;
  }
  if (captain.status === 'pending') {
    return `/room/${roomId}/waiting`;
  }
  if (phase === 'ended') {
    return `/room/${roomId}/final`;
  }
  if (['live', 'result', 'unsold'].includes(phase)) {
    return `/room/${roomId}/auction`;
  }
  return pathForAuctionPhase(roomId, phase);
}
