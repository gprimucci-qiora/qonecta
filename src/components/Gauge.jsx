function tierColor(pct) {
  if (pct >= 100) return '#3F873F'
  if (pct >= 90)  return '#30D158'
  if (pct >= 80)  return '#FFCD00'
  return '#FF3B30'
}

export default function Gauge({ value, max }) {
  const pct = max > 0 ? Math.min(value / max, 1.1) : 0
  const clampedPct = Math.min(pct, 1)
  const alcancePct = max > 0 ? (value / max) * 100 : 0

  const R = 58
  const cx = 100
  const cy = 68

  function polar(angle, r = R) {
    return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)]
  }

  const [bx1, by1] = polar(Math.PI)
  const [bx2, by2] = polar(0)
  const bgArc = `M ${bx1} ${by1} A ${R} ${R} 0 0 1 ${bx2} ${by2}`

  const fillAngle = Math.PI - clampedPct * Math.PI
  const [fx1, fy1] = polar(Math.PI)
  const [fx2, fy2] = polar(fillAngle)
  const fillArc = clampedPct > 0
    ? `M ${fx1} ${fy1} A ${R} ${R} 0 0 1 ${fx2} ${fy2}`
    : null

  const color = tierColor(alcancePct)

  return (
    <svg viewBox="0 0 200 90" style={{ width: '100%', maxWidth: 200, display: 'block', margin: '0 auto' }}>
      <path d={bgArc} fill="none" stroke="#E5E5EA" strokeWidth="12" strokeLinecap="round" />
      {fillArc && (
        <path d={fillArc} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
      )}
    </svg>
  )
}
