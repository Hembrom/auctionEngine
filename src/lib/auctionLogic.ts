import type { Captain, CurrentBid, Player, Position, AuctionState } from '../types';
import {
  POSITION_ORDER,
  RESULT_SECONDS,
  SQUAD_SIZE,
  STARTING_BID,
  STARTING_BUDGET,
  TIMER_SECONDS,
  MINIMUM_SLOT_RESERVE,
} from '../types';
import { clampRating } from './playerUtils';
import { parsePlayFrequencyLabel } from './playFrequency';

export function getRemainingPlayerCount(captain: Captain): number {
  return SQUAD_SIZE - captain.squad.length;
}

export function getRemainingSlots(captain: Captain): Record<Position, number> {
  const remaining = getRemainingPlayerCount(captain);
  return {
    GK: remaining,
    DEF: remaining,
    MID: remaining,
    ST: remaining,
  };
}

export function getAvailableBudget(captain: Captain): number {
  const remaining = getRemainingPlayerCount(captain);
  return captain.budget - remaining * MINIMUM_SLOT_RESERVE;
}

export function hasGoalkeeper(captain: Captain): boolean {
  return captain.squad.some((player) => player.position === 'GK');
}

export function isSquadComplete(captain: Captain): boolean {
  return captain.squad.length >= SQUAD_SIZE && hasGoalkeeper(captain);
}

export function canBidOnPosition(captain: Captain, _position: Position): boolean {
  return captain.squad.length < SQUAD_SIZE;
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
  const hasRoom = captain.squad.length < SQUAD_SIZE;
  if (!hasRoom || playerPositions.length === 0) {
    return { eligible: false, reason: 'No open slot for this player' };
  }

  const remainingSlots = getRemainingPlayerCount(captain);
  if (!hasGoalkeeper(captain) && remainingSlots === 1 && !playerPositions.includes('GK')) {
    return { eligible: false, reason: 'A goalkeeper is required for every team' };
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
  return POSITION_ORDER.find((pos) => player.positions.includes(pos)) ?? player.positions[0];
}

export function assignPosition(_captain: Captain, player: Player): Position {
  return getPrimaryPosition(player);
}

export function formatRemainingSlots(captain: Captain): string {
  const remaining = getRemainingPlayerCount(captain);
  if (remaining <= 0) return 'Full';
  return remaining === 1 ? '1 slot' : `${remaining} slots`;
}

export function getUnsoldPlayers(players: Player[]): Player[] {
  return players.filter((p) => p.status === 'unsold');
}

export function areAllSquadsFull(captains: Captain[]): boolean {
  return captains
    .filter((c) => c.status === 'approved')
    .every(isSquadComplete);
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

  const byPosition: Record<Position, Player[]> = {
    GK: [],
    DEF: [],
    MID: [],
    ST: [],
  };

  for (const player of filtered) {
    const bucket =
      POSITION_ORDER.find((pos) => player.positions.includes(pos)) ?? player.positions[0];
    if (bucket) byPosition[bucket].push(player);
  }

  const queue: string[] = [];
  for (const position of POSITION_ORDER) {
    for (const p of shuffleArray(byPosition[position])) {
      queue.push(p.id);
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

  const allFull = captains.filter((c) => c.status === 'approved').every(isSquadComplete);

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
  const gameUnderstandingIdx = header.findIndex(
    (h) => h.includes('game understanding') || h.includes('physical'),
  );
  const paceIdx = header.findIndex((h) => h.includes('pace'));
  const staminaIdx = header.findIndex((h) => h.includes('stamina'));
  const playFreqIdx = header.findIndex(
    (h) =>
      h.includes('play frequency') ||
      h.includes('how frequently') ||
      (h.includes('play') && h.includes('football')),
  );

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

  const readPlayFrequency = (cols: string[], idx: number) =>
    parsePlayFrequencyLabel(idx >= 0 ? cols[idx] ?? '' : '');

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
        gameUnderstanding: readRating(cols, fitnessIdx, 3) * 2,
        pace: readRating(cols, ratingIdx, 3) * 2,
        stamina: readRating(cols, fitnessIdx, 3) * 2,
        playFrequency: readPlayFrequency(cols, playFreqIdx),
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
      gameUnderstanding: readRating(cols, gameUnderstandingIdx, 5),
      pace: readRating(cols, paceIdx, 5),
      stamina: readRating(cols, staminaIdx, 5),
      playFrequency: readPlayFrequency(cols, playFreqIdx),
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
    adminEmails: [],
    bidTimerSeconds: TIMER_SECONDS,
    resultTimerSeconds: RESULT_SECONDS,
  };
}
