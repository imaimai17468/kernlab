// Step-4 diagram: the frame padding is generated proportionally from the ink
// height, and the whole composition is centered on the ink box's optical
// center (computeLayout's pad + renderToContext's fit/centering).
export function FrameDiagram() {
  return (
    <svg
      viewBox="0 0 320 190"
      role="img"
      aria-label="字面のボックスの高さから比率で上下左右の余白を生成し、字面の中心を額縁の光学中央に合わせる図"
      className="block w-full"
    >
      {/* outer frame (the exported artwork bounds) */}
      <rect
        x="70"
        y="27"
        width="180"
        height="136"
        fill="none"
        className="stroke-kl-grey"
        strokeWidth="1"
        strokeDasharray="6 5"
      />
      {/* ink bounding box */}
      <rect
        x="112"
        y="63"
        width="96"
        height="64"
        fill="none"
        className="stroke-kl-ink"
        strokeWidth="1.25"
      />
      {/* abbreviated ink inside the box */}
      <g className="stroke-kl-ink" strokeWidth="10">
        <path d="M136 70 L124 120" />
        <path d="M136 70 L148 120" />
        <path d="M172 70 L184 120" />
        <path d="M196 70 L184 120" />
      </g>
      {/* pad arrows on all four sides */}
      <g className="stroke-kl-blue" strokeWidth="1.25">
        <line x1="160" y1="27" x2="160" y2="63" />
        <line x1="160" y1="127" x2="160" y2="163" />
        <line x1="70" y1="95" x2="112" y2="95" />
        <line x1="208" y1="95" x2="250" y2="95" />
      </g>
      <g className="fill-kl-blue">
        <polygon points="160,27 156.5,35 163.5,35" />
        <polygon points="160,63 156.5,55 163.5,55" />
        <polygon points="160,163 156.5,155 163.5,155" />
        <polygon points="160,127 156.5,135 163.5,135" />
        <polygon points="70,95 78,91.5 78,98.5" />
        <polygon points="112,95 104,91.5 104,98.5" />
        <polygon points="250,95 242,91.5 242,98.5" />
        <polygon points="208,95 216,91.5 216,98.5" />
      </g>
      {/* labels */}
      <text x="168" y="49" className="fill-kl-blue font-kl-mono text-xs">
        pad
      </text>
      <text x="256" y="60" className="fill-kl-muted font-kl-mono text-xs">
        額縁
      </text>
      <line
        x1="252"
        y1="56"
        x2="246"
        y2="46"
        className="stroke-kl-grey"
        strokeWidth="0.75"
      />
      <text x="10" y="136" className="fill-kl-muted font-kl-mono text-xs">
        字面
      </text>
      <line
        x1="30"
        y1="128"
        x2="110"
        y2="122"
        className="stroke-kl-grey"
        strokeWidth="0.75"
      />
    </svg>
  );
}
