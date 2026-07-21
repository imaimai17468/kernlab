/**
 * `[0, 1, …, n-1]` — functional iteration helper. The project's lint forbids
 * raw `for` loops, so the pixel-scan / solver code iterates over ranges with
 * array methods (forEach / reduce / filter) instead.
 */
export const range = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => i);
