import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pubcbstrapwwfzuqiklf.supabase.co'
const ADMIN_EMAIL  = 'g.primucci@qiora.com.mx'

function getAdmin() {
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set')
  return createClient(SUPABASE_URL, key)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify caller is an authenticated admin
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token' })

  let admin
  try { admin = getAdmin() } catch (e) { return res.status(500).json({ error: e.message }) }

  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Token inválido' })

  const isAdmin = user.email === ADMIN_EMAIL || user.app_metadata?.role === 'admin'
  if (!isAdmin) return res.status(403).json({ error: 'Sin permisos' })

  const { action, ...payload } = req.body || {}

  try {
    // ── Crear técnico ──────────────────────────────────────────────────────
    if (action === 'create_tecnico') {
      const { ffm, nombre, sucursal, tipo_cuadrilla, meta_estrellas, tipo_distrito, password } = payload
      if (!ffm || !nombre) return res.status(400).json({ error: 'FFM y nombre son obligatorios' })

      const email = `${ffm.trim().toLowerCase()}@qiora.app`
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password: password || 'QiORA@Bono2024',
        email_confirm: true,
      })
      if (cErr) return res.status(400).json({ error: cErr.message })

      const { error: pErr } = await admin.from('profiles').upsert({
        id: created.user.id,
        usuario_ffm:    ffm.trim().toUpperCase(),
        nombre:         nombre.trim(),
        sucursal:       sucursal?.trim() || '',
        tipo_cuadrilla: tipo_cuadrilla?.trim() || 'NORMAL',
        meta_estrellas: parseInt(meta_estrellas) || 0,
        tipo_distrito:  tipo_distrito?.trim() || '',
      }, { onConflict: 'usuario_ffm' })
      if (pErr) return res.status(400).json({ error: pErr.message })

      return res.json({ ok: true, email })
    }

    // ── Crear admin / viewer ───────────────────────────────────────────────
    if (action === 'create_admin') {
      const { email, password } = payload
      if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
      if (password.length < 6) return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' })

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        app_metadata: { role: 'admin' },
      })
      if (cErr) return res.status(400).json({ error: cErr.message })

      return res.json({ ok: true, email: created.user.email })
    }

    return res.status(400).json({ error: 'Acción desconocida' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
