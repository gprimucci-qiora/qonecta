import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { calcAlcance, getNivel, getWeekStart } from '../../lib/bonos'

export default function AdminSucursales() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const weekStart = getWeekStart()

  useEffect(() => {
    async function load() {
      const [{ data: profiles }, { data: orders }] = await Promise.all([
        supabase.from('profiles').select('usuario_ffm, sucursal, meta_estrellas'),
        supabase.from('orders').select('usuario_ffm, estrellas').eq('semana_inicio', weekStart),
      ])
      // Build per-tech map
      const techMap = {}
      ;(profiles ?? []).forEach(p => { techMap[p.usuario_ffm] = { ...p, totalEstrellas: 0 } })
      ;(orders ?? []).forEach(o => { if (techMap[o.usuario_ffm]) techMap[o.usuario_ffm].totalEstrellas += o.estrellas })

      // Group by sucursal
      const sucMap = {}
      Object.values(techMap).forEach(t => {
        const s = t.sucursal || 'Sin sucursal'
        if (!sucMap[s]) sucMap[s] = { sucursal: s, techs: [] }
        const alcancePct = calcAlcance(t.totalEstrellas, t.meta_estrellas)
        sucMap[s].techs.push({ alcancePct, nivel: getNivel(alcancePct) })
      })

      const result = Object.values(sucMap).map(({ sucursal, techs }) => {
        const total = techs.length
        const avg = techs.reduce((s, t) => s + t.alcancePct, 0) / total
        const tierCounts = { 4: 0, 3: 0, 2: 0, 1: 0 }
        techs.forEach(t => { tierCounts[t.nivel.tier]++ })
        return { sucursal, total, avg, tierCounts }
      }).sort((a, b) => b.avg - a.avg)

      setRows(result)
      setLoading(false)
    }
    load()
  }, [weekStart])

  const TIER_COLORS = { 4: '#3F873F', 3: '#00B2E3', 2: '#FFCD00', 1: '#FF5F00' }
  const TIER_LABELS = { 4: '≥100%', 3: '90–99%', 2: '80–89%', 1: '<80%' }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Sucursales</h1>

      {loading ? <p style={{ color: '#8E8E93' }}>Cargando...</p> : (
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sucursal</th>
                <th># Técnicos</th>
                <th>Alcance Prom.</th>
                {[4,3,2,1].map(t => (
                  <th key={t}>
                    <span style={{
                      background: TIER_COLORS[t], color: '#fff', padding: '2px 8px',
                      borderRadius: 999, fontSize: 11, fontWeight: 700,
                    }}>
                      {TIER_LABELS[t]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.sucursal}>
                  <td style={{ fontWeight: 500, maxWidth: 260 }}>{row.sucursal}</td>
                  <td>{row.total}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: getNivel(row.avg).color }}>
                      {row.avg.toFixed(1)}%
                    </span>
                  </td>
                  {[4,3,2,1].map(t => (
                    <td key={t} style={{ color: row.tierCounts[t] > 0 ? TIER_COLORS[t] : '#ccc', fontWeight: 600 }}>
                      {row.tierCounts[t]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
