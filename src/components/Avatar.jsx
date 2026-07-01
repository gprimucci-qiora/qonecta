function getInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  const first = words[0]?.[0] ?? ''
  const last = words[words.length - 1]?.[0] ?? ''
  return (first + (words.length > 1 ? last : '')).toUpperCase()
}

export default function Avatar({ name, size = 40 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#1C1C1E',
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.35,
      fontWeight: 700,
      flexShrink: 0,
      letterSpacing: 0.5,
    }}>
      {getInitials(name)}
    </div>
  )
}
