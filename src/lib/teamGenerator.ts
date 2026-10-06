import type { Player, Position } from '../types';
import { POSITION_ORDER } from '../types';
import { getOverallRating } from './playerUtils';
import { getPrimaryPosition, shuffleArray } from './auctionLogic';

/** Players within this OVR distance of each other are shuffled together before drafting. */
const OVR_BAND = 3;
const STAMINA_LEADERS_PER_TEAM = 2;
const STAMINA_TOLERANCE = 4;
const OVR_TOLERANCE = 2;
const MAX_OPTIMIZE_ITERATIONS = 60;

export interface TeamSeed {
  id: string;
  name: string;
  /** Players already on this team that must not be moved. */
  locked?: Player[];
}

export interface GeneratedTeam {
  id: string;
  name: string;
  locked: Player[];
  assigned: Player[];
}

export interface TeamGenerationNResult {
  teams: GeneratedTeam[];
  /** Spread between the strongest and weakest team total OVR. */
  ratingDifference: number;
  /** Team ids that could not be given a natural goalkeeper. */
  teamsWithoutGoalkeeper: string[];
  /** Players that did not fit into any team. */
  unassigned: Player[];
}

const ovrCache = new WeakMap<Player, number>();

function ovr(player: Player): number {
  let value = ovrCache.get(player);
  if (value === undefined) {
    value = getOverallRating(player);
    ovrCache.set(player, value);
  }
  return value;
}

function isGoalkeeper(player: Player): boolean {
  return player.positions.includes('GK');
}

function members(team: GeneratedTeam): Player[] {
  return [...team.locked, ...team.assigned];
}

function teamValue(team: GeneratedTeam, valueOf: (p: Player) => number): number {
  return members(team).reduce((sum, p) => sum + valueOf(p), 0);
}

function goalkeeperCount(team: GeneratedTeam): number {
  return members(team).filter(isGoalkeeper).length;
}

function countAtPosition(team: GeneratedTeam, position: Position): number {
  return members(team).filter((p) => getPrimaryPosition(p) === position).length;
}

/** Team that is shortest on this position, weakest total OVR breaking ties. */
function pickTeamForPosition(
  teams: GeneratedTeam[],
  position: Position,
  isEligible: (index: number) => boolean,
): number {
  let targetIndex = -1;
  let bestCount = Number.POSITIVE_INFINITY;
  let bestTotal = Number.POSITIVE_INFINITY;

  teams.forEach((team, index) => {
    if (!isEligible(index)) return;
    const count = countAtPosition(team, position);
    const total = teamValue(team, ovr);
    if (count < bestCount || (count === bestCount && total < bestTotal)) {
      bestCount = count;
      bestTotal = total;
      targetIndex = index;
    }
  });

  return targetIndex;
}

function spreadOf(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

function take(pool: Player[], player: Player): void {
  const index = pool.indexOf(player);
  if (index >= 0) pool.splice(index, 1);
}

/** Swaps must keep each team's positional makeup intact, so only like-for-like trades. */
function canSwapPlayers(
  _teamA: GeneratedTeam,
  a: Player,
  _teamB: GeneratedTeam,
  b: Player,
): boolean {
  return getPrimaryPosition(a) === getPrimaryPosition(b);
}

function swapPlayers(teamA: GeneratedTeam, a: Player, teamB: GeneratedTeam, b: Player): void {
  take(teamA.assigned, a);
  take(teamB.assigned, b);
  teamA.assigned.push(b);
  teamB.assigned.push(a);
}

/** OVR descending, with ±OVR_BAND bands shuffled so equal-strength players vary run to run. */
function sortPlayersForDraft(players: Player[]): Player[] {
  const sorted = [...players].sort((a, b) => ovr(b) - ovr(a));
  const result: Player[] = [];
  let start = 0;
  while (start < sorted.length) {
    let end = start + 1;
    while (end < sorted.length && ovr(sorted[start]) - ovr(sorted[end]) <= OVR_BAND) end++;
    result.push(...shuffleArray(sorted.slice(start, end)));
    start = end;
  }
  return result;
}

function assignGoalkeepers(teams: GeneratedTeam[], pool: Player[], slots: number[]): void {
  const keepers = shuffleArray(pool.filter(isGoalkeeper));
  teams.forEach((team, index) => {
    if (goalkeeperCount(team) > 0 || slots[index] <= 0) return;
    const keeper = keepers.shift();
    if (!keeper) return;
    team.assigned.push(keeper);
    slots[index] -= 1;
    take(pool, keeper);
  });
}

function distributeStaminaLeaders(
  teams: GeneratedTeam[],
  pool: Player[],
  slots: number[],
  leaderIds: Set<string>,
): void {
  const leaders = pool
    .filter((p) => leaderIds.has(p.id))
    .sort((a, b) => b.stamina - a.stamina);

  for (const leader of leaders) {
    const eligible = teams
      .map((team, index) => ({
        index,
        leaderCount: members(team).filter((p) => leaderIds.has(p.id)).length,
      }))
      .filter(({ index, leaderCount }) => slots[index] > 0 && leaderCount < STAMINA_LEADERS_PER_TEAM);
    if (eligible.length === 0) break;

    const fewest = Math.min(...eligible.map((e) => e.leaderCount));
    const candidates = new Set(
      eligible.filter((e) => e.leaderCount === fewest).map((e) => e.index),
    );
    const index = pickTeamForPosition(teams, getPrimaryPosition(leader), (i) => candidates.has(i));
    if (index < 0) break;

    teams[index].assigned.push(leader);
    slots[index] -= 1;
    take(pool, leader);
  }
}

/** Fills position by position so no team ends up with four defenders and no midfielder. */
function distributeByPosition(
  teams: GeneratedTeam[],
  pool: Player[],
  slots: number[],
): void {
  // Scarcest position first, otherwise plentiful positions eat the slots and starve the rest.
  const buckets = POSITION_ORDER.map((position) => ({
    position,
    players: pool.filter((p) => getPrimaryPosition(p) === position),
  })).sort((a, b) => a.players.length - b.players.length);

  const unplaced: Player[] = [];

  for (const { position, players } of buckets) {
    for (const player of sortPlayersForDraft(players)) {
      const index = pickTeamForPosition(teams, position, (i) => slots[i] > 0);
      if (index < 0) {
        unplaced.push(player);
        continue;
      }
      teams[index].assigned.push(player);
      slots[index] -= 1;
      take(pool, player);
    }
  }

  for (const player of unplaced) {
    const index = slots.findIndex((n) => n > 0);
    if (index < 0) return;
    teams[index].assigned.push(player);
    slots[index] -= 1;
    take(pool, player);
  }
}

/** Repeatedly apply the single best cross-team swap until the spread stops shrinking. */
function optimizeTeamBalance(
  teams: GeneratedTeam[],
  valueOf: (p: Player) => number,
  tolerance: number,
): void {
  for (let iteration = 0; iteration < MAX_OPTIMIZE_ITERATIONS; iteration++) {
    const totals = teams.map((team) => teamValue(team, valueOf));
    const currentSpread = spreadOf(totals);
    if (currentSpread <= tolerance) return;

    let best: { i: number; j: number; a: Player; b: Player; spread: number } | null = null;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        for (const a of teams[i].assigned) {
          for (const b of teams[j].assigned) {
            if (!canSwapPlayers(teams[i], a, teams[j], b)) continue;
            const delta = valueOf(b) - valueOf(a);
            const next = [...totals];
            next[i] += delta;
            next[j] -= delta;
            const candidate = spreadOf(next);
            if (candidate < currentSpread && (!best || candidate < best.spread)) {
              best = { i, j, a, b, spread: candidate };
            }
          }
        }
      }
    }

    if (!best) return;
    swapPlayers(teams[best.i], best.a, teams[best.j], best.b);
  }
}

function enforceStaminaLeaderSplit(teams: GeneratedTeam[], leaderIds: Set<string>): void {
  for (let pass = 0; pass < teams.length * 2; pass++) {
    const counts = teams.map(
      (team) => members(team).filter((p) => leaderIds.has(p.id)).length,
    );
    const over = counts.findIndex((n) => n > STAMINA_LEADERS_PER_TEAM);
    const under = counts.findIndex((n) => n < STAMINA_LEADERS_PER_TEAM);
    if (over < 0 || under < 0) return;

    const give = teams[over].assigned.find((p) => leaderIds.has(p.id));
    const receive = teams[under].assigned.find((p) => !leaderIds.has(p.id));
    if (!give || !receive || !canSwapPlayers(teams[over], give, teams[under], receive)) return;
    swapPlayers(teams[over], give, teams[under], receive);
  }
}

/** Last resort: move a spare keeper from a team holding two to a team holding none. */
function redistributeGoalkeepers(teams: GeneratedTeam[]): void {
  for (let pass = 0; pass < teams.length; pass++) {
    const needy = teams.findIndex((team) => goalkeeperCount(team) === 0);
    const donor = teams.findIndex((team) => goalkeeperCount(team) > 1);
    if (needy < 0 || donor < 0) return;

    const keeper = teams[donor].assigned.find(isGoalkeeper);
    const candidates = teams[needy].assigned.filter((p) => !isGoalkeeper(p));
    if (!keeper || candidates.length === 0) return;

    const closest = candidates.reduce((best, player) =>
      Math.abs(ovr(player) - ovr(keeper)) < Math.abs(ovr(best) - ovr(keeper)) ? player : best,
    );
    swapPlayers(teams[donor], keeper, teams[needy], closest);
  }
}

/** Random-but-safe swaps so "shuffle again" produces a different yet equally balanced split. */
function injectTeamVariety(teams: GeneratedTeam[]): void {
  if (teams.length < 2) return;
  const totals = teams.map((team) => teamValue(team, ovr));
  const ceiling = Math.max(spreadOf(totals), OVR_TOLERANCE);

  for (let attempt = 0; attempt < teams.length * 4; attempt++) {
    const i = Math.floor(Math.random() * teams.length);
    let j = Math.floor(Math.random() * teams.length);
    if (i === j) j = (j + 1) % teams.length;
    const a = teams[i].assigned[Math.floor(Math.random() * teams[i].assigned.length)];
    const b = teams[j].assigned[Math.floor(Math.random() * teams[j].assigned.length)];
    if (!a || !b || !canSwapPlayers(teams[i], a, teams[j], b)) continue;

    const delta = ovr(b) - ovr(a);
    const next = [...totals];
    next[i] += delta;
    next[j] -= delta;
    if (spreadOf(next) > ceiling) continue;

    swapPlayers(teams[i], a, teams[j], b);
    totals[i] = next[i];
    totals[j] = next[j];
  }
}

/**
 * Balances OVR, stamina and goalkeeper coverage across an arbitrary number of teams,
 * holding back the weakest players so uneven pools (e.g. 69 players / 8 teams) stay fair.
 */
export function generateBalancedNTeams(
  players: Player[],
  teamSizes: number[],
  seeds?: TeamSeed[],
): TeamGenerationNResult {
  const teams: GeneratedTeam[] = teamSizes.map((_, index) => ({
    id: seeds?.[index]?.id ?? `team-${index + 1}`,
    name: seeds?.[index]?.name ?? `Team ${index + 1}`,
    locked: [...(seeds?.[index]?.locked ?? [])],
    assigned: [],
  }));

  if (teams.length === 0) {
    return {
      teams,
      ratingDifference: 0,
      teamsWithoutGoalkeeper: [],
      unassigned: [...players],
    };
  }

  const lockedIds = new Set(teams.flatMap((team) => team.locked.map((p) => p.id)));
  const capacity = teams.map((team, index) => Math.max(0, teamSizes[index] - team.locked.length));
  const totalCapacity = capacity.reduce((sum, n) => sum + n, 0);

  // 1. Weakest players are split off first — they get placed last, into whoever needs help.
  const ranked = players
    .filter((p) => !lockedIds.has(p.id))
    .sort((a, b) => ovr(a) - ovr(b));
  const overflow = Math.max(0, ranked.length - totalCapacity);
  const unassigned = ranked.slice(0, overflow);
  const pool = ranked.slice(overflow);

  const baseSize = Math.min(...capacity);
  const extra = Math.max(0, pool.length - teams.length * baseSize);
  const weakest = pool.slice(0, extra);
  const core = pool.slice(extra);

  const coreSlots = capacity.map((n) => Math.min(baseSize, n));
  const remaining = [...core];

  // 2–4. Goalkeepers, then stamina leaders, then a snake draft for everyone else.
  assignGoalkeepers(teams, remaining, coreSlots);

  const leaderIds = new Set(
    [...core]
      .sort((a, b) => b.stamina - a.stamina)
      .slice(0, STAMINA_LEADERS_PER_TEAM * teams.length)
      .map((p) => p.id),
  );
  distributeStaminaLeaders(teams, remaining, coreSlots, leaderIds);
  distributeByPosition(teams, remaining, coreSlots);

  // 5. Local search on OVR, then stamina, then restore the 2-leaders-per-team split.
  optimizeTeamBalance(teams, ovr, OVR_TOLERANCE);
  optimizeTeamBalance(teams, (p) => p.stamina, STAMINA_TOLERANCE);
  enforceStaminaLeaderSplit(teams, leaderIds);

  // 6. Weak players go to whichever team with room is currently the weakest,
  //    except weak keepers, which first cover any team still without one.
  const leftovers = shuffleArray(weakest);
  const hasRoom = (index: number) =>
    teams[index].locked.length + teams[index].assigned.length < teamSizes[index];

  teams.forEach((team, index) => {
    if (goalkeeperCount(team) > 0 || !hasRoom(index)) return;
    const keeper = leftovers.find(isGoalkeeper);
    if (!keeper) return;
    take(leftovers, keeper);
    team.assigned.push(keeper);
  });

  for (const player of leftovers) {
    const index = pickTeamForPosition(teams, getPrimaryPosition(player), hasRoom);
    if (index < 0) {
      unassigned.push(player);
      continue;
    }
    teams[index].assigned.push(player);
  }

  // 7. Variety pass + final goalkeeper audit.
  redistributeGoalkeepers(teams);
  injectTeamVariety(teams);

  const teamsWithoutGoalkeeper = teams
    .filter((team) => goalkeeperCount(team) === 0)
    .map((team) => team.id);

  return {
    teams,
    ratingDifference: spreadOf(teams.map((team) => teamValue(team, ovr))),
    teamsWithoutGoalkeeper,
    unassigned,
  };
}
