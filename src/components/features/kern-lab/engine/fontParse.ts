import type { Font as OtFont, FontTables, NameGroup } from "opentype.js";
import { parse } from "opentype.js";
import { range } from "./range";

/** Everything the registry needs from a parsed font file. */
type ParsedCustomFont = {
  font: OtFont;
  family: string;
  weights: readonly number[];
  /** Variable fonts register a weight-range FontFace and cannot be outlined. */
  variable: boolean;
  /** FontFace weight descriptor: "700" or "100 900" for a variable wght axis. */
  weightDescriptor: string;
};

type ParseOutcome =
  | { ok: true; parsed: ParsedCustomFont }
  | { ok: false; message: string };

const WOFF2_SIGNATURE = "wOF2";

const readSignature = (bytes: ArrayBuffer): string => {
  const head = new Uint8Array(bytes.slice(0, 4));
  return String.fromCharCode(...head);
};

const firstValue = (name: Readonly<Record<string, string>> | undefined) => {
  if (!name) return undefined;
  return name.en ?? Object.values(name).at(0);
};

const groupFamily = (group: NameGroup | undefined) =>
  firstValue(group?.preferredFamily) ?? firstValue(group?.fontFamily);

type FontNames = {
  readonly windows?: NameGroup;
  readonly macintosh?: NameGroup;
};

/** Family name from the name table (preferredFamily wins; windows first). */
export function familyNameOf(names: FontNames, fallback: string): string {
  const name = groupFamily(names.windows) ?? groupFamily(names.macintosh);
  const trimmed = name?.trim();
  return trimmed !== undefined && trimmed !== "" ? trimmed : fallback;
}

const WGHT_MIN = 100;
const WGHT_MAX = 900;
const WGHT_STEP = 100;

/**
 * Weight menu for the font. A variable wght axis yields the standard 100..900
 * stops inside its range (always including a clamped default); a static font
 * yields its single OS/2 weight class.
 */
export function weightsFromTables(tables: FontTables): {
  weights: readonly number[];
  variable: boolean;
} {
  const wght = tables.fvar?.axes.find((axis) => axis.tag === "wght");
  if (!wght) {
    return { weights: [tables.os2?.usWeightClass ?? 400], variable: false };
  }
  const stopCount = (WGHT_MAX - WGHT_MIN) / WGHT_STEP + 1;
  const stops = range(stopCount).flatMap((i) => {
    const w = WGHT_MIN + i * WGHT_STEP;
    return w >= wght.minValue && w <= wght.maxValue ? [w] : [];
  });
  // Clamp into the axis's own range — the FontFace weight descriptor spans
  // exactly [minValue, maxValue], so a fallback outside it would offer a
  // weight no face can ever match (perpetually not-ready spec strings).
  const fallback = Math.min(
    Math.max(Math.round(wght.defaultValue), wght.minValue),
    wght.maxValue
  );
  return {
    weights: stops.length > 0 ? stops : [fallback],
    variable: true,
  };
}

/** FontFace weight descriptor covering every offered weight. */
export function weightDescriptorOf(
  tables: FontTables,
  weights: readonly number[]
): string {
  const wght = tables.fvar?.axes.find((axis) => axis.tag === "wght");
  if (wght) return `${wght.minValue} ${wght.maxValue}`;
  return String(weights[0]);
}

/**
 * Parse uploaded font bytes into registry metadata. Never throws: every
 * failure returns a user-facing message (parseFail in the spec machine).
 * .woff2 is rejected up front — its decompressor is Node-only, and font files
 * users hold are .ttf/.otf/.woff.
 */
export function parseFontBytes(
  bytes: ArrayBuffer,
  fallbackName: string
): ParseOutcome {
  if (readSignature(bytes) === WOFF2_SIGNATURE) {
    return {
      ok: false,
      message:
        ".woff2 は未対応です。.ttf / .otf / .woff のファイルをご利用ください",
    };
  }
  try {
    const font = parse(bytes);
    const family = familyNameOf(font.names, fallbackName);
    const { weights, variable } = weightsFromTables(font.tables);
    return {
      ok: true,
      parsed: {
        font,
        family,
        weights,
        variable,
        weightDescriptor: weightDescriptorOf(font.tables, weights),
      },
    };
  } catch {
    return {
      ok: false,
      message:
        "フォントを読み取れませんでした。.ttf / .otf / .woff の正しいフォントファイルかご確認ください",
    };
  }
}
