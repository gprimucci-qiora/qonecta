import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

const STATUS_LABEL = {
  pending: { text: 'En cola — esperando runner de GitHub…',  color: '#8E8E93', icon: '⏳' },
  running: { text: 'Corriendo — descargando y limpiando…',   color: '#FF9F0A', icon: '🔄' },
  done:    { text: 'Completado',                              color: '#30D158', icon: '✅' },
  error:   { text: 'Error',                                   color: '#FF3B30', icon: '❌' },
}

export default function AdminBot() {
  const [fecha, setFecha]       = useState(yesterday)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [job, setJob]           = useState(null)
  const pollRef                 = useRef(null)

  // Cargar último job al montar
  useEffect(() => {
    supabase
      .from('bot_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setJob(data) })
  }, [])

  // Polling mientras el job no termina
  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'error') {
      clearInterval(pollRef.current)
      return
    }
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('bot_jobs').select('*').eq('id', job.id).single()
      if (data) setJob(data)
    }, 5000)
    return () => clearInterval(pollRef.current)
  }, [job?.id, job?.status])

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/bot-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fecha }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      // Crear job local mientras llega la data de Supabase
      setJob({ id: data.jobId, fecha, status: 'pending', created_at: new Date().toISOString() })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const isRunning = job && (job.status === 'pending' || job.status === 'running')
  const st = job ? (STATUS_LABEL[job.status] ?? STATUS_LABEL.error) : null

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Bot FFM</h1>
      <p style={{ fontSize: 13, color: '#8E8E93', marginBottom: 24 }}>
        Descarga y limpia el reporte de Cierre Diario desde FFM automáticamente.<br />
        El archivo resultante es el que se sube a SIVA.
      </p>

      {/* Trigger form */}
      <div className="admin-card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Nueva descarga</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Fecha del reporte
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              max={yesterday()}
              disabled={loading || isRunning}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #E5E5EA',
                borderRadius: 8, fontFamily: 'inherit', fontSize: 14, outline: 'none',
                boxSizing: 'border-box', background: isRunning ? '#F8F8F8' : '#fff',
              }}
            />
          </div>
          <button
            onClick={handleStart}
            disabled={loading || isRunning || !fecha}
            style={{
              padding: '10px 28px', background: '#1C1C1E', color: '#fff',
              border: 'none', borderRadius: 8, fontFamily: 'inherit',
              fontSize: 14, fontWeight: 600, cursor: loading || isRunning ? 'default' : 'pointer',
              opacity: loading || isRunning || !fecha ? 0.5 : 1, whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Iniciando…' : 'Descargar'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#FFF1F0', border: '1px solid #FF3B30', borderRadius: 8, fontSize: 13, color: '#FF3B30' }}>
            {error}
          </div>
        )}
      </div>

      {/* Job status */}
      {job && (
        <div className="admin-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
            Estado del job — {job.fecha}
          </div>

          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22, animation: job.status === 'running' ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }}>
              {st.icon}
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: st.color }}>{st.text}</div>
              {job.status !== 'done' && job.status !== 'error' && (
                <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
                  El runner de GitHub tarda ~1-2 min en arrancar, luego ~3-5 min para el bot.
                </div>
              )}
            </div>
          </div>

          {/* Download button */}
          {job.status === 'done' && job.file_url && (
            <a
              href={job.file_url}
              download={`CIERRE_DIARIO_${job.fecha}.xlsx`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', background: '#30D158', color: '#fff',
                borderRadius: 8, fontSize: 14, fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              ⬇ Descargar CIERRE_DIARIO_{job.fecha}.xlsx
            </a>
          )}

          {/* Error message */}
          {job.status === 'error' && job.error_msg && (
            <div style={{ padding: '10px 12px', background: '#FFF1F0', border: '1px solid #FF3B30', borderRadius: 8, fontSize: 13, color: '#FF3B30', fontFamily: 'monospace' }}>
              {job.error_msg}
            </div>
          )}

          {/* Metadata */}
          <div style={{ marginTop: 14, fontSize: 12, color: '#C7C7CC' }}>
            Job ID: {job.id} · {new Date(job.created_at).toLocaleString('es-MX')}
            {job.triggered_by && ` · por ${job.triggered_by}`}
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="admin-card" style={{ background: '#F8F8F8', border: 'none', boxShadow: 'none' }}>
        <div style={{ fontSize: 13, color: '#8E8E93', lineHeight: 1.7 }}>
          <strong style={{ color: '#1C1C1E' }}>¿Cómo funciona?</strong><br />
          1. Selecciona la fecha del reporte y haz clic en <strong>Descargar</strong><br />
          2. Un servidor de GitHub descarga el reporte crudo de FFM y lo limpia automáticamente<br />
          3. Cuando termina (~5-8 min), aparece el botón para descargar el Excel limpio<br />
          4. Sube ese archivo a SIVA, luego descarga el archivo de bonos de SIVA y súbelo en <strong>Subir Excel</strong>
        </div>
      </div>
    </div>
  )
}
