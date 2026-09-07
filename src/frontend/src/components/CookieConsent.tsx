import { useState } from "react";
import { Button } from "./ui/button";
import { 記許, 啟量, 當問許, type 許 } from "../data/量";

/**
 * 餅之問。
 *
 * 此為無障礙之器,故其問不可為 modal:不奪其焦,不掩其文,不阻其行。
 * 一人立於壞緣石而欲報之,不當先過一幕。故此為頁末之一帶,可略而不答,
 * 而略之即未許 —— 未許則一字不載。
 *
 * NOT a modal, and not dismissible-by-implication. This is an accessibility
 * tool: someone standing at a broken kerb cut must be able to use it without
 * first clearing a dialog. So it is a region at the end of the page — it never
 * traps focus, never covers content, and ignoring it is a valid outcome that
 * means "not consented", so nothing loads.
 *
 * 二鈕同其重。「許」大而「拒」小者,dark pattern 也,不為之。
 * Both buttons carry equal visual weight. Making "Accept" prominent and
 * "Decline" a faint link is a dark pattern, and a consent it manufactures is
 * not consent.
 */
export function CookieConsent() {
  const [見, set見] = useState(當問許);

  if (!見) return null;

  const 答 = (v: 許) => {
    記許(v);
    // 許則即載之。拒則不載,且不再問。
    if (v === "yes") 啟量();
    set見(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie choice"
      className="sticky bottom-0 z-40 border-t border-line bg-panel/95 px-4 py-4 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">
          We use Google Analytics to count visits. It sets cookies and is loaded
          only if you say yes. Routing, maps and reports work exactly the same
          either way.{" "}
          <a href="#/privacy" className="underline underline-offset-2">
            Privacy policy
          </a>
        </p>
        {/* 四十四像素之底,motor impairment 之故。size 之常為三十六,故明授之。 */}
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            className="h-11 min-w-24"
            onClick={() => 答("no")}
          >
            Decline
          </Button>
          <Button className="h-11 min-w-24" onClick={() => 答("yes")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
