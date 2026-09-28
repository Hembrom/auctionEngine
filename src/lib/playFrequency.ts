import type { PlayFrequency } from '../types';

export const PLAY_FREQUENCY_OPTIONS: {
  id: PlayFrequency;
  label: string;
  barValue: number;
}[] = [
  { id: 'multiple_week', label: 'Multiple Times a Week', barValue: 10 },
  { id: 'once_week', label: 'Once a Week', barValue: 8 },
  { id: 'once_month', label: 'Once a Month', barValue: 5 },
  { id: 'occasionally', label: 'Occasionally', barValue: 3 },
  { id: 'never', label: 'Never Played', barValue: 1 },
];

const BY_ID = Object.fromEntries(
  PLAY_FREQUENCY_OPTIONS.map((o) => [o.id, o]),
) as Record<PlayFrequency, (typeof PLAY_FREQUENCY_OPTIONS)[number]>;

export function getPlayFrequencyOption(id: PlayFrequency | undefined) {
  return BY_ID[id ?? 'once_week'] ?? BY_ID.once_week;
}

export function getPlayFrequencyBarValue(id: PlayFrequency | undefined): number {
  return getPlayFrequencyOption(id).barValue;
}

export function normalizePlayFrequency(raw: unknown): PlayFrequency {
  if (typeof raw === 'string' && raw in BY_ID) {
    return raw as PlayFrequency;
  }
  return parsePlayFrequencyLabel(typeof raw === 'string' ? raw : '');
}

/** Accept CSV labels, ids, or short codes. */
export function parsePlayFrequencyLabel(raw: string): PlayFrequency {
  const text = raw.trim().toLowerCase();
  if (!text) return 'once_week';

  const exactId = PLAY_FREQUENCY_OPTIONS.find((o) => o.id === text);
  if (exactId) return exactId.id;

  if (text.includes('multiple')) return 'multiple_week';
  if (text.includes('once a week') || text.includes('once/week')) return 'once_week';
  if (text.includes('once a month') || text.includes('once/month')) return 'once_month';
  if (text.includes('occasion')) return 'occasionally';
  if (text.includes('never')) return 'never';

  const byLabel = PLAY_FREQUENCY_OPTIONS.find((o) => o.label.toLowerCase() === text);
  if (byLabel) return byLabel.id;

  const partial = PLAY_FREQUENCY_OPTIONS.find((o) => text.includes(o.label.toLowerCase().slice(0, 8)));
  if (partial) return partial.id;

  return 'once_week';
}
