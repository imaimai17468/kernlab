import { afterEach, describe, expect, it, vi } from "vitest";
import {
  injectFontsStylesheet,
  isFontSettled,
  loadFont,
  subscribeFonts,
} from "./fontLoader";

// jsdom does not implement document.fonts; install a minimal FontFaceSet mock
// so the loader's browser path is exercised. The settled/pending sets are
// module singletons, so every test uses a distinct family name.
function installFontsMock(load = vi.fn().mockResolvedValue([])) {
  Object.defineProperty(document, "fonts", {
    value: { load, ready: Promise.resolve() },
    configurable: true,
  });
  return load;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  Reflect.deleteProperty(document, "fonts");
  document.getElementById("kernlab-fonts")?.remove();
  vi.restoreAllMocks();
});

describe("loadFont", () => {
  it("should mark the spec settled when the load resolves", async () => {
    installFontsMock();
    loadFont("Test Resolve", 400);
    await flush();
    expect(isFontSettled("Test Resolve", 400)).toBe(true);
  });

  it("should mark the spec settled when the load rejects", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    installFontsMock(vi.fn().mockRejectedValue(new Error("blocked")));
    loadFont("Test Reject", 400);
    await flush();
    expect(isFontSettled("Test Reject", 400)).toBe(true);
  });

  it("should not start a second load when the spec is still pending", () => {
    const load = installFontsMock(
      vi.fn().mockReturnValue(new Promise(() => undefined))
    );
    loadFont("Test Pending", 400);
    loadFont("Test Pending", 400);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("should not start another load when the spec has already settled", async () => {
    const load = installFontsMock();
    loadFont("Test Settled", 400);
    await flush();
    loadFont("Test Settled", 400);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("should be a no-op when document.fonts is unavailable", () => {
    Reflect.deleteProperty(document, "fonts");
    loadFont("Test NoFonts", 400);
    expect(isFontSettled("Test NoFonts", 400)).toBe(false);
  });
});

describe("isFontSettled", () => {
  it("should report false when no load was attempted for the spec", () => {
    expect(isFontSettled("Test Never Loaded", 400)).toBe(false);
  });

  it("should distinguish weights when only one weight has settled", async () => {
    installFontsMock();
    loadFont("Test Weights", 400);
    await flush();
    expect(isFontSettled("Test Weights", 700)).toBe(false);
  });
});

describe("subscribeFonts", () => {
  it("should notify the listener when a spec settles", async () => {
    installFontsMock();
    const listener = vi.fn();
    const unsubscribe = subscribeFonts(listener);
    loadFont("Test Notify", 400);
    await flush();
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should stop notifying when the listener unsubscribes", async () => {
    installFontsMock();
    const listener = vi.fn();
    subscribeFonts(listener)();
    loadFont("Test Unsubscribed", 400);
    await flush();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("injectFontsStylesheet", () => {
  it("should inject the stylesheet link only once when called twice", () => {
    injectFontsStylesheet();
    injectFontsStylesheet();
    expect(document.querySelectorAll("#kernlab-fonts")).toHaveLength(1);
  });
});
