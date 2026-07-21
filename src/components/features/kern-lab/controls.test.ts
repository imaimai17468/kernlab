import { describe, expect, it } from "vitest";
import {
  controlsReducer,
  INITIAL_CONTROLS,
  resolveWeight,
  weightsOf,
} from "./controls";

describe("weightsOf", () => {
  it("should return the family's weights when the family is known", () => {
    expect(weightsOf("Oswald")).toEqual([400, 600, 700]);
  });

  it("should fall back to [400] when the family is unknown", () => {
    expect(weightsOf("No Such Font")).toEqual([400]);
  });
});

describe("resolveWeight", () => {
  it("should keep the weight when the family supports it", () => {
    expect(resolveWeight("Oswald", 700)).toBe(700);
  });

  it("should clamp to the first supported weight when unsupported", () => {
    expect(resolveWeight("Anton", 700)).toBe(400);
  });
});

describe("controlsReducer", () => {
  it("should merge a plain patch when it does not affect the font", () => {
    expect(
      controlsReducer(INITIAL_CONTROLS, { tightness: 0.9 }).tightness
    ).toBe(0.9);
  });

  it("should clamp the weight when a family switch invalidates it", () => {
    const state = controlsReducer(INITIAL_CONTROLS, {
      family: "Oswald",
      weight: 700,
    });
    expect(controlsReducer(state, { family: "Anton" }).weight).toBe(400);
  });

  it("should keep the weight when a family switch still supports it", () => {
    const state = controlsReducer(INITIAL_CONTROLS, {
      family: "Oswald",
      weight: 700,
    });
    expect(controlsReducer(state, { family: "Poppins" }).weight).toBe(700);
  });
});
