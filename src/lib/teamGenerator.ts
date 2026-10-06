import type { Player } from '../types';
import { getOverallRating } from './playerUtils';
import { shuffleArray } from './auctionLogic';

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

function spreadOf(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

function take(pool: Player[], player: Player): void {
  const index = pool.indexOf(player);
  if (index >= 0) pool.splice(index, 1);
}

/** Never trade away a team's only goalkeeper unless one comes back in return. */
function canSwapPlayers(
  teamA: GeneratedTeam,
  a: Player,
  teamB: GeneratedTeam,
  b: Player,
): boolean {
  if (isGoalkeeper(a) && !isGoalkeeper(b) && goalkeeperCount(teamA) <= 1) return false;
  if (isGoalkeeper(b) && !isGoalkeeper(a) && goalkeeperCount(teamB) <= 1) return false;
  return true;
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
    const counts = teams.map(
      (team, index) =>
        [index, members(team).filter((p) => leaderIds.has(p.id)).length] as const,
    );
    const target = counts
      .filter(([index, count]) => slots[index] > 0 && count < STAMINA_LEADERS_PER_TEAM)
      .sort((a, b) => a[1] - b[1])[0];
    if (!target) break;
    const [index] = target;
    teams[index].assigned.push(leader);
    slots[index] -= 1;
    take(pool, leader);
  }
}

/** Snake draft: strongest-first round, then reversed, alternating. */
function distributeByBookendDraft(
  teams: GeneratedTeam[],
  pool: Player[],
  slots: number[],
): void {
  const queue = sortPlayersForDraft(pool);
  let round = 0;
  while (queue.length > 0 && slots.some((n) => n > 0)) {
    const order = teams.map((_, i) => i);
    if (round % 2 === 1) order.reverse();
    let placed = false;
    for (const index of order) {
      if (slots[index] <= 0) continue;
      const player = queue.shift();
      if (!player) break;
      teams[index].assigned.push(player);
      slots[index] -= 1;
      take(pool, player);
      placed = true;
    }
    if (!placed) break;
    round += 1;
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
  distributeByBookendDraft(teams, remaining, coreSlots);

  // 5. Local search on OVR, then stamina, then restore the 2-leaders-per-team split.
  optimizeTeamBalance(teams, ovr, OVR_TOLERANCE);
  optimizeTeamBalance(teams, (p) => p.stamina, STAMINA_TOLERANCE);
  enforceStaminaLeaderSplit(teams, leaderIds);

  // 6. Weak players go to whichever team with room is currently the weakest.
  for (const player of shuffleArray(weakest)) {
    let targetIndex = -1;
    let lowestTotal = Number.POSITIVE_INFINITY;
    teams.forEach((team, index) => {
      if (team.locked.length + team.assigned.length >= teamSizes[index]) return;
      const total = teamValue(team, ovr);
      if (total < lowestTotal) {
        lowestTotal = total;
        targetIndex = index;
      }
    });
    if (targetIndex < 0) {
      unassigned.push(player);
      continue;
    }
    teams[targetIndex].assigned.push(player);
  }

  // 7. Variety pass + final goalkeeper audit.
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
