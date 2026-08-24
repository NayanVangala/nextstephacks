import type { ProfileFlags } from "../types";

const LABELS: { key: keyof ProfileFlags; label: string; hint: string }[] = [
  {
    key: "wheelchair",
    label: "Wheelchair user",
    hint: "Excludes steps, steep grades, raised kerbs, and narrow or unpaved segments.",
  },
  {
    key: "heat_sensitive",
    label: "Heat-sensitive",
    hint: "Weights sun exposure heavily. For MS, POTS, cardiac conditions, or heat-reactive medication.",
  },
  {
    key: "blind_low_vision",
    label: "Blind or low vision",
    hint: "Penalizes unsignalized crossings and prefers segments with tactile paving.",
  },
];

export function ProfilePicker({
  flags,
  onChange,
}: {
  flags: ProfileFlags;
  onChange: (f: ProfileFlags) => void;
}) {
  return (
    <fieldset style={{ border: "1px solid #d4d4d8", borderRadius: 8, padding: "0.75rem 1rem" }}>
      <legend style={{ fontWeight: 600, padding: "0 0.4rem" }}>Accessibility profile</legend>
      {LABELS.map(({ key, label, hint }) => (
        <div key={key} style={{ marginBottom: "0.5rem" }}>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={flags[key]}
              onChange={(ev) => onChange({ ...flags, [key]: ev.target.checked })}
              aria-describedby={`hint-${key}`}
              style={{ marginTop: "0.25rem" }}
            />
            <span>
              <strong>{label}</strong>
              <br />
              <small id={`hint-${key}`} style={{ color: "#52525b" }}>
                {hint}
              </small>
            </span>
          </label>
        </div>
      ))}
    </fieldset>
  );
}
