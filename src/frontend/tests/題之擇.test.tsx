// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "../src/components/ThemeToggle";

/**
 * 題之擇。其所驗者三:
 *   一、其常為晝印(紙)—— 無所存則不加其屬。
 *   二、按之則為夜印,且存之。
 *   三、存者為夜,則初起即夜。
 *
 * ── 何以倒之 ─────────────────────────────────────────────────────────
 * 此檔前此所驗者正相反:其常為暗,而淡為所欲乃得。riso 之世界既立,
 * 其地為紙,故其常必為紙 —— 世界而須先擇乃見,則非其世界矣。
 * 用之之時亦決之:洛城午後,人在日中而持其屏,暗屏反光,紙則不然。
 *
 * The assertions here are inverted from what they were, deliberately. This file
 * used to encode "dark by default, light on request"; the Riso world's ground is
 * paper, so paper is now the default and the night pull is the opt-in. A world
 * you only see after opting in is not the default world.
 *
 * 其屬之有無仍為其別:常者不書其屬,所欲者乃書之。故此二事不可分驗 ——
 * 屬去而其存猶在,是其常;屬在而其存為 dark,是其所欲。
 * The attribute's absence still encodes the default, so "no attribute" now means
 * the day pull. A regression here would be invisible on a machine already set to
 * the non-default, which is why the stored value is asserted alongside it.
 */

const 鑰 = "passable:theme:v2";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("題之擇", () => {
  it("無所存則為晝印 —— 不加其屬", () => {
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(screen.getByRole("button")).toHaveAccessibleName("Switch to dark theme");
  });

  it("按之則為夜印,且存之", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(鑰)).toBe("dark");
    expect(screen.getByRole("button")).toHaveAccessibleName("Switch to light theme");
  });

  it("再按之則復為晝印,其屬去", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(鑰)).toBe("light");
  });

  it("所存者為夜,則初起即夜", () => {
    localStorage.setItem(鑰, "dark");
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  /*
    舊鑰之值,一概不取。
    前之世界以暗為常,而其效於初掛即書其值 —— 故凡曾至舊頁者,其機皆存一
    「dark」而未嘗擇之。若新頁仍讀舊鑰,則此數人永不得見其新世界。
    此驗所以防其復:若後人圖省事而復用舊鑰,此驗即敗。
    The old key must stay inert. The previous world persisted "dark" on mount
    for everyone who never chose it; honouring that value now would strand every
    returning visitor on a preference nobody set. This test fails if anyone
    reverts to the old key for convenience.
  */
  it("舊鑰之值不取 —— 其為自動所書,非人所擇", () => {
    localStorage.setItem("passable:theme", "dark");
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(screen.getByRole("button")).toHaveAccessibleName("Switch to dark theme");
  });

  it("所存者不可解,則從其常之晝", () => {
    localStorage.setItem(鑰, "chartreuse");
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
