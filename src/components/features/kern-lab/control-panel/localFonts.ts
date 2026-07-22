// Local Font Access helpers shared by FontIntake (which runs the query inside
// the click handler — the permission prompt needs the gesture's transient
// activation) and LocalFontPicker (which renders the result).

export type LocalFontPickerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; families: readonly LocalFontData[] };

/** One representative FontData per family (Regular style when available). */
export function dedupeByFamily(
  fonts: readonly LocalFontData[]
): LocalFontData[] {
  const byFamily = new Map<string, LocalFontData>();
  fonts.forEach((font) => {
    const kept = byFamily.get(font.family);
    if (!kept || (kept.style !== "Regular" && font.style === "Regular")) {
      byFamily.set(font.family, font);
    }
  });
  return Array.from(byFamily.values()).toSorted((a, b) =>
    a.family.localeCompare(b.family, "ja")
  );
}
