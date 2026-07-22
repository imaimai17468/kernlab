import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  deleteStoredFont,
  getAllStoredFonts,
  putStoredFont,
} from "./fontStorage";

// fake-indexeddb/auto installs a working IndexedDB into the jsdom global, so
// these run against the real request/transaction flow. Records share one DB;
// every test uses a distinct record name.

const bytesOf = (s: string): ArrayBuffer => new TextEncoder().encode(s).buffer;

describe("putStoredFont", () => {
  it("should round-trip a record when read back with getAllStoredFonts", async () => {
    await putStoredFont({ name: "RT", bytes: bytesOf("rt"), addedAt: 1 });
    const all = await getAllStoredFonts();
    expect(all.some((r) => r.name === "RT")).toBe(true);
  });

  it("should overwrite the record when the name already exists", async () => {
    await putStoredFont({ name: "OW", bytes: bytesOf("v1"), addedAt: 1 });
    await putStoredFont({ name: "OW", bytes: bytesOf("v2"), addedAt: 2 });
    const all = await getAllStoredFonts();
    expect(all.filter((r) => r.name === "OW")).toHaveLength(1);
  });

  it("should keep the replacement bytes when the name already exists", async () => {
    await putStoredFont({ name: "OW2", bytes: bytesOf("v1"), addedAt: 1 });
    await putStoredFont({ name: "OW2", bytes: bytesOf("v2"), addedAt: 2 });
    const all = await getAllStoredFonts();
    const record = all.find((r) => r.name === "OW2");
    expect(new TextDecoder().decode(record?.bytes)).toBe("v2");
  });
});

describe("deleteStoredFont", () => {
  it("should remove the record when it exists", async () => {
    await putStoredFont({ name: "DEL", bytes: bytesOf("x"), addedAt: 1 });
    await deleteStoredFont("DEL");
    const all = await getAllStoredFonts();
    expect(all.some((r) => r.name === "DEL")).toBe(false);
  });

  it("should resolve when no record exists for the name", async () => {
    await expect(deleteStoredFont("NEVER-STORED")).resolves.toBeUndefined();
  });
});
