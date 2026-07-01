const captainKey = (roomId: string) => `auction_captain_${roomId}`;
const adminKey = (roomId: string) => `auction_admin_${roomId}`;

export function getCaptainId(roomId: string): string | null {
  return sessionStorage.getItem(captainKey(roomId));
}

export function setCaptainId(roomId: string, id: string) {
  sessionStorage.setItem(captainKey(roomId), id);
}

export function clearCaptainId(roomId: string) {
  sessionStorage.removeItem(captainKey(roomId));
}

export function getAdminId(roomId: string): string | null {
  return sessionStorage.getItem(adminKey(roomId));
}

export function setAdminId(roomId: string, id: string) {
  sessionStorage.setItem(adminKey(roomId), id);
}

export function clearAdminId(roomId: string) {
  sessionStorage.removeItem(adminKey(roomId));
}

export function getOrCreateAdminId(roomId: string): string {
  let id = getAdminId(roomId);
  if (!id) {
    id = `admin_${Date.now()}`;
    setAdminId(roomId, id);
  }
  return id;
}
