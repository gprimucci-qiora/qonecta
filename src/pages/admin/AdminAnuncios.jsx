import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminAnuncios() {
  const [anuncios, setAnuncios] = useState([])
  const [loading, setLoading] = useState(true)
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
      titulo: newTitulo.trim(),
      mensaje: newMsg.trim(),
      activo: true,
    })
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

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Anuncios</h1>

      {/* Create */}
      <div className="admin-card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Nuevo anuncio</div>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                padding: '0 24px', background: '#1C1C1E', color: '#fff',
                border: 'none', borderRadius: 8, fontFamily: 'inherit',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', alignSelf: 'stretch',
                opacity: saving || !newTitulo.trim() || !newMsg.trim() ? 0.5 : 1,
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
                <th>Título</th>
                <th>Mensaje</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {anuncios.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{a.titulo || '—'}</td>
                  <td style={{ maxWidth: 360, color: '#555' }}>{a.mensaje}</td>
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
                  <td style={{ color: '#8E8E93', fontSize: 13 }}>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
