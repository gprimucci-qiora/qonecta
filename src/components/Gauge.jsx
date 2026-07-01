export default function Gauge({ value, max }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0

  // Semicircle: from 180° (left) to 0° (right), counterclockwise
  const R = 80
  const cx = 100
  const cy = 100
  const startAngle = Math.PI      // left = 180°
  const endAngle = 0              // right = 0°

  function polar(angle, r = R) {
    return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)]
  }

  // Background arc (full semicircle)
  const [bx1, by1] = polar(startAngle)
  const [bx2, by2] = polar(endAngle)
  const bgArc = `M ${bx1} ${by1} A ${R} ${R} 0 0 1 ${bx2} ${by2}`

  // Fill arc
  const fillAngle = startAngle - pct * Math.PI
  const [fx1, fy1] = polar(startAngle)
  const [fx2, fy2] = polar(fillAngle)
  const largeArc = pct > 0.5 ? 1 : 0
  const fillArc = pct > 0
    ? `M ${fx1} ${fy1} A ${R} ${R} 0 ${largeArc} 1 ${fx2} ${fy2}`
    : null

  // Gradient stops: red → orange → yellow → green
  const gradientId = 'gauge-gradient'

  return (
    <svg viewBox="0 0 200 110" style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto' }}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF453A" />
          <stop offset="33%" stopColor="#FF9F0A" />
          <stop offset="66%" stopColor="#FFD60A" />
          <stop offset="100%" stopColor="#30D158" />
        </linearGradient>
      </defs>

      {/* Background track */}
      <path
        d={bgArc}
        fill="none"
        stroke="#E5E5EA"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Fill arc */}
      {fillArc && (
        <path
          d={fillArc}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="14"
          strokeLinecap="round"
        />
      )}

      {/* Center value */}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fontSize="32"
        fontWeight="700"
        fontFamily="Questrial, sans-serif"
        fill="#1C1C1E"
      >
        {value}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fontSize="11"
        fontFamily="Questrial, sans-serif"
        fill="#8E8E93"
        letterSpacing="0.5"
      >
        DE {max} ESTRELLAS
      </text>
    </svg>
  )
}
