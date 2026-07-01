import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { calcAlcance, getNivel, getWeekStart } from '../../lib/bonos'

export default function AdminTecnicos() {
  const [techs, setTechs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sucursalFilter, setSucursalFilter] = useState('')
  const [nivelFilter, setNivelFilter] = useState('')
  const weekStart = getWeekStart()

  useEffect(() => {
    async function load() {
      const [{ data: profiles }, { data: orders }] = await Promise.all([
        supabase.from('profiles').select('*').order('nombre'),
        supabase.from('orders').select('usuario_ffm, estrellas').eq('semana_inicio', weekStart),
      ])
      const map = {}
      ;(profiles ?? []).forEach(p => { map[p.usuario_ffm] = { ...p, totalEstrellas: 0 } })
      ;(orders ?? []).forEach(o => { if (map[o.usuario_ffm]) map[o.usuario_ffm].totalEstrellas += o.estrellas })
      setTechs(Object.values(map).map(t => ({
        ...t,
        alcancePct: calcAlcance(t.totalEstrellas, t.meta_estrellas),
        nivel: getNivel(calcAlcance(t.totalEstrellas, t.meta_estrellas)),
      })))
      setLoading(false)
    }
    load()
  }, [weekStart])

  const sucursales = [...new Set(techs.map(t => t.sucursal).filter(Boolean))].sort()

  const filtered = techs.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.nombre?.toLowerCase().includes(q) || t.usuario_ffm?.toLowerCase().includes(q)
    const matchSucursal = !sucursalFilter || t.sucursal === sucursalFilter
    const matchNivel = !nivelFilter || String(t.nivel.tier) === nivelFilter
    return matchSearch && matchSucursal && matchNivel
  })

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Técnicos ({filtered.length})</h1>

      {/* Filters */}
      <div className="admin-card" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 20px', marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Buscar por nombre o FFM..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: '8px 12px', border: '1px solid #E5E5EA',
            borderRadius: 8, fontFamily: 'inherit', fontSize: 14, outline: 'none',
          }}
        />
        <select
          value={sucursalFilter}
          onChange={e => setSucursalFilter(e.target.value)}
          style={{
            padding: '8px 12px', border: '1px solid #E5E5EA', borderRadius: 8,
            fontFamily: 'inherit', fontSize: 14, background: '#fff', cursor: 'pointer',
          }}
        >
          <option value="">Todas las sucursales</option>
          {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={nivelFilter}
          onChange={e => setNivelFilter(e.target.value)}
          style={{
            padding: '8px 12px', border: '1px solid #E5E5EA', borderRadius: 8,
            fontFamily: 'inherit', fontSize: 14, background: '#fff', cursor: 'pointer',
          }}
        >
          <option value="">Todos los niveles</option>
          <option value="4">≥ 100%</option>
          <option value="3">90–99%</option>
          <option value="2">80–89%</option>
          <option value="1">&lt; 80%</option>
        </select>
        {(search || sucursalFilter || nivelFilter) && (
          <button
            onClick={() => { setSearch(''); setSucursalFilter(''); setNivelFilter('') }}
            style={{ padding: '8px 12px', background: 'none', border: '1px solid #E5E5EA', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#8E8E93' }}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: '#8E8E93' }}>Cargando...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>FFM</th><th>Nombre</th><th>Sucursal</th><th>Cuadrilla</th>
                <th>Meta</th><th>★ Semana</th><th>% Alcance</th><th>Nivel</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.usuario_ffm}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#8E8E93' }}>{t.usuario_ffm}</td>
                  <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                  <td style={{ fontSize: 13, color: '#555', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.sucursal}</td>
                  <td style={{ fontSize: 13 }}>{t.tipo_cuadrilla}</td>
                  <td style={{ color: '#8E8E93' }}>{t.meta_estrellas}</td>
                  <td style={{ fontWeight: 600 }}>{t.totalEstrellas}</td>
                  <td style={{ fontWeight: 600 }}>{t.alcancePct.toFixed(1)}%</td>
                  <td>
                    <span className="nivel-badge" style={{ background: t.nivel.color }}>{t.nivel.label}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#8E8E93' }}>Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
