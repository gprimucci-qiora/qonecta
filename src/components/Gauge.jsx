export default function Gauge({ value, max }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0

  const R = 58
  const cx = 100
  const cy = 68

  function polar(angle, r = R) {
    return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)]
  }

  const [bx1, by1] = polar(Math.PI)
  const [bx2, by2] = polar(0)
  const bgArc = `M ${bx1} ${by1} A ${R} ${R} 0 0 1 ${bx2} ${by2}`

  const fillAngle = Math.PI - pct * Math.PI
  const [fx1, fy1] = polar(Math.PI)
  const [fx2, fy2] = polar(fillAngle)
  const largeArc = 0
  const fillArc = pct > 0
    ? `M ${fx1} ${fy1} A ${R} ${R} 0 ${largeArc} 1 ${fx2} ${fy2}`
    : null

  return (
    <svg viewBox="0 0 200 90" style={{ width: '100%', maxWidth: 200, display: 'block', margin: '0 auto' }}>
      <defs>
        <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#FF453A" />
          <stop offset="33%"  stopColor="#FF9F0A" />
          <stop offset="66%"  stopColor="#FFD60A" />
          <stop offset="100%" stopColor="#30D158" />
        </linearGradient>
      </defs>

      <path d={bgArc} fill="none" stroke="#E5E5EA" strokeWidth="12" strokeLinecap="round" />
      {fillArc && (
        <path d={fillArc} fill="none" stroke="url(#gauge-gradient)" strokeWidth="12" strokeLinecap="round" />
      )}
    </svg>
  )
}
