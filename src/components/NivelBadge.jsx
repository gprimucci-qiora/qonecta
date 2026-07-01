import { getNivel } from '../lib/bonos'

export default function NivelBadge({ alcancePct }) {
  const nivel = getNivel(alcancePct)
  return (
    <span style={{
      display: 'inline-block',
      background: nivel.color,
      color: '#fff',
      borderRadius: '100px',
      padding: '3px 10px',
      fontSize: '12px',
      fontWeight: 600,
    }}>
      {nivel.label}
    </span>
  )
}
