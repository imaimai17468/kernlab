// Local Font Access API (Chromium 103+; not in lib.dom yet). Only the surface
// KERN LAB uses. Feature-detected via "queryLocalFonts" in window — browsers
// without it never render the installed-font picker (spec R4).
type LocalFontData = {
  readonly family: string;
  readonly fullName: string;
  readonly postscriptName: string;
  readonly style: string;
  blob(): Promise<Blob>;
};

interface Window {
  queryLocalFonts?: () => Promise<LocalFontData[]>;
}
