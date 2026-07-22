import type { Font as OtFont } from "opentype.js";
import { FONTS } from "./constants";
import { parseFontBytes } from "./fontParse";
import {
  deleteStoredFont,
  getAllStoredFonts,
  putStoredFont,
} from "./fontStorage";
import { clearGlyphCache } from "./kerning";

// Custom-font registry and intake machine, implementing
// specs/custom-fonts.spec.md verbatim: states restoring/idle/parsing/
// registering/persisting/removing/errored, a queue whose drain is atomic with
// every entry to idle, 5s bounds on every async step, and IndexedDB
// persistence keyed by family name. All processing is local to the browser —
// font bytes are never attached to any network request (the privacy notice's
// truth condition).
//
// The store is module-scope and read via useSyncExternalStore (same pattern
// as fontLoader). Consequences that touch React state (weight re-clamp after
// a same-name replacement, selection fallback after removal) are the event
// site's duty per the spec: intake callbacks receive the outcome and the UI
// handler dispatches.

export type CustomFontPhase =
  | "restoring"
  | "idle"
  | "parsing"
  | "registering"
  | "persisting"
  | "removing"
  | "errored";

/** Public registry entry (snapshot-safe; the parsed font stays internal). */
export type CustomFont = {
  name: string;
  weights: readonly number[];
  variable: boolean;
};

export type CustomFontNotice = {
  id: number;
  message: string;
};

export type CustomFontsSnapshot = {
  phase: CustomFontPhase;
  fonts: readonly CustomFont[];
  /** errored-state message; the machine pauses the queue until dismissed. */
  error: string | null;
  /** Orthogonal UI overlays (persist/remove failures); dismissed individually. */
  notices: readonly CustomFontNotice[];
  queued: number;
};

type RegistryEntry = {
  name: string;
  weights: readonly number[];
  variable: boolean;
  font: OtFont;
  face: FontFace;
  /** IndexedDB key (differs from name when restore re-suffixed it). */
  storageKey: string;
  /** False for session-only fonts (persist failed) — removal skips the delete. */
  persisted: boolean;
};

export type FontIntakeItem = {
  readBytes: () => Promise<ArrayBuffer>;
  fallbackName: string;
};

export const FONT_FILE_ACCEPT = ".ttf,.otf,.woff";

/** Wrap picked files into intake items (bytes read lazily, locally). */
export function intakeItemsOf(files: readonly File[]): FontIntakeItem[] {
  return files.map((file) => ({
    readBytes: () => file.arrayBuffer(),
    fallbackName: file.name.replace(/\.[^.]+$/, ""),
  }));
}

const EMPTY_SNAPSHOT: CustomFontsSnapshot = {
  phase: "restoring",
  fonts: [],
  error: null,
  notices: [],
  queued: 0,
};

const entries = new Map<string, RegistryEntry>();
const listeners = new Set<() => void>();
let snapshot: CustomFontsSnapshot = EMPTY_SNAPSHOT;
let generation = 0;

/**
 * Registry mutation bookkeeping: a same-name replacement re-binds a family
 * string to a different face, so every memoized glyph measurement is stale —
 * drop the cache and advance the generation. The generation is a render input
 * (useKernLab's layout memo depends on it), which is what forces a recompute
 * when a swap changes neither family, weight, nor text.
 */
function markRegistryMutated(): void {
  generation += 1;
  clearGlyphCache();
}
let queue: {
  item: FontIntakeItem;
  onRegistered?: (font: CustomFont) => void;
}[] = [];
let noticeSeq = 0;

const ASYNC_STEP_TIMEOUT_MS = 5000;

const BUILTIN_NAMES = new Set(FONTS.map((f) => f.name));
const CUSTOM_SUFFIX = "（カスタム）";

/** Keep custom family names disjoint from built-ins (spec: parseOk/restore). */
const disjointName = (name: string): string =>
  BUILTIN_NAMES.has(name) ? `${name}${CUSTOM_SUFFIX}` : name;

const publicView = (entry: RegistryEntry): CustomFont => ({
  name: entry.name,
  weights: entry.weights,
  variable: entry.variable,
});

function publish(patch: Partial<CustomFontsSnapshot>): void {
  snapshot = {
    ...snapshot,
    ...patch,
    fonts: Array.from(entries.values()).map(publicView),
    queued: queue.length,
  };
  listeners.forEach((notify) => notify());
}

function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("timed out"));
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason: unknown) => {
        clearTimeout(timer);
        reject(reason instanceof Error ? reason : new Error("failed"));
      }
    );
  });
}

function pushNotice(message: string): void {
  noticeSeq += 1;
  publish({
    notices: [...snapshot.notices, { id: noticeSeq, message }],
  });
}

/**
 * Entry to idle. Atomic with the queue drain: when a queued item exists the
 * machine goes straight to parsing — idle with a non-empty queue is never
 * observable (spec: nextQueued).
 */
function enterIdle(): void {
  const next = queue.shift();
  if (next) {
    void runIntake(next.item, next.onRegistered);
    return;
  }
  publish({ phase: "idle" });
}

async function runIntake(
  item: FontIntakeItem,
  onRegistered?: (font: CustomFont) => void
): Promise<void> {
  publish({ phase: "parsing" });
  let bytes: ArrayBuffer;
  try {
    bytes = await withDeadline(item.readBytes(), ASYNC_STEP_TIMEOUT_MS);
  } catch {
    publish({ phase: "errored", error: "ファイルを読み込めませんでした" });
    return;
  }
  const outcome = parseFontBytes(bytes, item.fallbackName);
  if (!outcome.ok) {
    publish({ phase: "errored", error: outcome.message });
    return;
  }
  const family = disjointName(outcome.parsed.family);
  publish({ phase: "registering" });
  const face = new FontFace(family, bytes, {
    weight: outcome.parsed.weightDescriptor,
  });
  try {
    await withDeadline(face.load(), ASYNC_STEP_TIMEOUT_MS);
  } catch {
    // The face was never added to document.fonts (add happens below, only
    // after a timely load) — a late resolution has no continuation. No residue.
    publish({
      phase: "errored",
      error: `「${family}」を登録できませんでした`,
    });
    return;
  }
  // Synchronous swap (spec: registerOk) — the old face stays live until the
  // new one's load has already resolved; no await between remove and insert.
  const existing = entries.get(family);
  if (existing) {
    document.fonts.delete(existing.face);
  }
  document.fonts.add(face);
  const entry: RegistryEntry = {
    name: family,
    weights: outcome.parsed.weights,
    variable: outcome.parsed.variable,
    font: outcome.parsed.font,
    face,
    storageKey: family,
    persisted: false,
  };
  entries.set(family, entry);
  markRegistryMutated();
  publish({ phase: "persisting" });
  onRegistered?.(publicView(entry));
  try {
    await putStoredFont({ name: family, bytes, addedAt: Date.now() });
    entry.persisted = true;
  } catch {
    pushNotice(
      `「${family}」を保存できませんでした。このセッション中は利用できます（次回は以前の保存内容が復元されます）`
    );
  }
  enterIdle();
}

/**
 * Queue font files for intake (spec: pickFile / queuePick). Starts
 * immediately when the machine is observably idle.
 */
export function addFontIntakes(
  items: readonly FontIntakeItem[],
  onRegistered?: (font: CustomFont) => void
): void {
  if (typeof document === "undefined" || items.length === 0) return;
  queue = [...queue, ...items.map((item) => ({ item, onRegistered }))];
  if (snapshot.phase === "idle") {
    enterIdle();
    return;
  }
  publish({});
}

/** spec: dismissError — clears the message, then drains the queue atomically. */
export function dismissCustomFontError(): void {
  if (snapshot.phase !== "errored") return;
  snapshot = { ...snapshot, error: null };
  enterIdle();
}

export function dismissCustomFontNotice(id: number): void {
  publish({ notices: snapshot.notices.filter((n) => n.id !== id) });
}

/**
 * spec: startRemove → removeOk / removeFontFail. The IndexedDB record is
 * deleted first; only on success are the registry entry and FontFace removed.
 * Session-only fonts (never persisted) skip the delete. Returns whether the
 * font was removed so the event site can apply the selection fallback.
 */
export async function removeCustomFont(
  name: string
): Promise<{ removed: boolean }> {
  const entry = entries.get(name);
  if (snapshot.phase !== "idle" || !entry) return { removed: false };
  publish({ phase: "removing" });
  if (entry.persisted) {
    try {
      await deleteStoredFont(entry.storageKey);
    } catch {
      pushNotice(`「${name}」を削除できませんでした。もう一度お試しください`);
      enterIdle();
      return { removed: false };
    }
  }
  document.fonts.delete(entry.face);
  entries.delete(name);
  markRegistryMutated();
  enterIdle();
  return { removed: true };
}

let restoreStarted = false;

async function restoreOne(record: {
  name: string;
  bytes: ArrayBuffer;
}): Promise<void> {
  const outcome = parseFontBytes(record.bytes, record.name);
  if (!outcome.ok) {
    // Corrupt/unparsable record: the only restore failure that deletes data.
    await deleteStoredFont(record.name).catch(() => undefined);
    return;
  }
  const family = disjointName(outcome.parsed.family);
  const face = new FontFace(family, record.bytes, {
    weight: outcome.parsed.weightDescriptor,
  });
  try {
    await withDeadline(face.load(), ASYNC_STEP_TIMEOUT_MS);
  } catch {
    // Transient failure or timeout: keep the record for the next visit; the
    // face was never added, and a late load resolution has no continuation.
    return;
  }
  document.fonts.add(face);
  entries.set(family, {
    name: family,
    weights: outcome.parsed.weights,
    variable: outcome.parsed.variable,
    font: outcome.parsed.font,
    face,
    storageKey: record.name,
    persisted: true,
  });
  markRegistryMutated();
  publish({});
}

/**
 * Startup restore (spec: restoring → restoreDone). Idempotent; call once at
 * app init (no-op on the server). Records restore sequentially in insertion
 * order; every record settles by registration, parse-deletion, or the 5s
 * bound, so restoring always terminates.
 */
export function restoreCustomFonts(): void {
  if (typeof document === "undefined" || restoreStarted) return;
  restoreStarted = true;
  void (async () => {
    const records = await getAllStoredFonts();
    const ordered = records.toSorted((a, b) => a.addedAt - b.addedAt);
    await ordered.reduce(
      (prior, record) => prior.then(() => restoreOne(record)),
      Promise.resolve()
    );
    enterIdle();
  })();
}

/** useSyncExternalStore subscribe. */
export function subscribeCustomFonts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** useSyncExternalStore snapshot (stable identity between changes). */
export function getCustomFontsSnapshot(): CustomFontsSnapshot {
  return snapshot;
}

/** SSR snapshot: the machine starts in restoring with nothing registered. */
export function getServerCustomFontsSnapshot(): CustomFontsSnapshot {
  return EMPTY_SNAPSHOT;
}

/**
 * Registry mutation counter (register / replace / remove / restore). A render
 * input for layouts that must recompute when a same-name swap changes the
 * rendered faces without changing family, weight, or text.
 */
export function getCustomFontsGeneration(): number {
  return generation;
}

/** Registry membership — the single authority for selectability (spec). */
export function isCustomFamily(name: string): boolean {
  return entries.has(name);
}

/** Weight menu for a custom family (event sites enforce validity with this). */
export function customWeightsOf(name: string): readonly number[] | undefined {
  return entries.get(name)?.weights;
}

/** Parsed font for SVG outlining (undefined for built-ins). */
export function getCustomFontForExport(
  name: string
): { font: OtFont; variable: boolean } | undefined {
  const entry = entries.get(name);
  return entry ? { font: entry.font, variable: entry.variable } : undefined;
}
