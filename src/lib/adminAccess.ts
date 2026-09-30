import { getAdminId } from '../hooks/useSession';
import type { AuctionState } from '../types';

export function isLegacyAdminId(adminId: string | null | undefined): boolean {
  return !!adminId && adminId.startsWith('admin_');
}

/** Whether the current browser session may control a legacy (pre-auth) room. */
export function hasLegacyAdminSession(roomId: string, state: AuctionState): boolean {
  return (
    isLegacyAdminId(state.adminId) && getAdminId(roomId) === state.adminId
  );
}

/** Room owner via Firebase Auth (new rooms). */
export function isFirebaseRoomAdmin(state: AuctionState, uid: string | undefined): boolean {
  return !!uid && !!state.adminId && state.adminId === uid;
}

/** Additional admins invited by email (case-insensitive), acting alongside the room owner. */
export function isInvitedAdminEmail(state: AuctionState, email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return !!normalized && !!state.adminEmails?.some((e) => e.toLowerCase() === normalized);
}

export function canAccessAdminPanel(
  roomId: string,
  state: AuctionState,
  uid: string | undefined,
  email?: string | null,
): boolean {
  return (
    isFirebaseRoomAdmin(state, uid) ||
    hasLegacyAdminSession(roomId, state) ||
    isInvitedAdminEmail(state, email)
  );
}
