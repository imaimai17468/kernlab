import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CustomFont } from "./customFonts";
import {
  addFontIntakes,
  customWeightsOf,
  dismissCustomFontError,
  dismissCustomFontNotice,
  getCustomFontsGeneration,
  getCustomFontsSnapshot,
  intakeItemsOf,
  isCustomFamily,
  removeCustomFont,
  restoreCustomFonts,
} from "./customFonts";
import { makeFontBytes } from "./fontFixtures";
import { getAllStoredFonts, putStoredFont } from "./fontStorage";
import { clearGlyphCache } from "./kerning";

// The registry drops kerning's memoized glyph measurements on every mutation;
// mock the module to observe the calls (jsdom cannot run the real measurer).
vi.mock("./kerning", () => ({ clearGlyphCache: vi.fn() }));

// The registry and machine are module singletons (by design — same pattern as
// fontLoader), so tests share state: every test uses distinct family names,
// and the once-only restore is exercised first via seeded IndexedDB records.

const failingFamilies = new Set<string>();

class FontFaceMock {
  readonly family: string;
  constructor(
    family: string,
    _source: ArrayBuffer,
    _desc?: { weight?: string }
  ) {
    this.family = family;
  }
  load(): Promise<FontFaceMock> {
    return failingFamilies.has(this.family)
      ? Promise.reject(new Error("load fail"))
      : Promise.resolve(this);
  }
}

const bytesOf = (item: { readBytes: () => Promise<ArrayBuffer> }) =>
  item.readBytes();

const intakeOf = (family: string) => ({
  readBytes: () => Promise.resolve(makeFontBytes(family)),
  fallbackName: family,
});

const idle = () =>
  vi.waitFor(() => {
    const { phase } = getCustomFontsSnapshot();
    if (phase !== "idle" && phase !== "errored") throw new Error(phase);
  });

const registered = (name: string) =>
  getCustomFontsSnapshot().fonts.some((f) => f.name === name);

beforeAll(async () => {
  vi.stubGlobal("FontFace", FontFaceMock);
  Object.defineProperty(document, "fonts", {
    value: { add: vi.fn(), delete: vi.fn() },
    configurable: true,
  });
  // Seed records BEFORE the once-only restore runs: one valid, one corrupt.
  await putStoredFont({
    name: "Restored Fam",
    bytes: makeFontBytes("Restored Fam"),
    addedAt: 1,
  });
  await putStoredFont({
    name: "Corrupt Fam",
    bytes: new TextEncoder().encode("garbage").buffer,
    addedAt: 2,
  });
  restoreCustomFonts();
  await idle();
});

describe("restoreCustomFonts", () => {
  it("should register the stored font when its record parses", () => {
    expect(registered("Restored Fam")).toBe(true);
  });

  it("should delete the corrupt record when restore cannot parse it", async () => {
    const all = await getAllStoredFonts();
    expect(all.some((r) => r.name === "Corrupt Fam")).toBe(false);
  });

  it("should reach idle when every record has settled", () => {
    expect(getCustomFontsSnapshot().phase).toBe("idle");
  });
});

describe("addFontIntakes", () => {
  it("should register the font when the bytes are valid", async () => {
    addFontIntakes([intakeOf("Upload Fam")]);
    await idle();
    expect(registered("Upload Fam")).toBe(true);
  });

  it("should persist the font when registration succeeds", async () => {
    addFontIntakes([intakeOf("Persist Fam")]);
    await idle();
    const all = await getAllStoredFonts();
    expect(all.some((r) => r.name === "Persist Fam")).toBe(true);
  });

  it("should suffix the family name when it collides with a built-in", async () => {
    addFontIntakes([intakeOf("Anton")]);
    await idle();
    expect(registered("Anton（カスタム）")).toBe(true);
  });

  it("should enter errored when the bytes are not a font", async () => {
    addFontIntakes([
      {
        readBytes: () =>
          Promise.resolve(new TextEncoder().encode("junk").buffer),
        fallbackName: "Junk",
      },
    ]);
    await idle();
    expect(getCustomFontsSnapshot().phase).toBe("errored");
  });

  it("should drain the queued file when the error is dismissed", async () => {
    addFontIntakes([intakeOf("Queued Fam")]);
    dismissCustomFontError();
    await idle();
    expect(registered("Queued Fam")).toBe(true);
  });

  it("should register every file when several are added at once", async () => {
    addFontIntakes([intakeOf("Batch One"), intakeOf("Batch Two")]);
    await idle();
    expect(registered("Batch One") && registered("Batch Two")).toBe(true);
  });

  it("should keep a single entry when the same family is re-added", async () => {
    addFontIntakes([intakeOf("Replace Fam")]);
    await idle();
    addFontIntakes([intakeOf("Replace Fam")]);
    await idle();
    const count = getCustomFontsSnapshot().fonts.filter(
      (f) => f.name === "Replace Fam"
    ).length;
    expect(count).toBe(1);
  });

  it("should enter errored without residue when the FontFace load rejects", async () => {
    failingFamilies.add("Fail Fam");
    addFontIntakes([intakeOf("Fail Fam")]);
    await idle();
    dismissCustomFontError();
    expect(registered("Fail Fam")).toBe(false);
  });

  it("should notify the event site when a font registers", async () => {
    const onRegistered = vi.fn<(font: CustomFont) => void>();
    addFontIntakes([intakeOf("Callback Fam")], onRegistered);
    await idle();
    expect(onRegistered.mock.calls.at(0)?.at(0)?.name).toBe("Callback Fam");
  });

  it("should show a session-only notice when persistence fails", async () => {
    const saved = indexedDB;
    Reflect.deleteProperty(globalThis, "indexedDB");
    addFontIntakes([intakeOf("Session Fam")]);
    await idle();
    vi.stubGlobal("indexedDB", saved);
    expect(
      getCustomFontsSnapshot().notices.some((n) =>
        n.message.includes("Session Fam")
      )
    ).toBe(true);
  });

  it("should keep the font usable when persistence fails", () => {
    expect(registered("Session Fam")).toBe(true);
  });

  it("should clear the notice when it is dismissed", () => {
    const notice = getCustomFontsSnapshot().notices.at(0);
    dismissCustomFontNotice(notice ? notice.id : -1);
    expect(getCustomFontsSnapshot().notices).toHaveLength(0);
  });
});

describe("removeCustomFont", () => {
  it("should remove the font when removal succeeds", async () => {
    addFontIntakes([intakeOf("Remove Fam")]);
    await idle();
    await removeCustomFont("Remove Fam");
    expect(registered("Remove Fam")).toBe(false);
  });

  it("should delete the stored record when removal succeeds", async () => {
    addFontIntakes([intakeOf("Remove Record")]);
    await idle();
    await removeCustomFont("Remove Record");
    const all = await getAllStoredFonts();
    expect(all.some((r) => r.name === "Remove Record")).toBe(false);
  });

  it("should report removed false when the family is unknown", async () => {
    const result = await removeCustomFont("Never Added");
    expect(result.removed).toBe(false);
  });

  it("should keep everything intact when the record delete fails", async () => {
    addFontIntakes([intakeOf("Undeletable Fam")]);
    await idle();
    const saved = indexedDB;
    Reflect.deleteProperty(globalThis, "indexedDB");
    const result = await removeCustomFont("Undeletable Fam");
    vi.stubGlobal("indexedDB", saved);
    expect(!result.removed && registered("Undeletable Fam")).toBe(true);
  });

  it("should remove a session-only font when it has no stored record", async () => {
    const saved = indexedDB;
    Reflect.deleteProperty(globalThis, "indexedDB");
    addFontIntakes([intakeOf("Session Remove")]);
    await idle();
    const result = await removeCustomFont("Session Remove");
    vi.stubGlobal("indexedDB", saved);
    expect(result.removed).toBe(true);
  });
});

describe("registry getters", () => {
  it("should report isCustomFamily true when the family is registered", async () => {
    addFontIntakes([intakeOf("Getter Fam")]);
    await idle();
    expect(isCustomFamily("Getter Fam")).toBe(true);
  });

  it("should expose the family weights when registered", () => {
    expect(customWeightsOf("Getter Fam")).toEqual([500]);
  });
});

describe("registry generation", () => {
  it("should advance the generation when a font registers", async () => {
    const before = getCustomFontsGeneration();
    addFontIntakes([intakeOf("Gen Register")]);
    await idle();
    expect(getCustomFontsGeneration()).toBe(before + 1);
  });

  it("should advance the generation when a font is removed", async () => {
    addFontIntakes([intakeOf("Gen Remove")]);
    await idle();
    const before = getCustomFontsGeneration();
    await removeCustomFont("Gen Remove");
    expect(getCustomFontsGeneration()).toBe(before + 1);
  });

  it("should clear the glyph cache when the registry mutates", async () => {
    const calls = vi.mocked(clearGlyphCache).mock.calls.length;
    addFontIntakes([intakeOf("Gen Cache")]);
    await idle();
    expect(vi.mocked(clearGlyphCache).mock.calls.length).toBe(calls + 1);
  });
});

describe("intakeItemsOf", () => {
  it("should strip the extension when deriving the fallback name", () => {
    const file = new File([new Uint8Array(4)], "MyFont.ttf");
    expect(intakeItemsOf([file])[0].fallbackName).toBe("MyFont");
  });

  it("should read the file bytes when the intake item is consumed", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "Bytes.otf");
    const bytes = await bytesOf(intakeItemsOf([file])[0]);
    expect(new Uint8Array(bytes)).toEqual(new Uint8Array([1, 2, 3]));
  });
});
