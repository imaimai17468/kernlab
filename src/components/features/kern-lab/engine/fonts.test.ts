import { describe, expect, it } from "vitest";
import {
  famCssParam,
  fontByName,
  fontHref,
  singleFontCss,
  UI_FONT,
} from "./fonts";

describe("famCssParam", () => {
  it("should omit the weight axis when the family has only weight 400", () => {
    expect(famCssParam({ name: "Anton", weights: [400], note: "x" })).toBe(
      "family=Anton"
    );
  });

  it("should encode spaces and join weights when the family has multiple weights", () => {
    expect(
      famCssParam({ name: "Space Grotesk", weights: [500, 700], note: "x" })
    ).toBe("family=Space+Grotesk:wght@500;700");
  });

  it("should keep the weight axis when the family has a single non-400 weight", () => {
    expect(famCssParam({ name: "Foo", weights: [900], note: "x" })).toBe(
      "family=Foo:wght@900"
    );
  });
});

describe("fontHref", () => {
  it("should build a css2 url with display swap when given a family", () => {
    expect(
      fontHref({ name: "Noto Sans JP", weights: [400, 700], note: "x" })
    ).toBe(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap"
    );
  });

  it("should cover both UI weights when given the UI font", () => {
    expect(fontHref(UI_FONT)).toContain("family=Space+Mono:wght@400;700");
  });
});

describe("fontByName", () => {
  it("should return the tool font entry when the family is in the menu", () => {
    expect(fontByName("Anton")?.weights).toEqual([400]);
  });

  it("should return undefined when the family is unknown", () => {
    expect(fontByName("Nonexistent Family")).toBeUndefined();
  });
});

describe("singleFontCss", () => {
  it("should build a family+weight url with + for spaces when given a spaced family", () => {
    expect(singleFontCss("Playfair Display", 700)).toBe(
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap"
    );
  });
});
