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
        {/* 全行為 label:方寸之匣十六像素,不足以指觸 —— WCAG 2.2 之最小為
            二十四,平臺所勸為四十四。此物本為手不便者而設,尤不可狹。 */}
        {之項.map(({ key, label, hint }) => (
          <label
            key={key}
            htmlFor={`profile-${key}`}
            className="flex cursor-pointer items-start gap-2.5 rounded-md py-1.5 -mx-1 px-1 hover:bg-panel"
          >
            <Checkbox
              id={`profile-${key}`}
              checked={flags[key]}
              onCheckedChange={(v) => onChange({ ...flags, [key]: v === true })}
              aria-describedby={`profile-${key}-hint`}
              className="mt-0.5 size-5 shrink-0 after:absolute after:-inset-2"
            />
            <span className="leading-snug">
              <span className="block text-sm font-semibold">{label}</span>
              <span id={`profile-${key}-hint`} className="block text-xs text-muted-foreground">
                {hint}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
