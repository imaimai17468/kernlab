// Step-1 diagram: one glyph rasterized offscreen, scanned row by row for its
// left/right ink edges (the Lp / Rr profiles in kerning.ts#measureGlyph).
export function MeasureDiagram() {
  return (
    <svg
      viewBox="0 0 320 190"
      role="img"
      aria-label="1文字を計測用キャンバスに描画し、走査行ごとに左右のインク端を検出してエッジプロファイルを作る図"
      className="block w-full"
    >
      {/* measurement raster */}
      <rect
        x="30"
        y="16"
        width="200"
        height="158"
        fill="none"
        className="stroke-kl-ink"
      />
      {/* scan rows */}
      {[46, 70, 94, 118, 142].map((y) => (
        <line
          key={y}
          x1="30"
          y1={y}
          x2="230"
          y2={y}
          className="stroke-kl-grey"
          strokeWidth="0.75"
        />
      ))}
      {/* glyph: a bold A built from two legs and a crossbar */}
      <g className="stroke-kl-ink" strokeWidth="15">
        <path d="M130 30 L86 162" />
        <path d="M130 30 L174 162" />
        <path d="M104 122 L156 122" strokeWidth="12" />
      </g>
      {/* left edge profile (Lp) */}
      <g className="stroke-kl-blue">
        <polyline
          points="119,46 111,70 103,94 96,118 88,142"
          fill="none"
          strokeWidth="1.5"
        />
        {[
          [119, 46],
          [111, 70],
          [103, 94],
          [96, 118],
          [88, 142],
        ].map(([x, y]) => (
          <circle key={y} cx={x} cy={y} r="2.5" className="fill-kl-blue" />
        ))}
      </g>
      {/* right edge profile (Rr) */}
      <g className="stroke-kl-blue">
        <polyline
          points="141,46 149,70 157,94 164,118 172,142"
          fill="none"
          strokeWidth="1.5"
        />
        {[
          [141, 46],
          [149, 70],
          [157, 94],
          [164, 118],
          [172, 142],
        ].map(([x, y]) => (
          <circle key={y} cx={x} cy={y} r="2.5" className="fill-kl-blue" />
        ))}
      </g>
      {/* labels */}
      <text x="242" y="52" className="fill-kl-blue font-kl-mono text-xs">
        インク端
      </text>
      <line
        x1="238"
        y1="55"
        x2="180"
        y2="66"
        className="stroke-kl-grey"
        strokeWidth="0.75"
      />
      <text x="242" y="148" className="fill-kl-muted font-kl-mono text-xs">
        走査行
      </text>
      <line
        x1="232"
        y1="142"
        x2="238"
        y2="144"
        className="stroke-kl-grey"
        strokeWidth="0.75"
      />
    </svg>
  );
}
