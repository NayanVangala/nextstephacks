// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "../src/components/ThemeToggle";

/**
 * 題之擇。其所驗者三:
 *   一、其常為暗 —— 無所存則不加其屬。此為此改之要,前此其常實為淡。
 *   二、按之則易,且存之。
 *   三、存者為淡,則初起即淡。
 *
 * The default-is-dark assertion is the point of this file: the previous
 * implementation resolved dark through prefers-color-scheme, which reports
 * light for anyone who has not explicitly asked for dark, so the stated default
 * was not the actual default. A regression here would be invisible on a machine
 * set to dark.
 */

const 鑰 = "passable:theme";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("題之擇", () => {
  it("無所存則為暗 —— 不加其屬", () => {
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(screen.getByRole("button")).toHaveAccessibleName("Switch to light theme");
  });

  it("按之則為淡,且存之", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(鑰)).toBe("light");
    expect(screen.getByRole("button")).toHaveAccessibleName("Switch to dark theme");
  });

  it("再按之則復為暗,其屬去", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(鑰)).toBe("dark");
  });

  it("所存者為淡,則初起即淡", () => {
    localStorage.setItem(鑰, "light");
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("所存者不可解,則從其常之暗", () => {
    localStorage.setItem(鑰, "chartreuse");
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
