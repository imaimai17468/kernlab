import { FONTS } from "./constants";
import type { Mode } from "./types";

/** All user-driven control state for the tool, grouped into one reducer. */
export type Controls = {
  text: string;
  family: string;
  weight: number;
  tightness: number;
  frame: number;
  showArea: boolean;
  showGuides: boolean;
  mode: Mode;
};

export const INITIAL_CONTROLS: Controls = {
  text: "WAVE",
  family: "Anton",
  weight: 400,
  tightness: 0.4,
  frame: 0.5,
  showArea: true,
  showGuides: false,
  mode: "optical",
};

/** A partial update; every control dispatches a merge patch. */
export type ControlsPatch = Partial<Controls>;

/** Supported weights for a family (single-weight fallback for unknown names). */
export function weightsOf(family: string): readonly number[] {
  return FONTS.find((f) => f.name === family)?.weights ?? [400];
}

/** Clamp a requested weight to the family's supported weights. */
export function resolveWeight(family: string, weight: number): number {
  const weights = weightsOf(family);
  return weights.includes(weight) ? weight : weights[0];
}

/**
 * Merge a patch, keeping the invariant that `weight` is always valid for
 * `family` — so a family switch corrects the weight inside the reducer and no
 * derived clamping is needed at render time.
 */
export function controlsReducer(
  state: Controls,
  patch: ControlsPatch
): Controls {
  const next = { ...state, ...patch };
  return { ...next, weight: resolveWeight(next.family, next.weight) };
}
