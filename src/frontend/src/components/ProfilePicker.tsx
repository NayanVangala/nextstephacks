import { Checkbox } from "@/components/ui/checkbox";
import type { ProfileFlags } from "../types";

const 之項: { key: keyof ProfileFlags; label: string; hint: string }[] = [
  {
    key: "wheelchair",
    label: "Wheelchair user",
    hint: "Leaves out steps, steep slopes, high curbs, and sidewalk that is too narrow or unpaved.",
  },
  {
    key: "heat_sensitive",
    label: "Heat-sensitive",
    hint: "Counts sun very heavily. For MS, POTS, a heart condition, or medication that reacts to heat.",
  },
  {
    key: "blind_low_vision",
    label: "Blind or low vision",
    hint: "Avoids crossings with no signal, and prefers sidewalk with tactile paving.",
  },
];

export function ProfilePicker({
  flags,
  onChange,
}: {
  flags: ProfileFlags;
  onChange: (f: ProfileFlags) => void;
}) {
  /*
    匣中之匣,是為二重之框 —— 其外既有一匣,則此不必更為一匣。
    今但以一髮橫其上而別之:所別者其群,非其地。
    A bordered fieldset inside a bordered panel is a box in a box. A hairline
    rule separates the group just as well and leaves one container instead of
    two nested ones.
  */
  return (
    <fieldset className="border-t border-line pt-3.5">
      <legend className="mb-1 text-sm font-semibold">Accessibility profile</legend>
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
