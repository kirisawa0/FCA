interface Bar {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  bars: Bar[];
  maxValue?: number;
  height?: number;
  defaultColor?: string;
}

export function BarChart({ bars, maxValue, height = 160, defaultColor = '#facc15' }: Props) {
  const W = 560;
  const H = height;
  const PAD = { top: 12, right: 12, bottom: 28, left: 32 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const effectiveMax = maxValue ?? Math.max(...bars.map((b) => b.value), 1);

  const barWidth = plotW / bars.length;
  const barPad = barWidth * 0.22;

  const yTicks = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      {/* Grille */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const yVal = Math.round((effectiveMax / yTicks) * i);
        const py = PAD.top + (1 - i / yTicks) * plotH;
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
            <text x={PAD.left - 5} y={py + 4} textAnchor="end" fontSize="9" fill="#52525b">
              {yVal}
            </text>
          </g>
        );
      })}

      {/* Barres */}
      {bars.map((bar, i) => {
        const x = PAD.left + i * barWidth + barPad;
        const bw = barWidth - barPad * 2;
        const bh = effectiveMax > 0 ? (bar.value / effectiveMax) * plotH : 0;
        const y = PAD.top + plotH - bh;
        const color = bar.color ?? defaultColor;

        return (
          <g key={i}>
            <defs>
              <linearGradient id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <rect
              x={x}
              y={y}
              width={bw}
              height={Math.max(bh, 2)}
              rx="3"
              fill={`url(#bar-${i})`}
            >
              <title>{`${bar.label} : ${bar.value}`}</title>
            </rect>
            {bar.value > 0 && (
              <text
                x={x + bw / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={color}
              >
                {bar.value}
              </text>
            )}
            <text
              x={x + bw / 2}
              y={H - 4}
              textAnchor="middle"
              fontSize="9"
              fill="#52525b"
            >
              {bar.label.length > 6 ? bar.label.slice(0, 6) + '…' : bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
