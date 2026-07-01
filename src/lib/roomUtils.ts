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

export function roomAdminUrl(roomId: string): string {
  return `${window.location.origin}/room/${roomId}/admin`;
}
