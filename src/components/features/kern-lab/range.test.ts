import { describe, expect, it } from "vitest";
import { range } from "./range";

describe("range", () => {
  it("should return 0..n-1 when given a positive length", () => {
    expect(range(4)).toEqual([0, 1, 2, 3]);
  });

  it("should return an empty array when given zero", () => {
    expect(range(0)).toEqual([]);
  });
});
