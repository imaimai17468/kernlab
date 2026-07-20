import { describe, expect, it } from "vitest";
import { resolveThemeCycle } from "./ModeToggle";

describe("resolveThemeCycle", () => {
  it.each([
    { theme: "dark", label: "dark" },
    { theme: "light", label: "light" },
    { theme: undefined, label: "undefined" },
  ])(
    "should default to light when not mounted and theme is $label",
    ({ theme }) => {
      expect(resolveThemeCycle(theme, false)).toEqual({
        current: "light",
        next: "dark",
      });
    }
  );

  it.each([
    { theme: "light", current: "light", next: "dark" },
    { theme: "dark", current: "dark", next: "light" },
  ])(
    "should toggle to $next when mounted and theme is $theme",
    ({ theme, current, next }) => {
      expect(resolveThemeCycle(theme, true)).toEqual({ current, next });
    }
  );

  it("should fall back to light when mounted and theme is undefined", () => {
    expect(resolveThemeCycle(undefined, true)).toEqual({
      current: "light",
      next: "dark",
    });
  });

  it("should fall back to light when mounted and theme is unrecognized", () => {
    expect(resolveThemeCycle("high-contrast", true)).toEqual({
      current: "light",
      next: "dark",
    });
  });
});
