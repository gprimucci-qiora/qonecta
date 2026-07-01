import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useCurrentWeekOrders, useAnnouncement } from '../hooks/useOrders'
import { calcAlcance, getNivel, formatWeekRange, getWeekStart } from '../lib/bonos'
import Avatar from '../components/Avatar'
import NivelBadge from '../components/NivelBadge'
import OrderItem from '../components/OrderItem'

export default function Home() {
  const navigate = useNavigate()
  const { profile, loading: profileLoading } = useProfile()
  const { orders, totalEstrellas, loading: ordersLoading } = useCurrentWeekOrders()
  const { announcement } = useAnnouncement()

  if (profileLoading) return <div className="loading-screen"><span>Cargando...</span></div>
  if (!profile) return null

  const weekStart = getWeekStart()
  const alcancePct = calcAlcance(totalEstrellas, profile.meta_estrellas)
  const nivel = getNivel(alcancePct)
  const fillPct = Math.min(alcancePct, 100)
  const recentOrders = orders.slice(0, 5)

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <Avatar name={profile.nombre} size={48} />
        <div className="page-header-info">
          <div className="page-header-name">{profile.nombre}</div>
          <div className="page-header-sub">{profile.tipo_cuadrilla}</div>
        </div>
      </div>

      {/* Info técnico */}
      <div className="card">
        <div className="card-title">Tu información</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <InfoRow label="Sucursal" value={profile.sucursal} />
          <InfoRow label="Coordinador" value={profile.coordinador} />
          <InfoRow label="Usuario FFM" value={profile.usuario_ffm} />
        </div>
      </div>

      {/* Aviso importante */}
      {announcement && (
        <div className="card" style={{ background: '#1a1a1a', border: '1px solid #333' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18 }}>📢</span>
            <p style={{ fontSize: 14, color: '#eee', lineHeight: 1.5 }}>{announcement}</p>
          </div>
        </div>
      )}

      {/* Meta semanal */}
      <div className="card">
        <div className="card-title">Meta semanal — {formatWeekRange(weekStart)}</div>
        {ordersLoading ? (
          <p style={{ color: '#888', fontSize: 14 }}>Calculando...</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>
                {totalEstrellas} <span style={{ fontSize: 14, fontWeight: 400, color: '#888' }}>/ {profile.meta_estrellas} ★</span>
              </span>
              <NivelBadge alcancePct={alcancePct} />
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${fillPct}%`, background: nivel.color }}
              />
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
              {alcancePct.toFixed(1)}% de tu meta
            </div>
          </>
        )}
      </div>

      {/* Órdenes recientes */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Órdenes recientes</div>
          {orders.length > 5 && (
            <button className="btn-text" onClick={() => navigate('/history')}>
              Ver todo →
            </button>
          )}
        </div>

        {ordersLoading ? (
          <p style={{ color: '#888', fontSize: 14 }}>Cargando...</p>
        ) : recentOrders.length === 0 ? (
          <p style={{ color: '#888', fontSize: 14, padding: '12px 0' }}>Sin órdenes esta semana aún.</p>
        ) : (
          recentOrders.map(o => <OrderItem key={o.id} order={o} />)
        )}
      </div>

      {/* Info de metas */}
      <button
        className="btn-text"
        style={{ width: '100%', textAlign: 'center', padding: '12px 0' }}
        onClick={() => navigate('/info')}
      >
        ¿Cómo funciona mi bono? →
      </button>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontWeight: 500, color: '#111' }}>{value ?? '—'}</span>
    </div>
  )
}
