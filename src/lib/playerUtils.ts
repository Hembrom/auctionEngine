import type { Position, Player, PlayerFormData, PlayerMark, PlayerSkill } from '../types';
import { getPlayFrequencyScore100, normalizePlayFrequency } from './playFrequency';

export const RATING_MAX = 10;

export const PLAYER_SKILLS: PlayerSkill[] = [
  'dribbling',
  'shooting',
  'passing',
  'defending',
  'gameUnderstanding',
  'pace',
  'stamina',
];

export const PLAYER_SKILL_LABELS: Record<PlayerSkill, string> = {
  dribbling: 'Dribbling',
  shooting: 'Shooting',
  passing: 'Passing',
  defending: 'Defending',
  gameUnderstanding: 'Game Understanding',
  pace: 'Pace',
  stamina: 'Stamina',
};

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'GK',
  DEF: 'Defense',
  MID: 'Midfield',
  ST: 'Striker',
};

export const REGISTRATION_INTRO =
  'As part of this year\'s tournament, teams will be formed through a bidding process based on player ratings. Please take 2 minutes to complete this honest self assessment — it determines your player rating and captain eligibility, and ensures fair, balanced teams for everyone.';

type LegacyPlayerFields = {
  lastMatchRating?: number;
  fitness?: number;
  leadership?: number;
  teamInfluence?: number;
  physical?: number;
};

export function clampRating(value: number, max = RATING_MAX): number {
  return Math.round(Math.min(max, Math.max(1, value)));
}

export function createDefaultPlayerForm(): PlayerFormData {
  return {
    name: '',
    positions: ['MID'],
    organizingComfort: 5,
    teammateGuidance: 5,
    dribbling: 5,
    shooting: 5,
    passing: 5,
    defending: 5,
    gameUnderstanding: 5,
    pace: 5,
    stamina: 5,
    playFrequency: 'once_week',
  };
}

function scaleLegacyToTen(value: number | undefined, fallback = 5): number {
  if (value == null || Number.isNaN(value)) return fallback;
  if (value <= 5) return clampRating(value * 2);
  return clampRating(value);
}

export function normalizePlayer(
  raw: Partial<Player> & LegacyPlayerFields & Pick<Player, 'id' | 'name' | 'positions' | 'status'>,
): Player {
  const hasNewSkills = raw.dribbling != null;

  if (hasNewSkills) {
    return {
      id: raw.id,
      name: raw.name,
      positions: raw.positions,
      status: raw.status,
      organizingComfort: clampRating(raw.organizingComfort ?? 5),
      teammateGuidance: clampRating(raw.teammateGuidance ?? 5),
      dribbling: clampRating(raw.dribbling ?? 5),
      shooting: clampRating(raw.shooting ?? 5),
      passing: clampRating(raw.passing ?? 5),
      defending: clampRating(raw.defending ?? 5),
      gameUnderstanding: clampRating(raw.gameUnderstanding ?? raw.physical ?? 5),
      pace: clampRating(raw.pace ?? 5),
      stamina: clampRating(raw.stamina ?? 5),
      playFrequency: normalizePlayFrequency(raw.playFrequency),
      imageUrl: raw.imageUrl?.trim() || undefined,
      soldToCaptainId: raw.soldToCaptainId,
      soldPrice: raw.soldPrice,
    };
  }

  const base = scaleLegacyToTen(raw.lastMatchRating);
  return {
    id: raw.id,
    name: raw.name,
    positions: raw.positions,
    status: raw.status,
    organizingComfort: scaleLegacyToTen(raw.leadership),
    teammateGuidance: scaleLegacyToTen(raw.teamInfluence),
    dribbling: base,
    shooting: scaleLegacyToTen(raw.lastMatchRating, base),
    passing: scaleLegacyToTen(raw.fitness, base),
    defending: scaleLegacyToTen(raw.leadership, base),
    gameUnderstanding: scaleLegacyToTen(raw.physical ?? raw.fitness, base),
    pace: scaleLegacyToTen(raw.lastMatchRating, base),
    stamina: scaleLegacyToTen(raw.fitness, base),
    playFrequency: normalizePlayFrequency(raw.playFrequency),
    imageUrl: raw.imageUrl?.trim() || undefined,
    soldToCaptainId: raw.soldToCaptainId,
    soldPrice: raw.soldPrice,
  };
}

export function sanitizePlayerForm(form: PlayerFormData): PlayerFormData {
  return {
    ...form,
    name: form.name.trim(),
    organizingComfort: clampRating(form.organizingComfort),
    teammateGuidance: clampRating(form.teammateGuidance),
    dribbling: clampRating(form.dribbling),
    shooting: clampRating(form.shooting),
    passing: clampRating(form.passing),
    defending: clampRating(form.defending),
    gameUnderstanding: clampRating(form.gameUnderstanding),
    pace: clampRating(form.pace),
    stamina: clampRating(form.stamina),
  };
}

export function getPlayerSkillValue(player: Player, skill: PlayerSkill): number {
  return player[skill];
}

/** Map a 1–10 stat to 0–100 (e.g. 2/10 → 20/100). */
export function ratingToScore100(rating: number): number {
  return clampRating(rating) * 10;
}

/** Overall 0–100: average of seven skills (×10) plus play frequency score. */
export function getOverallRating(player: Player): number {
  const skillScores = PLAYER_SKILLS.map((skill) =>
    ratingToScore100(getPlayerSkillValue(player, skill)),
  );
  const playScore = getPlayFrequencyScore100(player.playFrequency);
  const total = skillScores.reduce((sum, n) => sum + n, 0) + playScore;
  return Math.round(total / (PLAYER_SKILLS.length + 1));
}

export function formatOverallRating(player: Player): string {
  return `${getOverallRating(player)}/100`;
}

export const PLAYER_MARKS: PlayerMark[] = ['5-star', '4-star', '3-star', 'local', 'priority'];

export const PLAYER_MARK_LABELS: Record<PlayerMark, string> = {
  '5-star': '5★',
  '4-star': '4★',
  '3-star': '3★',
  local: 'Local',
  priority: 'Priority',
};

const STAR_MARKS = new Set<PlayerMark>(['5-star', '4-star', '3-star']);

/** Toggle a mark; star ratings are mutually exclusive. */
export function togglePlayerMarkTags(tags: PlayerMark[], mark: PlayerMark): PlayerMark[] {
  if (tags.includes(mark)) {
    return tags.filter((t) => t !== mark);
  }
  if (STAR_MARKS.has(mark)) {
    return [...tags.filter((t) => !STAR_MARKS.has(t)), mark];
  }
  return [...tags, mark];
}
