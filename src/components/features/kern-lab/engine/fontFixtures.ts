import { Font, Glyph, Path } from "opentype.js";

// Test fixture: synthesize a minimal real TTF in memory (opentype.js is both
// the writer and the parser under test). Imported by engine test files only —
// never by production code.

/** A valid single-glyph TTF carrying the given family name. */
export function makeFontBytes(familyName: string): ArrayBuffer {
  const notdef = new Glyph({
    name: ".notdef",
    advanceWidth: 650,
    path: new Path(),
  });
  const aPath = new Path();
  aPath.moveTo(100, 0);
  aPath.lineTo(100, 700);
  aPath.lineTo(500, 700);
  aPath.lineTo(500, 0);
  aPath.close();
  const aGlyph = new Glyph({
    name: "A",
    unicode: 65,
    advanceWidth: 650,
    path: aPath,
  });
  const font = new Font({
    familyName,
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: [notdef, aGlyph],
  });
  return font.toArrayBuffer();
}
