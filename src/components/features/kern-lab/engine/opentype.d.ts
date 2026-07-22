// opentype.js 2.0 ships no type definitions. This declares only the surface
// KERN LAB uses, verified empirically against the installed 2.0.0 build
// (names groups, tables.os2/fvar, getPath/toPathData, and the Font/Glyph/Path
// writer used to synthesize test fixtures).
declare module "opentype.js" {
  export type LocalizedName = Readonly<Record<string, string>>;

  export type NameGroup = {
    readonly preferredFamily?: LocalizedName;
    readonly fontFamily?: LocalizedName;
  };

  export type FvarAxis = {
    readonly tag: string;
    readonly minValue: number;
    readonly maxValue: number;
    readonly defaultValue: number;
  };

  export type FontTables = {
    readonly os2?: { readonly usWeightClass?: number };
    readonly fvar?: { readonly axes: readonly FvarAxis[] };
  };

  export class Path {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    close(): void;
    toPathData(decimalPlaces?: number): string;
  }

  export type GlyphOptions = {
    name: string;
    unicode?: number;
    advanceWidth: number;
    path: Path;
  };

  export class Glyph {
    constructor(options: GlyphOptions);
    readonly name: string;
  }

  export type FontConstructorOptions = {
    familyName: string;
    styleName: string;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    glyphs: readonly Glyph[];
  };

  export class Font {
    constructor(options: FontConstructorOptions);
    readonly names: {
      readonly windows?: NameGroup;
      readonly macintosh?: NameGroup;
    };
    readonly tables: FontTables;
    readonly unitsPerEm: number;
    getPath(
      text: string,
      x: number,
      y: number,
      fontSize: number,
      options?: { kerning?: boolean }
    ): Path;
    toArrayBuffer(): ArrayBuffer;
  }

  export function parse(buffer: ArrayBuffer): Font;
}
