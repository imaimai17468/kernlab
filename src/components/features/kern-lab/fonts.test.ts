import { describe, expect, it } from "vitest";
import { FONTS } from "./constants";
import { buildFontsHref, famCssParam, singleFontCss } from "./fonts";

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

describe("buildFontsHref", () => {
  it("should start with the Google Fonts css2 endpoint when built", () => {
    expect(
      buildFontsHref().startsWith("https://fonts.googleapis.com/css2?")
    ).toBe(true);
  });

  it("should include Space Mono when built", () => {
    expect(buildFontsHref()).toContain("family=Space+Mono:wght@400;700");
  });

  it("should end with display=swap when built", () => {
    expect(buildFontsHref().endsWith("&display=swap")).toBe(true);
  });

  it("should include every tool family when built", () => {
    const href = buildFontsHref();
    expect(FONTS.every((f) => href.includes(famCssParam(f)))).toBe(true);
  });
});

describe("singleFontCss", () => {
  it("should build a family+weight url with + for spaces when given a spaced family", () => {
    expect(singleFontCss("Playfair Display", 700)).toBe(
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap"
    );
  });
});
