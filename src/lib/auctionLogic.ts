import type { Captain, CurrentBid, Player, Position, AuctionState } from '../types';
import {
  POSITION_ORDER,
  RESULT_SECONDS,
  SQUAD_SIZE,
  STARTING_BID,
  STARTING_BUDGET,
  TIMER_SECONDS,
} from '../types';
import { clampRating } from './playerUtils';

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

export function formatSoldMessage(playerName: string, teamName: string, amount: number): string {
  return `Player ${playerName} sold to ${teamName} in amount Rs ${amount}`;
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

export function getUnsoldPlayers(players: Player[]): Player[] {
  return players.filter((p) => p.status === 'unsold');
}

export function areAllSquadsFull(captains: Captain[]): boolean {
  return captains
    .filter((c) => c.status === 'approved')
    .every((c) => c.squad.length >= SQUAD_SIZE);
}

export function normalizeCaptainLabel(value: string): string {
  return value.trim().toLowerCase();
}

export function getOtherApprovedCaptainIds(
  captains: Captain[],
  currentBidderId?: string,
): string[] {
  return captains
    .filter((c) => c.status === 'approved')
    .filter((c) => c.id !== currentBidderId)
    .map((c) => c.id);
}

export function isCaptainOutOfBidding(
  captain: Captain,
  player: Player,
  currentHighBid: number,
  optedOutCaptainIds: string[],
): boolean {
  if (optedOutCaptainIds.includes(captain.id)) return true;
  const minBid = currentHighBid === 0 ? STARTING_BID : currentHighBid + 1;
  return !isEligibleToBid(captain, player, minBid, currentHighBid).eligible;
}

export function shouldSellOnOptOut(
  captains: Captain[],
  player: Player | null | undefined,
  currentBid: CurrentBid | null | undefined,
  optedOutCaptainIds: string[] = [],
): boolean {
  if (!currentBid?.captainId || !player) return false;

  const others = getOtherApprovedCaptainIds(captains, currentBid.captainId);
  if (others.length === 0) return true;

  return others.every((id) => {
    const captain = captains.find((c) => c.id === id);
    if (!captain) return true;
    return isCaptainOutOfBidding(captain, player, currentBid.amount, optedOutCaptainIds);
  });
}

export function getPlayerBoardSections(state: AuctionState, players: Player[]) {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const queue = state.isUnsoldRound ? state.unsoldQueue : state.playerQueue;
  const upcomingIds = queue.slice(state.currentIndex).filter((id) => id !== state.currentPlayerId);

  return {
    current: state.currentPlayerId ? (playerMap.get(state.currentPlayerId) ?? null) : null,
    upcoming: upcomingIds
      .map((id) => playerMap.get(id))
      .filter((p): p is Player => !!p),
    sold: players.filter((p) => p.status === 'sold'),
    unsold: players.filter((p) => p.status === 'unsold'),
    remaining: players.filter((p) => p.status === 'available'),
  };
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
  const organizingIdx = header.findIndex(
    (h) => h.includes('organizing') || h.includes('communication') || h.includes('pressure'),
  );
  const guidanceIdx = header.findIndex(
    (h) => h.includes('guidance') || h.includes('teammate') || h.includes('look to you'),
  );
  const dribblingIdx = header.findIndex((h) => h.includes('dribbling'));
  const shootingIdx = header.findIndex((h) => h.includes('shooting'));
  const passingIdx = header.findIndex((h) => h.includes('passing'));
  const defendingIdx = header.findIndex((h) => h.includes('defending'));
  const physicalIdx = header.findIndex((h) => h.includes('physical'));
  const paceIdx = header.findIndex((h) => h.includes('pace'));
  const staminaIdx = header.findIndex((h) => h.includes('stamina'));

  const ratingIdx = header.findIndex((h) => h.includes('rating') || h.includes('last match'));
  const fitnessIdx = header.findIndex((h) => h.includes('fitness'));
  const leadershipIdx = header.findIndex((h) => h.includes('leadership'));
  const influenceIdx = header.findIndex((h) => h.includes('influence'));

  const isLegacyFormat = dribblingIdx === -1 && (ratingIdx !== -1 || fitnessIdx !== -1);

  if (nameIdx === -1 || posIdx === -1) {
    return { players: [], errors: ['CSV must have Name and Position columns'] };
  }

  const readRating = (cols: string[], idx: number, fallback: number) =>
    clampRating(Number(cols[idx] ?? fallback) || fallback);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (!cols[nameIdx]) continue;

    const posStr = cols[posIdx].toUpperCase();
    const positions = posStr.split(/[/|&]/).map((p) => p.trim()) as import('../types').Position[];
    const posError = validatePlayerPositions(positions);
    if (posError) {
      errors.push(`Row ${i + 1}: ${posError}`);
      continue;
    }

    if (isLegacyFormat) {
      const base = readRating(cols, ratingIdx, 3);
      players.push({
        name: cols[nameIdx],
        positions,
        organizingComfort: readRating(cols, leadershipIdx, 3) * 2,
        teammateGuidance: readRating(cols, influenceIdx, 3) * 2,
        dribbling: base * 2,
        shooting: readRating(cols, ratingIdx, 3) * 2,
        passing: readRating(cols, fitnessIdx, 3) * 2,
        defending: readRating(cols, leadershipIdx, 3) * 2,
        physical: readRating(cols, fitnessIdx, 3) * 2,
        pace: readRating(cols, ratingIdx, 3) * 2,
        stamina: readRating(cols, fitnessIdx, 3) * 2,
      });
      continue;
    }

    players.push({
      name: cols[nameIdx],
      positions,
      organizingComfort: readRating(cols, organizingIdx, 5),
      teammateGuidance: readRating(cols, guidanceIdx, 5),
      dribbling: readRating(cols, dribblingIdx, 5),
      shooting: readRating(cols, shootingIdx, 5),
      passing: readRating(cols, passingIdx, 5),
      defending: readRating(cols, defendingIdx, 5),
      physical: readRating(cols, physicalIdx, 5),
      pace: readRating(cols, paceIdx, 5),
      stamina: readRating(cols, staminaIdx, 5),
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
    bidTimerSeconds: TIMER_SECONDS,
    resultTimerSeconds: RESULT_SECONDS,
  };
}
