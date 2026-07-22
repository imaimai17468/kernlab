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

/** Supported weights for a built-in family (undefined for unknown names). */
export function weightsOf(family: string): readonly number[] | undefined {
  return FONTS.find((f) => f.name === family)?.weights;
}

/**
 * Clamp a requested weight to a built-in family's supported weights. Custom
 * families are unknown to this pure module: their weight validity is enforced
 * at the event site against the registry (specs/custom-fonts.spec.md), so the
 * requested weight passes through untouched.
 */
export function resolveWeight(family: string, weight: number): number {
  const weights = weightsOf(family);
  if (!weights) return weight;
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
