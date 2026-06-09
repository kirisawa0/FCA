interface Point {
  x: number;
  y: number;
  label: string;
  value: number;
}

interface Series {
  label: string;
  color: string;
  points: Point[];
}

interface Props {
  series: Series[];
  minY?: number;
  maxY?: number;
  height?: number;
  yLabel?: string;
}

export function LineChart({ series, minY = 0, maxY = 10, height = 200, yLabel }: Props) {
  const W = 560;
  const H = height;
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  function toSVG(x: number, y: number) {
    const px = PAD.left + x * plotW;
    const py = PAD.top + (1 - (y - minY) / (maxY - minY)) * plotH;
    return { px, py };
  }

  const yTicks = 5;
  const yStep = (maxY - minY) / yTicks;

  const allXLabels = series[0]?.points.map((p) => p.label) ?? [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      <defs>
        {series.map((s, si) => (
          <linearGradient key={si} id={`lc-fill-${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* Grille */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const yVal = minY + i * yStep;
        const { py } = toSVG(0, yVal);
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={py}
              x2={W - PAD.right}
              y2={py}
              stroke="#2a2a36"
              strokeWidth="1"
            />
            <text x={PAD.left - 6} y={py + 4} textAnchor="end" fontSize="9" fill="#52525b">
              {yVal % 1 === 0 ? yVal : yVal.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Label axe Y */}
      {yLabel && (
        <text
          x={8}
          y={H / 2}
          textAnchor="middle"
          fontSize="9"
          fill="#52525b"
          transform={`rotate(-90, 8, ${H / 2})`}
        >
          {yLabel}
        </text>
      )}

      {/* Labels axe X */}
      {allXLabels.map((label, i) => {
        const xRatio = allXLabels.length > 1 ? i / (allXLabels.length - 1) : 0.5;
        const { px } = toSVG(xRatio, minY);
        const show = allXLabels.length <= 8 || i % Math.ceil(allXLabels.length / 8) === 0 || i === allXLabels.length - 1;
        return show ? (
          <text key={i} x={px} y={H - 4} textAnchor="middle" fontSize="9" fill="#52525b">
            {label}
          </text>
        ) : null;
      })}

      {/* Séries */}
      {series.map((s, si) => {
        if (s.points.length === 0) return null;
        const pts = s.points.map((p, i) => {
          const xRatio = s.points.length > 1 ? i / (s.points.length - 1) : 0.5;
          return toSVG(xRatio, p.value);
        });

        const linePath = pts
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`)
          .join(' ');

        const fillPath =
          `${linePath} L${pts[pts.length - 1].px},${PAD.top + plotH} L${pts[0].px},${PAD.top + plotH} Z`;

        return (
          <g key={si}>
            <path d={fillPath} fill={`url(#lc-fill-${si})`} />
            <path
              d={linePath}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {pts.map((p, i) => (
              <circle
                key={i}
                cx={p.px}
                cy={p.py}
                r={s.points.length === 1 ? 5 : 3.5}
                fill={s.color}
                stroke="#08080a"
                strokeWidth="2"
              >
                <title>{`${s.points[i].label} : ${s.points[i].value}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
