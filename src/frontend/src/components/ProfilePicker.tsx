import { Checkbox } from "@/components/ui/checkbox";
import type { ProfileFlags } from "../types";

const 之項: { key: keyof ProfileFlags; label: string; hint: string }[] = [
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
    <fieldset className="rounded-lg border border-line px-4 py-3">
      <legend className="px-1 text-sm font-semibold">Accessibility profile</legend>
      <div className="flex flex-col gap-3">
        {之項.map(({ key, label, hint }) => (
          <div key={key} className="flex items-start gap-2.5">
            <Checkbox
              id={`profile-${key}`}
              checked={flags[key]}
              onCheckedChange={(v) => onChange({ ...flags, [key]: v === true })}
              aria-describedby={`profile-${key}-hint`}
              className="mt-0.5"
            />
            <div className="leading-snug">
              <label htmlFor={`profile-${key}`} className="text-sm font-semibold">
                {label}
              </label>
              <p id={`profile-${key}-hint`} className="text-xs text-muted-foreground">
                {hint}
              </p>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
