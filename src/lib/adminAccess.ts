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

export function canAccessAdminPanel(
  roomId: string,
  state: AuctionState,
  uid: string | undefined,
): boolean {
  return isFirebaseRoomAdmin(state, uid) || hasLegacyAdminSession(roomId, state);
}
