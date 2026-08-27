import { useState } from "react";
import type { 报 } from "../data/本地庫";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const 類之文: { v: 报["kind"]; label: string }[] = [
  { v: "curb_cut_broken", label: "Curb cut broken or missing" },
  { v: "sidewalk_blocked", label: "Sidewalk blocked" },
  { v: "no_shade", label: "No shade where the map shows some" },
  { v: "closed_facility", label: "Facility closed" },
  { v: "other", label: "Something else" },
];

export function ReportForm({
  city_id,
  edge_id,
  段之文,
  段之序,
  onSubmit,
  就緒,
  庫之誤,
}: {
  city_id: string;
  edge_id: number;
  /** 所擇之段之述,示之於人,俾知其所報者何。 */
  段之文: string;
  段之序: number;
  onSubmit: (r: 报) => Promise<boolean>;
  就緒: boolean;
  庫之誤: string | null;
}) {
  const [kind, setKind] = useState<报["kind"]>("curb_cut_broken");
  const [note, setNote] = useState("");
  const [果, set果] = useState<"none" | "ok" | "fail">("none");

  return (
    <form
      className="rounded-lg border border-line p-4"
      onSubmit={async (ev) => {
        ev.preventDefault();
        // 必待其果而後言之 —— 不得先稱已存而後乃知其敗。
        const 成 = await onSubmit({
          id: crypto.randomUUID(),
          city_id,
          edge_id,
          kind,
          note: note.trim() || null,
          status: "unverified",
          created_at: new Date().toISOString(),
        });
        set果(成 ? "ok" : "fail");
        if (成) setNote("");
      }}
    >
      <h3 className="text-base font-semibold">Report a problem</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Segment <span className="数 font-semibold">{段之序}</span> — {段之文}
      </p>

      <span id="报-kind-label" className="mt-2 mb-1 block text-sm font-semibold">
        What is wrong
      </span>
      <Select value={kind} onValueChange={(v) => setKind(v as 报["kind"])}>
        <SelectTrigger aria-labelledby="报-kind-label" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {類之文.map((k) => (
            <SelectItem key={k.v} value={k.v}>{k.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label htmlFor="报-note" className="mt-3 mb-1 block text-sm font-semibold">
        Details <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <textarea
        id="报-note"
        value={note}
        maxLength={500}
        rows={2}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-sm"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!就緒}>
          Submit report
        </Button>
        {果 === "ok" && (
          <span role="status" className="text-sm font-semibold text-route">
            Report saved.
          </span>
        )}
        {果 === "fail" && (
          <span role="alert" className="text-sm font-semibold text-fullsun">
            Could not save. Nothing was recorded.
          </span>
        )}
      </div>

      {!就緒 && (
        <p role="alert" className="mt-2 text-xs text-fullsun">
          Local storage is unavailable, so reports cannot be saved on this device.
          {庫之誤 ? ` (${庫之誤})` : ""}
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Reports are anonymous — no account, no location history, no device
        identifier. A report attaches to a sidewalk segment, never to you. Submitted
        reports show as unverified until someone confirms them.
      </p>
    </form>
  );
}
