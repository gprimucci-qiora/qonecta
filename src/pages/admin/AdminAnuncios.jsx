import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TIPOS = [
  { key: 'alerta',   label: 'Alerta',    icon: '🚨', color: '#FF3B30', bg: '#FFF1F0', border: '#FF3B30' },
  { key: 'rally',    label: 'Rally',     icon: '🎉', color: '#1A7F37', bg: '#F0FFF5', border: '#30D158' },
  { key: 'reminder', label: 'Reminder',  icon: '📌', color: '#B45309', bg: '#FFFBEB', border: '#FF9F0A' },
]

export default function AdminAnuncios() {
  const [anuncios, setAnuncios] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTipo, setNewTipo] = useState('alerta')
  const [newTitulo, setNewTitulo] = useState('')
  const [newMsg, setNewMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    setAnuncios(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newTitulo.trim() || !newMsg.trim()) return
    setSaving(true)
    await supabase.from('announcements').insert({
      tipo:    newTipo,
      titulo:  newTitulo.trim(),
      mensaje: newMsg.trim(),
      activo:  true,
    })
    setNewTipo('alerta')
    setNewTitulo('')
    setNewMsg('')
    setSaving(false)
    load()
  }

  async function toggleActivo(id, current) {
    await supabase.from('announcements').update({ activo: !current }).eq('id', id)
    load()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este anuncio?')) return
    await supabase.from('announcements').delete().eq('id', id)
    load()
  }

  const selectedTipo = TIPOS.find(t => t.key === newTipo)

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Anuncios</h1>

      {/* Create */}
      <div className="admin-card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Nuevo anuncio</div>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Type selector */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#8E8E93', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Tipo de anuncio
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {TIPOS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setNewTipo(t.key)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    border: `2px solid ${newTipo === t.key ? t.border : '#E5E5EA'}`,
                    borderRadius: 10,
                    background: newTipo === t.key ? t.bg : '#FAFAFA',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: newTipo === t.key ? t.color : '#8E8E93',
                  }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <input
            value={newTitulo}
            onChange={e => setNewTitulo(e.target.value)}
            placeholder="Título del aviso (aparece grande en el popup)"
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #E5E5EA',
              borderRadius: 8, fontFamily: 'inherit', fontSize: 14, outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Body + publish */}
          <div style={{ display: 'flex', gap: 12 }}>
            <textarea
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              placeholder="Cuerpo del mensaje para los técnicos..."
              rows={2}
              style={{
                flex: 1, padding: '10px 12px', border: '1px solid #E5E5EA',
                borderRadius: 8, fontFamily: 'inherit', fontSize: 14,
                resize: 'vertical', outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={saving || !newTitulo.trim() || !newMsg.trim()}
              style={{
                padding: '0 24px',
                background: selectedTipo?.border ?? '#1C1C1E',
                color: '#fff',
                border: 'none', borderRadius: 8, fontFamily: 'inherit',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', alignSelf: 'stretch',
                opacity: saving || !newTitulo.trim() || !newMsg.trim() ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
            >
              {saving ? 'Guardando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: '#8E8E93' }}>Cargando...</p>
        ) : anuncios.length === 0 ? (
          <p style={{ padding: 24, color: '#8E8E93' }}>Sin anuncios.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Título</th>
                <th>Mensaje</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {anuncios.map(a => {
                const t = TIPOS.find(x => x.key === (a.tipo || 'alerta')) ?? TIPOS[0]
                return (
                  <tr key={a.id}>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 999,
                        background: t.bg, border: `1px solid ${t.border}`,
                        fontSize: 12, fontWeight: 700, color: t.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {t.icon} {t.label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{a.titulo || '—'}</td>
                    <td style={{ maxWidth: 300, color: '#555', fontSize: 13 }}>{a.mensaje}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                        fontSize: 12, fontWeight: 600,
                        background: a.activo ? '#E6F4EA' : '#F2F2F7',
                        color: a.activo ? '#3F873F' : '#8E8E93',
                      }}>
                        {a.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ color: '#8E8E93', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {new Date(a.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => toggleActivo(a.id, a.activo)}
                          style={{
                            padding: '5px 12px', border: '1px solid #E5E5EA', borderRadius: 6,
                            background: 'none', fontFamily: 'inherit', fontSize: 12,
                            cursor: 'pointer', color: '#1C1C1E',
                          }}
                        >
                          {a.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          style={{
                            padding: '5px 12px', border: '1px solid #FFD6D6', borderRadius: 6,
                            background: 'none', fontFamily: 'inherit', fontSize: 12,
                            cursor: 'pointer', color: '#FF3B30',
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
