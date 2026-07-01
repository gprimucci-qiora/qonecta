function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name, size = 40 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#1a1a1a',
      border: '2px solid #333',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.38,
      fontWeight: 600,
      color: '#fff',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {getInitials(name)}
    </div>
  )
}
