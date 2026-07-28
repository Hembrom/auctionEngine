import type { PlayerFormData, Position } from '../types';
import {
  PLAYER_SKILLS,
  PLAYER_SKILL_LABELS,
  POSITION_LABELS,
  RATING_MAX,
  REGISTRATION_INTRO,
} from '../lib/playerUtils';

const ALL_POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'ST'];

interface PlayerRegistrationFormProps {
  form: PlayerFormData;
  onChange: (form: PlayerFormData) => void;
  onSubmit: () => void;
  showIntro?: boolean;
  submitLabel?: string;
}

function RatingField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="registration-rating-field">
      <span className="registration-rating-label">{label}</span>
      {hint && <span className="muted registration-rating-hint">{hint}</span>}
      <input
        type="number"
        min={1}
        max={RATING_MAX}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function PlayerRegistrationForm({
  form,
  onChange,
  onSubmit,
  showIntro = true,
  submitLabel = 'Add Player',
}: PlayerRegistrationFormProps) {
  const togglePosition = (pos: Position) => {
    if (pos === 'GK') {
      onChange({ ...form, positions: ['GK'] });
      return;
    }
    const withoutGk = form.positions.filter((p) => p !== 'GK');
    const has = withoutGk.includes(pos);
    const next = has ? withoutGk.filter((p) => p !== pos) : [...withoutGk, pos];
    onChange({ ...form, positions: next.length ? next : ['MID'] });
  };

  const setSkill = (skill: (typeof PLAYER_SKILLS)[number], value: number) => {
    onChange({ ...form, [skill]: value });
  };

  return (
    <div className="player-registration-form">
      {showIntro && <p className="registration-intro muted">{REGISTRATION_INTRO}</p>}

      <label className="registration-name-field">
        Player Name
        <input
          placeholder="Full name"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </label>

      <fieldset className="registration-fieldset">
        <legend>Preferred Position(s)</legend>
        <p className="muted registration-field-hint">GK / Defense / Midfield / Striker</p>
        <div className="position-picker">
          {ALL_POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              className={form.positions.includes(pos) ? 'active' : ''}
              onClick={() => togglePosition(pos)}
            >
              {POSITION_LABELS[pos]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="registration-fieldset">
        <legend>Leadership &amp; Influence</legend>
        <RatingField
          label="Organizing & communication under pressure"
          hint="How comfortable organizing teammates, communicating during matches, and making decisions under pressure (1–10)"
          value={form.organizingComfort}
          onChange={(v) => onChange({ ...form, organizingComfort: v })}
        />
        <RatingField
          label="Teammates look to you for guidance"
          hint="Never (1) to Always (10)"
          value={form.teammateGuidance}
          onChange={(v) => onChange({ ...form, teammateGuidance: v })}
        />
      </fieldset>

      <fieldset className="registration-fieldset">
        <legend>General Skills</legend>
        <p className="muted registration-field-hint">Rate each skill from 1 to 10</p>
        <div className="registration-skills-grid">
          {PLAYER_SKILLS.map((skill) => (
            <RatingField
              key={skill}
              label={PLAYER_SKILL_LABELS[skill]}
              value={form[skill]}
              onChange={(v) => setSkill(skill, v)}
            />
          ))}
        </div>
      </fieldset>

      <button type="button" className="btn-primary" onClick={onSubmit}>
        {submitLabel}
      </button>
    </div>
  );
}
