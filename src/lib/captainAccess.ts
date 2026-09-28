import type { Captain } from '../types';

export function captainMatchesUser(captain: Captain | undefined, uid: string | undefined): boolean {
  if (!captain || !uid) return false;
  if (!captain.authUid) return true;
  return captain.authUid === uid;
}
