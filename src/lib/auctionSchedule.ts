import type { AuctionState } from '../types';

/** Scheduled kickoff times per room, as ISO strings with an explicit offset. */
const AUCTION_START_TIMES: Record<string, string> = {
  'football-auction-dummy-2026': '2026-10-07T15:00:00+05:30',
};

/** IST has no DST, so a fixed offset is safe. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getAuctionStartTime(roomId: string): number | null {
  const iso = AUCTION_START_TIMES[roomId.trim().toLowerCase()];
  if (!iso) return null;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? null : time;
}

/** Admin-configured time wins; otherwise fall back to the built-in schedule. */
export function resolveAuctionStartTime(
  roomId: string,
  state: Pick<AuctionState, 'auctionStartsAt'>,
): number | null {
  if (state.auctionStartsAt === null) return null;
  if (typeof state.auctionStartsAt === 'number') return state.auctionStartsAt;
  return getAuctionStartTime(roomId);
}

/** Formats epoch ms as the `YYYY-MM-DDTHH:mm` an <input type="datetime-local"> expects, in IST. */
export function toIstInputValue(startsAt: number): string {
  return new Date(startsAt + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** Reads a `YYYY-MM-DDTHH:mm` input value as an IST wall-clock time. */
export function fromIstInputValue(value: string): number | null {
  if (!value) return null;
  const time = new Date(`${value}:00+05:30`).getTime();
  return Number.isNaN(time) ? null : time;
}

export function formatAuctionStartLabel(startsAt: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(startsAt));
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function getCountdownParts(remainingMs: number): CountdownParts {
  const total = Math.max(0, Math.floor(remainingMs / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
