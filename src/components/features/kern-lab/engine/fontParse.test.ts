import { describe, expect, it } from "vitest";
import { makeFontBytes } from "./fontFixtures";
import {
  familyNameOf,
  parseFontBytes,
  weightDescriptorOf,
  weightsFromTables,
} from "./fontParse";

describe("familyNameOf", () => {
  it("should prefer the windows preferredFamily when present", () => {
    const names = {
      windows: { preferredFamily: { en: "Pref" }, fontFamily: { en: "Fam" } },
      macintosh: { fontFamily: { en: "MacFam" } },
    };
    expect(familyNameOf(names, "fb")).toBe("Pref");
  });

  it("should fall back to the windows fontFamily when preferredFamily is absent", () => {
    const names = { windows: { fontFamily: { en: "Fam" } } };
    expect(familyNameOf(names, "fb")).toBe("Fam");
  });

  it("should fall back to the macintosh group when windows is absent", () => {
    const names = { macintosh: { fontFamily: { en: "MacFam" } } };
    expect(familyNameOf(names, "fb")).toBe("MacFam");
  });

  it("should use the first localized value when no en record exists", () => {
    const names = { windows: { fontFamily: { ja: "和文ファミリー" } } };
    expect(familyNameOf(names, "fb")).toBe("和文ファミリー");
  });

  it("should return the fallback when the name table has no family", () => {
    expect(familyNameOf({}, "fb")).toBe("fb");
  });

  it("should return the fallback when the family name is blank", () => {
    const names = { windows: { fontFamily: { en: "   " } } };
    expect(familyNameOf(names, "fb")).toBe("fb");
  });
});

describe("weightsFromTables", () => {
  it("should return the OS/2 weight class when the font is static", () => {
    expect(weightsFromTables({ os2: { usWeightClass: 700 } }).weights).toEqual([
      700,
    ]);
  });

  it("should default to 400 when the OS/2 table is absent", () => {
    expect(weightsFromTables({}).weights).toEqual([400]);
  });

  it("should list the standard stops inside the wght range when the font is variable", () => {
    const tables = {
      fvar: {
        axes: [
          { tag: "wght", minValue: 300, maxValue: 700, defaultValue: 400 },
        ],
      },
    };
    expect(weightsFromTables(tables).weights).toEqual([
      300, 400, 500, 600, 700,
    ]);
  });

  it("should report variable when a wght axis exists", () => {
    const tables = {
      fvar: {
        axes: [
          { tag: "wght", minValue: 100, maxValue: 900, defaultValue: 400 },
        ],
      },
    };
    expect(weightsFromTables(tables).variable).toBe(true);
  });

  it("should fall back to the clamped default when the wght range contains no standard stop", () => {
    const tables = {
      fvar: {
        axes: [
          { tag: "wght", minValue: 440, maxValue: 460, defaultValue: 450 },
        ],
      },
    };
    expect(weightsFromTables(tables).weights).toEqual([450]);
  });

  it("should clamp the fallback into the axis range when the range lies outside the standard stops", () => {
    const tables = {
      fvar: {
        axes: [
          { tag: "wght", minValue: 1000, maxValue: 1200, defaultValue: 1100 },
        ],
      },
    };
    expect(weightsFromTables(tables).weights).toEqual([1100]);
  });

  it("should ignore non-wght axes when deciding variability", () => {
    const tables = {
      fvar: {
        axes: [{ tag: "wdth", minValue: 50, maxValue: 200, defaultValue: 100 }],
      },
      os2: { usWeightClass: 500 },
    };
    expect(weightsFromTables(tables)).toEqual({
      weights: [500],
      variable: false,
    });
  });
});

describe("weightDescriptorOf", () => {
  it("should span the axis range when the font is variable", () => {
    const tables = {
      fvar: {
        axes: [
          { tag: "wght", minValue: 300, maxValue: 800, defaultValue: 400 },
        ],
      },
    };
    expect(weightDescriptorOf(tables, [300, 400])).toBe("300 800");
  });

  it("should use the single weight when the font is static", () => {
    expect(weightDescriptorOf({}, [700])).toBe("700");
  });
});

describe("parseFontBytes", () => {
  it("should extract the family name when the bytes are a valid font", () => {
    const outcome = parseFontBytes(makeFontBytes("Round Trip"), "fb");
    expect(outcome.ok && outcome.parsed.family).toBe("Round Trip");
  });

  it("should reject with format guidance when the bytes are woff2", () => {
    const woff2 = new TextEncoder().encode("wOF2....").buffer;
    const outcome = parseFontBytes(woff2, "fb");
    expect(!outcome.ok && outcome.message.includes(".woff2")).toBe(true);
  });

  it("should reject with a readable message when the bytes are not a font", () => {
    const garbage = new TextEncoder().encode("not a font at all").buffer;
    expect(parseFontBytes(garbage, "fb").ok).toBe(false);
  });
});
