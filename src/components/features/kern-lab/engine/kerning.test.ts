import { describe, expect, it } from "vitest";
import { MH } from "./constants";
import { solveS } from "./kerning";
import type { Glyph } from "./types";

/** Minimal synthetic glyph: only the fields solveS reads (has / Rr / Lp) carry data. */
function makeGlyph(rows: number[], rr: number, lp: number): Glyph {
  const has = new Uint8Array(MH);
  const Rr = new Float32Array(MH);
  const Lp = new Float32Array(MH);
  rows.forEach((y) => {
    has[y] = 1;
    Rr[y] = rr;
    Lp[y] = lp;
  });
  return {
    ch: "x",
    advance: 100,
    hasInk: true,
    width: 100,
    inkLeft: 0,
    inkRight: 100,
    inkTop: rows[0],
    inkBottom: rows[rows.length - 1],
    has,
    firstX: new Int16Array(MH),
    lastX: new Int16Array(MH),
    Lp,
    Rr,
  };
}

describe("solveS", () => {
  it("should return the target spacing when the glyphs share no ink rows", () => {
    expect(
      solveS(makeGlyph([10], 0, 0), makeGlyph([20], 0, 0), 5, 100, 1)
    ).toBe(5);
  });

  it("should solve toward the target when profiles add nothing on shared rows", () => {
    const a = makeGlyph([10, 11], 0, 0);
    const b = makeGlyph([10, 11], 0, 0);
    expect(solveS(a, b, 5, 100, 1)).toBeCloseTo(5, 1);
  });

  it("should nudge spacing up to the floor when the tightest gap is too small", () => {
    const a = makeGlyph([10, 11], 0, 0);
    const b = makeGlyph([10, 11], 0, 0);
    expect(solveS(a, b, 0.5, 100, 3)).toBeCloseTo(3, 1);
  });
});
