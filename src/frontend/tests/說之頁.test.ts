import { describe, expect, it } from "vitest";
import { 解說之頁 } from "../src/landing/InfoPage";

/**
 * 址之解。
 *
 * 此為全app第二處以 hash 為路者,而其入為人所授 —— 凡不合式者必歸於 null,
 * 歸於 null 則落於 landing。落於 landing 為安,落於一空之頁則否。
 */
describe("解說之頁", () => {
  it("識其四頁", () => {
    expect(解說之頁("#/help")).toBe("help");
    expect(解說之頁("#/questions")).toBe("questions");
    expect(解說之頁("#/about")).toBe("about");
    expect(解說之頁("#/limits")).toBe("limits");
  });

  // 法之二頁可指而不在 nav。可指者必可解 —— footer 之鏈賴此。
  it("識法之二頁 —— 不在 nav,而其路自通", () => {
    expect(解說之頁("#/privacy")).toBe("privacy");
    expect(解說之頁("#/terms")).toBe("terms");
  });

  it("容其後之錨與其問", () => {
    expect(解說之頁("#/help#colours")).toBe("help");
    expect(解說之頁("#/limits?x=1")).toBe("limits");
  });

  it("不識者皆 null —— 落於 landing,不落於空頁", () => {
    for (const h of ["", "#", "#top", "#/app", "#/app?c=la", "#/helpful", "#/HELP", "#help", "#/",
                     "#/privacypolicy", "#/term", "#/PRIVACY"]) {
      expect(解說之頁(h)).toBeNull();
    }
  });
});
