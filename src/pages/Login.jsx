import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const raw = username.trim()
    const email = raw.includes('@') ? raw.toLowerCase() : `${raw.toLowerCase()}@qiora.app`
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
    } else {
      const u = data.user
      const dest = (u?.email === 'g.primucci@qiora.com.mx' || u?.app_metadata?.role === 'admin') ? '/admin' : '/home'
      navigate(dest, { replace: true })
    }
  }

  return (
    <div className="login-screen">
      <div className="login-logo">
        <span className="login-brand">QiORA</span>
        <span className="login-sub">Técnico</span>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="username">Usuario / Email</label>
          <input
            id="username"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="FFM o email"
            required
          />
        </div>

        <div className="field-group">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
