import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FONTS_LINK_ID,
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
  document.getElementById(FONTS_LINK_ID)?.remove();
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

  it("should not start a second load when the spec is still pending", async () => {
    const load = installFontsMock(
      vi.fn().mockReturnValue(new Promise(() => undefined))
    );
    loadFont("Test Pending", 400);
    loadFont("Test Pending", 400);
    await flush();
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

  it("should not settle when the injected stylesheet is still loading", async () => {
    installFontsMock();
    injectFontsStylesheet();
    loadFont("Test Gate Pending", 400);
    await flush();
    expect(isFontSettled("Test Gate Pending", 400)).toBe(false);
    // Drain the gated chain so no pending promise leaks past this test.
    document.getElementById(FONTS_LINK_ID)?.dispatchEvent(new Event("load"));
  });

  it("should settle after the stylesheet fires load when it was pending", async () => {
    installFontsMock();
    injectFontsStylesheet();
    loadFont("Test Gate Load", 400);
    await flush();
    document.getElementById(FONTS_LINK_ID)?.dispatchEvent(new Event("load"));
    await flush();
    expect(isFontSettled("Test Gate Load", 400)).toBe(true);
  });

  it("should settle after the stylesheet fires error when it was pending", async () => {
    installFontsMock();
    injectFontsStylesheet();
    loadFont("Test Gate Error", 400);
    await flush();
    document.getElementById(FONTS_LINK_ID)?.dispatchEvent(new Event("error"));
    await flush();
    expect(isFontSettled("Test Gate Error", 400)).toBe(true);
  });

  it("should settle a later font pick when the stylesheet already failed", async () => {
    installFontsMock();
    injectFontsStylesheet();
    document.getElementById(FONTS_LINK_ID)?.dispatchEvent(new Event("error"));
    await flush();
    loadFont("Test After Error", 400);
    await flush();
    expect(isFontSettled("Test After Error", 400)).toBe(true);
  });

  it("should settle via the timeout when the stylesheet never fires load or error", async () => {
    vi.useFakeTimers();
    try {
      installFontsMock();
      injectFontsStylesheet();
      loadFont("Test Gate Timeout", 400);
      await vi.advanceTimersByTimeAsync(5001);
      expect(isFontSettled("Test Gate Timeout", 400)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("should settle without waiting when the stylesheet is already parsed", async () => {
    installFontsMock();
    injectFontsStylesheet();
    const link = document.getElementById(FONTS_LINK_ID);
    if (link) {
      Object.defineProperty(link, "sheet", { value: {}, configurable: true });
    }
    loadFont("Test Sheet Ready", 400);
    await flush();
    expect(isFontSettled("Test Sheet Ready", 400)).toBe(true);
  });

  it("should settle immediately when a foreign link carries the fonts id", async () => {
    installFontsMock();
    const foreign = document.createElement("link");
    foreign.id = FONTS_LINK_ID;
    document.head.appendChild(foreign);
    loadFont("Test Foreign Link", 400);
    await flush();
    expect(isFontSettled("Test Foreign Link", 400)).toBe(true);
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
    expect(document.querySelectorAll(`#${FONTS_LINK_ID}`)).toHaveLength(1);
  });
});
