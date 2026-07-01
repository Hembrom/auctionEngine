import type { Captain, Player, Position } from '../types';
import {
  POSITION_ORDER,
  SQUAD_SIZE,
  STARTING_BID,
  STARTING_BUDGET,
} from '../types';

export function hasGoalkeeper(captain: Captain): boolean {
  return captain.squad.some((p) => p.position === 'GK');
}

export function getRemainingPlayerCount(captain: Captain): number {
  return SQUAD_SIZE - captain.squad.length;
}

/** Outfield slots still fillable (DEF/MID/ST — any mix). */
export function getOutfieldSlotsRemaining(captain: Captain): number {
  const remaining = getRemainingPlayerCount(captain);
  if (remaining <= 0) return 0;
  return hasGoalkeeper(captain) ? remaining : Math.max(0, remaining - 1);
}

export function getRemainingSlots(captain: Captain): Record<Position, number> {
  const remaining = getRemainingPlayerCount(captain);
  const outfield = getOutfieldSlotsRemaining(captain);
  return {
    GK: !hasGoalkeeper(captain) && remaining > 0 ? 1 : 0,
    DEF: outfield,
    MID: outfield,
    ST: outfield,
  };
}

export function getAvailableBudget(captain: Captain): number {
  const remaining = getRemainingPlayerCount(captain);
  return captain.budget - remaining * STARTING_BID;
}

export function canBidOnPosition(captain: Captain, position: Position): boolean {
  if (captain.squad.length >= SQUAD_SIZE) return false;
  if (position === 'GK') return !hasGoalkeeper(captain);
  return getOutfieldSlotsRemaining(captain) > 0;
}

export function isEligibleToBid(
  captain: Captain,
  player: Player,
  bidAmount: number,
  currentHighBid: number,
): { eligible: boolean; reason?: string } {
  if (captain.squad.length >= SQUAD_SIZE) {
    return { eligible: false, reason: 'Squad is full' };
  }

  const playerPositions = player.positions;
  const hasSlot = playerPositions.some((pos) => canBidOnPosition(captain, pos));
  if (!hasSlot) {
    if (!hasGoalkeeper(captain) && getRemainingPlayerCount(captain) === 1) {
      return { eligible: false, reason: 'Must buy a GK for your last slot' };
    }
    return { eligible: false, reason: 'No open slot for this position' };
  }

  const minBid = currentHighBid === 0 ? STARTING_BID : currentHighBid + 1;
  if (bidAmount < minBid) {
    return { eligible: false, reason: `Minimum bid is ₹${minBid}` };
  }

  const available = getAvailableBudget(captain);
  if (bidAmount > available) {
    return { eligible: false, reason: `Exceeds available budget (₹${available})` };
  }

  return { eligible: true };
}

export function getPrimaryPosition(player: Player): Position {
  return player.positions[0];
}

export function assignPosition(captain: Captain, player: Player): Position {
  if (player.positions.includes('GK') && canBidOnPosition(captain, 'GK')) {
    return 'GK';
  }
  for (const pos of player.positions) {
    if (pos !== 'GK' && canBidOnPosition(captain, pos)) return pos;
  }
  return player.positions.find((p) => p !== 'GK') ?? player.positions[0];
}

export function formatRemainingSlots(captain: Captain): string {
  const remaining = getRemainingPlayerCount(captain);
  if (remaining <= 0) return 'Full';

  const parts: string[] = [];
  if (!hasGoalkeeper(captain)) parts.push('GK 1');
  const outfield = getOutfieldSlotsRemaining(captain);
  if (outfield > 0) parts.push(`${outfield} outfield`);
  return parts.join(', ');
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildPlayerQueue(players: Player[], unsoldOnly = false): string[] {
  const filtered = players.filter((p) =>
    unsoldOnly ? p.status === 'unsold' : p.status === 'available',
  );

  const queue: string[] = [];
  for (const position of POSITION_ORDER) {
    const group = filtered.filter((p) => p.positions.includes(position));
    const shuffled = shuffleArray(group);
    for (const p of shuffled) {
      if (!queue.includes(p.id)) queue.push(p.id);
    }
  }
  return queue;
}

export function isAuctionComplete(
  players: Player[],
  captains: Captain[],
  queue: string[],
  currentIndex: number,
): boolean {
  if (currentIndex >= queue.length) return true;

  const allFull = captains
    .filter((c) => c.status === 'approved')
    .every((c) => c.squad.length >= SQUAD_SIZE);

  if (allFull) return true;

  const remaining = queue.slice(currentIndex);
  const availablePlayers = players.filter(
    (p) => remaining.includes(p.id) && (p.status === 'available' || p.status === 'unsold'),
  );

  return availablePlayers.length === 0;
}

export function validatePlayerPositions(positions: Position[]): string | null {
  if (positions.length === 0) return 'At least one position required';
  if (positions.includes('GK') && positions.length > 1) {
    return 'GK cannot have a secondary position';
  }
  return null;
}

export function parseCsvPlayers(csv: string): {
  players: Omit<Player, 'id' | 'status'>[];
  errors: string[];
} {
  const lines = csv.trim().split('\n');
  const errors: string[] = [];
  const players: Omit<Player, 'id' | 'status'>[] = [];

  if (lines.length < 2) {
    return { players: [], errors: ['CSV must have a header row and at least one player'] };
  }

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const nameIdx = header.findIndex((h) => h.includes('name'));
  const posIdx = header.findIndex((h) => h.includes('position'));
  const ratingIdx = header.findIndex((h) => h.includes('rating') || h.includes('last match'));
  const fitnessIdx = header.findIndex((h) => h.includes('fitness'));
  const leadershipIdx = header.findIndex((h) => h.includes('leadership'));
  const influenceIdx = header.findIndex((h) => h.includes('influence'));

  if (nameIdx === -1 || posIdx === -1) {
    return { players: [], errors: ['CSV must have Name and Position columns'] };
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (!cols[nameIdx]) continue;

    const posStr = cols[posIdx].toUpperCase();
    const positions = posStr.split(/[/|&]/).map((p) => p.trim()) as Position[];
    const posError = validatePlayerPositions(positions);
    if (posError) {
      errors.push(`Row ${i + 1}: ${posError}`);
      continue;
    }

    players.push({
      name: cols[nameIdx],
      positions,
      lastMatchRating: Number(cols[ratingIdx] ?? 3) || 3,
      fitness: Number(cols[fitnessIdx] ?? 3) || 3,
      leadership: Number(cols[leadershipIdx] ?? 3) || 3,
      teamInfluence: Number(cols[influenceIdx] ?? 3) || 3,
    });
  }

  return { players, errors };
}

export function createDefaultAuctionState(): import('../types').AuctionState {
  return {
    displayName: '',
    createdAt: 0,
    phase: 'setup',
    paused: false,
    startingBudget: STARTING_BUDGET,
    isUnsoldRound: false,
    currentPlayerId: null,
    playerQueue: [],
    unsoldQueue: [],
    currentIndex: 0,
    bidDeadline: null,
    currentBid: null,
    resultDisplay: null,
    resultEndsAt: null,
    adminId: null,
  };
}
