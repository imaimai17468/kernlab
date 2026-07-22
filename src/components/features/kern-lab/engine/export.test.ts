import type { Font as OtFont } from "opentype.js";
import { parse } from "opentype.js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { baseName, exportSVG } from "./export";
import { makeFontBytes } from "./fontFixtures";
import type { Glyph, Layout } from "./types";

// Registry stub for the custom-family export branch; keyed by family name.
const registry = vi.hoisted(
  () => new Map<string, { font: unknown; variable: boolean }>()
);
vi.mock("./customFonts", () => ({
  getCustomFontForExport: (name: string) => registry.get(name),
}));

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

const glyphOf = (ch: string): Glyph => ({
  ch,
  advance: 600,
  hasInk: true,
  width: 400,
  inkLeft: 240,
  inkRight: 640,
  inkTop: 100,
  inkBottom: 400,
  has: new Uint8Array(0),
  firstX: new Int16Array(0),
  lastX: new Int16Array(0),
  Lp: new Float32Array(0),
  Rr: new Float32Array(0),
});

const opticalLayout = (family: string): Layout => ({
  mode: "optical",
  family,
  weight: 400,
  text: "AA",
  totalW: 900,
  inkTop: 100,
  inkBottom: 400,
  pad: 100,
  cap: 50,
  pairInfo: [],
  laid: [
    { g: glyphOf("A"), inkLeftX: 0 },
    { g: glyphOf("A"), inkLeftX: 460 },
  ],
});

const nativeLayout = (family: string): Layout => ({
  mode: "native",
  family,
  weight: 400,
  text: "AA",
  totalW: 900,
  inkTop: 100,
  inkBottom: 400,
  pad: 100,
  cap: 50,
  pairInfo: [],
  native: { iL: 240 },
});

describe("exportSVG", () => {
  const created: Blob[] = [];
  let outlineFont: OtFont;

  beforeAll(() => {
    // jsdom has no createObjectURL; capture the exported blob through it.
    Object.defineProperty(URL, "createObjectURL", {
      value: (blob: Blob) => {
        created.push(blob);
        return "blob:test";
      },
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: () => undefined,
      configurable: true,
    });
    outlineFont = parse(makeFontBytes("Outline Fam"));
    registry.set("Outline Fam", { font: outlineFont, variable: false });
    registry.set("Variable Fam", { font: outlineFont, variable: true });
  });

  const lastSvg = () => {
    const blob = created.at(-1);
    return blob ? blob.text() : Promise.resolve("");
  };

  it("should reference the web font when the family is built-in", async () => {
    exportSVG(opticalLayout("Anton"), "AA", "Anton");
    expect(await lastSvg()).toContain("@import");
  });

  it("should embed glyph outlines when the family is custom", async () => {
    exportSVG(opticalLayout("Outline Fam"), "AA", "Outline Fam");
    expect(await lastSvg()).toContain("<path d=");
  });

  it("should not reference any font when the family is custom", async () => {
    exportSVG(opticalLayout("Outline Fam"), "AA", "Outline Fam");
    expect(await lastSvg()).not.toContain("font-family");
  });

  it("should outline the whole string when the layout is native", async () => {
    exportSVG(nativeLayout("Outline Fam"), "AA", "Outline Fam");
    expect(await lastSvg()).toContain("<path d=");
  });

  it("should skip the download when the custom font is variable", () => {
    const before = created.length;
    exportSVG(opticalLayout("Variable Fam"), "AA", "Variable Fam");
    expect(created.length).toBe(before);
  });
});
