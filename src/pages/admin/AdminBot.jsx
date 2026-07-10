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

const STEPS = [
  { key: 'pending',     label: 'En cola',           icon: '⏳' },
  { key: 'downloading', label: 'Entrando a FFM y descargando reporte', icon: '⬇️' },
  { key: 'cleaning',   label: 'Limpiando datos',    icon: '🔄' },
  { key: 'uploading',  label: 'Subiendo resultado', icon: '☁️' },
  { key: 'done',       label: 'Completado',         icon: '✅' },
]

function currentStepIndex(job) {
  if (!job) return -1
  if (job.status === 'done') return 4
  if (job.status === 'error') return STEPS.findIndex(s => s.key === (job.step || 'pending'))
  return STEPS.findIndex(s => s.key === (job.step || 'pending'))
}

function StepProgress({ job }) {
  const activeIdx = currentStepIndex(job)
  const isError = job?.status === 'error'

  return (
    <div style={{ padding: '8px 0 4px' }}>
      {STEPS.map((step, i) => {
        const done = i < activeIdx
        const active = i === activeIdx
        const error = active && isError

        let color = '#C7C7CC'
        if (done) color = '#30D158'
        if (active && !isError) color = '#007AFF'
        if (error) color = '#FF3B30'

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < STEPS.length - 1 ? 0 : 0 }}>
            {/* Line + circle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: done ? '#30D158' : active && !isError ? '#007AFF' : error ? '#FF3B30' : '#F2F2F7',
                border: `2px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, flexShrink: 0,
                boxShadow: active && !isError ? '0 0 0 4px rgba(0,122,255,0.15)' : 'none',
                transition: 'all 0.3s',
              }}>
                {done ? (
                  <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>
                ) : error ? (
                  <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✕</span>
                ) : active ? (
                  <span style={{
                    display: 'inline-block',
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#007AFF',
                    animation: 'pulse-dot 1.2s ease-in-out infinite',
                  }} />
                ) : null}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 2, height: 28,
                  background: done ? '#30D158' : '#E5E5EA',
                  transition: 'background 0.3s',
                  margin: '2px 0',
                }} />
              )}
            </div>

            {/* Label */}
            <div style={{ paddingTop: 2, paddingBottom: i < STEPS.length - 1 ? 28 : 0 }}>
              <div style={{
                fontSize: 14,
                fontWeight: active ? 700 : done ? 500 : 400,
                color: done ? '#1C1C1E' : active ? (isError ? '#FF3B30' : '#007AFF') : '#C7C7CC',
                lineHeight: 1.3,
              }}>
                {step.icon} {step.label}
              </div>
              {active && !isError && step.key !== 'done' && (
                <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 3 }}>
                  {step.key === 'pending' && 'Esperando runner de GitHub (~1-2 min)…'}
                  {step.key === 'downloading' && 'El bot está navegando FFM y descargando el archivo…'}
                  {step.key === 'cleaning' && 'Procesando y limpiando el Excel…'}
                  {step.key === 'uploading' && 'Guardando el archivo…'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminBot() {
  const [fecha, setFecha]       = useState(yesterday)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [job, setJob]           = useState(null)
  const pollRef                 = useRef(null)

  useEffect(() => {
    supabase
      .from('bot_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setJob(data) })
  }, [])

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
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [job?.id, job?.status, job?.step])

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
      setJob({ id: data.jobId, fecha, status: 'pending', step: 'pending', created_at: new Date().toISOString() })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const isRunning = job && (job.status === 'pending' || job.status === 'running')

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Bot FFM</h1>
      <p style={{ fontSize: 13, color: '#8E8E93', marginBottom: 24 }}>
        Descarga y limpia el reporte de Cierre Diario desde FFM automáticamente.
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              Reporte {job.fecha}
            </div>
            <div style={{ fontSize: 12, color: '#C7C7CC' }}>
              {new Date(job.created_at).toLocaleString('es-MX')}
              {job.triggered_by && ` · ${job.triggered_by}`}
            </div>
          </div>

          <StepProgress job={job} />

          {/* Download button */}
          {job.status === 'done' && job.file_url && (
            <div style={{ marginTop: 20 }}>
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
            </div>
          )}

          {/* Error message */}
          {job.status === 'error' && job.error_msg && (
            <div style={{ marginTop: 16, padding: '10px 12px', background: '#FFF1F0', border: '1px solid #FF3B30', borderRadius: 8, fontSize: 13, color: '#FF3B30', fontFamily: 'monospace' }}>
              {job.error_msg}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  )
}
