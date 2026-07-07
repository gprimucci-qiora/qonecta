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

function getBonusHint(totalEstrellas, meta, tipoDistrito) {
  if (!meta || meta === 0) return null
  const dist = (tipoDistrito || '').toUpperCase()

  if (dist === 'B') {
    const completed = Math.floor(totalEstrellas / 6)
    const bonoActual = Math.min(completed * 100, 500)
    if (bonoActual >= 500) {
      return { msg: '¡Bono adicional máximo de $500 alcanzado esta semana!', positive: true }
    }
    const nextAt = (completed + 1) * 6
    const needed = nextAt - totalEstrellas
    const bonoNext = Math.min((completed + 1) * 100, 500)
    if (bonoActual > 0) {
      return { msg: `Llevas $${bonoActual} de bono extra. Con ${needed} estrella${needed !== 1 ? 's' : ''} más sumas $${bonoNext}.`, positive: true }
    }
    return { msg: `Con ${needed} estrella${needed !== 1 ? 's' : ''} más completas 6 y sumas $100 de bono adicional.`, positive: false }
  }

  if (dist === 'A') {
    const stars110 = Math.ceil(meta * 1.1)
    if (totalEstrellas >= stars110) {
      return { msg: '¡110% alcanzado! +$500 de productividad asegurados.', positive: true }
    }
    const needed = stars110 - totalEstrellas
    return { msg: `${needed} estrella${needed !== 1 ? 's' : ''} más para llegar al 110% y ganar $500 adicionales.`, positive: false }
  }

  // Generic: show next tier progress
  const alcancePct = (totalEstrellas / meta) * 100
  if (alcancePct >= 100) {
    return { msg: '¡100% completado! Tu bono completo está asegurado.', positive: true }
  }
  if (alcancePct >= 90) {
    const needed = Math.ceil(meta) - totalEstrellas
    return { msg: `Solo ${needed} estrella${needed !== 1 ? 's' : ''} más para completar el 100% de tu bono.`, positive: false }
  }
  if (alcancePct >= 80) {
    const needed = Math.ceil(meta * 0.9) - totalEstrellas
    return { msg: `Nivel 80% alcanzado. ${needed} estrella${needed !== 1 ? 's' : ''} más para el nivel 90%.`, positive: false }
  }
  const needed = Math.ceil(meta * 0.8) - totalEstrellas
  if (needed <= 0) return null
  return { msg: `${needed} estrella${needed !== 1 ? 's' : ''} más para alcanzar el primer nivel de bono (80%).`, positive: false }
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
  const [dismissed, setDismissed] = useState(false)

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

  const hint = weekStart === currentWeek
    ? getBonusHint(totalEstrellas, profile.meta_estrellas, profile.tipo_distrito)
    : null

  const showModal = announcement && !dismissed

  return (
    <div className="page">

      {/* Announcement modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 1000, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 24,
          }}
          onClick={() => setDismissed(true)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 20, padding: '28px 24px',
              maxWidth: 400, width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 32, marginBottom: 14, lineHeight: 1 }}>🚨</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', marginBottom: 10, lineHeight: 1.25 }}>
              {announcement.titulo || 'Aviso importante'}
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: '#3C3C43', margin: '0 0 24px' }}>
              {announcement.mensaje}
            </p>
            <button
              onClick={() => setDismissed(true)}
              style={{
                width: '100%', padding: 14, background: '#1C1C1E', color: '#fff',
                border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

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

      {/* Bonus hint */}
      {hint && (
        <div style={{
          background: hint.positive ? '#F0FFF4' : '#F0F8FF',
          border: `1px solid ${hint.positive ? '#30D158' : '#00B2E3'}`,
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{hint.positive ? '✅' : '💡'}</span>
          <span style={{ fontSize: 13, lineHeight: 1.4, color: '#1C1C1E' }}>{hint.msg}</span>
        </div>
      )}

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

      {/* 4. Day tabs + orders */}
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

      {/* 5. Footer link */}
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
