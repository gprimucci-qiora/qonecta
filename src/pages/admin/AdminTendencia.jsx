import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchAll } from '../../lib/db'
import { calcAlcance, formatWeekRange } from '../../lib/bonos'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

export default function AdminTendencia() {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const orders = await fetchAll((from, to) =>
        supabase.from('orders')
          .select('usuario_ffm, semana_inicio, estrellas, meta_estrellas')
          .order('semana_inicio', { ascending: true })
          .range(from, to)
      )

      if (!orders.length) { setLoading(false); return }

      // Group by semana_inicio → per tech totals → avg alcance
      const weekMap = {}
      orders.forEach(o => {
        const w = o.semana_inicio
        if (!weekMap[w]) weekMap[w] = {}
        const t = weekMap[w]
        if (!t[o.usuario_ffm]) t[o.usuario_ffm] = { estrellas: 0, meta: o.meta_estrellas }
        t[o.usuario_ffm].estrellas += o.estrellas
        t[o.usuario_ffm].meta = o.meta_estrellas
      })

      const data = Object.entries(weekMap).map(([weekStart, techs]) => {
        const alcances = Object.values(techs).map(t => calcAlcance(t.estrellas, t.meta))
        const avg = alcances.reduce((s, a) => s + a, 0) / alcances.length
        return {
          semana: formatWeekRange(weekStart),
          alcance: parseFloat(avg.toFixed(1)),
          tecnicos: alcances.length,
        }
      })

      setChartData(data)
      setLoading(false)
    }
    load()
  }, [])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#fff', border: '1px solid #E5E5EA', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div>Alcance prom: <strong>{payload[0]?.value}%</strong></div>
        <div style={{ color: '#8E8E93' }}>{payload[0]?.payload?.tecnicos} técnicos</div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Tendencia Semanal</h1>

      {loading ? <p style={{ color: '#8E8E93' }}>Cargando...</p> : (
        <>
          <div className="admin-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
              % Alcance promedio por semana
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis
                  dataKey="semana"
                  tick={{ fontSize: 11, fill: '#8E8E93' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 120]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#8E8E93' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={100} stroke="#3F873F" strokeDasharray="4 4" label={{ value: 'Meta 100%', fontSize: 11, fill: '#3F873F', position: 'right' }} />
                <ReferenceLine y={90}  stroke="#00B2E3" strokeDasharray="4 4" label={{ value: '90%', fontSize: 11, fill: '#00B2E3', position: 'right' }} />
                <ReferenceLine y={80}  stroke="#FFCD00" strokeDasharray="4 4" label={{ value: '80%', fontSize: 11, fill: '#FFCD00', position: 'right' }} />
                <Line
                  type="monotone"
                  dataKey="alcance"
                  stroke="#00B2E3"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#00B2E3', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly data table */}
          <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Técnicos con órdenes</th>
                  <th>Alcance promedio</th>
                </tr>
              </thead>
              <tbody>
                {[...chartData].reverse().map(row => (
                  <tr key={row.semana}>
                    <td style={{ fontWeight: 500 }}>{row.semana}</td>
                    <td>{row.tecnicos}</td>
                    <td style={{ fontWeight: 600, color: row.alcance >= 100 ? '#3F873F' : row.alcance >= 90 ? '#00B2E3' : row.alcance >= 80 ? '#FFCD00' : '#FF5F00' }}>
                      {row.alcance}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
