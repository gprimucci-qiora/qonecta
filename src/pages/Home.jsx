import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { useWeekOrders, useAnnouncement, useBonoBracket } from '../hooks/useOrders'
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

function fmt(n) { return `$${Number(n).toLocaleString('es-MX')}` }

function getBonusHint(totalEstrellas, meta, tipoDistrito, bracket) {
  if (!meta || meta === 0) return null
  const dist = (tipoDistrito || '').toUpperCase()
  const alcancePct = (totalEstrellas / meta) * 100

  // Base tier progression (works for all district types)
  if (alcancePct < 80) {
    const needed = Math.ceil(meta * 0.8) - totalEstrellas
    if (needed <= 0) return null
    const suffix = bracket ? ` → cobras ${fmt(bracket.monto_80)}` : ''
    return { msg: `${needed} estrella${needed !== 1 ? 's' : ''} más para llegar al 80%${suffix}.`, positive: false }
  }
  if (alcancePct < 90) {
    const needed = Math.ceil(meta * 0.9) - totalEstrellas
    const suffix = bracket ? ` → tu bono sube a ${fmt(bracket.monto_90)}` : ''
    return { msg: `Con ${needed} estrella${needed !== 1 ? 's' : ''} más llegas al 90%${suffix}.`, positive: false }
  }
  if (alcancePct < 100) {
    const needed = Math.ceil(meta) - totalEstrellas
    const suffix = bracket ? ` → tu bono sube a ${fmt(bracket.monto_100)}` : ''
    return { msg: `Con ${needed} estrella${needed !== 1 ? 's' : ''} más alcanzas el 100%${suffix}.`, positive: false }
  }

  // At or above 100%
  if (dist === 'A') {
    const stars110 = Math.ceil(meta * 1.1)
    if (totalEstrellas >= stars110) {
      const total = bracket ? ` (${fmt(bracket.monto_100 + 500)} total)` : ''
      return { msg: `¡110% alcanzado! +$500 de productividad asegurados${total}.`, positive: true }
    }
    const needed = stars110 - totalEstrellas
    return { msg: `Con ${needed} estrella${needed !== 1 ? 's' : ''} más llegas al 110% y sumas $500 adicionales.`, positive: false }
  }

  if (dist === 'B') {
    const extra = Math.max(0, totalEstrellas - meta)
    const completed = Math.floor(extra / 6)
    const bonoAdicional = Math.min(completed * 100, 500)
    if (bonoAdicional >= 500) {
      const total = bracket ? ` (${fmt(bracket.monto_100 + 500)} total)` : ''
      return { msg: `¡Bono adicional máximo de $500 alcanzado${total}!`, positive: true }
    }
    const nextGroupAt = (completed + 1) * 6 - extra
    if (bonoAdicional > 0) {
      return { msg: `Llevas $${bonoAdicional} de bono extra. Con ${nextGroupAt} estrella${nextGroupAt !== 1 ? 's' : ''} más sumas $100.`, positive: true }
    }
    return { msg: `Con ${nextGroupAt} estrella${nextGroupAt !== 1 ? 's' : ''} más sobre tu meta completas el primer grupo y sumas $100.`, positive: false }
  }

  // Generic at 100%
  const celebrate = bracket ? `¡Meta al 100%! Tu bono esta semana es de ${fmt(bracket.monto_100)}.` : '¡Meta al 100%! Tu bono completo está asegurado.'
  return { msg: celebrate, positive: true }
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
  const bracket = useBonoBracket(profile?.tipo_distrito)

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
    ? getBonusHint(totalEstrellas, profile.meta_estrellas, profile.tipo_distrito, bracket)
    : null

  const showModal = announcement && !dismissed

  return (
    <div className="page">

      {/* Announcement modal */}
      {showModal && (() => {
        const tipo = announcement.tipo || 'alerta'
        const TIPO_STYLE = {
          alerta:   { bg: '#FFF1F0', border: '#FF3B30', btn: '#FF3B30', icon: '🚨' },
          rally:    { bg: '#F0FFF5', border: '#30D158', btn: '#1A7F37', icon: '🎉' },
          reminder: { bg: '#FFFBEB', border: '#FF9F0A', btn: '#B45309', icon: '📌' },
        }
        const s = TIPO_STYLE[tipo] ?? TIPO_STYLE.alerta
        return (
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
                background: s.bg, borderRadius: 20, padding: '28px 24px',
                maxWidth: 400, width: '100%',
                boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
                border: `2px solid ${s.border}`,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: 32, marginBottom: 14, lineHeight: 1 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', marginBottom: 10, lineHeight: 1.25 }}>
                {announcement.titulo || 'Aviso importante'}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: '#3C3C43', margin: '0 0 24px' }}>
                {announcement.mensaje}
              </p>
              <button
                onClick={() => setDismissed(true)}
                style={{
                  width: '100%', padding: 14, background: s.btn, color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        )
      })()}

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
          marginBottom: 4,
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
