// Step-3 diagram: average capped gap is monotone in the spacing s, so the s
// whose average equals the target is found by bisection (kerning.ts#solveS).
export function SolveDiagram() {
  return (
    <svg
      viewBox="0 0 320 190"
      role="img"
      aria-label="間隔sを横軸、平均白量を縦軸にとった単調増加の曲線が目標値と交わる点を、二分探索で挟み込んで求める図"
      className="block w-full"
    >
      {/* axes */}
      <line
        x1="42"
        y1="150"
        x2="292"
        y2="150"
        className="stroke-kl-ink"
        strokeWidth="1"
      />
      <polygon points="292,150 284,146.5 284,153.5" className="fill-kl-ink" />
      <line
        x1="42"
        y1="150"
        x2="42"
        y2="26"
        className="stroke-kl-ink"
        strokeWidth="1"
      />
      <polygon points="42,26 38.5,34 45.5,34" className="fill-kl-ink" />
      {/* monotone average-gap curve */}
      <path
        d="M52 138 Q 130 118 168 86 T 280 40"
        fill="none"
        className="stroke-kl-ink"
        strokeWidth="1.5"
      />
      {/* target line and the solved point */}
      <line
        x1="42"
        y1="86"
        x2="292"
        y2="86"
        className="stroke-kl-grey"
        strokeWidth="1"
        strokeDasharray="5 4"
      />
      <circle cx="168" cy="86" r="4.5" className="fill-kl-red" />
      <line
        x1="168"
        y1="86"
        x2="168"
        y2="150"
        className="stroke-kl-red"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      {/* bisection brackets converging on the answer */}
      <g className="stroke-kl-blue" strokeWidth="1.5">
        <line x1="62" y1="166" x2="126" y2="166" />
        <line x1="274" y1="166" x2="210" y2="166" />
      </g>
      <polygon points="126,166 118,162.5 118,169.5" className="fill-kl-blue" />
      <polygon points="210,166 218,162.5 218,169.5" className="fill-kl-blue" />
      <text x="52" y="182" className="fill-kl-blue font-kl-mono text-xs">
        lo
      </text>
      <text x="266" y="182" className="fill-kl-blue font-kl-mono text-xs">
        hi
      </text>
      {/* labels */}
      <text x="50" y="80" className="fill-kl-muted font-kl-mono text-xs">
        target
      </text>
      <text x="282" y="142" className="fill-kl-ink font-kl-mono text-xs">
        s
      </text>
      <text x="52" y="38" className="fill-kl-muted font-kl-mono text-xs">
        平均白量
      </text>
    </svg>
  );
}
