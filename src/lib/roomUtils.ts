import type { AuctionPhase } from '../types';

export function slugifyRoomName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function isValidRoomSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3;
}

export function roomJoinUrl(roomId: string): string {
  return `${window.location.origin}/room/${roomId}`;
}

export function roomSpectatorUrl(roomId: string): string {
  return `${window.location.origin}/room/${roomId}/spectate`;
}

export function roomAdminUrl(roomId: string): string {
  return `${window.location.origin}/room/${roomId}/admin`;
}

export function pathForAuctionPhase(roomId: string, phase: AuctionPhase): string {
  if (phase === 'ended') return `/room/${roomId}/final`;
  if (phase === 'live' || phase === 'result' || phase === 'unsold') {
    return `/room/${roomId}/auction`;
  }
  if (phase === 'lobby') return `/room/${roomId}/lobby`;
  return `/room/${roomId}/spectate`;
}
