import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import Avatar from '../components/Avatar'

export default function Profile() {
  const { profile, loading, error: profileError } = useProfile()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) return <div className="loading-screen"><span>Cargando...</span></div>
  if (profileError) return (
    <div className="loading-screen">
      <span style={{ color: 'var(--color-text-sec)', fontSize: 14, textAlign: 'center', padding: '0 32px' }}>
        No se pudo cargar tu perfil. Verifica tu conexión e intenta de nuevo.
      </span>
    </div>
  )
  if (!profile) return null

  return (
    <div className="page">
      {/* Avatar + nombre */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0 20px', gap: 12 }}>
        <Avatar name={profile.nombre} size={72} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{profile.nombre}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-sec)', marginTop: 4 }}>{profile.tipo_cuadrilla}</div>
        </div>
      </div>

      {/* Datos */}
      <div className="card">
        <div className="card-title">Información</div>
        <ProfileRow label="Usuario FFM"       value={profile.usuario_ffm} />
        <ProfileRow label="No. Empleado"      value={profile.numero_empleado} />
        <ProfileRow label="Sucursal"          value={profile.sucursal} />
        <ProfileRow label="Tipo de cuadrilla" value={profile.tipo_cuadrilla} />
        <ProfileRow label="Coordinador"       value={profile.coordinador} />
        <ProfileRow label="Distrito"          value={`Tipo ${profile.tipo_distrito}`} last />
      </div>

      {/* Cerrar sesión */}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: '1px solid var(--color-sep)',
            borderRadius: 10,
            color: '#FF3B30',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 500,
            padding: '12px 32px',
            cursor: 'pointer',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function ProfileRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: last ? 'none' : '1px solid var(--color-sep)',
      fontSize: 14,
    }}>
      <span style={{ color: 'var(--color-text-sec)' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--color-text)', textAlign: 'right', maxWidth: '60%' }}>{value ?? '—'}</span>
    </div>
  )
}
