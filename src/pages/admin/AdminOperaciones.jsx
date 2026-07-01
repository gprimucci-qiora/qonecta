import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { calcAlcance, formatWeekRange, getWeekStart } from '../../lib/bonos'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend,
  LineChart, Line,
} from 'recharts'

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = [
  '#00B2E3','#30D158','#FF9F0A','#BF5AF2',
  '#FF453A','#FFD60A','#64D2FF','#4ECDC4',
  '#45B7D1','#96CEB4','#FFEAA7','#DDA0DD',
]

const CUAD_COLORS = {
  NORMAL: '#00B2E3', MOTO: '#FF9F0A', HIBRIDA: '#30D158',
  ELITE: '#BF5AF2', MULTIDISTRITO: '#FF453A',
}

const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()]
}

function byDay(orders) {
  const m = Object.fromEntries(DAYS.map(d => [d, 0]))
  orders.forEach(o => {
    const d = dayLabel(o.fecha_termino)
    if (d !== 'Dom' && m[d] !== undefined) m[d]++
  })
  return DAYS.map(d => ({ day: d, count: m[d] }))
}

function byField(orders, field) {
  const m = {}
  orders.forEach(o => { const v = o[field] || 'N/A'; m[v] = (m[v] || 0) + 1 })
  return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="admin-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent || '#1C1C1E', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 3 }}>{sub}</div>}
      <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 6 }}>{label}</div>
    </div>
  )
}

function ChartCard({ title, children, style }) {
  return (
    <div className="admin-card" style={style}>
      {title && <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', marginBottom: 14 }}>{title}</div>}
      {children}
    </div>
  )
}

function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E5EA', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
      <strong>{label}</strong>: {payload[0]?.value} órdenes
    </div>
  )
}

function EmptyState({ text = 'Sin datos para esta semana' }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: '#8E8E93', fontSize: 14 }}>
      {text}
    </div>
  )
}

// ─── Vista Nacional ───────────────────────────────────────────────────────────

function ViewNacional({ orders, trendData, onDrillSucursal }) {
  const total = orders.length
  const activoCount = new Set(orders.map(o => o.usuario_ffm)).size
  const avgOrdenes = activoCount > 0 ? (total / activoCount).toFixed(1) : '0'

  const diaData = byDay(orders)
  const bestDay = [...diaData].sort((a, b) => b.count - a.count)[0]
  const servicioData = byField(orders, 'tipo_servicio').slice(0, 12)
  const sucursalAll = byField(orders, 'sucursal')
  const sucursalTop = sucursalAll
    .slice(0, 10)
    .map(s => ({ ...s, shortName: s.name.split(' ').slice(-2).join(' ') }))

  if (total === 0) return <EmptyState />

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KpiCard label="Órdenes en la semana" value={total.toLocaleString()} />
        <KpiCard label="Técnicos activos" value={activoCount} />
        <KpiCard label="Prom. órdenes / técnico" value={avgOrdenes} />
        <KpiCard
          label="Día más productivo"
          value={bestDay?.day || '—'}
          sub={bestDay?.count ? `${bestDay.count} órdenes` : ''}
          accent="#00B2E3"
        />
      </div>

      {/* Row 1: día + servicio */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Órdenes por día">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={diaData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="count" fill="#00B2E3" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Por tipo de servicio">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={servicioData} margin={{ top: 0, right: 36, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#555' }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {servicioData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: sucursales (clickable) + tendencia */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Órdenes por sucursal — haz clic para ver detalle">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              layout="vertical"
              data={sucursalTop}
              margin={{ top: 0, right: 36, left: 8, bottom: 0 }}
              onClick={e => {
                const name = e?.activePayload?.[0]?.payload?.name
                if (name) onDrillSucursal(name)
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="shortName" width={110} tick={{ fontSize: 11, fill: '#555' }} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div style={{ background: '#fff', border: '1px solid #E5E5EA', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.name}</div>
                      <div>{d.count} órdenes · clic para ver detalle</div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" fill="#00B2E3" radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tendencia semanal de órdenes">
          {trendData.length < 2 ? (
            <EmptyState text="Se necesitan al menos 2 semanas de datos para mostrar tendencia" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 8, right: 24, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8E8E93' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div style={{ background: '#fff', border: '1px solid #E5E5EA', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
                      <strong>{label}</strong>: {payload[0]?.value} órdenes
                    </div>
                  )
                }} />
                <Line type="monotone" dataKey="ordenes" stroke="#00B2E3" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#00B2E3', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Tabla ranking sucursales */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F2F2F7', fontSize: 13, fontWeight: 600 }}>
          Ranking de sucursales — haz clic para ver detalle
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>#</th><th>Sucursal</th><th>Órdenes</th><th>% del total</th></tr>
          </thead>
          <tbody>
            {sucursalAll.map((row, i) => (
              <tr key={row.name} style={{ cursor: 'pointer' }} onClick={() => onDrillSucursal(row.name)}>
                <td style={{ color: '#8E8E93', width: 32 }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{row.name}</td>
                <td style={{ fontWeight: 600 }}>{row.count}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: '#E5E5EA', borderRadius: 2, maxWidth: 120 }}>
                      <div style={{ height: '100%', width: `${(row.count / total * 100).toFixed(0)}%`, background: '#00B2E3', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#8E8E93', minWidth: 40 }}>{(row.count / total * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Vista Sucursal ───────────────────────────────────────────────────────────

function ViewSucursal({ orders, profileMap, onDrillTecnico }) {
  const total = orders.length
  const activoCount = new Set(orders.map(o => o.usuario_ffm)).size
  const avgOrdenes = activoCount > 0 ? (total / activoCount).toFixed(1) : '0'

  const diaData = byDay(orders)
  const servicioData = byField(orders, 'tipo_servicio')
  const cuadrillaData = byField(orders, 'tipo_cuadrilla')

  const techMap = {}
  orders.forEach(o => {
    if (!techMap[o.usuario_ffm]) {
      const p = profileMap[o.usuario_ffm] || {}
      techMap[o.usuario_ffm] = {
        ffm: o.usuario_ffm,
        nombre: p.nombre || o.usuario_ffm,
        cuadrilla: o.tipo_cuadrilla,
        ordenes: 0,
        estrellas: 0,
      }
    }
    techMap[o.usuario_ffm].ordenes++
    techMap[o.usuario_ffm].estrellas += o.estrellas
  })
  const topTecnicos = Object.values(techMap).sort((a, b) => b.ordenes - a.ordenes)

  if (total === 0) return <EmptyState />

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <KpiCard label="Órdenes en la semana" value={total.toLocaleString()} />
        <KpiCard label="Técnicos activos" value={activoCount} />
        <KpiCard label="Prom. órdenes / técnico" value={avgOrdenes} />
      </div>

      {/* Por día + donut cuadrilla */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Órdenes por día">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={diaData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="count" fill="#00B2E3" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Por tipo de cuadrilla">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie
                data={cuadrillaData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="46%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
              >
                {cuadrillaData.map((entry, i) => (
                  <Cell key={i} fill={CUAD_COLORS[entry.name] || PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} órdenes`, n]} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={v => <span style={{ fontSize: 12 }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Por tipo de servicio */}
      <ChartCard title="Por tipo de servicio" style={{ marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={Math.max(160, servicioData.length * 30)}>
          <BarChart layout="vertical" data={servicioData} margin={{ top: 0, right: 36, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#555' }} tickLine={false} axisLine={false} />
            <Tooltip content={<BarTip />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {servicioData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Tabla técnicos */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F2F2F7', fontSize: 13, fontWeight: 600 }}>
          Técnicos — haz clic para ver detalle individual
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>#</th><th>Nombre</th><th>Cuadrilla</th><th>Órdenes</th><th>⭐ Estrellas</th></tr>
          </thead>
          <tbody>
            {topTecnicos.map((t, i) => (
              <tr key={t.ffm} style={{ cursor: 'pointer' }} onClick={() => onDrillTecnico(t.ffm)}>
                <td style={{ color: '#8E8E93', width: 32 }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                <td>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                    background: '#F0F0F0', color: '#555',
                  }}>
                    {t.cuadrilla}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{t.ordenes}</td>
                <td style={{ color: '#FF9F0A', fontWeight: 600 }}>{t.estrellas}</td>
              </tr>
            ))}
            {topTecnicos.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#8E8E93', padding: 24 }}>Sin técnicos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Vista Técnico ────────────────────────────────────────────────────────────

function ViewTecnico({ orders, ffm, profileMap }) {
  const p = profileMap[ffm] || {}
  const total = orders.length
  const totalEstrellas = orders.reduce((s, o) => s + o.estrellas, 0)
  const dias = new Set(orders.map(o => o.fecha_termino)).size
  const alcancePct = p.meta_estrellas ? calcAlcance(totalEstrellas, p.meta_estrellas) : 0
  const alcanceColor = alcancePct >= 100 ? '#3F873F' : alcancePct >= 90 ? '#00B2E3' : alcancePct >= 80 ? '#FFCD00' : '#FF5F00'

  const diaData = byDay(orders)
  const servicioData = byField(orders, 'tipo_servicio')
  const detalleOrdenes = [...orders].sort((a, b) => a.fecha_termino.localeCompare(b.fecha_termino))

  // Initials for avatar
  const initials = (p.nombre || ffm).split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <>
      {/* Profile card */}
      <div className="admin-card" style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20, padding: '20px 24px' }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          background: 'linear-gradient(135deg, #00B2E3, #BF5AF2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 20, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{p.nombre || ffm}</div>
          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 3 }}>
            {ffm}
            {p.sucursal ? ` · ${p.sucursal}` : ''}
            {p.tipo_cuadrilla ? ` · ${p.tipo_cuadrilla}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: alcanceColor, lineHeight: 1 }}>{alcancePct.toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>de {p.meta_estrellas || '?'} ⭐ meta</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KpiCard label="Órdenes en la semana" value={total} />
        <KpiCard label="Estrellas logradas" value={totalEstrellas} accent="#FF9F0A" />
        <KpiCard label="Días trabajados" value={`${dias} / 6`} />
        <KpiCard label="% Alcance meta" value={`${alcancePct.toFixed(1)}%`} accent={alcanceColor} />
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Órdenes por día">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={diaData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="count" fill="#30D158" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Por tipo de servicio">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart layout="vertical" data={servicioData} margin={{ top: 0, right: 36, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#8E8E93' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#555' }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {servicioData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Detalle de órdenes */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F2F2F7', fontSize: 13, fontWeight: 600 }}>
          Detalle de órdenes ({total})
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>Fecha</th><th>Día</th><th>Tipo de servicio</th><th>⭐</th></tr>
          </thead>
          <tbody>
            {detalleOrdenes.map((o, i) => (
              <tr key={i}>
                <td style={{ color: '#8E8E93', fontSize: 13 }}>{o.fecha_termino}</td>
                <td style={{ color: '#8E8E93', fontSize: 12 }}>{dayLabel(o.fecha_termino)}</td>
                <td>{o.tipo_servicio}</td>
                <td style={{ fontWeight: 600, color: '#FF9F0A' }}>{o.estrellas}</td>
              </tr>
            ))}
            {detalleOrdenes.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#8E8E93', padding: 24 }}>
                  Sin órdenes esta semana
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminOperaciones() {
  const [profiles, setProfiles] = useState([])
  const [orders, setOrders] = useState([])
  const [availableWeeks, setAvailableWeeks] = useState([])
  const [trendData, setTrendData] = useState([])
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [loadingInit, setLoadingInit] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)

  const [view, setView] = useState('nacional')
  const [selectedSucursal, setSelectedSucursal] = useState(null)
  const [selectedTecnico, setSelectedTecnico] = useState(null)
  const [filterCuadrilla, setFilterCuadrilla] = useState('')

  const didMount = useRef(false)

  // Init: profiles + available weeks + trend
  useEffect(() => {
    async function init() {
      const [{ data: profilesData }, { data: weeksData }] = await Promise.all([
        supabase.from('profiles').select('usuario_ffm, nombre, sucursal, tipo_cuadrilla, meta_estrellas, tipo_distrito'),
        supabase.from('orders').select('semana_inicio').order('semana_inicio', { ascending: false }),
      ])

      setProfiles(profilesData ?? [])

      const allWeeks = weeksData ?? []
      const unique = [...new Set(allWeeks.map(w => w.semana_inicio))].sort((a, b) => b.localeCompare(a))
      setAvailableWeeks(unique)

      // Trend: count orders per week
      const countByWeek = {}
      allWeeks.forEach(w => { countByWeek[w.semana_inicio] = (countByWeek[w.semana_inicio] || 0) + 1 })
      const trend = Object.entries(countByWeek)
        .map(([sem, ordenes]) => ({ sem, ordenes, label: formatWeekRange(sem) }))
        .sort((a, b) => a.sem.localeCompare(b.sem))
        .slice(-8)
      setTrendData(trend)

      // If current week has no data, switch to latest
      if (unique.length > 0 && !unique.includes(weekStart)) {
        setWeekStart(unique[0])
      }

      setLoadingInit(false)
    }
    init()
  }, [])

  // Load full orders for selected week (after init, and on week change)
  useEffect(() => {
    if (loadingInit) return
    if (!didMount.current) { didMount.current = true }
    setLoadingOrders(true)
    supabase.from('orders').select('*').eq('semana_inicio', weekStart).then(({ data }) => {
      setOrders(data ?? [])
      setLoadingOrders(false)
    })
  }, [weekStart, loadingInit])

  const profileMap = useMemo(() => {
    const m = {}
    profiles.forEach(p => { m[p.usuario_ffm] = p })
    return m
  }, [profiles])

  const filteredOrders = useMemo(() => {
    if (!filterCuadrilla) return orders
    return orders.filter(o => o.tipo_cuadrilla === filterCuadrilla)
  }, [orders, filterCuadrilla])

  const cuadrillaTypes = useMemo(() =>
    [...new Set(orders.map(o => o.tipo_cuadrilla).filter(Boolean))].sort(),
    [orders]
  )

  const sucursalOrders = useMemo(() =>
    selectedSucursal ? filteredOrders.filter(o => o.sucursal === selectedSucursal) : [],
    [filteredOrders, selectedSucursal]
  )

  const tecnicoOrders = useMemo(() =>
    selectedTecnico ? orders.filter(o => o.usuario_ffm === selectedTecnico) : [],
    [orders, selectedTecnico]
  )

  // Navigation
  function drillSucursal(suc) { setSelectedSucursal(suc); setView('sucursal') }
  function drillTecnico(ffm) { setSelectedTecnico(ffm); setView('tecnico') }
  function goBack(to) {
    setView(to)
    if (to === 'nacional') { setSelectedSucursal(null); setSelectedTecnico(null) }
    if (to === 'sucursal') setSelectedTecnico(null)
  }
  function changeWeek(w) {
    setWeekStart(w)
    setView('nacional')
    setSelectedSucursal(null)
    setSelectedTecnico(null)
  }

  // Breadcrumb button style
  const crumbActive = { background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: '#1C1C1E', cursor: 'default', padding: 0 }
  const crumbLink = { background: 'none', border: 'none', fontSize: 14, fontWeight: 400, color: '#00B2E3', cursor: 'pointer', padding: 0 }

  if (loadingInit) return <div className="admin-page"><p style={{ color: '#8E8E93' }}>Cargando...</p></div>

  const pageTitle = view === 'tecnico'
    ? profileMap[selectedTecnico]?.nombre || selectedTecnico
    : view === 'sucursal'
    ? selectedSucursal?.split(' ').slice(-2).join(' ')
    : `Operaciones — Semana ${formatWeekRange(weekStart)}`

  return (
    <div className="admin-page">
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {view !== 'nacional'
            ? <button style={crumbLink} onClick={() => goBack('nacional')}>Nacional</button>
            : <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>Nacional</span>
          }
          {selectedSucursal && (
            <>
              <span style={{ color: '#C7C7CC', fontSize: 16 }}>›</span>
              {view === 'sucursal'
                ? <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>{selectedSucursal.split(' ').slice(-2).join(' ')}</span>
                : <button style={crumbLink} onClick={() => goBack('sucursal')}>{selectedSucursal.split(' ').slice(-2).join(' ')}</button>
              }
            </>
          )}
          {selectedTecnico && (
            <>
              <span style={{ color: '#C7C7CC', fontSize: 16 }}>›</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profileMap[selectedTecnico]?.nombre || selectedTecnico}
              </span>
            </>
          )}
        </div>

        {/* Week selector */}
        <select
          value={weekStart}
          onChange={e => changeWeek(e.target.value)}
          disabled={loadingOrders}
          style={{ padding: '7px 12px', border: '1px solid #E5E5EA', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff', cursor: 'pointer', flexShrink: 0 }}
        >
          {availableWeeks.map(w => (
            <option key={w} value={w}>Sem {formatWeekRange(w)}</option>
          ))}
        </select>

        {/* Cuadrilla filter */}
        {view !== 'tecnico' && cuadrillaTypes.length > 1 && (
          <select
            value={filterCuadrilla}
            onChange={e => setFilterCuadrilla(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #E5E5EA', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="">Todas las cuadrillas</option>
            {cuadrillaTypes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      <h1 className="admin-page-title" style={{ marginBottom: 20 }}>{pageTitle}</h1>

      {loadingOrders ? (
        <div style={{ color: '#8E8E93', padding: '48px 24px', textAlign: 'center' }}>Cargando semana...</div>
      ) : view === 'nacional' ? (
        <ViewNacional
          orders={filteredOrders}
          trendData={trendData}
          onDrillSucursal={drillSucursal}
        />
      ) : view === 'sucursal' ? (
        <ViewSucursal
          orders={sucursalOrders}
          profileMap={profileMap}
          onDrillTecnico={drillTecnico}
        />
      ) : (
        <ViewTecnico
          orders={tecnicoOrders}
          ffm={selectedTecnico}
          profileMap={profileMap}
        />
      )}
    </div>
  )
}
