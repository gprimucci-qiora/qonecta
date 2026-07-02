import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'

async function fetchAll(builder) {
  const PAGE = 1000
  let all = [], from = 0
  while (true) {
    const { data } = await builder(from, from + PAGE - 1)
    if (!data?.length) break
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}
import { calcAlcance, formatWeekRange, getWeekStart } from '../../lib/bonos'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, LabelList, PieChart, Pie, Legend,
  ComposedChart, Line,
} from 'recharts'

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  blue:    '#00B2E3',
  blueDark:'#006F8E',
  green:   '#30D158',
  orange:  '#FF9F0A',
  purple:  '#BF5AF2',
  red:     '#FF453A',
  slate:   '#1E293B',
  muted:   '#CBD5E1',
  surface: '#F8FAFC',
}

// Professional blue gradient — dark → light for ranked data
const BLUE_SCALE = [
  '#003F5C','#005F8A','#0078AD','#0090CC','#00A8E8',
  '#1FB8F0','#52C8F5','#7DD5F7','#A8E2FA','#C8EDFC',
]

function rankColor(i) { return BLUE_SCALE[Math.min(i, BLUE_SCALE.length - 1)] }

const CUAD_COLORS = {
  NORMAL: C.blue, MOTO: C.orange, HIBRIDA: C.green,
  ELITE: C.purple, MULTIDISTRITO: C.red,
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

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E8EEF4',
      borderRadius: 12,
      padding: '16px 20px',
      borderLeft: `4px solid ${color || '#E5E5EA'}`,
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', color: '#94A3B8', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.slate, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function ChartCard({ title, badge, children, style }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E8EEF4',
      borderRadius: 12,
      padding: '20px 20px 16px',
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.slate, letterSpacing: '-0.1px' }}>{title}</div>
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px',
            padding: '3px 8px', borderRadius: 4,
            background: C.blue + '14', color: C.blue,
          }}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Tip({ active, payload, label, extra }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #E2EAF0',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,.12)',
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 6, color: C.slate, fontSize: 13 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
          {p.name && <span>{p.name}:</span>} <strong style={{ color: C.slate }}>{p.value?.toLocaleString()}</strong>
        </div>
      ))}
      {extra && <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 6, borderTop: '1px solid #F0F0F0', paddingTop: 6 }}>{extra}</div>}
    </div>
  )
}

function EmptyState({ text = 'Sin datos para esta semana' }) {
  return (
    <div style={{ padding: '52px 24px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📊</div>
      {text}
    </div>
  )
}

const axisStyle = { fontSize: 11, fill: '#94A3B8' }
const axisProps = { tickLine: false, axisLine: false, tick: axisStyle }

// ─── Vista Nacional ───────────────────────────────────────────────────────────

function ViewNacional({ orders, trendData, onDrillSucursal }) {
  const total = orders.length
  const activoCount = new Set(orders.map(o => o.usuario_ffm)).size
  const sucursalesActivas = new Set(orders.map(o => o.sucursal).filter(Boolean)).size

  const diasPorTecnico = {}
  orders.forEach(o => {
    if (!diasPorTecnico[o.usuario_ffm]) diasPorTecnico[o.usuario_ffm] = new Set()
    diasPorTecnico[o.usuario_ffm].add(o.fecha_termino)
  })
  const totalDiasWorked = Object.values(diasPorTecnico).reduce((s, d) => s + d.size, 0)
  const avgDias = activoCount > 0 ? (totalDiasWorked / activoCount).toFixed(1) : '0'
  const prodPromedio = totalDiasWorked > 0 ? (total / totalDiasWorked).toFixed(1) : '0'
  const totalEstrellas = orders.reduce((s, o) => s + (o.estrellas || 0), 0)
  const avgEstrellas = activoCount > 0 ? (totalEstrellas / activoCount).toFixed(1) : '0'

  const diaData = byDay(orders)
  const bestDay = [...diaData].sort((a, b) => b.count - a.count)[0]
  const servicioData = byField(orders, 'tipo_servicio').slice(0, 14)

  const sucursalMapE = {}
  orders.forEach(o => {
    const s = o.sucursal || 'N/A'
    if (!sucursalMapE[s]) sucursalMapE[s] = { count: 0, techs: new Set() }
    sucursalMapE[s].count++
    sucursalMapE[s].techs.add(o.usuario_ffm)
  })
  const sucursalAll = Object.entries(sucursalMapE)
    .map(([name, d]) => ({ name, count: d.count, tecnicos: d.techs.size, avg: (d.count / d.techs.size).toFixed(1) }))
    .sort((a, b) => b.count - a.count)
  const sucursalTop = sucursalAll
    .slice(0, 10)
    .map(s => ({ ...s, shortName: s.name.split(' ').slice(-2).join(' ') }))

  if (total === 0) return <EmptyState />

  return (
    <>
      {/* KPIs — fila 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
        <KpiCard label="Órdenes en la semana" value={total.toLocaleString()} color={C.blue} sub="órdenes de servicio" />
        <KpiCard label="Técnicos activos" value={activoCount} color={C.green} sub="con al menos 1 OS" />
        <KpiCard label="Sucursales activas" value={sucursalesActivas} color={C.slate} sub="centros de trabajo" />
      </div>
      {/* KPIs — fila 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Productividad promedio" value={prodPromedio} color={C.orange} sub="OS por día trabajado" />
        <KpiCard label="Asistencia promedio" value={`${avgDias} / 6`} color={C.purple} sub="días trabajados por técnico" />
        <KpiCard label="Promedio estrellas" value={avgEstrellas} color="#F59E0B" sub={`${totalEstrellas.toLocaleString()} estrellas totales`} />
      </div>

      {/* Row 1: tipo de servicio + tendencia */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        <ChartCard title="Tipo de servicio" badge="SEMANA ACTUAL">
          <ResponsiveContainer width="100%" height={370}>
            <BarChart layout="vertical" data={servicioData} margin={{ top: 0, right: 64, left: 4, bottom: 0 }}>
              <XAxis type="number" {...axisProps} tick={{ fontSize: 10, fill: '#B0BAC9' }} />
              <YAxis type="category" dataKey="name" width={162} {...axisProps}
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} />
              <Tooltip content={({ active, payload, label }) => (
                <Tip active={active} payload={[{ ...payload?.[0], name: 'Órdenes', color: payload?.[0]?.fill }]} label={label} />
              )} cursor={{ fill: 'rgba(0,178,227,0.05)' }} />
              <Bar dataKey="count" name="Órdenes" radius={[0, 5, 5, 0]} maxBarSize={20}>
                {servicioData.map((_, i) => <Cell key={i} fill={rankColor(i)} />)}
                <LabelList dataKey="count" position="right" formatter={v => v.toLocaleString()}
                  style={{ fontSize: 11, fill: '#64748B', fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tendencia semanal" badge="ÚLTIMAS 8 SEMANAS">
          {trendData.length < 2 ? (
            <EmptyState text="Se necesitan al menos 2 semanas de datos" />
          ) : (
            <ResponsiveContainer width="100%" height={370}>
              <ComposedChart data={trendData} margin={{ top: 8, right: 48, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,.05)" />
                <XAxis dataKey="label" {...axisProps} tick={{ fontSize: 10, fill: '#B0BAC9' }} />
                <YAxis yAxisId="left" {...axisProps} />
                <YAxis yAxisId="right" orientation="right" {...axisProps} />
                <Tooltip content={({ active, payload, label }) => (
                  <Tip active={active} payload={payload} label={label} />
                )} cursor={{ fill: 'rgba(0,178,227,0.05)' }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={v => <span style={{ fontSize: 11, color: '#64748B' }}>{v}</span>} />
                <Bar yAxisId="left" dataKey="ordenes" name="Órdenes" fill={C.blue + '30'}
                  stroke={C.blue} strokeWidth={1}
                  radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="tecnicos" name="Técnicos activos"
                  stroke={C.slate} strokeWidth={2.5}
                  dot={{ r: 4, fill: C.slate, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: C.blue, strokeWidth: 2, stroke: '#fff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 2: días + sucursales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        <ChartCard title="Órdenes por día" badge="SEMANA ACTUAL">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={diaData} margin={{ top: 18, right: 8, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} hide />
              <Tooltip content={({ active, payload, label }) => (
                <Tip active={active} payload={[{ ...payload?.[0], name: 'Órdenes', color: C.blue }]} label={label} />
              )} cursor={{ fill: 'rgba(0,178,227,0.05)' }} />
              <Bar dataKey="count" name="Órdenes" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {diaData.map((d, i) => (
                  <Cell key={i} fill={d.day === bestDay?.day ? C.blue : C.muted} />
                ))}
                <LabelList dataKey="count" position="top"
                  formatter={v => v > 0 ? v.toLocaleString() : ''}
                  style={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 sucursales" badge="HAZ CLIC PARA DETALLES">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              layout="vertical"
              data={sucursalTop}
              margin={{ top: 0, right: 56, left: 4, bottom: 0 }}
              onClick={e => { const n = e?.activePayload?.[0]?.payload?.name; if (n) onDrillSucursal(n) }}
              style={{ cursor: 'pointer' }}
            >
              <XAxis type="number" {...axisProps} hide />
              <YAxis type="category" dataKey="shortName" width={112} {...axisProps}
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div style={{ background: '#fff', border: '1px solid #E2EAF0', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: C.slate }}>{d.name}</div>
                    <div style={{ color: '#475569' }}>{d.count.toLocaleString()} órdenes</div>
                    <div style={{ color: C.blue, fontSize: 11, marginTop: 4 }}>Ver detalle →</div>
                  </div>
                )
              }} cursor={{ fill: 'rgba(0,178,227,0.05)' }} />
              <Bar dataKey="count" name="Órdenes" radius={[0, 5, 5, 0]} maxBarSize={18}>
                {sucursalTop.map((_, i) => <Cell key={i} fill={i === 0 ? C.blueDark : i < 3 ? C.blue : '#7EC8E3'} />)}
                <LabelList dataKey="count" position="right" formatter={v => v.toLocaleString()}
                  style={{ fontSize: 11, fill: '#64748B', fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tabla ranking sucursales */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Ranking de sucursales</span>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8E8E93' }}>haz clic para ver detalle</span>
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>#</th><th>Sucursal</th><th>Órdenes</th><th>Técnicos</th><th>OS/técnico</th><th>% del total</th></tr>
          </thead>
          <tbody>
            {sucursalAll.map((row, i) => (
              <tr key={row.name} style={{ cursor: 'pointer' }} onClick={() => onDrillSucursal(row.name)}>
                <td style={{ color: i < 3 ? C.orange : '#8E8E93', fontWeight: i < 3 ? 700 : 400, width: 32 }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{row.name}</td>
                <td style={{ fontWeight: 700 }}>{row.count.toLocaleString()}</td>
                <td style={{ color: C.green, fontWeight: 600 }}>{row.tecnicos}</td>
                <td style={{ color: C.orange, fontWeight: 600 }}>{row.avg}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 5, background: '#E5E5EA', borderRadius: 999, maxWidth: 120 }}>
                      <div style={{ height: '100%', width: `${(row.count / total * 100).toFixed(0)}%`, background: C.blue, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#8E8E93', minWidth: 40, textAlign: 'right' }}>
                      {(row.count / total * 100).toFixed(1)}%
                    </span>
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

function ViewSucursal({ orders, sucursal, profileMap, onDrillTecnico }) {
  const [sortKey, setSortKey] = useState('ordenes')
  const [sortDir, setSortDir] = useState('desc')

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const total = orders.length
  const activoCount = new Set(orders.map(o => o.usuario_ffm)).size

  const diasPorTecnico = {}
  orders.forEach(o => {
    if (!diasPorTecnico[o.usuario_ffm]) diasPorTecnico[o.usuario_ffm] = new Set()
    diasPorTecnico[o.usuario_ffm].add(o.fecha_termino)
  })
  const totalDiasWorked = Object.values(diasPorTecnico).reduce((s, d) => s + d.size, 0)
  const avgDias = activoCount > 0 ? (totalDiasWorked / activoCount).toFixed(1) : '0'
  const prodPromedio = totalDiasWorked > 0 ? (total / totalDiasWorked).toFixed(1) : '0'
  const totalEstrellas = orders.reduce((s, o) => s + (o.estrellas || 0), 0)
  const avgEstrellas = activoCount > 0 ? (totalEstrellas / activoCount).toFixed(1) : '0'

  const diaData = byDay(orders)
  const bestDay = [...diaData].sort((a, b) => b.count - a.count)[0]
  const servicioData = byField(orders, 'tipo_servicio')
  const cuadrillaData = byField(orders, 'tipo_cuadrilla')

  const techMap = {}
  orders.forEach(o => {
    if (!techMap[o.usuario_ffm]) {
      const p = profileMap[o.usuario_ffm] || {}
      techMap[o.usuario_ffm] = {
        ffm: o.usuario_ffm, nombre: p.nombre || o.usuario_ffm,
        cuadrilla: o.tipo_cuadrilla, meta: p.meta_estrellas || 0,
        ordenes: 0, estrellas: 0, _dias: new Set(),
      }
    }
    techMap[o.usuario_ffm].ordenes++
    techMap[o.usuario_ffm].estrellas += (o.estrellas || 0)
    techMap[o.usuario_ffm]._dias.add(o.fecha_termino)
  })
  const tecnicosList = Object.values(techMap).map(t => ({
    ...t,
    dias: t._dias.size,
    osDia: t._dias.size > 0 ? parseFloat((t.ordenes / t._dias.size).toFixed(1)) : 0,
    metaPct: t.meta > 0 ? Math.round(t.estrellas / t.meta * 100) : null,
  }))

  const sortedTecnicos = [...tecnicosList].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey]
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    const na = parseFloat(va), nb = parseFloat(vb)
    if (!isNaN(na) && !isNaN(nb)) return sortDir === 'desc' ? nb - na : na - nb
    return sortDir === 'desc' ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb))
  })

  const SortTh = ({ k, children }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {children}
        <span style={{ fontSize: 8, color: sortKey === k ? C.blue : '#CBD5E1' }}>
          {sortKey === k ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
        </span>
      </span>
    </th>
  )

  if (total === 0) return <EmptyState />

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Órdenes" value={total.toLocaleString()} color={C.blue} />
        <KpiCard label="Técnicos activos" value={activoCount} color={C.green} />
        <KpiCard label="Productividad prom." value={prodPromedio} color={C.orange} sub="OS / día trabajado" />
        <KpiCard label="Asistencia prom." value={`${avgDias} / 6`} color={C.purple} sub="días / técnico" />
        <KpiCard label="Prom. estrellas" value={avgEstrellas} color="#F59E0B" sub={`${totalEstrellas.toLocaleString()} totales`} />
      </div>

      {/* Row 1: por día + cuadrilla donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <ChartCard title="Órdenes por día" badge="SEMANA ACTUAL">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={diaData} margin={{ top: 18, right: 8, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} hide />
              <Tooltip content={({ active, payload, label }) => (
                <Tip active={active} payload={[{ ...payload?.[0], name: 'Órdenes', color: C.blue }]} label={label} />
              )} cursor={{ fill: 'rgba(0,178,227,0.05)' }} />
              <Bar dataKey="count" name="Órdenes" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {diaData.map((d, i) => (
                  <Cell key={i} fill={d.day === bestDay?.day ? C.blue : C.muted} />
                ))}
                <LabelList dataKey="count" position="top"
                  formatter={v => v > 0 ? v.toLocaleString() : ''}
                  style={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tipo de cuadrilla">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={cuadrillaData} dataKey="count" nameKey="name" cx="50%" cy="46%"
                innerRadius={58} outerRadius={88} paddingAngle={3}>
                {cuadrillaData.map((e, i) => (
                  <Cell key={i} fill={CUAD_COLORS[e.name] || rankColor(i)} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]
                return (
                  <div style={{ background: '#fff', border: '1px solid #E2EAF0', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
                    <div style={{ fontWeight: 700, color: C.slate, marginBottom: 4 }}>{d.name}</div>
                    <div style={{ color: '#475569' }}>{d.value?.toLocaleString()} órdenes</div>
                  </div>
                )
              }} />
              <Legend iconType="circle" iconSize={8}
                formatter={v => <span style={{ fontSize: 11, color: '#64748B' }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Por tipo de servicio */}
      <ChartCard title="Tipo de servicio" badge="OPERATIVO" style={{ marginBottom: 14 }}>
        <ResponsiveContainer width="100%" height={Math.max(200, servicioData.length * 34)}>
          <BarChart layout="vertical" data={servicioData} margin={{ top: 0, right: 64, left: 4, bottom: 0 }}>
            <XAxis type="number" {...axisProps} tick={{ fontSize: 10, fill: '#B0BAC9' }} />
            <YAxis type="category" dataKey="name" width={170} {...axisProps}
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} />
            <Tooltip content={({ active, payload, label }) => (
              <Tip active={active} payload={[{ ...payload?.[0], name: 'Órdenes', color: payload?.[0]?.fill }]} label={label} />
            )} cursor={{ fill: 'rgba(0,178,227,0.05)' }} />
            <Bar dataKey="count" name="Órdenes" radius={[0, 5, 5, 0]} maxBarSize={20}>
              {servicioData.map((_, i) => <Cell key={i} fill={rankColor(i)} />)}
              <LabelList dataKey="count" position="right" formatter={v => v.toLocaleString()}
                style={{ fontSize: 11, fill: '#64748B', fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Tabla técnicos */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Técnicos — {sortedTecnicos.length} activos</span>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8E8E93' }}>haz clic para ver detalle · columnas ordenables</span>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <SortTh k="nombre">Nombre</SortTh>
              <th>Cuadrilla</th>
              <SortTh k="ordenes">Órdenes</SortTh>
              <SortTh k="dias">Días</SortTh>
              <SortTh k="osDia">OS/día</SortTh>
              <SortTh k="estrellas">Estrellas</SortTh>
              <SortTh k="metaPct">% Meta</SortTh>
            </tr>
          </thead>
          <tbody>
            {sortedTecnicos.map((t, i) => (
              <tr key={t.ffm} style={{ cursor: 'pointer' }} onClick={() => onDrillTecnico(t.ffm)}>
                <td style={{ color: i < 3 ? C.orange : '#8E8E93', fontWeight: i < 3 ? 700 : 400, width: 32 }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                <td>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
                    background: (CUAD_COLORS[t.cuadrilla] || '#8E8E93') + '22',
                    color: CUAD_COLORS[t.cuadrilla] || '#555',
                  }}>
                    {t.cuadrilla}
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>{t.ordenes}</td>
                <td style={{ color: '#475569' }}>{t.dias}</td>
                <td style={{ color: C.orange, fontWeight: 600 }}>{t.osDia}</td>
                <td style={{ color: '#F59E0B', fontWeight: 600 }}>{t.estrellas}</td>
                <td style={{
                  fontWeight: 700,
                  color: t.metaPct === null ? '#CBD5E1' : t.metaPct >= 100 ? C.green : t.metaPct >= 80 ? C.orange : C.red,
                }}>
                  {t.metaPct === null ? '—' : `${t.metaPct}%`}
                </td>
              </tr>
            ))}
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
  const alcanceColor = alcancePct >= 100 ? C.green : alcancePct >= 90 ? C.blue : alcancePct >= 80 ? C.yellow : C.red

  const diaData = byDay(orders)
  const bestDay = [...diaData].sort((a, b) => b.count - a.count)[0]
  const servicioData = byField(orders, 'tipo_servicio')
  const detalleOrdenes = [...orders].sort((a, b) => a.fecha_termino.localeCompare(b.fecha_termino))
  const initials = (p.nombre || ffm).split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <>
      {/* Profile card */}
      <div className="admin-card" style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20, padding: '20px 24px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 20, flexShrink: 0, letterSpacing: 1,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1C1C1E' }}>{p.nombre || ffm}</div>
          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 3 }}>
            <span style={{ fontFamily: 'monospace', background: '#F2F2F7', padding: '1px 6px', borderRadius: 4, marginRight: 8 }}>{ffm}</span>
            {p.sucursal && <span>{p.sucursal}</span>}
            {p.tipo_cuadrilla && (
              <span style={{
                marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: (CUAD_COLORS[p.tipo_cuadrilla] || '#8E8E93') + '22',
                color: CUAD_COLORS[p.tipo_cuadrilla] || '#555',
              }}>
                {p.tipo_cuadrilla}
              </span>
            )}
          </div>
        </div>
        {/* Alcance mini-badge */}
        <div style={{ textAlign: 'right', flexShrink: 0, padding: '12px 20px', background: alcanceColor + '14', borderRadius: 12, borderLeft: `4px solid ${alcanceColor}` }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: alcanceColor, lineHeight: 1 }}>{alcancePct.toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>de {p.meta_estrellas || '?'} ⭐ meta</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Órdenes en la semana" value={total} color={C.blue} />
        <KpiCard label="Estrellas logradas" value={totalEstrellas} color={C.orange} sub={`meta ${p.meta_estrellas || '?'}`} />
        <KpiCard label="Días trabajados" value={`${dias} / 6`} color={dias >= 5 ? C.green : dias >= 3 ? C.orange : C.red} />
        <KpiCard label="% Alcance meta" value={`${alcancePct.toFixed(1)}%`} color={alcanceColor} />
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <ChartCard title="Órdenes por día" badge="SEMANA ACTUAL">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={diaData} margin={{ top: 18, right: 8, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} hide />
              <Tooltip content={({ active, payload, label }) => (
                <Tip active={active} payload={[{ ...payload?.[0], name: 'Órdenes', color: C.green }]} label={label} />
              )} cursor={{ fill: 'rgba(48,209,88,0.05)' }} />
              <Bar dataKey="count" name="Órdenes" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {diaData.map((d, i) => (
                  <Cell key={i} fill={d.day === bestDay?.day ? C.green : C.muted} />
                ))}
                <LabelList dataKey="count" position="top"
                  formatter={v => v > 0 ? v.toLocaleString() : ''}
                  style={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tipo de servicio" badge="OPERATIVO">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={servicioData} margin={{ top: 0, right: 56, left: 4, bottom: 0 }}>
              <XAxis type="number" {...axisProps} tick={{ fontSize: 10, fill: '#B0BAC9' }} />
              <YAxis type="category" dataKey="name" width={162} {...axisProps}
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} />
              <Tooltip content={({ active, payload, label }) => (
                <Tip active={active} payload={[{ ...payload?.[0], name: 'Órdenes', color: payload?.[0]?.fill }]} label={label} />
              )} cursor={{ fill: 'rgba(0,178,227,0.05)' }} />
              <Bar dataKey="count" name="Órdenes" radius={[0, 5, 5, 0]} maxBarSize={20}>
                {servicioData.map((_, i) => <Cell key={i} fill={rankColor(i)} />)}
                <LabelList dataKey="count" position="right"
                  style={{ fontSize: 11, fill: '#64748B', fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Detalle de órdenes */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Detalle de órdenes</span>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8E8E93' }}>{total} registros</span>
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
                <td style={{ fontWeight: 500 }}>{o.tipo_servicio}</td>
                <td style={{ fontWeight: 700, color: C.orange }}>{o.estrellas}</td>
              </tr>
            ))}
            {detalleOrdenes.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#8E8E93', padding: 28 }}>Sin órdenes esta semana</td></tr>
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

  // Init: profiles + weeks + trend (con technician counts per week)
  useEffect(() => {
    async function init() {
      const [profilesData, allRows] = await Promise.all([
        fetchAll((f, t) => supabase.from('profiles').select('usuario_ffm, nombre, sucursal, tipo_cuadrilla, meta_estrellas, tipo_distrito').range(f, t)),
        fetchAll((f, t) => supabase.from('orders').select('semana_inicio, usuario_ffm').order('semana_inicio', { ascending: false }).range(f, t)),
      ])

      setProfiles(profilesData)


      const unique = [...new Set(allRows.map(w => w.semana_inicio))].sort((a, b) => b.localeCompare(a))
      setAvailableWeeks(unique)

      // Trend with both metrics
      const weekMap = {}
      allRows.forEach(r => {
        if (!weekMap[r.semana_inicio]) weekMap[r.semana_inicio] = { ordenes: 0, tecnicos: new Set() }
        weekMap[r.semana_inicio].ordenes++
        weekMap[r.semana_inicio].tecnicos.add(r.usuario_ffm)
      })
      const trend = Object.entries(weekMap)
        .map(([sem, d]) => ({ sem, ordenes: d.ordenes, tecnicos: d.tecnicos.size, label: formatWeekRange(sem) }))
        .sort((a, b) => a.sem.localeCompare(b.sem))
        .slice(-8)
      setTrendData(trend)

      if (unique.length > 0 && !unique.includes(weekStart)) setWeekStart(unique[0])
      setLoadingInit(false)
    }
    init()
  }, [])

  // Load full orders for selected week
  useEffect(() => {
    if (loadingInit) return
    if (!didMount.current) { didMount.current = true }
    setLoadingOrders(true)
    fetchAll((f, t) => supabase.from('orders').select('*').eq('semana_inicio', weekStart).range(f, t))
      .then(data => { setOrders(data); setLoadingOrders(false) })
  }, [weekStart, loadingInit])

  const profileMap = useMemo(() => {
    const m = {}; profiles.forEach(p => { m[p.usuario_ffm] = p }); return m
  }, [profiles])

  const filteredOrders = useMemo(() =>
    filterCuadrilla ? orders.filter(o => o.tipo_cuadrilla === filterCuadrilla) : orders,
    [orders, filterCuadrilla]
  )

  const cuadrillaTypes = useMemo(() =>
    [...new Set(orders.map(o => o.tipo_cuadrilla).filter(Boolean))].sort(), [orders]
  )

  const sucursalOrders = useMemo(() =>
    selectedSucursal ? filteredOrders.filter(o => o.sucursal === selectedSucursal) : [],
    [filteredOrders, selectedSucursal]
  )

  const tecnicoOrders = useMemo(() =>
    selectedTecnico ? orders.filter(o => o.usuario_ffm === selectedTecnico) : [],
    [orders, selectedTecnico]
  )

  function drillSucursal(suc) { setSelectedSucursal(suc); setView('sucursal') }
  function drillTecnico(ffm) { setSelectedTecnico(ffm); setView('tecnico') }
  function goBack(to) {
    setView(to)
    if (to === 'nacional') { setSelectedSucursal(null); setSelectedTecnico(null) }
    if (to === 'sucursal') setSelectedTecnico(null)
  }
  function changeWeek(w) {
    setWeekStart(w); setView('nacional'); setSelectedSucursal(null); setSelectedTecnico(null)
  }

  if (loadingInit) return <div className="admin-page"><p style={{ color: '#8E8E93' }}>Cargando...</p></div>

  const pageTitle = view === 'tecnico'
    ? profileMap[selectedTecnico]?.nombre || selectedTecnico
    : view === 'sucursal'
    ? selectedSucursal
    : `Operaciones — Semana ${formatWeekRange(weekStart)}`

  const crumbLink = { background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: C.blue, cursor: 'pointer', padding: 0 }
  const crumbActive = { background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#1C1C1E', cursor: 'default', padding: 0 }

  return (
    <div className="admin-page">
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6, flexWrap: 'wrap' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {view !== 'nacional'
            ? <button style={crumbLink} onClick={() => goBack('nacional')}>Nacional</button>
            : <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>Nacional</span>
          }
          {selectedSucursal && (
            <>
              <span style={{ color: '#C7C7CC' }}>›</span>
              {view === 'sucursal'
                ? <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSucursal}</span>
                : <button style={crumbLink} onClick={() => goBack('sucursal')}>{selectedSucursal.split(' ').slice(-2).join(' ')}</button>
              }
            </>
          )}
          {selectedTecnico && (
            <>
              <span style={{ color: '#C7C7CC' }}>›</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          {availableWeeks.map(w => <option key={w} value={w}>Sem {formatWeekRange(w)}</option>)}
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
        <div style={{ color: '#8E8E93', padding: '52px 24px', textAlign: 'center' }}>Cargando semana...</div>
      ) : view === 'nacional' ? (
        <ViewNacional orders={filteredOrders} trendData={trendData} onDrillSucursal={drillSucursal} />
      ) : view === 'sucursal' ? (
        <ViewSucursal orders={sucursalOrders} sucursal={selectedSucursal} profileMap={profileMap} onDrillTecnico={drillTecnico} />
      ) : (
        <ViewTecnico orders={tecnicoOrders} ffm={selectedTecnico} profileMap={profileMap} />
      )}
    </div>
  )
}
