import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fontLinkId,
  injectUiFontStylesheet,
  isFontSettled,
  loadFont,
  subscribeFonts,
} from "./fontLoader";

// Registry stub: families prefixed "Custom " take the loader's custom branch
// (no stylesheet injection, sync-check trust without a parsed sheet).
vi.mock("./customFonts", () => ({
  isCustomFamily: (name: string) => name.startsWith("Custom "),
}));

// jsdom does not implement document.fonts; install a minimal FontFaceSet mock
// so the loader's browser path is exercised. The coverage maps are module
// singletons, so every test uses a distinct family name.
function installFontsMock(
  load = vi.fn().mockResolvedValue([]),
  check = vi.fn().mockReturnValue(false)
) {
  Object.defineProperty(document, "fonts", {
    value: { load, check, ready: Promise.resolve() },
    configurable: true,
  });
  return load;
}

/** Pre-inject a link for the family and mark it as already parsed. */
function installParsedLink(family: string) {
  const link = document.createElement("link");
  link.id = fontLinkId(family);
  Object.defineProperty(link, "sheet", { value: {}, configurable: true });
  document.head.appendChild(link);
}

const familyLink = (family: string) =>
  document.getElementById(fontLinkId(family));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  Reflect.deleteProperty(document, "fonts");
  document
    .querySelectorAll('link[id^="kernlab-font-"]')
    .forEach((link) => link.remove());
  vi.restoreAllMocks();
});

describe("loadFont", () => {
  it("should inject the family stylesheet link when the family is first requested", () => {
    installFontsMock();
    loadFont("Test Inject", 400, "A");
    expect(familyLink("Test Inject")).not.toBeNull();
  });

  it("should inject the family stylesheet link only once when called twice", () => {
    installFontsMock();
    loadFont("Test Inject Once", 400, "A");
    loadFont("Test Inject Once", 400, "B");
    expect(
      document.querySelectorAll(`#${fontLinkId("Test Inject Once")}`)
    ).toHaveLength(1);
  });

  it("should mark the text covered when the load resolves", async () => {
    installFontsMock();
    loadFont("Test Resolve", 400, "AB");
    await flush();
    familyLink("Test Resolve")?.dispatchEvent(new Event("load"));
    await flush();
    expect(isFontSettled("Test Resolve", 400, "AB")).toBe(true);
  });

  it("should mark the text covered when the load rejects", async () => {
    installFontsMock(vi.fn().mockRejectedValue(new Error("blocked")));
    loadFont("Test Reject", 400, "AB");
    familyLink("Test Reject")?.dispatchEvent(new Event("load"));
    await flush();
    expect(isFontSettled("Test Reject", 400, "AB")).toBe(true);
  });

  it("should pass deduplicated characters to document.fonts.load when the text repeats them", async () => {
    const load = installFontsMock();
    loadFont("Test Batch", 400, "AAB");
    familyLink("Test Batch")?.dispatchEvent(new Event("load"));
    await flush();
    expect(load).toHaveBeenCalledWith('400 240px "Test Batch"', "AB");
  });

  it("should not start a second load when the characters are still pending", async () => {
    const load = installFontsMock(
      vi.fn().mockReturnValue(new Promise(() => undefined))
    );
    loadFont("Test Pending", 400, "AB");
    familyLink("Test Pending")?.dispatchEvent(new Event("load"));
    loadFont("Test Pending", 400, "AB");
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("should not start another load when every character is already covered", async () => {
    const load = installFontsMock();
    loadFont("Test Covered", 400, "AB");
    familyLink("Test Covered")?.dispatchEvent(new Event("load"));
    await flush();
    loadFont("Test Covered", 400, "BA");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("should request only the uncovered characters when the text grows", async () => {
    const load = installFontsMock();
    loadFont("Test Grow", 400, "AB");
    familyLink("Test Grow")?.dispatchEvent(new Event("load"));
    await flush();
    loadFont("Test Grow", 400, "ABC");
    await flush();
    expect(load).toHaveBeenLastCalledWith('400 240px "Test Grow"', "C");
  });

  it("should not call load at all when the text is empty", async () => {
    const load = installFontsMock();
    loadFont("Test Empty Load", 400, "");
    await flush();
    expect(load).not.toHaveBeenCalled();
  });

  it("should be a no-op when document.fonts is unavailable", () => {
    Reflect.deleteProperty(document, "fonts");
    loadFont("Test NoFonts", 400, "A");
    expect(isFontSettled("Test NoFonts", 400, "A")).toBe(false);
  });

  it("should cover the text synchronously when the parsed stylesheet already provides its faces", () => {
    installFontsMock(
      vi.fn().mockResolvedValue([]),
      vi.fn().mockReturnValue(true)
    );
    installParsedLink("Test Sync Check");
    loadFont("Test Sync Check", 400, "AB");
    expect(isFontSettled("Test Sync Check", 400, "AB")).toBe(true);
  });

  it("should skip document.fonts.load when the synchronous check covers the text", async () => {
    const load = installFontsMock(
      vi.fn().mockResolvedValue([]),
      vi.fn().mockReturnValue(true)
    );
    installParsedLink("Test Sync Skip");
    loadFont("Test Sync Skip", 400, "AB");
    await flush();
    expect(load).not.toHaveBeenCalled();
  });

  it("should fall back to document.fonts.load when the parsed stylesheet lacks the needed faces", async () => {
    const load = installFontsMock(
      vi.fn().mockResolvedValue([]),
      vi.fn().mockReturnValue(false)
    );
    installParsedLink("Test Check Miss");
    loadFont("Test Check Miss", 400, "AB");
    await flush();
    expect(load).toHaveBeenCalledWith('400 240px "Test Check Miss"', "AB");
  });

  it("should not inject a stylesheet link when a foreign non-link element carries the family id", () => {
    installFontsMock();
    const foreign = document.createElement("div");
    foreign.id = fontLinkId("Test Foreign Div");
    document.body.appendChild(foreign);
    loadFont("Test Foreign Div", 400, "A");
    foreign.remove();
    expect(
      document.querySelectorAll(`link#${fontLinkId("Test Foreign Div")}`)
    ).toHaveLength(0);
  });

  it("should settle without a stylesheet gate when a foreign non-link element carries the family id", async () => {
    installFontsMock();
    const foreign = document.createElement("div");
    foreign.id = fontLinkId("Test Foreign Div Settle");
    document.body.appendChild(foreign);
    loadFont("Test Foreign Div Settle", 400, "A");
    await flush();
    foreign.remove();
    expect(isFontSettled("Test Foreign Div Settle", 400, "A")).toBe(true);
  });

  it("should ignore the synchronous check when the stylesheet is still loading", async () => {
    installFontsMock(
      vi.fn().mockResolvedValue([]),
      vi.fn().mockReturnValue(true)
    );
    loadFont("Test Unparsed Check", 400, "A");
    await flush();
    expect(isFontSettled("Test Unparsed Check", 400, "A")).toBe(false);
    // Drain the gated chain so no pending timer leaks past this test.
    familyLink("Test Unparsed Check")?.dispatchEvent(new Event("load"));
  });

  it("should not settle when the family stylesheet is still loading", async () => {
    installFontsMock();
    loadFont("Test Gate Pending", 400, "A");
    await flush();
    expect(isFontSettled("Test Gate Pending", 400, "A")).toBe(false);
    // Drain the gated chain so no pending promise leaks past this test.
    familyLink("Test Gate Pending")?.dispatchEvent(new Event("load"));
  });

  it("should settle after the stylesheet fires load when it was pending", async () => {
    installFontsMock();
    loadFont("Test Gate Load", 400, "A");
    await flush();
    familyLink("Test Gate Load")?.dispatchEvent(new Event("load"));
    await flush();
    expect(isFontSettled("Test Gate Load", 400, "A")).toBe(true);
  });

  it("should settle after the stylesheet fires error when it was pending", async () => {
    installFontsMock();
    loadFont("Test Gate Error", 400, "A");
    await flush();
    familyLink("Test Gate Error")?.dispatchEvent(new Event("error"));
    await flush();
    expect(isFontSettled("Test Gate Error", 400, "A")).toBe(true);
  });

  it("should settle a later text change when the stylesheet already failed", async () => {
    installFontsMock();
    loadFont("Test After Error", 400, "A");
    familyLink("Test After Error")?.dispatchEvent(new Event("error"));
    await flush();
    loadFont("Test After Error", 400, "B");
    await flush();
    expect(isFontSettled("Test After Error", 400, "AB")).toBe(true);
  });

  it("should settle via the timeout when the stylesheet never fires load or error", async () => {
    vi.useFakeTimers();
    try {
      installFontsMock();
      loadFont("Test Gate Timeout", 400, "A");
      await vi.advanceTimersByTimeAsync(5001);
      expect(isFontSettled("Test Gate Timeout", 400, "A")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("should settle without waiting when the stylesheet is already parsed", async () => {
    installFontsMock();
    installParsedLink("Test Sheet Ready");
    loadFont("Test Sheet Ready", 400, "A");
    await flush();
    expect(isFontSettled("Test Sheet Ready", 400, "A")).toBe(true);
  });

  it("should not inject a stylesheet link when the family is custom", () => {
    installFontsMock();
    loadFont("Custom NoLink", 400, "A");
    expect(familyLink("Custom NoLink")).toBeNull();
  });

  it("should cover the text synchronously when the custom face is already loaded", () => {
    installFontsMock(
      vi.fn().mockResolvedValue([]),
      vi.fn().mockReturnValue(true)
    );
    loadFont("Custom Sync", 400, "AB");
    expect(isFontSettled("Custom Sync", 400, "AB")).toBe(true);
  });

  it("should settle a custom family through document.fonts.load when the face is not yet loaded", async () => {
    installFontsMock();
    loadFont("Custom Async", 400, "A");
    await flush();
    expect(isFontSettled("Custom Async", 400, "A")).toBe(true);
  });

  it("should settle without stylesheet events when a foreign link carries the family id", async () => {
    installFontsMock();
    const foreign = document.createElement("link");
    foreign.id = fontLinkId("Test Foreign Link");
    document.head.appendChild(foreign);
    loadFont("Test Foreign Link", 400, "A");
    await flush();
    expect(isFontSettled("Test Foreign Link", 400, "A")).toBe(true);
  });
});

describe("isFontSettled", () => {
  it("should report false when no load was attempted for the spec", () => {
    expect(isFontSettled("Test Never Loaded", 400, "A")).toBe(false);
  });

  it("should report true when the text is empty", () => {
    expect(isFontSettled("Test Empty Text", 400, "")).toBe(true);
  });

  it("should report false when only part of the text has been covered", async () => {
    installFontsMock();
    loadFont("Test Partial", 400, "A");
    familyLink("Test Partial")?.dispatchEvent(new Event("load"));
    await flush();
    expect(isFontSettled("Test Partial", 400, "AB")).toBe(false);
  });

  it("should distinguish weights when only one weight has settled", async () => {
    installFontsMock();
    loadFont("Test Weights", 400, "A");
    familyLink("Test Weights")?.dispatchEvent(new Event("load"));
    await flush();
    expect(isFontSettled("Test Weights", 700, "A")).toBe(false);
  });
});

describe("subscribeFonts", () => {
  it("should notify the listener when a batch settles", async () => {
    installFontsMock();
    const listener = vi.fn();
    const unsubscribe = subscribeFonts(listener);
    loadFont("Test Notify", 400, "A");
    familyLink("Test Notify")?.dispatchEvent(new Event("load"));
    await flush();
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should stop notifying when the listener unsubscribes", async () => {
    installFontsMock();
    const listener = vi.fn();
    subscribeFonts(listener)();
    loadFont("Test Unsubscribed", 400, "A");
    familyLink("Test Unsubscribed")?.dispatchEvent(new Event("load"));
    await flush();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("injectUiFontStylesheet", () => {
  it("should inject the Space Mono link only once when called twice", () => {
    injectUiFontStylesheet();
    injectUiFontStylesheet();
    expect(
      document.querySelectorAll(`#${fontLinkId("Space Mono")}`)
    ).toHaveLength(1);
  });
});
