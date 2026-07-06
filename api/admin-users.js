import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://pubcbstrapwwfzuqiklf.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YmNic3RyYXB3d2Z6dXFpa2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjU3MTUsImV4cCI6MjA5ODUwMTcxNX0.Jy7GWFfDcSaRSfNLSRvAL_xqwIdpLOfZmNehMxlq4bM'
const ADMIN_EMAIL   = 'g.primucci@qiora.com.mx'

// Use anon key for token verification — no env vars needed for this part
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON)

function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_KEY no está configurado en Vercel')
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } })
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify token using anon client (always works, no env dependency)
  const token = req.headers.authorization?.replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'No se recibió token de autenticación' })

  const { data: { user }, error: authErr } = await authClient.auth.getUser(token)
  if (authErr || !user) {
    return res.status(401).json({ error: `Sesión inválida: ${authErr?.message || 'usuario no encontrado'}` })
  }

  const isAdmin = user.email === ADMIN_EMAIL || user.app_metadata?.role === 'admin'
  if (!isAdmin) return res.status(403).json({ error: 'Sin permisos de administrador' })

  const isSuperAdmin = user.email === ADMIN_EMAIL

  const { action, ...payload } = req.body || {}

  // Lazy-init admin client — only fails here if SERVICE_KEY is missing
  let admin
  try { admin = getAdminClient() } catch (e) {
    return res.status(500).json({ error: e.message })
  }

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

    // ── Crear admin / viewer (super admin only) ────────────────────────────
    if (action === 'create_admin') {
      if (!isSuperAdmin) return res.status(403).json({ error: 'Solo el super admin puede crear accesos de administrador' })
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

    // ── Listar usuarios (super admin only) ────────────────────────────────
    if (action === 'list_users') {
      if (!isSuperAdmin) return res.status(403).json({ error: 'Solo el super admin puede ver la lista de usuarios' })
      const all = []
      let page = 1
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        if (error || !data?.users?.length) break
        all.push(...data.users)
        if (data.users.length < 1000) break
        page++
      }
      return res.json({ ok: true, users: all })
    }

    // ── Cambiar contraseña ─────────────────────────────────────────────────
    if (action === 'reset_password') {
      if (!isSuperAdmin) return res.status(403).json({ error: 'Solo el super admin puede cambiar contraseñas' })
      const { userId, password } = payload
      if (!userId || !password) return res.status(400).json({ error: 'userId y password son obligatorios' })
      if (password.length < 6) return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' })
      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) return res.status(400).json({ error: error.message })
      return res.json({ ok: true })
    }

    // ── Eliminar usuario (super admin only) ───────────────────────────────
    if (action === 'delete_user') {
      if (!isSuperAdmin) return res.status(403).json({ error: 'Solo el super admin puede eliminar usuarios' })
      const { userId } = payload
      if (!userId) return res.status(400).json({ error: 'userId requerido' })
      // Protect main admin from deletion
      const { data: { user: target } } = await admin.auth.admin.getUserById(userId)
      if (target?.email === ADMIN_EMAIL) return res.status(403).json({ error: 'No puedes eliminar al admin principal' })
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) return res.status(400).json({ error: error.message })
      return res.json({ ok: true })
    }

    // ── Sincronizar técnicos sin cuenta ───────────────────────────────────
    if (action === 'sync_tecnicos') {
      const { ffms } = payload
      if (!Array.isArray(ffms) || ffms.length === 0)
        return res.status(400).json({ error: 'ffms debe ser un array no vacío' })

      const results = { created: [], skipped: [], errors: [] }

      for (const rawFfm of ffms) {
        const ffm = rawFfm.trim().toUpperCase()
        const email = `${ffm.toLowerCase()}@qiora.app`

        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email, password: 'prueba', email_confirm: true,
        })

        if (cErr) {
          // Already registered → skip (they have an account)
          if (cErr.message?.includes('already') || cErr.status === 422) {
            results.skipped.push(ffm)
          } else {
            results.errors.push({ ffm, error: cErr.message })
          }
          continue
        }

        await admin.from('profiles').upsert({
          id: created.user.id,
          usuario_ffm: ffm,
          nombre: ffm,
          sucursal: '',
          tipo_cuadrilla: 'NORMAL',
          meta_estrellas: 0,
          tipo_distrito: '',
        }, { onConflict: 'usuario_ffm' })

        results.created.push(ffm)
      }

      return res.json({ ok: true, ...results })
    }

    return res.status(400).json({ error: 'Acción desconocida' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
