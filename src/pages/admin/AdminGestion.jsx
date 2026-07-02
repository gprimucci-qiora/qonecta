import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { fetchAll } from '../../lib/db'
import { formatWeekRange, getWeekStart } from '../../lib/bonos'

const SUPER_ADMIN_EMAIL = 'g.primucci@qiora.com.mx'

const CUADRILLAS = ['NORMAL', 'MOTO', 'HIBRIDA', 'ELITE', 'MULTIDISTRITO']

const S = {
  input: {
    width: '100%', padding: '8px 12px',
    border: '1px solid #E5E5EA', borderRadius: 8,
    fontFamily: 'inherit', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: '#fff',
  },
  label: { fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block' },
  field: { marginBottom: 14 },
  btn: (variant = 'primary') => ({
    padding: '10px 22px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    background: variant === 'primary' ? '#1C1C1E' : variant === 'danger' ? '#FF3B30' : variant === 'warn' ? '#FF9F0A' : '#E5E5EA',
    color: variant === 'ghost' ? '#555' : '#fff',
  }),
}

function Msg({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
      background: msg.type === 'ok' ? '#F0FFF4' : '#FFF0F0',
      color: msg.type === 'ok' ? '#1a7f3c' : '#FF3B30',
      border: `1px solid ${msg.type === 'ok' ? '#1a7f3c' : '#FF3B30'}`,
    }}>
      {msg.text}
    </div>
  )
}

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

async function callAPI(action, payload) {
  const token = await getToken()
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  })
  return res.json()
}

// ── Limpiar datos ──────────────────────────────────────────────────────────────

function TabDatos() {
  const [weekStats, setWeekStats] = useState([])
  const [profileCount, setProfileCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [pending, setPending] = useState(null)   // week to confirm-delete, or 'purge'
  const currentWeek = getWeekStart()

  const load = useCallback(async () => {
    setLoading(true)
    const PAGE = 1000
    let all = [], from = 0
    while (true) {
      const { data } = await supabase.from('orders').select('semana_inicio').range(from, from + PAGE - 1)
      if (!data?.length) break
      all = all.concat(data)
      if (data.length < PAGE) break
      from += PAGE
    }
    const counts = {}
    all.forEach(o => { counts[o.semana_inicio] = (counts[o.semana_inicio] || 0) + 1 })
    const stats = Object.entries(counts)
      .map(([sem, count]) => ({ sem, count, isCurrent: sem === currentWeek }))
      .sort((a, b) => b.sem.localeCompare(a.sem))
    const { count: pc } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    setWeekStats(stats)
    setProfileCount(pc || 0)
    setLoading(false)
  }, [currentWeek])

  useEffect(() => { load() }, [load])

  async function deleteWeek(sem) {
    setDeleting(sem)
    setPending(null)
    await supabase.from('orders').delete().eq('semana_inicio', sem)
    await load()
    setDeleting(null)
  }

  async function purgeOld() {
    setDeleting('purge')
    setPending(null)
    const oldWeeks = weekStats.filter(w => !w.isCurrent).map(w => w.sem)
    for (const sem of oldWeeks) {
      await supabase.from('orders').delete().eq('semana_inicio', sem)
    }
    await load()
    setDeleting(null)
  }

  const oldCount = weekStats.filter(w => !w.isCurrent).reduce((s, w) => s + w.count, 0)
  const totalCount = weekStats.reduce((s, w) => s + w.count, 0)
  const busy = deleting !== null

  return (
    <>
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total órdenes', value: totalCount.toLocaleString() },
          { label: 'Técnicos registrados', value: profileCount.toLocaleString() },
        ].map(k => (
          <div key={k.label} className="admin-card" style={{ textAlign: 'center', padding: '18px 12px' }}>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Week table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F2F2F7', fontSize: 13, fontWeight: 700 }}>
          Órdenes por semana
        </div>
        {loading ? (
          <p style={{ padding: 24, color: '#8E8E93', margin: 0 }}>Cargando...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Semana</th><th>Órdenes</th><th></th></tr>
            </thead>
            <tbody>
              {weekStats.map(w => (
                <tr key={w.sem}>
                  <td style={{ fontWeight: w.isCurrent ? 700 : 400 }}>
                    {formatWeekRange(w.sem)}
                    {w.isCurrent && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, background: '#30D158', color: '#fff',
                        padding: '1px 7px', borderRadius: 999, fontWeight: 700,
                      }}>Actual</span>
                    )}
                  </td>
                  <td>{w.count.toLocaleString()}</td>
                  <td style={{ width: 140, textAlign: 'right', paddingRight: 16 }}>
                    {!w.isCurrent && (
                      pending === w.sem ? (
                        <span style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => deleteWeek(w.sem)}
                            disabled={busy}
                            style={{ ...S.btn('danger'), padding: '4px 10px', fontSize: 12 }}
                          >
                            {deleting === w.sem ? '...' : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => setPending(null)}
                            style={{ ...S.btn('ghost'), padding: '4px 10px', fontSize: 12, background: 'none', color: '#555' }}
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setPending(w.sem)}
                          disabled={busy}
                          style={{
                            padding: '4px 12px', background: 'none',
                            border: '1px solid #FF3B30', color: '#FF3B30',
                            borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            opacity: busy ? 0.5 : 1,
                          }}
                        >
                          Eliminar
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Purge all old weeks */}
      {oldCount > 0 && (
        <div className="admin-card" style={{ borderLeft: '4px solid #FF9F0A', background: '#FFFAF0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            ⚠️ Conservar solo semana actual
          </div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 14 }}>
            Eliminará permanentemente {oldCount.toLocaleString()} órdenes de semanas anteriores.
            Los perfiles de técnicos no se eliminan.
          </div>
          {pending !== 'purge' ? (
            <button
              onClick={() => setPending('purge')}
              disabled={busy}
              style={{ ...S.btn('warn'), opacity: busy ? 0.5 : 1 }}
            >
              Eliminar semanas anteriores
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={purgeOld}
                disabled={busy}
                style={{ ...S.btn('danger'), opacity: busy ? 0.5 : 1 }}
              >
                {deleting === 'purge' ? 'Eliminando...' : 'Sí, eliminar todo'}
              </button>
              <button
                onClick={() => setPending(null)}
                style={{ padding: '10px 22px', border: '1px solid #E5E5EA', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'none', color: '#555' }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Crear técnico ──────────────────────────────────────────────────────────────

function TabTecnico() {
  const EMPTY = { ffm: '', nombre: '', sucursal: '', tipo_cuadrilla: 'NORMAL', meta_estrellas: '', tipo_distrito: '', password: '' }
  const [form, setForm] = useState(EMPTY)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const data = await callAPI('create_tecnico', form)
    if (data.ok) {
      setMsg({ type: 'ok', text: `Usuario creado: ${data.email}${form.password ? '' : ' (contraseña: QiORA@Bono2024)'}` })
      setForm(EMPTY)
    } else {
      setMsg({ type: 'err', text: data.error })
    }
    setLoading(false)
  }

  return (
    <div className="admin-card" style={{ maxWidth: 540 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Nuevo técnico</div>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={S.field}>
            <label style={S.label}>Usuario FFM *</label>
            <input style={S.input} required value={form.ffm}
              onChange={e => set('ffm', e.target.value)} placeholder="ej. JUAN123" />
          </div>
          <div style={S.field}>
            <label style={S.label}>Nombre completo *</label>
            <input style={S.input} required value={form.nombre}
              onChange={e => set('nombre', e.target.value)} placeholder="Apellido Apellido Nombre" />
          </div>
          <div style={S.field}>
            <label style={S.label}>Sucursal</label>
            <input style={S.input} value={form.sucursal}
              onChange={e => set('sucursal', e.target.value)} placeholder="ej. CTA-TPI-INT" />
          </div>
          <div style={S.field}>
            <label style={S.label}>Tipo cuadrilla</label>
            <select style={S.input} value={form.tipo_cuadrilla}
              onChange={e => set('tipo_cuadrilla', e.target.value)}>
              {CUADRILLAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label}>Meta estrellas / semana</label>
            <input style={S.input} type="number" value={form.meta_estrellas}
              onChange={e => set('meta_estrellas', e.target.value)} placeholder="ej. 75" />
          </div>
          <div style={S.field}>
            <label style={S.label}>Tipo distrito</label>
            <input style={S.input} value={form.tipo_distrito}
              onChange={e => set('tipo_distrito', e.target.value)} placeholder="ej. B" />
          </div>
        </div>
        <div style={{ ...S.field, marginBottom: 20 }}>
          <label style={S.label}>Contraseña inicial (vacío = QiORA@Bono2024)</label>
          <input style={S.input} type="password" value={form.password}
            onChange={e => set('password', e.target.value)} placeholder="Dejar vacío para default" />
        </div>
        <Msg msg={msg} />
        <button type="submit" style={{ ...S.btn('primary'), opacity: loading ? 0.6 : 1 }} disabled={loading}>
          {loading ? 'Creando...' : 'Crear técnico'}
        </button>
      </form>
    </div>
  )
}

// ── Crear acceso admin ─────────────────────────────────────────────────────────

function TabAdmin() {
  const EMPTY = { email: '', password: '', confirm: '' }
  const [form, setForm] = useState(EMPTY)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setMsg({ type: 'err', text: 'Las contraseñas no coinciden' })
      return
    }
    setLoading(true)
    setMsg(null)
    const data = await callAPI('create_admin', { email: form.email, password: form.password })
    if (data.ok) {
      setMsg({ type: 'ok', text: `Acceso creado para: ${data.email}` })
      setForm(EMPTY)
    } else {
      setMsg({ type: 'err', text: data.error })
    }
    setLoading(false)
  }

  return (
    <div className="admin-card" style={{ maxWidth: 440 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Crear acceso admin / operaciones</div>
      <div style={{ fontSize: 13, color: '#8E8E93', marginBottom: 20 }}>
        Este usuario podrá acceder a todos los dashboards del admin.
      </div>
      <form onSubmit={submit}>
        <div style={S.field}>
          <label style={S.label}>Email *</label>
          <input style={S.input} type="email" required value={form.email}
            onChange={e => set('email', e.target.value)} placeholder="nombre@empresa.com" />
        </div>
        <div style={S.field}>
          <label style={S.label}>Contraseña *</label>
          <input style={S.input} type="password" required minLength={6} value={form.password}
            onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>
        <div style={{ ...S.field, marginBottom: 20 }}>
          <label style={S.label}>Confirmar contraseña *</label>
          <input style={S.input} type="password" required value={form.confirm}
            onChange={e => set('confirm', e.target.value)} placeholder="Repite la contraseña" />
        </div>
        <Msg msg={msg} />
        <button type="submit" style={{ ...S.btn('primary'), opacity: loading ? 0.6 : 1 }} disabled={loading}>
          {loading ? 'Creando...' : 'Crear acceso'}
        </button>
      </form>
    </div>
  )
}

// ── Usuarios activos ───────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'g.primucci@qiora.com.mx'

function PwForm({ userId, onClose }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (pw !== confirm) { setMsg({ type: 'err', text: 'Las contraseñas no coinciden' }); return }
    setLoading(true)
    setMsg(null)
    const data = await callAPI('reset_password', { userId, password: pw })
    if (data.ok) {
      setMsg({ type: 'ok', text: 'Contraseña actualizada' })
      setPw(''); setConfirm('')
      setTimeout(onClose, 1200)
    } else {
      setMsg({ type: 'err', text: data.error })
    }
    setLoading(false)
  }

  return (
    <tr>
      <td colSpan={5} style={{ background: '#F9F9FB', padding: '12px 20px', borderBottom: '1px solid #E5E5EA' }}>
        <form onSubmit={submit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Nueva contraseña</div>
            <input
              type="password" required minLength={6} value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              style={{ ...S.input, width: 200 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Confirmar</div>
            <input
              type="password" required value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              style={{ ...S.input, width: 200 }}
            />
          </div>
          <button type="submit" disabled={loading} style={{ ...S.btn('primary'), padding: '8px 18px', fontSize: 13, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={onClose} style={{ padding: '8px 14px', background: 'none', border: '1px solid #E5E5EA', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#555' }}>
            Cancelar
          </button>
          {msg && (
            <span style={{ fontSize: 13, color: msg.type === 'ok' ? '#1a7f3c' : '#FF3B30', fontWeight: 600, alignSelf: 'center' }}>
              {msg.text}
            </span>
          )}
        </form>
      </td>
    </tr>
  )
}

function TabUsuarios() {
  const [users, setUsers] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(null)   // userId to confirm-delete
  const [deleting, setDeleting] = useState(null)
  const [changingPw, setChangingPw] = useState(null)  // userId with pw form open
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const token = await getToken()
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'list_users' }),
    })
    const data = await res.json()
    if (!data.ok) { setError(data.error); setLoading(false); return }

    const profs = await fetchAll((from, to) =>
      supabase.from('profiles').select('id, usuario_ffm, nombre').range(from, to)
    )
    const profMap = {}
    profs.forEach(p => { profMap[p.id] = p })

    setUsers(data.users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    setProfiles(profMap)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteUser(userId) {
    setDeleting(userId)
    setPending(null)
    const token = await getToken()
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete_user', userId }),
    })
    const data = await res.json()
    if (data.ok) {
      setUsers(u => u.filter(x => x.id !== userId))
    } else {
      setError(data.error)
    }
    setDeleting(null)
  }

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    const prof = profiles[u.id]
    return (
      u.email?.toLowerCase().includes(q) ||
      prof?.nombre?.toLowerCase().includes(q) ||
      prof?.usuario_ffm?.toLowerCase().includes(q)
    )
  })

  const typeOf = (u) => {
    if (u.email === ADMIN_EMAIL) return { label: 'Super admin', color: '#BF5AF2' }
    if (u.app_metadata?.role === 'admin') return { label: 'Admin', color: '#00B2E3' }
    return { label: 'Técnico', color: '#30D158' }
  }

  if (loading) return <p style={{ color: '#8E8E93', padding: '12px 0' }}>Cargando usuarios...</p>
  if (error) return <Msg msg={{ type: 'err', text: error }} />

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar por email, nombre o FFM..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: '8px 12px', border: '1px solid #E5E5EA',
            borderRadius: 8, fontFamily: 'inherit', fontSize: 14, outline: 'none',
          }}
        />
        <span style={{ fontSize: 13, color: '#8E8E93', whiteSpace: 'nowrap' }}>
          {filtered.length} usuario{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email / FFM</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Creado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const prof = profiles[u.id]
              const tipo = typeOf(u)
              const isMainAdmin = u.email === ADMIN_EMAIL
              const isBusy = deleting !== null
              return (
                <>
                <tr key={u.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {prof?.usuario_ffm
                      ? <><span style={{ fontWeight: 700 }}>{prof.usuario_ffm}</span><span style={{ color: '#8E8E93' }}> · {u.email}</span></>
                      : u.email
                    }
                  </td>
                  <td style={{ color: prof?.nombre ? '#1C1C1E' : '#C7C7CC', fontStyle: prof?.nombre ? 'normal' : 'italic' }}>
                    {prof?.nombre || '—'}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      background: tipo.color + '22', color: tipo.color,
                    }}>
                      {tipo.label}
                    </span>
                  </td>
                  <td style={{ color: '#8E8E93', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: 16 }}>
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      {/* Change password button — always visible */}
                      <button
                        onClick={() => { setChangingPw(changingPw === u.id ? null : u.id); setPending(null) }}
                        style={{
                          padding: '4px 10px', background: 'none',
                          border: '1px solid #00B2E3', color: '#00B2E3',
                          borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {changingPw === u.id ? 'Cerrar' : 'Cambiar clave'}
                      </button>

                      {/* Delete — only for non-super-admin */}
                      {!isMainAdmin && (
                        pending === u.id ? (
                          <span style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              onClick={() => deleteUser(u.id)}
                              disabled={isBusy}
                              style={{
                                padding: '4px 10px', background: '#FF3B30', color: '#fff',
                                border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                cursor: 'pointer', opacity: isBusy ? 0.5 : 1,
                              }}
                            >
                              {deleting === u.id ? '...' : 'Confirmar'}
                            </button>
                            <button
                              onClick={() => setPending(null)}
                              style={{ padding: '4px 10px', background: 'none', border: '1px solid #E5E5EA', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#555' }}
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : (
                            <button
                              onClick={() => { setPending(u.id); setChangingPw(null) }}
                              disabled={isBusy}
                              style={{
                                padding: '4px 12px', background: 'none', border: '1px solid #FF3B30',
                                color: '#FF3B30', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', opacity: isBusy ? 0.5 : 1,
                              }}
                            >
                              Eliminar
                            </button>
                          )
                        )}
                      </div>
                  </td>
                </tr>
                {changingPw === u.id && (
                  <PwForm key={`pw-${u.id}`} userId={u.id} onClose={() => setChangingPw(null)} />
                )}
                </>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#8E8E93' }}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function AdminGestion() {
  const { user } = useAuth()
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL

  const TABS = [
    { id: 'datos',    label: 'Limpiar datos' },
    { id: 'tecnico',  label: 'Crear técnico' },
    ...(isSuperAdmin ? [
      { id: 'admin',    label: 'Crear acceso admin' },
      { id: 'usuarios', label: 'Usuarios activos' },
    ] : []),
  ]

  const [tab, setTab] = useState('datos')

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Gestión</h1>

      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid #E5E5EA' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', background: 'none', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            color: tab === t.id ? '#1C1C1E' : '#8E8E93',
            borderBottom: tab === t.id ? '2px solid #1C1C1E' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'datos'    && <TabDatos />}
      {tab === 'tecnico'  && <TabTecnico />}
      {isSuperAdmin && tab === 'admin'    && <TabAdmin />}
      {isSuperAdmin && tab === 'usuarios' && <TabUsuarios />}
    </div>
  )
}
