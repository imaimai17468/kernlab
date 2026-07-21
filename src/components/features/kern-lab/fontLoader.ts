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

const specOf = (family: string, weight: number): string =>
  `${weight} ${MS}px "${family}"`;

const canUseFonts = (): boolean =>
  typeof document !== "undefined" && "fonts" in document;

/** Inject the Google Fonts stylesheet once (no-op on the server). */
export function injectFontsStylesheet(): void {
  if (typeof document === "undefined") return;
  const id = "kernlab-fonts";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = buildFontsHref();
  document.head.appendChild(link);
}

/** Start loading a font spec (idempotent; safe to call from any event handler). */
export function loadFont(family: string, weight: number): void {
  if (!canUseFonts()) return;
  const spec = specOf(family, weight);
  if (settled.has(spec) || pending.has(spec)) return;
  pending.add(spec);
  void document.fonts
    .load(spec)
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
