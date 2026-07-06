import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchAll } from '../../lib/db'
import { calcAlcance, getNivel, getWeekStart, formatWeekRange } from '../../lib/bonos'

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

async function adminPost(action, payload) {
  const token = await getToken()
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  })
  return res.json()
}

export default function AdminHome() {
  const currentWeek = getWeekStart()
  const [weekStart, setWeekStart] = useState(currentWeek)
  const [techs, setTechs] = useState([])
  const [missing, setMissing] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  const load = useCallback(async (week) => {
    setLoading(true)
    setSyncMsg(null)
    const [profiles, orders] = await Promise.all([
      supabase.from('profiles').select('*').then(r => r.data ?? []),
      fetchAll((from, to) =>
        supabase.from('orders').select('usuario_ffm, estrellas, meta_estrellas')
          .eq('semana_inicio', week).range(from, to)
      ),
    ])

    // Build profile map
    const map = {}
    profiles.forEach(p => { map[p.usuario_ffm] = { ...p, totalEstrellas: 0 } })

    // Accumulate stars
    orders.forEach(o => {
      if (map[o.usuario_ffm]) {
        map[o.usuario_ffm].totalEstrellas += o.estrellas
      }
    })

    // Detect FFMs in orders with no profile → no account
    const allFfms = [...new Set(orders.map(o => o.usuario_ffm))]
    const missingFfms = allFfms.filter(ffm => !map[ffm])
    setMissing(missingFfms)

    // Include orphan techs in overview (no meta → alcance 0, shown at bottom)
    missingFfms.forEach(ffm => {
      const stars = orders.filter(o => o.usuario_ffm === ffm).reduce((s, o) => s + o.estrellas, 0)
      map[ffm] = {
        usuario_ffm: ffm, nombre: ffm, sucursal: '—', tipo_cuadrilla: '—',
        totalEstrellas: stars, meta_estrellas: 0, noAccount: true,
      }
    })

    setTechs(Object.values(map).map(t => ({
      ...t,
      alcancePct: calcAlcance(t.totalEstrellas, t.meta_estrellas),
      nivel: getNivel(calcAlcance(t.totalEstrellas, t.meta_estrellas)),
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load(weekStart) }, [weekStart, load])

  function goWeek(delta) {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + delta * 7)
    const next = d.toISOString().split('T')[0]
    if (next <= currentWeek) setWeekStart(next)
  }

  async function syncMissing() {
    setSyncing(true)
    setSyncMsg(null)
    const result = await adminPost('sync_tecnicos', { ffms: missing })
    if (result.ok) {
      setSyncMsg(`✓ ${result.created.length} cuentas creadas${result.skipped.length ? `, ${result.skipped.length} ya existían` : ''}${result.errors.length ? `, ${result.errors.length} errores` : ''}.`)
      setMissing([])
      await load(weekStart)
    } else {
      setSyncMsg(`Error: ${result.error}`)
    }
    setSyncing(false)
  }

  if (loading) return <div className="admin-page"><p style={{ color: '#666' }}>Cargando...</p></div>

  const total = techs.length
  const tiers = [4, 3, 2, 1]
  const tierLabels = { 4: '≥ 100%', 3: '90–99%', 2: '80–89%', 1: '< 80%' }
  const tierColors = { 4: '#3F873F', 3: '#00B2E3', 2: '#FFCD00', 1: '#FF5F00' }
  const tierCounts = {}
  tiers.forEach(t => { tierCounts[t] = techs.filter(x => x.nivel.tier === t && !x.noAccount).length })
  const withOrders = techs.filter(t => t.totalEstrellas > 0).length
  const avgAlcance = total > 0 ? (techs.filter(t => !t.noAccount).reduce((s, t) => s + t.alcancePct, 0) / (total - missing.length || 1)) : 0

  const navBtn = {
    background: 'none', border: 'none', fontSize: 22,
    cursor: 'pointer', padding: '2px 10px', lineHeight: 1,
  }

  return (
    <div className="admin-page">

      {/* Title + week nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="admin-page-title" style={{ margin: 0 }}>Overview</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button style={navBtn} onClick={() => goWeek(-1)}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: weekStart === currentWeek ? '#1C1C1E' : '#00B2E3', minWidth: 160, textAlign: 'center' }}>
            {weekStart === currentWeek ? `Semana actual · ${formatWeekRange(weekStart)}` : `Semana ${formatWeekRange(weekStart)}`}
          </span>
          <button
            style={{ ...navBtn, color: weekStart >= currentWeek ? '#E5E5EA' : '#8E8E93', cursor: weekStart >= currentWeek ? 'default' : 'pointer' }}
            onClick={() => goWeek(1)}
            disabled={weekStart >= currentWeek}
          >›</button>
        </div>
      </div>

      {/* Banner: técnicos sin cuenta */}
      {missing.length > 0 && (
        <div style={{
          background: '#FFF8E7', border: '1.5px solid #FF9F0A',
          borderLeft: '4px solid #FF9F0A', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E' }}>
              {missing.length} técnico{missing.length > 1 ? 's' : ''} sin cuenta detectado{missing.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
              Tienen órdenes en Supabase pero no tienen usuario en la plataforma. Contraseña por defecto: <strong>prueba</strong>
            </div>
          </div>
          <button
            onClick={syncMissing}
            disabled={syncing}
            style={{
              background: '#FF9F0A', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: syncing ? 'default' : 'pointer',
              opacity: syncing ? 0.7 : 1, flexShrink: 0,
            }}
          >
            {syncing ? 'Creando...' : `Crear ${missing.length} cuenta${missing.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
      {syncMsg && (
        <div style={{ background: '#F0FFF4', border: '1px solid #30D158', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#166534' }}>
          {syncMsg}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total técnicos', value: total - missing.length },
          { label: 'Con órdenes esta semana', value: withOrders },
          { label: 'Sin órdenes aún', value: (total - missing.length) - withOrders + missing.filter(f => techs.find(t => t.usuario_ffm === f && t.totalEstrellas > 0)).length },
          { label: 'Alcance promedio', value: `${avgAlcance.toFixed(1)}%` },
        ].map(kpi => (
          <div key={kpi.label} className="admin-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1C1C1E' }}>{kpi.value}</div>
            <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Distribución por nivel */}
      <div className="admin-card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Distribución por nivel</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {tiers.map(tier => {
            const count = tierCounts[tier]
            const base = total - missing.length
            const pct = base > 0 ? (count / base) * 100 : 0
            return (
              <div key={tier} style={{ textAlign: 'center' }}>
                <div style={{
                  background: tierColors[tier], borderRadius: 999,
                  padding: '4px 12px', fontSize: 12, fontWeight: 700,
                  color: '#fff', display: 'inline-block', marginBottom: 8,
                }}>
                  {tierLabels[tier]}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{count}</div>
                <div style={{ fontSize: 13, color: '#8E8E93' }}>{pct.toFixed(1)}%</div>
                <div style={{ height: 4, background: '#E5E5EA', borderRadius: 2, marginTop: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: tierColors[tier], borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top 10 técnicos por alcance */}
      <div className="admin-card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top 10 por alcance esta semana</div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th><th>Nombre</th><th>Sucursal</th><th>★ Semana</th><th>% Alcance</th><th>Nivel</th>
            </tr>
          </thead>
          <tbody>
            {[...techs]
              .filter(t => !t.noAccount)
              .sort((a, b) => b.alcancePct - a.alcancePct)
              .slice(0, 10)
              .map((t, i) => (
                <tr key={t.usuario_ffm}>
                  <td style={{ color: '#8E8E93' }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                  <td style={{ color: '#8E8E93', fontSize: 13 }}>{t.sucursal?.split(' ').slice(-2).join(' ')}</td>
                  <td>{t.totalEstrellas}</td>
                  <td style={{ fontWeight: 600 }}>{t.alcancePct.toFixed(1)}%</td>
                  <td>
                    <span className="nivel-badge" style={{ background: t.nivel.color }}>{t.nivel.label}</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Técnicos sin cuenta (si hay) */}
      {missing.length > 0 && (
        <div className="admin-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#B45309' }}>
            Sin cuenta — aparecen en órdenes pero no en la plataforma ({missing.length})
          </div>
          <table className="admin-table">
            <thead><tr><th>FFM</th><th>Órdenes / estrellas esta semana</th></tr></thead>
            <tbody>
              {missing.map(ffm => {
                const t = techs.find(x => x.usuario_ffm === ffm)
                return (
                  <tr key={ffm}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ffm}</td>
                    <td style={{ color: '#8E8E93' }}>{t?.totalEstrellas ?? 0} ★</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
