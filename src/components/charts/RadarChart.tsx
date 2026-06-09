interface RadarPoint {
  label: string;
  value: number;
  max?: number;
}

interface Props {
  points: RadarPoint[];
  color?: string;
}

function polarToXY(angleDeg: number, r: number, cx: number, cy: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Découpe un label long sur deux lignes si nécessaire */
function splitLabel(label: string): string[] {
  if (label.length <= 10) return [label];
  const mid = Math.floor(label.length / 2);
  const spaceIdx = label.indexOf(' ', mid - 3);
  if (spaceIdx !== -1) return [label.slice(0, spaceIdx), label.slice(spaceIdx + 1)];
  return [label.slice(0, mid), label.slice(mid)];
}

export function RadarChart({ points, color = '#facc15' }: Props) {
  if (points.length < 3) return null;

  // Espace généreux pour que les labels ne soient jamais coupés
  const W = 340;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2;
  // Rayon du web réduit pour laisser de la place aux labels sur les côtés
  const R = 95;
  const n = points.length;
  const levels = 5;
  const anglePerPt = 360 / n;

  function pointPath(values: number[]) {
    return (
      values
        .map((v, i) => {
          const max = points[i].max ?? 10;
          const r = (v / max) * R;
          const { x, y } = polarToXY(i * anglePerPt, r, cx, cy);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ') + ' Z'
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      <defs>
        <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.08" />
        </radialGradient>
      </defs>

      {/* Niveaux */}
      {Array.from({ length: levels }).map((_, lvl) => {
        const r = ((lvl + 1) / levels) * R;
        const d =
          Array.from({ length: n })
            .map((_, i) => {
              const { x, y } = polarToXY(i * anglePerPt, r, cx, cy);
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(' ') + ' Z';
        return (
          <path
            key={lvl}
            d={d}
            fill="none"
            stroke="#2a2a36"
            strokeWidth={lvl === levels - 1 ? 1.5 : 1}
          />
        );
      })}

      {/* Axes */}
      {points.map((_, i) => {
        const { x, y } = polarToXY(i * anglePerPt, R, cx, cy);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2a2a36" strokeWidth="1" />
        );
      })}

      {/* Polygone données */}
      <path
        d={pointPath(points.map((p) => p.value))}
        fill="url(#radar-fill)"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((p, i) => {
        const max = p.max ?? 10;
        const r = (p.value / max) * R;
        const { x, y } = polarToXY(i * anglePerPt, r, cx, cy);
        return (
          <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#08080a" strokeWidth="2">
            <title>{`${p.label} : ${p.value}/${max}`}</title>
          </circle>
        );
      })}

      {/* Labels — avec retour à la ligne auto */}
      {points.map((p, i) => {
        const angleDeg = i * anglePerPt;
        const { x, y } = polarToXY(angleDeg, R + 26, cx, cy);
        const lines = splitLabel(p.label);
        const lineH = 13;
        const totalH = lines.length * lineH;
        return (
          <text
            key={i}
            x={x.toFixed(2)}
            y={(y - totalH / 2).toFixed(2)}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#a1a1aa"
          >
            {lines.map((line, li) => (
              <tspan key={li} x={x.toFixed(2)} dy={li === 0 ? 0 : lineH}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}

      {/* Valeurs sur les points */}
      {points.map((p, i) => {
        if (p.value === 0) return null;
        const max = p.max ?? 10;
        const r = (p.value / max) * R;
        const { x, y } = polarToXY(i * anglePerPt, r - 15, cx, cy);
        return (
          <text
            key={`v${i}`}
            x={x.toFixed(2)}
            y={y.toFixed(2)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fontWeight="700"
            fill={color}
          >
            {p.value}
          </text>
        );
      })}
    </svg>
  );
}
