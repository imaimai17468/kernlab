import { MS } from "./constants";
import { buildFontsHref } from "./fonts";

// Module-level font-readiness store, read via useSyncExternalStore in the hook.
// Loading is triggered procedurally (once at module init for the default font,
// and from the control event handlers when the user picks a font) — not from an
// effect. "Settled" means a load attempt finished, successfully or not: after a
// failed load the tool measures fallback metrics rather than blocking forever,
// matching the previous behavior.

const settled = new Set<string>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

export const FONTS_LINK_ID = "kernlab-fonts";

const specOf = (family: string, weight: number): string =>
  `${weight} ${MS}px "${family}"`;

const canUseFonts = (): boolean =>
  typeof document !== "undefined" && "fonts" in document;

// Settle outcome per injected link. The link's load/error events fire exactly
// once, so the listeners must be attached at injection time (before the fetch
// can complete) and the resulting promise memoized — a listener attached on a
// later loadFont call could wait on an event that already fired and hang.
const stylesheetOutcomes = new WeakMap<HTMLLinkElement, Promise<void>>();

/** Inject the Google Fonts stylesheet once (no-op on the server). */
export function injectFontsStylesheet(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONTS_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONTS_LINK_ID;
  link.rel = "stylesheet";
  link.href = buildFontsHref();
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
 * Resolves once the injected stylesheet has loaded or failed (or the bounded
 * timeout elapses). Calling `document.fonts.load()` before the external
 * stylesheet's `@font-face` rules are parsed matches nothing and resolves
 * prematurely (CSS Font Loading L3) — on a cold cache that made the tool
 * measure and cache fallback-font glyphs (wrong font + wrong negative-space
 * overlay until a reload). Success (`load`) and failure (`error`) both resolve
 * the memoized outcome, so the degraded fallback-metrics path still settles;
 * an absent or foreign link never blocks.
 */
function stylesheetSettled(): Promise<void> {
  const link = document.getElementById(FONTS_LINK_ID);
  if (!(link instanceof HTMLLinkElement) || link.sheet) {
    return Promise.resolve();
  }
  const outcome = stylesheetOutcomes.get(link);
  return outcome
    ? settleWithin(outcome, STYLESHEET_SETTLE_TIMEOUT_MS)
    : Promise.resolve();
}

/** Start loading a font spec (idempotent; safe to call from any event handler). */
export function loadFont(family: string, weight: number): void {
  if (!canUseFonts()) return;
  const spec = specOf(family, weight);
  if (settled.has(spec) || pending.has(spec)) return;
  pending.add(spec);
  void stylesheetSettled()
    .then(() => document.fonts.load(spec))
    .then(() => document.fonts.ready)
    .catch(() => {
      // Deliberately settle on failure (blocked Google Fonts, bad family name,
      // offline): the tool degrades to fallback-font metrics instead of showing
      // the loading overlay forever. The project bans console output and has no
      // telemetry sink, so the degraded rendering itself is the visible signal.
      return undefined;
    })
    .then(() => {
      pending.delete(spec);
      settled.add(spec);
      listeners.forEach((notify) => notify());
    });
}

/** useSyncExternalStore subscribe. */
export function subscribeFonts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** useSyncExternalStore snapshot: has a load attempt for this spec finished? */
export function isFontSettled(family: string, weight: number): boolean {
  return settled.has(specOf(family, weight));
}
