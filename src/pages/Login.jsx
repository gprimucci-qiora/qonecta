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
    const email = `${username.trim().toLowerCase()}@qiora.app`
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/home', { replace: true })
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
          <label htmlFor="username">Usuario FFM</label>
          <input
            id="username"
            type="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="ej. MEGE3GDLT0756"
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
