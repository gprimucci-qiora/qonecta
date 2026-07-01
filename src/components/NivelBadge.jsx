import { getNivel } from '../lib/bonos'

export default function NivelBadge({ alcancePct }) {
  const nivel = getNivel(alcancePct)
  return (
    <span className="nivel-badge" style={{ background: nivel.color }}>
      {nivel.label}
    </span>
  )
}
