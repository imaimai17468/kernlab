import { describe, expect, it } from "vitest";
import { dedupeByFamily } from "./localFonts";

const fd = (family: string, style: string): LocalFontData => ({
  family,
  fullName: `${family} ${style}`,
  postscriptName: `${family}-${style}`,
  style,
  blob: () => Promise.resolve(new Blob()),
});

describe("dedupeByFamily", () => {
  it("should keep one entry per family when styles repeat", () => {
    const out = dedupeByFamily([fd("Alpha", "Bold"), fd("Alpha", "Light")]);
    expect(out).toHaveLength(1);
  });

  it("should prefer the Regular style when it appears after another style", () => {
    const out = dedupeByFamily([fd("Alpha", "Bold"), fd("Alpha", "Regular")]);
    expect(out[0].style).toBe("Regular");
  });

  it("should keep the Regular style when a later non-Regular style arrives", () => {
    const out = dedupeByFamily([fd("Alpha", "Regular"), fd("Alpha", "Bold")]);
    expect(out[0].style).toBe("Regular");
  });

  it("should sort families alphabetically when several are present", () => {
    const out = dedupeByFamily([fd("Zeta", "Regular"), fd("Alpha", "Regular")]);
    expect(out.map((f) => f.family)).toEqual(["Alpha", "Zeta"]);
  });
});
