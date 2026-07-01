import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchAll } from '../../lib/db'
import { calcAlcance, getNivel, getWeekStart, formatWeekRange } from '../../lib/bonos'

export default function AdminHome() {
  const [techs, setTechs] = useState([])
  const [loading, setLoading] = useState(true)
  const weekStart = getWeekStart()

  useEffect(() => {
    async function load() {
      const [profiles, orders] = await Promise.all([
        supabase.from('profiles').select('*').then(r => r.data ?? []),
        fetchAll((from, to) =>
          supabase.from('orders').select('usuario_ffm, estrellas, meta_estrellas')
            .eq('semana_inicio', weekStart).range(from, to)
        ),
      ])
      const map = {}
      profiles.forEach(p => { map[p.usuario_ffm] = { ...p, totalEstrellas: 0 } })
      orders.forEach(o => { if (map[o.usuario_ffm]) map[o.usuario_ffm].totalEstrellas += o.estrellas })
      setTechs(Object.values(map).map(t => ({
        ...t,
        alcancePct: calcAlcance(t.totalEstrellas, t.meta_estrellas),
        nivel: getNivel(calcAlcance(t.totalEstrellas, t.meta_estrellas)),
      })))
      setLoading(false)
    }
    load()
  }, [weekStart])

  if (loading) return <div className="admin-page"><p style={{color:'#666'}}>Cargando...</p></div>

  const total = techs.length
  const tiers = [4, 3, 2, 1]
  const tierLabels = { 4: '≥ 100%', 3: '90–99%', 2: '80–89%', 1: '< 80%' }
  const tierColors = { 4: '#3F873F', 3: '#00B2E3', 2: '#FFCD00', 1: '#FF5F00' }
  const tierCounts = {}
  tiers.forEach(t => { tierCounts[t] = techs.filter(x => x.nivel.tier === t).length })
  const avgAlcance = total > 0 ? (techs.reduce((s, t) => s + t.alcancePct, 0) / total) : 0
  const withOrders = techs.filter(t => t.totalEstrellas > 0).length

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Overview — Semana {formatWeekRange(weekStart)}</h1>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total técnicos', value: total },
          { label: 'Con órdenes esta semana', value: withOrders },
          { label: 'Sin órdenes aún', value: total - withOrders },
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
            const pct = total > 0 ? (count / total) * 100 : 0
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
                {/* bar */}
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
            {[...techs].sort((a, b) => b.alcancePct - a.alcancePct).slice(0, 10).map((t, i) => (
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
    </div>
  )
}
