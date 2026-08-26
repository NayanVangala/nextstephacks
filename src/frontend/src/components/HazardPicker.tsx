import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HAZARDS, type Hazard } from "../data/hazards";

export function HazardPicker({
  value,
  onChange,
}: {
  value: Hazard;
  onChange: (h: Hazard) => void;
}) {
  return (
    <div className="my-4">
      <span id="hazard-label" className="mb-1.5 block text-sm font-semibold">
        Scenario
      </span>
      <Select
        value={value.id}
        onValueChange={(id) => onChange(HAZARDS.find((h) => h.id === id) ?? HAZARDS[0])}
      >
        <SelectTrigger aria-labelledby="hazard-label" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HAZARDS.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              {h.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {value.description}
        {value.hypothetical && (
          <span className="font-semibold text-midsun"> This is a what-if, not a live alert.</span>
        )}
      </p>
    </div>
  );
}
