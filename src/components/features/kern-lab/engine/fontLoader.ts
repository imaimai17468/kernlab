import { MS } from "./constants";
import type { Font } from "./types";
import { fontByName, fontHref, UI_FONT } from "./fonts";

// Module-level font-readiness store, read via useSyncExternalStore in the hook.
// Loading is triggered procedurally (once at module init for the default font
// and text, and from the control event handlers when the user picks a font or
// edits the text) — not from an effect.
//
// Stylesheets are injected one link per family, on demand from loadFont: a
// combined all-family stylesheet costs ~458 KB gzipped (see fontHref), so a
// family's @font-face rules are only fetched once the user actually needs it.
//
// Readiness is tracked per (spec, character), not per spec: Google Fonts
// serves large families (all the Japanese ones) as many unicode-range subset
// faces, and `document.fonts.load(spec)` without text only fetches the faces
// intersecting a space character. Measuring a glyph whose subset has not
// loaded yet would cache fallback-font metrics permanently (the cold-cache bug
// again, per glyph). "Covered" means a load attempt for that character
// finished, successfully or not: after a failed load the tool measures
// fallback metrics rather than blocking forever.

const covered = new Map<string, Set<string>>();
const pending = new Map<string, Set<string>>();
const listeners = new Set<() => void>();

const specOf = (family: string, weight: number): string =>
  `${weight} ${MS}px "${family}"`;

const canUseFonts = (): boolean =>
  typeof document !== "undefined" && "fonts" in document;

/** DOM id of the injected stylesheet link for one family. */
export function fontLinkId(family: string): string {
  return `kernlab-font-${family.toLowerCase().replace(/ /g, "-")}`;
}

// Settle outcome per injected link. The link's load/error events fire exactly
// once, so the listeners must be attached at injection time (before the fetch
// can complete) and the resulting promise memoized — a listener attached on a
// later loadFont call could wait on an event that already fired and hang.
const stylesheetOutcomes = new WeakMap<HTMLLinkElement, Promise<void>>();

/**
 * Inject one family's stylesheet link (idempotent; returns the live link).
 * A foreign non-link element occupying the id returns null — injecting anyway
 * would duplicate the link (and its fetch) on every later call, since
 * getElementById would keep resolving to the foreign element. Callers treat
 * null as "no gate": measure immediately with whatever the page provides.
 */
function ensureFamilyStylesheet(font: Font): HTMLLinkElement | null {
  const id = fontLinkId(font.name);
  const existing = document.getElementById(id);
  if (existing) {
    return existing instanceof HTMLLinkElement ? existing : null;
  }
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = fontHref(font);
  stylesheetOutcomes.set(
    link,
    new Promise((resolve) => {
      const done = () => {
        link.removeEventListener("load", done);
        link.removeEventListener("error", done);
        resolve();
      };
      link.addEventListener("load", done);
      link.addEventListener("error", done);
    })
  );
  document.head.appendChild(link);
  return link;
}

/** Inject the UI monospace stylesheet once (no-op on the server). */
export function injectUiFontStylesheet(): void {
  if (typeof document === "undefined") return;
  ensureFamilyStylesheet(UI_FONT);
}

// Bounded wait: if the link's load/error never dispatches at all (request
// silently dropped by an intermediary, element removed mid-fetch), degrade to
// measuring after this timeout instead of blocking the tool forever — the
// worst case then equals the pre-fix behavior (fallback metrics until reload).
const STYLESHEET_SETTLE_TIMEOUT_MS = 5000;

function settleWithin(outcome: Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    void outcome.then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Resolves once the family's stylesheet has loaded or failed (or the bounded
 * timeout elapses). Calling `document.fonts.load()` before the external
 * stylesheet's `@font-face` rules are parsed matches nothing and resolves
 * prematurely (CSS Font Loading L3) — on a cold cache that made the tool
 * measure and cache fallback-font glyphs (wrong font + wrong negative-space
 * overlay until a reload). Success (`load`) and failure (`error`) both resolve
 * the memoized outcome, so the degraded fallback-metrics path still settles;
 * a missing link or a foreign link with no memoized outcome never blocks.
 */
function stylesheetSettled(link: HTMLLinkElement | null): Promise<void> {
  if (!link || link.sheet) return Promise.resolve();
  const outcome = stylesheetOutcomes.get(link);
  return outcome
    ? settleWithin(outcome, STYLESHEET_SETTLE_TIMEOUT_MS)
    : Promise.resolve();
}

function markCovered(spec: string, chars: readonly string[]): void {
  const done = covered.get(spec) ?? new Set<string>();
  chars.forEach((ch) => {
    pending.get(spec)?.delete(ch);
    done.add(ch);
  });
  covered.set(spec, done);
  listeners.forEach((notify) => notify());
}

/**
 * Start loading the faces a text needs for a font spec (idempotent; safe to
 * call from any event handler). Injects the family's stylesheet on first use;
 * only characters not yet covered or in flight are requested. When the
 * stylesheet is already parsed and `document.fonts.check` reports every needed
 * face loaded, coverage is marked synchronously — so retyping already-loaded
 * characters never flashes the loading state.
 */
export function loadFont(family: string, weight: number, text: string): void {
  if (!canUseFonts()) return;
  const spec = specOf(family, weight);
  const done = covered.get(spec);
  const inFlight = pending.get(spec) ?? new Set<string>();
  const chars = Array.from(new Set(text)).filter(
    (ch) => !(done?.has(ch) || inFlight.has(ch))
  );
  if (chars.length === 0) return;
  // Unknown families (nothing to fetch) still go through the same flow with
  // just the requested weight — they settle to fallback metrics.
  const font = fontByName(family) ?? {
    name: family,
    weights: [weight],
    note: "",
  };
  const link = ensureFamilyStylesheet(font);
  const batch = chars.join("");
  if (link?.sheet && document.fonts.check(spec, batch)) {
    markCovered(spec, chars);
    return;
  }
  chars.forEach((ch) => inFlight.add(ch));
  pending.set(spec, inFlight);
  void stylesheetSettled(link)
    .then(() => document.fonts.load(spec, batch))
    .then(() => document.fonts.ready)
    .catch(() => {
      // Deliberately settle on failure (blocked Google Fonts, bad family name,
      // offline): the tool degrades to fallback-font metrics instead of showing
      // the loading overlay forever. The project bans console output and has no
      // telemetry sink, so the degraded rendering itself is the visible signal.
      return undefined;
    })
    .then(() => {
      markCovered(spec, chars);
    });
}

/** useSyncExternalStore subscribe. */
export function subscribeFonts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * useSyncExternalStore snapshot: has a load attempt finished for every
 * character of this text under this spec? Empty text is trivially settled.
 */
export function isFontSettled(
  family: string,
  weight: number,
  text: string
): boolean {
  const done = covered.get(specOf(family, weight));
  return Array.from(new Set(text)).every(
    (ch) => done !== undefined && done.has(ch)
  );
}
