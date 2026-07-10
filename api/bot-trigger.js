import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL  = 'https://pubcbstrapwwfzuqiklf.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YmNic3RyYXB3d2Z6dXFpa2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjU3MTUsImV4cCI6MjA5ODUwMTcxNX0.Jy7GWFfDcSaRSfNLSRvAL_xqwIdpLOfZmNehMxlq4bM'
const ADMIN_EMAIL   = 'g.primucci@qiora.com.mx'
const GITHUB_REPO   = 'gprimucci-qiora/qonecta'
const WORKFLOW_FILE = 'ffm_download.yml'

const authClient = createClient(SUPABASE_URL, SUPABASE_ANON)

function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_KEY no configurado')
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } })
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verificar sesión
  const token = req.headers.authorization?.replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'No token' })

  const { data: { user }, error: authErr } = await authClient.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Sesión inválida' })

  const isAdmin = user.email === ADMIN_EMAIL || user.app_metadata?.role === 'admin'
  if (!isAdmin) return res.status(403).json({ error: 'Sin permisos de administrador' })

  const { fecha } = req.body || {}
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'fecha requerida en formato YYYY-MM-DD' })
  }

  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) return res.status(500).json({ error: 'GITHUB_TOKEN no configurado en Vercel' })

  let admin
  try { admin = getAdminClient() } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  // Crear registro del job
  const jobId = randomUUID()
  const { error: insertErr } = await admin.from('bot_jobs').insert({
    id: jobId,
    fecha,
    status: 'pending',
    triggered_by: user.email,
  })
  if (insertErr) return res.status(500).json({ error: insertErr.message })

  // Disparar GitHub Actions workflow
  const ghRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { fecha, job_id: jobId },
      }),
    }
  )

  if (!ghRes.ok) {
    const errText = await ghRes.text()
    await admin.from('bot_jobs').update({ status: 'error', error_msg: `GitHub: ${errText}` }).eq('id', jobId)
    return res.status(500).json({ error: `Error al disparar workflow: ${errText}` })
  }

  return res.json({ ok: true, jobId })
}
