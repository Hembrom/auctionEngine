import type { Position, Player, PlayerFormData, PlayerSkill } from '../types';

export const RATING_MAX = 10;

export const PLAYER_SKILLS: PlayerSkill[] = [
  'dribbling',
  'shooting',
  'passing',
  'defending',
  'physical',
  'pace',
  'stamina',
];

export const PLAYER_SKILL_LABELS: Record<PlayerSkill, string> = {
  dribbling: 'Dribbling',
  shooting: 'Shooting',
  passing: 'Passing',
  defending: 'Defending',
  physical: 'Physical',
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
    physical: 5,
    pace: 5,
    stamina: 5,
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
      physical: clampRating(raw.physical ?? 5),
      pace: clampRating(raw.pace ?? 5),
      stamina: clampRating(raw.stamina ?? 5),
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
    physical: scaleLegacyToTen(raw.fitness, base),
    pace: scaleLegacyToTen(raw.lastMatchRating, base),
    stamina: scaleLegacyToTen(raw.fitness, base),
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
    physical: clampRating(form.physical),
    pace: clampRating(form.pace),
    stamina: clampRating(form.stamina),
  };
}

export function getPlayerSkillValue(player: Player, skill: PlayerSkill): number {
  return player[skill];
}
