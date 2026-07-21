import { describe, expect, it } from "vitest";
import { baseName } from "./export";

describe("baseName", () => {
  it("should fall back to 'logo' when the text is blank", () => {
    expect(baseName("   ", "Anton")).toBe("logo_Anton");
  });

  it("should keep kana/kanji and strip family spaces when given mixed input", () => {
    expect(baseName("波", "Space Grotesk")).toBe("波_SpaceGrotesk");
  });

  it("should collapse non-word runs to underscores when given punctuation", () => {
    expect(baseName("A/V", "Anton")).toBe("A_V_Anton");
  });
});
