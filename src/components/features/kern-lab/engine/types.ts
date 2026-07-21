// Shared types for the KERN LAB optical-kerning tool.
// Designed for additive growth: new render modes extend the Layout union,
// new metrics extend Glyph without breaking existing consumers.

export type Mode = "optical" | "native";

export type Font = {
  readonly name: string;
  readonly weights: readonly number[];
  readonly note: string;
};

/** Per-glyph ink measurement: bounding box plus per-row left/right edge profiles. */
export type Glyph = {
  readonly ch: string;
  readonly advance: number;
  readonly hasInk: boolean;
  readonly width: number;
  readonly inkLeft: number;
  readonly inkRight: number;
  readonly inkTop: number;
  readonly inkBottom: number;
  /** 1 when row y contains ink. */
  readonly has: Uint8Array;
  readonly firstX: Int16Array;
  readonly lastX: Int16Array;
  /** Left profile: distance from inkLeft to the first ink pixel on row y. */
  readonly Lp: Float32Array;
  /** Right profile: distance from the last ink pixel on row y to inkRight. */
  readonly Rr: Float32Array;
};

/** A glyph placed on the optical baseline layout. */
export type PlacedGlyph = {
  readonly g: Glyph;
  readonly inkLeftX: number;
};

export type PairInfo = {
  readonly a: string;
  readonly b: string;
  /** Solved spacing between the two glyphs, in measurement-space px. */
  readonly s: number;
  /** Position of the pair in the laid-out text (stable identity for list keys). */
  readonly index: number;
};

/** A pair annotated with its em-normalized adjustment for the readout. */
export type Pair = PairInfo & { readonly em: number };

type LayoutBase = {
  readonly family: string;
  readonly weight: number;
  readonly text: string;
  readonly totalW: number;
  readonly inkTop: number;
  readonly inkBottom: number;
  readonly pad: number;
  readonly cap: number;
  readonly pairInfo: PairInfo[];
};

export type OpticalLayout = LayoutBase & {
  readonly mode: "optical";
  readonly laid: PlacedGlyph[];
};

/** Native metrics: the browser lays out the whole string; we only track its left ink edge. */
export type NativeLayout = LayoutBase & {
  readonly mode: "native";
  readonly native: { readonly iL: number };
};

export type Layout = OpticalLayout | NativeLayout;

export type RenderOptions = {
  readonly W: number;
  readonly H: number;
  readonly dpr: number;
  readonly transparent: boolean;
  readonly showArea: boolean;
  readonly showGuides: boolean;
  readonly fit: number;
};
