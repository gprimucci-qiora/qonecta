import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { useWeekOrders, useAnnouncement } from '../hooks/useOrders'
import { calcAlcance, getNivel, formatWeekRange, getWeekStart } from '../lib/bonos'
import Avatar from '../components/Avatar'
import NivelBadge from '../components/NivelBadge'
import OrderItem from '../components/OrderItem'
import Gauge from '../components/Gauge'

const DAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

function weekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export default function Home() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { profile, loading: profileLoading, error: profileError } = useProfile()

  const currentWeek = getWeekStart()
  const [weekStart, setWeekStart] = useState(currentWeek)
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    const days = weekDays(currentWeek)
    return days.includes(today) ? today : days[0]
  })

  const { orders, totalEstrellas, loading: ordersLoading } = useWeekOrders(weekStart)
  const { announcement } = useAnnouncement()

  const tabDays = weekDays(weekStart)

  function goWeek(delta) {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + delta * 7)
    const next = d.toISOString().split('T')[0]
    if (next > currentWeek) return
    setWeekStart(next)
    const today = new Date().toISOString().split('T')[0]
    const days = weekDays(next)
    setSelectedDay(days.includes(today) ? today : days[0])
  }

  const todayStr = new Date().toISOString().split('T')[0]

  if (profileLoading) return <div className="loading-screen"><span>Cargando...</span></div>
  if (profileError) return (
    <div className="loading-screen" style={{ flexDirection: 'column', gap: 20 }}>
      <span style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: '0 32px' }}>
        No se pudo cargar tu perfil. Verifica tu conexión e intenta de nuevo.
      </span>
      <button
        onClick={async () => { await signOut(); navigate('/login', { replace: true }) }}
        style={{ padding: '10px 24px', background: '#1C1C1E', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
      >
        Cerrar sesión
      </button>
    </div>
  )
  if (!profile) return null

  const alcancePct = calcAlcance(totalEstrellas, profile.meta_estrellas)
  const nivel = getNivel(alcancePct)
  const dayOrders = orders.filter(o => o.fecha_termino === selectedDay)

  const totalOrdenes = orders.length
  const diasTrabajados = new Set(orders.map(o => o.fecha_termino)).size
  const productividad = diasTrabajados > 0 ? (totalOrdenes / diasTrabajados).toFixed(1) : '0'

  return (
    <div className="page">

      {/* 1. Welcome row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 0' }}>
        <Avatar name={profile.nombre} size={44} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Hola, {(profile.nombre || profile.usuario_ffm).split(' ')[0]}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-sec)' }}>
            {profile.sucursal} · {profile.tipo_cuadrilla}
          </div>
        </div>
      </div>

      {/* Week navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0 8px' }}>
        <button
          onClick={() => goWeek(-1)}
          style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--color-text-sec)', cursor: 'pointer', padding: '2px 10px', lineHeight: 1 }}
        >‹</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: weekStart === currentWeek ? 'var(--color-text)' : 'var(--color-primary)' }}>
          {weekStart === currentWeek ? `Semana actual · ${formatWeekRange(weekStart)}` : `Semana ${formatWeekRange(weekStart)}`}
        </span>
        <button
          onClick={() => goWeek(1)}
          disabled={weekStart >= currentWeek}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: weekStart >= currentWeek ? 'default' : 'pointer', padding: '2px 10px', lineHeight: 1, color: weekStart >= currentWeek ? 'var(--color-border, #E5E5EA)' : 'var(--color-text-sec)' }}
        >›</button>
      </div>

      {/* 2. Gauge card */}
      <div className="card" style={{ textAlign: 'center', paddingTop: 16, paddingBottom: 16 }}>
        <Gauge value={totalEstrellas} max={profile.meta_estrellas} />
        {/* Stats row below gauge */}
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
            {alcancePct.toFixed(1)}
            <span style={{ fontSize: 18, fontWeight: 600, color: nivel.color }}>%</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-sec)', marginTop: 4 }}>
            {totalEstrellas} de {profile.meta_estrellas} estrellas esta semana
          </div>
          <div style={{ marginTop: 8 }}>
            <NivelBadge alcancePct={alcancePct} />
          </div>
        </div>
      </div>

      {/* 3. Mini KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Órdenes', value: totalOrdenes, icon: '📋' },
          { label: 'Días trab.', value: `${diasTrabajados}/6`, icon: '📅' },
          { label: 'OS / día', value: productividad, icon: '⚡' },
        ].map(k => (
          <div key={k.label} className="card" style={{ textAlign: 'center', padding: '10px 8px' }}>
            <div style={{ fontSize: 11, marginBottom: 2 }}>{k.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-sec)', marginTop: 3, letterSpacing: 0.2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* 4. Announcement */}
      {announcement && (
        <div style={{
          background: '#FFF0F0',
          border: '1.5px solid #FF3B30',
          borderLeft: '4px solid #FF3B30',
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#FF3B30', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>
              Aviso importante
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: '#1C1C1E', margin: 0 }}>{announcement}</p>
          </div>
        </div>
      )}

      {/* 5. Day tabs + orders */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="day-tabs">
          {tabDays.map((day, i) => {
            const hasOrders = orders.some(o => o.fecha_termino === day)
            return (
              <button
                key={day}
                className={`day-tab${selectedDay === day ? ' active' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <span className="day-tab-label">{DAY_LABELS[i]}</span>
                {hasOrders && <span className="day-tab-dot" />}
              </button>
            )
          })}
        </div>
        <div style={{ padding: '8px 16px 16px' }}>
          {ordersLoading ? (
            <p style={{ color: 'var(--color-text-sec)', fontSize: 14, padding: '12px 0' }}>
              Cargando...
            </p>
          ) : dayOrders.length === 0 ? (
            <p style={{ color: 'var(--color-text-sec)', fontSize: 14, padding: '12px 0', textAlign: 'center' }}>
              Sin órdenes este día.
            </p>
          ) : (
            dayOrders.map(o => <OrderItem key={o.id} order={o} />)
          )}
        </div>
      </div>

      {/* 6. Footer link */}
      <button
        className="btn-text"
        style={{ width: '100%', textAlign: 'center', padding: '12px 0', marginBottom: 8 }}
        onClick={() => navigate('/info')}
      >
        ¿Cómo funciona mi bono? →
      </button>

    </div>
  )
}
